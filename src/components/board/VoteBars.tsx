"use client";

import { useEffect, useRef } from "react";
import { resolveTeam, type ResolvedTeam } from "@/lib/games";
import { burstConfetti } from "@/lib/celebrate";
import { useCountUp } from "@/lib/use-count-up";
import type { Match } from "@/data/schedule";
import type { Tally } from "@/types";

function TeamColumn({
  t,
  count,
  side,
  leading,
  align,
}: {
  t: ResolvedTeam;
  count: number;
  side: "home" | "away";
  leading: boolean;
  align: "left" | "right";
}) {
  const color = side === "home" ? "var(--home)" : "var(--away)";
  const glow = side === "home" ? "var(--home-glow)" : "var(--away-glow)";
  const shown = useCountUp(count, 800, true);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        gap: "0.25rem",
        minWidth: 0,
      }}
    >
      <span className="team__flag" style={{ fontSize: "clamp(2.4rem, 7.5vh, 5.5rem)" }}>{t.flag}</span>
      <span
        className="display"
        style={{ fontSize: "clamp(1.2rem, 3.4vh, 2.4rem)", textAlign: align, lineHeight: 1 }}
      >
        {t.name}
      </span>
      <span
        className="display"
        style={{ fontSize: "clamp(2.2rem, 7.5vh, 5.5rem)", color, textShadow: `0 0 28px ${glow}`, lineHeight: 1 }}
      >
        {shown}
      </span>
      {leading && <span className="pill pill--gold">LEADING</span>}
    </div>
  );
}

export function VoteBars({ match, tally }: { match: Match; tally: Tally | null }) {
  const home = resolveTeam(match.homeTeam);
  const away = resolveTeam(match.awayTeam);
  const h = tally?.home ?? 0;
  const a = tally?.away ?? 0;
  const total = h + a;
  const totalShown = useCountUp(total, 800, true);
  const hp = total ? (h / total) * 100 : 50;
  const ap = 100 - hp;

  // Celebrate every 25 votes — but only on genuine forward progress. Track the
  // running peak (not the last value) so a stale/lower poll dipping then
  // recovering past a /25 boundary can't re-fire confetti. Resets on game
  // change via the keyed remount in BoardApp.
  const peak = useRef(0);
  useEffect(() => {
    if (total <= peak.current) return;
    if (Math.floor(total / 25) > Math.floor(peak.current / 25)) burstConfetti();
    peak.current = total;
  }, [total]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "clamp(0.6rem, 2vh, 1.6rem)",
        minHeight: 0,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "clamp(1rem, 3vw, 3rem)" }}>
        <TeamColumn t={home} count={h} side="home" leading={total > 0 && h >= a} align="left" />
        <p className="display text-gold" style={{ fontSize: "clamp(1.8rem, 6vh, 4rem)", textAlign: "center" }}>VS</p>
        <TeamColumn t={away} count={a} side="away" leading={total > 0 && a > h} align="right" />
      </div>

      {/* Tug-of-war bar */}
      <div
        style={{
          display: "flex",
          height: "clamp(38px, 5.5vh, 72px)",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: `${hp}%`,
            transition: "width 0.7s cubic-bezier(.34,1.4,.64,1)",
            background: "linear-gradient(90deg, var(--home-glow), var(--home))",
            display: "flex",
            alignItems: "center",
            paddingLeft: "1rem",
          }}
        >
          {hp >= 12 && (
            <span className="display" style={{ color: "#fff", fontSize: "clamp(1rem, 2.4vw, 1.8rem)" }}>
              {Math.round(hp)}%
            </span>
          )}
        </div>
        <div
          style={{
            width: `${ap}%`,
            transition: "width 0.7s cubic-bezier(.34,1.4,.64,1)",
            background: "linear-gradient(270deg, var(--away-glow), var(--away))",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "1rem",
          }}
        >
          {ap >= 12 && (
            <span className="display" style={{ color: "#06302b", fontSize: "clamp(1rem, 2.4vw, 1.8rem)" }}>
              {Math.round(ap)}%
            </span>
          )}
        </div>
      </div>

      <p className="eyebrow" style={{ textAlign: "center" }}>
        {totalShown} {total === 1 ? "vote" : "votes"} · one vote per phone
      </p>
    </div>
  );
}
