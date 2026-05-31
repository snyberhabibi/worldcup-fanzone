'use client';

import { forwardRef } from 'react';
import type { ElementType, ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element (e.g. 'h1', 'span'). Defaults to 'span'. */
  as?: ElementType;
  /** Animation duration in seconds for the gradient sweep. */
  duration?: number;
}

/**
 * <GradientText> — animated trophy-gold gradient text in the same spirit as the
 * existing .text-shimmer utility. The gradient sweep is paused under
 * prefers-reduced-motion (a static gold gradient remains).
 */
export const GradientText = forwardRef<HTMLElement, GradientTextProps>(function GradientText(
  { children, className, as, duration = 6 },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  // Polymorphic element. Cast to a concrete intrinsic ('span') so JSX type
  // inference stays simple; the actual rendered tag is still the runtime value.
  const Tag = (as ?? 'span') as 'span';

  // Single styling mechanism (no `.text-shimmer` class — that would stack a
  // second competing gradient + animation). `bg-clip-text` / `text-transparent`
  // are not added here either; the inline style owns clip + fill so there is
  // exactly one background image and one animation.
  const classes = [className].filter(Boolean).join(' ');

  return (
    <Tag
      ref={ref}
      className={classes}
      style={{
        // Solid fallback first: if background-clip:text is unsupported the text
        // stays legible in brand gold instead of vanishing (transparent fill).
        color: '#9A7A30',
        // Darker stops + no near-white highlight so contrast holds against the
        // cream (#F5F0E8) background across the whole sweep (>= 3:1 large text).
        backgroundImage:
          'linear-gradient(100deg, #7A5F22 0%, #9A7A30 22%, #B6883A 45%, #C9A24B 55%, #B6883A 65%, #9A7A30 80%, #7A5F22 100%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: reducedMotion
          ? undefined
          : `fx-gradient-text ${duration}s linear infinite`,
      }}
    >
      {children}
      {reducedMotion ? null : (
        <style>{`@keyframes fx-gradient-text{0%{background-position:0% 50%}100%{background-position:250% 50%}}`}</style>
      )}
    </Tag>
  );
});

export default GradientText;
