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
//   Mythic role    locked → T3 at T1/T2; revealed at T3
//   Mythology L1   revealed at all tiers
//   Mythology L2   locked → T2 at T1; revealed at T2+
//   Mythology L3   locked → T3 at T1/T2; see the rank-3 note below
import type { MatchResult } from "./engine";
import type { TierId } from "./data/copy";
import { ARCHETYPES, ROLES, selectSymbol, elementForAnimal } from "./symbolic";
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

/**
 * Reveal depth. 1 = Speed Run, 2 = Soul Search, 3 = Deep Dive. Kept separate from
 * `TierId` on purpose: Tier 3 is not a quiz tier (it has no questions, no TierDef,
 * no entry in TIERS/TIER_COPY/TIER_ORDER), so it gets a rank rather than a
 * `TierId` member — which would force fake question-bearing entries into every
 * `Record<TierId, …>` in the app.
 */
type RevealRank = 1 | 2 | 3;

const TIER_RANK: Record<TierId, RevealRank> = { "speed-run": 1, "soul-search": 2 };
const SOUL: Unlock = { tierId: "soul-search", label: "Soul Search" };
const DEEP: Unlock = { tierId: null, label: "Deep Dive" }; // Tier 3 has no TierId

const revealed = (label: string, value: string, note?: string): RevealItem => ({
  label,
  value,
  note,
  unlock: null,
});
const locked = (label: string, unlock: Unlock): RevealItem => ({ label, value: null, unlock });

/** Tiers 1-2 (the quiz tiers). Behaviour is unchanged from the original gate. */
export function buildReveal(tierId: TierId, result: MatchResult): RevealModel {
  return buildRevealAtRank(TIER_RANK[tierId], result);
}

/**
 * Tier 3 (Deep Dive) — the top of the funnel, so nothing is locked. Reveals the
 * Mythic role and Archetype alongside Element, and the full mythology the data
 * actually holds.
 *
 * NOTE on "The complete myth": Tiers 1-2 advertise a Mythology L3 unlocking here, and
 * as of 2026-07-27 that promise is paid - all 16 commons have `l3` text, rendered as
 * the third mythology paragraph. Rank 3 still reveals whatever the data actually holds
 * (L3 is optional on `MythEntry`, for the rare animals), and carries no locked stub
 * because there is no tier above to climb to.
 */
export function buildDeepReveal(result: MatchResult): RevealModel {
  return buildRevealAtRank(3, result);
}

function buildRevealAtRank(rank: RevealRank, result: MatchResult): RevealModel {
  const v = result.vector;

  // Element is pinned to the matched (primary) animal (§3a); Archetype and Mythic
  // role stay derived from the user's trait vector.
  const element = elementForAnimal(result.primary.archetype.id, v);
  const archetype = selectSymbol(v, ARCHETYPES);
  const symbolic: RevealItem[] = [
    revealed("Element", element.name, element.explanation),
    rank >= 2
      ? revealed("Archetype", archetype.name, archetype.explanation)
      : locked("Archetype", SOUL),
    // Mythic role is the Tier 3 layer. Below rank 3 its value is NOT computed.
    rank >= 3
      ? (() => {
          const role = selectSymbol(v, ROLES);
          return revealed("Mythic role", role.name, role.explanation);
        })()
      : locked("Mythic role", DEEP),
  ];

  const entry = MYTHOLOGY[result.primary.archetype.id];
  const l2Revealed = rank >= 2;
  // L1 always; L2 from rank 2; L3 at rank 3 only, and only where it has been written
  // (no animal carries it today - see buildDeepReveal).
  const mythologyParas: string[] = [];
  if (entry) {
    mythologyParas.push(entry.l1);
    if (l2Revealed) mythologyParas.push(entry.l2);
    if (rank >= 3 && entry.l3) mythologyParas.push(entry.l3);
  }
  // "The older myth" beat unfolds with L2, after it and before the disclaimer, on the
  // 13 animals that carry one.
  const mythologyOlderMyth = entry && l2Revealed ? entry.olderMyth ?? null : null;
  // §7: the disclaimer rides with L2, where native names first appear. L1 (Speed
  // Run) carries no native names, so it shows no disclaimer.
  const mythologyDisclaimer = entry && l2Revealed ? MYTHOLOGY_NATIVE_NAME_DISCLAIMER : null;

  const mythologyLocked: RevealItem[] = [];
  if (rank < 2) mythologyLocked.push(locked("Deeper mythology", SOUL));
  // At rank 3 there is no tier above to climb to, and no L3 text to reveal (see
  // buildDeepReveal), so the stub is dropped rather than left dangling.
  if (rank < 3) mythologyLocked.push(locked("The complete myth", DEEP));

  return { symbolic, mythologyParas, mythologyOlderMyth, mythologyDisclaimer, mythologyLocked };
}
