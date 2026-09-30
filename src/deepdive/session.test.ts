import { beforeEach, describe, expect, it } from "vitest";
import { loadReading, saveReading, saveReadingReaction, type SavedReading } from "./session";

// Minimal in-memory localStorage (the test environment has none).
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const reading: SavedReading = {
  runId: "run-1",
  finishedAt: "2026-09-30T12:00:00.000Z",
  axes: [{ code: "SOC", score: -2, evidence: "long rides alone", confidence: "high" }],
  decision: {
    winner_id: "bear",
    runnerup_id: "cat",
    distinction: "",
    comparison_notes: "",
    decided_on_low_confidence: false,
  },
  report: "## At your core\\n\\nYou work in private.",
  reaction: null,
};

describe("saved reading (one Deep Dive per device)", () => {
  beforeEach(() => store.clear());

  it("round-trips a finished reading", () => {
    saveReading(reading);
    expect(loadReading()).toEqual(reading);
  });

  it("has nothing before a reading is finished", () => {
    expect(loadReading()).toBeNull();
  });

  it("keeps the rating so the reader is not asked twice", () => {
    saveReading(reading);
    saveReadingReaction(4);
    expect(loadReading()?.reaction).toBe(4);
  });

  it("ignores a damaged or empty record rather than showing a broken page", () => {
    store.set("anyma.deepdive.reading.v1", "{not json");
    expect(loadReading()).toBeNull();
    saveReading({ ...reading, report: "" });
    expect(loadReading()).toBeNull();
  });
});
