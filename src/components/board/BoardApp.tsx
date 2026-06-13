"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { getMatch, pickDefaultMatchId, stageLabel, formatKickoffCT } from "@/lib/games";
import type { SessionState, Tally, Entrant, DrawResult } from "@/types";
import { VoteBars } from "./VoteBars";
import { TodaySchedule } from "./TodaySchedule";
import { QrTile } from "./QrTile";
import { VoteQrTile } from "./VoteQrTile";
import { SpinWheel } from "./SpinWheel";
import { Splash } from "@/components/Splash";
import { useHydrated } from "@/lib/use-hydrated";
import { FullscreenButton } from "@/components/FullscreenButton";
import { KickoffCountdown } from "./KickoffCountdown";

export function BoardApp() {
  const mounted = useHydrated();

  const { data: session } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    2500
  );

  const matchId = session?.matchId ?? pickDefaultMatchId(new Date());
  const match = getMatch(matchId) ?? getMatch(pickDefaultMatchId(new Date()))!;
  const status = session?.status ?? "open";
  const { full } = formatKickoffCT(match);

  const { data: tally } = usePoll<Tally>(
    () => fetch(`/api/tally?matchId=${matchId}`).then((r) => r.json()),
    2000
  );
  // Ignore a tally that belongs to a just-switched match until the next poll.
  const liveTally = tally && tally.matchId === matchId ? tally : null;

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
      style={{ padding: "clamp(1rem, 2.5vw, 2rem)", gap: "clamp(0.75rem, 2vh, 1.5rem)" }}
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
          <p className="display" style={{ fontSize: "clamp(1rem, 2.4vw, 1.6rem)" }}>{stageLabel(match)}</p>
          <p className="text-dim" style={{ fontSize: "0.85rem" }}>{full}</p>
          <KickoffCountdown match={match} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div className={`live ${status === "closed" ? "live--closed" : ""}`}>
            <span className="live__dot" />
            {status === "closed" ? "Voting paused" : "Live voting"}
          </div>
          <FullscreenButton />
        </div>
      </header>

      <VoteBars match={match} tally={liveTally} />

      <footer style={{ display: "flex", gap: "clamp(0.75rem, 2vw, 1.5rem)", alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          <TodaySchedule currentId={matchId} now={now} />
        </div>
        <VoteQrTile />
        <QrTile />
      </footer>

      {draw && (
        <SpinWheel
          match={getMatch(draw.matchId) ?? match}
          pool={pool}
          draw={draw}
          onClose={() => setDraw(null)}
        />
      )}
    </main>
  );
}
