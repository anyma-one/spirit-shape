import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ANIMAL_ART, animalArtUrl } from "./animalArt";
import { COMMON_ANIMALS } from "./archetypes";

// Guard against filename typos and animal renames: every mapped file must exist
// in public/animals/, and every common animal must have a mapping.
const here = dirname(fileURLToPath(import.meta.url));
const publicAnimals = resolve(here, "../../public/animals");

describe("animal art assets", () => {
  it("has a real file for every one of the 16 mapped animals", () => {
    const missing = Object.entries(ANIMAL_ART)
      .filter(([, file]) => !existsSync(resolve(publicAnimals, file)))
      .map(([name, file]) => `${name} -> ${file}`);
    expect(missing, `Missing/misnamed animal art: ${missing.join(", ")}`).toEqual([]);
  });

  it("maps every common animal (no gaps if an animal is renamed)", () => {
    const unmapped = COMMON_ANIMALS.filter((a) => !ANIMAL_ART[a.name]).map((a) => a.name);
    expect(unmapped, `Common animals with no art: ${unmapped.join(", ")}`).toEqual([]);
    expect(Object.keys(ANIMAL_ART)).toHaveLength(COMMON_ANIMALS.length);
  });

  it("resolves to a /animals/ url and returns null for unknown names", () => {
    expect(animalArtUrl("Wolf")).toBe("/animals/anyma_wolf.png");
    expect(animalArtUrl("Nonexistent")).toBeNull();
  });
});
