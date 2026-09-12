import { describe, expect, it } from "vitest";
import { splitSections, structureReport } from "./reportSections";
import { parseReport } from "./reportFormat";

// Headings here are deliberately NOT the prompt's brief names: the report model picks
// its own wording, so nothing in reportSections may depend on specific heading text.
const REPORT = [
  "## The shape you keep making",
  "You go quiet, you watch, and you come back with the thing nobody had put together.",
  "That is the Owl, and it is not the Owl's reputation, it is your evidence.",
  "## The self you carry",
  "You describe yourself as easy-going. The stories do not.",
  "## Where it costs you",
  "You wait past the moment, then resent the room for moving on.",
  "## What you have not noticed",
  "You call it patience. It has been avoidance twice this year.",
  "## In short",
  "You think before you move.\nYou wait too long.\nYou are not as easy-going as you say.",
  "## Three questions to sit with",
  "When did you last say the thing at the time?\nWho has seen you angry?\nWhat are you waiting for?",
].join("\n\n");

describe("report sectioning", () => {
  it("groups blocks under their headings", () => {
    const { lead, sections } = splitSections(parseReport(REPORT));
    expect(lead).toEqual([]);
    expect(sections.map((s) => s.title)).toEqual([
      "The shape you keep making",
      "The self you carry",
      "Where it costs you",
      "What you have not noticed",
      "In short",
      "Three questions to sit with",
    ]);
    expect(sections[0].blocks).toHaveLength(2);
    expect(sections.every((s) => s.blocks.every((b) => b.type === "paragraph"))).toBe(true);
  });

  it("replaces the model's headings with the pinned labels when the shape matches", () => {
    const r = structureReport(REPORT);
    // The model's own wording ("In short", "The shape you keep making", ...) never
    // reaches the page: readers see the same navigation on every run.
    expect(r.distillation?.title).toBe("The short version");
    expect(r.sections.map((s) => s.title)).toEqual([
      "At your core",
      "You & the world",
      "What challenges you",
      "What you might not be aware of",
      "Three questions to go deeper",
    ]);
    // Content still comes from the section that was in that position.
    expect(r.distillation?.blocks[0].lines).toHaveLength(3);
  });

  it("falls back to the model's own headings when the section count is off", () => {
    const fiveSections = [
      "## Opening",
      "Body.",
      "## Second",
      "Body.",
      "## Third",
      "Body.",
      "## In brief",
      "One line.\nTwo lines.",
      "## Closing questions",
      "A question?",
    ].join("\n\n");
    const r = structureReport(fiveSections);
    expect(r.distillation?.title).toBe("In brief"); // shape-matched, model's wording
    expect(r.sections.map((s) => s.title)).toEqual([
      "Opening",
      "Second",
      "Third",
      "Closing questions",
    ]);
  });

  it("never promotes the opening or the closing section", () => {
    // Both ends are short enough to match the shape test; neither may be taken.
    const twoShort = ["## Opener", "One line.", "## Closer", "One line."].join("\n\n");
    expect(structureReport(twoShort).distillation).toBeNull();
  });

  it("promotes nothing when no section has the distillation shape", () => {
    const long = Array.from({ length: 4 }, (_, i) =>
      `## Part ${i}\n\n${"word ".repeat(120).trim()}`,
    ).join("\n\n");
    const r = structureReport(long);
    expect(r.distillation).toBeNull();
    expect(r.sections).toHaveLength(4);
  });

  it("keeps real prose written before any heading as a lead block", () => {
    const r = structureReport("An opening line.\n\n## A heading\n\nBody.");
    expect(r.lead).toHaveLength(1);
    expect(r.sections.map((s) => s.title)).toEqual(["A heading"]);
  });

  // Observed in real output: the model prefixed the report with a bare title, which
  // would otherwise render as a floating fragment above the first row.
  it("drops a stray title line above the first heading", () => {
    const r = structureReport("Final Reading\n\n## A heading\n\nBody.");
    expect(r.lead).toEqual([]);
    expect(r.sections.map((s) => s.title)).toEqual(["A heading"]);
  });

  it("survives a report with no headings at all", () => {
    const r = structureReport("Just one paragraph, no headings anywhere.");
    expect(r.sections).toEqual([]);
    expect(r.distillation).toBeNull();
    expect(r.lead).toHaveLength(1);
  });
});
