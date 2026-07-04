import type { EngineConfig } from "../engine/types";

// All tuning lives here, never in engine logic. These are first-draft values,
// to be tuned against real answer distributions once Phase 1 has users (spec §13).
//
// Quick reference for what each knob does to results:
//   scaleDivisor      ↑  -> harder to reach a pole, flatter user vectors, more muddy results
//   temperature       ↓  -> more decisive percentage splits (a near-tie still reads ~52/48)
//   alsoCloseMargin   ↑  -> the third "also close" animal shows more often
//   muddyNormThreshold↑  -> more profiles flagged as "balanced, go deeper"
export const SPEED_RUN_CONFIG: EngineConfig = {
  scaleDivisor: 4,
  clampMin: -2,
  clampMax: 2,
  temperature: 1.2,
  alsoCloseMargin: 0.6,
  muddyNormThreshold: 1.5,
  depthItemMultiplier: 0.5, // unused in Phase 1 (no depth items); set for Phase 2.
};

// Soul Search (Phase 2). 35 questions (v0.3), sign-balanced weights, depth items
// at half weight. Lower temperature than Speed Run (0.9 vs 1.2) for a sharper split.
//
// Divisor 5 and muddyNormThreshold 1.25 are set from the v0.3 balance audit
// (~/.local/sa_balance.py), not eyeballed:
//   - divisor 5: <=2% of random users pin any axis at the ±2 clamp (so axes keep
//     discriminating), while strong leaners can still reach the poles to match the
//     extreme animals. Divisor 4 over-saturates (SOC 7%, AUT 5%); divisor 6 weakens
//     the lighter axes (EXP) too far.
//   - muddyNormThreshold 1.25: v0.3's balanced (drift-free) weights centre random
//     users nearer the origin (norm median ~1.8), so this flags the genuinely flat
//     ~8–10% as a "balanced profile" rather than forcing a weak match.
// All values are first-draft, tunable against real data (spec §13).
export const SOUL_SEARCH_CONFIG: EngineConfig = {
  scaleDivisor: 5,
  clampMin: -2,
  clampMax: 2,
  temperature: 0.9,
  alsoCloseMargin: 0.5,
  muddyNormThreshold: 1.25,
  depthItemMultiplier: 0.5,
};
