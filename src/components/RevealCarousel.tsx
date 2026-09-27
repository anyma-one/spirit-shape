import { memo, useEffect, useRef } from "react";
import { initRevealCarousel } from "./ui/revealCarousel";
import type { FocusKey } from "./ui/revealCarousel";

export interface CarouselAnimal {
  key: FocusKey;
  rankLabel: string; // "Primary" | "Secondary" | "Also close"
  name: string;
  epithet: string;
  pct?: number;
  art: string; // /animals/anyma_x.png
  tint: string; // CSS colour for the mask fill
  /** Deep Dive only: a full-colour card shown in place of the tinted line-art mask. */
  card?: string;
  open: boolean; // clickable → focusable
  softLock: boolean; // filled look but shows lock (Secondary in Speed)
  unlockHint: string;
}

const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const LockGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// The reveal carousel: three tinted animal masks that rotate between focus/runner/
// also-close slots, plus name/epithet, browsable pills, and the hint line. All the
// motion (intro bloom, pan, float/pulse, crossfades) lives in the imperative
// controller (ui/revealCarousel.ts); React only renders the static DOM and reports
// focus changes up via onFocus so the parent can swap the profile body.
//
// Memoised + stable props so parent re-renders (on focus change) never remount this
// and interrupt the controller's animations.
export const RevealCarousel = memo(function RevealCarousel({
  animals,
  tierScope,
  muddy,
  onFocus,
  onLockedClick,
  hint = "Select a spirit for more insight",
}: {
  animals: CarouselAnimal[];
  tierScope: "speed" | "soul" | "deep";
  muddy: boolean;
  onFocus: (key: FocusKey) => void;
  onLockedClick?: () => void;
  /**
   * Prompt under the pills. `null` hides it — the Deep Dive passes null because both
   * animals are already discussed in the reading, so the pills promise an "insight"
   * they do not add. It only feeds locked-pill hover text, and Tier 3 locks nothing.
   */
  hint?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const primary = animals[0];
  // Cards are portrait, so the scene and slots get their own sizing (styles.css).
  const cards = animals.some((a) => a.card);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controller = initRevealCarousel(root, {
      tierScope,
      order: animals.map((a) => a.key),
      pills: animals.map((a) => ({
        key: a.key,
        open: a.open,
        softLock: a.softLock,
        unlockHint: a.unlockHint,
      })),
      text: Object.fromEntries(animals.map((a) => [a.key, { name: a.name, epithet: a.epithet }])),
      baseHint: hint ?? "",
      onFocus,
      onLockedClick,
    });
    return () => controller.destroy();
    // animals/tierScope are stable (useMemo in parent); onFocus stable (setState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={cards ? "reveal-carousel reveal-carousel--cards" : "reveal-carousel"}>
      <span className="rc-kicker rc-fade">{muddy ? "Closest read" : "Your match"}</span>

      <div className="rc-scene">
        <div className="rc-echo" aria-hidden="true" />
        <div className="rc-core" aria-hidden="true" />
        {animals.map((a) => (
          // Wrapper carries the filter (blur + drop-shadow glow); the inner fill
          // carries the mask + tint. Filter is applied BEFORE mask in the CSS
          // pipeline, so putting them on the same element would clip the glow/blur
          // to the mask shape — nesting keeps the glow following the animal's alpha.
          <div key={a.key} className="rc-an" data-key={a.key} role="img" aria-label={`${a.name} spirit animal`}>
            {a.card ? (
              // The card is already a finished painting, so it is shown as-is; the
              // controller's glow + blur on the wrapper still follow its alpha (the
              // rounded corners are transparent).
              <>
                <img className="rc-an-card" src={a.card} alt="" draggable={false} />
                {/* Light on the card itself: a faint inner glow plus a slow sheen. */}
                <span className="rc-an-sheen" aria-hidden="true" />
              </>
            ) : (
              <div
                className="rc-an-fill"
                style={{
                  background: a.tint,
                  WebkitMaskImage: `url(${a.art})`,
                  maskImage: `url(${a.art})`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rc-textblock rc-fade">
        <h1 className="rc-name">{primary.name}</h1>
        <p className="rc-epithet">{primary.epithet}</p>
      </div>

      <div className="rc-pills rc-fade">
        {animals.map((a) => (
          <button key={a.key} type="button" className={`rc-pill rc-pill-${a.key}`} data-key={a.key}>
            <span className="rc-pill-label">
              {a.rankLabel} · {a.name}
              {a.pct != null ? ` ${a.pct}%` : ""}
            </span>
            <span className="rc-chev" aria-hidden="true">
              <ChevronDown />
            </span>
            <span className="rc-lock" aria-hidden="true">
              <LockGlyph />
            </span>
          </button>
        ))}
      </div>

      {hint && <div className="rc-hint rc-fade">{hint}</div>}
    </div>
  );
});
