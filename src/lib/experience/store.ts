import { create } from 'zustand';

export type Quality = 'low' | 'medium' | 'high';

export interface ExperienceState {
  scrollProgress: number;
  velocity: number;
  activeSection: string | null;
  webglEnabled: boolean;
  reducedMotion: boolean;
  quality: Quality;
  pointer: { x: number; y: number };
  /**
   * Number of 3D set-piece regions currently intersecting the viewport. Drives
   * frameloop="demand": the canvas only keeps rendering while this is > 0, so
   * the GPU goes idle once the user scrolls past every <View>.
   */
  visibleRegions: number;
  setScroll(progress: number, velocity: number): void;
  setActiveSection(s: string | null): void;
  setWebglEnabled(b: boolean): void;
  setReducedMotion(b: boolean): void;
  setQuality(q: Quality): void;
  setPointer(x: number, y: number): void;
  /** Register/unregister a visible 3D region (used by per-set-piece observers). */
  setRegionVisible(visible: boolean): void;
}

export const useExperience = create<ExperienceState>()((set) => ({
  scrollProgress: 0,
  velocity: 0,
  activeSection: null,
  webglEnabled: false,
  reducedMotion: false,
  quality: 'high',
  pointer: { x: 0, y: 0 },
  visibleRegions: 0,
  setScroll: (progress, velocity) => set({ scrollProgress: progress, velocity }),
  setActiveSection: (s) => set({ activeSection: s }),
  setWebglEnabled: (b) => set({ webglEnabled: b }),
  setReducedMotion: (b) => set({ reducedMotion: b }),
  setQuality: (q) => set({ quality: q }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setRegionVisible: (visible) =>
    set((s) => ({
      visibleRegions: Math.max(0, s.visibleRegions + (visible ? 1 : -1)),
    })),
}));
