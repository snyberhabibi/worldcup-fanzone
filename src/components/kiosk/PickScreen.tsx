"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CountdownRing } from "./CountdownRing";
import {
  resolveTeam,
  stageLabel,
  formatKickoffCT,
  type ResolvedTeam,
} from "@/lib/games";
import { useSound } from "@/lib/use-sound";
import type { Match } from "@/data/schedule";
import type { Side } from "@/types";

const LOCK_SECONDS = 5;

function TeamCard({
  t,
  side,
  pending,
  committing,
  onChoose,
}: {
  t: ResolvedTeam;
  side: Side;
  pending: Side | null;
  committing: boolean;
  onChoose: (s: Side) => void;
}) {
  const selected = pending === side;
  const dimmed = pending !== null && pending !== side;
  return (
    <button
      type="button"
      className={`team team--${side} is-tappable ${selected ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`}
      onClick={() => {
        if (!committing) onChoose(side);
      }}
      disabled={committing && !selected}
      style={{ width: "100%", height: "100%" }}
    >
      <span className="team__accent" />
      <span className="team__flag">{t.flag}</span>
      <span className="team__name">{t.name}</span>
      <span className="team__code">{t.code}</span>
      {pending === null && (
        <span
          className="pill"
          style={{
            marginTop: "0.7rem",
            background: "color-mix(in srgb, var(--accent) 16%, transparent)",
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            fontSize: "clamp(0.8rem, 1.4vw, 1rem)",
          }}
        >
          👆 TAP TO VOTE
        </span>
      )}
    </button>
  );
}

export function PickScreen({
  match,
  gameIndex = 0,
  gameCount = 1,
  canCancel = true,
  onCommit,
  onCancel,
  onActivity,
}: {
  match: Match;
  gameIndex?: number;
  gameCount?: number;
  canCancel?: boolean;
  onCommit: (side: Side) => Promise<boolean>;
  onCancel: () => void;
  onActivity: () => void;
}) {
  const sound = useSound();
  const [pending, setPending] = useState<Side | null>(null);
  const [secs, setSecs] = useState(LOCK_SECONDS);
  const [committing, setCommitting] = useState(false);
  const committingRef = useRef(false);

  const home = resolveTeam(match.homeTeam);
  const away = resolveTeam(match.awayTeam);
  const { full } = formatKickoffCT(match);

  const choose = (side: Side) => {
    onActivity();
    sound.play("select");
    sound.vibrate(12);
    setPending(side);
    setSecs(LOCK_SECONDS);
  };

  const cancelPick = () => {
    onActivity();
    sound.play("tap");
    setPending(null);
    setSecs(LOCK_SECONDS);
  };

  const doCommit = useCallback(
    async (side: Side) => {
      if (committingRef.current) return;
      committingRef.current = true;
      setCommitting(true);
      sound.play("lock");
      sound.vibrate([10, 40, 10]);
      const ok = await onCommit(side);
      if (!ok) {
        committingRef.current = false;
        setCommitting(false);
        setPending(null);
        setSecs(LOCK_SECONDS);
      }
      // On success the parent swaps to the success screen and unmounts this.
    },
    [onCommit, sound]
  );

  // Countdown tick: decrement each second, then commit on the final tick.
  // All state updates run inside the async timeout callback (not synchronously
  // in the effect body) so they don't trigger cascading-render warnings.
  useEffect(() => {
    if (!pending || committing) return;
    const id = setTimeout(() => {
      if (secs <= 1) doCommit(pending);
      else setSecs((s) => s - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [pending, secs, committing, doCommit]);

  // Audible tick on 4·3·2·1 (sound now has stable identity, so this is safe).
  useEffect(() => {
    if (pending && !committing && secs > 0 && secs < LOCK_SECONDS) sound.play("tick");
  }, [secs, pending, committing, sound]);

  const pendingTeam = pending === "home" ? home : pending === "away" ? away : null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "clamp(1rem, 3vw, 2rem)",
        gap: "clamp(0.75rem, 2vh, 1.5rem)",
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", paddingLeft: "clamp(2.4rem, 5vw, 3.2rem)" }}>
        <div>
          <p className="eyebrow">
            {gameCount > 1 ? `Game ${gameIndex + 1} of ${gameCount} · ` : ""}
            {stageLabel(match)} · {full}
          </p>
          <h1 className="display" style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)" }}>
            {pending
              ? "Lock in your pick"
              : gameCount > 1
                ? "WHO YA GOT? Vote each game"
                : "WHO YA GOT?"}
          </h1>
          {gameCount > 1 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }} aria-hidden>
              {Array.from({ length: gameCount }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === gameIndex ? 26 : 10,
                    height: 10,
                    borderRadius: 999,
                    background:
                      i < gameIndex
                        ? "var(--accent)"
                        : i === gameIndex
                          ? "var(--yb-gold)"
                          : "var(--line)",
                    transition: "width 0.2s, background 0.2s",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {!pending && canCancel && (
          <button className="btn btn--ghost" onClick={onCancel} aria-label="Back">✕</button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(0.75rem, 2vw, 1.5rem)",
          minHeight: 0,
        }}
      >
        <TeamCard t={home} side="home" pending={pending} committing={committing} onChoose={choose} />
        <TeamCard t={away} side="away" pending={pending} committing={committing} onChoose={choose} />
      </div>

      {pending && pendingTeam && (
        <div
          className="panel anim-rise"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(1rem, 3vw, 2.5rem)",
            padding: "clamp(0.75rem, 2vw, 1.25rem)",
            flexWrap: "wrap",
          }}
        >
          <CountdownRing seconds={secs} total={LOCK_SECONDS} size={116} />
          <div style={{ textAlign: "center" }}>
            <p className="display" style={{ fontSize: "clamp(1.1rem, 2.6vw, 1.6rem)" }}>
              Locking in <span className="text-gold">{pendingTeam.name}</span>
            </p>
            <p className="text-dim">Changed your mind? Tap the other team.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn--ghost" onClick={cancelPick} disabled={committing}>
              Change
            </button>
            <button className="btn btn--red" onClick={() => doCommit(pending)} disabled={committing}>
              {committing ? "Saving…" : "Lock it in ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
