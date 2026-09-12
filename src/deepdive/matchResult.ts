// Deep Dive (Tier 3) → MatchResult adapter.
//
// Tiers 1-2 produce a `MatchResult` from the scoring engine (Euclidean distance +
// softmax over the pool). Tier 3 produces something different in kind: an
// LLM-extracted trait vector, a confidence-weighted COSINE ranking, and a
// synthesised winner that is allowed to override rank 1. This adapter presents
// that output in the `MatchResult` shape so the Tier-3 result can be rendered
// through exactly the same furniture as the other tiers (RevealCarousel,
// Mythology, SymbolicProfile) without a second set of components.
//
// Deliberately NOT done here: adding a "deep-dive" TierId. Tier 3 is not a quiz
// tier — it has no questions and no TierDef — so a new TierId member would force
// fake entries into TIERS, TIER_COPY and TIER_ORDER. reveal.ts takes a rank
// instead (see buildDeepReveal).

import { standoutAxes } from "../engine/matcher";
import type { Match, MatchResult, Vector } from "../engine/types";
import { ANIMAL_BY_ID } from "../data/archetypes";
import { toPersonProfile, type AxisEntry, type Decision } from "./pipeline";
import { isWeakFit, type RankedAnimal } from "./ranker";

/**
 * Cosine alignment (-1..+1) expressed as the engine's "distance" (lower = closer),
 * so the field keeps its meaning for anything that reads it. Perfect alignment
 * (+1) → 0; perfect opposition (-1) → 2.
 */
const toDistance = (alignment: number): number => 1 - alignment;

/** Alignment as a non-negative weight, for share/probability arithmetic. */
const weight = (alignment: number): number => Math.max(0, alignment);

/**
 * Build a MatchResult from the Deep Dive pipeline output.
 *
 * The archetypes come from the SHARED library (`ANIMAL_BY_ID`), not the Tier-3
 * ranking library: the two deliberately differ (Tier-3 Dolphin carries NOV +1),
 * and every downstream consumer here — the element pin, profiles, mythology,
 * artwork — is keyed to the canonical animal. The Tier-3 vectors have already
 * done their job by the time ranking is finished.
 *
 * Returns null when the winner or runner-up can't be resolved to a shared
 * archetype; the caller falls back to the report-only view rather than rendering
 * furniture around a missing animal.
 */
export function toMatchResult(
  axes: AxisEntry[],
  ranked: RankedAnimal[],
  decision: Decision,
): MatchResult | null {
  const vector: Vector = toPersonProfile(axes).vector;

  const alignmentById = new Map(ranked.map((r) => [r.id, r.alignment]));
  const total = ranked.reduce((sum, r) => sum + weight(r.alignment), 0);

  const matchFor = (id: string): Match | null => {
    const archetype = ANIMAL_BY_ID[id];
    if (!archetype) return null;
    const alignment = alignmentById.get(id) ?? 0;
    return {
      archetype,
      distance: toDistance(alignment),
      probability: total > 0 ? weight(alignment) / total : 0,
    };
  };

  const primary = matchFor(decision.winner_id);
  const secondary = matchFor(decision.runnerup_id);
  if (!primary || !secondary) return null;

  // Headline split between the two named animals. Derived from cosine alignment,
  // NOT from the engine's softmax — a different metric, so it is not comparable
  // to a Tier 1-2 percentage. The Tier-3 UI deliberately does not surface it:
  // synthesis may pick a winner that ranked second, and a split that contradicted
  // the chosen winner would read as a bug. Kept because MatchResult requires it.
  const pw = weight(primary.probability);
  const sw = weight(secondary.probability);
  const primaryPct = pw + sw > 0 ? Math.round((pw / (pw + sw)) * 100) : 50;
  const split = { primary: primaryPct, secondary: 100 - primaryPct };

  return {
    vector,
    ranked: ranked
      .map((r) => matchFor(r.id))
      .filter((m): m is Match => m !== null),
    primary,
    secondary,
    split,
    // Tier 3 names exactly two animals — the synthesised winner and its runner-up.
    // A third "also close" would undercut a decision that was reasoned, not scored.
    alsoClose: null,
    muddy: isWeakFit(ranked),
    standoutAxes: standoutAxes(vector),
  };
}
