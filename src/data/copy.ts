// User-facing fixed copy. Disclaimers from the Phase 0 content library §6.
// Variant A (curiosity-forward) is the chosen Barnum / conversion nudge (spec §9),
// instantiated per tier with the right question count and a button pointing one
// tier up (Speed Run -> Soul Search -> Deep Dive).

export type TierId = "speed-run" | "soul-search";

export interface IntroCopy {
  title: string;
  tagline: string;
  note: string;
  cta: string;
  meta: string;
}

export interface NudgeCopy {
  /** Section eyebrow, e.g. "Go deeper". */
  title: string;
  body: string;
  button: string;
  /** The tier this nudge climbs to, or null if that tier isn't built yet. */
  target: TierId | null;
}

export const TIER_COPY: Record<TierId, { intro: IntroCopy; nudge: NudgeCopy }> = {
  "speed-run": {
    intro: {
      title: "Find your spirit animal",
      tagline: "A quick read across eight traits. Sixteen questions, about five minutes.",
      note: "Pick the option that feels most true. There are no right answers — and rarely a clean best-self pick, by design.",
      cta: "Start the Speed Run",
      meta: "16 questions · ~5 minutes",
    },
    // §6a Variant A, pointing up to the Soul Search.
    nudge: {
      title: "Go deeper, learn more",
      body:
        "Sixteen questions can only catch your outlines, and short quizzes like this one " +
        "nudge anyone toward seeing themselves in the answer. But the patterns that really " +
        "define you sit deeper. Test how reliable your results are, explore more and move " +
        "on to the next stage.",
      button: "Take the Soul Search",
      target: "soul-search",
    },
  },
  "soul-search": {
    intro: {
      title: "Soul Search",
      tagline:
        "A deeper read. Thirty-five questions, around 25 minutes — stop and resume anytime.",
      note: "Higher-stakes dilemmas with a real cost on both sides. The sharper result comes from genuine trade-offs, so answer for what you'd actually do.",
      cta: "Begin the Soul Search",
      meta: "35 questions · ~25 minutes · save & resume",
    },
    // §6a Variant A, pointing up to the Deep Dive (Phase 3 — not built yet).
    nudge: {
      title: "Go deeper, learn more",
      body:
        "Thirty-six questions dig deep, but they still brush against the surface. The " +
        "deepest version asks you to speak for yourself, weigh your own words, and choose " +
        "clarity over ambiguity. The reward will be an individual response, drafted only " +
        "for you. Ready for the real thing?",
      button: "Start the Deep Dive",
      target: null,
    },
  },
};

export const COMING_SOON = "Coming soon";

// §6b, footer version. Shown on results pages, tonally separate from the nudge.
export const MEDICAL_FOOTER =
  "For fun and self-reflection only. This is not a psychological assessment, a " +
  "diagnosis, or medical or mental-health advice. If you are struggling with your " +
  "mental health, please reach out to a qualified professional.";

// Honest "muddy" framing (spec §4). Doubles as the strongest conversion hook.
export const MUDDY_COPY = {
  heading: "A balanced profile — no strong match yet",
  body:
    "Your answers spread evenly across the traits, so no single animal pulls clearly " +
    "ahead. That is a real result, not a failure: balanced people are exactly who the " +
    "deeper tiers are built for. Here is the closest read so far.",
};
