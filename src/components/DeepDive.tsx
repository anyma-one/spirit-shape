import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "./ui/Layout";
import { Loading } from "./Loading";
import type { Block, Segment } from "../deepdive/reportFormat";
import { structurePartial, structureReport } from "../deepdive/reportSections";
import { Disclosure } from "./ui/Disclosure";
import { useSmoothText } from "./ui/useSmoothText";
import { ShareCard } from "./ShareCard";
import type { WaitlistSource } from "../persistence/waitlist";
import { buildCardContent } from "../share/content";
import { Button } from "./ui/Button";
import { ANIMAL_BY_ID } from "../data/archetypes";
import { animalArtUrl } from "../data/animalArt";
import { deepCardUrl, preloadCards } from "../data/deepCards";
import { PROFILES } from "../data/profiles";
import { buildDeepReveal } from "../reveal";
import { toMatchResult } from "../deepdive/matchResult";
import { shapeFit } from "../deepdive/shapeFit";
import type { Match, MatchResult } from "../engine";
import { RevealCarousel, type CarouselAnimal } from "./RevealCarousel";
import type { FocusKey } from "./ui/revealCarousel";
import { SymbolicProfile } from "./SymbolicProfile";
import {
  buildRunLog,
  buildTranscript,
  extract,
  isInterviewComplete,
  logReaction,
  logRun,
  nominate,
  streamInterviewTurn,
  streamReport,
  stripTranscriptBlock,
  synthesize,
  type AnimalRef,
  type ChatTurn,
  type Decision,
  type ExtractedProfile,
} from "../deepdive/pipeline";
import {
  clearSession,
  loadSession,
  newRunId,
  saveSession,
} from "../deepdive/session";
import {
  AccessDeniedError,
  clearPasscode,
  loadPasscode,
  savePasscode,
  verifyPasscode,
} from "../deepdive/access";

// "locked" = the closed-beta passcode screen, shown before the intro until a valid
// code is stored on this device (see deepdive/access.ts).
type Stage = "locked" | "intro" | "interview" | "processing" | "report" | "error";

// The loading screen's status lines, shown one after another (12s each, holding on
// the last) while extract + synthesis run — about 45s in the smoke runs.
const DEEP_LOADING_LINES = [
  "Receiving your thoughts and feelings…",
  "Weaving the pattern of your personality…",
  "Tracing the shape of your spirit…",
];

function animalRef(id: string): AnimalRef | undefined {
  const a = ANIMAL_BY_ID[id];
  return a ? { id: a.id, name: a.name, note: a.note } : undefined;
}

// Render parsed report segments, wrapping the emphasised ones in <strong>.
function renderSegments(segments: Segment[]) {
  return segments.map((s, i) =>
    s.bold ? <strong key={i}>{s.text}</strong> : <Fragment key={i}>{s.text}</Fragment>,
  );
}

