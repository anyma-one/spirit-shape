import { useEffect, useRef, useState } from "react";
import type { TierId } from "../data/copy";
import { tierScope } from "./ui/Layout";
import { initLoadingAnimation } from "./ui/loadingAnimation";

// Loading (design handoff: loading-screen-reference). A full-screen night sky with
// a canvas particle swarm that gathers and blooms on a 5s loop, plus a rotating
// line of copy. Shown after the quiz, before the reveal. No header, no interaction.
const LINES = ["Searching for a pattern…", "Weighting your choices…", "Manifesting your spirit…"];
const LINE_MS = 1667; // 5000 / 3 lines
const DWELL_MS = 5000; // reveal exactly as the particles gather + bloom (before they disperse)

export function Loading({ tier, onDone }: { tier: TierId; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const scope = tierScope(tier);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anim = initLoadingAnimation(canvas, { tier: scope, loopSeconds: 5 });
    const textTimer = window.setInterval(
      () => setLineIndex((i) => (i + 1) % LINES.length),
      LINE_MS,
    );
    const done = window.setTimeout(onDone, DWELL_MS);
    return () => {
      anim.destroy();
      window.clearInterval(textTimer);
      window.clearTimeout(done);
    };
  }, [scope, onDone]);

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
        <span className="loading-kicker">Channeling your voice</span>
        {/* key remounts the line so its fade-in re-runs on each change */}
        <div className="loading-line" key={lineIndex}>
          <p>{LINES[lineIndex]}</p>
        </div>
      </div>
    </div>
  );
}
