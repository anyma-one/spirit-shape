import { SYMBOLIC_FRAMING } from "../symbolic";
import type { RevealItem } from "../reveal";
import type { TierId } from "../data/copy";
import { Locked } from "./ui/Locked";

// Symbolic profile panel, rendered from the tiered reveal model: revealed values
// show normally; locked layers (Ruling planet at Tier 1, Mythic role) render as
// blurred placeholders with an unlock CTA.
export function SymbolicProfile({
  items,
  onUnlock,
}: {
  items: RevealItem[];
  onUnlock: (tier: TierId) => void;
}) {
  return (
    <div className="panel">
      <p className="section-label">Symbolic echoes</p>
      <p className="symbolic__framing">{SYMBOLIC_FRAMING}</p>
      <div className="reveal-list">
        {items.map((item) =>
          item.value !== null ? (
            <div className="reveal-row" key={item.label}>
              <div className="reveal-row__head">
                <span className="reveal-row__key">{item.label}</span>
                <span className="reveal-row__val">{item.value}</span>
              </div>
              {item.note && <p className="reveal-row__note">{item.note}</p>}
            </div>
          ) : (
            <Locked
              key={item.label}
              label={item.label}
              unlock={item.unlock!}
              onUnlock={onUnlock}
              tight
            />
          ),
        )}
      </div>
    </div>
  );
}
