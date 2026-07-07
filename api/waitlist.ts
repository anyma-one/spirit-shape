// Serverless endpoint (Vercel Node function): step 1 of the Deep Dive waitlist
// double opt-in. Takes one email + a source tag, upserts an UNVERIFIED row in
// Supabase, and emails the SIGNER a confirmation link. The hello@anyma.one inbox
// ping fires later, on confirm (api/waitlist-confirm.ts) — so you're only notified
// about consented, verified signups.
//
// Graceful degradation:
//   - Supabase missing       -> 501, the modal shows "not live yet".
//   - RESEND_API_KEY missing  -> row saved, but no email can be sent -> reported as an
//                                error so we never silently strand an unverifiable row.
//   - Re-signup (same email)  -> upsert; if still unverified, resend the link; if already
//                                verified, tell them so (no new email).

import {
  KNOWN_SOURCES,
  SITE_URL,
  normalizeEmail,
  sendEmail,
  supabaseConfig,
  supabaseHeaders,
} from "./_waitlist";

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

  // Upsert on the unique email. merge-duplicates updates only the columns we send, so
  // an existing row's verified/token/verified_at are preserved; a new row defaults to
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

  // Send the confirmation link to the signer. This is required for opt-in, so a failure
  // here IS surfaced (unlike the later inbox ping, which is a convenience).
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
