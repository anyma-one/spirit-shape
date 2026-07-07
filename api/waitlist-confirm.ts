// Serverless endpoint (Vercel Node function): step 2 of the Deep Dive waitlist double
// opt-in. The signer clicks the link we emailed (GET with ?token=...); we flip the row
// to verified=true and ping hello@anyma.one that a consented signup is confirmed. The
// response is a standalone HTML page (it opens in the user's browser from their inbox).

import {
  WAITLIST_TO,
  brandPage,
  sendEmail,
  supabaseConfig,
  supabaseHeaders,
} from "./_waitlist";

interface ReqLike {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}
interface ResLike {
  status: (code: number) => ResLike;
  setHeader: (key: string, value: string) => void;
  send: (body: string) => void;
}

function tokenFrom(req: ReqLike): string {
  const q = req.query?.token;
  if (typeof q === "string" && q) return q;
  if (Array.isArray(q) && q[0]) return q[0];
  // Fall back to parsing the raw URL if the host doesn't populate req.query.
  try {
    const u = new URL(req.url ?? "", "http://localhost");
    return u.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
}

function page(res: ResLike, code: number, title: string, message: string): void {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(code).send(brandPage(title, message));
}

interface WaitlistRow {
  email: string;
  verified: boolean;
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) {
    page(res, 501, "Not available", "The waitlist isn't configured yet. Please try again soon.");
    return;
  }

  const token = tokenFrom(req);
  if (!token) {
    page(res, 400, "Invalid link", "This confirmation link is missing its token.");
    return;
  }
  const tokenFilter = `token=eq.${encodeURIComponent(token)}`;

  // Flip to verified, but only if it was still unverified — so the notification and the
  // "confirmed!" message fire exactly once. return=representation tells us what changed.
  let updated: WaitlistRow[];
  try {
    const r = await fetch(
      `${cfg.url}/rest/v1/waitlist?${tokenFilter}&verified=eq.false&select=email,verified`,
      {
        method: "PATCH",
        headers: supabaseHeaders(cfg.key, "return=representation"),
        body: JSON.stringify({ verified: true, verified_at: new Date().toISOString() }),
      },
    );
    if (!r.ok) {
      page(res, 502, "Something went wrong", "We couldn't confirm your email. Please try again.");
      return;
    }
    updated = (await r.json()) as WaitlistRow[];
  } catch {
    page(res, 502, "Something went wrong", "We couldn't confirm your email. Please try again.");
    return;
  }

  if (updated.length > 0) {
    // Freshly confirmed — this is the real, consented signup: ping the inbox (best effort).
    const email = updated[0].email;
    await sendEmail({
      to: WAITLIST_TO,
      replyTo: email,
      subject: `Deep Dive waitlist — confirmed — ${email}`,
      text: `A Deep Dive waitlist signup was CONFIRMED (double opt-in).\n\nEmail: ${email}\nTime:  ${new Date().toISOString()}`,
    });
    page(
      res,
      200,
      "You're confirmed",
      "Thank you — your spot on the Deep Dive waitlist is confirmed. We'll email you the moment it opens.",
    );
    return;
  }

  // Nothing updated: either already confirmed, or the token is unknown. Distinguish so
  // a second click on the same link reads as reassurance, not an error.
  try {
    const r = await fetch(
      `${cfg.url}/rest/v1/waitlist?${tokenFilter}&select=verified`,
      { headers: supabaseHeaders(cfg.key, "count=none") },
    );
    const rows = r.ok ? ((await r.json()) as { verified: boolean }[]) : [];
    if (rows.length > 0 && rows[0].verified) {
      page(res, 200, "Already confirmed", "You're already on the Deep Dive waitlist — nothing more to do.");
      return;
    }
  } catch {
    // fall through to the generic invalid-link message
  }
  page(res, 400, "Invalid link", "This confirmation link is invalid or has expired.");
}
