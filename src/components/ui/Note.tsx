import type { ReactNode } from "react";

// Re-skin of the handoff DisclaimerNote (feedback/DisclaimerNote.jsx). The
// signature honesty callout: faint luminous panel + fine accent edge + airy
// uppercase title. honesty = turquoise-keyed; curiosity = tier-keyed nudge.
// Callers provide the body (and any CTA) as children so the nudge can embed a button.
export function Note({
  tone = "honesty",
  title,
  children,
}: {
  tone?: "honesty" | "curiosity";
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className={`note note--${tone}`}>
      {title && <p className="note__title">{title}</p>}
      {children}
    </aside>
  );
}
