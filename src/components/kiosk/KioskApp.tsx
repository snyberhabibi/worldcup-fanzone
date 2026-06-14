"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMatch, pickDefaultMatchId } from "@/lib/games";
import { usePoll } from "@/lib/use-poll";
import { useSound } from "@/lib/use-sound";
import { burstConfetti } from "@/lib/celebrate";
import type { SessionState, Side } from "@/types";
import type { Match } from "@/data/schedule";
import { AttractScreen } from "./AttractScreen";
import { EntryScreen } from "./EntryScreen";
import { PickScreen } from "./PickScreen";
import { SuccessScreen } from "./SuccessScreen";
import { BaristaPanel } from "./BaristaPanel";
import { Splash } from "@/components/Splash";
import { useHydrated } from "@/lib/use-hydrated";
import { FullscreenButton } from "@/components/FullscreenButton";

type Phase = "attract" | "entry" | "pick" | "success";

const IDLE_MS = 30_000;

export function KioskApp() {
  const sound = useSound();
  const mounted = useHydrated();
  const [phase, setPhase] = useState<Phase>("attract");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const consent = true; // voting = consent (disclosed on the entry screen)

  // A customer's run is pinned to the slot they started on, so a barista
  // game-switch mid-flow can't reattribute their picks. With stacked voting a
  // slot holds 1+ simultaneous games; the customer picks a winner for each, one
  // game at a time. runIds = pinned slot; pickIndex = which game; picks = locked.
  const [runIds, setRunIds] = useState<number[] | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [picks, setPicks] = useState<{ match: Match; side: Side }[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: session, refresh } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    4000
  );

  const slotIds = useMemo(
    () => (session?.matchIds?.length ? session.matchIds : [pickDefaultMatchId(new Date())]),
    [session]
  );
  const slotMatches = slotIds.map((id) => getMatch(id)).filter(Boolean) as Match[];
  const status = session?.status ?? "open";

  // Before a run starts the flow tracks the live slot; once started it's pinned.
  const activeMatches = (runIds ?? slotIds)
    .map((id) => getMatch(id))
    .filter(Boolean) as Match[];
  const gameCount = activeMatches.length;
  const votingMatch = activeMatches[pickIndex] ?? activeMatches[0] ?? slotMatches[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const resetToAttract = useCallback(() => {
    setFirstName("");
    setPhone("");
    setRunIds(null);
    setPickIndex(0);
    setPicks([]);
    setPhase("attract");
  }, []);

  // Inactivity reset: a customer who walks away mid-flow shouldn't strand the next.
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => resetToAttract(), IDLE_MS);
  }, [resetToAttract]);

  useEffect(() => {
    if (phase === "entry" || phase === "pick") bumpIdle();
    else if (idleRef.current) clearTimeout(idleRef.current);
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [phase, bumpIdle]);

  // Success auto-advances back to attract.
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => resetToAttract(), 6500);
    return () => clearTimeout(t);
  }, [phase, resetToAttract]);

  const startVote = useCallback(() => {
    if (status === "closed") return;
    setRunIds(slotIds); // pin this slot's game(s) for the customer's session
    setPickIndex(0);
    setPicks([]);
    sound.play("coin");
    sound.vibrate(15);
    setPhase("entry");
  }, [status, sound, slotIds]);

  // Commit the current game's pick, then either advance to the next game in the
  // slot (stacked voting) or finish. Each game is an independent vote POST so a
  // hiccup on game 2 never loses game 1.
  const submitVote = useCallback(
    async (side: Side): Promise<boolean> => {
      const match = activeMatches[pickIndex];
      if (!match) return false;
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: match.id, side, firstName, phone, consent }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "vote failed");
        }
        setPicks((p) => [...p, { match, side }]);
        if (pickIndex + 1 < gameCount) {
          // More games kicking off at the same time → vote the next one.
          sound.play("coin");
          sound.vibrate(12);
          setPickIndex((i) => i + 1);
          return true; // PickScreen remounts (keyed by match id) for the next game
        }
        sound.play("win");
        burstConfetti();
        setPhase("success");
        return true;
      } catch {
        sound.play("error");
        showToast("Couldn't save — check the connection and try again.");
        return false;
      }
    },
    [activeMatches, pickIndex, gameCount, firstName, phone, consent, sound, showToast]
  );

  if (!mounted) return <Splash />;

  return (
    <main className="screen arcade-bg safe">
      <div className="rotate-hint">
        <span className="emoji" style={{ fontSize: "3rem" }}>🔄</span>
        <p className="display" style={{ fontSize: "1.6rem" }}>Rotate to landscape</p>
        <p className="text-dim">This kiosk is built for landscape.</p>
      </div>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
          left: "calc(env(safe-area-inset-left, 0px) + 10px)",
          zIndex: 90, // above the portrait rotate-hint (z-80) so staff can open barista controls without rotating
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Barista controls"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(250,249,246,0.06)",
            border: "1px solid var(--line)",
            fontSize: 20,
            opacity: 0.45,
          }}
        >
          ⚙️
        </button>
        <FullscreenButton />
      </div>

      {phase === "attract" && (
        <AttractScreen matches={slotMatches} status={status} onStart={startVote} />
      )}
      {phase === "entry" && (
        <EntryScreen
          firstName={firstName}
          phone={phone}
          setFirstName={setFirstName}
          setPhone={setPhone}
          onContinue={() => setPhase("pick")}
          onCancel={resetToAttract}
          onActivity={bumpIdle}
        />
      )}
      {phase === "pick" && votingMatch && (
        <PickScreen
          key={votingMatch.id}
          match={votingMatch}
          gameIndex={pickIndex}
          gameCount={gameCount}
          canCancel={pickIndex === 0}
          onCommit={submitVote}
          onCancel={() => setPhase("entry")}
          onActivity={bumpIdle}
        />
      )}
      {phase === "success" && picks.length > 0 && (
        <SuccessScreen picks={picks} firstName={firstName} onDone={resetToAttract} />
      )}

      {panelOpen && (
        <BaristaPanel
          matchId={slotIds[0]}
          status={status}
          pinned={session?.pinned ?? false}
          onChanged={refresh}
          onClose={() => setPanelOpen(false)}
          sound={sound}
          context="locked"
        />
      )}

      {toast && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "var(--yb-red)",
            color: "#fff",
            padding: "0.8rem 1.4rem",
            borderRadius: 999,
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
