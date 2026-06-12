"use client";

// Arcade SFX synthesized with the Web Audio API (no asset files) + best-effort
// haptics. NOTE: iPad Safari does not support navigator.vibrate, so on the
// kiosk the "feel" comes from sound + on-screen motion; vibrate is a no-op
// there and a real buzz on Android.

import { useCallback, useMemo, useState } from "react";

export type SoundName =
  | "tap"
  | "select"
  | "lock"
  | "tick"
  | "win"
  | "error"
  | "whoosh"
  | "coin";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function blip(
  c: AudioContext,
  opts: {
    freq: number;
    to?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
  }
) {
  const t0 = c.currentTime + (opts.delay || 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.03);
}

const PATTERNS: Record<SoundName, (c: AudioContext) => void> = {
  tap: (c) => blip(c, { freq: 420, to: 540, dur: 0.07, type: "triangle", gain: 0.1 }),
  select: (c) => blip(c, { freq: 540, to: 760, dur: 0.12, type: "triangle", gain: 0.15 }),
  lock: (c) => {
    blip(c, { freq: 300, to: 620, dur: 0.12, type: "square", gain: 0.13 });
    blip(c, { freq: 720, to: 980, dur: 0.16, type: "triangle", gain: 0.13, delay: 0.08 });
  },
  tick: (c) => blip(c, { freq: 880, dur: 0.04, type: "square", gain: 0.07 }),
  win: (c) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      blip(c, { freq: f, dur: 0.18, type: "triangle", gain: 0.16, delay: i * 0.1 })
    );
  },
  error: (c) => blip(c, { freq: 240, to: 140, dur: 0.22, type: "sawtooth", gain: 0.12 }),
  whoosh: (c) => blip(c, { freq: 160, to: 1200, dur: 0.45, type: "sine", gain: 0.06 }),
  coin: (c) => {
    blip(c, { freq: 988, dur: 0.07, type: "square", gain: 0.13 });
    blip(c, { freq: 1319, dur: 0.16, type: "square", gain: 0.13, delay: 0.07 });
  },
};

const MUTE_KEY = "kiosk_muted";
let muted = false;
if (typeof window !== "undefined") {
  muted = localStorage.getItem(MUTE_KEY) === "1";
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  try {
    PATTERNS[name]?.(c);
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMutedGlobal(v: boolean): void {
  muted = v;
  if (typeof window !== "undefined") {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  }
}

export interface SoundApi {
  play: (n: SoundName) => void;
  vibrate: (p: number | number[]) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
}

/** Hook wrapper so components can read/toggle the mute state reactively. */
export function useSound(): SoundApi {
  // Lazy init reads the persisted mute flag without a setState-in-effect.
  const [m, setM] = useState<boolean>(() => isMuted());
  const play = useCallback((n: SoundName) => playSound(n), []);
  const setMuted = useCallback((v: boolean) => {
    setMutedGlobal(v);
    setM(v);
  }, []);
  const toggleMute = useCallback(() => {
    const v = !isMuted();
    setMutedGlobal(v);
    setM(v);
  }, []);
  // Stable identity so consumers' effects (e.g. the kiosk countdown) don't
  // re-run on every parent render.
  return useMemo(
    () => ({ play, vibrate, muted: m, setMuted, toggleMute }),
    [play, m, setMuted, toggleMute]
  );
}
