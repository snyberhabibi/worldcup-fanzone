"use client";

import {
  matchesOnDay,
  matchStatus,
  resolveTeam,
  formatKickoffCT,
  stageLabel,
} from "@/lib/games";

function StatusBadge({
  status,
  isCurrent,
}: {
  status: "live" | "final" | "upcoming";
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <span className="pill pill--gold" style={{ fontSize: "0.7rem", padding: "0.2em 0.7em" }}>
        ON SCREEN
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="live" style={{ fontSize: "0.7rem" }}>
        <span className="live__dot" />
        LIVE
      </span>
    );
  }
  if (status === "final") {
    return (
      <span className="pill" style={{ fontSize: "0.7rem", padding: "0.2em 0.7em" }}>
        FINAL
      </span>
    );
  }
  return null; // upcoming — the kickoff time already conveys it
}

export function TodaySchedule({
  currentId,
  now,
}: {
  currentId: number;
  now: Date;
}) {
  const { isToday, label, matches } = matchesOnDay(now);
  if (matches.length === 0) return null;

  return (
    <div
      className="panel"
      style={{
        padding: "clamp(0.7rem, 1.4vw, 1.1rem)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.5rem, 1vw, 0.8rem)",
        minWidth: 0,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
        <p className="eyebrow text-gold">📅 {isToday ? "Today's games" : "Next matchday"}</p>
        <p className="text-dim" style={{ fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)" }}>
          {label} · all times CT
        </p>
      </div>

      <div style={{ display: "flex", gap: "clamp(0.5rem, 1vw, 0.8rem)", flexWrap: "wrap", flex: 1 }}>
        {matches.map((m) => {
          const h = resolveTeam(m.homeTeam);
          const a = resolveTeam(m.awayTeam);
          const ck = formatKickoffCT(m);
          const status = matchStatus(m, now);
          const isCurrent = m.id === currentId;
          return (
            <div
              key={m.id}
              style={{
                flex: "1 1 clamp(150px, 13vw, 220px)",
                minWidth: 138,
                borderRadius: 14,
                padding: "clamp(0.5rem, 1vw, 0.8rem)",
                background: isCurrent ? "rgba(253, 185, 19, 0.14)" : "rgba(0, 0, 0, 0.22)",
                border: isCurrent ? "2px solid var(--yb-gold)" : "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                opacity: status === "final" && !isCurrent ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                <span className="display text-gold" style={{ fontSize: "clamp(1rem, 1.8vw, 1.4rem)" }}>
                  {ck.time.replace(" CT", "")}
                </span>
                <StatusBadge status={status} isCurrent={isCurrent} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "clamp(0.9rem, 1.5vw, 1.15rem)" }}>
                <span className="emoji">{h.flag}</span>
                <span className="display">{m.homeTeam}</span>
                <span className="text-dim">v</span>
                <span className="display">{m.awayTeam}</span>
                <span className="emoji">{a.flag}</span>
              </div>
              <span className="text-dim" style={{ fontSize: "clamp(0.7rem, 1.1vw, 0.85rem)" }}>
                {stageLabel(m)} · {m.city.split(",")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
