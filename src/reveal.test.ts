import { describe, expect, it } from "vitest";
import { buildReveal } from "./reveal";
import type { RevealItem } from "./reveal";
import { TIERS } from "./tiers";
import type { Answers } from "./engine";

function run(tier: "speed-run" | "soul-search") {
  const answers: Answers = Object.fromEntries(TIERS[tier].questions.map((q) => [q.id, "a"]));
  return buildReveal(tier, TIERS[tier].run(answers));
}
const find = (items: RevealItem[], label: string) => items.find((i) => i.label === label)!;

describe("tiered reveal gate", () => {
  it("Speed Run: only Element revealed; Archetype + Mythic role locked", () => {
    const r = run("speed-run");
    expect(find(r.symbolic, "Element").value).not.toBeNull();
    expect(r.symbolic.find((i) => i.label === "Ruling planet")).toBeUndefined();

    const archetype = find(r.symbolic, "Archetype");
    expect(archetype.value).toBeNull(); // locked → never computed/sent
    expect(archetype.unlock?.tierId).toBe("soul-search");

    const role = find(r.symbolic, "Mythic role");
    expect(role.value).toBeNull();
    expect(role.unlock?.tierId).toBeNull(); // Deep Dive — not available yet
  });

  it("Speed Run mythology: only L1 revealed; L2 + L3 locked", () => {
    const r = run("speed-run");
    expect(r.mythologyParas).toHaveLength(1);
    expect(r.mythologyLocked.map((i) => i.label)).toEqual(["Deeper mythology", "The complete myth"]);
    expect(r.mythologyLocked[0].unlock?.tierId).toBe("soul-search");
    expect(r.mythologyLocked.every((i) => i.value === null)).toBe(true);
  });

  it("Soul Search: Archetype revealed; Mythic role still locked to Deep Dive", () => {
    const r = run("soul-search");
    expect(find(r.symbolic, "Archetype").value).not.toBeNull();
    expect(find(r.symbolic, "Mythic role").value).toBeNull();
    expect(find(r.symbolic, "Mythic role").unlock?.tierId).toBeNull();
  });

  it("Soul Search mythology: L1 + L2 revealed; only L3 locked", () => {
    const r = run("soul-search");
    expect(r.mythologyParas).toHaveLength(2);
    expect(r.mythologyLocked.map((i) => i.label)).toEqual(["The complete myth"]);
  });
});
