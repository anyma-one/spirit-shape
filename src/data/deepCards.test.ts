import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DEEP_CARDS, deepCardUrl } from "./deepCards";
import { COMMON_ANIMALS } from "./archetypes";

// Every animal the Deep Dive can name must have a card on disk.
const here = dirname(fileURLToPath(import.meta.url));
const publicCards = resolve(here, "../../public/cards");

describe("Deep Dive cards", () => {
  it("has a real file for every mapped card", () => {
    const missing = Object.entries(DEEP_CARDS)
      .filter(([, file]) => !existsSync(resolve(publicCards, file)))
      .map(([id, file]) => `${id} -> ${file}`);
    expect(missing, `Missing card files: ${missing.join(", ")}`).toEqual([]);
  });

  it("maps every common animal (the only ones Tier 3 can nominate)", () => {
    const unmapped = COMMON_ANIMALS.filter((a) => !DEEP_CARDS[a.id]).map((a) => a.id);
    expect(unmapped, `Common animals with no card: ${unmapped.join(", ")}`).toEqual([]);
    expect(Object.keys(DEEP_CARDS)).toHaveLength(COMMON_ANIMALS.length);
  });

  it("resolves to a /cards/ url and returns null for unknown ids", () => {
    expect(deepCardUrl("owl")).toBe("/cards/owl.webp");
    expect(deepCardUrl("unicorn")).toBeNull();
  });
});
