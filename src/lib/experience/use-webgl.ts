'use client';

import { useSyncExternalStore } from 'react';

let cached: boolean | null = null;

function probe(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;

  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cached = Boolean(gl);
  } catch {
    cached = false;
  } finally {
    canvas = null;
  }

  return cached;
}

// WebGL support is a static device capability — it never changes at runtime,
// so the subscribe callback is a no-op.
const subscribe = () => () => {};
const getSnapshot = () => probe();
const getServerSnapshot = () => false;

/**
 * Detects WebGL support in a SSR-safe way.
 * Returns false during SSR and the first client render, then reports the
 * probed browser capability. Uses useSyncExternalStore so there is no
 * synchronous setState-in-effect cascade.
 */
export function useWebGLSupport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
