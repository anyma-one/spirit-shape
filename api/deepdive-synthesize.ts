import Anthropic from "@anthropic-ai/sdk";
import { createHash, timingSafeEqual } from "node:crypto";

// Deep Dive (Tier 3) — synthesis: commit to ONE animal from the candidates.
//
// SELF-CONTAINED (README §4 / HANDOVER §4). Structured output via JSON outputs
// (`output_config.format`) — not forced tool use, which Claude Opus 5.5 rejects.
//
// ANTI-ANCHORING: no prior-tier result reaches this endpoint. Synthesis is free
// to overturn the prior result because it never sees it. It also does not see the
// raw interview answers or the aspiration — only axes (score/evidence/confidence)
// and gaps, plus the rank-only candidates block.
//
// Model: strong tier (synthesis + report). Override with ANTHROPIC_SYNTH_MODEL.
// Effort high: one short, consequential judgement — the thinking is the point.
const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_EFFORT = "high";

// Verbatim from anyma-tier3-extraction-v3.md MESSAGE 4 (synthesis), with ONE
// added sentence per anyma-tier3-shipprep-claude-code-brief.md Task 2 (marked).
const SYNTHESIS_RULES = `You make the final call on this person's animal shape.

IMPORTANT: use ONLY the profile below - the scores, the evidence strings, the confidences,
the gaps. Do not ask for or reason about the raw interview answers; you do not have them, and
you should not want them.

A deterministic matcher has measured the distance between this profile and every animal in
the library, and handed you the closest few. Your job is not to re-run that maths. It is to
do what the maths cannot: read the evidence behind the numbers and decide which animal is
actually true of this person.

WHAT YOU DO
1. Take the top two or three candidates seriously. For each, say honestly what it captures
   about this person and what it misses. A candidate that fits the numbers but contradicts
   the evidence is a bad candidate, and you should say so.
2. Commit to ONE. No hedging, no "a blend of", no "depending on the day". The person came
   here for an answer.
3. Name the closest runner-up and the EXACT distinction that decided it. Not a vibe - the
   specific thing, grounded in what this person wrote, that makes one true and the other
   nearly true. "Both are solitary, but X withdraws to recover and Y withdraws to work" is
   a distinction. "X is more independent" is not.

HOW YOU WEIGH EVIDENCE
- Never rest a decision on a low-confidence axis. If the deciding difference between two
  candidates lives on an axis marked low, you have not decided it. Find the difference
  elsewhere, or pick the candidate the high-confidence axes support and say the distinction
  is finer than usual.
- Distance is a nomination, not a verdict. The matcher cannot tell a stated value from a
  described action. You can, because you have the evidence strings. Where they disagree, the
  evidence wins.
- Apply the same standard to rank 1 as to every other candidate — a contradiction of a
  high-confidence axis counts equally wherever the candidate sits in the ranking.
- The licence to depart from the ranking is narrow. It exists for two close candidates that
  the evidence separates. Reaching further down the list means claiming the matcher is wrong
  about several axes at once, which is rarely true. If you cannot pick a candidate without
  conceding that it badly misses an axis you marked high-confidence, it is not the answer.
- Do not let a vivid single anecdote outweigh a consistent pattern.

Return your verdict as JSON in the required format. Never use the phrase "spirit animal".`;

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
interface Candidate {
  id: string;
  name: string;
  vector: Record<string, number>;
  character: string;
  distance_rank: number;
}

const AXIS_ORDER = ["SOC", "TMP", "COG", "BND", "AUT", "REC", "NOV", "EXP"];

// JSON-outputs schema: the committed animal, the runner-up, and the deciding
// distinction.
const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    winner_id: { type: "string", description: "id of the committed animal" },
    runnerup_id: { type: "string", description: "id of the closest runner-up" },
    distinction: {
      type: "string",
      description: "The exact, evidence-grounded distinction that decided winner over runner-up.",
    },
    comparison_notes: {
      type: "string",
      description: "What each top candidate captures and misses.",
    },
    decided_on_low_confidence: { type: "boolean" },
  },
  required: [
    "winner_id",
    "runnerup_id",
    "distinction",
    "comparison_notes",
    "decided_on_low_confidence",
  ],
};

