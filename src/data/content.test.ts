import { describe, expect, it } from "vitest";
import { COMMON_ANIMALS } from "./archetypes";
import { PROFILES } from "./profiles";
import { GRAPH, SECONDARY_FLAVOUR, BEATS, beatFor, pairKey } from "./relationships";
import { MYTHOLOGY } from "./mythology";

// Content coverage + integrity for profiles-and-mythology-v1. These guard that the
// per-animal content stays complete and the relationship graph stays symmetric —
// the app assembles readings from these primitives, so a gap would render blank.

const IDS = COMMON_ANIMALS.map((a) => a.id);
const REL_KEYS = ["allies", "rivals", "opposites"] as const;

describe("profiles (§4)", () => {
  it("covers every common animal with non-empty fields", () => {
    for (const id of IDS) {
      const p = PROFILES[id];
      expect(p, id).toBeDefined();
      expect(p.epithet.length, id).toBeGreaterThan(0);
      expect(p.coreNoun.length, id).toBeGreaterThan(0);
      expect(p.tier1Core.length, id).toBeGreaterThan(0);
      expect(p.tier2Core).toHaveLength(2);
      expect(p.tier2Core[0].length && p.tier2Core[1].length, id).toBeGreaterThan(0);
      expect(p.drawnTo.length, id).toBeGreaterThan(0);
      expect(p.watchFor.length, id).toBeGreaterThan(0);
      expect(p.kinAndRivals.length, id).toBeGreaterThan(0);
      expect(p.tease.length, id).toBeGreaterThan(0);
    }
  });

  it("has no entries for animals outside the common set", () => {
    expect(Object.keys(PROFILES).sort()).toEqual([...IDS].sort());
  });
});

describe("relationship graph (§3)", () => {
  it("gives every common animal exactly four connections", () => {
    for (const id of IDS) {
      const r = GRAPH[id];
      expect(r, id).toBeDefined();
      const total = r.allies.length + r.rivals.length + r.opposites.length;
      expect(total, id).toBe(4);
    }
  });

  it("is symmetric: every A->B connection has the matching B->A of the same type", () => {
    for (const id of IDS) {
      for (const key of REL_KEYS) {
        for (const other of GRAPH[id][key]) {
          expect(GRAPH[other], `${other} referenced by ${id}`).toBeDefined();
          expect(GRAPH[other][key], `${id}<->${other} (${key})`).toContain(id);
        }
      }
    }
  });
});

describe("secondary flavour (§5)", () => {
  it("covers exactly the common set with non-empty descriptors", () => {
    expect(Object.keys(SECONDARY_FLAVOUR).sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(SECONDARY_FLAVOUR[id].length, id).toBeGreaterThan(0);
  });
});

describe("relational beats (§6)", () => {
  it("has exactly one beat per graph edge, and the beat type matches the edge", () => {
    // Collect unique undirected edges with their type from the graph.
    const edges = new Map<string, "ally" | "rival" | "opposite">();
    const typeOf = { allies: "ally", rivals: "rival", opposites: "opposite" } as const;
    for (const id of IDS) {
      for (const key of REL_KEYS) {
        for (const other of GRAPH[id][key]) edges.set(pairKey(id, other), typeOf[key]);
      }
    }
    // 16 animals * 4 connections / 2 = 32 undirected edges.
    expect(edges.size).toBe(32);
    expect(Object.keys(BEATS)).toHaveLength(32);

    for (const [key, type] of edges) {
      const beat = BEATS[key];
      expect(beat, key).toBeDefined();
      expect(beat.type, key).toBe(type);
      expect(beat.text.length, key).toBeGreaterThan(0);
    }
  });

  it("beatFor is order-independent and returns null for unconnected pairs", () => {
    expect(beatFor("wolf", "raven")).toEqual(beatFor("raven", "wolf"));
    expect(beatFor("wolf", "raven")).not.toBeNull();
    // Wolf and Octopus are not connected in the graph.
    expect(beatFor("wolf", "octopus")).toBeNull();
  });
});

describe("mythology (§4/§7)", () => {
  it("covers every common animal with L1 and L2", () => {
    for (const id of IDS) {
      const m = MYTHOLOGY[id];
      expect(m, id).toBeDefined();
      expect(m.l1.length, id).toBeGreaterThan(0);
      expect(m.l2.length, id).toBeGreaterThan(0);
    }
  });

  // Reconciliation patch: "The older myth" beat is on 13 animals, absent on 3 by the
  // valence gate (Dolphin, Elephant, Horse) where the older story would deflate.
  it("carries the older-myth beat on exactly 13 animals, absent on Dolphin/Elephant/Horse", () => {
    const WITHOUT = ["dolphin", "elephant", "horse"];
    const withBeat = IDS.filter((id) => MYTHOLOGY[id].olderMyth);
    expect(withBeat).toHaveLength(13);
    for (const id of IDS) {
      const has = Boolean(MYTHOLOGY[id].olderMyth);
      expect(has, id).toBe(!WITHOUT.includes(id));
      if (has) expect(MYTHOLOGY[id].olderMyth!.length, id).toBeGreaterThan(0);
    }
  });
});
