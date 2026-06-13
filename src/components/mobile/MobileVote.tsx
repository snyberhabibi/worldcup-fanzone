"use client";

import { useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { useHydrated } from "@/lib/use-hydrated";
import { useSound } from "@/lib/use-sound";
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
import { BaristaPanel } from "@/components/kiosk/BaristaPanel";
import type { SessionState, Side } from "@/types";
import type { Match } from "@/data/schedule";

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
        padding: "0.85rem 0.5rem",
        border: selected ? `3px solid ${accent}` : "3px solid transparent",
        boxShadow: selected ? `0 0 0 4px ${accent}, 0 14px 36px rgba(0,0,0,0.4)` : "0 14px 36px rgba(0,0,0,0.4)",
        transition: "border-color 0.15s, box-shadow 0.2s",
      }}
    >
      <span className="team__flag" style={{ fontSize: "clamp(2.2rem, 12vw, 3.2rem)" }}>{t.flag}</span>
      <span className="display" style={{ color: "var(--navy)", fontSize: "clamp(0.9rem, 4.2vw, 1.25rem)", textAlign: "center", lineHeight: 1.05 }}>
        {t.name}
      </span>
      <span className="display" style={{ color: "var(--yb-sage)", letterSpacing: "0.14em", fontSize: "0.8rem" }}>{t.code}</span>
    </button>
  );
}

export function MobileVote() {
  const hydrated = useHydrated();
  const sound = useSound();
  const { data: session, refresh } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    5000
  );

  const matchIds = session?.matchIds?.length ? session.matchIds : [pickDefaultMatchId(new Date())];
  const matches = matchIds.map((id) => getMatch(id)).filter(Boolean) as Match[];
  const primary = matches[0] ?? getMatch(pickDefaultMatchId(new Date()))!;
  const multi = matches.length > 1;
  const status = session?.status ?? "open";

  const [picks, setPicks] = useState<Record<number, Side>>({});
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "done" | "error">("form");
  const [errMsg, setErrMsg] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  if (!hydrated) return <Splash />;

  const ck = formatKickoffCT(primary);
  const pickedCount = Object.keys(picks).length;
  const valid = pickedCount > 0 && firstName.trim().length > 0 && isValidUSPhone(phone);
  // Picks in the slot's game order, for the confirmation screen.
  const pickedList = matches
    .filter((m) => picks[m.id])
    .map((m) => ({ match: m, team: resolveTeam(picks[m.id] === "home" ? m.homeTeam : m.awayTeam) }));

  const submit = async () => {
    if (!valid || stage === "submitting") return;
    setStage("submitting");
    try {
      // Submit each game's vote sequentially (not in parallel) so the first vote
      // alone triggers the welcome SMS + CRM ping — later games are the same phone.
      for (const m of matches) {
        const side = picks[m.id];
        if (!side) continue;
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: m.id, side, firstName, phone, consent: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
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
          {multi ? `${matches.length} games kicking off` : stageLabel(primary)} · {ck.full}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          textAlign: "center",
          background: "color-mix(in srgb, var(--yb-gold) 14%, transparent)",
          border: "1px solid color-mix(in srgb, var(--yb-gold) 45%, transparent)",
          color: "var(--cream-soft)",
          borderRadius: 16,
          padding: "0.6rem 0.9rem",
          fontWeight: 700,
          fontSize: "clamp(0.9rem, 3.8vw, 1.05rem)",
          lineHeight: 1.25,
        }}
      >
        🎟️ Every vote enters you to win <span className="text-gold">FREE Yalla Bites</span> — winners drawn on the big screen!
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.5rem" }}>
            {pickedList.map(({ match, team }) => (
              <p key={match.id} style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "1.05rem" }}>
                You backed {team.flag} {team.name}
              </p>
            ))}
          </div>
          <p style={{ color: "var(--yb-sage)", marginTop: "0.75rem", fontSize: "0.95rem" }}>
            You&apos;re entered to win free Yalla Bites — winners are drawn on the big screen. Stick around! 🍽️
          </p>
          <a href="https://yallabites.com/" target="_blank" rel="noopener noreferrer" className="btn btn--red" style={{ marginTop: "1.1rem", display: "inline-flex" }}>
            Get Yalla Bites →
          </a>
        </div>
      ) : (
        <>
          <p className="display text-cream" style={{ textAlign: "center", fontSize: "clamp(1.2rem, 6vw, 1.6rem)" }}>
            {multi ? "Pick a winner for each game" : "WHO YA GOT?"}
          </p>

          {matches.map((m) => {
            const home = resolveTeam(m.homeTeam);
            const away = resolveTeam(m.awayTeam);
            const sel = picks[m.id] ?? null;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {multi && (
                  <p className="eyebrow" style={{ textAlign: "center" }}>
                    {stageLabel(m)} · {home.code} v {away.code}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <TeamPick t={home} selected={sel === "home"} accent="var(--home)" onSelect={() => setPicks((p) => ({ ...p, [m.id]: "home" }))} />
                  <TeamPick t={away} selected={sel === "away"} accent="var(--away)" onSelect={() => setPicks((p) => ({ ...p, [m.id]: "away" }))} />
                </div>
              </div>
            );
          })}

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
            {stage === "submitting"
              ? "Submitting…"
              : multi
                ? `🗳️ Submit ${pickedCount === 1 ? "my pick" : `my ${pickedCount} picks`}`
                : "🗳️ Submit my vote"}
          </button>
        </>
      )}

      {/* Discreet barista access — PIN-gated. Lets staff pause/advance voting and
          spin the raffle wheel straight from their phone. */}
      <button
        onClick={() => setPanelOpen(true)}
        aria-label="Barista controls"
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          right: "calc(env(safe-area-inset-right, 0px) + 12px)",
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(250,249,246,0.06)",
          border: "1px solid var(--line)",
          fontSize: 20,
          opacity: 0.4,
        }}
      >
        ⚙️
      </button>

      {panelOpen && (
        <BaristaPanel
          matchId={matchIds[0]}
          status={status}
          pinned={session?.pinned ?? false}
          onChanged={refresh}
          onClose={() => setPanelOpen(false)}
          sound={sound}
        />
      )}
    </main>
  );
}
