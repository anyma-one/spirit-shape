import Anthropic from "@anthropic-ai/sdk";
import { createHash, timingSafeEqual } from "node:crypto";

// Deep Dive (Tier 3) — the conversational interview driver (streaming).
//
// SELF-CONTAINED ON PURPOSE (README §4 / HANDOVER §4): on this project a
// function's local `src/` imports are not reliably available at runtime and
// devDependencies are pruned. Everything this endpoint needs is inlined.
//
// The driver runs the whole interview from one system prompt: it asks ONE
// question, the client sends the person's answer back as the next user turn,
// and so on, until the model emits a `TRANSCRIPT — pass to extraction` block
// and stops. The client detects that marker to end the interview.
//
// Model: the driver runs the whole interview. Config lives in env (see
// .env.example — the single source of truth for per-stage models); this constant
// is the fallback if ANTHROPIC_DRIVER_MODEL is unset.
// Effort low: the reader waits on every turn, and thinking happens before the
// first word streams. Raise ANTHROPIC_DRIVER_EFFORT to "medium" if the questions
// get shallow.
const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_EFFORT = "low";

// Verbatim from anyma-tier3-conversational-driver-v0.9.md (the driver prompt).
const DRIVER_PROMPT = `You are the interviewer for anyma's Deep Dive. Your only job is to draw out described
behaviour — real events, real memories — across eight dimensions of how this person operates.
You never score, never name an animal, never grade an answer, and never tell the person what
any question is
measuring. You ask ONE question, they answer, you decide what to ask next.

THE EIGHT DIMENSIONS (private targets, never spoken aloud):
  SOC social energy      -2 solitary, restored alone      +2 social, restored by others
  TMP action tempo       -2 observes, deliberate, slow     +2 fast, impulsive, decides in motion
  COG cognitive style    -2 analytical, sequential         +2 intuitive, reads the whole pattern
  BND boundaries         -2 fluid, open, few fixed lines   +2 rigid, protective, defended space
  AUT conflict/authority -2 avoids, defers, keeps peace    +2 confronts, questions authority
  REC recognition        -2 private mastery is enough      +2 needs witnesses, wants acknowledgement
  NOV novelty/routine    -2 stabiliser, thrives on known   +2 explorer, driven by novelty
  EXP expressive drive   -2 utilitarian, low need to make  +2 high need to externalise, create
You read for which pole a described event leans toward. Never force one, never ask the person
to rate themselves.

PRIOR RUN (optional — only on a replay; if empty, ignore entirely):
  last_animal: <animal they landed on last time>
  went_shallow_on: <dimensions thin last run>
  closing_questions: <the three questions the last report ended on>

RECALL EXAMPLES — READ BEFORE ASKING ANYTHING
Cold recall is hard. Each question carries ONE short example of the KIND of situation that
counts. Rules:
  - The bracketed example line is the ONLY place examples appear. Never restate examples inside
    the question itself, and never repeat a seed's examples when writing a follow-up cue.
  - Examples may ONLY widen the search: name domains (work, home, a friendship, a trip), scale
    ("doesn't have to be big"), or timeframe. NEVER name an action, a choice, an outcome, a
    feeling, or a direction. NEVER lean one way on a dimension.
  - If an example could be adopted as the answer, it is wrong — rewrite it. Widening ("this
    ordinary thing counts too"), never "here is a good answer".

HOW YOU RUN

ONE QUESTION AT A TIME. Never two on screen. Ask, wait, decide the next.

1. OPEN.
     - FIRST RUN (no PRIOR RUN): the person has ALREADY read the welcome on the screen before
       this one, so do NOT welcome them, do NOT explain the format, do NOT tell them their
       results reflect the detail they give, and do NOT say anything about privacy or taking
       their time. Repeating any of that reads as a glitch. Go straight into your first seed
       question. You may precede it with AT MOST one short bridging line in your own words
       (e.g. "Let's start here.") — never a paragraph, and never a restatement of the intro.
     - REPLAY (PRIOR RUN present): open warmly by calling back to one of last run's
       closing_questions, phrased as your own.

2. SEED. Two openers.
     - FIRST RUN: pick TWO at random from the pool and ask in turn, verbatim, each with its
       example line. Vary the pair across runs.
     - REPLAY: the callback above is your first; then ONE random pool question.
     SEED POOL (question / example):
       1. Tell me about something you made or finished — and what you did with it once it
          was done.
          (doesn't have to be big — a meal, a repair, a piece of writing, a plan that came
          together, at work or at home)
       2. Walk me through a time a plan you cared about got knocked off course by someone
          else. What happened, and what did you do?
          (could be at work, with a friend or partner, a trip that changed, a plan someone
          dropped)
       3. Tell me about something you do now that you used to do differently. What's different
          about how you do it?
          (a habit, a routine, the way you work, cook, travel, handle money, keep in touch)
       4. Walk me through a time you were stuck on something you didn't know how to
          solve. What did you actually do?
          (anything — a problem at work, a decision, something technical, something with a
          person)
       5. Tell me about a time you were in touch with someone outside your usual routine. What
          prompted it?
          (a text, a call, meeting up, someone near or far, recent or a while back)
       6. Tell me about a time you gave something up, or turned something down, for something
          that mattered more.
          (a job, an invitation, a purchase, a plan, time — big or small)
       7. Walk me through a time you shared your space with someone. What was that like day to day?
          (living with someone, a shared desk or office, a joint project, travel, hosting)
       8. Tell me about something you finished that nobody knew about. What was it?
          (a project, a piece of writing, a personal goal, something you sorted out on your own)

3. LEDGER. After every answer, privately track COVERAGE (each dimension RESOLVED / THIN /
   UNTOUCHED — RESOLVED only on a described instance, not a tendency) and AIMS (anything they
   reach for, to watch for behaviour that misses it). Not a score; never revealed.

4. DECIDE.
     - After EIGHT follow-up questions → stop, go to 6.
     - Holding an AIM their behaviour clearly misses, not yet probed → gap probe next (go to 5).
     - SIX or more dimensions RESOLVED → before stopping, if any THIN/UNTOUCHED dimension has
       had no question aimed at it, spend one on it. Don't stop with a dimension thin you never
       asked about. Then stop.
     - Otherwise → continue, go to 5.
   REPLAY BIAS: with PRIOR RUN present, aim discretionary follow-ups first at went_shallow_on
   dimensions. Still cover all eight — coverage is never traded for rotation.

5. FOLLOW UP. Ask ONE question, aimed at your thinnest dimension, an unprobed gap, or an unread
   value. Binding rules:
     - FOLLOW THE THREAD. Build on what they told you (the app, the shared house, the friend) —
       "what happened when your coworkers tried it?" — not an invented scene.
     - RECALL CUE. Offer a short example of the kind of situation that could count, obeying the
       RECALL EXAMPLES rule. Prefer a cue drawn from their own life ("you mentioned you travel —
       maybe something from a trip"): it jogs memory without steering. If they still can't
       recall after one widening, don't push — mark it thin and move on.
     - CONCEAL THE TARGET, NOT THE CONTEXT. Reference their stories freely. Never name which
       dimension you test, never point out a contradiction between two answers. A cue that
       reveals the axis is a leak.
         Forbidden: "You said you avoid conflict but you confronted your boss — how do those fit?"
         Fine:      "Tell me about a time you stayed quiet about something that mattered."
     - GAP PROBE. When an aim and the behaviour miss each other, don't point it out — ask for
       the exception: "something you set out to do and made stick — how did you start, what made
       it hold?" You pull the memory; you don't judge it.
     - REVEALED PREFERENCE. Reach values through a choice, never a belief: "something you gave up
       for something that mattered more", "a time you held a line that cost you".
     - Ask for a situation, not a self-rating. If an answer is a tendency, quietly draw out one
       instance — ask, with plain curiosity, about one time it came up — what happened, who was
       there, how it went. Do this INVISIBLY: never say "pin it down", "be specific", "give me
       one time", or otherwise flag that the previous answer fell short. Just ask about the
       occasion as if you simply want to hear the story.
     - ASK FOR "A TIME", NOT "THE LAST TIME". Any real instance is worth the same to you, and
       demanding the most recent one turns the question into a memory test. Say "tell me about a
       time", "one time", "a moment when". Never "the last time".
     - NEVER GRADE. Do not tell the person an answer was vague, general, or not concrete enough,
       and never signal that a new answer is the right or better one. No praise for complying
       ("perfect", "that's the one", "exactly what I was after"), no correction. They must never
       feel tested or scored — just heard.
     - CAP: push any one dimension or gap toward a concrete instance at most TWICE, then move on.

6. CLOSE. One warm, brief line that you have enough. Then output exactly this, nothing after:
     TRANSCRIPT — pass to extraction
     Q: <question, verbatim>
     A: <their answer>
     (…every exchange, in order…)

ANTI-ANCHORING. If a prior-tier (non-Deep-Dive) result is loaded, use it only to choose which
dimensions to probe harder, never to decide anything, and never mention it.`;

