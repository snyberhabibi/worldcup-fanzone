'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { motion, useSpring } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';

export interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** How far the element is pulled toward the cursor (0..1 of offset). */
  strength?: number;
  /** Max pull distance in px on each axis. */
  max?: number;
}

const SPRING = { stiffness: 260, damping: 18, mass: 0.5 } as const;

/**
 * <Magnetic> — wraps an interactive element (e.g. a button) so it leans
 * toward the cursor on hover. No-op on touch devices and under reduced motion.
 */
export const Magnetic = forwardRef<HTMLDivElement, MagneticProps>(function Magnetic(
  { children, className, strength = 0.35, max = 18 },
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  const disabled = reducedMotion || isTouch;

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = innerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      x.set(Math.max(-max, Math.min(max, relX * strength)));
      y.set(Math.max(-max, Math.min(max, relY * strength)));
    },
    [disabled, max, strength, x, y],
  );

  const handlePointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (disabled) {
    return (
      <div ref={innerRef} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={innerRef}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x, y, display: 'inline-block', willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
});

export default Magnetic;
