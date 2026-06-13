"use client";

import { useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { useHydrated } from "@/lib/use-hydrated";
import {
  getMatch,
  pickDefaultMatchId,
  resolveTeam,
  stageLabel,
  formatKickoffCT,
  type ResolvedTeam,
} from "@/lib/games";
import { isValidUSPhone, formatPhone, normalizePhone } from "@/lib/format";
import { burstConfetti } from "@/lib/celebrate";
import { Splash } from "@/components/Splash";
import type { SessionState, Side } from "@/types";

function TeamPick({
  t,
  selected,
  accent,
  onSelect,
}: {
  t: ResolvedTeam;
  selected: boolean;
  accent: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card-cream"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.3rem",
        padding: "1rem 0.5rem",
        border: selected ? `3px solid ${accent}` : "3px solid transparent",
        boxShadow: selected ? `0 0 0 4px ${accent}, 0 14px 36px rgba(0,0,0,0.4)` : "0 14px 36px rgba(0,0,0,0.4)",
        transition: "border-color 0.15s, box-shadow 0.2s",
      }}
    >
      <span className="team__flag" style={{ fontSize: "clamp(2.4rem, 14vw, 3.4rem)" }}>{t.flag}</span>
      <span className="display" style={{ color: "var(--navy)", fontSize: "clamp(0.95rem, 4.5vw, 1.3rem)", textAlign: "center", lineHeight: 1.05 }}>
        {t.name}
      </span>
      <span className="display" style={{ color: "var(--yb-sage)", letterSpacing: "0.14em", fontSize: "0.8rem" }}>{t.code}</span>
    </button>
  );
}

export function MobileVote() {
  const hydrated = useHydrated();
  const { data: session } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    5000
  );

  const matchId = session?.matchId ?? pickDefaultMatchId(new Date());
  const match = getMatch(matchId) ?? getMatch(pickDefaultMatchId(new Date()))!;
  const status = session?.status ?? "open";

  const [side, setSide] = useState<Side | null>(null);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "done" | "error">("form");
  const [errMsg, setErrMsg] = useState("");

  if (!hydrated) return <Splash />;

  const home = resolveTeam(match.homeTeam);
  const away = resolveTeam(match.awayTeam);
  const ck = formatKickoffCT(match);
  const valid = side !== null && firstName.trim().length > 0 && isValidUSPhone(phone);
  const pickedTeam = side === "home" ? home : side === "away" ? away : null;

  const submit = async () => {
    if (!valid || stage === "submitting") return;
    setStage("submitting");
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, side, firstName, phone, consent: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(
          data.error === "voting_closed"
            ? "Voting is paused right now — check the big screen for the next game."
            : data.error === "too_many_requests"
              ? "Too many tries — give it a moment."
              : "Couldn't save your vote. Please try again."
        );
        setStage("error");
        return;
      }
      burstConfetti();
      setStage("done");
    } catch {
      setErrMsg("Network hiccup — please try again.");
      setStage("error");
    }
  };

  return (
    <main className="screen arcade-bg safe" style={{ padding: "1.25rem", gap: "1rem", justifyContent: "flex-start" }}>
      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
        <p className="eyebrow">DAR Coffee × Yalla Bites × Haus of Design</p>
        <h1 className="display" style={{ fontSize: "clamp(1.6rem, 8vw, 2.4rem)", marginTop: "0.3rem" }}>
          📲 Vote from your phone
        </h1>
        <p className="text-dim" style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
          {stageLabel(match)} · {ck.full}
        </p>
      </div>

      {status === "closed" ? (
        <div className="panel anim-rise" style={{ padding: "1.5rem", textAlign: "center", marginTop: "1rem" }}>
          <p className="display" style={{ fontSize: "1.4rem" }}>Voting is paused</p>
          <p className="text-dim" style={{ marginTop: "0.5rem" }}>Watch the big screen — the next game opens soon.</p>
        </div>
      ) : stage === "done" ? (
        <div className="card-cream anim-pop" style={{ padding: "1.75rem 1.5rem", textAlign: "center", marginTop: "0.5rem" }}>
          <span className="emoji" style={{ fontSize: "3rem" }}>🎉</span>
          <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.6rem, 8vw, 2.2rem)", marginTop: "0.3rem" }}>
            You&apos;re in{firstName.trim() ? `, ${firstName.trim()}` : ""}!
          </p>
          {pickedTeam && (
            <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "1.1rem", marginTop: "0.4rem" }}>
              You backed {pickedTeam.flag} {pickedTeam.name}
            </p>
          )}
          <p style={{ color: "var(--yb-sage)", marginTop: "0.75rem", fontSize: "0.95rem" }}>
            You&apos;re entered to win free Yalla Bites — winners are drawn on the big screen. Good luck! 🍽️
          </p>
          <a href="https://yallabites.com/" target="_blank" rel="noopener noreferrer" className="btn btn--red" style={{ marginTop: "1.1rem", display: "inline-flex" }}>
            Get Yalla Bites →
          </a>
        </div>
      ) : (
        <>
          <p className="display text-cream" style={{ textAlign: "center", fontSize: "clamp(1.2rem, 6vw, 1.6rem)" }}>
            WHO YA GOT?
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <TeamPick t={home} selected={side === "home"} accent="var(--home)" onSelect={() => setSide("home")} />
            <TeamPick t={away} selected={side === "away"} accent="var(--away)" onSelect={() => setSide("away")} />
          </div>

          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value.slice(0, 24))}
            placeholder="Your first name"
            autoComplete="given-name"
            className="field"
            style={{ color: "var(--cream-soft)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", background: "rgba(0,0,0,0.25)" }}
          />
          <input
            value={formatPhone(phone)}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            placeholder="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field"
            style={{ color: "var(--cream-soft)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", background: "rgba(0,0,0,0.25)" }}
          />

          <p className="text-dim" style={{ fontSize: "0.75rem", lineHeight: 1.4, textAlign: "center" }}>
            By voting, you agree to receive texts from Yalla Bites about your pick &amp; offers.
            Msg &amp; data rates may apply. Reply <b style={{ color: "var(--cream-soft)" }}>STOP</b> to opt out.
          </p>

          {stage === "error" && (
            <p style={{ color: "var(--yb-red)", fontWeight: 700, textAlign: "center", fontSize: "0.9rem" }}>{errMsg}</p>
          )}

          <button className="btn btn--gold btn--block btn--lg" onClick={submit} disabled={!valid || stage === "submitting"}>
            {stage === "submitting" ? "Submitting…" : "🗳️ Submit my vote"}
          </button>
        </>
      )}
    </main>
  );
}
