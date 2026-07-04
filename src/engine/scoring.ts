import { AXES } from "./types";
import type {
  Axis,
  AxisWeights,
  AnswerValue,
  EngineConfig,
  PadAnswer,
  Question,
  RankAnswer,
  SliderAnswer,
  Vector,
} from "./types";

/** A user's answers: question id -> the answer value for its format. */
export type Answers = Record<string, AnswerValue>;

function zeroVector(): Vector {
  return { SOC: 0, TMP: 0, COG: 0, BND: 0, AUT: 0, REC: 0, NOV: 0, EXP: 0 };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function l2Weights(w: AxisWeights): number {
  let sum = 0;
  for (const axis of AXES) {
    const v = w[axis];
    if (v !== undefined) sum += v * v;
  }
  return Math.sqrt(sum);
}

/**
 * §5 reference magnitude M: the mean L2 norm of every current Grounded multiple-
 * choice option vector. Constant for a given question set; the slider/pad/rank
 * formats calibrate to it so each contributes the same per-question magnitude as a
 * multiple-choice answer. (Depth items and non-MC questions are excluded.)
 */
export function meanGroundedMcNorm(questions: Question[]): number {
  let sum = 0;
  let n = 0;
  for (const q of questions) {
    if ((q.format ?? "mc") !== "mc") continue;
    if (q.category === "depth") continue;
    for (const o of q.options) {
      sum += l2Weights(o.weights);
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

function isSlider(a: AnswerValue): a is SliderAnswer {
  return typeof a === "object" && a !== null && "notch" in a;
}
function isPad(a: AnswerValue): a is PadAnswer {
  return typeof a === "object" && a !== null && "x" in a && "y" in a;
}
function isRank(a: AnswerValue): a is RankAnswer {
  return typeof a === "object" && a !== null && "order" in a;
}

/**
 * Rank contribution (§4/§5): each option keeps its full vector; its rank assigns a
 * coefficient c_r = (n+1)/2 − r (r = 1 at the top). The raw coefficient-weighted sum
 * is then rescaled so the question's total magnitude equals M·W.
 */
function addRankContribution(
  raw: Vector,
  question: Question,
  order: string[],
  M: number,
  W: number,
): void {
  const n = question.options.length;
  const contrib = zeroVector();
  order.forEach((optId, i) => {
    const opt = question.options.find((o) => o.id === optId);
    if (!opt) return;
    const c = (n + 1) / 2 - (i + 1); // position i is rank r = i + 1
    for (const [axis, weight] of Object.entries(opt.weights) as [Axis, number][]) {
      contrib[axis] += c * weight;
    }
  });
  const norm = magnitude(contrib);
  if (norm === 0) return;
  const scale = (M * W) / norm;
  for (const axis of AXES) raw[axis] += contrib[axis] * scale;
}

/**
 * Optional per-question weight multiplier. Phase 1 returns 1 for everything;
 * Phase 2 uses this to apply the half-weight (×0.5) depth-item mechanic without
 * touching this function. For the non-MC formats this doubles as §5's weight class W.
 */
export type WeightMultiplier = (question: Question) => number;

/**
 * Score answers into the user's trait vector.
 *
 * 1. Turn each question's answer into an 8-axis contribution, by format (§5):
 *    - mc:     the selected option's vector × W
 *    - slider: (notch/2) · M · W on the slider's axis
 *    - pad:    x·(M/√2)·W and y·(M/√2)·W on the two axes
 *    - rank:   coefficient-weighted option sum, rescaled to magnitude M·W
 *    where W = the per-question multiplier and M = meanGroundedMcNorm.
 * 2. Scale the raw sums by config.scaleDivisor.
 * 3. Clamp into [clampMin, clampMax] so the user lives in the same space as archetypes.
 */
export function scoreAnswers(
  questions: Question[],
  answers: Answers,
  config: EngineConfig,
  multiplier: WeightMultiplier = () => 1,
): Vector {
  const raw = zeroVector();
  const M = meanGroundedMcNorm(questions);
  const SQRT2 = Math.SQRT2;

  for (const question of questions) {
    const ans = answers[question.id];
    if (ans === undefined) continue;
    const W = multiplier(question);
    const fmt = question.format ?? "mc";

    if (fmt === "mc") {
      if (typeof ans !== "string") continue;
      const option = question.options.find((o) => o.id === ans);
      if (!option) continue;
      for (const [axis, weight] of Object.entries(option.weights) as [Axis, number][]) {
        raw[axis] += weight * W;
      }
    } else if (fmt === "slider" && question.slider && isSlider(ans)) {
      // notch -2..+2 maps onto p -1..+1; a full pole (±2) contributes ±M·W.
      raw[question.slider.axis] += (ans.notch / 2) * M * W;
    } else if (fmt === "pad" && question.pad && isPad(ans)) {
      // a full corner (±1,±1) has magnitude M·W; an edge tap is intentionally weaker.
      raw[question.pad.xAxis] += ans.x * (M / SQRT2) * W;
      raw[question.pad.yAxis] += ans.y * (M / SQRT2) * W;
    } else if (fmt === "rank" && isRank(ans)) {
      addRankContribution(raw, question, ans.order, M, W);
    }
  }

  const scored = zeroVector();
  for (const axis of AXES) {
    scored[axis] = clamp(raw[axis] / config.scaleDivisor, config.clampMin, config.clampMax);
  }
  return scored;
}

/** L2 norm of a vector — used to detect a flat ("muddy") profile. */
export function magnitude(vector: Vector): number {
  let sum = 0;
  for (const axis of AXES) sum += vector[axis] * vector[axis];
  return Math.sqrt(sum);
}

/** True if every question has a recorded answer. */
export function isComplete(questions: Question[], answers: Answers): boolean {
  return questions.every((q) => answers[q.id] !== undefined);
}
