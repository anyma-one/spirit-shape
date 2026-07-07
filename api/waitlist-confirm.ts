// Serverless endpoint (Vercel Node function): step 2 of the Deep Dive waitlist double
// opt-in. The signer clicks the link we emailed (GET ?token=...); we flip the row to
// verified=true and ping hello@anyma.one. The response is a standalone HTML page (it
// opens in the user's browser from their inbox).
//
// SELF-CONTAINED on purpose — see the note in api/waitlist.ts (Vercel doesn't make a
// function's imports available at runtime here, so helpers are inlined).

const WAITLIST_TO = "hello@anyma.one";
const SITE_URL = process.env.WAITLIST_SITE_URL ?? "https://www.anyma.one";
const RESEND_FROM = process.env.WAITLIST_FROM ?? "anyma <hello@anyma.one>";

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
interface WaitlistRow {
  email: string;
  verified: boolean;
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function supabaseHeaders(key: string, prefer: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: [opts.to], subject: opts.subject, text: opts.text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// A minimal on-brand standalone HTML page for the confirm-link landing.
function brandPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · anyma</title>
<style>
  :root { color-scheme: dark; }
  /* Self-hosted brand fonts — the same variable woff2 the app serves at /fonts/ (Latin
     subset covers this page's copy). Without these the heading falls back to Georgia. */
  @font-face { font-family:"Cormorant Garamond"; font-style:normal; font-weight:400 700;
    font-display:swap; src:url(${SITE_URL}/fonts/cormorant-garamond-5.woff2) format("woff2"); }
  @font-face { font-family:"Hanken Grotesk"; font-style:normal; font-weight:300 700;
    font-display:swap; src:url(${SITE_URL}/fonts/hanken-grotesk-4.woff2) format("woff2"); }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#0A1124; color:#EDE8D9;
    font-family:"Hanken Grotesk",ui-sans-serif,system-ui,-apple-system,sans-serif; padding:24px; }
  .card { max-width:460px; width:100%; text-align:center; background:#14253F;
    border:1px solid rgba(237,232,217,0.12); border-radius:24px; padding:56px 40px;
    box-shadow:0 24px 80px rgba(0,0,0,0.5); }
  .logo { width:104px; height:auto; opacity:0.92; margin:0 0 30px; }
  h1 { font-family:"Cormorant Garamond",Georgia,serif; font-weight:600; font-size:2.4rem;
    line-height:1.1; letter-spacing:0.01em; margin:0 0 16px; }
  p { color:rgba(237,232,217,0.7); font-size:1rem; line-height:1.6; margin:0 0 32px; }
  a.btn { display:inline-block; background:transparent; color:#4FC4C4; text-decoration:none;
    font-weight:600; font-size:0.95rem; padding:13px 32px; border-radius:999px;
    border:1px solid rgba(79,196,196,0.45); box-shadow:inset 0 0 16px rgba(79,196,196,0.06);
    transition:background .25s ease,color .25s ease,border-color .25s ease,box-shadow .25s ease; }
  a.btn:hover { background:#4FC4C4; color:#0A1124; border-color:#4FC4C4;
    box-shadow:0 0 20px 2px rgba(79,196,196,0.4),0 0 46px 10px rgba(79,196,196,0.18); }
</style></head>
<body><div class="card">
  <img class="logo" src="${SITE_URL}/anyma-logo.png" alt="anyma">
  <h1>${title}</h1>
  <p>${message}</p>
  <a class="btn" href="${SITE_URL}">Back to anyma</a>
</div></body></html>`;
}

function tokenFrom(req: ReqLike): string {
  const q = req.query?.token;
  if (typeof q === "string" && q) return q;
  if (Array.isArray(q) && q[0]) return q[0];
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
    // Freshly confirmed — the real, consented signup: ping the inbox (best effort).
    const email = updated[0].email;
    await sendEmail({
      to: WAITLIST_TO,
      subject: `Deep Dive waitlist — confirmed — ${email}`,
      text: `A Deep Dive waitlist signup was CONFIRMED (double opt-in).\n\nEmail: ${email}\nTime:  ${new Date().toISOString()}`,
    });
    page(
      res,
      200,
      "You're on the list!",
      "Thank you for trusting anyma. Your spot on the Deep Dive waitlist is confirmed. We'll email you the moment it goes live.",
    );
    return;
  }

  // Nothing updated: either already confirmed, or the token is unknown. Distinguish so a
  // second click on the same link reads as reassurance, not an error.
  try {
    const r = await fetch(`${cfg.url}/rest/v1/waitlist?${tokenFilter}&select=verified`, {
      headers: supabaseHeaders(cfg.key, "count=none"),
    });
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
