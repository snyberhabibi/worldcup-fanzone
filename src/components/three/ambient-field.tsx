'use client';

import { Points } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { random } from 'maath';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useExperience } from '@/lib/experience/store';

/**
 * AmbientField
 *
 * A subtle drifting "starfield-in-stadium-haze" made of points. It lives
 * persistently behind every set-piece to give the single-context canvas a
 * sense of atmosphere and depth. Trophy-gold + navy palette.
 *
 * Particle count is driven by the detected quality tier so low-end / mobile
 * devices stay smooth. The two layers each own an INDEPENDENT positions buffer
 * (different seed/radius) so they genuinely parallax and there is no shared
 * BufferAttribute to double-dispose on unmount.
 *
 * The group rotates very slowly on its own and gets a faint nudge from the
 * scroll velocity so the haze feels reactive without ever drawing focus. The
 * drift is skipped while no 3D region is on-screen (demand frameloop is idle
 * then anyway, but this also keeps the haze settled).
 */

/** Build a Float32Array of xyz triples inside a sphere of the given radius. */
function makeField(count: number, radius: number): Float32Array {
  const buffer = new Float32Array(count * 3);
  random.inSphere(buffer, { radius });
  return buffer;
}

export function AmbientField() {
  const quality = useExperience((s) => s.quality);

  const count = quality === 'high' ? 1600 : quality === 'medium' ? 900 : 450;

  // Each layer owns its own buffer (separate distribution) for real parallax.
  const goldPositions = useMemo(() => makeField(count, 9), [count]);
  const navyPositions = useMemo(
    () => makeField(Math.round(count * 0.7), 13),
    [count],
  );

  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (useExperience.getState().visibleRegions === 0) return;

    const dt = Math.min(delta, 1 / 30);
    const { velocity } = useExperience.getState();

    // Constant gentle drift + a tiny scroll-velocity reaction.
    group.rotation.y += dt * (0.02 + Math.abs(velocity) * 0.06);
    group.rotation.x += dt * 0.008;
  });

  return (
    <group ref={groupRef}>
      <Points positions={goldPositions} stride={3}>
        <pointsMaterial
          transparent
          color="#C9A24B"
          size={0.025}
          sizeAttenuation
          depthWrite={false}
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      {/* A second, sparser navy layer (own buffer + wider radius) for parallax. */}
      <Points positions={navyPositions} stride={3}>
        <pointsMaterial
          transparent
          color="#3A4A78"
          size={0.018}
          sizeAttenuation
          depthWrite={false}
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

export default AmbientField;
