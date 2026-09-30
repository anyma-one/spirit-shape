import { describe, expect, it } from "vitest";
import { splitSections, structurePartial, structureReport } from "./reportSections";
import { parseReport } from "./reportFormat";

// Headings here are deliberately NOT the prompt's brief names: the report model picks
// its own wording, so nothing in reportSections may depend on specific heading text.
const REPORT = [
  "## The shape you keep making",
  "You go quiet, you watch, and you come back with the thing nobody had put together.",
  "That is the Owl, and it is not the Owl's reputation, it is your evidence.",
  "## Where you break the pattern",
  "Where the Owl would wait, you speak. That is the Hawk in you, and it is yours.",
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
      "Where you break the pattern",
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
      "Beyond the spirit",
      "You & the world",
      "What challenges you",
      "What you might not be aware of",
      "Three questions to go deeper",
    ]);
    // Content still comes from the section that was in that position.
    expect(r.distillation?.blocks[0].lines).toHaveLength(3);
  });

  it("ignores a title heading with nothing under it", () => {
    const r = structureReport(`# The Owl\n\n${REPORT}`);
    expect(r.distillation?.title).toBe("The short version");
    expect(r.sections[0].title).toBe("At your core");
    expect(r.sections).toHaveLength(6);
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

describe("report while streaming", () => {
  // REPORT cut off partway through a section, as the stream delivers it.
  const upTo = (heading: string, extra = "") => REPORT.slice(0, REPORT.indexOf(heading)) + heading + extra;

  it("shows nothing before the first heading arrives", () => {
    expect(structurePartial("")).toEqual({ sections: [], distillation: null, writing: null });
  });

  it("labels rows as the finished report will, and names the one being written", () => {
    const p = structurePartial(upTo("## The self you carry", "\n\nYou describe"));
    expect(p.sections.map((s) => s.title)).toEqual(["At your core", "Beyond the spirit", "You & the world"]);
    expect(p.writing).toBe("You & the world");
  });

  it("keeps the distillation out of the rows and only surfaces it once complete", () => {
    const writingIt = structurePartial(upTo("## In short", "\n\nYou think before you move."));
    expect(writingIt.distillation).toBeNull();
    expect(writingIt.sections.map((s) => s.title)).not.toContain("The short version");
    const pastIt = structurePartial(upTo("## Three questions to sit with"));
    expect(pastIt.distillation?.title).toBe("The short version");
    expect(pastIt.sections.at(-1)?.title).toBe("Three questions to go deeper");
  });

  it("ends with the same rows the finished report shows", () => {
    const done = structureReport(REPORT);
    const partial = structurePartial(REPORT);
    expect(partial.sections.map((s) => s.title)).toEqual(done.sections.map((s) => s.title));
    expect(partial.distillation?.title).toBe(done.distillation?.title);
  });

  it("ignores a title heading once the real first section starts", () => {
    const p = structurePartial("# The Owl\n\n## The shape you keep making\n\nYou go quiet.");
    expect(p.sections.map((s) => s.title)).toEqual(["At your core"]);
  });
});
