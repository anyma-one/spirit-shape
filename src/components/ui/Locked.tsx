import type { Unlock } from "../../reveal";
import type { TierId } from "../../data/copy";
import { Icon } from "./Icon";

// Locked-content placeholder (patch: tiered-blur). Shows the category label so the
// user knows WHAT they'd unlock, a blurred decorative shape that holds NO real
// content (the value was never computed/sent), and an unlock CTA for the tier that
// opens it. The blur is a style on these placeholder bars, never a filter over real
// text. `tight` is the compact one-line variant for symbolic values (which are a
// single word when revealed); the default block variant suits mythology paragraphs.
export function Locked({
  label,
  unlock,
  onUnlock,
  onWaitlist,
  tight = false,
}: {
  label: string;
  unlock: Unlock;
  onUnlock: (tier: TierId) => void;
  /** When the unlock tier isn't built yet (Deep Dive), open the waitlist instead of
      showing an inert "soon" chip. */
  onWaitlist?: () => void;
  tight?: boolean;
}) {
  const available = unlock.tierId !== null;
  // Not built yet, but we can still capture interest via the waitlist.
  const waitlistable = !available && !!onWaitlist;
  const cta = waitlistable ? (
    <button className="locked__cta" title="Join the waitlist" onClick={onWaitlist}>
      Unlock at {unlock.label}
      <span className="locked__soon">waitlist</span>
    </button>
  ) : (
    <button
      className="locked__cta"
      disabled={!available}
      title={available ? undefined : "Coming soon"}
      onClick={available ? () => onUnlock(unlock.tierId as TierId) : undefined}
    >
      Unlock at {unlock.label}
      {!available && <span className="locked__soon">soon</span>}
    </button>
  );

  const labelEl = (
    <span className="locked__label">
      <Icon name="lock" size={13} />
      {label}
    </span>
  );

  if (tight) {
    // Mirrors a revealed symbolic row: label left, a single short blurred bar where
    // the one-word value would sit, with the unlock CTA beneath.
    return (
      <div className="locked locked--tight">
        <div className="locked__line">
          {labelEl}
          <span className="locked__bar" aria-hidden="true" />
        </div>
        {cta}
      </div>
    );
  }

  return (
    <div className="locked">
      {labelEl}
      <div className="locked__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {cta}
    </div>
  );
}
