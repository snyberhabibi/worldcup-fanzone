"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { getMatch, pickDefaultMatchId, stageLabel, formatKickoffCT } from "@/lib/games";
import type { SessionState, Tally, Entrant, DrawResult } from "@/types";
import type { Match } from "@/data/schedule";
import { VoteBars } from "./VoteBars";
import { TodaySchedule } from "./TodaySchedule";
import { QrTile } from "./QrTile";
import { VoteQrTile } from "./VoteQrTile";
import { SpinWheel } from "./SpinWheel";
import { Splash } from "@/components/Splash";
import { useHydrated } from "@/lib/use-hydrated";
import { FullscreenButton } from "@/components/FullscreenButton";
import { KickoffCountdown } from "./KickoffCountdown";

// One game's live tally. Each slot game polls independently so simultaneous
// (stacked) games each animate their own bar.
function GameTally({ match, compact }: { match: Match; compact: boolean }) {
  const { data: tally } = usePoll<Tally>(
    () => fetch(`/api/tally?matchId=${match.id}`).then((r) => r.json()),
    2000
  );
  const live = tally && tally.matchId === match.id ? tally : null;
  if (!compact) return <VoteBars match={match} tally={live} />;
  return (
    <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "clamp(0.75rem, 2vw, 1.5rem)" }}>
      <p className="eyebrow text-gold" style={{ textAlign: "center" }}>{stageLabel(match)}</p>
      <VoteBars match={match} tally={live} />
    </div>
  );
}

export function BoardApp() {
  const mounted = useHydrated();

  const { data: session } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    2500
  );

  const matchIds = session?.matchIds?.length ? session.matchIds : [pickDefaultMatchId(new Date())];
  const slotMatches = matchIds.map((id) => getMatch(id)).filter(Boolean) as Match[];
  const primary = slotMatches[0] ?? getMatch(pickDefaultMatchId(new Date()))!;
  const multi = slotMatches.length > 1;
  const status = session?.status ?? "open";
  const { full } = formatKickoffCT(primary);

  // Detect a fresh draw broadcast via the session and trigger the wheel.
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [pool, setPool] = useState<Entrant[]>([]);
  const seenNonce = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!session) return;
    const d = session.lastDraw;
    if (!initialized.current) {
      // Don't replay an old draw that already existed when the board loaded.
      initialized.current = true;
      seenNonce.current = d?.nonce ?? null;
      return;
    }
    if (d && seenNonce.current !== d.nonce) {
      seenNonce.current = d.nonce;
      fetch(`/api/entrants?matchId=${d.matchId}`)
        .then((r) => r.json())
        .then((data) => {
          setPool(data.entrants || []);
          setDraw(d);
        })
        .catch(() => {
          setPool([]);
          setDraw(d);
        });
    }
  }, [session]);

  if (!mounted) return <Splash />;

  // Fresh on each ~2s poll re-render → keeps live/final status + day rollover current.
  const now = new Date();

  return (
    <main
      className="screen arcade-bg safe"
      style={{
        padding: "clamp(0.75rem, 2vw, 1.5rem)",
        gap: "clamp(0.6rem, 1.5vh, 1.1rem)",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(55% 60% at 16% 44%, rgba(255,68,68,0.16) 0%, transparent 62%), radial-gradient(55% 60% at 84% 44%, rgba(47,212,192,0.15) 0%, transparent 62%)",
        }}
      />
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/yallabites-logo.svg" alt="Yalla Bites" style={{ height: 36 }} />
          <span className="eyebrow">DAR Coffee × Yalla Bites × Haus of Design</span>
        </div>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p className="display" style={{ fontSize: "clamp(1rem, 2.4vw, 1.6rem)" }}>
            {multi ? `${slotMatches.length} games live` : stageLabel(primary)}
          </p>
          <p className="text-dim" style={{ fontSize: "0.85rem" }}>{full}</p>
          <KickoffCountdown match={primary} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div className={`live ${status === "closed" ? "live--closed" : ""}`}>
            <span className="live__dot" />
            {status === "closed" ? "Voting paused" : "Live voting"}
          </div>
          <FullscreenButton />
        </div>
      </header>

      {multi ? (
        <div style={{ flex: 1, display: "flex", gap: "clamp(0.75rem, 2vw, 1.5rem)", minHeight: 0, flexWrap: "wrap" }}>
          {slotMatches.map((m) => (
            <div key={m.id} style={{ flex: "1 1 360px", display: "flex", minWidth: 0, minHeight: 0 }}>
              <GameTally match={m} compact />
            </div>
          ))}
        </div>
      ) : (
        <GameTally match={primary} compact={false} />
      )}

      <footer
        style={{
          display: "flex",
          gap: "clamp(0.6rem, 1.4vw, 1.1rem)",
          alignItems: "stretch",
          flexWrap: "nowrap",
          flexShrink: 0,
          height: "clamp(150px, 23vh, 210px)",
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden" }}>
          <TodaySchedule currentIds={matchIds} now={now} />
        </div>
        <VoteQrTile compact />
        <QrTile compact />
      </footer>

      {draw && (
        <SpinWheel
          match={getMatch(draw.matchId) ?? primary}
          pool={pool}
          draw={draw}
          onClose={() => setDraw(null)}
        />
      )}
    </main>
  );
}
