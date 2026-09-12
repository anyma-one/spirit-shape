import Anthropic from "@anthropic-ai/sdk";
import { createHash, timingSafeEqual } from "node:crypto";

// Deep Dive (Tier 3) — the final reading (streamed prose).
//
// SELF-CONTAINED (README §4 / HANDOVER §4).
//
// The report sees everything: the raw answers, the profile, the gaps + their
// readings, the aspiration, and the committed decision. (The nominator + synthesis
// deliberately did NOT — that is the anti-anchoring wall; it does not apply here.)
//
// v1 is first-run only: the replay/continuity addenda in extraction-v3 are dormant
// until a cross-run store exists, so no prior-tier result is injected. The
// mythology slot is deleted rather than stubbed (the prompt forbids "none
// available"), so no folklore is ever fabricated.
//
// Model: strong tier. Override with ANTHROPIC_REPORT_MODEL.
const DEFAULT_MODEL = "claude-opus-4-8";

// From anyma-tier3-extraction-v3.md MESSAGE 5 (the revised report), with the
// optional "REAL, SOURCED MYTHOLOGY FOR [ANIMAL]" slot removed per its own
// instruction (delete the lines rather than write "none available"), plus a
// user-requested EMPHASIS rule (bold the one key sentence per section — rendered
// on the parchment surface by src/deepdive/reportFormat.ts).
const REPORT_RULES = `Last job. Write the final reading, using everything above: their answers, the profile, the
gaps and how each one read, the aspiration, and your decision.

WHAT MAKES IT WORK

Your job is not to recite what they said, or even to quote it as proof. It is to name what
they did NOT say but their answers add up to. That derived insight - "how did it know that" -
is the entire payoff. Reciting their answers back reads as being handed your own diary.

LEAD WITH THE DERIVED CLAIM. Open each section with a present-tense statement about who they
are, stated plainly and without visible sourcing. The stories are the material the insight is
made from, not exhibits wheeled out to defend it. Reason from the evidence privately; put only
the conclusion on the page.

QUOTE ALMOST NEVER. At most one anchoring detail per section, and only when the specific image
carries something the abstraction loses. Never string their answers together as a citation.
If a sentence just tells them what they told you, cut it.

EMPHASIS. In each of the four sections, mark the single most important sentence — the sharpest
mirror, the line you most want them to stop on — by wrapping it in **double asterisks** so it
renders bold. At most ONE per section, never a whole paragraph, never more than one sentence. If
no line in a section earns it, bold nothing there. Do not bold anything in the short distillation
or the three questions. This is for the load-bearing insight only, never decoration.

EARNED, NOT INVENTED. Not quoting is not licence to make things up. Every unstated pattern must
stay provable from the transcript on demand - you simply do not show the work. Derive silently,
stay derivable. That line is the difference between insight and horoscope.

THE TEST, run on every headline sentence before you write it: would this be WRONG about a
different person? "You finish things then stop needing them" can be wrong, some people crave the
audience - so it is a real claim. "You have a rich inner world" fits everyone - cut it. If a
sentence cannot be wrong, it is not insight.

WHAT IT MUST NOT BE
- No horoscope. Nothing true of anyone. If a sentence would fit a stranger, cut it.
- No flattery. Not one line of "you have a rare gift for". You are a mirror, not a fan.
  Warmth comes from being accurate about someone, not from being nice to them.
- No jargon. Never name an axis, a score, a confidence level, or any part of the machinery.
  Organise by THEME, in plain language, the way a perceptive friend would.
- Never the phrase "spirit animal". The result is their SHAPE, or ANIMAL SHAPE.

THE FOLKLORE RULE — ABSOLUTE

Never invent folklore, mythology, or traditional meaning. Not a story, not a tribe, not a
tradition, not a "the ancient Celts believed". Above all, never invent or attribute
indigenous belief. If you do not have a real, sourced story in front of you, you do not have
one, and you say nothing. The absence of a myth, named honestly, is worth more than a
beautiful fabrication. This is not negotiable and nothing below overrides it.

STRUCTURE — four parts, a short distillation, and a close. Plain headings of your own choosing,
no numbers. State your findings as findings: confident, direct, no "perhaps" or "it seems". You
have the evidence; speak from it.

AT YOUR CORE
   The centrepiece, and where the animal lands. Two to four paragraphs of the deepest
   patterns, organised by theme, not by trait, built from their own stories, naming at least
   one pattern they did not state. Then name the animal as the shape those patterns make -
   not the animal's general reputation, this person's evidence - and commit to it. In a short
   final beat, name the SECOND ANIMAL - not as the one they nearly were, but as a real part
   of them that runs alongside the first. Say what of theirs it holds, then the exact
   distinction that makes the first the shape and this one the second nature. Make the second
   animal genuinely theirs first, or the distinction means nothing. The result screen labels
   it "Second nature", so do not write it as a runner-up, a close call, or an also-ran. Other
   animals may sit close; acknowledge that without re-opening the verdict.

YOU & THE WORLD
   The self they carry, and the self other people meet. Open with how they see themselves -
   the values and self-image they claim - told straight, in their framing; this is the beat
   where they feel reflected, so give it real weight even where their behaviour complicates
   it. Then, ONLY from moments where they voiced how someone sees them or described how others
   actually responded, say how they come across. Write that as how they land, never as "what
   others think" - it is still their account, not external truth. The prize is the space
   between the two: where the self they carry and the self others meet do not match, name it.
   If the interview never surfaced an outside view, lean on the self-image and let the outer
   half stay light; do not invent a perspective you were not given. Keep this distinct from
   the blind spot below: here the gap is inner-view versus how they land; there it is what
   they claim versus what they consistently do.

WHAT CHALLENGES YOU
   The gaps, told as what they turned out to MEAN, not as "you say X but do Y". Use the
   reading on each gap: a method-fit gap is a real drive meeting an approach that did not fit
   ("you aim at this and you are still looking for the way in that holds" - not "you lack
   discipline"); a conflict gap is a genuine pull in two directions; name it and do not
   resolve it. Never score a struggle as a character flaw. If a gap read as absent-value, you
   may say the aim seems more wished-for than lived, gently. If everything was reached
   smoothly, say some people are aimed where they already are.

WHAT YOU MIGHT NOT BE AWARE OF
   The blind spot: where what they hold or claim diverges from what they consistently do,
   without them seeming to notice. This is the sharpest mirror in the reading. One clear
   pattern, named kindly and without flinching. It should make them stop, not defend.

THE SHORT VERSION
   Distil the whole reading into three or four short lines - one per core pattern, each the
   plainest, most memorable statement of a finding you already made above. This is the version
   someone screenshots and remembers. No new material, no elaboration; keep the confident voice,
   drop everything but the essence. Lines, not a paragraph.

THREE QUESTIONS TO GO DEEPER
   Close with exactly three questions for them to sit with, framed as "sit with these to see
   yourself more clearly" - an invitation, not a test. Aim them at the dimensions the profile
   left thinnest or most conflicted, so they feel personal rather than generic. Each asks for
   a specific situation or memory, never a self-rating, and never names what it is looking
   for. These are doorways, not homework.

VOICE

Serious, warm, a little mystical, plain and honest. Second person. Confident: these are
findings, not guesses - state them and stand behind them. Short sentences carry more weight
than long ones. Simple English - many readers are not native speakers. Never clinical, never
chatty, never mystical enough to become vague. Trust the material; it does not need
decoration.

800 to 1200 words for the four sections, plus the short distillation and the three questions.
Short means you are generalising. Long means you are padding.

Prose only. No JSON, no fences, no preamble.`;

