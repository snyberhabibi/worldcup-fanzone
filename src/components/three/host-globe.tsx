'use client';

/**
 * <HostGlobe/> — Scene B3
 *
 * Interactive, stylized globe of the 16 FIFA World Cup 2026 host cities.
 * Renders into the single shared <Canvas> via drei <View track={ref}>:
 *  - navy sphere with gold latitude/longitude wireframe + soft fresnel rim
 *  - glowing gold pins placed by lat/lng -> Vector3 conversion
 *  - hover / tap highlights a pin and shows an HTML city label (drei <Html/>)
 *  - drag to rotate (OrbitControls, zoom disabled) + slow auto-rotate when idle
 *  - Dallas/Arlington pin is subtly emphasized (brand tie-in)
 *
 * The 3D layer is purely DECORATIVE (aria-hidden). The real, accessible content
 * for this section is a VISIBLE responsive grid of all 16 host cities rendered
 * in normal DOM (see <HostCityGrid/>), so sighted keyboard / touch-without-hover
 * users and the no-WebGL / reduced-motion path all read every city name without
 * needing to interact with the canvas. The globe sits behind / above that grid
 * as atmosphere only.
 *
 * Performance: all pins share ONE sphere + ONE cylinder geometry, a single
 * useFrame in GlobeBody animates only the active/emphasized pins (and stops once
 * scales have settled), and the auto-rotate + pin animation early-return while
 * the globe's <View> is off-screen (demand frameloop).
 *
 * Quality (from the experience store) scales sphere tessellation, pin segment
 * counts and pixel ratio so low-end / mobile devices stay smooth.
 */

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { View, Html, OrbitControls } from '@react-three/drei';

import { HOST_CITIES, HOST_CITY_COUNT, type City } from '@/data/host-cities';
import { useExperience, type Quality } from '@/lib/experience/store';
import { useRegionVisibility } from '@/lib/experience/use-region-visibility';

const GLOBE_RADIUS = 1;
const PIN_LIFT = 0.02;

/** Palette (mirrors globals.css tokens). */
const COLOR_NAVY = '#0F1B3A';
const COLOR_GOLD = '#C9A24B';
const COLOR_GOLD_WARM = '#D4A843';
const COLOR_GOLD_BRIGHT = '#F0CE7A';

/** Per-quality tessellation / segment budgets. */
const QUALITY_TIERS: Record<Quality, { sphere: number; pin: number; autoSpeed: number }> = {
  low: { sphere: 24, pin: 6, autoSpeed: 0.18 },
  medium: { sphere: 40, pin: 10, autoSpeed: 0.22 },
  high: { sphere: 64, pin: 14, autoSpeed: 0.25 },
};

/**
 * Convert geographic coordinates to a point on a sphere of `radius`.
 * Standard lat/lng -> Cartesian mapping (y-up, longitude rotates around y).
 */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

