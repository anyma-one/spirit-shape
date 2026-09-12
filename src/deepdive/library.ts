import { COMMON_ANIMALS } from "../data/archetypes";
import type { Archetype } from "../engine/types";

/**
 * Tier 3 (Deep Dive) archetype library.
 *
 * Forked from the shared `COMMON_ANIMALS` with exactly ONE deliberate edit:
 * Dolphin's NOV score is corrected 0 -> +1. This is a Tier-3-only archetype
 * correction. The shared library (Tiers 1-2) is intentionally left untouched —
 * changing the shared vector would rescore Speed Run / Soul Search, a decision
 * that is explicitly deferred (see anyma-tier3-shipprep-claude-code-brief.md).
 *
 * Nomination for the Deep Dive runs over the 16 common animals only; rare
 * animals are not eligible to win at launch (they remain on the waitlist track).
 */
export const TIER3_DOLPHIN_NOV = 1;

export const TIER3_ANIMALS: Archetype[] = COMMON_ANIMALS.map((a) =>
  a.id === "dolphin"
    ? { ...a, vector: { ...a.vector, NOV: TIER3_DOLPHIN_NOV } }
    : a,
);
