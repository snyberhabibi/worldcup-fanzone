"use client";

import { useEffect, useState } from "react";

/**
 * True when the board should use the scrollable, stacked layout instead of the
 * fixed one-screen projector layout: any narrow screen OR any portrait screen
 * (a projector is landscape + wide, so it keeps the fixed layout; phones and
 * portrait tablets stack and scroll, which always fits). SSR-safe: defaults to
 * false and corrects on mount; callers gate on hydration so there's no flash.
 */
export function useIsNarrow(maxWidth = 900): boolean {
  const query = `(max-width: ${maxWidth}px), (orientation: portrait)`;
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}
