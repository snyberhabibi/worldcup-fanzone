"use client";

import { resolveTeam } from "@/lib/games";
import type { Match } from "@/data/schedule";
import type { Side } from "@/types";

export function SuccessScreen({
  picks,
  firstName,
  onDone,
}: {
  picks: { match: Match; side: Side }[];
  firstName: string;
  onDone: () => void;
}) {
  const multi = picks.length > 1;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(0.8rem, 3vh, 2rem)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <span className="emoji anim-pop" style={{ fontSize: "clamp(3rem, 11vw, 6.5rem)" }}>🎉</span>
      <h1 className="display neon-gold" style={{ fontSize: "clamp(2rem, 6.5vw, 4.2rem)" }}>
        You&apos;re in{firstName ? `, ${firstName.trim()}` : ""}!
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        {multi && <p className="eyebrow">Your picks</p>}
        {picks.map(({ match, side }) => {
          const team = resolveTeam(side === "home" ? match.homeTeam : match.awayTeam);
          return (
            <div
              key={match.id}
              className="anim-rise"
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "clamp(1.1rem, 2.8vw, 1.7rem)" }}
            >
              <span className="emoji" style={{ fontSize: "1.5em" }}>{team.flag}</span>
              <span className="display">You backed {team.name}</span>
            </div>
          );
        })}
      </div>

      <p className="text-dim" style={{ maxWidth: 540, fontSize: "clamp(1rem, 2.2vw, 1.3rem)" }}>
        You&apos;re entered to win <span className="text-red">free Yalla Bites</span>. Winners are drawn
        on the big screen — stick around! 🍽️
      </p>
      <button className="btn btn--gold btn--lg" onClick={onDone}>
        Next customer →
      </button>
    </div>
  );
}
