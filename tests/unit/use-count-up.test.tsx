// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountUp } from "@/lib/use-count-up";

// The hook animates via requestAnimationFrame, reading elapsed time from the
// timestamp handed to its callback. We stub rAF to invoke the callback once,
// synchronously, with a timestamp far past `start` so easeOutCubic completes to
// the goal in a single frame (p === 1). cancelAnimationFrame is a noop.
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(performance.now() + 10_000);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCountUp", () => {
  it("shows the initial target immediately, with no count-up on first paint", () => {
    const { result } = renderHook(({ t }) => useCountUp(t), {
      initialProps: { t: 42 },
    });
    // First paint: from === goal, the effect returns early — value is exact.
    expect(result.current).toBe(42);
  });

  it("animates up to a higher target", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t), {
      initialProps: { t: 10 },
    });
    expect(result.current).toBe(10);

    rerender({ t: 100 });
    expect(result.current).toBe(100);
  });

  it("monotonic=true: a lower target does NOT drop the displayed value", () => {
    const { result, rerender } = renderHook(
      ({ t }) => useCountUp(t, 800, true),
      { initialProps: { t: 50 } }
    );
    expect(result.current).toBe(50);

    // Climb to a peak.
    rerender({ t: 80 });
    expect(result.current).toBe(80);

    // A lower target is ignored — goal stays at the peak, value holds.
    rerender({ t: 30 });
    expect(result.current).toBe(80);
  });

  it("monotonic=true: still climbs to a new higher target after holding a peak", () => {
    const { result, rerender } = renderHook(
      ({ t }) => useCountUp(t, 800, true),
      { initialProps: { t: 50 } }
    );
    rerender({ t: 80 });
    rerender({ t: 30 }); // held at 80
    expect(result.current).toBe(80);

    rerender({ t: 120 });
    expect(result.current).toBe(120);
  });

  it("monotonic=false: a lower target IS reflected", () => {
    const { result, rerender } = renderHook(
      ({ t }) => useCountUp(t, 800, false),
      { initialProps: { t: 50 } }
    );
    expect(result.current).toBe(50);

    rerender({ t: 80 });
    expect(result.current).toBe(80);

    rerender({ t: 30 });
    expect(result.current).toBe(30);
  });
});
