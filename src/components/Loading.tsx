import { useEffect, useMemo, useRef, useState } from "react";
import type { TierId } from "../data/copy";
import { tierScope } from "./ui/Layout";
import { initLoadingAnimation } from "./ui/loadingAnimation";

// Loading (design handoff: loading-screen-reference). A full-screen night sky with
// a canvas particle swarm that gathers and blooms on a 5s loop, plus a rotating
// line of copy. Shown after the quiz, before the reveal. No header, no interaction.
//
// Two modes:
//   TIMED (Tiers 1-2) — pass `onDone`. The reveal fires after a fixed dwell, timed
//     so the particles are at the top of their gather→bloom when the screen changes.
//   INDETERMINATE (Deep Dive) — omit `onDone`. The animation engine already loops
//     forever (see loadingAnimation.ts: `if (t > cycle) t -= cycle`), so this needs
//     no engine change; we simply never schedule the hand-off, and the caller
//     unmounts the screen when its work finishes.
const LINES = ["Searching for a pattern…", "Weighting your choices…", "Manifesting your spirit…"];
const LINE_MS = 1667; // 5000 / 3 lines
const DWELL_MS = 5000; // reveal exactly as the particles gather + bloom (before they disperse)

export function Loading({
  tier,
  onDone,
  lines = LINES,
  kicker = "Channeling your voice",
  sub,
  lineMs = LINE_MS,
  holdLast = false,
}: {
  /** A quiz tier, or "deep" for the Deep Dive's own mood scope. */
  tier: TierId | "deep";
  /** Omit for an indeterminate wait — the swarm loops until the screen unmounts. */
  onDone?: () => void;
  /** Status copy. One entry = a fixed line (re-fades when its text changes). */
  lines?: string[];
  kicker?: string;
  /** Optional second line under the status copy. */
  sub?: string;
  /** How long each status line shows. */
  lineMs?: number;
  /** Stop on the last line instead of looping (for a sequence that reads as progress). */
  holdLast?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const scope = tierScope(tier);

  // Rotate only when there is more than one line to rotate through. Keyed on the
  // joined text so a caller passing an inline array doesn't restart the timer on
  // every render — and, crucially, doesn't tear down the canvas below.
  const linesKey = useMemo(() => lines.join("|"), [lines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anim = initLoadingAnimation(canvas, { tier: scope, loopSeconds: 5 });
    return () => anim.destroy();
  }, [scope]);

  useEffect(() => {
    const count = linesKey.split("|").length;
    if (count < 2) return;
    const textTimer = window.setInterval(
      () =>
        setLineIndex((i) => {
          if (!holdLast) return (i + 1) % count;
          if (i + 1 >= count - 1) window.clearInterval(textTimer);
          return Math.min(i + 1, count - 1);
        }),
      lineMs,
    );
    return () => window.clearInterval(textTimer);
  }, [linesKey, lineMs, holdLast]);

  useEffect(() => {
    if (!onDone) return; // indeterminate: no hand-off, keep looping
    const done = window.setTimeout(onDone, DWELL_MS);
    return () => window.clearTimeout(done);
  }, [onDone]);

  const line = lines[lineIndex % lines.length] ?? "";

  return (
    <div className="loading-screen sa-night sa-grain" data-tier={scope}>
      <div className="sa-haze" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sa-stars" aria-hidden="true" />
      <canvas ref={canvasRef} className="loading-canvas" aria-hidden="true" />

      <div className="loading-copy">
        <span className="loading-kicker">{kicker}</span>
        {/* key remounts the line so its fade-in re-runs on each change */}
        <div className="loading-line" key={line}>
          <p>{line}</p>
        </div>
        {sub && <p className="loading-sub">{sub}</p>}
      </div>
    </div>
  );
}
