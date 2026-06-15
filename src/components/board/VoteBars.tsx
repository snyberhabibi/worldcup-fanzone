"use client";

import { resolveTeam, type ResolvedTeam } from "@/lib/games";
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

  // DAR Pick discount — DISABLED per owner. To re-enable, uncomment these
  // lines and the banner block in the render below.
  // const leader = total > 0 ? (h >= a ? home : away) : null;
  // const tie = total > 0 && h === a;
  // const pct = Math.min(Math.max(h, a), 100);
  // const pctShown = useCountUp(pct, 800, true);

  // No milestone confetti on the projector board. Under a signup surge the total
  // crosses several /25 marks within one 5s poll window, so the board fired
  // overlapping ~160-particle bursts UPWARD into the top third — a dense
  // near-white/gold cloud that on a projector reads as "a white bar flashing the
  // top third." (The dark-background fix couldn't help: confetti is drawn pixels,
  // not an unpainted compositor gap.) Per-vote celebration still fires on the
  // voter's own phone/kiosk, and the raffle winner reveal still celebrates
  // (SpinWheel → bigCelebrate). This board is a passive display.

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

      {/* DAR Pick discount banner — DISABLED per owner; uncomment to restore
          (also uncomment the pct computation above):
      <div
        style={{
          alignSelf: "center",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4em",
          flexWrap: "wrap",
          textAlign: "center",
          background: "color-mix(in srgb, var(--yb-gold) 16%, transparent)",
          border: "1px solid color-mix(in srgb, var(--yb-gold) 55%, transparent)",
          borderRadius: 999,
          padding: "clamp(0.3rem, 0.9vh, 0.6rem) clamp(0.8rem, 1.8vw, 1.5rem)",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          lineHeight: 1.12,
          fontSize: "clamp(0.78rem, 2vh, 1.5rem)",
        }}
      >
        {total === 0 ? (
          <span className="text-gold">☕ DAR Pick — the first vote starts the discount</span>
        ) : tie ? (
          <span>
            🤝 <span className="text-gold">DAR Pick: TIE</span> ·{" "}
            <span style={{ color: "var(--yb-red)" }}>{pctShown}% off</span> — vote to pick the team!
          </span>
        ) : (
          <span>
            ☕ <span className="text-gold">DAR Pick:</span> {leader!.flag} {leader!.name} ·{" "}
            <span style={{ color: "var(--yb-red)" }}>{pctShown}% OFF</span> your next DAR order
          </span>
        )}
      </div>
      */}

      <p className="eyebrow" style={{ textAlign: "center" }}>
        {totalShown} {total === 1 ? "vote" : "votes"} · one vote per phone
      </p>
    </div>
  );
}
