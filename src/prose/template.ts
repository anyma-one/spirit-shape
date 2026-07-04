import type { ProsePayload } from "./types";
import { PROFILES } from "../data/profiles";
import { SECONDARY_FLAVOUR, beatFor } from "../data/relationships";

// Deterministic reading, assembled from the per-animal profile content
// (spirit-animal-profiles-and-mythology-v1, §1). This is what the static app renders
// when no ANTHROPIC_API_KEY is set, and what the carousel uses for the non-primary
// animals (instant, so browse never waits). Grounded in the same content the LLM
// gets; the Drawn-to / Watch-for / Kin-and-rivals blocks and the Tier 3 tease are
// rendered separately by Results, not folded into this narrative.
//
// Tier 1 (Speed Run, !long): short core + a one-sentence secondary connection.
// Tier 2 (Soul Search, long): two-paragraph core + a secondary connection paragraph
// + a tertiary trace when one is close.

// Beats are lowercase noun-phrase fragments; frame them by relationship type.
const REL_LEAD: Record<"ally" | "rival" | "opposite", string> = {
  ally: "The old stories make them allies:",
  rival: "The old stories make them rivals:",
  opposite: "The old stories set them as opposites:",
};

function muddyLead(): string {
  return (
    "Your answers sit close to the middle, so read this as the closest match so far " +
    "rather than a locked verdict — the kind of profile a deeper tier is built to sharpen."
  );
}

function tier1(p: ProsePayload): string[] {
  const prof = PROFILES[p.primary.id];
  if (!prof) return [muddyLead()]; // rare-animal safety; not reachable in Tiers 1-2

  const core = p.muddy ? `${muddyLead()} ${prof.tier1Core}` : prof.tier1Core;
  const paras = [core];

  const secFlavour = SECONDARY_FLAVOUR[p.secondary.id];
  if (secFlavour) {
    paras.push(
      `Your ${p.secondary.name} side adds ${secFlavour}, threading through your ${prof.coreNoun}.`,
    );
  }
  return paras;
}

function tier2(p: ProsePayload): string[] {
  const prof = PROFILES[p.primary.id];
  if (!prof) return [muddyLead()];

  const [c1, c2] = prof.tier2Core;
  const paras = [p.muddy ? `${muddyLead()} ${c1}` : c1, c2];

  // Secondary connection paragraph: flavour + relational beat (if the pair is
  // connected in the graph) + a line on how the blend behaves.
  const secFlavour = SECONDARY_FLAVOUR[p.secondary.id];
  if (secFlavour) {
    const parts = [`Your ${p.secondary.name} connection adds ${secFlavour}.`];
    const beat = beatFor(p.primary.id, p.secondary.id);
    if (beat) parts.push(`${REL_LEAD[beat.type]} ${beat.text}`);
    parts.push(
      `In you, your ${prof.coreNoun} stays in the lead, and the ${p.secondary.name} colours how it shows up rather than what it is.`,
    );
    paras.push(parts.join(" "));
  }

  // Tertiary trace: one soft-lead sentence.
  if (p.alsoClose) {
    const terFlavour = SECONDARY_FLAVOUR[p.alsoClose.id];
    if (terFlavour) paras.push(`A trace of ${p.alsoClose.name} runs underneath as well: ${terFlavour}.`);
  }
  return paras;
}

/** Build a grounded reading without an LLM. */
export function templateProse(p: ProsePayload): string {
  const paras = p.long ? tier2(p) : tier1(p);
  return paras.join("\n\n");
}
