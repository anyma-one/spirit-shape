import { describe, expect, it } from "vitest";
import { toMatchResult } from "./matchResult";
import { nominate, type AxisEntry, type Decision } from "./pipeline";
import { buildDeepReveal } from "../reveal";

// A vector with real direction on several axes, so nomination has signal to work
// with (an all-zero profile is refused by the ranker by design).
const AXES: AxisEntry[] = [
  { code: "SOC", score: -2, evidence: "kept to herself", confidence: "high" },
  { code: "TMP", score: -1, evidence: "waited it out", confidence: "high" },
  { code: "COG", score: -2, evidence: "worked it through step by step", confidence: "high" },
  { code: "BND", score: 1, evidence: "held the line", confidence: "medium" },
  { code: "AUT", score: -1, evidence: "let it go", confidence: "medium" },
  { code: "REC", score: -2, evidence: "never mentioned it", confidence: "high" },
  { code: "NOV", score: -1, evidence: "same route every time", confidence: "medium" },
  { code: "EXP", score: 1, evidence: "writes most evenings", confidence: "medium" },
];

function ranked() {
  const n = nominate(AXES);
  if (!n.ok) throw new Error("fixture should nominate");
  return n.ranked;
}

const decisionFor = (winner: string, runnerUp: string): Decision => ({
  winner_id: winner,
  runnerup_id: runnerUp,
  distinction: "",
  comparison_notes: "",
  decided_on_low_confidence: false,
});

describe("Deep Dive → MatchResult adapter", () => {
  it("names the synthesised winner as primary, even when it did not rank first", () => {
    const r = ranked();
    const first = r[0].id;
    const third = r[2].id;
    const result = toMatchResult(AXES, r, decisionFor(third, first))!;

    expect(result).not.toBeNull();
    // Synthesis overrides the ranking — the adapter must not "correct" it back.
    expect(result.primary.archetype.id).toBe(third);
    expect(result.secondary.archetype.id).toBe(first);
  });

  it("carries the extracted vector through unchanged", () => {
    const result = toMatchResult(AXES, ranked(), decisionFor("owl", "tortoise"))!;
    expect(result.vector.SOC).toBe(-2);
    expect(result.vector.EXP).toBe(1);
    expect(result.standoutAxes.length).toBeGreaterThan(0);
  });

  it("names exactly two animals and no third", () => {
    const result = toMatchResult(AXES, ranked(), decisionFor("owl", "tortoise"))!;
    expect(result.alsoClose).toBeNull();
    expect(result.split.primary + result.split.secondary).toBe(100);
  });

  it("returns null when an animal id is not in the shared library", () => {
    expect(toMatchResult(AXES, ranked(), decisionFor("chimera", "owl"))).toBeNull();
    expect(toMatchResult(AXES, ranked(), decisionFor("owl", "chimera"))).toBeNull();
  });

  it("feeds buildDeepReveal a result it can fully unlock", () => {
    const result = toMatchResult(AXES, ranked(), decisionFor("owl", "tortoise"))!;
    const reveal = buildDeepReveal(result);

    expect(reveal.symbolic.every((i) => i.value !== null)).toBe(true);
    expect(reveal.symbolic.map((i) => i.label)).toEqual(["Element", "Archetype", "Mythic role"]);
    // L1 + L2 + L3: the Deep Dive is the only place all three levels are rendered.
    expect(reveal.mythologyParas).toHaveLength(3);
    expect(reveal.mythologyLocked).toEqual([]);
  });
});
