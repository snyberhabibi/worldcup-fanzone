"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Poll an async fetcher on an interval. Pauses while the tab is hidden and
 * refreshes immediately when it becomes visible again. Keeps the last good
 * value on transient errors so the screen never flashes empty.
 */
export function usePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  immediate = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const saved = useRef(fetcher);
  useEffect(() => {
    saved.current = fetcher;
  });

  const refresh = useCallback(async (): Promise<T | null> => {
    try {
      const v = await saved.current();
      setData(v);
      setError(null);
      return v;
    } catch (e) {
      setError(e);
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let busy = false; // in-flight guard: never stack a 2nd request while one is pending
    const tick = async () => {
      if (busy) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden")
        return;
      busy = true;
      try {
        const v = await saved.current();
        if (alive) {
          setData(v);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        busy = false;
      }
    };
    if (immediate) tick();
    const timer = setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, immediate]);

  return { data, error, refresh, setData };
}
