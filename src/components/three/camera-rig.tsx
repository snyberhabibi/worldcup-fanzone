'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useRef } from 'react';
import * as THREE from 'three';

import { useExperience } from '@/lib/experience/store';

/**
 * CameraRig
 *
 * Eases the shared camera's position and look-at target from the global
 * experience store (scrollProgress + pointer). Runs inside the single
 * <Canvas>. Uses maath `easing.damp3` for frame-rate-independent smoothing so
 * there is no jitter regardless of device refresh rate.
 *
 * The motion is deliberately gentle: a slow dolly + a small parallax sway that
 * follows the pointer. This gives the "cinematic stadium-night depth" feel
 * without ever competing with foreground content or causing motion sickness.
 *
 * Note: this component never mounts under reduced motion, because the entire
 * scene canvas returns null in that case (gated in scene-canvas.tsx).
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    // Clamp delta to avoid large camera jumps after tab refocus / GC pauses.
    const dt = Math.min(delta, 1 / 30);

    const { scrollProgress, pointer } = useExperience.getState();

    // Pointer is normalised to [-1, 1] in the store. Keep parallax subtle.
    const px = pointer.x * 0.6;
    const py = pointer.y * 0.4;

    // Slow dolly: pull the camera back and lift it slightly as the user
    // scrolls down the page, revealing more of the ambient depth field.
    const z = 6 + scrollProgress * 2.5;
    const y = py + scrollProgress * 0.6;
    const x = px;

    easing.damp3(camera.position, [x, y, z], 0.5, dt);

    // Ease the look-at target with a touch of pointer influence so the whole
    // scene feels alive, then apply it.
    easing.damp3(
      target.current,
      [px * 0.3, py * 0.3, 0],
      0.6,
      dt,
    );
    camera.lookAt(target.current);
  });

  return null;
}

export default CameraRig;
