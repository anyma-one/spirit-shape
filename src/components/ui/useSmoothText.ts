import { useEffect, useRef, useState } from "react";

/**
 * Reveal streamed text at a steady pace instead of in network-sized bursts.
 *
 * Streamed replies arrive in uneven chunks (a word, then a sentence at once), which
 * reads as choppy. This eases the shown text toward the latest target: each animation
 * frame it adds a share of what is still hidden (at least one character), so a burst
 * unrolls over a few hundred milliseconds and the lag never grows. If the target stops
 * being an extension of what is shown (a new turn, or a stream reset), it restarts.
 */
export function useSmoothText(target: string): string {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (!target.startsWith(shownRef.current)) {
      shownRef.current = "";
      setShown("");
    }
    let frame = 0;
    const step = () => {
      const current = shownRef.current;
      if (current.length >= target.length) return;
      const hidden = target.length - current.length;
      const next = target.slice(0, current.length + Math.max(1, Math.ceil(hidden / 12)));
      shownRef.current = next;
      setShown(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return target === "" ? "" : shown;
}
