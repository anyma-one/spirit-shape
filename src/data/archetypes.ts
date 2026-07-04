import type { Archetype, Vector } from "../engine/types";

// Vectors are written in canonical axis order: SOC, TMP, COG, BND, AUT, REC, NOV, EXP.
function v(
  SOC: number,
  TMP: number,
  COG: number,
  BND: number,
  AUT: number,
  REC: number,
  NOV: number,
  EXP: number,
): Vector {
  return { SOC, TMP, COG, BND, AUT, REC, NOV, EXP };
}

// Common animals — matched by Speed Run (Phase 1) and Soul Search (Phase 2).
// Vectors + character notes from the Phase 0 content library (section 3).
export const COMMON_ANIMALS: Archetype[] = [
  { id: "wolf", name: "Wolf", pool: "common", vector: v(0, -1, -1, 2, 1, 0, -1, 0), note: "Loyal strategist. Pack-functional rather than gregarious, protective of its circle, plans before it moves. Lead on commitment and discipline." },
  { id: "raven", name: "Raven", pool: "common", vector: v(-1, -1, -1, -1, 1, -1, 1, 2), note: "The melancholic intellectual. Engages with complexity for expression, not survival. Independent, watchful, drawn to the difficult. Lead on depth and originality." },
  { id: "coyote", name: "Coyote", pool: "common", vector: v(1, 2, 1, -1, 2, 0, 2, 1), note: "The reckless trickster. Fast, bold, breaks rules for the thrill, remakes the world and trips over his own appetite. Lead on impulsive, irreverent nerve." },
  { id: "owl", name: "Owl", pool: "common", vector: v(-2, -2, -1, 1, -1, -2, -1, 0), note: "The quiet observer. Reads everything before acting, self-contained, needs no audience. Lead on patience and inner certainty." },
  { id: "dolphin", name: "Dolphin", pool: "common", vector: v(2, 1, 1, -1, 0, 1, 0, 0), note: "The warm connector. Deeply social, intuitive, emotionally attuned, the one who draws people together. Lead on charisma and warmth." },
  { id: "bear", name: "Bear", pool: "common", vector: v(-1, -1, 0, 2, 1, -1, -1, -1), note: "The self-reliant force. Solitary, slow to rouse but immovable when boundaries are crossed. Lead on grounded strength." },
  { id: "fox", name: "Fox", pool: "common", vector: v(0, -1, 1, -1, -1, 0, 1, 1), note: "The careful schemer. Sly and calculating, plays the long game, outmanoeuvres rather than confronts. Lead on patient cunning." },
  { id: "lion", name: "Lion", pool: "common", vector: v(1, 0, 0, 2, 2, 2, -1, 0), note: "The natural authority. Confident, dominant, wants the spotlight and the recognition that comes with it. Lead on presence and leadership." },
  { id: "elephant", name: "Elephant", pool: "common", vector: v(2, -1, -1, -1, -1, 0, -1, 0), note: "The steady matriarch. Deeply social, long memory, protective of the herd, patient. Lead on loyalty and wisdom." },
  { id: "cat", name: "Cat", pool: "common", vector: v(-2, 0, 1, 2, 0, -2, 0, 0), note: "The sovereign individualist. Aloof, self-validating, indifferent to approval, strong personal boundaries. Lead on independence." },
  { id: "honeybee", name: "Honeybee", pool: "common", vector: v(2, 1, -2, 1, -2, -2, -2, -1), note: "The devoted collectivist. Lives for the system, tireless, structured, finds meaning in the whole over the self. Lead on diligence and belonging." },
  { id: "octopus", name: "Octopus", pool: "common", vector: v(-2, 1, 1, -2, -1, -1, 2, 1), note: "The shape-shifting problem-solver. Solitary, endlessly inventive, slips away rather than fights, reinvents constantly. Lead on adaptability and intelligence." },
  { id: "horse", name: "Horse", pool: "common", vector: v(1, 2, 0, -2, -2, 0, 1, 0), note: "The free spirit. Fast and restless, refuses to be fenced in, bolts from conflict rather than fighting it. All motion and open space. Lead on freedom and flight." },
  { id: "tortoise", name: "Tortoise", pool: "common", vector: v(-1, -2, -1, 2, -1, -1, -2, -2), note: "The patient endurer. Slow, deliberate, self-protective, plays the long game and outlasts. Lead on persistence and calm." },
  { id: "hawk", name: "Hawk", pool: "common", vector: v(-1, 2, -1, 1, 1, 0, 0, 0), note: "The decisive striker. Sharp-eyed, fast, precise, territorial, acts the moment the moment is right. Lead on focus and decisiveness." },
  { id: "hummingbird", name: "Hummingbird", pool: "common", vector: v(1, 2, 1, -1, -1, 1, 2, 2), note: "The bright spark. Vivid, joyful, restless, creative, light on its feet and quick to delight. Finds intensity in small things. Lead on vivid joy and creative energy." },
];

