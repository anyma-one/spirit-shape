import Anthropic from "@anthropic-ai/sdk";

// Thin serverless endpoint (Vercel Node function). Holds the API key, builds the
// grounded prompt, and asks Claude for the reading.
//
// SELF-CONTAINED ON PURPOSE (README §4 / HANDOVER §4): on this project a
// function's local `src/` imports are not reliably available at runtime and
// devDependencies are pruned. So the prompt builders + the per-animal grounding
// they need are inlined here rather than imported from `src/prose/*`. Keep this in
// sync with src/prose/prompt.ts and src/data/profiles.ts if those change.
//
// Model: the Deep Dive is the premium, individually-written tier, so default to
// Opus. Override with ANTHROPIC_PROSE_MODEL (e.g. a cheaper model) if ever wiring
// the shorter Speed Run / Soul Search reads through here.
const DEFAULT_MODEL = "claude-opus-4-8";

// ---------------------------------------------------------------------------
// Payload shapes (mirror src/prose/types.ts)
// ---------------------------------------------------------------------------
interface ProseAnimal {
  id: string;
  name: string;
  note: string;
  percent?: number;
}
interface ProseStandoutAxis {
  axis: string;
  lean: string;
  value: number;
}
interface ProsePayload {
  tier: string;
  long: boolean;
  primary: ProseAnimal;
  secondary: ProseAnimal;
  alsoClose: ProseAnimal | null;
  standoutAxes: ProseStandoutAxis[];
  muddy: boolean;
}

