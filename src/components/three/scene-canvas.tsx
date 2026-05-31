'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { detectQuality } from '@/lib/experience/quality';
import { useExperience } from '@/lib/experience/store';
import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';
import { useWebGLSupport } from '@/lib/experience/use-webgl';

/**
 * SceneCanvasClient is loaded with ssr:false so the heavy three.js bundle and
 * the WebGL context only ever exist in the browser. Per Next 16 App Router
 * rules, a dynamic import with { ssr: false } is only valid inside a client
 * component — which this file is ('use client').
 */
const SceneCanvasClient = dynamic(
  () => import('./scene-canvas.client').then((m) => m.SceneCanvasClient),
  { ssr: false },
);

/**
 * SceneCanvas
 *
 * The public entry point for the site's single 3D context. Mount this ONCE in
 * the root layout. It:
 *
 *  1. Detects WebGL support, reduced-motion preference, and a device quality
 *     tier on the client and pushes them into the shared experience store.
 *  2. Renders nothing (no canvas, no WebGL context) when WebGL is unavailable
 *     OR the user prefers reduced motion — satisfying the progressive-
 *     enhancement / accessibility non-negotiables.
 *  3. Otherwise lazy-loads the actual <Canvas> on the client only.
 *
 * All 3D is additive and aria-hidden; the page remains fully functional with
 * this component returning null.
 */
export function SceneCanvas() {
  const webgl = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();

  const webglEnabled = useExperience((s) => s.webglEnabled);
  const storeReducedMotion = useExperience((s) => s.reducedMotion);
  const setWebglEnabled = useExperience((s) => s.setWebglEnabled);
  const setReducedMotion = useExperience((s) => s.setReducedMotion);
  const setQuality = useExperience((s) => s.setQuality);

  // Sync detected capabilities into the store. Hooks are SSR-safe and settle on
  // the client after mount; keep the store in lock-step.
  useEffect(() => {
    setWebglEnabled(webgl);
  }, [webgl, setWebglEnabled]);

  useEffect(() => {
    setReducedMotion(reducedMotion);
  }, [reducedMotion, setReducedMotion]);

  useEffect(() => {
    // Quality detection is cheap and only needs to run once on mount.
    setQuality(detectQuality());
  }, [setQuality]);

  // Gate strictly on the store values so the canvas and every consumer agree on
  // a single source of truth. Never mount a context when 3D is disabled.
  if (!webglEnabled || storeReducedMotion) return null;

  return <SceneCanvasClient />;
}

export default SceneCanvas;
