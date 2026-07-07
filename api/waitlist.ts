// Serverless endpoint (Vercel Node function): step 1 of the Deep Dive waitlist double
// opt-in. Upserts an UNVERIFIED row in Supabase and emails the SIGNER a confirmation
// link. The hello@anyma.one inbox ping fires later, on confirm (api/waitlist-confirm.ts).
//
// SELF-CONTAINED on purpose: this Vercel project doesn't make a function's imports
// available at runtime (and `_`-prefixed helper files are excluded from the bundle), so
// each function inlines its helpers — same pattern as the working api/log-result.ts.
//
// Config (host env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required); RESEND_API_KEY
// (required to send); WAITLIST_FROM / WAITLIST_SITE_URL (optional overrides).

const SITE_URL = process.env.WAITLIST_SITE_URL ?? "https://www.anyma.one";
const RESEND_FROM = process.env.WAITLIST_FROM ?? "anyma <hello@anyma.one>";
const KNOWN_SOURCES = new Set(["home-card", "tier-nav", "locked", "nudge", "unknown"]);
// Conservative: one @, a dot in the domain, no spaces. Mirrors the client guard.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ReqLike {
  method?: string;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}
interface WaitlistRow {
  token: string;
  verified: boolean;
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
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

// Best-effort send via Resend; returns whether it was accepted. Never throws.
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

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cfg = supabaseConfig();
  if (!cfg) {
    res.status(501).json({ error: "Waitlist not configured" });
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
  const email = normalizeEmail(b?.email);
  if (!email) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  const source =
    typeof b?.source === "string" && KNOWN_SOURCES.has(b.source) ? b.source : "unknown";

  // Upsert on the unique email. merge-duplicates updates only the columns we send, so an
  // existing row's verified/token/verified_at are preserved; a new row defaults to
  // verified=false with a fresh token. return=representation gives us that token back.
  let row: WaitlistRow;
  try {
    const r = await fetch(`${cfg.url}/rest/v1/waitlist?on_conflict=email&select=token,verified`, {
      method: "POST",
      headers: supabaseHeaders(cfg.key, "return=representation,resolution=merge-duplicates"),
      body: JSON.stringify({ email, source, consent_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      res.status(502).json({ error: "Could not save signup", detail });
      return;
    }
    const rows = (await r.json()) as WaitlistRow[];
    if (!rows.length) {
      res.status(502).json({ error: "Could not save signup" });
      return;
    }
    row = rows[0];
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Could not save signup", detail });
    return;
  }

  // Already confirmed on a previous visit — nothing more to do, don't re-email.
  if (row.verified) {
    res.status(200).json({ ok: true, status: "already_verified" });
    return;
  }

  // Send the confirmation link to the signer. Required for opt-in, so a failure here IS
  // surfaced (unlike the later inbox ping, which is a convenience).
  const confirmUrl = `${SITE_URL}/api/waitlist-confirm?token=${encodeURIComponent(row.token)}`;
  const sent = await sendEmail({
    to: email,
    subject: "Confirm your anyma Deep Dive waitlist signup",
    text: `Almost there — please confirm you'd like to join the anyma Deep Dive waitlist.\n\nConfirm here:\n${confirmUrl}\n\nIf you didn't request this, you can ignore this email and you won't hear from us again.`,
  });
  if (!sent) {
    res.status(502).json({ error: "We couldn't send the confirmation email. Please try again." });
    return;
  }

  res.status(200).json({ ok: true, status: "pending" });
}
