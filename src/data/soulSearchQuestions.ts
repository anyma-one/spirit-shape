import type { Question } from "../engine/types";

// The 36 Soul Search questions — Question Set **v0.6** (input-format pass over v0.5.1).
// v0.6 adds three input formats on top of multiple choice (spec: soulsearch-formats-v0.6):
//   - Sliders: G11 (REC), G18 (EXP) — five notches -2..+2, pole-balanced.
//   - Pads:    G20 (COG×TMP, drops its old SOC option), SB1 (SOC×BND, new question).
//   - Rank:    D1, D3, D5, D6, D9 — drag-to-rank; option vectors unchanged from v0.5.
// The engine is unchanged; each format emits an 8-axis contribution, normalized to the
// same per-question magnitude as MC (see engine/scoring.ts §5). Everything else stays MC.
//
// wording as authored, with a **tuning pass on the weight vectors** applied on top
// (v0.5.1). v0.5 shipped deliberately un-sign-balanced; simulated matching showed a
// hard skew (Elephant+Wolf ~50%, Tortoise/Honeybee/Octopus unreachable). This pass
// rebalances the worst axes toward centre — NO wording changed, only weight numbers —
// so every one of the 16 animals is reachable and the top animals stop dominating.
// The vectors here remain the SOURCE OF TRUTH for scoring (config.ts holds only knobs:
// scaleDivisor 5, muddyNormThreshold 1.25, depthItemMultiplier).
//
// Axis order: SOC, TMP, COG, BND, AUT, REC, NOV, EXP (-2..+2).
// SOC social energy · TMP action tempo · COG analytical(-)/intuitive(+) ·
// BND open(-)/guarded(+) · AUT avoids conflict(-)/confronts(+) ·
// REC private(-)/wants-witness(+) · NOV routine(-)/novelty(+) ·
// EXP utilitarian(-)/creative(+).
//
//   - Grounded dilemmas G1–G23: full weight.
//   - Depth items D1–D12: HALF weight (category "depth" -> depthItemMultiplier).
//   - Option counts vary per item (some 3–5) by design.
//
// SIGN BALANCE is still a first-draft target to be refined against real Phase 2
// distribution data (not one simulated run). tiers.test.ts enforces a floor
// invariant (both signs present per axis) and keeps the ±20% target as a skipped
// post-tuning goal. Re-run ~/.local/sa_balance.py once its weights are synced.