// Deep Dive (Tier 3) — the live conversational tier. Manages the whole flow in
// one screen: intro -> adaptive interview (streamed) -> extract/nominate/synthesize
// -> streamed report on the parchment surface -> one-tap reaction.
export function DeepDive({
  onHome,
  onJoinWaitlist,
}: {
  onHome: () => void;
  onJoinWaitlist: (source: WaitlistSource) => void;
}) {
  // A stored code skips the gate; the server re-checks it on every call, and a
  // rejection (code rotated) sends the reader back here via lockOut().
  // PREVIEW TOOLS: #deep-demo runs the whole flow on canned responses (deepdive/demo.ts)
  // - no passcode, no API spend, nothing saved or logged. The guard is a build-time
  // constant, so production builds contain none of it.
  const [demo] = useState(
    () => (import.meta.env.DEV || __PREVIEW_TOOLS__) && window.location.hash === "#deep-demo",
  );
  const [stage, setStage] = useState<Stage>(() => (demo || loadPasscode() ? "intro" : "locked"));
  const [passcode, setPasscode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [runId, setRunId] = useState<string>("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [streaming, setStreaming] = useState<string>(""); // in-flight interviewer turn
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [decision, setDecision] = useState<Decision | null>(null);
  // The Tier-3 output in MatchResult shape, so the result screen can use the same
  // furniture as Tiers 1-2. Null if the decided animals aren't in the shared
  // library — the screen then falls back to the reading alone.
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [focus, setFocus] = useState<FocusKey>("primary");
  const [report, setReport] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [reaction, setReaction] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLFormElement>(null);
  // Follow the conversation as it grows, unless the reader has scrolled up to reread.
  const followRef = useRef(true);
  // The interviewer's in-flight reply, eased in rather than shown in network bursts.
  const smoothStreaming = useSmoothText(stripTranscriptBlock(streaming));
  const startedRef = useRef(false);


  // --- result furniture -------------------------------------------------------
  // Tier 3 renders through the same components as Tiers 1-2. These are memoised
  // (and the focus handler is stable) so the streaming report's re-renders never
  // remount RevealCarousel and interrupt its intro animation.
  const handleFocus = useCallback((key: FocusKey) => setFocus(key), []);

  const deepData = useMemo(() => {
    if (!matchResult) return null;
    const mk = (match: Match, key: FocusKey) => ({
      key,
      name: match.archetype.name,
      epithet: PROFILES[match.archetype.id]?.epithet ?? "",
      art: animalArtUrl(match.archetype.name) ?? "",
      card: deepCardUrl(match.archetype.id) ?? undefined,
      // Mythology follows the focused animal (as in Results); the symbolic layer
      // is vector-based and stays put.
      reveal: buildDeepReveal({ ...matchResult, primary: match }),
    });
    return [mk(matchResult.primary, "primary" as FocusKey), mk(matchResult.secondary, "secondary" as FocusKey)];
  }, [matchResult]);

  const carouselAnimals: CarouselAnimal[] = useMemo(
    () =>
      (deepData ?? []).map((a) => ({
        key: a.key,
        // "Second nature", not "Nearly": the runner-up is a real part of the reader,
        // not a near-miss. The report prompt's STRUCTURE block is worded to match.
        rankLabel: a.key === "primary" ? "Your core shape" : "Second nature",
        name: a.name,
        epithet: a.epithet,
        // No percentage on purpose: the Tier-3 winner is reasoned by synthesis,
        // not scored, so a cosine split could contradict it (see matchResult.ts).
        pct: undefined,
        art: a.art,
        card: a.card,
        tint: a.key === "primary" ? "var(--tier)" : "#cbe3ff",
        // Top of the funnel — both animals are fully open, nothing to unlock.
        open: true,
        softLock: false,
        unlockHint: "",
      })),
    [deepData],
  );

  // No locked layers exist at Tier 3, so the unlock CTAs are never reachable.
  const noUnlock = useCallback(() => {}, []);

  // Resume a saved interview if one exists (offered on the intro screen).
  const [resumable] = useState(() => (demo ? null : loadSession()));

  // The four network calls; canned in the demo run.
  async function api() {
    if ((import.meta.env.DEV || __PREVIEW_TOOLS__) && demo) {
      return (await import("../deepdive/demo")).demoApi;
    }
    return { streamInterviewTurn, extract, synthesize, streamReport };
  }

  // --- DEV ONLY: render Tier-3 screens without spending an interview ----------
  //   #deep-preview       the result screen, seeded from a fixed profile
  //   #deep-preview-chat  the interview screen, seeded with a canned exchange
  // Costs no API calls. `import.meta.env.DEV` is statically false in a production
  // build, so Rollup drops both blocks from the shipped bundle (verified: none of
  // the sample text appears in dist/). Safe to delete outright.
  useEffect(() => {
    if (!(import.meta.env.DEV || __PREVIEW_TOOLS__)) return;
    if (window.location.hash !== "#deep-preview-chat") return;
    // A mid-interview moment rather than the first question: long assistant turns,
    // a short user reply and a long one, so the styling is judged on the shapes it
    // actually has to hold.
    setMessages([
      {
        role: "assistant",
        content:
          "Let's start here.\n\nTell me about something you made or finished — and what you did with it once it was done.\n\n(doesn't have to be big — a meal, a repair, a piece of writing, a plan that came together, at work or at home)",
      },
      {
        role: "user",
        content:
          "I rebuilt the hosting setup for a side project last month. It had been broken for a while and I kept putting it off. Once it worked I didn't really tell anyone, I just mentioned it to two friends as a complaint about how long it took.",
      },
      {
        role: "assistant",
        content:
          "You mentioned it as a complaint rather than as a thing you'd done.\n\nWhat would it have cost you to say it plainly — that you fixed something hard?",
      },
      { role: "user", content: "Honestly I'd have felt like I was asking for something." },
      {
        role: "assistant",
        content:
          "That's worth sitting with. Asking for what, do you think — attention, or permission to be pleased with it?",
      },
    ]);
    setRunId("preview");
    setStage("interview");
  }, []);

  useEffect(() => {
    if (!(import.meta.env.DEV || __PREVIEW_TOOLS__)) return;
    //   #deep-preview/<id>    that animal's card in focus (e.g. #deep-preview/dolphin)
    //   #deep-preview-stream  the sample reading typed in as if streaming
    //   #deep-preview-loading the loading screen, left running
    const hash = window.location.hash;
    if (hash === "#deep-preview-loading") {
      setStage("processing");
      return;
    }
    const streamIt = hash === "#deep-preview-stream";
    if (hash !== "#deep-preview" && !hash.startsWith("#deep-preview/") && !streamIt) return;
    const focusId = hash.slice("#deep-preview/".length);
    // Roughly the made-up person behind the sample reading (Bear, Cat second nature).
    const axes = [
      { code: "SOC", score: -2, evidence: "long rides alone", confidence: "high" },
      { code: "TMP", score: -1, evidence: "slept on it for a week", confidence: "medium" },
      { code: "COG", score: -1, evidence: "wrote out pros and cons", confidence: "medium" },
      { code: "BND", score: 2, evidence: "the third time, said so in the meeting", confidence: "high" },
      { code: "AUT", score: 1, evidence: "the numbers were mine", confidence: "medium" },
      { code: "REC", score: -1, evidence: "only told people once it worked", confidence: "medium" },
      { code: "NOV", score: 1, evidence: "took up pottery, loved being a beginner", confidence: "medium" },
      { code: "EXP", score: -1, evidence: "shows it by fixing things", confidence: "medium" },
    ] as ExtractedProfile["axes"];
    const n = nominate(axes);
    if (!n.ok) return;
    const winnerId = focusId && ANIMAL_BY_ID[focusId] ? focusId : "bear";
    const mockDecision: Decision = {
      winner_id: winnerId,
      runnerup_id: winnerId === "cat" ? "bear" : "cat",
      distinction: "",
      comparison_notes: "",
      decided_on_low_confidence: false,
    };
    setDecision(mockDecision);
    setMatchResult(toMatchResult(axes, n.ranked, mockDecision));
    // A real report from a smoke run (made-up person), kept in its own dev-only
    // module; the dynamic import sits behind the DEV check, so it never ships.
    let timer = 0;
    void import("../deepdive/previewReport").then((m) => {
      setStage("report");
      if (!streamIt) {
        setReport(m.PREVIEW_REPORT);
        setReportDone(true);
        return;
      }
      // A thinking pause, then ~40 characters every 50ms, like a real stream.
      let at = 0;
      timer = window.setTimeout(function tick() {
        at = Math.min(at + 40, m.PREVIEW_REPORT.length);
        setReport(m.PREVIEW_REPORT.slice(0, at));
        if (at < m.PREVIEW_REPORT.length) timer = window.setTimeout(tick, 50);
        else setReportDone(true);
      }, 3000);
    });
    return () => window.clearTimeout(timer);
  }, []);

  // Every stage of the Deep Dive starts at the top of the page — otherwise the
  // scroll position carries over from wherever the reader was (e.g. deep down the
  // landing page when they picked the tier) and the new screen opens mid-way.
  // Scroll the WINDOW, never scrollIntoView: `.app` is overflow:hidden, so
  // scrollIntoView scrolls it internally and shoves the header off-screen.
  useEffect(() => {
    window.scrollTo(0, 0);
    // `.app` is technically scrollable too; reset it so the header stays put.
    document.querySelector<HTMLElement>(".app")?.scrollTo(0, 0);
  }, [stage]);

  // Keep the latest turn in view, just above the sticky compose bar. The WINDOW is
  // what scrolls on this page (.dd-chat__scroll never overflows - see styles.css),
  // so scrolling that element did nothing and readers had to scroll by hand.
  // How far the end of the conversation sits below the top of the compose bar.
  const overflowBelowCompose = () => {
    const end = scrollRef.current?.getBoundingClientRect().bottom;
    const composeTop = composeRef.current?.getBoundingClientRect().top;
    return end === undefined || composeTop === undefined ? 0 : end - composeTop;
  };
  useEffect(() => {
    if (stage !== "interview") return;
    // Scrolling well up to reread pauses following; coming back down resumes it.
    const onScroll = () => {
      followRef.current = overflowBelowCompose() < 200;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [stage]);
  useEffect(() => {
    if (stage !== "interview" || !followRef.current) return;
    const overflow = overflowBelowCompose();
    if (overflow > 0) window.scrollBy({ top: overflow });
  }, [stage, messages, smoothStreaming, busy, error]);

  // The server rejected the stored code (e.g. it was rotated). Forget it and return
  // to the gate. The interview transcript stays saved, so it resumes after unlock.
  function lockOut() {
    clearPasscode();
    setStreaming("");
    setError("");
    setLockMessage("Your access code has changed. Please enter the new one to continue.");
    setStage("locked");
  }

  async function unlock() {
    const code = passcode.trim();
    if (!code || unlocking) return;
    setUnlocking(true);
    setLockMessage("");
    const outcome = await verifyPasscode(code);
    setUnlocking(false);
    if (outcome === "ok") {
      savePasscode(code);
      setPasscode("");
      setStage("intro");
    } else if (outcome === "wrong") {
      setLockMessage("That code didn't work. Check it and try again.");
    } else if (outcome === "closed") {
      setLockMessage("The Deep Dive isn't open yet.");
    } else {
      setLockMessage("Couldn't check the code just now. Please try again.");
    }
  }

  function persist(next: ChatTurn[], id: string) {
    if (demo) return;
    saveSession({ runId: id, messages: next, createdAt: new Date().toISOString() });
  }

  // --- interview -------------------------------------------------------------

  async function runInterviewTurn(history: ChatTurn[], id: string) {
    setBusy(true);
    setError("");
    setStreaming("");
    try {
      const full = await (await api()).streamInterviewTurn(history, setStreaming);
      const assistantTurn: ChatTurn = { role: "assistant", content: full };
      const next = [...history, assistantTurn];
      setMessages(next);
      setStreaming("");
      persist(next, id);
      if (isInterviewComplete(full)) {
        // Leave the closing lines ("give me a moment…") on screen long enough to
        // read; the pipeline starts now, only the switch to the loading screen waits.
        void finishInterview(next, id, 2500);
      }
    } catch (err) {
      if (err instanceof AccessDeniedError) return lockOut();
      setError(err instanceof Error ? err.message : "The interview hit a snag.");
      setStreaming("");
    } finally {
      setBusy(false);
    }
  }

  function beginInterview(resume: boolean) {
    const session = resume ? resumable : null;
    const id = session?.runId ?? newRunId();
    setRunId(id);
    setStage("interview");
    if (session && session.messages.length > 0) {
      setMessages(session.messages);
      const last = session.messages[session.messages.length - 1];
      if (last.role === "assistant" && isInterviewComplete(last.content)) {
        // The interviewer had already closed — jump straight to the reading.
        void finishInterview(session.messages, id);
      } else if (last.role === "user") {
        // Their answer was saved but the interviewer's reply never arrived (e.g.
        // the connection dropped mid-turn). Ask for it now, or the resumed
        // interview would sit there with no next question and no way forward.
        void runInterviewTurn(session.messages, id);
      }
    } else {
      void runInterviewTurn([], id);
    }
  }

  function submitAnswer() {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    followRef.current = true; // sending always brings the conversation back into view
    setMessages(next);
    setInput("");
    persist(next, runId);
    void runInterviewTurn(next, runId);
  }

  // --- processing (extract -> nominate -> synthesize -> report) --------------

  async function finishInterview(finalMessages: ChatTurn[], id: string, revealDelayMs = 0) {
    if (revealDelayMs > 0) {
      // Only move on if nothing else has (an early error or result wins).
      window.setTimeout(() => setStage((s) => (s === "interview" ? "processing" : s)), revealDelayMs);
    } else {
      setStage("processing");
    }
    setBusy(true);
    try {
      const transcript = buildTranscript(finalMessages);

      const profile: ExtractedProfile = await (await api()).extract(transcript);

      const nomination = nominate(profile.axes);
      if (!nomination.ok) {
        setError(
          "The interview didn't produce a clear enough direction to read. This usually means the answers stayed general — try again and answer with specific stories.",
        );
        setStage("error");
        return;
      }

      const dec = await (await api()).synthesize(profile.axes, profile.gaps, nomination.candidates);
      setDecision(dec);
      setMatchResult(toMatchResult(profile.axes, nomination.ranked, dec));

      // Beta log (derived vector + ranking only; fire-and-forget).
      if (!demo) logRun(buildRunLog(id, new Date().toISOString(), profile.axes, nomination.ranked, dec));

      // Fetch both cards while the loading screen is still up, so the carousel's
      // intro reveals the paintings rather than empty frames (capped at 2.5s).
      await preloadCards(
        [dec.winner_id, dec.runnerup_id].map(deepCardUrl).filter((u): u is string => u !== null),
      );

      // Stream the report.
      setStage("report");
      setBusy(false);
      await (await api()).streamReport(
        {
          transcript,
          axes: profile.axes,
          gaps: profile.gaps,
          aspiration: profile.aspiration,
          decision: dec,
          winner: animalRef(dec.winner_id),
          runnerUp: animalRef(dec.runnerup_id),
          fit: shapeFit(profile.axes, dec.winner_id, dec.runnerup_id),
        },
        setReport,
      );
      setReportDone(true);
      clearSession(); // the run is complete; don't offer to resume it
    } catch (err) {
      if (err instanceof AccessDeniedError) return lockOut();
      setError(err instanceof Error ? err.message : "Something went wrong generating your reading.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  function chooseReaction(n: number) {
    if (reaction !== null) return;
    setReaction(n);
    if (runId && !demo) logReaction(runId, n);
  }

  function restart() {
    clearSession();
    setMessages([]);
    setStreaming("");
    setInput("");
    setError("");
    setDecision(null);
    setMatchResult(null);
    setFocus("primary");
    setReport("");
    setReportDone(false);
    setReaction(null);
    startedRef.current = false;
    setStage("intro");
  }

  // ---------------------------------------------------------------------------

  if (stage === "locked") {
    return (
      <Layout header={{ tier: "deep", onHome }}>
        <main className="view view--center dd-intro dd-gate">
          <span className="kicker">Deep Dive · Closed beta</span>
          <h1 className="landing__title">The Deep End</h1>
          <p className="landing__sub">
            The Deep Dive is open to beta testers for now. Enter your access code to begin.
          </p>
          <form
            className="dd-gate__form"
            onSubmit={(e) => {
              e.preventDefault();
              void unlock();
            }}
          >
            <input
              type="password"
              className="waitlist__input"
              placeholder="Access code"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Access code"
              aria-invalid={lockMessage ? true : undefined}
              disabled={unlocking}
            />
            {lockMessage && (
              <p className="waitlist__error" role="alert">
                {lockMessage}
              </p>
            )}
            <Button
              type="submit"
              variant="luminous"
              size="lg"
              caps
              glow
              className="dd-intro__cta"
              disabled={unlocking || !passcode.trim()}
            >
              {unlocking ? "Checking…" : "Unlock"}
            </Button>
          </form>
          <div className="dd-intro__actions">
            <button type="button" className="dd-textlink" onClick={() => onJoinWaitlist("home-card")}>
              No code? Join the waitlist
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  if (stage === "intro") {
    return (
      <Layout header={{ tier: "deep", onHome }}>
        <main className="view view--center dd-intro">
          <span className="kicker">{(import.meta.env.DEV || __PREVIEW_TOOLS__) && demo ? "Deep Dive · Demo run, no AI" : "Deep Dive"}</span>
          <h1 className="landing__title">The Deep End</h1>
          <p className="landing__sub">
            Welcome to your Deep Dive. In this section you'll answer a series of questions, one by
            one. Your results will reflect the time you invest and how much detail you give. What you
            share here remains private to you. Take your time with this one, and if you like, receive
            the questions as an exploration to sit with for a little while.
          </p>
          <p className="dd-intro__question">What Shape will your Spirit take?</p>

          <div className="dd-intro__actions">
            {resumable && resumable.messages.length > 0 ? (
              <>
                <Button
                  variant="luminous"
                  size="lg"
                  caps
                  glow
                  className="dd-intro__cta"
                  onClick={() => beginInterview(true)}
                >
                  Resume your Deep Dive
                </Button>
                <button type="button" className="dd-textlink" onClick={() => beginInterview(false)}>
                  Start over instead
                </button>
              </>
            ) : (
              <Button
                variant="luminous"
                size="lg"
                caps
                glow
                className="dd-intro__cta"
                onClick={() => beginInterview(false)}
              >
                Begin the Deep Dive
              </Button>
            )}
          </div>

          {/* Second notice point: the intro is where the reader decides to start, so the
              AI-processing line is stated here too, before any free text is written. */}
          <p className="ss-disclaimer dd-intro__note">
            This will take between 30 and 60 minutes. Take your time. Your answers are never shown
            to other users. To run the interview and write your reading, they are processed by our
            AI provider, Anthropic, in the US. <a href="#privacy">How we handle your data</a>
          </p>
        </main>
      </Layout>
    );
  }

  if (stage === "interview") {
    return (
      <Layout header={{ tier: "deep", showBack: true, onBack: onHome, onHome }}>
        <main className="view dd-chat">
          <div className="dd-chat__scroll" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`dd-msg dd-msg--${m.role}`}>
                {m.role === "assistant" ? stripTranscriptBlock(m.content).trim() : m.content}
              </div>
            ))}
            {smoothStreaming.trim() && <div className="dd-msg dd-msg--assistant">{smoothStreaming.trim()}</div>}
            {busy && !smoothStreaming.trim() && <div className="dd-msg dd-msg--assistant dd-msg--typing">…</div>}
            {error && <div className="dd-error">{error} <button className="dd-textlink" onClick={() => runInterviewTurn(messages, runId)}>Retry</button></div>}
          </div>

          <form
            ref={composeRef}
            className="dd-compose"
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer();
            }}
          >
            <textarea
              className="dd-compose__input"
              // Pre-trial feedback: "Answer with a real story" put people on the spot —
              // they could not always recall a specific situation on demand. This asks for
              // no particular form. The interviewer's own questions still press for
              // specifics, so the material the extraction needs is not lost here.
              placeholder="Take your time. However it comes out is fine…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitAnswer();
                }
              }}
              disabled={busy}
              rows={3}
            />
            <div className="dd-compose__row">
              <span className="dd-compose__hint">⌘↵ to send · progress saves automatically</span>
              <Button type="submit" variant="luminous" caps disabled={busy || !input.trim()}>
                Send
              </Button>
            </div>
            {/*
              GDPR Art. 13 favours notice AT COLLECTION, and this is sensitive free text
              plus a US transfer, so a notice sits at the compose box rather than only in
              the privacy policy. Deliberately terse (2026-07-27): the EDPB's layered-notice
              guidance treats a SHORT notice plus a link to the full policy as satisfying
              Art. 13, so the LINK is the load-bearing part, not the prose. The fuller
              statement is on the intro screen, before anything is written; this one persists
              because a 45-minute interview leaves that intro far behind. The `#privacy`
              hash opens the Legal overlay above this screen (App.tsx) without unmounting the
              interview, so the link is safe to follow mid-run.
              PENDING LAWYER PASS: wording, plus explicit consent and a retention/erasure
              statement for stored free text (HANDOVER §11.4 item 4).
            */}
            {/* The first line is the notice at collection; only the second is a link.
                NOTE: the US-transfer fact now lives in the policy alone, which the
                layered-notice approach supports — but if the lawyer wants it surfaced
                here, "Anthropic" becomes "Anthropic (US)" and nothing else changes. */}
            <p className="dd-compose__notice">
              Your answers are sent to Anthropic to generate your results.
              <br />
              <a href="#privacy">Read more about how we handle your data.</a>
            </p>
          </form>
        </main>
      </Layout>
    );
  }

  if (stage === "processing") {
    // The same full-screen particle swarm Tiers 1-2 use, in the Deep Dive's own
    // colour scope. No `onDone`: extract → synthesize takes an indeterminate time,
    // so the swarm loops until finishInterview moves the stage on.
    return (
      <Loading
        tier="deep"
        kicker="Reading your Deep Dive"
        lines={DEEP_LOADING_LINES}
        lineMs={12000}
        holdLast
        sub="Examining closely. This takes a moment."
      />
    );
  }

  if (stage === "error") {
    return (
      <Layout header={{ tier: "deep", onHome }}>
        <main className="view view--center dd-processing">
          <p className="dd-processing__step">A snag</p>
          <p className="dd-processing__sub">{error}</p>
          <div className="dd-intro__actions">
            <Button variant="luminous" caps onClick={restart}>
              Start again
            </Button>
            <button type="button" className="dd-textlink" onClick={onHome}>
              Back to home
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  // report — the Tier-3 result, rendered through the Tiers 1-2 furniture
  // (RevealCarousel + Mythology + SymbolicProfile) with the long LLM reading as
  // its own section rather than a replacement for them.
  const winner = decision ? animalRef(decision.winner_id) : undefined;
  const focusData = deepData?.find((a) => a.key === focus) ?? deepData?.[0] ?? null;

  const renderBlocks = (blocks: Block[]) =>
    blocks.map((block, i) =>
      block.type === "heading" ? (
        <h2 key={i} className="dd-report__h">
          {renderSegments(block.lines[0])}
        </h2>
      ) : (
        <p key={i} className="dd-report__p">
          {block.lines.map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderSegments(line)}
            </Fragment>
          ))}
        </p>
      ),
    );

  // While the report streams, it renders as one live column - watching it write is
  // part of the moment, and sections cannot be grouped from half a heading anyway.
  // It reorganises into rows once the stream closes.
  // Finished: the full structure. Still streaming: the same rows, filling in (see
  // structurePartial), so nothing opens and then snaps shut when the report ends.
  const structured = reportDone ? structureReport(report) : null;
  const partial = reportDone ? null : structurePartial(report);
  const rows = structured?.sections ?? partial?.sections ?? [];
  const distillation = structured?.distillation ?? partial?.distillation ?? null;

  return (
    <Layout header={{ tier: "deep", showBack: true, onBack: onHome, onHome }}>
      <main className="view view--center view--content">
        {carouselAnimals.length > 0 ? (
          <RevealCarousel
            animals={carouselAnimals}
            tierScope="deep"
            muddy={matchResult?.muddy ?? false}
            onFocus={handleFocus}
            hint={null}
          />
        ) : (
          winner && (
            // Fallback: the decided animal isn't in the shared library, so there is
            // no artwork/mythology to hang furniture on. Show the reading alone.
            <header className="dd-report__head">
              <span className="dd-report__eyebrow">Your animal shape</span>
              <h1 className="dd-report__animal">{winner.name}</h1>
            </header>
          )
        )}

        <div className="reveal__body dd-reveal-body">
          {/* The distillation, lifted out of its written position (fifth, after ~900
              words) to sit directly under the carousel, always open. The report prompt
              writes it as "the version someone screenshots and remembers", which only
              works if they reach it. Found by shape, not heading text - see
              deepdive/reportSections.ts. */}
          {/* Shown from the start, holding its space: the model writes this fifth,
              and a panel that appeared only then pushed the whole reading down. */}
          {(distillation || !reportDone) && (
            <section className="panel dd-short">
              <p className="section-label">{distillation?.title || "The short version"}</p>
              <article className="dd-report__body sa-reading dd-short__body">
                {distillation ? (
                  renderBlocks(distillation.blocks)
                ) : (
                  <p className="dd-short__pending">Distilled once your reading is written…</p>
                )}
              </article>
            </section>
          )}

          {/* The reading — Tier 3's payoff. Keeps its own parchment surface; each
              section of it is a row, with the opening one (where the animal lands)
              already open. */}
          <section className="panel">
            <p className="section-label">Your reading</p>
            {rows.length > 0 ? (
              <div className="dd-report__body sa-reading">
                {structured && structured.lead.length > 0 && <div>{renderBlocks(structured.lead)}</div>}
                {/* Everything starts collapsed (user's call, after seeing real output:
                    "At your core" runs ~490 words, which open by default filled a screen
                    and a half before the reader reached any other row). Collapsed, the
                    whole result — carousel, distillation and a nine-row index — sits in
                    about 1,900px. */}
                {rows.map((section, i) => (
                  <Disclosure
                    key={`${section.title}-${i}`}
                    title={section.title}
                    status={partial?.writing === section.title ? "writing…" : undefined}
                  >
                    {renderBlocks(section.blocks)}
                    {/* After the closing questions: the one way forward from a finished
                        reading. There is no "take it again" - a second run costs money
                        and weakens the profile - so this is a sign-up for what comes next. */}
                    {reportDone && i === rows.length - 1 && (
                      <div className="dd-deepen">
                        <p className="dd-deepen__text">
                          Want to go further? We're building a next layer that picks up where this
                          reading ends.
                        </p>
                        <Button variant="luminous" caps onClick={() => onJoinWaitlist("deepen")}>
                          Deepen the Deep Dive
                        </Button>
                      </div>
                    )}
                  </Disclosure>
                ))}
              </div>
            ) : (
              // The model thinks before its first word (~15s): say so, quietly.
              <p className="dd-report__waiting">Writing your reading…</p>
            )}
          </section>

          {/* Mythology and the symbolic layer share one box. They are different kinds
              of content - the myth rows follow the carousel focus, the symbolic layer is
              vector-based and does not - but as three collapsed rows they read as one
              "what this shape means" group. The focused animal is named on the origin
              row (both myth rows are its), since the panel label no longer carries it. */}
          {(deepData || focusData) && (
            <section className="panel">
              <p className="section-label">Mythology &amp; symbolism</p>

              {focusData && focusData.reveal.mythologyParas.length > 0 && (
                // Composed here rather than through <Mythology> so the origin and the
                // older-myth beat can be separate rows. <Mythology> stays exactly as it
                // is for Tiers 1-2, whose output must not change.
                <>
                  <Disclosure title={`The origin of your spirit · ${focusData.name}`}>
                    {/* .reveal-list supplies the paragraph rhythm, as it does inside
                        <Mythology> for Tiers 1-2. Without it the levels run together. */}
                    <div className="reveal-list">
                      {focusData.reveal.mythologyParas.map((p, i) => (
                        <p key={i} className="mythology__text">
                          {p}
                        </p>
                      ))}
                      {focusData.reveal.mythologyDisclaimer && (
                        <p className="mythology__disclaimer">
                          {focusData.reveal.mythologyDisclaimer}
                        </p>
                      )}
                    </div>
                  </Disclosure>
                  {focusData.reveal.mythologyOlderMyth && (
                    <Disclosure title="The older myth">
                      <p className="mythology__text">{focusData.reveal.mythologyOlderMyth}</p>
                    </Disclosure>
                  )}
                </>
              )}

              {/* Vector-based, so it does not follow the carousel focus. */}
              {deepData && (
                <Disclosure title="Symbolic echoes">
                  <SymbolicProfile items={deepData[0].reveal.symbolic} onUnlock={noUnlock} bare />
                </Disclosure>
              )}
            </section>
          )}
        </div>

        {/* Share card. Tier 3 is the only one that puts written words on the card —
            the distillation, which is why this is an image the reader places rather
            than a page we host. Lines are taken from the promoted section verbatim. */}
        {reportDone && deepData && focusData && (
          <ShareCard
            content={buildCardContent(
              deepData[0].name,
              deepData[0].epithet,
              deepData[0].reveal,
              structured?.distillation
                ? structured.distillation.blocks.flatMap((b) =>
                    b.lines.map((l) => l.map((s) => s.text).join("")),
                  )
                : [],
            )}
            artUrl={deepData[0].art}
            filenameBase={`anyma-${deepData[0].name.toLowerCase()}`}
          />
        )}

        {reportDone && (
          <footer className="dd-report__foot">
            <div className="dd-reaction">
              <p className="dd-reaction__q">How much does this feel like you?</p>
              {reaction === null ? (
                <div className="dd-reaction__scale" role="group" aria-label="Rate 1 to 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className="dd-reaction__dot" onClick={() => chooseReaction(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="dd-reaction__thanks">Thank you.</p>
              )}
            </div>

            <p className="dd-report__disclaimer">
              {/* TODO(legal): replace with the lawyer-reviewed fuller disclaimer (prep kit §3.8). */}
              A reading, not a diagnosis. This is not medical, psychological, or professional
              advice. If you're struggling, please reach out to a qualified professional or a
              local support line.
            </p>

            <div className="dd-intro__actions">
              <button type="button" className="dd-textlink" onClick={onHome}>
                Back to home
              </button>
            </div>
          </footer>
        )}
      </main>
    </Layout>
  );
}
