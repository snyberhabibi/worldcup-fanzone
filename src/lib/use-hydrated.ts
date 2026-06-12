"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR + the first client render, true afterward.
 * Hydration-safe (no setState-in-effect) gate for time-dependent UI like the
 * "nearest game" default, which would otherwise mismatch server vs client.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