const GROUNDED: Question[] = [
  {
    id: "G1",
    category: "grounded",
    stem: "A whole evening opens up in front of you, with no plans and nobody to answer to.",
    options: [
      { id: "a", label: "I head out and surround myself with people.", weights: { SOC: 2 } },
      { id: "b", label: "I spend some quality time with one person I trust.", weights: { SOC: -1, BND: -2 } },
      { id: "c", label: "I shut myself in to work on my own project.", weights: { EXP: 2, SOC: -1 } },
      { id: "d", label: "Finally, some time alone.", weights: { SOC: -2, REC: -1 } },
      { id: "e", label: "I meet two or three people and we'll talk through the night.", weights: { SOC: 1, BND: -1 } },
    ],
  },
  {
    id: "G2",
    category: "grounded",
    stem: "Picture the next few years of your life. Where you call home is…",
    options: [
      { id: "a", label: "A full, busy house with people always coming and going.", weights: { SOC: 2 } },
      { id: "b", label: "A quiet place just for myself.", weights: { SOC: -2 } },
      { id: "c", label: "Somewhere new every year.", weights: { NOV: 2 } },
      { id: "d", label: "Where the people I love are.", weights: { SOC: 1, BND: 1 } },
      { id: "e", label: "A place I've built myself.", weights: { EXP: 1, AUT: 1 } },
    ],
  },
  {
    id: "G3",
    category: "grounded",
    stem: "An exciting chance turns up, but the window to take it is closing fast.",
    options: [
      { id: "a", label: "I jump on it right away and work out the details as I go.", weights: { TMP: 2, NOV: 1 } },
      { id: "b", label: "I hold back and wait until I can see the details clearly.", weights: { TMP: -2 } },
      { id: "c", label: "I run through the possibilities in my head before deciding.", weights: { COG: -2, TMP: -1 } },
      { id: "d", label: "I check with the people I trust before deciding.", weights: { SOC: 1 } },
      { id: "e", label: "I let it pass. I won't be pushed into making a decision.", weights: { AUT: 2 } },
    ],
  },
  {
    id: "G4",
    category: "grounded",
    stem: "Something goes sideways all at once, fast, and someone needs to do something.",
    options: [
      { id: "a", label: "I move in the first few seconds, before I've thought it through.", weights: { TMP: 2, COG: 1 } },
      { id: "b", label: "I hang back and read the situation before I act.", weights: { TMP: -2, COG: 1 } },
      { id: "c", label: "I step up and start directing people.", weights: { AUT: 2, REC: 1 } },
      { id: "d", label: "I look to whoever knows best and follow their lead.", weights: { AUT: -2, SOC: 1 } },
      { id: "e", label: "I first make sure nobody is getting hurt.", weights: { TMP: 1 } },
    ],
  },
  {
    id: "G5",
    category: "grounded",
    stem: "You reach a real fork in your life, and there's no obvious right answer.",
    options: [
      { id: "a", label: "I lay every option out and work through it carefully.", weights: { COG: -2 } },
      { id: "b", label: "I go with my intuition.", weights: { COG: 2 } },
      { id: "c", label: "I talk it through with people I trust.", weights: { SOC: 1, COG: -1 } },
      { id: "d", label: "I create my own path.", weights: { NOV: 1, AUT: 1, BND: -1 } },
      { id: "e", label: "I turn back and get a map.", weights: { TMP: -2, EXP: -1 } },
    ],
  },
  {
    id: "G6",
    category: "grounded",
    stem: "You get the chance to learn something completely new.",
    options: [
      { id: "a", label: "I read up on all of it before I touch anything.", weights: { COG: -2, TMP: -1 } },
      { id: "b", label: "I jump in and learn by getting it wrong a few times.", weights: { COG: 1, TMP: 2 } },
      { id: "c", label: "I find someone who already knows it to teach me.", weights: { COG: -1 } },
      { id: "d", label: "I find my own way of doing it.", weights: { NOV: 1, EXP: 1 } },
      { id: "e", label: "I'd rather not distract myself with something new.", weights: { NOV: -2 } },
    ],
  },
  {
    id: "G7",
    category: "grounded",
    stem: "Someone you love wants to fold their life fully into yours, and share everything.",
    options: [
      { id: "a", label: "I welcome them in happily, no walls between us.", weights: { BND: -2, SOC: 1 } },
      { id: "b", label: "I keep a few boundaries, no matter how close we get.", weights: { BND: 2 } },
      { id: "c", label: "I test how honest we can really be with each other first.", weights: { BND: -1 } },
      { id: "d", label: "I keep my distance.", weights: { SOC: -1 } },
      { id: "e", label: "I tell them off.", weights: { AUT: 2, BND: 1 } },
    ],
  },
  {
    id: "G8",
    category: "grounded",
    stem: "Life gets loud and chaotic for a while, more than usual.",
    options: [
      { id: "a", label: "I let it flow, my plans were loose anyway.", weights: { BND: -2, NOV: 1 } },
      { id: "b", label: "I guard my routines like they're sacred.", weights: { BND: 2, NOV: -1 } },
      { id: "c", label: "This is not the first time. I will weather the storm.", weights: { TMP: -2, EXP: -1 } },
      { id: "d", label: "I get out, away from the noise, until it settles.", weights: { SOC: -1, TMP: -1 } },
      { id: "e", label: "Chaos is where I thrive.", weights: { NOV: 2, TMP: 1, COG: 1 } },
    ],
  },
  {
    id: "G9",
    category: "grounded",
    stem: "A close friend lets you down.",
    options: [
      { id: "a", label: "I confront them straight away.", weights: { AUT: 2 } },
      { id: "b", label: "I let it slide to keep things easy between us.", weights: { AUT: -2, SOC: 1 } },
      { id: "c", label: "I say nothing, but quietly trust them a little less.", weights: { BND: 1, SOC: -1 } },
      { id: "d", label: "I forgive it and move on without dwelling on it.", weights: { AUT: -1, NOV: 1 } },
      { id: "e", label: "I manage my emotions and seek a conversation.", weights: { AUT: 1, TMP: -1 } },
    ],
  },
  {
    id: "G10",
    category: "grounded",
    stem: "Someone starts telling you what to do.",
    options: [
      { id: "a", label: "I push back, on principle.", weights: { AUT: 2, BND: 1 } },
      { id: "b", label: "I go along, it's not worth the fight.", weights: { AUT: -2 } },
      { id: "c", label: "I smile and do my own thing anyway.", weights: { AUT: 1, BND: 1, NOV: 1 } },
      { id: "d", label: "I follow, if they've earned it.", weights: { AUT: -1, SOC: 1 } },
    ],
  },
  {
    // v0.6: bipolar REC slider (was MC).
    id: "G11",
    category: "grounded",
    format: "slider",
    stem: "You do something you're proud of and nobody notices.",
    slider: {
      axis: "REC",
      leftLabel: "I don't mind at all, I know what I did.",
      rightLabel: "I feel the itch for it to be seen.",
    },
    options: [],
  },
  {
    id: "G12",
    category: "grounded",
    stem: "You told a friend something in confidence, and they told others.",
    options: [
      { id: "a", label: "I confront them about it, openly.", weights: { AUT: 2 } },
      { id: "b", label: "I say nothing and never confide in them again.", weights: { BND: 2, SOC: -1 } },
      { id: "c", label: "I let it go, people talk.", weights: { AUT: -2, SOC: 1 } },
      { id: "d", label: "I make sure people hear what they did.", weights: { REC: 1, AUT: 1 } },
      { id: "e", label: "We will speak about this in private.", weights: { AUT: 1, REC: -1 } },
    ],
  },
  {
    // v0.6: new SOC × BND pad. Placed mid-form where drop-off peaks (UX note §6).
    id: "SB1",
    category: "grounded",
    format: "pad",
    stem: "When you meet someone new, how do you show up?",
    pad: {
      xAxis: "SOC",
      yAxis: "BND",
      xLeftLabel: "I hang back and stay quiet",
      xRightLabel: "I dive into the conversation",
      yBottomLabel: "I let them right in",
      yTopLabel: "I keep my guard up",
      cornerTL: "quiet and careful",
      cornerTR: "friendly with everyone, close with few",
      cornerBL: "quiet, but real once we talk",
      cornerBR: "warm and open right away",
    },
    options: [],
  },
  {
    id: "G13",
    category: "grounded",
    stem: "Life offers you a choice between comfort and upheaval.",
    options: [
      { id: "a", label: "I choose constant change. Everything else feels boring.", weights: { NOV: 2 } },
      { id: "b", label: "A settled, familiar life, that's what I want.", weights: { NOV: -2 } },
      { id: "c", label: "Freedom to choose either, whichever the moment calls for.", weights: { BND: -1, AUT: 1 } },
      { id: "d", label: "Whatever provides me with the opportunity to create something.", weights: { EXP: 1, NOV: 1 } },
      { id: "e", label: "I don't choose. I just let it happen.", weights: { AUT: -2, BND: -1 } },
    ],
  },
  {
    id: "G14",
    category: "grounded",
    stem: "You've finally mastered something that was hard to learn.",
    options: [
      { id: "a", label: "I itch to leave it for something new.", weights: { NOV: 1 } },
      { id: "b", label: "I go deeper, that's where the joy is.", weights: { NOV: -2 } },
      { id: "c", label: "I want to share and teach it.", weights: { REC: 1 } },
      { id: "d", label: "I move on to using it, quietly, on my own terms.", weights: { EXP: -1, REC: -1 } },
    ],
  },
  {
    id: "G15",
    category: "grounded",
    stem: "You're offered two lives: one steady with no room to create, the other shaky but built on making things.",
    options: [
      { id: "a", label: "The making life, shaky but fulfilled.", weights: { EXP: 2 } },
      { id: "b", label: "The steady life, calm over output.", weights: { EXP: -2, NOV: -1 } },
      { id: "c", label: "If that's the choice, I choose nothing.", weights: { AUT: 1, BND: 1 } },
      { id: "d", label: "Whatever seems the most practical.", weights: { EXP: -1, COG: -1 } },
      { id: "e", label: "I'd rather build my own.", weights: { EXP: 1, AUT: 1 } },
    ],
  },
  {
    id: "G16",
    category: "grounded",
    stem: "You make something you're proud of. What happens to it?",
    options: [
      { id: "a", label: "I put it out there, or it doesn't feel real.", weights: { REC: 2 } },
      { id: "b", label: "I keep it just for me.", weights: { REC: -2 } },
      { id: "c", label: "I make it and move straight on to the next thing.", weights: { REC: -1, NOV: 1 } },
      { id: "d", label: "I keep refining it until it's exactly right.", weights: { NOV: -1 } },
      { id: "e", label: "I share it only with my closest friends.", weights: { REC: 1, SOC: 1 } },
    ],
  },
  {
    id: "G17",
    category: "grounded",
    stem: "A group of friends starts developing and drifting in a direction you don't like.",
    options: [
      { id: "a", label: "I fight to turn it around.", weights: { AUT: 2, BND: 1 } },
      { id: "b", label: "I quietly step away for good.", weights: { SOC: -1 } },
      { id: "c", label: "I stay and keep the peace.", weights: { AUT: -2, SOC: 1 } },
      { id: "d", label: "I get others to see it my way instead.", weights: { AUT: 1, SOC: 1 } },
      { id: "e", label: "I don't care. Not my problem.", weights: { AUT: -2, SOC: -1 } },
    ],
  },
  {
    // v0.6: bipolar EXP slider (was MC).
    id: "G18",
    category: "grounded",
    format: "slider",
    stem: "A practical problem needs solving. How do you handle it?",
    slider: {
      axis: "EXP",
      leftLabel: "I do whatever fixes it fastest, nothing else matters.",
      rightLabel: "I can't resist turning it into something more than it needed to be.",
    },
    options: [],
  },
  {
    id: "G19",
    category: "grounded",
    stem: "Your team just wrapped up a project you all worked hard on, and now someone has to stand up and present it.",
    options: [
      { id: "a", label: "I want to be the one who presents it, people should see what we did.", weights: { REC: 2, SOC: 1 } },
      { id: "b", label: "I'm happy to let someone else take the front, I did my part.", weights: { REC: -2, SOC: -1 } },
      { id: "c", label: "I want to have shaped how it's framed, whoever ends up presenting it.", weights: { AUT: 2, REC: -1 } },
      { id: "d", label: "I just want it to land well, however that happens.", weights: { EXP: 1, REC: -1 } },
      { id: "e", label: "Presenting is the last thing I want to do, no matter how hard I worked for it.", weights: { REC: -2, SOC: -2, AUT: -1 } },
    ],
  },
  {
    // v0.6: COG × TMP pad (was MC). Drops the old SOC +2 option, trimming the SOC skew.
    id: "G20",
    category: "grounded",
    format: "pad",
    stem: "You're facing something big. How do you approach it?",
    pad: {
      xAxis: "COG",
      yAxis: "TMP",
      xLeftLabel: "Plan it all out first",
      xRightLabel: "Go with my gut",
      yBottomLabel: "Wait for the right moment",
      yTopLabel: "Move on it now",
      cornerTL: "plan it, then move fast",
      cornerTR: "dive straight in",
      cornerBL: "plan it and wait for the moment",
      cornerBR: "feel it out, in no hurry",
    },
    options: [],
  },
  {
    id: "G21",
    category: "grounded",
    stem: "Picture the years ahead of you. What would you rather have?",
    options: [
      { id: "a", label: "Master one thing, all the way.", weights: { NOV: -2, EXP: -1 } },
      { id: "b", label: "Taste a bit of everything.", weights: { NOV: 2 } },
      { id: "c", label: "Keep growing, whatever it takes.", weights: { NOV: 1, COG: 1 } },
      { id: "d", label: "Enough, and the peace to enjoy it.", weights: { REC: -2, NOV: -1 } },
      { id: "e", label: "A simple, steady life that works, nothing I need to make of it.", weights: { EXP: -2, NOV: -1 } },
    ],
  },
  {
    id: "G22",
    category: "grounded",
    stem: "When it really counts, where does your loyalty go?",
    options: [
      { id: "a", label: "To a close few, fiercely.", weights: { BND: 2, SOC: -1 } },
      { id: "b", label: "To anyone who needs me, openly.", weights: { BND: -2, SOC: 2 } },
      { id: "c", label: "To an idea or a cause, over any one person.", weights: { AUT: 1, EXP: 1 } },
      { id: "d", label: "To myself, first and last.", weights: { SOC: -2, BND: 1 } },
    ],
  },
  {
    id: "G23",
    category: "grounded",
    stem: "If you truly had to pick just one, which would you rather be?",
    options: [
      { id: "a", label: "Truly respected.", weights: { REC: 1, AUT: 1 } },
      { id: "b", label: "Genuinely liked.", weights: { AUT: -2, SOC: 2 } },
      { id: "c", label: "Left in peace.", weights: { SOC: -2, BND: 2, REC: -1 } },
      { id: "d", label: "Quietly needed.", weights: { SOC: 1 } },
    ],
  },
];

