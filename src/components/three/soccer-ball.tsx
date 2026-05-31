'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import * as THREE from 'three';
import { useExperience } from '@/lib/experience/store';

/**
 * Procedural soccer ball.
 *
 * A clean white-and-navy paneled sphere built from an icosahedron base so it
 * reads as the classic pentagon/hexagon football. We avoid loading any GLB —
 * the panel "seams" come from a subtle wireframe overlay + flat-shaded facets
 * on a smoothed icosphere, which is GPU-cheap and crisp at every DPR.
 *
 * Motion:
 *  - slow constant spin (idle character)
 *  - gentle vertical float (maath easing, frame-rate independent)
 *  - pointer parallax (the whole ball leans toward the cursor) read from the
 *    shared experience store so it tracks the global pointer set by the rig.
 */

const NAVY = '#0F1B3A';
const WHITE = '#F7F4EE';
const GOLD = '#C9A24B';

export interface SoccerBallProps {
  /** Base radius of the ball in world units. */
  radius?: number;
  /** Multiplier for pointer-driven parallax lean (0 disables). */
  parallax?: number;
  /** When true (region off-screen) the per-frame spin/parallax work is skipped. */
  paused?: boolean;
}

export function SoccerBall({ radius = 1.1, parallax = 0.22, paused = false }: SoccerBallProps) {
  const group = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);

  // Icosphere geometry: detail 2 gives a faceted-yet-round football silhouette.
  // useMemo so the geometry is built once and disposed with the component.
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, 2);
    geo.computeVertexNormals();
    return geo;
  }, [radius]);

  // Slightly larger seam geometry for the navy paneling wireframe overlay.
  const seamGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(radius * 1.002, 2),
    [radius],
  );

  // Dispose GPU resources on unmount (the View can mount/unmount on scroll).
  useEffect(() => {
    return () => {
      geometry.dispose();
      seamGeometry.dispose();
    };
  }, [geometry, seamGeometry]);

  useFrame((state, delta) => {
    const g = group.current;
    const b = ball.current;
    if (!g || !b || paused) return;

    const { pointer, reducedMotion } = useExperience.getState();

    // Constant idle spin on the ball itself.
    if (!reducedMotion) {
      b.rotation.y += delta * 0.35;
      b.rotation.x += delta * 0.08;
    }

    // Gentle float on the group — frame-rate independent via easing.damp.
    const t = state.clock.elapsedTime;
    const floatY = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.06;
    easing.damp(g.position, 'y', floatY, 0.4, delta);

    // Pointer parallax: lean the group toward the cursor. pointer is -1..1.
    const targetRotX = reducedMotion ? 0 : -pointer.y * parallax;
    const targetRotY = reducedMotion ? 0 : pointer.x * parallax;
    easing.damp(g.rotation, 'x', targetRotX, 0.5, delta);
    easing.damp(g.rotation, 'z', targetRotY * 0.4, 0.5, delta);
  });

  return (
    <group ref={group}>
      {/* Main paneled body */}
      <mesh ref={ball} geometry={geometry} castShadow={false} receiveShadow={false}>
        <meshStandardMaterial
          color={WHITE}
          metalness={0.18}
          roughness={0.42}
          flatShading
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Navy seam paneling — wireframe overlay traces the facet edges so the
          ball reads as a stitched football without a texture. */}
      <mesh geometry={seamGeometry} raycast={() => null}>
        <meshBasicMaterial
          color={NAVY}
          wireframe
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* Faint trophy-gold rim glow shell for premium depth. */}
      <mesh scale={1.04} raycast={() => null}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={GOLD}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
