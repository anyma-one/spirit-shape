import Anthropic from "@anthropic-ai/sdk";
import { createHash, timingSafeEqual } from "node:crypto";

// Deep Dive (Tier 3) — extraction: transcript -> 8-axis profile + aspiration + gaps.
//
// SELF-CONTAINED (README §4 / HANDOVER §4): all rules + schema inlined.
//
// ANTI-ANCHORING: this endpoint takes ONLY the interview transcript. It never
// receives the prior-tier result, by design — extraction and nomination must not
// see it (only follow-up framing and the report do). The request body has no
// slot for it, so it cannot leak.
//
// Structured output via forced tool-use: the model must call `record_profile`
// with the schema below, so parsing is reliable (no regex on prose).
//
// Model: extraction is pinned to Sonnet 4.6 per ship-prep. Config lives in env
// (see .env.example — the single source of truth for per-stage models); this
// constant is the fallback if ANTHROPIC_EXTRACT_MODEL is unset.
const DEFAULT_MODEL = "claude-sonnet-4-6";

// Verbatim rules from anyma-tier3-extraction-v3.md (the extraction message),
// through the answer-classification section. The transcript + the JSON tail are
// handled structurally below (user message + tool schema) rather than in prose.
const EXTRACTION_RULES = `You are one stage of a psychological profiling instrument. I will give you the transcript of
a profiling interview: the interviewer's questions and the person's answers. Convert them
into a structured trait profile.

You are a careful reader, not an interpreter. You do not diagnose, flatter, or speculate.
Every score must be traceable to something the person actually said.

THE EIGHT AXES

SOC  Social energy        -2 solitary, restored by being alone      +2 highly social, restored by others
TMP  Action tempo         -2 observes first, deliberate, slow       +2 acts fast, impulsive, decides in motion
COG  Cognitive style      -2 analytical, sequential, breaks down    +2 intuitive, holistic, reads the whole pattern
BND  Boundaries           -2 fluid, open, few fixed lines           +2 rigid, protective, strongly defended
AUT  Conflict & authority -2 avoids, defers, keeps the peace        +2 confronts, questions authority directly
REC  Recognition          -2 private mastery is enough              +2 needs witnesses, wants acknowledgement
NOV  Novelty vs routine   -2 stabiliser, thrives on the known       +2 explorer, driven by novelty
EXP  Expressive drive     -2 utilitarian, low need to create        +2 high need to externalise, create, perform

For each axis give a score from -2 to +2, an evidence string, and a confidence.

EVIDENCE — VERBATIM OR IT DOES NOT COUNT

Every evidence string must contain at least one verbatim quote from the person, in
quotation marks, 25 words or fewer. Add "(para)" context around a quote if you need to,
never instead of one. If you cannot find a single quotable sentence for an axis, that axis
has no evidence - score 0, confidence low, and say so.

THE BEHAVIOUR RULE — THIS IS THE ONE THAT MATTERS

When what a person SAYS they value conflicts with what they DESCRIBE THEMSELVES DOING,
score the behaviour. Do not average the two. Do not split the difference. Do not resolve
the conflict.

The stated value is not an error to be corrected. It is the most interesting material in
the whole profile, and it belongs in the "gaps" field, intact. The gap between what
someone says and what they do is what this instrument exists to find. Averaging destroys
exactly the signal we are paying for.

A person who writes "I hate being the centre of attention" and elsewhere describes
rearranging a party so everyone could see what they built scores POSITIVE on REC, and the
stated denial goes in "gaps".

EVIDENCE IS NOT EQUAL. Rank it:
  1. Something they describe themselves DOING, in a specific remembered instance. Strongest.
  2. Something they report another named person saying about them. Strong - people voice
     criticism through someone else's mouth that they would never state directly. Treat
     these as near-behavioural.
  3. Something they claim about themselves in the abstract. Weakest. Never let a self-claim
     outweigh a described action on the same axis.

THE POLES ARE EARNED — BY DOMINANCE, NOT BY PURITY

-2 and +2 mean one direction DOMINATES this person's described behaviour. They do not mean no
counter-instance exists anywhere. Almost nobody is pure, and an instrument that demands purity
scores everybody as moderate and tells them nothing.

Weigh the evidence, do not just count it. A pattern that is repeated, sustained over time, or
chosen at real cost outweighs a brief or incidental exception. A month of chosen communal
living is not cancelled by an afternoon walk alone. Ask which way this person's life actually
leans, not whether you can find one moment that points the other way.

So:
  ±2  one direction clearly dominates: several described instances, or one sustained/costly
      choice, with at most minor or situational exceptions. Name the exception in the evidence
      and keep the pole.
  ±1  a real lean, but the counter-evidence is substantial too — comparable in weight, not just
      present.
   0  genuinely balanced, or nothing to go on.

A counter-instance only breaks a pole if it is comparable in weight to the pattern it opposes.
A hedge, a qualifier, a single incident against a repeated pattern, or the same behaviour done
less often does not. "I sometimes do X" is not counter-evidence to X.

Be decisive where the evidence is decisive. A profile with no poles at all is usually a profile
that flinched, not a person with no shape. But a pole is a strong claim: it still needs
dominant, described BEHAVIOUR behind it, never a self-report and never a single vivid anecdote.

An answer that names a fault only because a question asked the person to name one is a single
data point, never the sole basis for a pole. Being able to state your hardest trait when
asked is not the same as that trait dominating your behaviour.

CONFIDENCE — BE HONEST, IT IS A DIAGNOSTIC

  high    = two or more independent behavioural instances point the same way
  medium  = one clear behavioural instance, or several consistent self-reports
  low     = self-report only, or nothing relevant, or the evidence genuinely points both ways

Count before you write. "high" requires two or more independent behavioural instances that
you name in the evidence string. If your evidence cites one instance, the ceiling is medium.
If it cites no described behaviour at all, the ceiling is low.

A disposition the person states more than once is one piece of evidence, not two. The same
claim restated in a later answer is a single self-report, not a second instance, and a
self-report can never reach high confidence or a pole. Two instances means two different
described events, not the same claim in two places.

Low confidence is a correct and useful answer. Do NOT inflate confidence to look decisive
and do NOT reach for a score the text does not support. A low-confidence axis tells us a
question was weak, and that is information we want.

ASPIRATION — CAPTURED, NEVER SCORED

Separately, record what the person REACHES FOR: the values they state, what they admire,
what they say is missing, what they want to become or keep failing to start. Aspiration
must NOT move any axis score. Not by a little. If it did, the instrument would drift toward
who people wish they were, which is the failure mode it exists to avoid. It is carried for
the final reading only.

GAPS — A DIVERGENCE IS A QUESTION, NOT A VERDICT

Record each real gap between what the person REACHES FOR and what they DESCRIBE THEMSELVES
DOING. Both sides, in their own words, and which axis it sits on.

A gap needs all three: the same axis, comparable situations, and a real divergence between
what they aimed at and what they did. Two different situations that happen to share a word
are not a gap. If you are reaching, leave it out. If there are none, return an empty array -
a manufactured gap is worse than none.

Do NOT resolve a gap by assuming the behaviour is the real person and the aim is noise. A
persistent aim the behaviour keeps missing is signal, not error. The same observable gap has
several readings, and only the transcript tells you which:
  method-fit    — the aim is real; a specific approach failed. Look for a DIFFERENT instance
                  where they DID sustain something. If one exists, the gap is about method,
                  not character.
  conflict      — they want it and resist it; described evidence of both pulling.
  absent-value  — the aim was stated once and nothing they describe supports it. Only here
                  does the behaviour stand alone.
  unresolved    — the interview did not disambiguate it. Say so; do not guess.

Choose the reading from described behaviour in the transcript, never from the aim itself. If
the interviewer asked a disambiguating follow-up (for example, "a habit that DID stick"), the
answer to it is where the reading lives. When in doubt, mark it unresolved. The behaviour
still sets the axis score - the wall holds - but the gap carries its own reading for the
reading stage.

HOW TO READ EACH ANSWER — CLASSIFY IT YOURSELF

The transcript has no labels on the questions. For each ANSWER, decide what kind of evidence
it actually is, from its own wording, not from what the question was reaching for:

  behavioural   — a specific remembered instance: an event, a day, a named person, an action
                  that happened. Strongest. The DID side.
  outside-view  — the person voicing what someone else would say about them. Near-behavioural.
                  Trust it.
  introspective — a claim or disposition in the abstract ("I like to organise things", "I
                  need acknowledgement"). Weakest. The SAID side.

A question that asked for an event does not make the answer behavioural. If the person
answered a "tell me about the last time" question with a general tendency, it is
introspective, and it is capped at low confidence like any self-report. This single
judgement is what stops a disposition from being scored as a behaviour.

A described instance of the person going toward company is behavioural evidence for high SOC,
not a tension. Score it.

Call the record_profile tool with the structured result. Return all eight axes, exactly once,
in the canonical order SOC, TMP, COG, BND, AUT, REC, NOV, EXP.`;

