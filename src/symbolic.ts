// Symbolic profile layer (spirit-animal-symbolic-profile-v0.3). Display-only,
// computed purely from the user's eight-axis vector — no per-animal content, no
// engine change. One set per user. Mythic role data is included for Tier 3
// (Deep Dive) but is NOT shown at Tier 1/2 per the reveal ladder (§7).
import { AXES, mostExtremeAxis } from "./engine";
import type { Axis, Vector } from "./engine";

// §1 framing line, shown above the values.
export const SYMBOLIC_FRAMING =
  "A symbolic reading of your result — some of it carried by your spirit shape, some read " +
  "from your own trait leans. Patterns to play with, not a fortune to live by.";

/** A signature: axes with direction (+1 / -1). Coefficients are uniform (§2). */
type Signature = Partial<Record<Axis, 1 | -1>>;

export interface SymbolEntry {
  name: string;
  signature: Signature;
  /** Only Mythic roles carry an explanation (§5). */
  explanation?: string;
}

// §3 Element (explanation reads the element back to the trait leans behind it)
export const ELEMENTS: SymbolEntry[] = [
  { name: "Fire", signature: { TMP: 1, AUT: 1, EXP: 1 }, explanation: "Quick, confrontational, and creative — you move first and make the sparks." },
  { name: "Water", signature: { SOC: 1, COG: 1, BND: -1 }, explanation: "Social, intuitive, and open — you flow toward people and read the room." },
  { name: "Earth", signature: { BND: 1, NOV: -1, TMP: -1 }, explanation: "Grounded, steady, and guarded — you hold your place and keep your own counsel." },
  { name: "Wind", signature: { NOV: 1, COG: 1, SOC: 1 }, explanation: "Restless, intuitive, and sociable — you chase the new and carry it to others." },
  { name: "Metal", signature: { COG: -1, BND: 1, AUT: 1 }, explanation: "Precise, guarded, and unyielding — you decide by logic and hold the line." },
  { name: "Wood", signature: { EXP: 1, NOV: 1 }, explanation: "Generative and exploratory — you grow by making things and trying them." },
  { name: "Void", signature: { SOC: -1, REC: -1, TMP: -1 }, explanation: "Withdrawn, private, and unhurried — the still, self-contained one." },
];

// §4 Ruling planet
export const PLANETS: SymbolEntry[] = [
  { name: "Sun", signature: { REC: 1, AUT: 1 } },
  { name: "Moon", signature: { SOC: -1, REC: -1, COG: 1 } },
  { name: "Mars", signature: { AUT: 1, TMP: 1 } },
  { name: "Mercury", signature: { COG: 1, EXP: 1, SOC: 1 } },
  { name: "Jupiter", signature: { NOV: 1, SOC: 1 } },
  { name: "Venus", signature: { SOC: 1, EXP: 1, AUT: -1 } },
  { name: "Saturn", signature: { BND: 1, NOV: -1, TMP: -1 } },
];

// §5 Mythic role (Tier 3 only — kept here for the Deep Dive, not rendered yet)
export const ROLES: SymbolEntry[] = [
  { name: "Hero", signature: { AUT: 1, TMP: 1, NOV: 1 }, explanation: "The one who acts, who runs at the thing everyone else hesitates before." },
  { name: "Mentor", signature: { SOC: -1, REC: -1, TMP: -1, COG: -1 }, explanation: "The quiet guide whose knowing comes from stepping back and watching long." },
  { name: "Trickster", signature: { COG: 1, NOV: 1, BND: -1, EXP: 1 }, explanation: "The clever rule-bender who wins by wit and angle rather than force." },
  { name: "Guardian", signature: { BND: 1, AUT: 1, NOV: -1 }, explanation: "The protector who holds the line and keeps what matters safe." },
  { name: "Shapeshifter", signature: { BND: -1, NOV: 1, COG: 1 }, explanation: "The fluid one who slips between forms and is never quite pinned down." },
  { name: "Herald", signature: { SOC: 1, NOV: 1, EXP: 1 }, explanation: "The one who calls others toward the new, the spark and the announcement." },
];

