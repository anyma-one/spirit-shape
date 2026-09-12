// Deep Dive (Tier 3) save-resume. The interview is long (30–60 min) and won't be
// one sitting, so the turn history is stashed in localStorage under a run id and
// restored on return. localStorage-only for the local build; a Supabase-backed
// anonymous resume token is the pre-launch upgrade (survives device/browser).

import type { ChatTurn } from "./pipeline";

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