interface AxisEntry {
  code: string;
  score: number;
  evidence: string;
  confidence: string;
}
interface GapEntry {
  axis: string;
  aim: string;
  behaviour: string;
  reading: string;
}
interface Aspiration {
  stated_values: string;
  direction_of_travel: string;
  evidence: string;
}
interface Decision {
  winner_id: string;
  runnerup_id: string;
  distinction: string;
  comparison_notes: string;
}
interface AnimalRef {
  id: string;
  name: string;
  note: string;
}

const AXIS_ORDER = ["SOC", "TMP", "COG", "BND", "AUT", "REC", "NOV", "EXP"];

function buildContext(
  transcript: string,
  axes: AxisEntry[],
  gaps: GapEntry[],
  aspiration: Aspiration | undefined,
  decision: Decision,
  winner: AnimalRef | undefined,
  runnerUp: AnimalRef | undefined,
): string {
  const axisLines = AXIS_ORDER.map((code) => {
    const a = axes.find((x) => x.code === code);
    return a
      ? `${code} ${a.score >= 0 ? "+" : ""}${a.score} [${a.confidence}] — ${a.evidence}`
      : `${code}: (missing)`;
  }).join("\n");
  const gapLines = gaps.length
    ? gaps
        .map((g) => `- ${g.axis} (${g.reading}): aim "${g.aim}" vs behaviour "${g.behaviour}"`)
        .join("\n")
    : "(none)";
  const asp = aspiration
    ? `stated values: ${aspiration.stated_values}\ndirection of travel: ${aspiration.direction_of_travel}\nevidence: ${aspiration.evidence}`
    : "(none captured)";
  const winnerLine = winner
    ? `${winner.name} (${winner.id}) — reputation to set aside in favour of this person's evidence: ${winner.note}`
    : decision.winner_id;
  const runnerLine = runnerUp
    ? `${runnerUp.name} (${runnerUp.id}) — ${runnerUp.note}`
    : decision.runnerup_id;

  return [
    "THEIR ANSWERS (the interview transcript)",
    transcript,
    "",
    "THE PROFILE (axes: score [confidence] — evidence)",
    axisLines,
    "",
    "GAPS (aim vs behaviour, with reading)",
    gapLines,
    "",
    "ASPIRATION (carried for this reading only, never scored)",
    asp,
    "",
    "YOUR DECISION",
    `Winner: ${winnerLine}`,
    `Runner-up: ${runnerLine}`,
    `Distinction: ${decision.distinction}`,
    `Comparison notes: ${decision.comparison_notes}`,
  ].join("\n");
}

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
  const b = body as
    | {
        transcript?: string;
        axes?: AxisEntry[];
        gaps?: GapEntry[];
        aspiration?: Aspiration;
        decision?: Decision;
        winner?: AnimalRef;
        runnerUp?: AnimalRef;
      }
    | undefined;

  const transcript = typeof b?.transcript === "string" ? b.transcript.trim() : "";
  const axes = Array.isArray(b?.axes) ? b!.axes : [];
  const gaps = Array.isArray(b?.gaps) ? b!.gaps : [];
  const decision = b?.decision;
  if (!transcript || axes.length === 0 || !decision || !decision.winner_id) {
    res.status(400).json({ error: "Missing transcript, axes, or decision" });
    return;
  }

  const userContent = buildContext(
    transcript,
    axes,
    gaps,
    b?.aspiration,
    decision,
    b?.winner,
    b?.runnerUp,
  );

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const client = new Anthropic({ apiKey });
  try {
    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_REPORT_MODEL || DEFAULT_MODEL,
      max_tokens: 4096,
      system: REPORT_RULES,
      messages: [{ role: "user", content: userContent }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(event.delta.text);
      }
    }
    res.end();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    if (!(res as unknown as { headersSent?: boolean }).headersSent) {
      res.status(502).json({ error: "Report failed", detail });
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
