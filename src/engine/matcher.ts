import { AXES } from "./types";
import type { Archetype, Axis, EngineConfig, Match, MatchResult, Vector } from "./types";
import { magnitude } from "./scoring";

/** Euclidean distance between two trait vectors. */
export function euclidean(a: Vector, b: Vector): number {
  let sum = 0;
  for (const axis of AXES) {
    const d = a[axis] - b[axis];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** The axis the user leans on hardest (largest magnitude). Ties break in AXES order. */
export function mostExtremeAxis(vector: Vector): Axis {
  let best: Axis = AXES[0];
  let bestMag = -1;
  for (const axis of AXES) {
    const m = Math.abs(vector[axis]);
    if (m > bestMag) {
      bestMag = m;
      best = axis;
    }
  }
  return best;
}

/** Axes sorted by how hard the user leans, strongest first; near-zero axes dropped. */
export function standoutAxes(vector: Vector, epsilon = 0.2): Array<{ axis: Axis; value: number }> {
  return AXES.map((axis) => ({ axis, value: vector[axis] }))
    .filter((a) => Math.abs(a.value) >= epsilon)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function softmaxNegDistance(distances: number[], temperature: number): number[] {
  // Subtract the min (= largest exp arg) for numerical stability; ratios unchanged.
  const args = distances.map((d) => -d / temperature);
  const max = Math.max(...args);
  const exps = args.map((a) => Math.exp(a - max));
  const total = exps.reduce((s, e) => s + e, 0);
  return exps.map((e) => e / total);
}

/**
 * Match a scored user vector against a pool of archetypes.
 *
 * Euclidean distance -> softmax over negative distance (tunable temperature) ->
 * a two-animal headline split, an optional third "also close" animal, and an
 * honest muddy flag. Ordering ties break deterministically on the user's most
 * extreme axis, then on id, so results are fully reproducible.
 */
export function matchVector(
  vector: Vector,
  pool: Archetype[],
  config: EngineConfig,
): MatchResult {
  if (pool.length < 2) {
    throw new Error("matchVector needs at least two archetypes in the pool.");
  }

  const extreme = mostExtremeAxis(vector);
  const extremeSign = Math.sign(vector[extreme]) || 1;

  const withDistance = pool.map((archetype) => ({
    archetype,
    distance: euclidean(vector, archetype.vector),
  }));

  // Deterministic ordering: nearest first; ties resolved toward the archetype that
  // leans the user's way on their most extreme axis; final tie on id (alphabetical).
  withDistance.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    const aAlign = a.archetype.vector[extreme] * extremeSign;
    const bAlign = b.archetype.vector[extreme] * extremeSign;
    if (aAlign !== bAlign) return bAlign - aAlign;
    return a.archetype.id < b.archetype.id ? -1 : 1;
  });

  const probabilities = softmaxNegDistance(
    withDistance.map((d) => d.distance),
    config.temperature,
  );

  const ranked: Match[] = withDistance.map((d, i) => ({
    archetype: d.archetype,
    distance: d.distance,
    probability: probabilities[i],
  }));

  const primary = ranked[0];
  const secondary = ranked[1];

  // Headline split: renormalise the top two probabilities to sum to 100.
  const pairTotal = primary.probability + secondary.probability;
  const primaryPct = Math.round((primary.probability / pairTotal) * 100);
  const split = { primary: primaryPct, secondary: 100 - primaryPct };

  // Third animal shown only when genuinely in range (distance within margin of #2).
  const third = ranked[2];
  const alsoClose =
    third && third.distance - secondary.distance < config.alsoCloseMargin ? third : null;

  const muddy = magnitude(vector) < config.muddyNormThreshold;

  return {
    vector,
    ranked,
    primary,
    secondary,
    split,
    alsoClose,
    muddy,
    standoutAxes: standoutAxes(vector),
  };
}
