"use client";

import { resolveTeam, stageLabel, formatKickoffCT, type ResolvedTeam } from "@/lib/games";
import type { Match } from "@/data/schedule";
import type { SessionStatus } from "@/types";

function TeamMini({ t }: { t: ResolvedTeam }) {
  return (
    <div
      className="card-cream"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "clamp(1.1rem, 3vw, 2.2rem)",
        width: "clamp(230px, 30vw, 360px)",
        minHeight: "clamp(220px, 34vh, 300px)",
        flexShrink: 0,
      }}
    >
      <span className="team__flag anim-float">{t.flag}</span>
      <span
        className="display"
        style={{
          fontSize: "clamp(1.1rem, 2.5vw, 2rem)",
          textAlign: "center",
          color: "var(--navy)",
          lineHeight: 1.05,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {t.name}
      </span>
      <span
        className="display"
        style={{ color: "var(--yb-sage)", letterSpacing: "0.16em", fontSize: "clamp(0.8rem, 1.6vw, 1.1rem)" }}
      >
        {t.code}
      </span>
    </div>
  );
}

const SPARKLES: { top: string; left: string; s: number; delay: string; dur: string }[] = [
  { top: "14%", left: "7%", s: 9, delay: "0s", dur: "3.6s" },
  { top: "24%", left: "93%", s: 6, delay: "1.2s", dur: "4.1s" },
  { top: "68%", left: "5%", s: 7, delay: "0.6s", dur: "3.2s" },
  { top: "82%", left: "91%", s: 10, delay: "2s", dur: "4.6s" },
  { top: "16%", left: "68%", s: 5, delay: "1.8s", dur: "3.9s" },
  { top: "58%", left: "80%", s: 6, delay: "0.3s", dur: "3.4s" },
  { top: "42%", left: "3%", s: 5, delay: "2.4s", dur: "4.2s" },
  { top: "9%", left: "44%", s: 5, delay: "1s", dur: "3.7s" },
  { top: "88%", left: "38%", s: 7, delay: "0.9s", dur: "4s" },
  { top: "52%", left: "96%", s: 5, delay: "1.5s", dur: "3.3s" },
  { top: "30%", left: "18%", s: 4, delay: "2.7s", dur: "4.4s" },
  { top: "75%", left: "62%", s: 6, delay: "0.5s", dur: "3.8s" },
];

function Sparkles() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
      {SPARKLES.map((sp, i) => (
        <span
          key={i}
          className="sparkle"
          style={{ top: sp.top, left: sp.left, width: sp.s, height: sp.s, animationDelay: sp.delay, animationDuration: sp.dur }}
        />
      ))}
    </div>
  );
}

export function AttractScreen({
  match,
  status,
  onStart,
}: {
  match: Match;
  status: SessionStatus;
  onStart: () => void;
}) {
  const home = resolveTeam(match.homeTeam);
  const away = resolveTeam(match.awayTeam);
  const { full } = formatKickoffCT(match);
  const closed = status === "closed";

  return (
    <div
      onClick={closed ? undefined : onStart}
      role={closed ? undefined : "button"}
      aria-label={closed ? undefined : "Tap to vote"}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(1rem, 3vh, 2.4rem)",
        padding: "2rem",
        cursor: closed ? "default" : "pointer",
      }}
    >
      <Sparkles />
      <div style={{ textAlign: "center" }}>
        <p className="eyebrow">DAR Coffee × Yalla Bites × Haus of Design · {stageLabel(match)}</p>
        <p className="text-dim" style={{ marginTop: 6 }}>{full}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(1rem, 5vw, 3.5rem)" }}>
        <TeamMini t={home} />
        <span className="display text-gold" style={{ fontSize: "clamp(1.6rem, 5vw, 3.2rem)" }}>VS</span>
        <TeamMini t={away} />
      </div>

      {closed ? (
        <div className="panel" style={{ padding: "1.5rem 2rem", textAlign: "center" }}>
          <p className="display" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Voting is paused</p>
          <p className="text-dim">Ask a barista to open the next game.</p>
        </div>
      ) : (
        <>
          <h1
            className="display neon-gold anim-glow"
            style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)", textAlign: "center" }}
          >
            TAP TO VOTE
          </h1>
          <p
            className="display text-cream anim-blink"
            style={{ fontSize: "clamp(1rem, 2.6vw, 1.6rem)", textAlign: "center" }}
          >
            Pick your team · Enter to win <span className="text-red">FREE Yalla Bites</span> 🎟️
          </p>
        </>
      )}
    </div>
  );
}
