'use client';

import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

import { usePrefersReducedMotion } from '@/lib/experience/use-reduced-motion';

/** Tags supported by <Reveal as="...">. */
export type RevealTag =
  | 'div'
  | 'section'
  | 'article'
  | 'span'
  | 'li'
  | 'ul'
  | 'header'
  | 'footer'
  | 'p'
  | 'h2'
  | 'h3';

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  span: motion.span,
  li: motion.li,
  ul: motion.ul,
  header: motion.header,
  footer: motion.footer,
  p: motion.p,
  h2: motion.h2,
  h3: motion.h3,
} as const;

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'as'> {
  children: ReactNode;
  /** Render as a different element. Defaults to 'div'. */
  as?: RevealTag;
  /** Animation delay in seconds. */
  delay?: number;
  /** Vertical travel distance in px the element rises from. */
  y?: number;
  /** Transition duration in seconds. */
  duration?: number;
  /** Only animate the first time it scrolls into view. Defaults to true. */
  once?: boolean;
  /** IntersectionObserver trigger amount. */
  amount?: number | 'some' | 'all';
}

/**
 * <Reveal> — fades + rises its children when scrolled into view.
 * Under prefers-reduced-motion, content renders immediately with no transform.
 */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  {
    children,
    as = 'div',
    delay = 0,
    y = 24,
    duration = 0.6,
    once = true,
    amount = 0.2,
    style,
    ...rest
  },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const MotionTag = (MOTION_TAGS[as] ?? motion.div) as typeof motion.div;

  if (reducedMotion) {
    return (
      <MotionTag ref={ref} style={style} {...rest}>
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      ref={ref}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
});

export default Reveal;
