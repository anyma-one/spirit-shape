// Tiered reveal gate (patch: tiered-blur). Decides, per tier, which result layers
// are revealed (value computed + shown) and which are locked (a stub with a label
// + unlock target, NO value). Locked symbolic values are deliberately NOT computed
// here, and locked mythology text is omitted — so locked content never enters the
// rendered result.
//
// This is the single gating seam: when result computation moves behind a real
// backend, this function moves server-side unchanged and the client only ever
// receives the gated model. (Today, in the static client-side app, the underlying
// selectors/data still live in the bundle — see the README note on this patch.)
//
// Reveal/lock map (Tier 1 = Speed Run, Tier 2 = Soul Search, Tier 3 = Deep Dive):
//   Element        revealed at all tiers
//   Archetype      locked → T2 at T1; revealed at T2+
//   Mythic role    locked → T3 always (Deep Dive only)
//   Mythology L1   revealed at all tiers
//   Mythology L2   locked → T2 at T1; revealed at T2+
//   Mythology L3   locked → T3 always (Deep Dive only)
import type { MatchResult } from "./engine";
import type { TierId } from "./data/copy";
import { ARCHETYPES, selectSymbol, elementForAnimal } from "./symbolic";
import { MYTHOLOGY, MYTHOLOGY_NATIVE_NAME_DISCLAIMER } from "./data/mythology";

export interface Unlock {
  /** Tier to climb to, or null when that tier isn't available yet (Deep Dive). */
  tierId: TierId | null;
  label: string; // "Soul Search" | "Deep Dive"
}

export interface RevealItem {
  label: string;
  /** Revealed value, or null when locked. */
  value: string | null;
  /** Short interpretation for a revealed value (reads it back to the trait leans). */
  note?: string;
  /** Present only when locked. */
  unlock: Unlock | null;
}

export interface RevealModel {
  symbolic: RevealItem[];
  /** Revealed mythology paragraphs (L1, then L2 once unlocked). */
  mythologyParas: string[];
  /** "The older myth" beat, revealed with L2 where the animal has one (else null). */
  mythologyOlderMyth: string | null;
  /** Native-name disclaimer (§7), present only once L2 (with native names) is revealed. */
  mythologyDisclaimer: string | null;
  /** Locked higher mythology levels. */
  mythologyLocked: RevealItem[];
}

const TIER_RANK: Record<TierId, number> = { "speed-run": 1, "soul-search": 2 };
const SOUL: Unlock = { tierId: "soul-search", label: "Soul Search" };
const DEEP: Unlock = { tierId: null, label: "Deep Dive" }; // Tier 3, not built yet

const revealed = (label: string, value: string, note?: string): RevealItem => ({
  label,
  value,
  note,
  unlock: null,
});
const locked = (label: string, unlock: Unlock): RevealItem => ({ label, value: null, unlock });

export function buildReveal(tierId: TierId, result: MatchResult): RevealModel {
  const rank = TIER_RANK[tierId];
  const v = result.vector;

  // Element is pinned to the matched (primary) animal (§3a); Archetype stays derived
  // from the user's trait vector.
  const element = elementForAnimal(result.primary.archetype.id, v);
  const archetype = selectSymbol(v, ARCHETYPES);
  const symbolic: RevealItem[] = [
    revealed("Element", element.name, element.explanation),
    rank >= 2
      ? revealed("Archetype", archetype.name, archetype.explanation)
      : locked("Archetype", SOUL),
    // Mythic role is a Tier 3 layer — always locked here. Its value is NOT computed.
    locked("Mythic role", DEEP),
  ];

  const entry = MYTHOLOGY[result.primary.archetype.id];
  const l2Revealed = rank >= 2;
  const mythologyParas = entry ? (l2Revealed ? [entry.l1, entry.l2] : [entry.l1]) : [];
  // "The older myth" beat unfolds with L2, after it and before the disclaimer, on the
  // 13 animals that carry one.
  const mythologyOlderMyth = entry && l2Revealed ? entry.olderMyth ?? null : null;
  // §7: the disclaimer rides with L2, where native names first appear. L1 (Speed
  // Run) carries no native names, so it shows no disclaimer.
  const mythologyDisclaimer = entry && l2Revealed ? MYTHOLOGY_NATIVE_NAME_DISCLAIMER : null;

  const mythologyLocked: RevealItem[] = [];
  if (rank < 2) mythologyLocked.push(locked("Deeper mythology", SOUL));
  mythologyLocked.push(locked("The complete myth", DEEP));

  return { symbolic, mythologyParas, mythologyOlderMyth, mythologyDisclaimer, mythologyLocked };
}
