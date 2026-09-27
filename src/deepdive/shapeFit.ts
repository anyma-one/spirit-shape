// Deep Dive (Tier 3) — where the chosen shape fits the person, and where it does not.
//
// The report has a section on where the animal does NOT fit. Left to the model, that
// section and "At your core" could claim opposite things about the same trait. So the
// split is made HERE, deterministically, and handed to the report as two disjoint
// lists: the core may build the animal only from `fits`, the new section may discuss
// only `departures`. No trait can land in both, so the two cannot contradict.
//
// Pure and unit-tested. Scores are the extracted -2..+2 axis scores; animal vectors
// are the Tier-3 library (Dolphin NOV +1 included).

import { AXIS_DEF_BY_CODE } from "../data/axes";
import type { Axis } from "../engine/types";
import { TIER3_ANIMALS } from "./library";
import type { AxisEntry } from "./pipeline";

/** A trait where the shape takes a position and the person matches it. */
export interface FitTrait {
  trait: string; // plain-language trait name, e.g. "Conflict and authority"
  theirs: string; // where the person sits, in words
  shape: string; // where the animal sits, in words
}

/** A trait where the shape takes a clear position and the person departs from it. */
export interface Departure extends FitTrait {
  /** The second-nature animal's name when it sits where the person does, else null. */
  carriedBy: string | null;
}

export interface ShapeFit {
  fits: FitTrait[];
  departures: Departure[];
}

/** Two points apart on the -2..+2 scale (e.g. -1 vs +1) is a real departure. */
export const DEPARTURE_GAP = 2;
/** At most this many departures reach the report — the strongest first. */
export const MAX_DEPARTURES = 3;

function describe(code: Axis, score: number): string {
  const def = AXIS_DEF_BY_CODE[code];
  if (score === 0) return "in the middle, neither pole";
  const pole = score < 0 ? def.negPole : def.posPole;
  return `${Math.abs(score) >= 2 ? "strongly" : "leans"}: ${pole}`;
}

export function shapeFit(axes: AxisEntry[], winnerId: string, runnerUpId: string): ShapeFit {
  const winner = TIER3_ANIMALS.find((a) => a.id === winnerId);
  const runnerUp = TIER3_ANIMALS.find((a) => a.id === runnerUpId);
  if (!winner) return { fits: [], departures: [] };

  const fits: FitTrait[] = [];
  const departures: (Departure & { gap: number; high: boolean })[] = [];

  for (const entry of axes) {
    const code = entry.code as Axis;
    if (!(code in winner.vector)) continue;
    // A low-confidence score is too thin to claim either a fit or a departure.
    if (entry.confidence === "low") continue;
    const person = entry.score;
    const shape = winner.vector[code];
    // Where the shape is neutral it defines nothing, so there is nothing to fit or
    // depart from; the reading may still describe the person there freely.
    if (shape === 0) continue;

    const gap = Math.abs(person - shape);
    const trait = {
      trait: AXIS_DEF_BY_CODE[code].name,
      theirs: describe(code, person),
      shape: describe(code, shape),
    };
    if (gap < DEPARTURE_GAP) {
      fits.push(trait);
      continue;
    }
    const second = runnerUp?.vector[code] ?? 0;
    departures.push({
      ...trait,
      carriedBy: runnerUp && second !== 0 && Math.abs(person - second) < DEPARTURE_GAP ? runnerUp.name : null,
      gap,
      high: entry.confidence === "high",
    });
  }

  departures.sort((a, b) => b.gap - a.gap || Number(b.high) - Number(a.high));
  return {
    fits,
    departures: departures.slice(0, MAX_DEPARTURES).map(({ gap: _gap, high: _high, ...d }) => d),
  };
}
