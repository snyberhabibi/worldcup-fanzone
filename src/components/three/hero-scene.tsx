'use client';

import * as React from 'react';
import { useRef } from 'react';
import { View } from '@react-three/drei';
import * as THREE from 'three';
import { useRegionVisibility } from '@/lib/experience/use-region-visibility';
import { SoccerBall } from './soccer-ball';
import { Confetti3D } from './confetti-3d';

/**
 * Hero 3D set-piece (Scene B2).
 *
 * Renders a positioned, aria-hidden <div> that is *tracked* by a drei <View>.
 * The <View> portals its 3D children into the single shared <Canvas> (which
 * provides <View.Port/>), so we never create our own Canvas here.
 *
 * Contents: procedural soccer ball + volumetric stadium light cones + drifting
 * gold/navy/red confetti, lit in a trophy-gold / navy / cream palette. The gold
 * "glow" is a cheap additive BackSide shell baked into <SoccerBall> rather than a
 * postprocessing bloom pass: @react-three/postprocessing's EffectComposer cannot
 * live inside a drei <View> (it owns the whole frame at renderPriority 1 and
 * ignores per-view scissor, so it would bleed across the HostGlobe/AmbientField
 * and fight View.Port). Everything here is additive and reduced-motion / quality
 * aware (the children read those flags from the shared experience store).
 */

const GOLD = '#C9A24B';
const GOLD_WARM = '#D4A843';
const CREAM = '#F5F0E8';
const NAVY = '#0F1B3A';

/** A single volumetric stadium light cone (cheap additive cone mesh). */
function LightCone({
  position,
  rotation,
  color,
  opacity = 0.12,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} raycast={() => null}>
      {/* Tall thin cone = a beam of stadium light. */}
      <coneGeometry args={[1.6, 6, 24, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export interface HeroSceneProps {
  className?: string;
}

export function HeroScene({ className }: HeroSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Registers this region with the demand frameloop and lets the animated
  // children early-return their useFrame work while the hero is off-screen.
  const visible = useRegionVisibility(ref);

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      // pointer-events stay off so the hero copy/CTAs underneath remain usable.
      style={{ pointerEvents: 'none' }}
    >
      <View track={ref as React.RefObject<HTMLElement>}>
        {/* Lighting: warm cream key + trophy-gold rim + cool navy fill. */}
        <ambientLight intensity={0.55} color={CREAM} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} color={CREAM} />
        <directionalLight position={[-4, 2, -3]} intensity={0.9} color={GOLD} />
        <pointLight position={[0, -3, 2]} intensity={0.6} color={NAVY} />

        {/* Volumetric stadium light cones angled down onto the ball. */}
        <group position={[0, 0.4, -1]}>
          <LightCone
            position={[-2.6, 3.4, 0]}
            rotation={[0, 0, Math.PI / 7]}
            color={GOLD_WARM}
            opacity={0.14}
          />
          <LightCone
            position={[2.6, 3.4, 0]}
            rotation={[0, 0, -Math.PI / 7]}
            color={CREAM}
            opacity={0.12}
          />
          <LightCone
            position={[0, 3.8, -1.2]}
            rotation={[Math.PI / 12, 0, 0]}
            color={GOLD}
            opacity={0.1}
          />
        </group>

        {/* The hero soccer ball. */}
        <group position={[0, 0, 0]}>
          <SoccerBall radius={1.15} parallax={0.24} paused={!visible} />
        </group>

        {/* Atmospheric confetti drifting through the scene. */}
        <Confetti3D spread={8} paused={!visible} />
      </View>
    </div>
  );
}
