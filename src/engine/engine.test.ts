import { describe, expect, it } from "vitest";
import { euclidean, matchVector, scoreAnswers } from "./index";
import type { Answers } from "./scoring";
import { COMMON_ANIMALS } from "../data/archetypes";
import { SPEED_RUN_CONFIG } from "../data/config";
import { SPEED_RUN_QUESTIONS } from "../data/questions";
import { TIERS } from "../tiers";

const runSpeedRun = TIERS["speed-run"].run;

// A consistent "all option a" answer set and helpers for building profiles.
function answerAll(optionId: string): Answers {
  return Object.fromEntries(SPEED_RUN_QUESTIONS.map((q) => [q.id, optionId]));
}

describe("scoring", () => {
  it("scales raw sums by the divisor and clamps into [-2, 2]", () => {
    const v = scoreAnswers(SPEED_RUN_QUESTIONS, answerAll("a"), SPEED_RUN_CONFIG);
    for (const axis of Object.keys(v) as (keyof typeof v)[]) {
      expect(v[axis]).toBeGreaterThanOrEqual(-2);
      expect(v[axis]).toBeLessThanOrEqual(2);
    }
  });

  it("ignores unanswered questions without throwing", () => {
    const v = scoreAnswers(SPEED_RUN_QUESTIONS, { Q1: "a" }, SPEED_RUN_CONFIG);
    expect(v.SOC).toBeCloseTo(2 / SPEED_RUN_CONFIG.scaleDivisor, 6);
    expect(v.REC).toBeCloseTo(1 / SPEED_RUN_CONFIG.scaleDivisor, 6);
  });
});

describe("euclidean", () => {
  it("is zero for identical vectors and symmetric", () => {
    const a = COMMON_ANIMALS[0].vector;
    const b = COMMON_ANIMALS[1].vector;
    expect(euclidean(a, a)).toBe(0);
    expect(euclidean(a, b)).toBeCloseTo(euclidean(b, a), 12);
  });
});

describe("matchVector", () => {
  it("orders nearest first and yields a split summing to 100", () => {
    const result = runSpeedRun(answerAll("a"));
    expect(result.primary.distance).toBeLessThanOrEqual(result.secondary.distance);
    expect(result.split.primary + result.split.secondary).toBe(100);
    expect(result.split.primary).toBeGreaterThanOrEqual(result.split.secondary);
  });

  it("is deterministic — same answers, same result", () => {
    const a = runSpeedRun(answerAll("a"));
    const b = runSpeedRun(answerAll("a"));
    expect(b.primary.archetype.id).toBe(a.primary.archetype.id);
    expect(b.secondary.archetype.id).toBe(a.secondary.archetype.id);
    expect(b.split).toEqual(a.split);
  });

  it("flags a flat profile as muddy", () => {
    // Empty answers -> zero vector -> norm 0 -> muddy.
    const flat = matchVector(
      { SOC: 0, TMP: 0, COG: 0, BND: 0, AUT: 0, REC: 0, NOV: 0, EXP: 0 },
      COMMON_ANIMALS,
      SPEED_RUN_CONFIG,
    );
    expect(flat.muddy).toBe(true);
  });

  it("does not flag a strongly-leaning profile as muddy", () => {
    // Dominant/social/confrontational answers should produce a clear lean.
    const answers: Answers = {
      ...answerAll("a"),
      Q1: "c", // REC+2, AUT+1
      Q5: "a", // AUT+2, REC+1, SOC+1
      Q14: "a", // AUT+2, TMP+1
    };
    const result = matchVector(
      scoreAnswers(SPEED_RUN_QUESTIONS, answers, SPEED_RUN_CONFIG),
      COMMON_ANIMALS,
      SPEED_RUN_CONFIG,
    );
    expect(result.muddy).toBe(false);
  });

  it("shows the also-close animal only when it is within margin", () => {
    const result = runSpeedRun(answerAll("a"));
    if (result.alsoClose) {
      const gap = result.alsoClose.distance - result.secondary.distance;
      expect(gap).toBeLessThan(SPEED_RUN_CONFIG.alsoCloseMargin);
    }
  });
});
