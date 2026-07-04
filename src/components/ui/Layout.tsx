import type { ReactNode } from "react";
import type { TierId } from "../../data/copy";
import { TIERS, TIER_ORDER } from "../../tiers";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { ProgressBar } from "./ProgressBar";

// Map our tier ids to the design system's [data-tier] scope names.
export const tierScope = (id: TierId): "speed" | "soul" => (id === "speed-run" ? "speed" : "soul");

interface HeaderConfig {
  /** Active tier — sets the mood scope and shows the tier badge. */
  tier?: TierId | null;
  showBack?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  progress?: { current: number; total: number; label?: string };
  /** When set, the right side becomes tier navigation (jump to another tier). */
  onSelectTier?: (tier: TierId) => void;
}

// The night Shell + adaptive Header (handoff: screens.jsx Shell/Header). The
// atmosphere persists across screen transitions; content sits above it (z-index).
export function Layout({ header, children }: { header: HeaderConfig; children: ReactNode }) {
  const { tier, showBack, onBack, onHome, progress, onSelectTier } = header;
  return (
    <div className="app sa-night sa-grain" data-tier={tier ? tierScope(tier) : undefined}>
      <div className="sa-haze" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sa-stars" aria-hidden="true" />

      <div className="app__content">
        <header className="appbar">
          <div style={{ flexShrink: 0 }}>
            {showBack ? (
              <button className="iconbtn" aria-label="Back" onClick={onBack}>
                <Icon name="arrow-left" />
              </button>
            ) : (
              <button className="brand-lockup" onClick={onHome} aria-label="anyma — home">
                <img className="brand-lockup__logo" src="/anyma-logo.png" alt="anyma" />
              </button>
            )}
          </div>

          {progress ? (
            <div className="appbar__progress">
              <ProgressBar {...progress} />
            </div>
          ) : (
            <div className="appbar__spacer" />
          )}

          <div className="appbar__right">
            {onSelectTier ? (
              <nav className="tier-nav" aria-label="Jump to tier">
                {TIER_ORDER.map((id) =>
                  id === tier ? (
                    <Badge key={id} variant="tier">
                      {TIERS[id].name}
                    </Badge>
                  ) : (
                    <button
                      key={id}
                      type="button"
                      className="tier-nav__link"
                      onClick={() => onSelectTier(id)}
                    >
                      {TIERS[id].name}
                    </button>
                  ),
                )}
                {/* Deep Dive (Phase 3) is not built yet — shown grayed. */}
                <span
                  className="tier-nav__link tier-nav__link--soon"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Deep Dive
                </span>
              </nav>
            ) : (
              tier && <Badge variant="tier">{TIERS[tier].name}</Badge>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
