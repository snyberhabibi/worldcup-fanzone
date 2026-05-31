'use client';

import { useEffect, useState, type RefObject } from 'react';

import { useExperience } from './store';

/**
 * useRegionVisibility
 *
 * Watches a set-piece's tracking element with an IntersectionObserver and:
 *  - increments/decrements the shared `visibleRegions` counter (drives the
 *    canvas frameloop="demand" — rendering pauses once no region is on-screen);
 *  - returns a boolean the set-piece can use to early-return its heavy useFrame
 *    work (auto-rotate, spin, confetti, per-pin pulses) while it is off-screen.
 *
 * SSR-safe: does nothing until mounted on the client. Always reports the region
 * as not-visible during cleanup so the global counter never leaks.
 */
export function useRegionVisibility(
  ref: RefObject<HTMLElement | null>,
  rootMargin = '200px',
): boolean {
  const [visible, setVisible] = useState(false);
  const setRegionVisible = useExperience((s) => s.setRegionVisible);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let registered = false;
    const apply = (next: boolean) => {
      if (next === registered) return;
      registered = next;
      setRegionVisible(next);
      setVisible(next);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) apply(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      // Ensure we never leave the global counter incremented on unmount.
      if (registered) {
        registered = false;
        setRegionVisible(false);
      }
    };
  }, [ref, rootMargin, setRegionVisible]);

  return visible;
}
