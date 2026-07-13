// Client side of the Deep Dive waitlist. Unlike remoteLog (fire-and-forget result
// logging), this AWAITS the server so the modal can confirm the signup to the user.

export type WaitlistSource = "home-card" | "tier-nav" | "locked" | "nudge" | "link";

// "pending" = confirmation email sent, awaiting the click; "already_verified" = they'd
// confirmed on a previous visit. Both are success; the modal words them differently.
export type WaitlistStatus = "pending" | "already_verified";

export type WaitlistOutcome =
  | { ok: true; status: WaitlistStatus }
  | { ok: false; message: string };

// Mirrors the server's guard (api/waitlist.ts) so obvious typos are caught before a
// round trip. Exported for unit tests.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const email = raw.trim();
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

export async function joinWaitlist(email: string, source: WaitlistSource): Promise<WaitlistOutcome> {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, source }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { status?: WaitlistStatus } | null;
      return { ok: true, status: data?.status === "already_verified" ? "already_verified" : "pending" };
    }
    if (res.status === 501) {
      return { ok: false, message: "The waitlist isn't live yet — please try again soon." };
    }
    // Surface the server's message when it gave us one; otherwise a generic line.
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, message: data?.error ?? "Something went wrong. Please try again." };
  } catch {
    return { ok: false, message: "Network error — please check your connection and try again." };
  }
}
