// Typed session/result records on top of the KV store (spec §10 minimum records:
// an in-progress session for resume, and a completed result for continuity).
import type { Answers, MatchResult, Vector } from "../engine";
import type { TierId } from "../data/copy";
import { store as storeRef } from "./store";

// Bump if record shapes change incompatibly. v2: Soul Search v0.6 changed answer
// shapes (slider/pad/rank) + the question set (SB1 added, G20 options changed), so
// old in-progress sessions can't be resumed cleanly.
const SCHEMA = 2;

// ---------- In-progress session (save & resume) ----------

export interface InProgressSession {
  schema: number;
  tier: TierId;
  answers: Answers;
  /** The question index the user was on, for resuming mid-quiz. */
  index: number;
  total: number;
  updatedAt: number;
}

const progressKey = (tier: TierId) => `progress:${tier}`;

export function saveProgress(
  tier: TierId,
  answers: Answers,
  index: number,
  total: number,
): void {
  const session: InProgressSession = {
    schema: SCHEMA,
    tier,
    answers,
    index,
    total,
    updatedAt: Date.now(),
  };
  storeRef.set(progressKey(tier), session);
}

export function loadProgress(tier: TierId): InProgressSession | null {
  const s = storeRef.get<InProgressSession>(progressKey(tier));
  if (!s || s.schema !== SCHEMA) return null;
  // A session with no answers isn't worth resuming.
  return Object.keys(s.answers).length > 0 ? s : null;
}

export function clearProgress(tier: TierId): void {
  storeRef.remove(progressKey(tier));
}

// ---------- Completed result (history + cross-tier continuity) ----------

export interface ResultAnimal {
  id: string;
  name: string;
}

export interface CompletedResult {
  schema: number;
  id: string;
  tier: TierId;
  tierName: string;
  vector: Vector;
  primary: ResultAnimal;
  secondary: ResultAnimal;
  alsoClose: ResultAnimal | null;
  split: { primary: number; secondary: number };
  muddy: boolean;
  prose: string;
  proseSource: "llm" | "template";
  createdAt: number;
}

const resultKey = (id: string) => `result:${id}`;

/** Build a storable record from an engine MatchResult plus its generated prose. */
export function buildCompletedResult(
  tier: TierId,
  tierName: string,
  result: MatchResult,
  prose: string,
  proseSource: "llm" | "template",
): CompletedResult {
  const animal = (m: MatchResult["primary"]): ResultAnimal => ({
    id: m.archetype.id,
    name: m.archetype.name,
  });
  return {
    schema: SCHEMA,
    id: `${tier}-${Date.now()}`,
    tier,
    tierName,
    vector: result.vector,
    primary: animal(result.primary),
    secondary: animal(result.secondary),
    alsoClose: result.alsoClose ? animal(result.alsoClose) : null,
    split: result.split,
    muddy: result.muddy,
    prose,
    proseSource,
    createdAt: Date.now(),
  };
}

export function saveResult(result: CompletedResult): void {
  storeRef.set(resultKey(result.id), result);
}

/** All completed results, newest first. */
export function listResults(): CompletedResult[] {
  return storeRef
    .keys("result:")
    .map((k) => storeRef.get<CompletedResult>(k))
    .filter((r): r is CompletedResult => !!r && r.schema === SCHEMA)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Most recent completed result, optionally restricted to one tier. */
export function latestResult(tier?: TierId): CompletedResult | null {
  const all = listResults();
  const match = tier ? all.find((r) => r.tier === tier) : all[0];
  return match ?? null;
}
