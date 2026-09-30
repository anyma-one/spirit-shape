// Deep Dive (Tier 3) save-resume. The interview is long (30–60 min) and won't be
// one sitting, so the turn history is stashed in localStorage under a run id and
// restored on return. localStorage-only for the local build; a Supabase-backed
// anonymous resume token is the pre-launch upgrade (survives device/browser).

import type { AxisEntry, ChatTurn, Decision } from "./pipeline";

const KEY = "anyma.deepdive.v1";

export interface DeepDiveSession {
  runId: string;
  messages: ChatTurn[];
  createdAt: string;
}

export function newRunId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `dd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadSession(): DeepDiveSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DeepDiveSession;
    if (!s || typeof s.runId !== "string" || !Array.isArray(s.messages)) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(session: DeepDiveSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage full or unavailable — resume is best-effort */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ---- The finished reading ----------------------------------------------------------
// One Deep Dive per device: once a reading is written it is kept here, and opening the
// Deep Dive again shows it instead of starting a new interview (a second run costs
// money and weakens the profile). Deliberately local: clearing site data or another
// browser gets round it, which is accepted - the aim is to remove the easy path, not
// to identify anyone.

const READING_KEY = "anyma.deepdive.reading.v1";

export interface SavedReading {
  runId: string;
  finishedAt: string;
  /** The extracted profile - enough to rebuild the ranking and the result furniture. */
  axes: AxisEntry[];
  decision: Decision;
  /** The report text as written. */
  report: string;
  /** The reader's 1-5 answer to "How much does this feel like you?", once given. */
  reaction: number | null;
}

export function loadReading(): SavedReading | null {
  try {
    const raw = localStorage.getItem(READING_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as SavedReading;
    const valid =
      !!r &&
      typeof r.runId === "string" &&
      Array.isArray(r.axes) &&
      !!r.decision &&
      typeof r.decision.winner_id === "string" &&
      typeof r.report === "string" &&
      r.report.length > 0;
    return valid ? { ...r, reaction: typeof r.reaction === "number" ? r.reaction : null } : null;
  } catch {
    return null;
  }
}

export function saveReading(reading: SavedReading): void {
  try {
    localStorage.setItem(READING_KEY, JSON.stringify(reading));
  } catch {
    /* storage full or unavailable - the reading still shows for this visit */
  }
}

/** Record the reader's rating on the saved reading, so they are not asked again. */
export function saveReadingReaction(reaction: number): void {
  const r = loadReading();
  if (r) saveReading({ ...r, reaction });
}
