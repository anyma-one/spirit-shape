// Keeps the Supabase project from being paused for inactivity.
//
// SELF-CONTAINED (README §4 / HANDOVER §4).
//
// Supabase pauses a free-plan project after about a week with no database activity,
// and this site's traffic alone does not reliably prevent that. A Vercel Cron job
// (vercel.json) calls this once a day; it makes one tiny read (a single waitlist id)
// so the project always counts as active. It returns nothing from the table.
//
// If CRON_SECRET is set in Vercel, Vercel sends it as `Authorization: Bearer …` on
// cron calls and anything else is refused. Without it the endpoint still only does
// that one harmless read.

interface ReqLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers?.authorization;
    if ((Array.isArray(auth) ? auth[0] : auth) !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(501).json({ error: "Supabase not configured" });
    return;
  }
  try {
    const r = await fetch(`${url}/rest/v1/waitlist?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      res.status(502).json({ ok: false, status: r.status });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ ok: false, detail });
  }
}
