"use client";

import { useEffect, useReducer } from "react";
import { kickoff, isLive, hasEnded } from "@/lib/games";
import type { Match } from "@/data/schedule";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function KickoffCountdown({ match }: { match: Match }) {
  const [, tick] = useReducer((c) => c + 1, 0);
  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();

  let content: React.ReactNode;
  let tone: "live" | "final" | "soon" = "soon";
  if (hasEnded(match, now)) {
    tone = "final";
    content = "Full time";
  } else if (isLive(match, now)) {
    tone = "live";
    const mins = Math.floor((now.getTime() - kickoff(match).getTime()) / 60000);
    content = (
      <>
        <span className="live__dot" /> LIVE · {mins}&apos;
      </>
    );
  } else {
    content = <>⏱ Kicks off in {fmt(kickoff(match).getTime() - now.getTime())}</>;
  }

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45em",
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    letterSpacing: "0.04em",
    borderRadius: 999,
    padding: "0.35em 0.95em",
    fontSize: "clamp(0.8rem, 1.5vw, 1.05rem)",
    marginTop: "0.2rem",
  };
  const toneStyle: React.CSSProperties =
    tone === "live"
      ? { background: "rgba(255,68,68,0.16)", color: "var(--yb-red)", border: "1px solid rgba(255,68,68,0.4)" }
      : tone === "final"
        ? { background: "rgba(250,249,246,0.08)", color: "var(--cream-dim)", border: "1px solid var(--line)" }
        : { background: "rgba(253,185,19,0.14)", color: "var(--yb-gold)", border: "1px solid rgba(253,185,19,0.4)" };

  return <span style={{ ...base, ...toneStyle }}>{content}</span>;
}
