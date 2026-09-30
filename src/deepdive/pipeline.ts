// Deep Dive (Tier 3) client pipeline: the glue that drives the four serverless
// steps and runs nomination locally (the pure ranker — the build handover allows
// client-side nomination on the extracted vector only).
//
// ANTI-ANCHORING is enforced here structurally: the extract + synthesize calls are
// never handed the prior-tier result; only the report call is. Nomination runs on
// the extracted vector alone.
//
// Pure helpers (transcript assembly, profile adapter, run-log builder) are unit
// tested; the fetch/stream functions are thin I/O wrappers.

import { AXES } from "../engine/types";
import type { Axis, Vector } from "../engine/types";
import { TIER3_ANIMALS } from "./library";
import {
  candidatesBlock,
  isWeakFit,
  rankAnimals,
  type Candidate,
  type Confidence,
  type ConfidenceMap,
  type PersonProfile,
  type RankedAnimal,
} from "./ranker";
import { AccessDeniedError, passcodeHeaders } from "./access";
import type { ShapeFit } from "./shapeFit";

// ---------------------------------------------------------------------------
// Wire types (mirror the api/deepdive-* payloads)
// ---------------------------------------------------------------------------
export interface AxisEntry {
  code: string;
  score: number;
  evidence: string;
  confidence: Confidence;
}
export interface Aspiration {
  stated_values: string;
  direction_of_travel: string;
  evidence: string;
}
export interface GapEntry {
  axis: string;
  aim: string;
  behaviour: string;
  reading: string;
}
export interface ExtractedProfile {
  axes: AxisEntry[];
  aspiration: Aspiration;
  gaps: GapEntry[];
}
export interface Decision {
  winner_id: string;
  runnerup_id: string;
  distinction: string;
  comparison_notes: string;
  decided_on_low_confidence: boolean;
}
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * The driver's completion marker. It now ends the reply on its own; older runs
 * (and a model that ignores the prompt) may still follow it with a self-reported
 * Q/A block, which stripTranscriptBlock drops.
 */
export const TRANSCRIPT_MARKER = "TRANSCRIPT — pass to extraction";

export function isInterviewComplete(assistantText: string): boolean {
  return assistantText.includes(TRANSCRIPT_MARKER);
}

/** Drop a trailing driver TRANSCRIPT block from an assistant message, if present. */
export function stripTranscriptBlock(text: string): string {
  const i = text.indexOf(TRANSCRIPT_MARKER);
  return i >= 0 ? text.slice(0, i) : text;
}

/**
 * Build the extraction transcript from the REAL turn history rather than trusting
 * the model's self-reported block — each assistant question paired with the user
 * answer that followed it. The final assistant turn (the close + marker) has no
 * following answer and is naturally dropped.
 */
export function buildTranscript(messages: ChatTurn[]): string {
  const lines: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const next = messages[i + 1];
    if (!next || next.role !== "user") continue;
    const q = stripTranscriptBlock(m.content).trim();
    const a = next.content.trim();
    if (q && a) {
      lines.push(`Q: ${q}`);
      lines.push(`A: ${a}`);
    }
  }
  return lines.join("\n\n");
}

const CONFIDENCES: Confidence[] = ["low", "medium", "high"];
function asConfidence(value: unknown): Confidence {
  return typeof value === "string" && (CONFIDENCES as string[]).includes(value)
    ? (value as Confidence)
    : "low";
}
function clampScore(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : 0;
  return Math.max(-2, Math.min(2, v));
}

/**
 * Adapt the extraction axes to the ranker's PersonProfile — scores + confidence
 * only. Aspiration and gaps are deliberately NOT part of nomination.
 */
export function toPersonProfile(axes: AxisEntry[]): PersonProfile {
  const vector = {} as Vector;
  const confidence = {} as ConfidenceMap;
  for (const axis of AXES as readonly Axis[]) {
    const entry = axes.find((a) => a.code === axis);
    vector[axis] = entry ? clampScore(entry.score) : 0;
    confidence[axis] = entry ? asConfidence(entry.confidence) : "low";
  }
  return { vector, confidence };
}

export type NominationResult =
  | { ok: true; ranked: RankedAnimal[]; candidates: Candidate[]; weakFit: boolean }
  | { ok: false; reason: "no-direction" };

/** Run cosine nomination locally over the Tier-3 library (16 common). */
export function nominate(axes: AxisEntry[]): NominationResult {
  const outcome = rankAnimals(toPersonProfile(axes), TIER3_ANIMALS);
  if (!outcome.ok) return { ok: false, reason: "no-direction" };
  return {
    ok: true,
    ranked: outcome.ranked,
    candidates: candidatesBlock(outcome.ranked),
    weakFit: isWeakFit(outcome.ranked),
  };
}

