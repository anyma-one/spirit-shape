import { describe, it, expect } from "vitest";
import { shapeFit, MAX_DEPARTURES } from "./shapeFit";
import type { AxisEntry } from "./pipeline";

const entry = (code: string, score: number, confidence: AxisEntry["confidence"] = "high"): AxisEntry => ({
  code,
  score,
  evidence: "",
  confidence,
});

// The profile from the 2026-09-27 smoke run (winner Owl, runner-up Hawk).
// Owl  = SOC -2, TMP -2, COG -1, BND 1, AUT -1, REC -2, NOV -1, EXP 0
// Hawk = SOC -1, TMP  2, COG -1, BND 1, AUT  1, REC  0, NOV  0, EXP 0
const smoke: AxisEntry[] = [
  entry("SOC", -2),
  entry("TMP", -1, "medium"),
  entry("COG", -2),
  entry("BND", 1, "medium"),
  entry("AUT", 1, "medium"),
  entry("REC", -1, "medium"),
  entry("NOV", 1, "medium"),
  entry("EXP", -1, "medium"),
];

describe("shapeFit", () => {
  it("splits the traits into fits and departures with no overlap", () => {
    const fit = shapeFit(smoke, "owl", "hawk");
    const fitNames = fit.fits.map((f) => f.trait);
    const depNames = fit.departures.map((d) => d.trait);
    expect(depNames.sort()).toEqual(["Conflict and authority", "Novelty versus routine"]);
    expect(fitNames).toEqual([
      "Social energy",
      "Action tempo",
      "Cognitive style",
      "Boundaries and territory",
      "Recognition",
    ]);
    expect(fitNames.filter((n) => depNames.includes(n))).toEqual([]);
  });

  it("credits the second nature only where it sits with the person", () => {
    const fit = shapeFit(smoke, "owl", "hawk");
    const byTrait = Object.fromEntries(fit.departures.map((d) => [d.trait, d.carriedBy]));
    expect(byTrait["Conflict and authority"]).toBe("Hawk"); // Hawk AUT +1 = theirs
    expect(byTrait["Novelty versus routine"]).toBeNull(); // Hawk NOV 0: theirs alone
  });

  it("skips traits where the shape is neutral (Owl EXP 0)", () => {
    const fit = shapeFit(smoke, "owl", "hawk");
    const all = [...fit.fits, ...fit.departures].map((f) => f.trait);
    expect(all).not.toContain("Expressive drive");
  });

  it("never claims anything from a low-confidence score", () => {
    const fit = shapeFit([entry("AUT", 2, "low"), entry("SOC", -2, "low")], "owl", "hawk");
    expect(fit).toEqual({ fits: [], departures: [] });
  });

  it("describes both sides in words, never as numbers", () => {
    const dep = shapeFit(smoke, "owl", "hawk").departures.find((d) => d.trait === "Conflict and authority")!;
    expect(dep.theirs).toBe("leans: Confrontational, questions authority directly");
    expect(dep.shape).toBe("leans: Avoidant, defers, keeps the peace");
  });

  it("keeps only the strongest departures, widest gap first", () => {
    // Lion = SOC 1, TMP 0, COG 0, BND 2, AUT 2, REC 2, NOV -1, EXP 0
    const opposite: AxisEntry[] = [
      entry("SOC", -2), // gap 3
      entry("BND", -2), // gap 4
      entry("AUT", -2), // gap 4
      entry("REC", -2), // gap 4
      entry("NOV", 2), // gap 3
    ];
    const fit = shapeFit(opposite, "lion", "owl");
    expect(fit.departures).toHaveLength(MAX_DEPARTURES);
    expect(fit.departures.map((d) => d.trait)).toEqual([
      "Boundaries and territory",
      "Conflict and authority",
      "Recognition",
    ]);
  });

  it("returns nothing for an unknown winner rather than guessing", () => {
    expect(shapeFit(smoke, "unicorn", "hawk")).toEqual({ fits: [], departures: [] });
  });
});
