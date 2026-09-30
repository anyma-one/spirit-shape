import { useEffect, useRef, useState } from "react";
import { joinWaitlist } from "../persistence/waitlist";
import type { WaitlistSource } from "../persistence/waitlist";

// Deep Dive waitlist modal. Opened from the three "Deep Dive" touchpoints (the home
// card, the tier-nav link, the locked-content CTA). One email field; awaits the
// server so the user gets a real confirmation. Closes on backdrop click or Escape.
// Wording per list. "deepen" is for people who just finished the Deep Dive, so the
// default "Deep Dive · Coming soon" copy would be wrong for them.
const COPY = {
  waitlist: {
    label: "Join the Deep Dive waitlist",
    eyebrow: "Deep Dive · Coming soon",
    title: "Go Deeper, Learn More",
    lede: "Your results feel close, but something seems to be missing…? With the Deep Dive you will get an opportunity to answer in your own words and you will receive an individual report plus full access to the mythological background of your spirit shape.",
    call: "Be one of the first to dive deeper.",
    button: "Join the waitlist",
    busy: "Joining…",
    pendingText:
      "We've sent you a confirmation link. Click it to be among the first to try the Deep Dive. We'll email you the moment it goes live.",
    verifiedText: "You're already on the Deep Dive waitlist. We'll email you the moment it opens.",
    fine: "We'll email you once to confirm and when the Deep Dive opens. Unsubscribe or ask us to delete your email anytime at hello@anyma.one. By joining, you consent to us storing your email for this purpose.",
  },
  deepen: {
    label: "Sign up to deepen the Deep Dive",
    eyebrow: "Deepen the Deep Dive",
    title: "Go Further From Here",
    lede: "We're building a next layer that picks up where this reading ends. Leave your email and we'll let you know when you can deepen your Deep Dive.",
    call: "Be one of the first to go further.",
    button: "Sign me up",
    busy: "Signing up…",
    pendingText:
      "We've sent you a confirmation link. Click it and we'll email you when you can deepen your Deep Dive.",
    verifiedText: "You're on the list. We'll email you when you can deepen your Deep Dive.",
    fine: "We'll email you once to confirm and when it opens. Unsubscribe or ask us to delete your email anytime at hello@anyma.one. By signing up, you consent to us storing your email for this purpose.",
  },
};

export function WaitlistModal({
  source,
  onClose,
}: {
  source: WaitlistSource;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  // Which success copy to show once done: awaiting-confirmation vs already-confirmed.
  const [done, setDone] = useState<"pending" | "already_verified">("pending");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = source === "deepen" ? COPY.deepen : COPY.waitlist;

  // Autofocus the field, and close on Escape.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setError(null);
    setStatus("submitting");
    const outcome = await joinWaitlist(email, source);
    if (outcome.ok) {
      setDone(outcome.status);
      setStatus("done");
    } else {
      setError(outcome.message);
      setStatus("idle");
    }
  }

  return (
    <div className="waitlist" role="dialog" aria-modal="true" aria-label={copy.label}>
      <div className="waitlist__backdrop" onClick={onClose} />
      <div className="waitlist__panel" data-tier="deep">
        <button className="waitlist__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {status === "done" ? (
          <div className="waitlist__done">
            <h2 className="waitlist__title">
              {done === "already_verified" ? "You're already in" : "Check your inbox"}
            </h2>
            <p className="waitlist__lede">
              {done === "already_verified" ? copy.verifiedText : copy.pendingText}
            </p>
            <button className="btn btn--tier btn--full" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <span className="waitlist__eyebrow">{copy.eyebrow}</span>
            <h2 className="waitlist__title">{copy.title}</h2>
            <p className="waitlist__lede">{copy.lede}</p>
            <p className="waitlist__call">{copy.call}</p>
            <form className="waitlist__form" onSubmit={submit}>
              <input
                ref={inputRef}
                type="email"
                className="waitlist__input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-label="Email address"
                aria-invalid={error ? true : undefined}
                disabled={status === "submitting"}
              />
              {error && (
                <p className="waitlist__error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="btn btn--tier btn--full"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? copy.busy : copy.button}
              </button>
            </form>
            <p className="waitlist__fine">{copy.fine}</p>
          </>
        )}
      </div>
    </div>
  );
}
