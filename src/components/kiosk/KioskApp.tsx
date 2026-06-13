"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMatch, pickDefaultMatchId } from "@/lib/games";
import { usePoll } from "@/lib/use-poll";
import { useSound } from "@/lib/use-sound";
import { burstConfetti } from "@/lib/celebrate";
import type { SessionState, Side } from "@/types";
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
  const [committedSide, setCommittedSide] = useState<Side | null>(null);
  // The game the current customer is voting on, pinned when they start so a
  // barista game-switch mid-flow can't reattribute their vote.
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: session, refresh } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    4000
  );

  const matchId = session?.matchId ?? pickDefaultMatchId(new Date());
  const match = getMatch(matchId) ?? getMatch(pickDefaultMatchId(new Date()))!;
  const status = session?.status ?? "open";
  // Attract shows the live game; once a customer starts, the flow is pinned.
  const votingMatch = getMatch(activeMatchId ?? matchId) ?? match;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const resetToAttract = useCallback(() => {
    setFirstName("");
    setPhone("");
    setCommittedSide(null);
    setActiveMatchId(null);
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
    setActiveMatchId(matchId); // pin the game for this customer's session
    sound.play("coin");
    sound.vibrate(15);
    setPhase("entry");
  }, [status, sound, matchId]);

  const submitVote = useCallback(
    async (side: Side): Promise<boolean> => {
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: votingMatch.id, side, firstName, phone, consent }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "vote failed");
        }
        setCommittedSide(side);
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
    [votingMatch, firstName, phone, consent, sound, showToast]
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
          zIndex: 30,
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
        <AttractScreen match={match} status={status} onStart={startVote} />
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
      {phase === "pick" && (
        <PickScreen
          match={votingMatch}
          onCommit={submitVote}
          onCancel={() => setPhase("entry")}
          onActivity={bumpIdle}
        />
      )}
      {phase === "success" && committedSide && (
        <SuccessScreen
          match={votingMatch}
          side={committedSide}
          firstName={firstName}
          onDone={resetToAttract}
        />
      )}

      {panelOpen && (
        <BaristaPanel
          matchId={matchId}
          status={status}
          onChanged={refresh}
          onClose={() => setPanelOpen(false)}
          sound={sound}
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
