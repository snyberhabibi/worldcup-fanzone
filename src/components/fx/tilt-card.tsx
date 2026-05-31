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
import { motion, useMotionTemplate, useSpring } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees on each axis. */
  maxTilt?: number;
  /** Show the moving glare highlight. Defaults to true. */
  glare?: boolean;
  /** Slight lift on hover (px). */
  lift?: number;
}

const SPRING = { stiffness: 220, damping: 24, mass: 0.6 } as const;

/**
 * <TiltCard> — pointer-driven 3D tilt with a cursor-following glare.
 * Disabled (renders a plain card) on touch devices and under reduced motion.
 */
export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(function TiltCard(
  { children, className, maxTilt = 10, glare = true, lift = 6 },
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

  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);
  const translateZ = useSpring(0, SPRING);
  // Glare position 0..100 (%).
  const glareX = useSpring(50, SPRING);
  const glareY = useSpring(50, SPRING);
  const glareOpacity = useSpring(0, SPRING);

  const disabled = reducedMotion || isTouch;

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = innerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width; // 0..1
      const py = (event.clientY - rect.top) / rect.height; // 0..1
      rotateY.set((px - 0.5) * 2 * maxTilt);
      rotateX.set((0.5 - py) * 2 * maxTilt);
      translateZ.set(lift);
      glareX.set(px * 100);
      glareY.set(py * 100);
      glareOpacity.set(0.35);
    },
    [disabled, maxTilt, lift, rotateX, rotateY, translateZ, glareX, glareY, glareOpacity],
  );

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    translateZ.set(0);
    glareOpacity.set(0);
    glareX.set(50);
    glareY.set(50);
  }, [rotateX, rotateY, translateZ, glareOpacity, glareX, glareY]);

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(212,168,67,0.55), rgba(255,255,255,0) 60%)`;

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
      style={{
        rotateX,
        rotateY,
        translateZ,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {children}
      {glare ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ opacity: glareOpacity, backgroundImage: glareBackground }}
        />
      ) : null}
    </motion.div>
  );
});

export default TiltCard;