const AXIS_CODES = ["SOC", "TMP", "COG", "BND", "AUT", "REC", "NOV", "EXP"];

const PROFILE_TOOL = {
  name: "record_profile",
  description: "Record the structured trait profile extracted from the interview transcript.",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      axes: {
        type: "array",
        minItems: 8,
        maxItems: 8,
        description: "All eight axes, exactly once, in canonical order.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            code: { type: "string", enum: AXIS_CODES },
            score: { type: "integer", minimum: -2, maximum: 2 },
            evidence: {
              type: "string",
              description: "Must contain at least one verbatim quote, 25 words or fewer.",
            },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["code", "score", "evidence", "confidence"],
        },
      },
      aspiration: {
        type: "object",
        additionalProperties: false,
        properties: {
          stated_values: { type: "string" },
          direction_of_travel: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["stated_values", "direction_of_travel", "evidence"],
      },
      gaps: {
        type: "array",
        description: "Empty array if there are no real gaps. A manufactured gap is worse than none.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            axis: { type: "string", enum: AXIS_CODES },
            aim: { type: "string" },
            behaviour: { type: "string" },
            reading: {
              type: "string",
              enum: ["method-fit", "conflict", "absent-value", "unresolved"],
            },
          },
          required: ["axis", "aim", "behaviour", "reading"],
        },
      },
    },
    required: ["axes", "aspiration", "gaps"],
  },
};

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
  const b = body as { transcript?: unknown } | undefined;
  const transcript = typeof b?.transcript === "string" ? b.transcript.trim() : "";
  if (!transcript) {
    res.status(400).json({ error: "Missing transcript" });
    return;
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_EXTRACT_MODEL || DEFAULT_MODEL,
      max_tokens: 2048,
      system: EXTRACTION_RULES,
      tools: [PROFILE_TOOL],
      tool_choice: { type: "tool", name: "record_profile" },
      messages: [{ role: "user", content: `THE TRANSCRIPT\n\n${transcript}` }],
    });
    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      res.status(502).json({ error: "Extraction produced no structured output" });
      return;
    }
    res.status(200).json({ profile: toolUse.input });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Extraction failed", detail });
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
