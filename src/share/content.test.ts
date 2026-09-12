import { describe, expect, it } from "vitest";
import { buildCardContent } from "./content";
import { buildDeepReveal, buildReveal } from "../reveal";
import { TIERS } from "../tiers";
import type { Answers } from "../engine";

function result(tier: "speed-run" | "soul-search") {
  const answers: Answers = Object.fromEntries(TIERS[tier].questions.map((q) => [q.id, "a"]));
  return TIERS[tier].run(answers);
}

describe("share card content", () => {
  // The whole point of the filter: a card is a public artefact, and the tiered gate
  // has to survive being drawn onto one.
  it("Speed Run card carries only the revealed Element", () => {
    const c = buildCardContent("Owl", "the quiet observer", buildReveal("speed-run", result("speed-run")));
    expect(c.echoes.map((e) => e.label)).toEqual(["Element"]);
    expect(c.echoes.every((e) => e.value.length > 0)).toBe(true);
  });

  it("Soul Search card adds the Archetype but never the Mythic role", () => {
    const c = buildCardContent("Owl", "the quiet observer", buildReveal("soul-search", result("soul-search")));
    expect(c.echoes.map((e) => e.label)).toEqual(["Element", "Archetype"]);
  });

  it("Deep Dive card carries all three layers plus the distillation", () => {
    const c = buildCardContent("Owl", "the quiet observer", buildDeepReveal(result("soul-search")), [
      "You think before you move.",
      "You wait longer than the moment allows.",
    ]);
    expect(c.echoes.map((e) => e.label)).toEqual(["Element", "Archetype", "Mythic role"]);
    expect(c.lines).toHaveLength(2);
  });

  it("drops blank distillation lines and trims the rest", () => {
    const c = buildCardContent("Owl", "e", buildDeepReveal(result("soul-search")), [
      "  padded  ",
      "   ",
      "",
    ]);
    expect(c.lines).toEqual(["padded"]);
  });

  it("defaults to no lines, so Tier 1-2 cards cannot carry a reading", () => {
    const c = buildCardContent("Owl", "e", buildReveal("speed-run", result("speed-run")));
    expect(c.lines).toEqual([]);
  });
});
