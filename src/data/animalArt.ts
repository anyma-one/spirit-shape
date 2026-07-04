// Result-screen animal artwork: light-cyan line-art PNGs (1024×1024, transparent),
// one per common animal, in public/animals/ (served at /animals/ by Vite).
//
// Filenames are an EXPLICIT map keyed by archetype name — never derived from the
// name — so a typo surfaces here (and in animalArt.test.ts) instead of failing
// silently at render time. Keys must match COMMON_ANIMALS[].name in archetypes.ts.
export const ANIMAL_ART: Record<string, string> = {
  Wolf: "anyma_wolf.png",
  Raven: "anyma_raven.png",
  Coyote: "anyma_coyote.png",
  Owl: "anyma_owl.png",
  Dolphin: "anyma_dolphin.png",
  Bear: "anyma_bear.png",
  Fox: "anyma_fox.png",
  Lion: "anyma_lion.png",
  Elephant: "anyma_elephant.png",
  Cat: "anyma_cat.png",
  Honeybee: "anyma_honeybee.png",
  Octopus: "anyma_octopus.png",
  Horse: "anyma_horse.png",
  Tortoise: "anyma_tortoise.png",
  Hawk: "anyma_hawk.png",
  Hummingbird: "anyma_hummingbird.png",
};

export const ANIMAL_ART_BASE = "/animals/";

/** Public URL for an animal's line-art, or `null` if the name isn't mapped. */
export function animalArtUrl(name: string): string | null {
  const file = ANIMAL_ART[name];
  return file ? ANIMAL_ART_BASE + file : null;
}
