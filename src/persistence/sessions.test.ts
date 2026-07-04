import { describe, expect, it } from "vitest";
import {
  buildCompletedResult,
  clearProgress,
  latestResult,
  listResults,
  loadProgress,
  saveProgress,
  saveResult,
} from "./sessions";
import { TIERS } from "../tiers";
import type { Answers } from "../engine";

// In a node (non-window) test env, the store falls back to an in-memory map.

describe("save & resume", () => {
  it("round-trips an in-progress session and clears it", () => {
    saveProgress("soul-search", { G1: "a", G2: "b" }, 2, 35);
    const loaded = loadProgress("soul-search");
    expect(loaded).not.toBeNull();
    expect(loaded?.index).toBe(2);
    expect(loaded?.total).toBe(35);
    expect(Object.keys(loaded?.answers ?? {})).toHaveLength(2);

    clearProgress("soul-search");
    expect(loadProgress("soul-search")).toBeNull();
  });

  it("does not resume an empty session", () => {
    saveProgress("speed-run", {}, 0, 16);
    expect(loadProgress("speed-run")).toBeNull();
  });
});

describe("completed results", () => {
  it("stores a result and finds the latest per tier", () => {
    const answers: Answers = Object.fromEntries(
      TIERS["soul-search"].questions.map((q) => [q.id, "a"]),
    );
    const match = TIERS["soul-search"].run(answers);
    const record = buildCompletedResult("soul-search", "Soul Search", match, "some prose", "template");
    saveResult(record);

    const latest = latestResult("soul-search");
    expect(latest).not.toBeNull();
    const l = latest!;
    expect(l.tier).toBe("soul-search");
    expect(l.primary.id).toBe(match.primary.archetype.id);
    expect(l.split.primary + l.split.secondary).toBe(100);
    expect(listResults().length).toBeGreaterThan(0);
  });
});
