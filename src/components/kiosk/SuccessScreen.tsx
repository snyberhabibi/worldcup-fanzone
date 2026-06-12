"use client";

import { resolveTeam } from "@/lib/games";
import type { Match } from "@/data/schedule";
import type { Side } from "@/types";

export function SuccessScreen({
  match,
  side,
  firstName,
  onDone,
}: {
  match: Match;
  side: Side;
  firstName: string;
  onDone: () => void;
}) {
  const team = resolveTeam(side === "home" ? match.homeTeam : match.awayTeam);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(1rem, 3vh, 2rem)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <span className="emoji anim-pop" style={{ fontSize: "clamp(3.5rem, 12vw, 7rem)" }}>🎉</span>
      <h1 className="display neon-gold" style={{ fontSize: "clamp(2.2rem, 7vw, 4.5rem)" }}>
        You&apos;re in{firstName ? `, ${firstName.trim()}` : ""}!
      </h1>
      <div
        className="anim-rise"
        style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "clamp(1.2rem, 3vw, 1.8rem)" }}
      >
        <span className="emoji" style={{ fontSize: "1.6em" }}>{team.flag}</span>
        <span className="display">You backed {team.name}</span>
      </div>
      <p className="text-dim" style={{ maxWidth: 540, fontSize: "clamp(1rem, 2.2vw, 1.3rem)" }}>
        You&apos;re entered to win <span className="text-red">free Yalla Bites</span>. Winners are drawn
        on the big screen — good luck! 🍽️
      </p>
      <button className="btn btn--gold btn--lg" onClick={onDone}>
        Next customer →
      </button>
    </div>
  );
}
