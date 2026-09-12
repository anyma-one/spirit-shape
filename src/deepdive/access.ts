// Deep Dive closed-beta access — the client half of the passcode gate.
//
// The server is the real gate (every api/deepdive-*.ts checks DEEPDIVE_PASSCODE);
// this only remembers the code the reader entered and attaches it to each call.
// Stored in localStorage so a beta tester enters it once per device — the same
// place the interview's own save-resume already lives.

const STORAGE_KEY = "anyma.deepdive.passcode";
export const PASSCODE_HEADER = "x-anyma-passcode";

// Fallback for browsers that block localStorage (private modes).
let memory = "";

/** Thrown by the pipeline when the server rejects the stored code (401). */
export class AccessDeniedError extends Error {
  constructor() {
    super("Your access code is no longer valid.");
    this.name = "AccessDeniedError";
  }
}

export function loadPasscode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePasscode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage blocked — the code still works for this page load via memory below.
  }
  memory = code;
}

export function clearPasscode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  memory = "";
}

/** Header to attach to every Deep Dive API call. URI-encoded: header values must be ASCII. */
export function passcodeHeaders(code: string = loadPasscode() || memory): Record<string, string> {
  return { [PASSCODE_HEADER]: encodeURIComponent(code.trim()) };
}

export type UnlockOutcome = "ok" | "wrong" | "closed" | "error";

/** Ask the server whether a code is valid. Never throws. */
export async function verifyPasscode(code: string): Promise<UnlockOutcome> {
  try {
    const res = await fetch("/api/deepdive-unlock", {
      method: "POST",
      headers: passcodeHeaders(code),
    });
    if (res.ok) return "ok";
    if (res.status === 401) return "wrong";
    if (res.status === 503) return "closed";
    return "error";
  } catch {
    return "error";
  }
}
