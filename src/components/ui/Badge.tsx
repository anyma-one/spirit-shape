import type { ReactNode } from "react";

type Variant = "tier" | "accent" | "neutral" | "glow";

// Re-skin of the handoff Badge (feedback/Badge.jsx). Airy uppercase pill.
export function Badge({ variant = "neutral", children }: { variant?: Variant; children: ReactNode }) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