interface PinView {
  city: City;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

interface PinProps {
  pin: PinView;
  /** Shared sphere geometry for dot + glow. */
  sphereGeometry: THREE.SphereGeometry;
  /** Shared cylinder geometry for the stem. */
  cylinderGeometry: THREE.CylinderGeometry;
  active: boolean;
  onActivate: (name: string | null) => void;
  /** Set the THREE.Group ref so GlobeBody's single useFrame can animate it. */
  registerRef: (name: string, group: THREE.Group | null) => void;
}

function Pin({
  pin,
  sphereGeometry,
  cylinderGeometry,
  active,
  onActivate,
  registerRef,
}: PinProps) {
  const { city, position, quaternion } = pin;
  const emphasized = Boolean(city.highlight);
  const baseColor = emphasized ? COLOR_GOLD_BRIGHT : COLOR_GOLD;
  const showLabel = active || emphasized;
  // Larger pins for the emphasized city; scale shared geometry per-mesh.
  const dotScale = emphasized ? 0.035 : 0.026;
  const glowScale = emphasized ? 0.07 : 0.055;

  return (
    <group
      ref={(g) => registerRef(city.name, g)}
      position={position}
      quaternion={quaternion}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onActivate(city.name);
      }}
      onPointerOut={() => onActivate(null)}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onActivate(active ? null : city.name);
      }}
    >
      {/* Pin dot sitting just above the surface (shared geometry, per-mesh scale). */}
      <mesh position={[0, PIN_LIFT + 0.03, 0]} geometry={sphereGeometry} scale={dotScale}>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={showLabel ? 2.4 : 1.4}
          roughness={0.25}
          metalness={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Soft glow halo (shared geometry). */}
      <mesh position={[0, PIN_LIFT + 0.03, 0]} geometry={sphereGeometry} scale={glowScale}>
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={showLabel ? 0.28 : 0.14}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Stem connecting the dot to the surface (shared geometry). */}
      <mesh position={[0, PIN_LIFT * 0.5 + 0.01, 0]} geometry={cylinderGeometry}>
        <meshStandardMaterial
          color={COLOR_GOLD_WARM}
          emissive={COLOR_GOLD_WARM}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {showLabel && (
        <Html
          position={[0, PIN_LIFT + 0.12, 0]}
          center
          distanceFactor={6}
          zIndexRange={[20, 0]}
          occlude={false}
          wrapperClass="hostglobe-label-wrapper"
        >
          {/* Decorative duplicate of the city name; the accessible source of
              truth is the visible <HostCityGrid/> below, so this stays
              aria-hidden to avoid double announcement. */}
          <div
            aria-hidden="true"
            style={{
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              transform: 'translateZ(0)',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.01em',
              lineHeight: 1.2,
              color: COLOR_NAVY,
              background: emphasized
                ? 'linear-gradient(135deg, #F0CE7A, #C9A24B)'
                : 'rgba(245, 240, 232, 0.96)',
              border: `1px solid ${emphasized ? COLOR_GOLD_BRIGHT : COLOR_GOLD}`,
              boxShadow: '0 6px 18px rgba(15, 27, 58, 0.35)',
            }}
          >
            {city.name}
          </div>
        </Html>
      )}
    </group>
  );
}

interface GlobeBodyProps {
  quality: Quality;
  /** False while the globe's <View> is off-screen — pauses all per-frame work. */
  visible: boolean;
}

function GlobeBody({ quality, visible }: GlobeBodyProps) {
  const tier = QUALITY_TIERS[quality];
  const spinRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState<string | null>(null);
  const interactingRef = useRef(false);

  // One shared geometry per primitive for all 16 pins (was ~48 geometries).
  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(1, tier.pin, tier.pin),
    [tier.pin],
  );
  const cylinderGeometry = useMemo(
    () => new THREE.CylinderGeometry(0.004, 0.004, PIN_LIFT + 0.04, 6),
    [],
  );

  // Dispose the imperatively-created shared geometries on change / unmount
  // (R3F only auto-disposes geometries declared as JSX, not these).
  useEffect(() => {
    return () => {
      sphereGeometry.dispose();
      cylinderGeometry.dispose();
    };
  }, [sphereGeometry, cylinderGeometry]);

  const pins = useMemo<PinView[]>(
    () =>
      HOST_CITIES.map((city) => {
        const position = latLngToVector3(city.lat, city.lng, GLOBE_RADIUS + PIN_LIFT);
        const up = new THREE.Vector3(0, 1, 0);
        const dir = position.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        return { city, position, quaternion };
      }),
    [],
  );

  // Collect pin group refs so a SINGLE useFrame can animate them.
  const pinRefs = useRef(new Map<string, THREE.Group>());
  const registerRef = (name: string, group: THREE.Group | null) => {
    if (group) pinRefs.current.set(name, group);
    else pinRefs.current.delete(name);
  };

  // Single per-frame loop for the whole globe: auto-rotate + pin pulses.
  // Early-returns entirely when off-screen, and skips pin work once every pin
  // scale has settled to its resting target (no active/emphasized animation).
  useFrame((state, delta) => {
    if (!visible) return;

    const g = spinRef.current;
    if (g) {
      const idle = !interactingRef.current && active === null;
      if (idle) g.rotation.y += delta * tier.autoSpeed;
    }

    const t = state.clock.elapsedTime;
    for (const [name, group] of pinRefs.current) {
      const city = HOST_CITIES.find((c) => c.name === name);
      const emphasized = Boolean(city?.highlight);
      const isActive = active === name;
      const animated = isActive || emphasized;
      const pulse = animated ? 1 + Math.sin(t * 3) * 0.12 : 1;
      const target = (isActive ? 1.35 : emphasized ? 1.15 : 1) * pulse;
      const current = group.scale.x;
      // Skip settled, non-animated pins to avoid pointless lerps.
      if (!animated && Math.abs(current - target) < 0.001) continue;
      group.scale.setScalar(THREE.MathUtils.lerp(current, target, 0.18));
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 2, 4]} intensity={1.1} color={COLOR_GOLD_WARM} />
      <directionalLight position={[-4, -1, -2]} intensity={0.4} color="#5B6FB0" />

      <group ref={spinRef} rotation={[0.35, -2.1, 0.1]}>
        {/* Solid navy sphere. */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, tier.sphere, tier.sphere]} />
          <meshStandardMaterial
            color={COLOR_NAVY}
            roughness={0.85}
            metalness={0.15}
            emissive={COLOR_NAVY}
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Gold latitude / longitude wireframe shell. */}
        <mesh scale={1.001}>
          <sphereGeometry args={[GLOBE_RADIUS, tier.sphere, tier.sphere]} />
          <meshBasicMaterial
            color={COLOR_GOLD}
            wireframe
            transparent
            opacity={0.12}
            toneMapped={false}
          />
        </mesh>

        {/* Fresnel-ish rim halo. */}
        <mesh scale={1.06}>
          <sphereGeometry args={[GLOBE_RADIUS, tier.sphere, tier.sphere]} />
          <meshBasicMaterial
            color={COLOR_GOLD_WARM}
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {pins.map((pin) => (
          <Pin
            key={pin.city.name}
            pin={pin}
            sphereGeometry={sphereGeometry}
            cylinderGeometry={cylinderGeometry}
            active={active === pin.city.name}
            onActivate={setActive}
            registerRef={registerRef}
          />
        ))}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.5}
        autoRotate={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
        onStart={() => {
          interactingRef.current = true;
        }}
        onEnd={() => {
          interactingRef.current = false;
        }}
      />
    </>
  );
}

