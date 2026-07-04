import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "tier" | "ghost" | "luminous" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  caps?: boolean;
  glow?: boolean;
  full?: boolean;
  children: ReactNode;
}

// Re-skin of the handoff Button (forms/Button.jsx) as a className-driven control.
// Ghost is the quiet default; `tier` fills with the active --tier mood color.
export function Button({
  variant = "ghost",
  size = "md",
  caps = false,
  glow = false,
  full = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "lg" && "btn--lg",
    size === "sm" && "btn--sm",
    caps && "btn--caps",
    glow && "btn--glow",
    full && "btn--full",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