// Rare animals — Deep Dive only (Phase 3). Defined now so the matcher's pool
// filter is the only thing that gates them; no engine change needed later.
// Vectors + notes from spirit-animal-rare-animals.md.
export const RARE_ANIMALS: Archetype[] = [
  { id: "snow-leopard", name: "Snow Leopard", pool: "rare", vector: v(-2, -2, 1, 1, 0, -2, 1, 1), note: "The elusive wanderer. Solitary, patient, self-contained, quietly distinctive, roams far and answers to no one." },
  { id: "axolotl", name: "Axolotl", pool: "rare", vector: v(-1, -1, 1, -1, -2, -1, 1, 1), note: "The gentle regenerator. Open, unbothered, conflict-averse, a perpetual beginner who renews rather than hardens." },
  { id: "narwhal", name: "Narwhal", pool: "rare", vector: v(1, -1, 1, 0, -1, 1, 1, 1), note: "The enigmatic standout. Sociable yet mysterious, a one-of-a-kind in the pod, carries something no one else has." },
  { id: "lyrebird", name: "Lyrebird", pool: "rare", vector: v(1, 1, 1, -1, 0, 2, 2, 2), note: "The virtuoso. A mimic and performer of staggering range, needs the stage, endlessly inventive." },
  { id: "mantis-shrimp", name: "Mantis Shrimp", pool: "rare", vector: v(-1, 2, 1, 2, 2, 1, 1, 1), note: "The vivid striker. Explosive, intense, sees more than anyone and hits harder than its size suggests." },
  { id: "fennec-fox", name: "Fennec Fox", pool: "rare", vector: v(1, 2, 1, -1, -1, 1, 2, 1), note: "The nimble charmer. Hyper-alert, social, adaptable, light and quick on its feet." },
  { id: "cassowary", name: "Cassowary", pool: "rare", vector: v(-2, 1, -1, 2, 2, 0, -1, 1), note: "The fierce solitary. Striking, territorial, do-not-cross, ancient and unbothered by approval." },
  { id: "aye-aye", name: "Aye-aye", pool: "rare", vector: v(-2, 0, 2, -1, -1, -1, 2, 1), note: "The eccentric genius. Ingenious, misunderstood, solves problems no one else sees, comfortable being strange." },
  { id: "tardigrade", name: "Tardigrade", pool: "rare", vector: v(-1, -1, 0, 1, -1, -2, 0, -1), note: "The indestructible endurer. Survives anything, asks for nothing, outlasts every condition unseen." },
  { id: "kakapo", name: "Kakapo", pool: "rare", vector: v(1, -1, 1, -1, -1, 0, 1, 1), note: "The gentle eccentric. Quirky, trusting, friendly, rare and a little improbable." },
];

export const ALL_ANIMALS: Archetype[] = [...COMMON_ANIMALS, ...RARE_ANIMALS];

export const ANIMAL_BY_ID = Object.fromEntries(
  ALL_ANIMALS.map((a) => [a.id, a]),
) as Record<string, Archetype>;
