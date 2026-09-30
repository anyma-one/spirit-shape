// PREVIEW TOOLS ONLY — the #deep-demo run: the whole Deep Dive with canned responses
// in place of the four API calls, so the experience can be checked end to end on a
// preview link without spending on the API. Loaded only behind the
// `import.meta.env.DEV || __PREVIEW_TOOLS__` guard in DeepDive.tsx, so it is absent
// from production builds.
//
// Timings mimic the real run (smoke tests, 2026-09-27): replies arrive in uneven
// bursts like a real connection, extraction + synthesis take ~30s, and the report
// thinks before its first word.

import type { AxisEntry, ChatTurn, Decision, ExtractedProfile, ReportInput } from "./pipeline";
import { TRANSCRIPT_MARKER } from "./pipeline";
import { PREVIEW_REPORT } from "./previewReport";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const between = (min: number, max: number) => min + Math.random() * (max - min);

const QUESTIONS = [
  "Let's start here.\n\nTell me about a time you made or finished something, and what you did with it once it was done.\n\n(doesn't have to be big: a meal, a repair, a plan that came together)",
  "You mentioned it almost in passing.\n\nTell me about a time someone saw that work, or didn't. What happened next?\n\n(a friend, a colleague, family, anyone)",
  "Tell me about a time plans changed on you at short notice. What did you actually do in the first hour?\n\n(a trip, a meeting, an evening that went another way)",
];

const CLOSE = `I have enough to work with. Thank you for all of that.\n\nGive me a moment while I put your reading together.\n${TRANSCRIPT_MARKER}`;

/**
 * Stream `text` in uneven bursts, like a real connection, after a thinking pause.
 * `burst` is the chunk size range in characters; the gap between chunks is 30-250ms.
 */
async function fakeStream(
  text: string,
  onText: (textSoFar: string) => void,
  pauseMs: number,
  burst: [number, number] = [2, 40],
) {
  await sleep(pauseMs);
  let at = 0;
  while (at < text.length) {
    at = Math.min(text.length, at + Math.round(between(...burst)));
    onText(text.slice(0, at));
    await sleep(between(30, 250));
  }
  return text;
}

// Roughly the made-up person behind the sample reading (Bear, Cat second nature).
const AXES: AxisEntry[] = [
  { code: "SOC", score: -2, evidence: "long rides alone", confidence: "high" },
  { code: "TMP", score: -1, evidence: "slept on it for a week", confidence: "medium" },
  { code: "COG", score: -1, evidence: "wrote out pros and cons", confidence: "medium" },
  { code: "BND", score: 2, evidence: "the third time, said so in the meeting", confidence: "high" },
  { code: "AUT", score: 1, evidence: "the numbers were mine", confidence: "medium" },
  { code: "REC", score: -1, evidence: "only told people once it worked", confidence: "medium" },
  { code: "NOV", score: 1, evidence: "took up pottery, loved being a beginner", confidence: "medium" },
  { code: "EXP", score: -1, evidence: "shows it by fixing things", confidence: "medium" },
];

export const demoApi = {
  /** Three questions, then the close — whatever the reader types. */
  streamInterviewTurn(messages: ChatTurn[], onText: (textSoFar: string) => void): Promise<string> {
    const answered = messages.filter((m) => m.role === "user").length;
    const text = answered >= QUESTIONS.length ? CLOSE : QUESTIONS[answered];
    return fakeStream(text, onText, between(1200, 2200));
  },

  async extract(_transcript: string): Promise<ExtractedProfile> {
    await sleep(18000);
    return {
      axes: AXES,
      gaps: [],
      aspiration: { stated_values: "", direction_of_travel: "", evidence: "" },
    };
  },

  async synthesize(): Promise<Decision> {
    await sleep(14000);
    return {
      winner_id: "bear",
      runnerup_id: "cat",
      distinction: "",
      comparison_notes: "",
      decided_on_low_confidence: false,
    };
  },

  streamReport(_input: ReportInput, onText: (textSoFar: string) => void): Promise<string> {
    // Bigger bursts: the real report arrives at roughly 350 characters a second.
    return fakeStream(PREVIEW_REPORT, onText, 6000, [20, 80]);
  },
};
