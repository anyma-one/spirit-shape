// The compact, self-contained summary the client sends to the prose endpoint.
// It carries everything the prompt needs so the serverless function stays thin
// and never re-runs the engine.

export interface ProseAnimal {
  /** Archetype id — keys the per-animal profile + relationship content. */
  id: string;
  name: string;
  note: string;
  /** Headline split percentage for primary/secondary; omitted for "also close". */
  percent?: number;
}

export interface ProseStandoutAxis {
  /** Human axis name, e.g. "Social energy". */
  axis: string;
  /** Which pole the user leans to, e.g. "solitary" / "sociable". */
  lean: string;
  /** Scored value in [-2, 2], for grounding strength of the claim. */
  value: number;
}

export interface ProsePayload {
  tier: string; // e.g. "Speed Run"
  /** Soul Search asks for a fuller reading; Speed Run keeps it to three paragraphs. */
  long: boolean;
  primary: ProseAnimal;
  secondary: ProseAnimal;
  alsoClose: ProseAnimal | null;
  standoutAxes: ProseStandoutAxis[];
  muddy: boolean;
}

export interface ProseResponse {
  text: string;
  /** Where the prose came from, so the UI can be honest about it. */
  source: "llm" | "template";
}