/**
 * Visible, accessible representation of every host city. This is the REAL
 * content of the Host Cities section: it works without WebGL, without pointer
 * hover, and for keyboard / screen-reader users. The globe is decoration layered
 * with it. Dallas (the brand home) is visually highlighted.
 */
function HostCityGrid() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {HOST_CITIES.map((city) => (
        <li
          key={city.name}
          className={[
            'rounded-xl border px-3 py-2 text-left',
            city.highlight
              ? 'border-gold bg-gold/10 shadow-sm'
              : 'border-navy/10 bg-cream-warm/60',
          ].join(' ')}
        >
          <span
            className={[
              'block text-[13px] font-bold leading-tight',
              city.highlight ? 'text-gold-warm' : 'text-navy',
            ].join(' ')}
          >
            {city.name}
            {city.highlight ? (
              <span className="ml-1 align-middle text-[10px] font-semibold uppercase tracking-wide text-gold">
                Home
              </span>
            ) : null}
          </span>
          <span className="block text-[11px] text-navy/45">{city.country}</span>
        </li>
      ))}
    </ul>
  );
}

export interface HostGlobeProps {
  className?: string;
}

export function HostGlobe({ className }: HostGlobeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const quality = useExperience((s) => s.quality);
  const webglEnabled = useExperience((s) => s.webglEnabled);
  const reducedMotion = useExperience((s) => s.reducedMotion);
  // Registers the globe region with the demand frameloop and pauses its
  // per-frame work when off-screen.
  const visible = useRegionVisibility(trackRef);

  // The canvas only renders the globe when WebGL is available AND motion is
  // allowed (SceneCanvas itself returns null otherwise). Mirror that here so we
  // don't reserve an empty aspect-square box on the fallback path.
  const showGlobe = webglEnabled && !reducedMotion;

  return (
    <div>
      {showGlobe && (
        <div
          ref={trackRef}
          aria-hidden="true"
          className={className}
          style={{ touchAction: 'pan-y', maxHeight: '60vh' }}
        >
          <View track={trackRef as React.RefObject<HTMLElement>}>
            <GlobeBody quality={quality} visible={visible} />
          </View>
        </div>
      )}

      {/* Visible, accessible host-city content (works with or without the globe).
          When the globe is shown this sits beneath it as the readable source of
          truth; when it is hidden this is the section's entire visual payload. */}
      <div className={showGlobe ? 'mt-5' : ''}>
        <p className="sr-only">
          FIFA World Cup 2026 host cities ({HOST_CITY_COUNT} total):
        </p>
        <HostCityGrid />
      </div>
    </div>
  );
}

export default HostGlobe;
