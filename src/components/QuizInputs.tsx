import { useEffect, useRef, useState } from "react";
import type { AnswerOption, PadConfig, SliderConfig } from "../engine";

// Soul Search v0.6 input widgets + interaction behaviour (spec §7). Discrete formats
// commit on the act; continuous formats (slider, pad) commit on SETTLE — a short quiet
// window after the last input — so a value only passed through mid-gesture is never
// captured. Slider/pad have no Continue button; rank keeps one (no single final act).

// ---- Slider: five notches (-2..+2), pole labels, no centre default. ----
const NOTCHES = [-2, -1, 0, 1, 2] as const;
const NOTCH_ARIA: Record<number, string> = {
  [-2]: "strongly left",
  [-1]: "left",
  [0]: "middle",
  [1]: "right",
  [2]: "strongly right",
};

export function SliderInput({
  config,
  notch,
  onChange,
  onSettle,
  settleMs = 700, // §7.5: tune on touch (600–800ms).
}: {
  config: SliderConfig;
  notch: number | null;
  onChange: (notch: number) => void;
  onSettle: (notch: number) => void;
  settleMs?: number;
}) {
  const timer = useRef<number | undefined>(undefined);
  const [touched, setTouched] = useState(notch !== null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pick(n: number) {
    if (!touched) setTouched(true);
    onChange(n);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSettle(n), settleMs);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const base = notch ?? 0;
    pick(Math.max(-2, Math.min(2, base + (e.key === "ArrowRight" ? 1 : -1))));
  }

  return (
    <div className="slider">
      <div className="slider__poles">
        <span className="slider__pole">{config.leftLabel}</span>
        <span className="slider__pole slider__pole--right">{config.rightLabel}</span>
      </div>
      <div
        className="slider__track"
        role="slider"
        tabIndex={0}
        aria-valuemin={-2}
        aria-valuemax={2}
        aria-valuenow={notch ?? undefined}
        aria-label={`${config.leftLabel} to ${config.rightLabel}`}
        onKeyDown={onKeyDown}
      >
        <span className="slider__line" aria-hidden="true" />
        {NOTCHES.map((n) => (
          <button
            key={n}
            type="button"
            tabIndex={-1}
            aria-label={NOTCH_ARIA[n]}
            aria-pressed={notch === n}
            className={`slider__notch${notch === n ? " is-active" : ""}`}
            onClick={() => pick(n)}
          >
            <span className="slider__dot" aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className={`slider__hint${touched ? " is-hidden" : ""}`} aria-hidden="true">
        Slide to choose
      </p>
    </div>
  );
}

// ---- Pad: drag an orb across a two-axis field. The orb glides to a tap and tracks
// the pointer 1:1 while held; commit is on settle (§7.3). The orb rests at centre as a
// grabbable handle, but no value is committed until the user actually moves/taps. ----
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp1 = (n: number) => Math.max(-1, Math.min(1, n));
const PAD_GLIDE =
  "left .28s cubic-bezier(.16,1,.3,1), top .28s cubic-bezier(.16,1,.3,1), transform .14s cubic-bezier(.16,1,.3,1)";

export function PadInput({
  config,
  value,
  onChange,
  onSettle,
  settleMs = 700, // §7.5: matched to the slider at 700ms.
}: {
  config: PadConfig;
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number }) => void;
  onSettle: (v: { x: number; y: number }) => void;
  settleMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(false); // pointer down
  const [moved, setMoved] = useState(false); // dragging (track 1:1) vs tap (glide)
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function commit(x: number, y: number) {
    const v = { x: round2(clamp1(x)), y: round2(clamp1(y)) };
    onChange(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSettle(v), settleMs);
  }
  function fromEvent(clientX: number, clientY: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    commit(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
  }
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    ref.current?.setPointerCapture?.(e.pointerId);
    setActive(true);
    setMoved(false);
    fromEvent(e.clientX, e.clientY);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!active) return;
    if (!moved) setMoved(true);
    fromEvent(e.clientX, e.clientY);
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    ref.current?.releasePointerCapture?.(e.pointerId);
    setActive(false);
    setMoved(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = 0.2;
    const cur = value ?? { x: 0, y: 0 };
    if (e.key === "ArrowLeft") commit(cur.x - step, cur.y);
    else if (e.key === "ArrowRight") commit(cur.x + step, cur.y);
    else if (e.key === "ArrowUp") commit(cur.x, cur.y + step);
    else if (e.key === "ArrowDown") commit(cur.x, cur.y - step);
    else return;
    e.preventDefault();
  }

  const px = value ? value.x : 0;
  const py = value ? value.y : 0;
  const orbStyle: React.CSSProperties = {
    left: `${((px + 1) / 2) * 100}%`,
    top: `${((1 - py) / 2) * 100}%`,
    transition: moved ? "transform .14s cubic-bezier(.16,1,.3,1)" : PAD_GLIDE,
    transform: `translate(-50%, -50%) scale(${active ? 1.15 : 1})`,
  };

  return (
    <div className="pad-wrap">
      <div className="pad-stage">
        <p className="pad-axis pad-axis--top">{config.yTopLabel}</p>
        <p className="pad-axis pad-axis--bottom">{config.yBottomLabel}</p>
        <p className="pad-axis pad-axis--left">{config.xLeftLabel}</p>
        <p className="pad-axis pad-axis--right">{config.xRightLabel}</p>
        <div
          ref={ref}
          className={`pad2${value ? " is-set" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label={`Place a point: ${config.xLeftLabel}/${config.xRightLabel} by ${config.yBottomLabel}/${config.yTopLabel}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <span className="pad2__cross pad2__cross--v" aria-hidden="true" />
        <span className="pad2__cross pad2__cross--h" aria-hidden="true" />
        <span className="pad2__quad pad2__quad--tl">{config.cornerTL}</span>
        <span className="pad2__quad pad2__quad--tr">{config.cornerTR}</span>
        <span className="pad2__quad pad2__quad--bl">{config.cornerBL}</span>
        <span className="pad2__quad pad2__quad--br">{config.cornerBR}</span>
          <span className="pad2__orb" style={orbStyle} aria-hidden="true">
            <span className="pad2__orb-dot" />
          </span>
          <span className={`pad2__hint${value ? " is-hidden" : ""}`} aria-hidden="true">
            Drag the orb, or tap a spot
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Rank: reorder by dragging a row's handle (immediate, reliable on mouse + touch:
// the handle owns the gesture via touch-action:none; touching elsewhere still scrolls).
// Up/down arrows kept for accessibility + fine adjustment; Continue lives in the Quiz. ----
function Grip() {
  return (
    <svg className="rank__grip-svg" width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="3" cy="3" r="1.4" />
        <circle cx="9" cy="3" r="1.4" />
        <circle cx="3" cy="9" r="1.4" />
        <circle cx="9" cy="9" r="1.4" />
        <circle cx="3" cy="15" r="1.4" />
        <circle cx="9" cy="15" r="1.4" />
      </g>
    </svg>
  );
}

export function RankInput({
  options,
  order,
  onChange,
}: {
  options: AnswerOption[];
  order: string[];
  onChange: (order: string[]) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const draggingId = useRef<string | null>(null); // ref for immediate logic (no stale state)
  const [dragId, setDragId] = useState<string | null>(null); // state for the lift styling

  const items = order
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is AnswerOption => Boolean(o));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function reorderTo(clientY: number, id: string) {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-rank-id]") ?? []);
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) {
        target = i;
        break;
      }
    }
    const from = order.indexOf(id);
    if (target !== from && from !== -1) {
      const next = [...order];
      next.splice(from, 1);
      next.splice(target, 0, id);
      onChange(next);
    }
  }

  function onDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    draggingId.current = id;
    setDragId(id);
  }
  function onMove(e: React.PointerEvent) {
    const id = draggingId.current;
    if (!id) return;
    e.preventDefault();
    reorderTo(e.clientY, id);
  }
  function onUp(e: React.PointerEvent) {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    draggingId.current = null;
    setDragId(null);
  }

  return (
    <ol className="rank" ref={listRef} aria-label="Drag by the handle to reorder, most true at the top">
      {items.map((o, i) => (
        <li
          key={o.id}
          data-rank-id={o.id}
          className={`rank__item${dragId === o.id ? " is-dragging" : ""}`}
        >
          <button
            type="button"
            className="rank__grip"
            aria-label={`Drag "${o.label}" to reorder`}
            onPointerDown={(e) => onDown(e, o.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <Grip />
          </button>
          <span className="rank__num" aria-hidden="true">
            {i + 1}
          </span>
          <span className="rank__label">{o.label}</span>
          <span className="rank__moves">
            <button
              type="button"
              className="rank__move"
              aria-label={`Move "${o.label}" up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ▲
            </button>
            <button
              type="button"
              className="rank__move"
              aria-label={`Move "${o.label}" down`}
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
            >
              ▼
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