// ---------------------------------------------------------------------------
// Per-animal grounding (drawn-to / watch-for), keyed by archetype id. Mirrors the
// same fields in src/data/profiles.ts for the 16 common animals. Rare animals have
// no entry; the prompt simply omits the grounding block when absent.
// ---------------------------------------------------------------------------
const GROUNDING: Record<string, { drawnTo: string; watchFor: string }> = {
  wolf: {
    drawnTo:
      "loyalty and shared history, roles and structure that hold, protecting the people you have chosen, mastery over novelty, the long steady effort that outlasts the sprint.",
    watchFor:
      "guarding so hard the circle stops growing; reading a threat where there is only difference; how slowly trust rebuilds once it breaks; and mistaking your own caution for wisdom when the ground has actually shifted.",
  },
  raven: {
    drawnTo:
      "ideas and systems, craft and making, symbolism and hidden meaning, learning for its own sake, anything that rewards patience and reads poorly at a glance.",
    watchFor:
      "solitude sliding into isolation; thinking so long that the moment to act passes; starting more than you finish because the new keeps pulling; and the quiet sting when work you made privately goes unseen, even though you insist you never wanted the audience.",
  },
  coyote: {
    drawnTo:
      "the next thing over the last thing, bending or breaking rules, improvising under pressure, bold moves and quick reversals, the thrill of getting away with it.",
    watchFor:
      "leaping so fast you skip the one detail that mattered; mistaking motion for progress; burning goodwill you will want back later; and never sitting still long enough to let anything you started actually finish.",
  },
  owl: {
    drawnTo:
      "solitude and quiet, watching and understanding, depth over breadth, knowledge held privately, the patience to let a thing reveal itself in full.",
    watchFor:
      "watching so long you never step in; letting quiet harden into withdrawal; keeping insight to yourself when it was needed out loud; and reading the room perfectly while staying just outside it.",
  },
  dolphin: {
    drawnTo:
      "people and shared experience, play and lightness, reading and lifting the mood, connection over competition, the joy that only happens with others.",
    watchFor:
      "giving so much warmth outward that little is left over; smoothing conflicts that actually needed to be had; mistaking a full social calendar for a full life; and losing your own signal in everyone else's feelings.",
  },
  bear: {
    drawnTo:
      "independence and self-reliance, your own ground and your own rhythm, deep rest and quiet strength, a few solid bonds over many loose ones, calm that does not need defending.",
    watchFor:
      "withdrawing so far that even your people cannot reach you; mistaking stubbornness for strength; sitting still past the point where something needed to change; and how much force comes out when you are finally pushed too far.",
  },
  fox: {
    drawnTo:
      "clever solutions and shortcuts that hold, reading the angle others miss, working indirectly and independently, wit over force, the quiet satisfaction of outmanoeuvring a problem.",
    watchFor:
      "outsmarting yourself with a plan too clever by half; slipping past a confrontation that actually needed to be met; keeping so much to yourself that no one can help you; and trusting your own read past the point where you should have checked it.",
  },
  lion: {
    drawnTo:
      "leading and being seen to lead, defending your own, meeting challenges head on, earned respect and visible standing, the confidence that fills a room.",
    watchFor:
      "pride reading every disagreement as a challenge; needing the witness so much you perform instead of act; confusing being followed with being right; and how heavily the front you hold can weigh when no one is allowed to see it slip.",
  },
  elephant: {
    drawnTo:
      "the people you belong to, memory and continuity, caring for the young and the vulnerable, steady bonds over new thrills, the calm authority of patience.",
    watchFor:
      "carrying the whole group's weight until it flattens you; holding grief and grudges too long because you forget nothing; steadiness curdling into resistance to any change; and putting everyone's needs ahead of your own until yours go unmet.",
  },
  cat: {
    drawnTo:
      "independence and self-determination, privacy and self-possession, affection on your own terms, quiet cleverness, a life arranged entirely to your own measure.",
    watchFor:
      "guarding your independence so hard you refuse help you actually need; withdrawing instead of working a thing through; letting few enough people in that the door starts to stick; and reading any request as an attempt to manage you.",
  },
  honeybee: {
    drawnTo:
      "shared purpose and belonging, doing your part well, order and structure, the health of the whole over personal credit, the quiet dignity of useful work.",
    watchFor:
      "disappearing so far into the group that your own needs vanish; equating your worth with your usefulness; avoiding conflict the collective actually needed; and giving until there is nothing left to give and calling it duty.",
  },
  octopus: {
    drawnTo:
      "strange problems and novel solutions, reshaping your approach on the fly, working alone and unmanaged, invention for its own sake, the freedom to do it your own way.",
    watchFor:
      "scattering across too many new problems to finish any; slipping away from people so smoothly no one gets close; over-engineering what a plain answer would have solved; and keeping so much boundary that help never reaches you.",
  },
  horse: {
    drawnTo:
      "open ground and open horizons, freedom and motion, going your own way, spirited independence, the refusal of any harness.",
    watchFor:
      "bolting from good things because they started to feel like a cage; mistaking commitment for capture; running so much you never arrive; and reading every rule as a leash when some were just the ground rules.",
  },
  tortoise: {
    drawnTo:
      "the long game, calm and steady routine, durability over speed, the familiar and the reliable, small gains that compound over time.",
    watchFor:
      "drawing into the shell when the moment asked you to move; mistaking a rut for stability; waiting out a change that needed meeting head on; and letting the slow pace become an excuse never to start.",
  },
  hawk: {
    drawnTo:
      "clarity and decisive action, seeing the essential from a height, committing fully once you are sure, sharp focus over broad noise, the clean strike at the right moment.",
    watchFor:
      "striking before the whole picture was in; keeping such height that you miss what only closeness shows; reading fast and committing faster than the facts deserved; and mistaking narrow focus for the full field.",
  },
  hummingbird: {
    drawnTo:
      "the new and the vivid, beauty and intensity, quick bright bursts of energy, delight in small things, colour and motion over stillness.",
    watchFor:
      "flitting off before anything finishes; burning bright and then burning out; mistaking constant motion for depth; and skimming so many vivid things that none of them lands.",
  },
};

// ---------------------------------------------------------------------------
// Prompt builders (mirror src/prose/prompt.ts)
// ---------------------------------------------------------------------------
function buildProseSystem(long: boolean): string {
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

function buildProseUserPrompt(p: ProsePayload): string {
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

  const prof = GROUNDING[p.primary.id];
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
interface ReqLike {
  method?: string;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}

function isValidPayload(b: unknown): b is ProsePayload {
  if (typeof b !== "object" || b === null) return false;
  const p = b as Record<string, unknown>;
  return (
    typeof p.tier === "string" &&
    typeof p.primary === "object" &&
    p.primary !== null &&
    typeof p.secondary === "object" &&
    p.secondary !== null &&
    Array.isArray(p.standoutAxes)
  );
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured: tell the client to use its deterministic fallback.
    res.status(501).json({ error: "No API key configured; client should use template." });
    return;
  }

  // Vercel parses JSON bodies; if a host passes a string, parse defensively.
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }

  if (!isValidPayload(body)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_PROSE_MODEL || DEFAULT_MODEL;

    const message = await client.messages.create({
      model,
      max_tokens: body.long ? 1000 : 600,
      system: buildProseSystem(body.long),
      messages: [{ role: "user", content: buildProseUserPrompt(body) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      res.status(502).json({ error: "Empty completion" });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Prose generation failed", detail });
  }
}
