'use client';

import { Preload, View } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import type { WebGLRenderer } from 'three';

import { useExperience } from '@/lib/experience/store';

import { AmbientField } from './ambient-field';
import { CameraRig } from './camera-rig';

/**
 * SceneCanvasClient
 *
 * The ONE WebGL context for the entire site. It is mounted exactly once (in the
 * root layout, via <SceneCanvas/>) and rendered as a fixed, full-viewport,
 * pointer-events-none, behind-content layer.
 *
 * Set-pieces (HeroScene, HostGlobe, ...) each render a drei <View track={ref}>
 * tied to a DOM element on the page; <View.Port/> here flushes all of those
 * tracked views into this single canvas. That keeps us to one context, one
 * render loop, and one camera rig — the performant pattern for multi-section 3D.
 *
 * Frameloop is "demand": the canvas only renders when invalidate() is called.
 * <FrameDriver> keeps invalidating every frame while at least one 3D region is
 * on-screen (store.visibleRegions > 0) and pauses the GPU entirely once the user
 * scrolls past every <View>. Pointer/scroll store changes also nudge a render so
 * parallax stays responsive at the edges of visibility.
 *
 * Eventing is routed through document.body (`eventSource` + `eventPrefix`) so
 * pointer math is computed against the page, not the canvas's own (empty) box.
 * This component is only ever imported via next/dynamic({ ssr: false }), so it
 * never executes on the server — `document` is guaranteed to exist at render.
 */

/**
 * Drives the demand frameloop. While any tracked region intersects the viewport
 * we invalidate every frame (so spins/confetti/auto-rotate animate); when none
 * are visible we stop, letting the GPU idle. Also invalidates once on any
 * pointer/scroll change so parallax updates even if visibility just flipped.
 */
function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (useExperience.getState().visibleRegions > 0) invalidate();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);

  useEffect(() => {
    // Render once whenever pointer or scroll changes (covers edge cases where a
    // region is technically off-screen but the camera rig still needs to settle).
    const unsub = useExperience.subscribe(() => invalidate());
    return unsub;
  }, [invalidate]);

  return null;
}

/**
 * Registers WebGL context-loss/restore handlers on the canvas element. Without
 * preventDefault on 'webglcontextlost' the browser keeps the context lost and
 * the canvas stays black forever (common on iOS Safari / low-memory Android when
 * the tab is backgrounded or the device sleeps). On restore we re-render; if the
 * context is somehow unrecoverable the page already degrades gracefully because
 * every set-piece returns null when webglEnabled is false.
 */
function ContextLossGuard() {
  const gl = useThree((s) => s.gl) as WebGLRenderer;
  const invalidate = useThree((s) => s.invalidate);
  const setWebglEnabled = useExperience((s) => s.setWebglEnabled);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const onLost = (e: Event) => {
      // Prevent the default so the context becomes restorable.
      e.preventDefault();
    };
    const onRestored = () => {
      setWebglEnabled(true);
      invalidate();
    };

    canvas.addEventListener('webglcontextlost', onLost as EventListener, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost as EventListener, false);
      canvas.removeEventListener('webglcontextrestored', onRestored, false);
    };
  }, [gl, invalidate, setWebglEnabled]);

  return null;
}

export function SceneCanvasClient() {
  const quality = useExperience((s) => s.quality);
  const setPointer = useExperience((s) => s.setPointer);

  // Cap DPR for fill-rate: high tier may use retina, everything else stays at
  // 1.5x max. The Canvas dpr range lets R3F pick within these bounds.
  const dpr: [number, number] = [1, quality === 'high' ? 2 : 1.5];

  // Capture document.body once for the canvas event source. A lazy useState
  // initializer runs exactly once during the first (client-only) render, so
  // there is no setState-in-effect cascade and no SSR access — this file is
  // only ever imported via next/dynamic({ ssr: false }).
  const [eventSource] = useState<HTMLElement | undefined>(() =>
    typeof document !== 'undefined' ? document.body : undefined,
  );

  useEffect(() => {
    // Drive the shared pointer in the store from a single passive listener on
    // the document. Normalised to [-1, 1], y flipped so up is positive.
    const onPointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      setPointer(x, y);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [setPointer]);

  return (
    <Canvas
      aria-hidden
      className="!fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
      // Render only on demand; FrameDriver pumps frames while regions are visible.
      frameloop="demand"
      dpr={dpr}
      eventSource={eventSource}
      eventPrefix="client"
      gl={{
        antialias: quality !== 'low',
        alpha: true,
        powerPreference: 'high-performance',
        // Keep buffers lean; stencil is unused by our set-pieces.
        stencil: false,
      }}
      camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }}
    >
      <ContextLossGuard />
      <FrameDriver />

      {/* Shared lighting used by every tracked view. */}
      <ambientLight intensity={0.6} color="#F5F0E8" />
      <directionalLight position={[5, 8, 5]} intensity={1.1} color="#D4A843" />
      <directionalLight
        position={[-6, -2, -4]}
        intensity={0.4}
        color="#0F1B3A"
      />

      <Suspense fallback={null}>
        {/* Persistent atmosphere behind all set-pieces. */}
        <AmbientField />

        {/* Camera reacts to scroll + pointer. */}
        <CameraRig />

        {/* Flush all <View track=...> set-pieces into this single context. */}
        <View.Port />

        <Preload all />
      </Suspense>
    </Canvas>
  );
}

export default SceneCanvasClient;
