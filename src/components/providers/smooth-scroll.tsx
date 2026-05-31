'use client';

import Lenis from 'lenis';
import { useEffect, useRef, type ReactNode } from 'react';
import { useExperience } from '@/lib/experience/store';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * SmoothScroll wraps the app in a Lenis instance and drives the global
 * experience store with normalized scroll progress (0..1) and velocity.
 *
 * Progressive enhancement:
 *  - Always renders `children` (Lenis only augments native scrolling).
 *  - NO-OPS entirely under `prefers-reduced-motion: reduce` — no Lenis, no RAF —
 *    while still mirroring the native scroll position into the store so other
 *    parts of the experience stay in sync.
 *  - Keeps the store's `reducedMotion` flag current, reacting to live OS changes.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const setScroll = useExperience((s) => s.setScroll);
  const setReducedMotion = useExperience((s) => s.setReducedMotion);

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);

    // Holds the teardown for whichever scroll strategy is currently active
    // (Lenis + RAF, or the native-scroll fallback listener).
    let teardownActive: (() => void) | null = null;

    const startLenis = () => {
      const lenis = new Lenis({
        // Gentle, premium easing — fast enough for a PWA, no rubber-banding.
        lerp: 0.1,
        smoothWheel: true,
        // Let native touch scrolling drive things on mobile (better perf + a11y),
        // Lenis still reports progress/velocity via its scroll event.
        syncTouch: false,
      });

      const handleScroll = (instance: Lenis) => {
        // `progress` is already normalized 0..1; clamp defensively for the
        // edge case where the page is too short to scroll (limit === 0 -> NaN).
        const progress = Number.isFinite(instance.progress) ? instance.progress : 0;
        setScroll(progress, instance.velocity);
      };

      lenis.on('scroll', handleScroll);

      let rafId = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      // Emit an initial value so consumers don't wait for the first scroll.
      handleScroll(lenis);

      teardownActive = () => {
        cancelAnimationFrame(rafId);
        lenis.off('scroll', handleScroll);
        lenis.destroy();
      };
    };

    const startNativeFallback = () => {
      // Under reduced motion we don't run Lenis, but we still keep the store's
      // scroll progress accurate from native scrolling.
      const handleNativeScroll = () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        // No Lenis velocity available here; report 0 so consumers can rely on it.
        setScroll(progress, 0);
      };

      window.addEventListener('scroll', handleNativeScroll, { passive: true });
      window.addEventListener('resize', handleNativeScroll, { passive: true });
      handleNativeScroll();

      teardownActive = () => {
        window.removeEventListener('scroll', handleNativeScroll);
        window.removeEventListener('resize', handleNativeScroll);
      };
    };

    const apply = (reduced: boolean) => {
      setReducedMotion(reduced);
      teardownActive?.();
      teardownActive = null;
      if (reduced) {
        startNativeFallback();
      } else {
        startLenis();
      }
    };

    apply(media.matches);

    const handleMediaChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener('change', handleMediaChange);

    return () => {
      media.removeEventListener('change', handleMediaChange);
      teardownActive?.();
      teardownActive = null;
    };
  }, [setScroll, setReducedMotion]);

  return <>{children}</>;
}

/**
 * A thin fixed gold-gradient bar pinned to the top of the viewport whose width
 * tracks `scrollProgress` (0..1). Decorative + aria-hidden so it never affects
 * the accessibility tree or layout (it's fixed and full-height-fixed at 2px).
 */
export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe imperatively to avoid re-rendering this component on every
    // scroll frame — we mutate the transform directly for a jank-free bar.
    const apply = (progress: number) => {
      const el = barRef.current;
      if (!el) return;
      const clamped = Math.min(1, Math.max(0, progress));
      el.style.transform = `scaleX(${clamped})`;
    };

    apply(useExperience.getState().scrollProgress);
    const unsubscribe = useExperience.subscribe((state) => apply(state.scrollProgress));
    return unsubscribe;
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-gold via-gold-warm to-gold-light"
        style={{ transform: 'scaleX(0)', willChange: 'transform' }}
      />
    </div>
  );
}
