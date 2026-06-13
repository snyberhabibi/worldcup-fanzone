"use client";

import { useEffect, useState } from "react";

/**
 * True on narrow viewports (phones / portrait). SSR-safe: defaults to false
 * (the wide projector layout) and corrects on mount, so there's no flash since
 * callers gate rendering on hydration anyway.
 */
export function useIsNarrow(maxWidth = 760): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${maxWidth}px)`).matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidth]);
  return narrow;
}