const DEPTH: Question[] = [
  {
    id: "D1",
    category: "depth",
    format: "rank",
    stem: "What would feel most like a life wasted?",
    options: [
      { id: "a", label: "Never having made something that was mine.", weights: { EXP: 2 } },
      { id: "b", label: "Never having let anyone all the way in.", weights: { BND: -2 } },
      { id: "c", label: "Never having tested what I'm capable of.", weights: { NOV: 2 } },
      { id: "d", label: "Never having just been content with enough.", weights: { NOV: -2 } },
      { id: "e", label: "Having missed all the fun I could have had.", weights: { SOC: 1, NOV: 1 } },
    ],
  },
  {
    id: "D2",
    category: "depth",
    stem: "What unsettles you more?",
    options: [
      { id: "a", label: "Chaos I can't get a grip on.", weights: { BND: 2 } },
      { id: "b", label: "A safe life that's quietly closed off.", weights: { BND: -2, NOV: 1 } },
      { id: "c", label: "Going unseen.", weights: { REC: 2 } },
      { id: "d", label: "Being bound to people I can't leave.", weights: { AUT: -1, BND: -1 } },
      { id: "e", label: "Being isolated and excluded.", weights: { SOC: 2 } },
    ],
  },
  {
    id: "D3",
    category: "depth",
    format: "rank",
    stem: "More than anything, you're defined by…",
    options: [
      { id: "a", label: "What I achieve.", weights: { EXP: 2 } },
      { id: "b", label: "What I feel, whether or not it shows.", weights: { REC: -2 } },
      { id: "c", label: "How others see me.", weights: { REC: 2, SOC: 1 } },
      { id: "d", label: "What I won't compromise on.", weights: { BND: 2, AUT: 1 } },
      { id: "e", label: "What I do on a daily basis.", weights: { NOV: -2, EXP: -1 } },
    ],
  },
  {
    id: "D4",
    category: "depth",
    stem: "Comfortable illusion, or painful truth?",
    options: [
      { id: "a", label: "The truth, always, even when it stings.", weights: { AUT: 1 } },
      { id: "b", label: "A kind illusion, if it spares someone.", weights: { AUT: -2, SOC: 1 } },
      { id: "c", label: "The truth, but one I keep to myself.", weights: { REC: -1, BND: 1 } },
      { id: "d", label: "Whatever gets us through today.", weights: { NOV: -1, EXP: -1 } },
    ],
  },
  {
    id: "D5",
    category: "depth",
    format: "rank",
    stem: "What would you defend to the end?",
    options: [
      { id: "a", label: "My freedom.", weights: { BND: -1, AUT: 1 } },
      { id: "b", label: "My people.", weights: { SOC: 2, BND: 1 } },
      { id: "c", label: "My principles.", weights: { AUT: 2 } },
      { id: "d", label: "My peace.", weights: { SOC: -2, NOV: -1 } },
      { id: "e", label: "My legacy.", weights: { REC: 1, EXP: 1 } },
    ],
  },
  {
    id: "D6",
    category: "depth",
    format: "rank",
    stem: "You live most for…",
    options: [
      { id: "a", label: "The next horizon.", weights: { NOV: 2, TMP: 1 } },
      { id: "b", label: "What I already have.", weights: { NOV: -2 } },
      { id: "c", label: "The people around me.", weights: { SOC: 2 } },
      { id: "d", label: "What I'm building.", weights: { EXP: 2 } },
      { id: "e", label: "Understanding things, finding the answers.", weights: { COG: -2, NOV: 1 } },
    ],
  },
  {
    id: "D7",
    category: "depth",
    stem: "Solitude, to you, is…",
    options: [
      { id: "a", label: "A refuge I need.", weights: { SOC: -2, BND: 1 } },
      { id: "b", label: "A punishment I'd rather avoid.", weights: { SOC: 2 } },
      { id: "c", label: "Where my clearest thinking happens.", weights: { SOC: -1, COG: 2 } },
      { id: "d", label: "Something I can take or leave.", weights: { SOC: 1, NOV: -1 } },
    ],
  },
  {
    id: "D8",
    category: "depth",
    stem: "Conflict is something to be…",
    options: [
      { id: "a", label: "Won.", weights: { AUT: 2 } },
      { id: "b", label: "Avoided.", weights: { AUT: -2, SOC: 1 } },
      { id: "c", label: "Sidestepped, cleverly, so it never quite becomes a fight.", weights: { COG: 2, AUT: -1 } },
      { id: "d", label: "Endured, when principle asks for it.", weights: { AUT: 1, BND: 1 } },
      { id: "e", label: "Transformed into something constructive.", weights: { AUT: 1, EXP: 1 } },
    ],
  },
  {
    id: "D9",
    category: "depth",
    format: "rank",
    stem: "You'd rather be remembered…",
    options: [
      { id: "a", label: "By many, for a while.", weights: { REC: 2, SOC: 1 } },
      { id: "b", label: "By a few, for good.", weights: { REC: 1, BND: 1 } },
      { id: "c", label: "By no one, as long as the work lasts.", weights: { REC: -2, EXP: 1 } },
      { id: "d", label: "Through what changed because I was here.", weights: { EXP: 1 } },
    ],
  },
  {
    id: "D10",
    category: "depth",
    stem: "Which regret cuts deeper?",
    options: [
      { id: "a", label: "The things I did.", weights: { TMP: -1 } },
      { id: "b", label: "The things I didn't.", weights: { TMP: 2 } },
      { id: "c", label: "Neither, I don't dwell.", weights: { NOV: 1, BND: -1 } },
      { id: "d", label: "Both, equally, and often.", weights: { BND: 1, REC: -1 } },
    ],
  },
  {
    id: "D11",
    category: "depth",
    stem: "If you could freeze one thing exactly as it is, forever, would you?",
    options: [
      { id: "a", label: "Yes, some things are perfect as they are.", weights: { NOV: -2 } },
      { id: "b", label: "No, nothing should be frozen.", weights: { NOV: 2 } },
      { id: "c", label: "Only a person, never a moment.", weights: { BND: -2 } },
      { id: "d", label: "I'd rather keep it in memory, exactly as it felt.", weights: { REC: -1, BND: 1 } },
    ],
  },
  {
    id: "D12",
    category: "depth",
    stem: "Does making something matter if no one ever sees it?",
    options: [
      { id: "a", label: "Yes, the making is the whole point.", weights: { EXP: 2, REC: -2 } },
      { id: "b", label: "No, it only lives once it's witnessed.", weights: { REC: 2 } },
      { id: "c", label: "It matters to me, and that's enough.", weights: { REC: -1 } },
      { id: "d", label: "That question doesn't interest me, I'll keep making regardless.", weights: { EXP: 1 } },
    ],
  },
];