function formatProfile(axes: AxisEntry[], gaps: GapEntry[]): string {
  const axisLines = AXIS_ORDER.map((code) => {
    const a = axes.find((x) => x.code === code);
    if (!a) return `${code}: (missing)`;
    return `${code} ${a.score >= 0 ? "+" : ""}${a.score} [${a.confidence}] — ${a.evidence}`;
  }).join("\n");
  const gapLines = gaps.length
    ? gaps
        .map((g) => `- ${g.axis} (${g.reading}): aim "${g.aim}" vs behaviour "${g.behaviour}"`)
        .join("\n")
    : "(none)";
  return `THE PROFILE\n\nAxes (score [confidence] — evidence):\n${axisLines}\n\nGaps:\n${gapLines}`;
}

function formatCandidates(candidates: Candidate[]): string {
  return candidates
    .map((c) => {
      const vec = AXIS_ORDER.map(
        (code) => `${code} ${c.vector[code] >= 0 ? "+" : ""}${c.vector[code]}`,
      ).join(", ");
      return `id: ${c.id}\nname: ${c.name}\nvector: ${vec}\ncharacter: ${c.character}\ndistance_rank: ${c.distance_rank}`;
    })
    .join("\n\n");
}

// ---- Per-stage effort --------------------------------------------------------
// Claude Opus 5.5 / Sonnet 5 always think (adaptive thinking); `effort` is the
// control for how much, and so for latency and cost. Override per stage with the
// env var named at the call site; anything unrecognised falls back to the default.
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];
function effortFrom(value: string | undefined, fallback: Effort): Effort {
  return value && EFFORTS.includes(value) ? (value as Effort) : fallback;
}

interface ReqLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
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
  const b = body as { axes?: AxisEntry[]; gaps?: GapEntry[]; candidates?: Candidate[] } | undefined;
  const axes = Array.isArray(b?.axes) ? b!.axes : [];
  const gaps = Array.isArray(b?.gaps) ? b!.gaps : [];
  const candidates = Array.isArray(b?.candidates) ? b!.candidates : [];
  if (axes.length === 0 || candidates.length === 0) {
    res.status(400).json({ error: "Missing axes or candidates" });
    return;
  }

  const userContent = `${formatProfile(axes, gaps)}\n\nCANDIDATES, NEAREST FIRST\n\n${formatCandidates(
    candidates,
  )}`;

  const client = new Anthropic({ apiKey });
  try {
    // Server-side refusal fallback: if a safety classifier declines the request,
    // the API re-runs it on Anthropic's recommended model for that category inside
    // the same call, instead of returning the refusal.
    const response = await client.beta.messages.create({
      model: process.env.ANTHROPIC_SYNTH_MODEL || DEFAULT_MODEL,
      // Thinking counts toward max_tokens, so leave room for it plus the JSON.
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: effortFrom(process.env.ANTHROPIC_SYNTH_EFFORT, DEFAULT_EFFORT),
        format: { type: "json_schema", schema: DECISION_SCHEMA },
      },
      system: SYNTHESIS_RULES,
      messages: [{ role: "user", content: userContent }],
    });
    if (response.stop_reason === "refusal") {
      res.status(502).json({ error: "Synthesis was declined by the model" });
      return;
    }
    if (response.stop_reason === "max_tokens") {
      res.status(502).json({ error: "Synthesis ran out of room before finishing" });
      return;
    }
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    let decision: unknown;
    try {
      decision = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "Synthesis produced no structured output" });
      return;
    }
    res.status(200).json({ decision });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Synthesis failed", detail });
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
