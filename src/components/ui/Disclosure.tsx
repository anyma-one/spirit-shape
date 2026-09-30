import { useId, useState, type ReactNode } from "react";

// A collapsible row. Used on the Tier-3 result page, where the reading, the
// mythology and the symbolic layer together run to ~1,700 words and would
// otherwise be one unbroken column.
//
// Content is unmounted while closed rather than hidden with CSS: the point is to
// cut the amount of text on screen, and a closed row costs nothing. Trade-off worth
// knowing about - browser find-in-page cannot reach text inside a closed row.
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  status,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** A quiet note beside the title, e.g. "writing…" while the report streams. */
  status?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={`disclose${open ? " is-open" : ""}`}>
      <h3 className="disclose__title">
        <button
          type="button"
          className="disclose__btn"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="disclose__label">{title}</span>
          {status && <span className="disclose__status">{status}</span>}
          <span className="disclose__mark" aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div className="disclose__panel" id={id}>
          {children}
        </div>
      )}
    </div>
  );
}
