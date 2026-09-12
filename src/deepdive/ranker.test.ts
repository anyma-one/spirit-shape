import { describe, expect, it } from "vitest";
import { AXES } from "../engine/types";
import type { Axis, Vector } from "../engine/types";
import { TIER3_ANIMALS, TIER3_DOLPHIN_NOV } from "./library";
import { COMMON_ANIMALS } from "../data/archetypes";
import {
  candidatesBlock,
  isWeakFit,
  rankAnimals,
  type Confidence,
  type ConfidenceMap,
  type PersonProfile,
} from "./ranker";

// Build a profile from scores + confidences given in canonical axis order.
function profile(scores: number[], confs: Confidence[]): PersonProfile {
  const vector = {} as Vector;
  const confidence = {} as ConfidenceMap;
  AXES.forEach((axis: Axis, i) => {
    vector[axis] = scores[i];
    confidence[axis] = confs[i];
  });
  return { vector, confidence };
}

// Compact view of the top-5 for golden assertions: "name alignment(3dp)".
function top5(p: PersonProfile): string[] {
  const outcome = rankAnimals(p, TIER3_ANIMALS);
  if (!outcome.ok) throw new Error("expected a ranking, got refusal");
  return outcome.ranked.slice(0, 5).map((r) => `${r.name} ${r.alignment.toFixed(3)}`);
}

describe("Tier 3 library", () => {
  it("is the 16 common animals with exactly one edit: Dolphin NOV +1", () => {
    expect(TIER3_ANIMALS).toHaveLength(16);
    for (const a of TIER3_ANIMALS) {
      const shared = COMMON_ANIMALS.find((c) => c.id === a.id)!;
      for (const axis of AXES) {
        if (a.id === "dolphin" && axis === "NOV") {
          expect(a.vector[axis]).toBe(TIER3_DOLPHIN_NOV);
          expect(shared.vector[axis]).toBe(0); // shared library untouched
        } else {
          expect(a.vector[axis]).toBe(shared.vector[axis]);
        }
      }
    }
  });
});

describe("Tier 3 ranker — golden tests (alignment to 3 decimals)", () => {
  it("Test person 1", () => {
    const p = profile(
      [-1, -2, 1, 1, -1, 1, 2, 2],
      ["medium", "high", "medium", "high", "medium", "medium", "high", "high"],
    );
    expect(top5(p)).toEqual([
      "Fox 0.814",
      "Raven 0.672",
      "Octopus 0.332",
      "Hummingbird 0.299",
      "Owl 0.232",
    ]);
  });

  it("Test person 2", () => {
    const p = profile(
      [2, -1, 0, -2, -1, 1, 2, 1],
      ["high", "medium", "low", "medium", "medium", "medium", "high", "medium"],
    );
    expect(top5(p)).toEqual([
      "Dolphin 0.849",
      "Hummingbird 0.781",
      "Fox 0.761",
      "Horse 0.721",
      "Coyote 0.642",
    ]);
  });
});

describe("Tier 3 ranker — refusal + determinism", () => {
  it("refuses to rank an all-zero vector (no direction)", () => {
    const p = profile([0, 0, 0, 0, 0, 0, 0, 0], Array(8).fill("high") as Confidence[]);
    const outcome = rankAnimals(p, TIER3_ANIMALS);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("no-direction");
  });

  it("refuses when the only non-zero axes carry zero weight (all low-conf zeros)", () => {
    // Every non-zero axis is 0, so salience weight is 0 everywhere -> no direction.
    const p = profile([0, 0, 0, 0, 0, 0, 0, 0], Array(8).fill("low") as Confidence[]);
    expect(rankAnimals(p, TIER3_ANIMALS).ok).toBe(false);
  });

  it("ranks all 16 and is deterministic across runs", () => {
    const p = profile(
      [-1, -2, 1, 1, -1, 1, 2, 2],
      ["medium", "high", "medium", "high", "medium", "medium", "high", "high"],
    );
    const a = rankAnimals(p, TIER3_ANIMALS);
    const b = rankAnimals(p, TIER3_ANIMALS);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.ranked).toHaveLength(16);
      expect(a.ranked.map((r) => r.id)).toEqual(b.ranked.map((r) => r.id));
    }
  });
});

describe("Tier 3 candidates block", () => {
  it("carries rank only under the field name synthesis expects", () => {
    const p = profile(
      [-1, -2, 1, 1, -1, 1, 2, 2],
      ["medium", "high", "medium", "high", "medium", "medium", "high", "high"],
    );
    const outcome = rankAnimals(p, TIER3_ANIMALS);
    if (!outcome.ok) throw new Error("expected a ranking");
    const block = candidatesBlock(outcome.ranked);
    expect(block).toHaveLength(5);
    expect(block[0]).toMatchObject({ id: "fox", distance_rank: 1 });
    expect(block[0]).not.toHaveProperty("alignment");
    expect(block.map((c) => c.distance_rank)).toEqual([1, 2, 3, 4, 5]);
    expect(isWeakFit(outcome.ranked)).toBe(false);
  });
});
