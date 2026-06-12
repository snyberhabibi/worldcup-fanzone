"use client";

import { useCallback, useEffect, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Toggles browser fullscreen where the Fullscreen API is supported
 * (desktop / Android / touchscreen PCs). iPad Safari doesn't support it, so
 * there we show a hint to "Add to Home Screen" (the PWA opens fullscreen).
 */
export function FullscreenButton({ style }: { style?: React.CSSProperties }) {
  const hydrated = useHydrated();
  const [isFs, setIsFs] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenEnabled) {
        setHint(true);
        setTimeout(() => setHint(false), 6000);
        return;
      }
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setHint(true);
      setTimeout(() => setHint(false), 6000);
    }
  }, []);

  if (!hydrated) return null;

  return (
    <>
      <button
        onClick={toggle}
        aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(250,249,246,0.06)",
          border: "1px solid var(--line)",
          color: "var(--cream-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
          ...style,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {isFs ? (
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M16 3v3a2 2 0 0 0 2 2h3" />
              <path d="M8 21v-3a2 2 0 0 0-2-2H3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </>
          ) : (
            <>
              <path d="M3 8V5a2 2 0 0 1 2-2h3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
            </>
          )}
        </svg>
      </button>
      {hint && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            maxWidth: 480,
            background: "var(--yb-cream)",
            color: "var(--ink)",
            padding: "0.85rem 1.2rem",
            borderRadius: 14,
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          On iPad, fullscreen comes from the Home Screen: tap <b>Share → Add to Home Screen</b>, then open it from there — it launches fullscreen.
        </div>
      )}
    </>
  );
}
