'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';

export interface SpotlightProps {
  className?: string;
  /** Radius of the glow in px. */
  size?: number;
  /** CSS color of the glow center. */
  color?: string;
  /** Max opacity of the glow when the pointer is over the container. */
  intensity?: number;
}

const SPRING = { stiffness: 150, damping: 20, mass: 0.5 } as const;

/**
 * <Spotlight> — a pointer-following radial glow layer meant to sit behind
 * content (absolutely positioned, pointer-events: none). It tracks the cursor
 * within its positioned parent. Renders a soft static glow under reduced motion.
 */
export const Spotlight = forwardRef<HTMLDivElement, SpotlightProps>(function Spotlight(
  {
    className,
    size = 480,
    color = 'rgba(212,168,67,0.18)',
    intensity = 1,
  },
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);
  const opacity = useSpring(0, SPRING);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = innerRef.current?.parentElement;
    if (!el) return;
    setReady(true);

    const handleMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(event.clientX - rect.left);
      y.set(event.clientY - rect.top);
      opacity.set(intensity);
    };
    const handleLeave = () => opacity.set(0);

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
    };
  }, [intensity, x, y, opacity]);

  const background = useMotionTemplate`radial-gradient(${size}px circle at ${sx}px ${sy}px, ${color}, transparent 70%)`;

  if (reducedMotion) {
    return (
      <div
        ref={innerRef}
        aria-hidden="true"
        className={['pointer-events-none absolute inset-0', className].filter(Boolean).join(' ')}
        style={{
          backgroundImage: `radial-gradient(${size}px circle at 50% 30%, ${color}, transparent 70%)`,
        }}
      />
    );
  }

  return (
    <motion.div
      ref={innerRef}
      aria-hidden="true"
      className={['pointer-events-none absolute inset-0', className].filter(Boolean).join(' ')}
      style={{
        backgroundImage: background,
        opacity: ready ? opacity : 0,
      }}
    />
  );
});

export default Spotlight;