// Presentation order (v0.6 order addendum §8). Ordering does NOT affect scoring —
// each question keeps its category/weight; answers are keyed by id. Rules honoured:
//  - Fixed opening: Q1 multiple choice, Q2 pad (SB1, first pad shows its cue), Q3 slider.
//  - All four "playful" formats (2 pads, 2 sliders) in the front two-thirds (< Q24).
//  - The two pads are never adjacent (SB1 Q2, G20 Q11).
//  - Rank items spread through the back, none in the first six, no two adjacent, never last.
// Note: strict "≤2 MC in a row" (rule 1) is impossible with 27 MC vs 9 varied items and a
// forced adjacent pad+slider opening; runs are minimized to a max of 4 (near-optimal).
// These placements are a first pass to be tuned against real drop-off data (§8.3).
const PRESENTATION_ORDER = [
  "G1",  "SB1", "G11", "G2",  "G3",  "G4",  "G18", "G5",  "G6",  "G7",
  "G20", "G8",  "G9",  "G10", "D1",  "G12", "G13", "G14", "G15", "D3",
  "G16", "G17", "D2",  "D5",  "G19", "G21", "D4",  "D6",  "G22", "G23",
  "D7",  "D8",  "D9",  "D10", "D11", "D12",
];

const BY_ID = Object.fromEntries([...GROUNDED, ...DEPTH].map((q) => [q.id, q]));

export const SOUL_SEARCH_QUESTIONS: Question[] = PRESENTATION_ORDER.map((id) => BY_ID[id]);
