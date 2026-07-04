import type { MatchResult } from "../engine";
import { AXIS_DEF_BY_CODE } from "../data/axes";
import type { ProseAnimal, ProsePayload } from "./types";

function animal(id: string, name: string, note: string, percent?: number): ProseAnimal {
  return percent === undefined ? { id, name, note } : { id, name, note, percent };
}

/** Turn an engine MatchResult into the compact summary the prose layer consumes. */
export function buildProsePayload(
  tier: { id: string; name: string },
  result: MatchResult,
): ProsePayload {
  return {
    tier: tier.name,
    long: tier.id === "soul-search",
    primary: animal(
      result.primary.archetype.id,
      result.primary.archetype.name,
      result.primary.archetype.note,
      result.split.primary,
    ),
    secondary: animal(
      result.secondary.archetype.id,
      result.secondary.archetype.name,
      result.secondary.archetype.note,
      result.split.secondary,
    ),
    alsoClose: result.alsoClose
      ? animal(
          result.alsoClose.archetype.id,
          result.alsoClose.archetype.name,
          result.alsoClose.archetype.note,
        )
      : null,
    standoutAxes: result.standoutAxes.map((s) => {
      const def = AXIS_DEF_BY_CODE[s.axis];
      return {
        axis: def.name,
        lean: s.value < 0 ? def.negLabel : def.posLabel,
        value: Number(s.value.toFixed(2)),
      };
    }),
    muddy: result.muddy,
  };
}
