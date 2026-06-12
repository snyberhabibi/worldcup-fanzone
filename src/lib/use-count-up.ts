"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number toward `target` whenever it changes (eased),
 * so the board's vote counts tick up instead of jumping. Initial value shows
 * immediately (no count-up on first paint).
 */
export function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = Math.round(from + (target - from) * eased);
      setDisplay(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
