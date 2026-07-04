import { COMING_SOON, MEDICAL_FOOTER } from "../data/copy";
import type { NudgeCopy } from "../data/copy";
import { Note } from "./ui/Note";
import { Button } from "./ui/Button";

// §6a Barnum / conversion nudge (Variant A) as the curiosity-toned DisclaimerNote.
// The button climbs one tier up when that tier exists; else a disabled teaser.
export function ConversionNudge({
  nudge,
  onAdvance,
}: {
  nudge: NudgeCopy;
  onAdvance: () => void;
}) {
  const available = nudge.target !== null;
  return (
    <Note tone="curiosity" title={nudge.title}>
      <p className="note__body">{nudge.body}</p>
      <Button
        className={`note__cta${available ? "" : " note__cta--soon"}`}
        variant={available ? "tier" : "ghost"}
        caps
        onClick={available ? onAdvance : undefined}
        disabled={!available}
        title={available ? undefined : COMING_SOON}
      >
        {nudge.button}
        {!available && <span className="note__soon">{COMING_SOON}</span>}
      </Button>
    </Note>
  );
}

// §6b medical / mental-health disclaimer. Quiet footer, tonally separate.
export function MedicalFooter() {
  return <p className="medical">{MEDICAL_FOOTER}</p>;
}
