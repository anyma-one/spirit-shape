// Shared types for the deterministic matching engine.
// These are tier-agnostic: Speed Run (Phase 1), Soul Search (Phase 2) and the
// Deep Dive nominator (Phase 3) all reuse this same engine and vocabulary.

/** The eight trait axes, in canonical vector order. */
export const AXES = [
  "SOC", // Social energy
  "TMP", // Action tempo
  "COG", // Cognitive style
  "BND", // Boundaries
  "AUT", // Conflict and authority
  "REC", // Recognition
  "NOV", // Novelty
  "EXP", // Expressive drive
] as const;

export type Axis = (typeof AXES)[number];

/** A point in trait space. Keyed by axis; values are (conceptually) in [-2, 2]. */
export type Vector = Record<Axis, number>;

/** Partial axis contributions carried by a single answer option. */
export type AxisWeights = Partial<Record<Axis, number>>;

export interface AxisDef {
  code: Axis;
  name: string;
  negPole: string;
  posPole: string;
  /** What the axis is named when the user leans negative / positive (for prose). */
  negLabel: string;
  posLabel: string;
}

export interface Archetype {
  /** Stable id, e.g. "wolf". */
  id: string;
  name: string;
  vector: Vector;
  /** One-line tone guide for prose (from the Phase 0 content library). */
  note: string;
  /**
   * Pool membership. Phase 1/2 match "common" only; the Deep Dive (Phase 3)
   * adds "rare". Kept on the model now so later tiers need no engine change.
   */
  pool: "common" | "rare";
}

export interface AnswerOption {
  /** Stable id within the question, e.g. "a". */
  id: string;
  label: string;
  weights: AxisWeights;
}

/**
 * Input format (Soul Search v0.6). Every format still emits an 8-axis contribution
 * that the engine sums; only the interaction + how the contribution is derived
 * differs. Absent => "mc". See scoring.ts §5 for the per-format normalization.
 */
export type QuestionFormat = "mc" | "slider" | "pad" | "rank";

/** Bipolar slider config: one axis, five notches (-2..+2), pole labels. */
export interface SliderConfig {
  axis: Axis;
  /** Label at the negative pole (notch -2). */
  leftLabel: string;
  /** Label at the positive pole (notch +2). */
  rightLabel: string;
}

/** Two-axis pad config: a square whose x/y map to two axes, tap in [-1,+1]². */
export interface PadConfig {
  xAxis: Axis;
  yAxis: Axis;
  xLeftLabel: string; // x = -1
  xRightLabel: string; // x = +1
  yBottomLabel: string; // y = -1
  yTopLabel: string; // y = +1
  cornerTL: string;
  cornerTR: string;
  cornerBL: string;
  cornerBR: string;
}

export interface Question {
  id: string; // e.g. "Q1"
  stem: string;
  options: AnswerOption[];
  /**
   * Scoring class. The engine itself ignores this; a tier's WeightMultiplier
   * reads it to apply the half-weight depth-item mechanic (Phase 2 / Soul Search).
   * Absent => treated as a full-weight "grounded" item.
   */
  category?: "grounded" | "depth";
  /** Input format; absent => "mc". Slider/pad carry a config; rank reuses options. */
  format?: QuestionFormat;
  slider?: SliderConfig;
  pad?: PadConfig;
}

// ---- Answer values (one per format) ----
/** Slider: the chosen notch, an integer in [-2, +2]. */
export interface SliderAnswer {
  notch: number;
}
/** Pad: the tapped point, each component in [-1, +1]. */
export interface PadAnswer {
  x: number;
  y: number;
}
/** Rank: option ids ordered most-true first. */
export interface RankAnswer {
  order: string[];
}
/** A single question's answer. A bare string is an MC option id (back-compatible). */
export type AnswerValue = string | SliderAnswer | PadAnswer | RankAnswer;

/** Tunable engine parameters. All live in config, never hard-coded in logic. */
export interface EngineConfig {
  /**
   * Raw axis sums are divided by this before clamping into [-2, 2]. Higher =>
   * the user must lean harder on an axis to reach a pole. First-draft tuning value.
   */
  scaleDivisor: number;
  /** Clamp bounds for a scored axis. */
  clampMin: number;
  clampMax: number;
  /** Softmax temperature over negative distance. Lower => more decisive splits. */
  temperature: number;
  /**
   * The third "also close" animal is shown when its distance is within this
   * margin of the second animal's distance.
   */
  alsoCloseMargin: number;
  /**
   * A profile is "muddy" (flat, no strong lean) when the L2 norm of the user's
   * scored vector is below this. Named honestly rather than hidden.
   */
  muddyNormThreshold: number;
  /**
   * Half-weight multiplier for philosophical / depth items (Phase 2). Speed Run
   * questions are all full weight, so this is unused in Phase 1 but defined here
   * so the config shape is stable across tiers.
   */
  depthItemMultiplier: number;
}

/** One archetype's standing against the user's vector. */
export interface Match {
  archetype: Archetype;
  distance: number;
  /** Softmax probability over the full candidate pool, 0..1. */
  probability: number;
}

export interface MatchResult {
  /** The user's scored (scaled, clamped) trait vector. */
  vector: Vector;
  /** All candidates, sorted best-first (deterministic tie-break applied). */
  ranked: Match[];
  /** Primary and secondary animals, always present. */
  primary: Match;
  secondary: Match;
  /** The headline split between primary and secondary, summing to 100. */
  split: { primary: number; secondary: number };
  /** The third "also close" animal, when genuinely in range; else null. */
  alsoClose: Match | null;
  /** Honest muddy flag — drives the "balanced profile, go deeper" banner. */
  muddy: boolean;
  /** Axes where the user leans hardest, strongest-first (for prose grounding). */
  standoutAxes: Array<{ axis: Axis; value: number }>;
}
