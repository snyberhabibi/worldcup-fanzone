"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveTeam, stageLabel } from "@/lib/games";
import { bigCelebrate } from "@/lib/celebrate";
import { playSound } from "@/lib/use-sound";
import type { Match } from "@/data/schedule";
import type { Entrant, DrawResult } from "@/types";

const ITEM_H = 88;
const VISIBLE = 5;
const REPEAT = 8;

export function SpinWheel({
  match,
  pool,
  draw,
  onClose,
}: {
  match: Match;
  pool: Entrant[];
  draw: DrawResult;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [landed, setLanded] = useState(false);

  const len = pool.length;
  const reel = useMemo(() => {
    const arr: Entrant[] = [];
    for (let i = 0; i < REPEAT; i++) arr.push(...pool);
    return arr;
  }, [pool]);

  const centerSlot = Math.floor(VISIBLE / 2);
  const targetIndex = len ? (REPEAT - 1) * len + Math.min(draw.winnerIndex, len - 1) : 0;
  const finalOffset = (targetIndex - centerSlot) * ITEM_H;
  // Only animate the reel when the fetched pool agrees with the authoritative
  // draw at winnerIndex; otherwise skip straight to the (always-correct from
  // the server `draw`) winner card so we never land on the wrong name.
  const canSpin = len > 0 && pool[draw.winnerIndex]?.firstName === draw.firstName;

  useEffect(() => {
    if (!canSpin) {
      if (len > 0)
        console.warn("SpinWheel: entrant pool out of sync with draw; skipping reel");
      const land = setTimeout(() => {
        setLanded(true);
        bigCelebrate();
        playSound("win");
      }, 0);
      const auto = setTimeout(onClose, 12000);
      return () => {
        clearTimeout(land);
        clearTimeout(auto);
      };
    }
    playSound("whoosh");
    const raf = requestAnimationFrame(() => setOffset(finalOffset));
    const land = setTimeout(() => {
      setLanded(true);
      bigCelebrate();
      playSound("win");
    }, 3800);
    const auto = setTimeout(onClose, 15000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(land);
      clearTimeout(auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay" onClick={onClose} style={{ flexDirection: "column", gap: "clamp(1rem, 3vh, 1.75rem)" }}>
      <div style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow text-gold">🎡 Raffle winner</p>
        <p className="display" style={{ fontSize: "clamp(1.4rem, 4vw, 2.4rem)" }}>
          {resolveTeam(match.homeTeam).name} vs {resolveTeam(match.awayTeam).name}
        </p>
        <p className="text-dim">{stageLabel(match)} · {draw.poolSize} {draw.poolSize === 1 ? "entry" : "entries"}</p>
      </div>

      {!landed && canSpin ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "min(560px, 92vw)",
            height: VISIBLE * ITEM_H,
            overflow: "hidden",
            borderRadius: 24,
            border: "2px solid var(--line)",
            background: "rgba(0,0,0,0.45)",
            maskImage: "linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent)",
            WebkitMaskImage: "linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent)",
          }}
        >
          <div style={{ transform: `translateY(${-offset}px)`, transition: "transform 3.6s cubic-bezier(0.1, 0.75, 0.15, 1)" }}>
            {reel.map((e, i) => (
              <div key={i} style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
                <span className="display" style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)" }}>{e.firstName}</span>
                <span className="text-dim" style={{ fontSize: "1rem" }}>{e.phoneMasked}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              top: centerSlot * ITEM_H,
              left: 8,
              right: 8,
              height: ITEM_H,
              border: "2px solid var(--yb-gold)",
              borderRadius: 12,
              pointerEvents: "none",
              boxShadow: "0 0 24px var(--yb-gold-glow)",
            }}
          />
        </div>
      ) : (
        <div
          className="card-cream anim-pop"
          onClick={(e) => e.stopPropagation()}
          style={{ padding: "clamp(1.5rem, 4vw, 3rem)", textAlign: "center", minWidth: "min(520px, 92vw)" }}
        >
          <p className="eyebrow" style={{ color: "var(--yb-sage)" }}>🏆 Winner</p>
          <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(2.4rem, 8vw, 5rem)", lineHeight: 1.05 }}>
            {draw.firstName}
          </p>
          <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "clamp(1.1rem, 2.4vw, 1.6rem)", marginTop: "0.5rem" }}>
            {draw.phoneMasked}
          </p>
          <p style={{ color: "var(--yb-sage)", marginTop: "0.75rem" }}>
            Free Yalla Bites — see a barista to claim 🍽️
          </p>
        </div>
      )}

      <p className="text-dim" style={{ fontSize: "0.8rem" }}>Tap anywhere to dismiss</p>
    </div>
  );
}
