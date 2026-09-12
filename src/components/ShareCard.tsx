import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/Button";
import { renderCard, deliverCard } from "../share/renderCard";
import { CARD_SPECS, type CardContent, type CardFormat } from "../share/cardLayout";

// "Share your shape" — a filled CTA that opens a modal showing both cards as real
// rendered previews; picking one downloads it (or opens the OS share sheet where
// that exists).
//
// The previews are the actual PNGs, not mock-ups: the reader sees exactly what they
// are about to send. Nothing is uploaded and nothing is stored — the card is an
// image they place themselves, which is why this needs no consent flow even though
// the Tier-3 card carries their own words. See share/renderCard.ts.

const FORMATS: { key: CardFormat; label: string; note: string }[] = [
  { key: "square", label: "Square", note: "Feeds — Instagram, WhatsApp, X" },
  { key: "story", label: "Story", note: "Instagram and WhatsApp stories" },
];

function ShareModal({
  content,
  artUrl,
  filenameBase,
  onClose,
}: {
  content: CardContent;
  artUrl: string;
  filenameBase: string;
  onClose: () => void;
}) {
  const [previews, setPreviews] = useState<Partial<Record<CardFormat, string>>>({});
  const [blobs, setBlobs] = useState<Partial<Record<CardFormat, Blob>>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Render both cards once, on open. Object URLs are revoked on unmount — without
  // that, every open of this modal would leak two full-size PNGs.
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      try {
        for (const { key } of FORMATS) {
          const blob = await renderCard({ format: key, content, artUrl });
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setBlobs((b) => ({ ...b, [key]: blob }));
          setPreviews((p) => ({ ...p, [key]: url }));
        }
      } catch {
        if (!cancelled) setError("The cards could not be made. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
    };
    // content/artUrl are stable for the life of a result screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function take(format: CardFormat) {
    const blob = blobs[format];
    if (!blob) return;
    const how = await deliverCard(blob, `${filenameBase}-${format}.png`);
    setStatus(how === "shared" ? "Shared." : "Saved to your downloads.");
  }

  // PORTALLED TO <body> ON PURPOSE. `.view` carries the sa-rise animation, so it has
  // a transform — which makes it the containing block for `position: fixed`, and a
  // modal rendered inside it anchors to the view instead of the viewport (measured:
  // top -309px on a 720px screen). WaitlistModal dodges this by living at App level;
  // this component is used inside the view, so it portals out instead.
  return createPortal(
    <div className="sharem" role="dialog" aria-modal="true" aria-label="Share your shape">
      <div className="sharem__backdrop" onClick={onClose} />
      <div className="sharem__panel" data-tier="deep">
        <button ref={closeRef} className="waitlist__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="sharem__title">Share your shape</h2>
        <p className="sharem__lede">Pick a shape to download.</p>

        {error ? (
          <p className="sharem__status">{error}</p>
        ) : (
          <div className="sharem__grid">
            {FORMATS.map(({ key, label, note }) => (
              <button
                key={key}
                type="button"
                className="sharem__option"
                onClick={() => take(key)}
                disabled={!previews[key]}
              >
                <span
                  className="sharem__frame"
                  style={{ aspectRatio: `${CARD_SPECS[key].width} / ${CARD_SPECS[key].height}` }}
                >
                  {previews[key] ? (
                    <img className="sharem__img" src={previews[key]} alt={`${label} card preview`} />
                  ) : (
                    <span className="sharem__pending">Drawing…</span>
                  )}
                </span>
                <span className="sharem__label">{label}</span>
                <span className="sharem__note">{note}</span>
              </button>
            ))}
          </div>
        )}

        <p className="sharem__status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function ShareCard({
  content,
  artUrl,
  filenameBase,
}: {
  content: CardContent;
  artUrl: string;
  filenameBase: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="share">
      {/* Turquoise rather than the tier colour: this is an action, and turquoise is
          the app's interactive voice (--accent), the same one the +/− marks carry. */}
      <Button variant="tier" size="lg" caps glow className="share__cta" onClick={() => setOpen(true)}>
        Share your shape
      </Button>
      {open && (
        <ShareModal
          content={content}
          artUrl={artUrl}
          filenameBase={filenameBase}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
