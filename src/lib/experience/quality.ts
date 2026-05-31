import type { Quality } from './store';

type NavigatorWithDeviceInfo = Navigator & {
  deviceMemory?: number;
};

/**
 * Heuristically determines a rendering quality tier based on device memory,
 * CPU concurrency, and whether the device is mobile. SSR-safe: returns
 * 'medium' when navigator is unavailable.
 */
export function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'medium';

  const nav = navigator as NavigatorWithDeviceInfo;
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(nav.userAgent ?? '');

  if (memory <= 2 || cores <= 2) return 'low';

  if (isMobile) {
    return memory >= 6 && cores >= 6 ? 'medium' : 'low';
  }

  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'medium';

  return 'low';
}
