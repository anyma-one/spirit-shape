import { describe, expect, it } from "vitest";
import { parseInline, parseReport } from "./reportFormat";

describe("parseInline", () => {
  it("splits plain and bold segments on **...**", () => {
    expect(parseInline("You finish things and **then let them go silent.** Always.")).toEqual([
      { text: "You finish things and ", bold: false },
      { text: "then let them go silent.", bold: true },
      { text: " Always.", bold: false },
    ]);
  });

  it("returns a single plain segment when there is no bold", () => {
    expect(parseInline("Just plain text.")).toEqual([{ text: "Just plain text.", bold: false }]);
  });
});

describe("parseReport", () => {
  it("turns ## lines into headings (hashes stripped) and text into paragraphs", () => {
    const report = [
      "## At Your Core",
      "",
      "You work toward mastery you can verify yourself. **That is the thread.**",
      "",
      "## What Challenges You",
      "",
      "You aim at this and are still looking for the way in that holds.",
    ].join("\n");

    const blocks = parseReport(report);
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toEqual({ type: "heading", lines: [[{ text: "At Your Core", bold: false }]] });
    expect(blocks[1].type).toBe("paragraph");
    // bold survives inside a paragraph
    expect(blocks[1].lines[0]).toContainEqual({ text: "That is the thread.", bold: true });
    expect(blocks[2]).toEqual({
      type: "heading",
      lines: [[{ text: "What Challenges You", bold: false }]],
    });
  });

  it("keeps single line breaks within a block as separate lines (the short version / questions)", () => {
    const report = "First line.\nSecond line.\nThird line.";
    const blocks = parseReport(report);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].lines).toHaveLength(3);
    expect(blocks[0].lines[1][0]).toEqual({ text: "Second line.", bold: false });
  });

  it("ignores blank blocks (safe on partial/streaming text)", () => {
    expect(parseReport("\n\n   \n\n")).toEqual([]);
  });
});
