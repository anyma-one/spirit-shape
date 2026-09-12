// Builds the card's content from the tiered reveal model.
//
// LOAD-BEARING: the card must never show a layer the reader has not unlocked. A
// Speed Run card that leaked the Archetype would hand away the reason to take the
// Soul Search, and a locked layer is deliberately never even computed (reveal.ts).
// Filtering on `value !== null` is what keeps the share path honest.

import type { RevealModel } from "../reveal";
import type { CardContent } from "./cardLayout";

export function buildCardContent(
  animalName: string,
  epithet: string,
  reveal: RevealModel,
  /** The Deep Dive's distillation lines; omit for Tiers 1-2. */
  lines: string[] = [],
): CardContent {
  return {
    animalName,
    epithet,
    echoes: reveal.symbolic
      .filter((item) => item.value !== null)
      .map((item) => ({ label: item.label, value: item.value as string })),
    lines: lines.map((l) => l.trim()).filter(Boolean),
  };
}