// §6 Archetype (the twelve, shown as the name alone — no "Jungian" framing)
export const ARCHETYPES: SymbolEntry[] = [
  { name: "The Hero", signature: { AUT: 1, TMP: 1 }, explanation: "You act first and run at what others hesitate before." },
  { name: "The Sage", signature: { COG: -1, SOC: -1, TMP: -1 }, explanation: "You know by watching and thinking it all the way through." },
  { name: "The Explorer", signature: { NOV: 1, SOC: -1 }, explanation: "A solitary seeker, always drawn toward the next horizon." },
  { name: "The Creator", signature: { EXP: 1, NOV: 1 }, explanation: "You'd rather build something new than use what's already there." },
  { name: "The Ruler", signature: { AUT: 1, REC: 1, BND: 1 }, explanation: "You take charge — and you want the results to be seen." },
  { name: "The Rebel", signature: { AUT: 1, BND: -1, NOV: 1 }, explanation: "The rule-breaker who won't be fenced in." },
  { name: "The Caregiver", signature: { SOC: 1, AUT: -1 }, explanation: "You tend to others, often before yourself." },
  { name: "The Lover", signature: { SOC: 1, EXP: 1 }, explanation: "Drawn to connection and beauty — all feeling and expression." },
  { name: "The Jester", signature: { EXP: 1, SOC: 1, NOV: 1 }, explanation: "The playful spark who keeps the room light." },
  { name: "The Magician", signature: { COG: 1, EXP: 1, NOV: 1 }, explanation: "You transform things by insight, turning ideas into something more." },
  { name: "The Everyman", signature: { SOC: 1, AUT: -1, NOV: -1 }, explanation: "Steady and relatable — you fit in and keep the peace." },
  { name: "The Innocent", signature: { NOV: -1, AUT: -1, BND: -1 }, explanation: "Open and trusting, you want life simple and good." },
];

function scoreSignature(vector: Vector, sig: Signature): number {
  let sum = 0;
  for (const axis of AXES) {
    const coef = sig[axis];
    if (coef !== undefined) sum += coef * vector[axis];
  }
  return sum;
}

/**
 * §2 selection rule: highest summed score wins. Ties break toward the candidate
 * whose signature includes the user's most extreme axis, then by table order
 * (so selection is fully deterministic).
 */
export function selectSymbol(vector: Vector, candidates: SymbolEntry[]): SymbolEntry {
  const extreme = mostExtremeAxis(vector);
  const EPS = 1e-9;
  let best = candidates[0];
  let bestScore = scoreSignature(vector, best.signature);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const s = scoreSignature(vector, c.signature);
    if (s > bestScore + EPS) {
      best = c;
      bestScore = s;
    } else if (Math.abs(s - bestScore) <= EPS) {
      const cHasExtreme = c.signature[extreme] !== undefined;
      const bestHasExtreme = best.signature[extreme] !== undefined;
      if (cHasExtreme && !bestHasExtreme) {
        best = c;
        bestScore = s;
      }
    }
  }
  return best;
}

// §3a Pinned Element (override). For the 16 common animals the Element is FIXED to
// this table and overrides the computed value, so no future vector tweak can flip a
// user-visible label. The selection rule above stays the derivation of record and
// still applies to the rare animals (no pins). Every pinned value equals what the
// rule currently derives; the pin just freezes it. Distribution: Earth 4, Water 4,
// Void 2, Wood 2, Fire 2, Wind 1, Metal 1.
export const ELEMENT_PIN: Record<string, string> = {
  wolf: "Earth",
  raven: "Wood",
  coyote: "Fire",
  owl: "Void",
  dolphin: "Water",
  bear: "Earth",
  fox: "Water",
  lion: "Metal",
  elephant: "Water",
  cat: "Void",
  honeybee: "Earth",
  octopus: "Wood",
  horse: "Water",
  tortoise: "Earth",
  hawk: "Fire",
  hummingbird: "Wind",
};

const ELEMENT_BY_NAME: Record<string, SymbolEntry> = Object.fromEntries(
  ELEMENTS.map((e) => [e.name, e]),
);

/**
 * The Element for a result, pinned to the matched animal (§3a) for the 16 common
 * animals and derived from the vector by the rule for anything else (rare animals).
 */
export function elementForAnimal(animalId: string, vector: Vector): SymbolEntry {
  const pinned = ELEMENT_PIN[animalId];
  return pinned ? ELEMENT_BY_NAME[pinned] : selectSymbol(vector, ELEMENTS);
}

export interface SymbolicProfile {
  element: SymbolEntry;
  archetype: SymbolEntry;
  planet: SymbolEntry;
  role: SymbolEntry; // Tier 3 only
}

/** Compute the full symbolic profile from a trait vector. */
export function computeSymbolicProfile(vector: Vector): SymbolicProfile {
  return {
    element: selectSymbol(vector, ELEMENTS),
    archetype: selectSymbol(vector, ARCHETYPES),
    planet: selectSymbol(vector, PLANETS),
    role: selectSymbol(vector, ROLES),
  };
}
