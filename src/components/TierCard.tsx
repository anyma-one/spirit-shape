import { Badge } from "./ui/Badge";

// Click-to-start tier card. The whole card is the primary action (resume-or-start,
// decided by the caller); a small "Start over" appears only when a saved session
// exists. The turquoise aura is a hover effect (see styles.css). data-tier on root.
export function TierCard({
  scope,
  badgeLabel,
  name,
  tagline,
  meta,
  commitment,
  disabled = false,
  onSelect,
  onStartOver,
}: {
  scope: "speed" | "soul" | "deep";
  badgeLabel: string;
  name: string;
  tagline: string;
  meta: string;
  commitment: string;
  disabled?: boolean;
  onSelect?: () => void;
  onStartOver?: () => void;
}) {
  return (
    <div className={`tier-card${disabled ? " tier-card--disabled" : ""}`} data-tier={scope}>
      <div className="tier-card__body">
        <div className="tier-card__head">
          <Badge variant="tier">{badgeLabel}</Badge>
        </div>
        <div className="tier-card__text">
          <h2 className="tier-card__name">{name}</h2>
          <p className="tier-card__tagline">{tagline}</p>
        </div>
        <div className="tier-card__foot">
          <span className="tier-card__meta">{meta}</span>
          <span className="tier-card__commit">{commitment}</span>
        </div>
      </div>

      {!disabled && (
        <button className="tier-card__main" onClick={onSelect} aria-label={`Start ${name}`} />
      )}
      {!disabled && onStartOver && (
        <button className="tier-card__startover" onClick={onStartOver}>
          Start over
        </button>
      )}
    </div>
  );
}
