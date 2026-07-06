// Serverless endpoint (Vercel Node function) that appends one completed quiz result
// to a Supabase table. Anonymous — only the trait-derived result, no personal data.
//
// Config (set in the host's env, never in the client bundle):
//   SUPABASE_URL                 e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    the service_role key (bypasses RLS; server-only)
//
// If either is missing the endpoint returns 501 and the client silently ignores it,
// so the app keeps working with no logging configured.

interface ReqLike {
  method?: string;
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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(501).json({ error: "Result logging not configured" });
    return;
  }

  // Vercel parses JSON bodies; parse defensively if a host passes a string.
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }
  const b = body as Record<string, unknown> | undefined;
  if (!b || typeof b.tier !== "string" || typeof b.primary !== "string") {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const r = await fetch(`${url}/rest/v1/results`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        tier: b.tier,
        primary_animal: b.primary,
        secondary_animal: b.secondary ?? null,
        also_close: b.also_close ?? null,
        split_primary: b.split_primary ?? null,
        muddy: b.muddy ?? null,
        vector: b.vector ?? null,
      }),
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