// ---------------------------------------------------------------------------
// Beta run-log (derived vector + ranking only, never the transcript)
// ---------------------------------------------------------------------------
export interface RunLog {
  run_id: string;
  ts: string;
  profile: { axes: Array<{ code: string; score: number; confidence: string }> };
  ranking: Array<{ rank: number; id: string; alignment: number }>;
  weak_fit: boolean;
  winner_id: string;
  runnerup_id: string;
  decided_on_low_confidence: boolean;
  reaction: number | null;
}

export function buildRunLog(
  runId: string,
  ts: string,
  axes: AxisEntry[],
  ranked: RankedAnimal[],
  decision: Decision,
): RunLog {
  return {
    run_id: runId,
    ts,
    profile: {
      axes: axes.map((a) => ({ code: a.code, score: a.score, confidence: a.confidence })),
    },
    ranking: ranked.map((r) => ({
      rank: r.rank,
      id: r.id,
      alignment: Number(r.alignment.toFixed(3)),
    })),
    weak_fit: isWeakFit(ranked),
    winner_id: decision.winner_id,
    runnerup_id: decision.runnerup_id,
    decided_on_low_confidence: decision.decided_on_low_confidence,
    reaction: null,
  };
}

// ---------------------------------------------------------------------------
// I/O wrappers (thin; not unit tested)
// ---------------------------------------------------------------------------

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...passcodeHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AccessDeniedError();
  if (!res.ok) {
    const detail = await safeError(res);
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

async function safeError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string; detail?: string };
    return j.detail ? `${j.error}: ${j.detail}` : j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// Sent by the streaming api/deepdive-* functions when a refusal fallback restarts
// the reply on another model: everything before it is discarded. Keep in sync with
// STREAM_RESET in api/deepdive-interview.ts and api/deepdive-report.ts.
const STREAM_RESET = "\u001e";

/**
 * Stream a text/plain response, calling onText with the full text so far after
 * each chunk (full text rather than deltas, so a STREAM_RESET can replace what was
 * already shown). Resolves with the final text.
 */
async function streamText(
  url: string,
  body: unknown,
  onText: (textSoFar: string) => void,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...passcodeHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AccessDeniedError();
  if (!res.ok || !res.body) throw new Error(await safeError(res));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  const append = (text: string) => {
    full += text;
    const reset = full.lastIndexOf(STREAM_RESET);
    if (reset !== -1) full = full.slice(reset + STREAM_RESET.length);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    append(decoder.decode(value, { stream: true }));
    onText(full);
  }
  append(decoder.decode());
  return full;
}

/** One interview turn: send the history, stream the interviewer's next message. */
export function streamInterviewTurn(
  messages: ChatTurn[],
  onText: (textSoFar: string) => void,
): Promise<string> {
  return streamText("/api/deepdive-interview", { messages }, onText);
}

export async function extract(transcript: string): Promise<ExtractedProfile> {
  const { profile } = await postJson<{ profile: ExtractedProfile }>("/api/deepdive-extract", {
    transcript,
  });
  return profile;
}

export async function synthesize(
  axes: AxisEntry[],
  gaps: GapEntry[],
  candidates: Candidate[],
): Promise<Decision> {
  const { decision } = await postJson<{ decision: Decision }>("/api/deepdive-synthesize", {
    axes,
    gaps,
    candidates,
  });
  return decision;
}

export interface AnimalRef {
  id: string;
  name: string;
  note: string;
}
export interface ReportInput {
  transcript: string;
  axes: AxisEntry[];
  gaps: GapEntry[];
  aspiration: Aspiration;
  decision: Decision;
  winner?: AnimalRef;
  runnerUp?: AnimalRef;
  /** Where the chosen shape holds and where the person departs (shapeFit.ts). */
  fit?: ShapeFit;
}

export function streamReport(
  input: ReportInput,
  onText: (textSoFar: string) => void,
): Promise<string> {
  return streamText("/api/deepdive-report", input, onText);
}

/** Fire-and-forget beta log; swallows errors (best-effort analytics). */
export function logRun(runLog: RunLog): void {
  void fetch("/api/deepdive-log", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...passcodeHeaders() },
    body: JSON.stringify(runLog),
  }).catch(() => {});
}

export function logReaction(runId: string, reaction: number): void {
  void fetch("/api/deepdive-log", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...passcodeHeaders() },
    body: JSON.stringify({ run_id: runId, reaction }),
  }).catch(() => {});
}
