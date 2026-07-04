import { describe, expect, it } from "vitest";
import type { Vector } from "./engine";
import {
  computeSymbolicProfile,
  selectSymbol,
  elementForAnimal,
  ELEMENT_PIN,
  ELEMENTS,
  ARCHETYPES,
} from "./symbolic";
import { MYTHOLOGY } from "./data/mythology";
import { COMMON_ANIMALS } from "./data/archetypes";
import { TIERS } from "./tiers";
import { buildProsePayload } from "./prose/buildSummary";

function vec(partial: Partial<Vector>): Vector {
  return { SOC: 0, TMP: 0, COG: 0, BND: 0, AUT: 0, REC: 0, NOV: 0, EXP: 0, ...partial };
}

describe("symbolic profile selection", () => {
  it("maps a fast, confrontational profile to Fire / Mars / The Hero", () => {
    const p = computeSymbolicProfile(vec({ AUT: 2, TMP: 2 }));
    expect(p.element.name).toBe("Fire");
    expect(p.planet.name).toBe("Mars");
    expect(p.archetype.name).toBe("The Hero");
  });

  it("maps a withdrawn, self-validating, deliberate profile to Void / The Sage", () => {
    const p = computeSymbolicProfile(vec({ SOC: -2, REC: -2, TMP: -2 }));
    expect(p.element.name).toBe("Void");
    expect(p.archetype.name).toBe("The Sage");
  });

  it("is deterministic", () => {
    const v = vec({ SOC: 1, NOV: 1.5, EXP: 1 });
    expect(selectSymbol(v, ELEMENTS).name).toBe(selectSymbol(v, ELEMENTS).name);
    expect(selectSymbol(v, ARCHETYPES).name).toBe(selectSymbol(v, ARCHETYPES).name);
  });
});

describe("pinned Element (§3a)", () => {
  it("pins exactly the 16 common animals", () => {
    expect(Object.keys(ELEMENT_PIN).sort()).toEqual(COMMON_ANIMALS.map((a) => a.id).sort());
  });

  it("elementForAnimal returns the pinned value for every common animal", () => {
    for (const animal of COMMON_ANIMALS) {
      // Pass a deliberately blank vector: the pin must win regardless of the vector.
      expect(elementForAnimal(animal.id, vec({})).name, animal.id).toBe(ELEMENT_PIN[animal.id]);
    }
  });

  it("each pin equals what the rule derives from that animal's own vector (frozen, not divergent)", () => {
    for (const animal of COMMON_ANIMALS) {
      expect(selectSymbol(animal.vector, ELEMENTS).name, animal.id).toBe(ELEMENT_PIN[animal.id]);
    }
  });

  it("falls back to the rule for a non-pinned (rare) animal id", () => {
    const v = vec({ AUT: 2, TMP: 2 });
    expect(elementForAnimal("snow-leopard", v).name).toBe(selectSymbol(v, ELEMENTS).name);
  });
});

describe("mythology coverage", () => {
  it("has a Level 1 and Level 2 entry for every common animal", () => {
    for (const animal of COMMON_ANIMALS) {
      const entry = MYTHOLOGY[animal.id];
      expect(entry, `missing mythology for ${animal.id}`).toBeDefined();
      expect(entry.l1.length).toBeGreaterThan(0);
      expect(entry.l2.length).toBeGreaterThan(0);
    }
  });
});

describe("tier-aware prose length flag", () => {
  it("marks Soul Search long and Speed Run short", () => {
    const answers = Object.fromEntries(TIERS["speed-run"].questions.map((q) => [q.id, "a"]));
    const srPayload = buildProsePayload(TIERS["speed-run"], TIERS["speed-run"].run(answers));
    expect(srPayload.long).toBe(false);

    const ssAnswers = Object.fromEntries(TIERS["soul-search"].questions.map((q) => [q.id, "a"]));
    const ssPayload = buildProsePayload(TIERS["soul-search"], TIERS["soul-search"].run(ssAnswers));
    expect(ssPayload.long).toBe(true);
  });
});
