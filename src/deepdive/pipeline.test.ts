import { describe, expect, it } from "vitest";
import {
  buildRunLog,
  buildTranscript,
  isInterviewComplete,
  nominate,
  stripTranscriptBlock,
  toPersonProfile,
  TRANSCRIPT_MARKER,
  type AxisEntry,
  type ChatTurn,
  type Decision,
} from "./pipeline";
import { rankAnimals } from "./ranker";
import { TIER3_ANIMALS } from "./library";

const axes = (
  scores: number[],
  confs: Array<"low" | "medium" | "high">,
): AxisEntry[] =>
  ["SOC", "TMP", "COG", "BND", "AUT", "REC", "NOV", "EXP"].map((code, i) => ({
    code,
    score: scores[i],
    evidence: `"quote for ${code}"`,
    confidence: confs[i],
  }));

describe("interview completion + transcript assembly", () => {
  it("detects the driver completion marker", () => {
    expect(isInterviewComplete("some close line\n" + TRANSCRIPT_MARKER)).toBe(true);
    expect(isInterviewComplete("just another question?")).toBe(false);
  });

  it("strips a trailing TRANSCRIPT block", () => {
    const text = "That's plenty, thank you.\n" + TRANSCRIPT_MARKER + "\nQ: ...\nA: ...";
    expect(stripTranscriptBlock(text).trim()).toBe("That's plenty, thank you.");
  });

  it("pairs each question with the following answer, dropping the final close", () => {
    const messages: ChatTurn[] = [
      { role: "assistant", content: "Welcome. Here is your first question: tell me about X." },
      { role: "user", content: "I did X last spring." },
      { role: "assistant", content: "And a time you shared your space?" },
      { role: "user", content: "I lived with three roommates." },
      { role: "assistant", content: "Thank you, that's enough.\n" + TRANSCRIPT_MARKER + "\nQ: ...\nA: ..." },
    ];
    const t = buildTranscript(messages);
    expect(t).toContain("Q: Welcome. Here is your first question: tell me about X.");
    expect(t).toContain("A: I did X last spring.");
    expect(t).toContain("A: I lived with three roommates.");
    // The final assistant close (no following user answer) must not appear.
    expect(t).not.toContain(TRANSCRIPT_MARKER);
  });
});

describe("profile adapter + nomination", () => {
  it("maps extraction axes to a ranker vector (scores + confidence only)", () => {
    const p = toPersonProfile(axes([-1, -2, 1, 1, -1, 1, 2, 2], [
      "medium", "high", "medium", "high", "medium", "medium", "high", "high",
    ]));
    expect(p.vector.SOC).toBe(-1);
    expect(p.vector.NOV).toBe(2);
    expect(p.confidence.TMP).toBe("high");
  });

  it("nominate agrees with the ranker golden test (person 1 -> Fox)", () => {
    const result = nominate(axes([-1, -2, 1, 1, -1, 1, 2, 2], [
      "medium", "high", "medium", "high", "medium", "medium", "high", "high",
    ]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidates[0].id).toBe("fox");
      expect(result.candidates).toHaveLength(5);
      expect(result.weakFit).toBe(false);
    }
  });

  it("refuses when the interview produced no direction", () => {
    const result = nominate(axes([0, 0, 0, 0, 0, 0, 0, 0], Array(8).fill("high")));
    expect(result.ok).toBe(false);
  });
});

describe("beta run-log", () => {
  it("carries the derived vector + full 16-animal ranking, never a transcript", () => {
    const a = axes([-1, -2, 1, 1, -1, 1, 2, 2], [
      "medium", "high", "medium", "high", "medium", "medium", "high", "high",
    ]);
    const outcome = rankAnimals(toPersonProfile(a), TIER3_ANIMALS);
    if (!outcome.ok) throw new Error("expected ranking");
    const decision: Decision = {
      winner_id: "fox",
      runnerup_id: "raven",
      distinction: "…",
      comparison_notes: "…",
      decided_on_low_confidence: false,
    };
    const log = buildRunLog("run-1", "2026-07-24T00:00:00.000Z", a, outcome.ranked, decision);
    expect(log.ranking).toHaveLength(16);
    expect(log.ranking[0]).toEqual({ rank: 1, id: "fox", alignment: 0.814 });
    expect(log.weak_fit).toBe(false);
    expect(log.reaction).toBeNull();
    expect(log.profile.axes[0]).toEqual({ code: "SOC", score: -1, confidence: "medium" });
    expect(JSON.stringify(log)).not.toContain("quote for");
  });
});
