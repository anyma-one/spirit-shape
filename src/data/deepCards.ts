// Deep Dive (Tier 3) result cards: full-colour illustrated cards (832×1248 webp,
// transparent rounded corners), one per common animal, in public/cards/.
//
// Tier 3 only — the special reward for finishing the interview. Tiers 1-2 keep the
// tinted line-art masks (animalArt.ts). Keyed by archetype id; Tier 3 only ever
// nominates the 16 common animals, so every possible result has a card.
export const DEEP_CARDS: Record<string, string> = {
  bear: "bear.webp",
  cat: "cat.webp",
  coyote: "coyote.webp",
  dolphin: "dolphin.webp",
  elephant: "elephant.webp",
  fox: "fox.webp",
  hawk: "hawk.webp",
  honeybee: "honeybee.webp",
  horse: "horse.webp",
  hummingbird: "hummingbird.webp",
  lion: "lion.webp",
  octopus: "octopus.webp",
  owl: "owl.webp",
  raven: "raven.webp",
  tortoise: "tortoise.webp",
  wolf: "wolf.webp",
};

// Built from the build's base, like ANIMAL_ART_BASE, so the cards resolve at
// anyma.one/soul/ in the monorepo as well as at the root standalone.
export const DEEP_CARD_BASE = `${import.meta.env.BASE_URL}cards/`;

/** Public URL for an animal's Deep Dive card, or `null` if the id isn't mapped. */
export function deepCardUrl(id: string): string | null {
  const file = DEEP_CARDS[id];
  return file ? DEEP_CARD_BASE + file : null;
}

/**
 * Start fetching cards and resolve once they are decoded — or after `timeoutMs`,
 * whichever comes first, so a slow connection never holds up the result. Lets the
 * carousel's intro bloom reveal a painted card rather than an empty frame.
 */
export function preloadCards(urls: string[], timeoutMs = 2500): Promise<void> {
  const loads = urls.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
      }),
  );
  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
