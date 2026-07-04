import type { Question } from "../engine/types";

// The 16 Speed Run questions (spirit-animal-speedrun-questions.md, v0.1).
// Stems second person, options first person. Weights are config data, not logic —
// tuning them never touches the engine.
export const SPEED_RUN_QUESTIONS: Question[] = [
  {
    id: "Q1",
    stem: "A project you led just succeeded. The best part is…",
    options: [
      { id: "a", label: "Celebrating it with the whole team.", weights: { SOC: 2, REC: 1 } },
      { id: "b", label: "The quiet certainty that it worked.", weights: { SOC: -1, REC: -2 } },
      { id: "c", label: "Being known as the one who pulled it off.", weights: { REC: 2, AUT: 1 } },
      { id: "d", label: "Already being three steps into the next thing.", weights: { NOV: 2, REC: -1 } },
    ],
  },
  {
    id: "Q2",
    stem: "A hard problem lands on you with no obvious answer. Your first move…",
    options: [
      { id: "a", label: "Act on instinct and correct as I go.", weights: { TMP: 2, COG: 1 } },
      { id: "b", label: "Break it into parts and work through them.", weights: { TMP: -1, COG: -2 } },
      { id: "c", label: "Sit with it and watch before deciding.", weights: { TMP: -2 } },
      { id: "d", label: "Pull people in and talk it through.", weights: { SOC: 1, COG: 1 } },
    ],
  },
  {
    id: "Q3",
    stem: "Someone oversteps and starts running your area their way. You…",
    options: [
      { id: "a", label: "Confront it directly, straight away.", weights: { AUT: 2, BND: 2 } },
      { id: "b", label: "Quietly reinforce my limits, no fight.", weights: { BND: 1, AUT: -1 } },
      { id: "c", label: "Adapt, I don't cling to territory.", weights: { BND: -2, AUT: -1 } },
      { id: "d", label: "Let them think they won, then route around them.", weights: { COG: 1 } },
    ],
  },
  {
    id: "Q4",
    stem: "Your ideal free weekend leans toward…",
    options: [
      { id: "a", label: "Somewhere I've never been.", weights: { NOV: 2 } },
      { id: "b", label: "A familiar routine I love.", weights: { NOV: -2 } },
      { id: "c", label: "Making or building something.", weights: { EXP: 2, NOV: 1 } },
      { id: "d", label: "The people I care about.", weights: { SOC: 2 } },
    ],
  },
  {
    id: "Q5",
    stem: "In a new group, you usually…",
    options: [
      { id: "a", label: "Take charge and set the direction.", weights: { AUT: 2, REC: 1, SOC: 1 } },
      { id: "b", label: "Support it and keep things smooth.", weights: { AUT: -2, SOC: 1 } },
      { id: "c", label: "Hang back and read the room.", weights: { SOC: -2, TMP: -1 } },
      { id: "d", label: "Say the thing nobody else will.", weights: { AUT: 2, EXP: 1 } },
    ],
  },
  {
    id: "Q6",
    stem: "Which is most you…",
    options: [
      { id: "a", label: "I need to make or express something, often.", weights: { EXP: 2 } },
      { id: "b", label: "I'm happiest solving a concrete problem.", weights: { COG: -1, EXP: -1 } },
      { id: "c", label: "I'm always reading people and situations.", weights: { COG: 1 } },
      { id: "d", label: "I just like getting useful things done.", weights: { EXP: -2, COG: -1 } },
    ],
  },
  {
    id: "Q7",
    stem: "A decision is due and you don't have all the information. You…",
    options: [
      { id: "a", label: "Decide now with what I have.", weights: { TMP: 2, AUT: 1 } },
      { id: "b", label: "Wait until I know more, even if it's tight.", weights: { TMP: -2, BND: 1 } },
      { id: "c", label: "Go with my gut and trust it.", weights: { TMP: 1, COG: 1 } },
      { id: "d", label: "Ask around before committing.", weights: { SOC: 1, TMP: -1 } },
    ],
  },
  {
    id: "Q8",
    stem: "Your week gets overloaded. The first thing you protect is…",
    options: [
      { id: "a", label: "My time alone to recharge.", weights: { SOC: -2, BND: 1 } },
      { id: "b", label: "My routines and how I do things.", weights: { BND: 2, NOV: -1 } },
      { id: "c", label: "Time with the people who matter.", weights: { SOC: 2 } },
      { id: "d", label: "Nothing, I just ride it out.", weights: { BND: -2, TMP: 1 } },
    ],
  },
  {
    id: "Q9",
    stem: "You did great work and nobody noticed. You…",
    options: [
      { id: "a", label: "Don't mind, I know what I did.", weights: { REC: -2 } },
      { id: "b", label: "Feel it deserved to be seen.", weights: { REC: 2 } },
      { id: "c", label: "Quietly make sure it gets noticed.", weights: { REC: 1, COG: 1 } },
      { id: "d", label: "Shrug, I'm already onto the next thing.", weights: { NOV: 2, REC: -1 } },
    ],
  },
  {
    id: "Q10",
    stem: "A system you rely on works fine but feels dull. You…",
    options: [
      { id: "a", label: "Leave it, it works.", weights: { NOV: -2, BND: 1 } },
      { id: "b", label: "Tinker with it just to try something new.", weights: { NOV: 2, EXP: 1 } },
      { id: "c", label: "Rebuild it better, even if that's risky.", weights: { NOV: 1, TMP: 1 } },
      { id: "d", label: "Change it only if there's a real reason.", weights: { NOV: -1, COG: -1 } },
    ],
  },
  {
    id: "Q11",
    stem: "You're learning something complex. It clicks when you…",
    options: [
      { id: "a", label: "Break it into clear steps.", weights: { COG: -2 } },
      { id: "b", label: "Grasp the whole shape first.", weights: { COG: 2 } },
      { id: "c", label: "Get hands-on and adjust as I go.", weights: { COG: 1, TMP: 1 } },
      { id: "d", label: "Have someone walk me through it.", weights: { SOC: 1, COG: -1 } },
    ],
  },
  {
    id: "Q12",
    stem: "A free evening, no obligations. You'd most likely…",
    options: [
      { id: "a", label: "Make, write, or build something.", weights: { EXP: 2 } },
      { id: "b", label: "Rest and do nothing in particular.", weights: { EXP: -2, NOV: -1 } },
      { id: "c", label: "See friends.", weights: { SOC: 2 } },
      { id: "d", label: "Sink into a project or problem.", weights: { COG: 1, EXP: 1 } },
    ],
  },
  {
    id: "Q13",
    stem: "After a long, social day you feel…",
    options: [
      { id: "a", label: "Energised, I could keep going.", weights: { SOC: 2 } },
      { id: "b", label: "Drained, I need to be alone.", weights: { SOC: -2 } },
      { id: "c", label: "Good, but I've hit my limit.", weights: { SOC: -1, BND: 1 } },
      { id: "d", label: "I barely noticed, I was in my element.", weights: { SOC: 1, REC: 1 } },
    ],
  },
  {
    id: "Q14",
    stem: "A rule you think is pointless is in your way. You…",
    options: [
      { id: "a", label: "Break it and deal with the fallout.", weights: { AUT: 2, TMP: 1 } },
      { id: "b", label: "Follow it anyway, rules are rules.", weights: { AUT: -2 } },
      { id: "c", label: "Push openly to change it.", weights: { AUT: 2, EXP: 1 } },
      { id: "d", label: "Quietly work around it.", weights: { COG: 1, BND: -1 } },
    ],
  },
  {
    id: "Q15",
    stem: "A risky opportunity appears with a short window. You…",
    options: [
      { id: "a", label: "Jump on it.", weights: { TMP: 2, NOV: 2 } },
      { id: "b", label: "Weigh it carefully first.", weights: { TMP: -2, COG: -1 } },
      { id: "c", label: "Only if I've done something like it before.", weights: { NOV: -1, BND: 1 } },
      { id: "d", label: "Talk it through with someone I trust.", weights: { SOC: 1, TMP: -1 } },
    ],
  },
  {
    id: "Q16",
    stem: "Which feels truer…",
    options: [
      { id: "a", label: "Better something flawed and mine than perfect and safe.", weights: { EXP: 2, NOV: 1 } },
      { id: "b", label: "Better to master one thing deeply than dabble.", weights: { BND: 1, NOV: -1 } },
      { id: "c", label: "Better to adapt to anything than be tied down.", weights: { BND: -2, NOV: 1 } },
      { id: "d", label: "Better to be reliable than surprising.", weights: { NOV: -2, EXP: -1 } },
    ],
  },
];
