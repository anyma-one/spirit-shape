import type { MatchResult } from "../engine";
import type { TierId } from "../data/copy";

// Fire-and-forget: send a completed result to the /api/log-result endpoint (which
// writes it to Supabase). Never blocks the UI, never surfaces errors, and is a no-op
// when the backend isn't configured (endpoint returns 501, ignored here). Anonymous —
// only the trait-derived result is sent, no personal data.
export function logResult(tier: TierId, result: MatchResult): void {
  const body = {
    tier,
    primary: result.primary.archetype.id,
    secondary: result.secondary.archetype.id,
    also_close: result.alsoClose?.archetype.id ?? null,
    split_primary: result.split.primary,
    muddy: result.muddy,
    vector: result.vector,
  };
  try {
    void fetch("/api/log-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // let it complete even if the page navigates
    }).catch(() => {});
  } catch {
    // ignore — logging must never affect the user's experience
  }
}
