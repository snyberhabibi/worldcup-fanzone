"use client";

import { useMemo } from "react";
import { upcomingMatches, resolveTeam, formatKickoffCT } from "@/lib/games";

export function UpNext({ currentId }: { currentId: number }) {
  const list = useMemo(
    () => upcomingMatches(new Date(), 10).filter((m) => m.id !== currentId).slice(0, 3),
    [currentId]
  );

  if (list.length === 0) return null;

  return (
    <div className="panel" style={{ padding: "clamp(0.6rem, 1.4vw, 1rem)", display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0 }}>
      <p className="eyebrow text-gold">⏭ Up next</p>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {list.map((m) => {
          const h = resolveTeam(m.homeTeam);
          const a = resolveTeam(m.awayTeam);
          const ck = formatKickoffCT(m);
          return (
            <div key={m.id} className="pill" style={{ gap: "0.5rem" }}>
              <span style={{ color: "var(--cream-faint)", fontSize: "0.75em" }}>{ck.day}</span>
              <span className="emoji">{h.flag}</span>
              <span style={{ fontWeight: 800 }}>{m.homeTeam}</span>
              <span style={{ opacity: 0.6 }}>v</span>
              <span style={{ fontWeight: 800 }}>{m.awayTeam}</span>
              <span className="emoji">{a.flag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
