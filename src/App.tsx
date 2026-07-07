import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import type { Answers, MatchResult } from "./engine";
import type { TierId } from "./data/copy";
import { TIERS } from "./tiers";
import { Home } from "./components/Home";
import { Quiz } from "./components/Quiz";
import { Loading } from "./components/Loading";
import { Results } from "./components/Results";
import { WaitlistModal } from "./components/WaitlistModal";
import { Legal } from "./components/Legal";
import type { LegalPage } from "./components/Legal";
import { clearProgress, loadProgress, saveProgress } from "./persistence/sessions";
import type { InProgressSession } from "./persistence/sessions";
import type { WaitlistSource } from "./persistence/waitlist";
import { logResult } from "./persistence/remoteLog";

type Screen =
  | { name: "home" }
  | { name: "quiz"; tier: TierId; resume?: InProgressSession }
  | { name: "loading"; tier: TierId; result: MatchResult }
  | { name: "reveal"; tier: TierId; result: MatchResult };

// Legal pages are hash-routed (#impressum / #privacy / #terms) and render as an overlay
// above whatever screen is active — so the footer's Impressum link works from anywhere
// and the pages have shareable URLs + a working browser Back button.
// The Imprint lives at the top of the combined #privacy page; #imprint / #impressum are
// kept as aliases so any stray link still lands on it.
function parseLegalHash(): LegalPage | null {
  const h = window.location.hash.replace(/^#/, "");
  if (h === "privacy" || h === "imprint" || h === "impressum") return "privacy";
  if (h === "terms") return "terms";
  return null;
}

// Each screen renders its own night Shell/Header (handoff pattern), so App is
// just the screen state machine: landing → quiz → loading → reveal.
export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  // Deep Dive (Phase 3) isn't built — its buttons open a waitlist instead. Null = closed.
  const [waitlist, setWaitlist] = useState<WaitlistSource | null>(null);
  // Legal overlay, driven entirely by the URL hash (footer links, tabs, Back button).
  const [legal, setLegal] = useState<LegalPage | null>(() => parseLegalHash());

  useEffect(() => {
    const onHashChange = () => setLegal(parseLegalHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const closeLegal = () => {
    // Drop the hash without leaving a bare "#", then close.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setLegal(null);
  };

  const goHome = () => setScreen({ name: "home" });

  function openWaitlist(source: WaitlistSource) {
    track("waitlist_open", { source });
    setWaitlist(source);
  }

  function startTier(tier: TierId) {
    clearProgress(tier);
    track("quiz_start", { tier, resumed: false });
    setScreen({ name: "quiz", tier });
  }

  function resumeTier(tier: TierId, session: InProgressSession) {
    track("quiz_start", { tier, resumed: true });
    setScreen({ name: "quiz", tier, resume: session });
  }

  function completeTier(tier: TierId, answers: Answers) {
    clearProgress(tier);
    const result = TIERS[tier].run(answers);
    track("quiz_complete", {
      tier,
      primary: result.primary.archetype.id,
      secondary: result.secondary.archetype.id,
      splitPrimary: result.split.primary,
      muddy: result.muddy,
    });
    logResult(tier, result); // anonymous result -> Supabase (no-op if backend unconfigured)
    setScreen({ name: "loading", tier, result });
  }

  // Start (or resume) a specific tier — used by the result page's nudge and the
  // locked-content "Unlock at …" placeholders.
  function goToTier(tier: TierId) {
    const session = loadProgress(tier);
    if (session) resumeTier(tier, session);
    else startTier(tier);
  }

  let screenEl: JSX.Element;
  switch (screen.name) {
    case "home":
      screenEl = (
        <Home onStart={startTier} onResume={resumeTier} onHome={goHome} onDeepDive={openWaitlist} />
      );
      break;

    case "quiz":
      screenEl = (
        <Quiz
          key={screen.tier + (screen.resume ? "-resume" : "-fresh")}
          tier={screen.tier}
          questions={TIERS[screen.tier].questions}
          initialAnswers={screen.resume?.answers}
          initialIndex={screen.resume?.index}
          onProgress={(answers, index) =>
            saveProgress(screen.tier, answers, index, TIERS[screen.tier].questions.length)
          }
          onComplete={(answers) => completeTier(screen.tier, answers)}
          onCancel={goHome}
        />
      );
      break;

    case "loading":
      screenEl = (
        <Loading
          tier={screen.tier}
          onDone={() => setScreen({ name: "reveal", tier: screen.tier, result: screen.result })}
        />
      );
      break;

    case "reveal":
      screenEl = (
        <Results
          tier={TIERS[screen.tier]}
          result={screen.result}
          onRetake={() => startTier(screen.tier)}
          onUnlock={goToTier}
          onHome={goHome}
          onDeepDive={openWaitlist}
        />
      );
      break;
  }

  return (
    <>
      {screenEl}
      {waitlist !== null && (
        <WaitlistModal source={waitlist} onClose={() => setWaitlist(null)} />
      )}
      {legal !== null && <Legal page={legal} onClose={closeLegal} />}
    </>
  );
}
