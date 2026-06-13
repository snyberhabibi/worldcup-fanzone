"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number toward `target` whenever it changes (eased),
 * so the board's vote counts tick up instead of jumping. Initial value shows
 * immediately (no count-up on first paint).
 *
 * `monotonic` (used on the projector) makes the counter forward-only: a lower
 * `target` — from per-instance cache staleness, a transient failed poll
 * returning 0, or vote-switching between sides — is ignored rather than
 * animated downward, which on a big public screen reads as a glitch. A genuine
 * reset (a new game) is handled by remounting the consumer via a `key`, not by
 * letting the number fall.
 */
export function useCountUp(target: number, duration = 800, monotonic = false): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const goalRef = useRef(target);

  useEffect(() => {
    // Forward-only: never let the displayed value drop below where it has
    // already been during this mount.
    const goal = monotonic ? Math.max(target, goalRef.current) : target;
    goalRef.current = goal;

    const from = fromRef.current;
    if (from === goal) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = Math.round(from + (goal - from) * eased);
      setDisplay(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = goal;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, monotonic]);

  return display;
}
