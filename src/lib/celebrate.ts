"use client";

import confetti from "canvas-confetti";

const COLORS = ["#FF4444", "#FDB913", "#FAF9F6", "#2f9e8f"];

/** Quick celebratory burst (vote confirmed). */
export function burstConfetti(): void {
  try {
    confetti({ particleCount: 90, spread: 78, origin: { y: 0.62 }, colors: COLORS });
    setTimeout(
      () =>
        confetti({
          particleCount: 70,
          spread: 110,
          startVelocity: 38,
          origin: { y: 0.5 },
          colors: COLORS,
          scalar: 1.1,
        }),
      160
    );
  } catch {
    /* ignore */
  }
}

/** Sustained side-cannons for the raffle winner reveal. */
export function bigCelebrate(): void {
  try {
    const end = Date.now() + 1400;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 62, origin: { x: 0 }, colors: COLORS });
      confetti({ particleCount: 6, angle: 120, spread: 62, origin: { x: 1 }, colors: COLORS });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  } catch {
    /* ignore */
  }
}
