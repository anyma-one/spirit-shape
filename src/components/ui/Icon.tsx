// Minimal Lucide-derived glyphs (MIT, lucide.dev) at ~1.6 stroke, currentColor —
// matching the handoff icon voice. Only the few the app uses.
type Name = "arrow-left" | "rotate" | "moon-star" | "lock" | "chevron-down";

export function Icon({ name, size = 18 }: { name: Name; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "moon-star":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M33 8.5a16 16 0 1 0 6.5 21.7A13 13 0 0 1 33 8.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M30 18.5l1.6 4.2 4.4 1.6-4.4 1.6L30 30l-1.6-4.1-4.4-1.6 4.4-1.6L30 18.5Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}
