import { AXES } from "../engine/types";
import type { Archetype, Axis, Vector } from "../engine/types";

/**
 * Tier 3 (Deep Dive) nomination — confidence-weighted cosine.
 *
 * Ported from the reference tool `anyma-ranker-t3.html` (functions `axisWeights`
 * + `cosine`), salience weighting ON (the production setting, not a toggle).
 *
 * Unlike the shared Euclidean matcher, this matches on the person's *direction*,
 * not their distance from the centre — so the central animals (Fox) no longer
 * win by default. This is a Tier-3 fork; the Euclidean engine is untouched.
 */

export type Confidence = "high" | "medium" | "low";

/** Weight each axis carries by extraction confidence. */
export const CONF_W: Record<Confidence, number> = { high: 1.0, medium: 0.6, low: 0.2 };

export type ConfidenceMap = Record<Axis, Confidence>;

/** A person's extracted profile: an 8-axis vector plus per-axis confidence. */
export interface PersonProfile {
  vector: Vector;
  confidence: ConfidenceMap;
}

export interface RankedAnimal {
  id: string;
  name: string;
  vector: Vector;
  note: string;
  /** Cosine alignment with the person, -1..+1. */
  alignment: number;
  /** 1-based rank, best-first. */
  rank: number;
}

/**
 * A candidate handed to the synthesis step. Carries **rank only** — never the
 * alignment value or share (raw numbers make synthesis rubber-stamp rank 1).
 * The field name `distance_rank` is kept because the synthesis prompt expects it.
 */
export interface Candidate {
  id: string;
  name: string;
  vector: Vector;
  character: string;
  distance_rank: number;
}

export type RankOutcome =
  | { ok: true; ranked: RankedAnimal[] }
  | { ok: false; reason: "no-direction" };

/**
 * weight[axis] = conf_w[confidence[axis]] * |person[axis]|  (salience weighting ON).
 * A low-confidence or zero axis nearly drops out — it no longer votes for the
 * central animals.
 */
export function axisWeights(profile: PersonProfile): Record<Axis, number> {
  const w = {} as Record<Axis, number>;
  for (const k of AXES) {
    w[k] = CONF_W[profile.confidence[k]] * Math.abs(profile.vector[k]);
  }
  return w;
}

/**
 * cosine( person .* sqrt(w), animal .* sqrt(w) ). Returns null when either
 * weighted vector is ~0 (no usable signal on that side).
 */
export function cosine(p: Vector, a: Vector, w: Record<Axis, number>): number | null {
  let dot = 0;
  let pn = 0;
  let an = 0;
  for (const k of AXES) {
    const sw = Math.sqrt(w[k]);
    const pw = p[k] * sw;
    const aw = a[k] * sw;
    dot += pw * aw;
    pn += pw * pw;
    an += aw * aw;
  }
  if (pn < 1e-9 || an < 1e-9) return null;
  return dot / Math.sqrt(pn * an);
}

/**
 * Rank a library by alignment, best-first.
 *
 * - Refuses (ok:false) when the weighted person vector carries no direction —
 *   every axis is 0 or zero-weight. We do NOT fall back to Euclidean and do NOT
 *   return an arbitrary winner; the interview produced no direction, re-run it.
 * - Excludes any animal whose weighted vector is all-zero for this person
 *   (cosine === null) rather than scoring it 0.
 * - Ties in alignment break by canonical library order (deterministic output).
 */
export function rankAnimals(profile: PersonProfile, library: Archetype[]): RankOutcome {
  const w = axisWeights(profile);
  const anySignal = AXES.some((k) => profile.vector[k] !== 0 && w[k] > 1e-9);
  if (!anySignal) return { ok: false, reason: "no-direction" };

  const scored = library
    .map((animal, index) => ({ animal, index, sim: cosine(profile.vector, animal.vector, w) }))
    .filter((s): s is { animal: Archetype; index: number; sim: number } => s.sim !== null)
    .sort((x, y) => (y.sim !== x.sim ? y.sim - x.sim : x.index - y.index));

  const ranked: RankedAnimal[] = scored.map((s, i) => ({
    id: s.animal.id,
    name: s.animal.name,
    vector: s.animal.vector,
    note: s.animal.note,
    alignment: s.sim,
    rank: i + 1,
  }));
  return { ok: true, ranked };
}

/** Top-N candidates for synthesis, rank only (no alignment values exposed). */
export function candidatesBlock(ranked: RankedAnimal[], topN = 5): Candidate[] {
  return ranked.slice(0, topN).map((r) => ({
    id: r.id,
    name: r.name,
    vector: r.vector,
    character: r.note,
    distance_rank: r.rank,
  }));
}

/** weak_fit === top alignment < 0.45 (the coverage-hole signal for beta logging). */
export const WEAK_FIT_THRESHOLD = 0.45;

export function isWeakFit(ranked: RankedAnimal[]): boolean {
  return ranked.length === 0 || ranked[0].alignment < WEAK_FIT_THRESHOLD;
}
