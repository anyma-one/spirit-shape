import type { ProsePayload, ProseResponse } from "./types";
import { templateProse } from "./template";

// Asks the serverless endpoint for Claude-written prose; falls back to the
// deterministic template if the endpoint is missing, keyless, or errors. The UI
// always gets a reading, and the `source` field keeps the app honest about which.
export async function getProse(payload: ProsePayload): Promise<ProseResponse> {
  try {
    const res = await fetch("/api/prose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      const text = data.text?.trim();
      if (text) return { text, source: "llm" };
    }
  } catch {
    // Network error / no backend in `vite dev` without the function — fall through.
  }

  return { text: templateProse(payload), source: "template" };
}
