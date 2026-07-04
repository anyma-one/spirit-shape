import type { AxisDef } from "../engine/types";

// The eight trait axes (Phase 0 content library, section 1).
// negLabel / posLabel are short human words used to ground prose in a specific
// axis lean ("you are decisive", "you restore alone") rather than jargon.
export const AXIS_DEFS: AxisDef[] = [
  {
    code: "SOC",
    name: "Social energy",
    negPole: "Solitary, restored by being alone",
    posPole: "Highly social, restored by others",
    negLabel: "solitary",
    posLabel: "sociable",
  },
  {
    code: "TMP",
    name: "Action tempo",
    negPole: "Observe first, deliberate, slow to act",
    posPole: "Acts fast, impulsive, decides in motion",
    negLabel: "deliberate",
    posLabel: "fast-moving",
  },
  {
    code: "COG",
    name: "Cognitive style",
    negPole: "Analytical, sequential, breaks things down",
    posPole: "Intuitive, holistic, reads the whole pattern",
    negLabel: "analytical",
    posLabel: "intuitive",
  },
  {
    code: "BND",
    name: "Boundaries and territory",
    negPole: "Fluid, open, few fixed lines",
    posPole: "Rigid, protective, strongly defended space",
    negLabel: "open",
    posLabel: "protective",
  },
  {
    code: "AUT",
    name: "Conflict and authority",
    negPole: "Avoidant, defers, keeps the peace",
    posPole: "Confrontational, questions authority directly",
    negLabel: "peace-keeping",
    posLabel: "confrontational",
  },
  {
    code: "REC",
    name: "Recognition",
    negPole: "Private mastery is enough, self-validating",
    posPole: "Needs to be witnessed, wants acknowledgement",
    negLabel: "self-validating",
    posLabel: "recognition-seeking",
  },
  {
    code: "NOV",
    name: "Novelty versus routine",
    negPole: "Stabiliser, thrives on routine and the known",
    posPole: "Explorer, driven by novelty, bored by routine",
    negLabel: "steady",
    posLabel: "novelty-seeking",
  },
  {
    code: "EXP",
    name: "Expressive drive",
    negPole: "Utilitarian, low need to create or express",
    posPole: "High need to externalise, create, perform",
    negLabel: "utilitarian",
    posLabel: "expressive",
  },
];

export const AXIS_DEF_BY_CODE = Object.fromEntries(
  AXIS_DEFS.map((a) => [a.code, a]),
) as Record<AxisDef["code"], AxisDef>;
