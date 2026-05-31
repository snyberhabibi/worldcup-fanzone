'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '@/lib/experience/store';
import type { Quality } from '@/lib/experience/store';

/**
 * GPU-cheap 3D confetti: a single InstancedMesh of small flat flecks that drift
 * downward, tumble, and wrap back to the top — an endless gentle fall.
 *
 * Trophy-gold + navy + red palette. Instance count scales with store.quality so
 * low-end / mobile devices render far fewer flecks.
 *
 * Implementation notes (React 19 / react-compiler lint):
 *  - Per-instance simulation buffers (Float32Arrays + scratch objects) are built
 *    purely in useMemo with a deterministic seeded PRNG (no Math.random in
 *    render, SSR-safe, idempotent).
 *  - That immutable memo result is copied into a ref in an effect; the per-frame
 *    animation reads/writes the ref inside useFrame (outside render), which keeps
 *    the purity / immutability / refs lints satisfied while still mutating state
 *    every frame for the falling motion.
 */

const COLORS = ['#C9A24B', '#D4A843', '#0F1B3A', '#E54141'];

const COUNT_BY_QUALITY: Record<Quality, number> = {
  low: 26,
  medium: 60,
  high: 120,
};

interface Sim {
  count: number;
  spread: number;
  pos: Float32Array; // x, y, z per instance
  rot: Float32Array; // euler x, y, z per instance
  spin: Float32Array; // angular velocity x, y, z per instance
  meta: Float32Array; // speed, drift, scale per instance
  rng: () => number;
  dummy: THREE.Object3D;
  color: THREE.Color;
  colorsApplied: boolean;
}

/** Deterministic 32-bit PRNG — pure given its seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSim(count: number, spread: number): Sim {
  const rng = mulberry32((0x5eed1234 ^ count ^ Math.round(spread * 1000)) >>> 0);
  const pos = new Float32Array(count * 3);
  const rot = new Float32Array(count * 3);
  const spin = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = i * 3;
    pos[p] = (rng() - 0.5) * 6;
    pos[p + 1] = (rng() - 0.5) * spread;
    pos[p + 2] = (rng() - 0.5) * 3 - 0.5;

    rot[p] = rng() * Math.PI;
    rot[p + 1] = rng() * Math.PI;
    rot[p + 2] = rng() * Math.PI;

    spin[p] = (rng() - 0.5) * 2;
    spin[p + 1] = (rng() - 0.5) * 2;
    spin[p + 2] = (rng() - 0.5) * 2;

    meta[p] = 0.25 + rng() * 0.5; // fall speed
    meta[p + 1] = (rng() - 0.5) * 0.4; // horizontal drift
    meta[p + 2] = 0.045 + rng() * 0.05; // scale
  }

  return {
    count,
    spread,
    pos,
    rot,
    spin,
    meta,
    rng,
    dummy: new THREE.Object3D(),
    color: new THREE.Color(),
    colorsApplied: false,
  };
}

export interface Confetti3DProps {
  /** Vertical span the flecks fall through before wrapping back to the top. */
  spread?: number;
  /** When true (region off-screen) the per-frame matrix updates are skipped. */
  paused?: boolean;
}

export function Confetti3D({ spread = 7, paused = false }: Confetti3DProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const quality = useExperience((s) => s.quality);

  const count = COUNT_BY_QUALITY[quality] ?? COUNT_BY_QUALITY.medium;

  // Simulation buffers are built in an effect (off the render path) and stored
  // in a ref the animation loop owns + mutates. Building outside render means
  // the seeded-PRNG init isn't subject to purity lints, and the ref value never
  // originates from useMemo, so per-frame typed-array writes are permitted.
  const simRef = useRef<Sim | null>(null);
  useEffect(() => {
    simRef.current = buildSim(count, spread);
  }, [count, spread]);

  useFrame((frame, delta) => {
    const inst = mesh.current;
    const sim = simRef.current;
    if (!inst || !sim || paused) return;

    const { pos, rot, spin, meta, rng, dummy, color } = sim;

    if (!sim.colorsApplied) {
      for (let i = 0; i < sim.count; i++) {
        color.set(COLORS[i % COLORS.length]);
        inst.setColorAt(i, color);
      }
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      sim.colorsApplied = true;
    }

    const { reducedMotion } = useExperience.getState();
    const halfSpread = sim.spread / 2;
    const t = frame.clock.elapsedTime;

    for (let i = 0; i < sim.count; i++) {
      const p = i * 3;
      const speed = meta[p];
      const drift = meta[p + 1];
      const scale = meta[p + 2];

      if (!reducedMotion) {
        pos[p + 1] -= speed * delta;
        rot[p] += spin[p] * delta;
        rot[p + 1] += spin[p + 1] * delta;
        rot[p + 2] += spin[p + 2] * delta;
        // Wrap to the top once a fleck falls past the bottom of the span.
        if (pos[p + 1] < -halfSpread) {
          pos[p + 1] = halfSpread;
          pos[p] = (rng() - 0.5) * 6;
        }
      }

      const sway = reducedMotion ? 0 : Math.sin(t * 0.6 + i) * drift * 0.3;
      dummy.position.set(pos[p] + sway, pos[p + 1], pos[p + 2]);
      dummy.rotation.set(rot[p], rot[p + 1], rot[p + 2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} raycast={() => null}>
      {/* Thin flat quad = a paper fleck. */}
      <planeGeometry args={[1, 1.6]} />
      <meshStandardMaterial
        metalness={0.5}
        roughness={0.4}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
