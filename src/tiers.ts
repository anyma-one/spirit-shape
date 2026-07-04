// The tier registry: the one place each tier's choices live (questions, config,
// pool, weighting). Quiz and Results are tier-agnostic and read from here, so a
// new tier is data, not new UI. The deterministic engine underneath is shared
// and unchanged from Phase 1.
import { matchVector, scoreAnswers } from "./engine";
import type { Answers, MatchResult, Question, WeightMultiplier } from "./engine";
import type { Archetype, EngineConfig } from "./engine";
import { COMMON_ANIMALS } from "./data/archetypes";
import { SOUL_SEARCH_CONFIG, SPEED_RUN_CONFIG } from "./data/config";
import { SPEED_RUN_QUESTIONS } from "./data/questions";
import { SOUL_SEARCH_QUESTIONS } from "./data/soulSearchQuestions";
import { TIER_COPY } from "./data/copy";
import type { IntroCopy, NudgeCopy, TierId } from "./data/copy";

export interface TierDef {
  id: TierId;
  name: string;
  questions: Question[];
  config: EngineConfig;
  pool: Archetype[];
  intro: IntroCopy;
  nudge: NudgeCopy;
  /** Score answers and match. Fully deterministic. */
  run: (answers: Answers) => MatchResult;
}

// Speed Run: every item full weight.
const speedRunMultiplier: WeightMultiplier = () => 1;

// Soul Search: depth items at half weight; grounded dilemmas at full weight.
const soulSearchMultiplier: WeightMultiplier = (q) =>
  q.category === "depth" ? SOUL_SEARCH_CONFIG.depthItemMultiplier : 1;

function makeRun(
  questions: Question[],
  config: EngineConfig,
  pool: Archetype[],
  multiplier: WeightMultiplier,
) {
  return (answers: Answers): MatchResult =>
    matchVector(scoreAnswers(questions, answers, config, multiplier), pool, config);
}

export const TIERS: Record<TierId, TierDef> = {
  "speed-run": {
    id: "speed-run",
    name: "Speed Run",
    questions: SPEED_RUN_QUESTIONS,
    config: SPEED_RUN_CONFIG,
    pool: COMMON_ANIMALS,
    intro: TIER_COPY["speed-run"].intro,
    nudge: TIER_COPY["speed-run"].nudge,
    run: makeRun(SPEED_RUN_QUESTIONS, SPEED_RUN_CONFIG, COMMON_ANIMALS, speedRunMultiplier),
  },
  "soul-search": {
    id: "soul-search",
    name: "Soul Search",
    questions: SOUL_SEARCH_QUESTIONS,
    config: SOUL_SEARCH_CONFIG,
    pool: COMMON_ANIMALS,
    intro: TIER_COPY["soul-search"].intro,
    nudge: TIER_COPY["soul-search"].nudge,
    run: makeRun(SOUL_SEARCH_QUESTIONS, SOUL_SEARCH_CONFIG, COMMON_ANIMALS, soulSearchMultiplier),
  },
};

/** Funnel order, shallowest first. */
export const TIER_ORDER: TierId[] = ["speed-run", "soul-search"];

export function getTier(id: TierId): TierDef {
  return TIERS[id];
}
