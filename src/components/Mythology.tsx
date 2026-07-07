import type { RevealItem } from "../reveal";
import type { TierId } from "../data/copy";
import { Locked } from "./ui/Locked";

// Mythology panel, rendered from the tiered reveal model: the revealed paragraphs
// (L1, then L2 once unlocked) show as text; locked deeper levels render as blurred
// placeholders with an unlock CTA.
export function Mythology({
  animalName,
  paras,
  olderMyth,
  disclaimer,
  locked,
  onUnlock,
  onWaitlist,
}: {
  animalName: string;
  paras: string[];
  olderMyth: string | null;
  disclaimer: string | null;
  locked: RevealItem[];
  onUnlock: (tier: TierId) => void;
  onWaitlist?: () => void;
}) {
  if (paras.length === 0 && locked.length === 0) return null;

  return (
    <div className="panel">
      <p className="section-label">The origin of your spirit · {animalName}</p>
      <div className="reveal-list">
        {paras.map((p, i) => (
          <p key={i} className="mythology__text">
            {p}
          </p>
        ))}
        {olderMyth && (
          <div className="mythology__older">
            <p className="mythology__older-label">The older myth</p>
            <p className="mythology__text">{olderMyth}</p>
          </div>
        )}
        {disclaimer && <p className="mythology__disclaimer">{disclaimer}</p>}
        {locked.map((item) => (
          <Locked
            key={item.label}
            label={item.label}
            unlock={item.unlock!}
            onUnlock={onUnlock}
            onWaitlist={onWaitlist}
          />
        ))}
      </div>
    </div>
  );
}
