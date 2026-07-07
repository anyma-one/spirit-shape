// Shared helpers for the Deep Dive waitlist serverless functions. The leading `_`
// keeps Vercel from exposing this file as its own route; it's imported by
// api/waitlist.ts (signup) and api/waitlist-confirm.ts (double opt-in confirm).
//
// Config (host env, never in the client bundle):
//   SUPABASE_URL                 required
//   SUPABASE_SERVICE_ROLE_KEY    required (service_role; bypasses RLS, server-only)
//   RESEND_API_KEY               required to actually send email
//   WAITLIST_FROM                optional override of the From address
//
// Sending confirmation email to the SIGNER (double opt-in) requires a VERIFIED domain
// in Resend — the shared onboarding@resend.dev sender can only email your own account
// address. Verify anyma.one in Resend, then WAITLIST_FROM defaults below already use it.

export const WAITLIST_TO = "hello@anyma.one";
export const SITE_URL = process.env.WAITLIST_SITE_URL ?? "https://www.anyma.one";
// From a verified domain so we can email arbitrary signers, not just our own inbox.
export const RESEND_FROM = process.env.WAITLIST_FROM ?? "anyma <hello@anyma.one>";
export const KNOWN_SOURCES = new Set(["home-card", "tier-nav", "locked", "nudge", "unknown"]);

// Conservative: one @, a dot in the domain, no spaces. Rejects obvious typos before
// we store or email them. Mirrors src/persistence/waitlist.ts isValidEmail.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function supabaseHeaders(key: string, prefer: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

// Best-effort send via Resend. Returns whether it was attempted+accepted; never throws.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// A minimal on-brand standalone HTML page for the confirm-link landing (the user
// clicks the link in their email client, so this must render on its own).
export function brandPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · anyma</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#0A1124; color:#EDE8D9;
    font-family:"Hanken Grotesk",ui-sans-serif,system-ui,-apple-system,sans-serif; padding:24px; }
  .card { max-width:440px; text-align:center; background:#14253F; border:1px solid rgba(237,232,217,0.12);
    border-radius:24px; padding:48px 32px; box-shadow:0 24px 80px rgba(0,0,0,0.5); }
  h1 { font-family:"Cormorant Garamond",Georgia,serif; font-size:2rem; margin:0 0 12px; }
  p { color:rgba(237,232,217,0.7); line-height:1.55; margin:0 0 24px; }
  a { display:inline-block; background:#4FC4C4; color:#0A1124; text-decoration:none;
    font-weight:600; padding:12px 28px; border-radius:999px; }
</style></head>
<body><div class="card">
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${SITE_URL}">Back to anyma</a>
</div></body></html>`;
}