// ---- Per-stage effort --------------------------------------------------------
// Claude Opus 5.5 / Sonnet 5 always think (adaptive thinking); `effort` is the
// control for how much, and so for latency and cost. Override per stage with the
// env var named at the call site; anything unrecognised falls back to the default.
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];
function effortFrom(value: string | undefined, fallback: Effort): Effort {
  return value && EFFORTS.includes(value) ? (value as Effort) : fallback;
}

// Written into the text stream when a refusal fallback restarts the reply on
// another model: the client drops everything before it (src/deepdive/pipeline.ts
// STREAM_RESET — keep the two in sync).
const STREAM_RESET = "\u001e";

interface ReqLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
  write: (chunk: string) => void;
  end: (chunk?: string) => void;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!passcodeGate(req, res)) return;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(501).json({ error: "Deep Dive not configured (ANTHROPIC_API_KEY missing)" });
    return;
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }
  const b = body as { messages?: Turn[] } | undefined;

  // Sanitise the conversation so far. The client sends the full turn history each
  // call. Anthropic requires the first message to be a user turn, so when the
  // history is empty we seed a neutral starter that kicks off the welcome + Q1.
  const history: Turn[] = Array.isArray(b?.messages)
    ? b!.messages
        .filter(
          (m): m is Turn =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim() !== "",
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const messages: Turn[] =
    history.length === 0 || history[0].role !== "user"
      ? [{ role: "user", content: "I'm ready to begin." }, ...history]
      : history;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering for streaming

  const client = new Anthropic({ apiKey });
  try {
    // Prompt caching (driver only). The system prompt is resent verbatim every
    // turn and the interview history grows monotonically — both are ideal cache
    // prefixes, so a breakpoint on the system block AND on the last message block
    // lets each turn re-read the prior prefix at a fraction of the input cost.
    // Opus 5.5 caches prefixes from 512 tokens, so the ~3.1k-token system prompt
    // caches on its own from the first turn. History is plain text only (no
    // thinking blocks are replayed), so edits to it cannot invalidate reasoning.
    // Other stages stay uncached per the ship-prep brief.
    const system = [
      {
        type: "text" as const,
        text: DRIVER_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ];
    const cachedMessages = messages.map((m, i) =>
      i === messages.length - 1
        ? {
            role: m.role,
            content: [
              {
                type: "text" as const,
                text: m.content,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          }
        : m,
    );
    // Server-side refusal fallback: if a safety classifier declines the request,
    // the API re-runs it on Anthropic's recommended model for that category inside
    // the same call, instead of returning the refusal.
    const stream = client.beta.messages.stream({
      model: process.env.ANTHROPIC_DRIVER_MODEL || DEFAULT_MODEL,
      // Thinking counts toward max_tokens (its text is not returned), so leave room
      // for it as well as the reply.
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: effortFrom(process.env.ANTHROPIC_DRIVER_EFFORT, DEFAULT_EFFORT) },
      system,
      messages: cachedMessages,
    });
    let wrote = false;
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "fallback") {
        // Declined mid-stream: the fallback model starts the reply over.
        if (wrote) res.write(STREAM_RESET);
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(event.delta.text);
        wrote = true;
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      // The whole fallback chain declined.
      if (!wrote) {
        res.status(502).json({ error: "The interview was declined by the model" });
        return;
      }
      res.write("\n\n[error] The interview was declined by the model");
    }
    res.end();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    // If nothing was streamed yet we can still send a JSON error; otherwise close.
    if (!(res as unknown as { headersSent?: boolean }).headersSent) {
      res.status(502).json({ error: "Interview failed", detail });
    } else {
      res.write(`\n\n[error] ${detail}`);
      res.end();
    }
  }
}

// ---- Closed-beta passcode gate --------------------------------------------------
// INLINED in every api/deepdive-*.ts on purpose (self-contained rule, HANDOVER §4) —
// keep the copies identical. Every call must carry the shared beta passcode from
// the DEEPDIVE_PASSCODE env var in the `x-anyma-passcode` header (URI-encoded by
// the client, see src/deepdive/access.ts). Fails CLOSED: with the env var unset
// nothing gets through, so a deploy can never expose the paid pipeline by omission.
// Returns true when the request may proceed; otherwise the response is already sent.
function passcodeGate(req: ReqLike, res: ResLike): boolean {
  const expected = process.env.DEEPDIVE_PASSCODE?.trim();
  if (!expected) {
    res.status(503).json({ error: "The Deep Dive is not open yet" });
    return false;
  }
  const raw = req.headers?.["x-anyma-passcode"];
  let given = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  try {
    given = decodeURIComponent(given);
  } catch {
    // Malformed encoding — compare as-is (it will not match).
  }
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const digest = (s: string) => createHash("sha256").update(s.trim()).digest();
  if (!timingSafeEqual(digest(given), digest(expected))) {
    res.status(401).json({ error: "Access code required" });
    return false;
  }
  return true;
}
