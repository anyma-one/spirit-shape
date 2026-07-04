// Re-skin of the handoff ProgressBar (feedback/ProgressBar.jsx). Fill is the
// tier mood color; airy uppercase label + zero-padded count. Themed by [data-tier].
export function ProgressBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, total ? current / total : 0)) * 100;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="progress">
      <div className="progress__label">
        <span>{label ?? "Progress"}</span>
        <span className="progress__count">
          {pad(current)} / {pad(total)}
        </span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
