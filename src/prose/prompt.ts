import type { ProsePayload } from "./types";
import { PROFILES } from "../data/profiles";

// Builds the grounded prose prompt (spec §8). The load-bearing instruction
// everywhere: ground every claim in a specific axis score or something concrete,
// and never write anything true of almost everyone (the Barnum trap).
//
// Length is tier-dependent: Speed Run is short (three paragraphs); Soul Search is
// a fuller version of the same (spec §8).

export function buildProseSystem(long: boolean): string {
  const shared = [
    "You write specific personality readings for a spirit-animal app.",
    "Hard rules:",
    "- Ground every claim in one of the trait leans provided. Do not invent traits that were not given.",
    "- Never write a sentence that is true of almost everyone. No horoscope generalities, no flattery filler.",
    '- Speak to the reader as "you". Warm, plain, a little vivid. No jargon, no axis codes, no numbers.',
    "- If the profile is flagged balanced/muddy, say so honestly up front rather than overclaiming.",
  ];
  const shape = long
    ? [
        "- This is the deeper Soul Search read: write four to six paragraphs, fuller and more nuanced.",
        "  Cover who you are across your strongest leans, your matched animal and why it fits, the",
        "  runner-up and the real distinction, and a closing note on a tension or nuance in the profile.",
        "Return only the paragraphs, no headings, no preamble.",
      ]
    : [
        '- This is the quick "Speed Run" read: keep it to exactly three short paragraphs.',
        "  1) Who you are, built from your two or three strongest leans.",
        "  2) Your matched animal and why it fits — tie it to those leans.",
        "  3) The runner-up, and the one real difference that kept it second.",
        "Return only the three paragraphs, no headings, no preamble.",
      ];
  return [...shared, ...shape].join("\n");
}

export function buildProseUserPrompt(p: ProsePayload): string {
  const leans = p.standoutAxes.length
    ? p.standoutAxes
        .map((s) => `- ${s.axis}: leans ${s.lean} (strength ${s.value} on a -2..2 scale)`)
        .join("\n")
    : "- No strong leans; the profile is balanced across all eight traits.";

  const lines = [
    `Tier: ${p.tier}`,
    p.muddy
      ? "Profile flag: BALANCED / MUDDY — no trait pulls clearly ahead. Be honest about this."
      : "Profile flag: clear enough to read.",
    "",
    "The reader's strongest trait leans:",
    leans,
    "",
    `Matched animal (${p.primary.percent}%): ${p.primary.name} — ${p.primary.note}`,
    `Runner-up (${p.secondary.percent}%): ${p.secondary.name} — ${p.secondary.note}`,
  ];

  if (p.alsoClose) {
    lines.push(`Also close: ${p.alsoClose.name} — ${p.alsoClose.note}`);
  }

  // Ground the matched animal in its canonical profile (§10: ground every claim).
  const prof = PROFILES[p.primary.id];
  if (prof) {
    lines.push(
      "",
      `What the ${p.primary.name} is drawn to: ${prof.drawnTo}`,
      `What the ${p.primary.name} should watch for: ${prof.watchFor}`,
    );
  }

  lines.push(
    "",
    `Write the ${p.long ? "fuller" : "three-paragraph"} reading now, following every rule. ` +
      "Use the animal character notes and the drawn-to / watch-for material as grounding for " +
      "specific, true claims — reframe them in your own words, never list them verbatim, and " +
      "keep the reader's own trait leans in the lead.",
  );

  return lines.join("\n");
}
