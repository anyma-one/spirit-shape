import { createHash, timingSafeEqual } from "node:crypto";

// Deep Dive (Tier 3) — beta logging. One event per completed run, plus a later
// one-tap reaction update. SELF-CONTAINED (README §4 / HANDOVER §4).
//
// PRIVACY: this log carries the DERIVED vector + ranking only — never the
// interview transcript. If transcripts are ever stored, they must not link here
// by anything more than run_id.
//
// Two modes on POST:
//   { run_id, ts, profile, ranking, weak_fit, winner_id, runnerup_id,
//     decided_on_low_confidence, reaction? }  -> upsert the run event
//   { run_id, reaction }                       -> patch the reaction (1..5)
//
// Storage: Supabase table `deepdive_runs` (run SQL from the handover). If Supabase
// is not configured the endpoint returns 501 and the client ignores it (the run
// still completes; logging is best-effort beta analytics).

interface ReqLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!passcodeGate(req, res)) return;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(501).json({ error: "Deep Dive logging not configured" });
    return;
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }
  const b = body as Record<string, unknown> | undefined;
  const runId = b && typeof b.run_id === "string" ? b.run_id : "";
  if (!runId) {
    res.status(400).json({ error: "Missing run_id" });
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  try {
    // Reaction-only update: PATCH the existing row.
    const reactionOnly = b && b.ranking === undefined && b.reaction !== undefined;
    if (reactionOnly) {
      const reaction = clampReaction(b!.reaction);
      const r = await fetch(
        `${url}/rest/v1/deepdive_runs?run_id=eq.${encodeURIComponent(runId)}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ reaction }),
        },
      );
      if (!r.ok) {
        const detail = (await r.text()).slice(0, 300);
        res.status(502).json({ error: "Reaction update failed", detail });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    // Full event upsert (on_conflict run_id so a re-post is idempotent).
    const row = {
      run_id: runId,
      ts: typeof b!.ts === "string" ? b!.ts : new Date().toISOString(),
      profile: b!.profile ?? null,
      ranking: b!.ranking ?? null,
      weak_fit: typeof b!.weak_fit === "boolean" ? b!.weak_fit : null,
      winner_id: typeof b!.winner_id === "string" ? b!.winner_id : null,
      runnerup_id: typeof b!.runnerup_id === "string" ? b!.runnerup_id : null,
      decided_on_low_confidence:
        typeof b!.decided_on_low_confidence === "boolean"
          ? b!.decided_on_low_confidence
          : null,
      reaction: b!.reaction === undefined ? null : clampReaction(b!.reaction),
    };
    const r = await fetch(`${url}/rest/v1/deepdive_runs?on_conflict=run_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      res.status(502).json({ error: "Insert failed", detail });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Log failed", detail });
  }
}

function clampReaction(value: unknown): number | null {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

// ---- Closed-beta passcode gate --------------------------------------------------
// INLINED in every api/deepdive-*.ts on purpose (self-contained rule, HANDOVER §4) —
// keep the copies identical. Every call must carry the shared beta passcode from
// the DEEPDIVE_PASSCODE env var in the `x-anyma-passcode` header (URI-encoded by
// the client, see src/deepdive/access.ts). Fails CLOSED: with the env var unset
// nothing gets through, so a deploy can never expose the paid pipeline by omission.
// Returns true when the request may proceed; otherwise the response is already sent.
function passcodeGate(req: ReqLike, res: ResLike): boolean {
  const expected = process.env.DEEPDIVE_PASSCODE?.trim();
  if (!expected) {
    res.status(503).json({ error: "The Deep Dive is not open yet" });
    return false;
  }
  const raw = req.headers?.["x-anyma-passcode"];
  let given = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  try {
    given = decodeURIComponent(given);
  } catch {
    // Malformed encoding — compare as-is (it will not match).
  }
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const digest = (s: string) => createHash("sha256").update(s.trim()).digest();
  if (!timingSafeEqual(digest(given), digest(expected))) {
    res.status(401).json({ error: "Access code required" });
    return false;
  }
  return true;
}
