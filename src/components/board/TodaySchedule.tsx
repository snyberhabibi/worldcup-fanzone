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
  currentIds,
  now,
}: {
  currentIds: number[];
  now: Date;
}) {
  const { isToday, label, matches } = matchesOnDay(now);
  if (matches.length === 0) return null;

  return (
    <div
      className="panel"
      style={{
        padding: "clamp(0.6rem, 1.4vh, 1rem)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.35rem, 0.9vh, 0.7rem)",
        minWidth: 0,
        width: "100%",
        flex: 1,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
        <p className="eyebrow text-gold">📅 {isToday ? "Today's games" : "Next matchday"}</p>
        <p className="text-dim" style={{ fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)" }}>
          {label} · all times CT
        </p>
      </div>

      <div
        style={{
          display: "grid",
          // Fit ALL of today's games: as many columns as fit, rows stretch to
          // fill the panel so nothing is clipped no matter the game count.
          gridTemplateColumns: "repeat(auto-fit, minmax(clamp(150px, 13vw, 200px), 1fr))",
          gridAutoRows: "1fr",
          gap: "clamp(0.4rem, 0.8vw, 0.7rem)",
          flex: 1,
          minHeight: 0,
        }}
      >
        {matches.map((m) => {
          const h = resolveTeam(m.homeTeam);
          const a = resolveTeam(m.awayTeam);
          const ck = formatKickoffCT(m);
          const status = matchStatus(m, now);
          const isCurrent = currentIds.includes(m.id);
          return (
            <div
              key={m.id}
              style={{
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: 14,
                padding: "clamp(0.38rem, 0.85vh, 0.7rem)",
                background: isCurrent ? "rgba(253, 185, 19, 0.14)" : "rgba(0, 0, 0, 0.22)",
                border: isCurrent ? "2px solid var(--yb-gold)" : "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "clamp(0.08rem, 0.4vh, 0.2rem)",
                opacity: status === "final" && !isCurrent ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem", minWidth: 0, overflow: "hidden" }}>
                <span className="display text-gold" style={{ fontSize: "clamp(0.8rem, 1.6vh, 1.2rem)", flexShrink: 0 }}>
                  {ck.time.replace(" CT", "")}
                </span>
                <StatusBadge status={status} isCurrent={isCurrent} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.22rem", fontSize: "clamp(0.72rem, 1.45vh, 1rem)", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
                <span className="emoji" style={{ flexShrink: 0 }}>{h.flag}</span>
                <span className="display">{m.homeTeam}</span>
                <span className="text-dim">v</span>
                <span className="display">{m.awayTeam}</span>
                <span className="emoji" style={{ flexShrink: 0 }}>{a.flag}</span>
              </div>
              <span className="text-dim" style={{ fontSize: "clamp(0.64rem, 1.25vh, 0.82rem)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", maxWidth: "100%" }}>
                {stageLabel(m)} · {m.city.split(",")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
