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
        gap: "0.4rem",
        padding: "clamp(1.1rem, 3.5vw, 2.4rem)",
        minWidth: "clamp(140px, 24vw, 280px)",
      }}
    >
      <span className="team__flag anim-float">{t.flag}</span>
      <span className="display" style={{ fontSize: "clamp(1.1rem, 3vw, 2.2rem)", textAlign: "center", color: "var(--navy)" }}>
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
      <div style={{ textAlign: "center" }}>
        <p className="eyebrow">DAR Coffee × Yalla Bites · {stageLabel(match)}</p>
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
