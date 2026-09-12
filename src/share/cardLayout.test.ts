import { describe, expect, it } from "vitest";
import { CARD_SPECS, blockHeight, blockTop, fitEchoes, wrapText } from "./cardLayout";

// Stub measurer: every character is 10 units wide. Keeps the wrap tests independent
// of fonts and of a real canvas context.
const measure = (s: string) => s.length * 10;

describe("wrapText", () => {
  it("keeps a short line whole", () => {
    expect(wrapText("the quiet observer", 1000, measure)).toEqual(["the quiet observer"]);
  });

  it("breaks on the last word that fits", () => {
    // 100 units = 10 characters.
    expect(wrapText("one two three four", 100, measure)).toEqual(["one two", "three four"]);
  });

  it("gives an over-long word its own line rather than dropping or splitting it", () => {
    const out = wrapText("a supercalifragilistic b", 50, measure);
    expect(out).toContain("supercalifragilistic");
    expect(out.join(" ")).toBe("a supercalifragilistic b");
  });

  it("collapses whitespace and survives an empty string", () => {
    expect(wrapText("  a   b  ", 1000, measure)).toEqual(["a b"]);
    expect(wrapText("", 1000, measure)).toEqual([]);
  });
});

describe("fitEchoes (one row of columns)", () => {
  const echo = (label: string, value: string) => ({ label, value });
  const three = [echo("Element", "Void"), echo("Archetype", "The Sage"), echo("Mythic role", "Mentor")];

  it("fits all three on the square card alongside the Deep Dive distillation", () => {
    // The regression this layout exists for: stacked rows dropped every echo here.
    expect(fitEchoes(CARD_SPECS.square, 3, three, 636, measure)).toBe(3);
  });

  it("fits all three on the story card", () => {
    expect(fitEchoes(CARD_SPECS.story, 4, three, 900, measure)).toBe(3);
  });

  it("drops from the end when the columns are too wide, keeping Element", () => {
    const wide = [echo("Element", "A".repeat(30)), echo("Archetype", "B".repeat(30)), echo("Mythic role", "C".repeat(30))];
    const n = fitEchoes(CARD_SPECS.square, 0, wide, 600, measure);
    expect(n).toBeLessThan(3);
    expect(wide.slice(0, n).map((e) => e.label)[0] ?? "Element").toBe("Element");
  });

  it("returns zero when there is no vertical room left", () => {
    expect(fitEchoes(CARD_SPECS.square, 0, three, 1_000_000, measure)).toBe(0);
  });

  it("returns zero for no echoes", () => {
    expect(fitEchoes(CARD_SPECS.square, 0, [], 600, measure)).toBe(0);
  });

  it("never returns more than it was given", () => {
    expect(fitEchoes(CARD_SPECS.story, 0, three, 500, measure)).toBeLessThanOrEqual(3);
  });
});

describe("blockHeight / blockTop", () => {
  const counts = { epithetLines: 1, distillationLines: 3, hasEchoes: true };

  it("centres the block on the story card instead of leaving the lower half empty", () => {
    const h = blockHeight(CARD_SPECS.story, counts);
    const top = blockTop(CARD_SPECS.story, h);
    const bottomReserved = CARD_SPECS.story.pad + CARD_SPECS.story.markSize * 2;
    const above = top;
    const below = CARD_SPECS.story.height - bottomReserved - (top + h);
    // Equal margins above and below, within a pixel.
    expect(Math.abs(above - below)).toBeLessThan(1);
  });

  it("never pushes the block above the format's minimum top margin", () => {
    // A very tall block on the square card would otherwise centre to a negative top.
    const tall = blockHeight(CARD_SPECS.square, { ...counts, distillationLines: 20 });
    expect(blockTop(CARD_SPECS.square, tall)).toBe(CARD_SPECS.square.artTop);
  });

  it("grows with each additional distillation line", () => {
    const a = blockHeight(CARD_SPECS.square, { ...counts, distillationLines: 2 });
    const b = blockHeight(CARD_SPECS.square, { ...counts, distillationLines: 3 });
    expect(b).toBeGreaterThan(a);
  });

  it("is shorter without echoes", () => {
    const withEchoes = blockHeight(CARD_SPECS.square, counts);
    const without = blockHeight(CARD_SPECS.square, { ...counts, hasEchoes: false });
    expect(without).toBeLessThan(withEchoes);
  });
});
