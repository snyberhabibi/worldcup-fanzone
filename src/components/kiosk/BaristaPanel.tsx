"use client";

import { useMemo, useState } from "react";
import {
  allMatchesByKickoff,
  getMatch,
  resolveTeam,
  formatKickoffCT,
  stageLabel,
  pickDefaultMatchId,
} from "@/lib/games";
import type { SessionStatus } from "@/types";
import type { SoundApi } from "@/lib/use-sound";

const PIN_LEN = 4;

export function BaristaPanel({
  matchId,
  status,
  pinned,
  onChanged,
  onClose,
  sound,
}: {
  matchId: number;
  status: SessionStatus;
  pinned: boolean;
  onChanged: () => void;
  onClose: () => void;
  sound: SoundApi;
}) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [drawMsg, setDrawMsg] = useState<string | null>(null);

  const matches = useMemo(() => allMatchesByKickoff(), []);
  const defaultId = useMemo(() => pickDefaultMatchId(new Date()), []);
  const current = getMatch(matchId);

  const storedPin = () =>
    typeof window !== "undefined" ? sessionStorage.getItem("kiosk_pin") || "" : "";

  const verify = async (candidate: string) => {
    setVerifying(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-kiosk-pin": candidate },
      });
      if (res.ok) {
        sessionStorage.setItem("kiosk_pin", candidate);
        setUnlocked(true);
        sound.play("select");
      } else {
        setErr("Wrong PIN");
        setPin("");
        sound.play("error");
      }
    } catch {
      setErr("Network error");
      setPin("");
    } finally {
      setVerifying(false);
    }
  };

  const onDigit = (d: string) => {
    if (pin.length >= PIN_LEN || verifying) return;
    sound.play("tap");
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LEN) verify(next);
  };

  const control = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kiosk-pin": storedPin() },
        body: JSON.stringify(body),
      });
      if (res.ok) onChanged();
      else setErr("Action failed — re-enter PIN");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const selectMatch = (id: number) => {
    sound.play("select");
    setDrawMsg(null);
    control({ matchId: id });
  };
  // Hand control back to the clock: clear the pin so the live slot auto-advances.
  const resumeAuto = () => {
    sound.play("tap");
    setDrawMsg(null);
    control({ auto: true });
  };
  const setStatus = (s: SessionStatus) => {
    sound.play("tap");
    control({ status: s });
  };
  const nav = (dir: number) => {
    const i = matches.findIndex((m) => m.id === matchId);
    const j = Math.min(matches.length - 1, Math.max(0, i + dir));
    selectMatch(matches[j].id);
  };

  const draw = async () => {
    setBusy(true);
    setDrawMsg(null);
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kiosk-pin": storedPin() },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (data.ok) {
        // Surface winner-SMS delivery so staff can read the code aloud / re-send
        // if the text didn't go out (the draw response now carries smsStatus).
        const smsTail =
          data.smsStatus === "sent"
            ? " · ✅ code texted"
            : data.smsStatus === "failed"
              ? " · ⚠️ TEXT FAILED — give them code YALLA10"
              : data.smsStatus === "dry-run"
                ? " · (test mode — no real text)"
                : ""; // "skipped": already won before, already has their code
        setDrawMsg(`🎉 ${data.draw.firstName} · ${data.draw.phoneMasked}${smsTail}`);
        sound.play("win");
        onChanged();
      } else if (data.reason === "no_entrants") {
        setDrawMsg("No entries yet for this game.");
        sound.play("error");
      } else if (data.reason === "all_won") {
        setDrawMsg("Everyone in this game has already won 🎉");
        sound.play("error");
      } else {
        setDrawMsg("Draw failed.");
      }
    } catch {
      setDrawMsg("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const h = resolveTeam(m.homeTeam);
      const a = resolveTeam(m.awayTeam);
      return [m.homeTeam, m.awayTeam, h.name, a.name, stageLabel(m), `m${m.id}`]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, matches]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="card-cream"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1rem, 2.5vw, 1.75rem)",
          gap: "0.9rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="display" style={{ fontSize: "1.5rem", color: "var(--yb-cocoa)" }}>
            {unlocked ? "Barista controls" : "Barista access"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ fontSize: 22, color: "var(--yb-cocoa)", width: 40, height: 40 }}
          >
            ✕
          </button>
        </div>

        {!unlocked ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1rem 0 0.5rem" }}>
            <p style={{ color: "var(--yb-sage)" }}>Enter the staff PIN</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {Array.from({ length: PIN_LEN }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: i < pin.length ? "var(--yb-red)" : "transparent",
                    border: "2px solid var(--yb-cocoa)",
                    opacity: i < pin.length ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            {err && <p style={{ color: "var(--yb-red)", fontWeight: 700 }}>{err}</p>}
            <div style={{ filter: "invert(0)", maxWidth: 320, width: "100%" }}>
              <NumberPadDark onDigit={onDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} onClear={() => setPin("")} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", overflow: "hidden", minHeight: 0 }}>
            {/* Current game */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "0.9rem 1rem", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <p className="eyebrow" style={{ color: pinned ? "var(--yb-red)" : "var(--yb-sage)" }}>
                {pinned ? "⏸ Manual override · pinned" : "● Now voting · auto (live)"}
              </p>
              <p className="display" style={{ fontSize: "1.4rem", color: "var(--yb-cocoa)" }}>
                {current
                  ? `${resolveTeam(current.homeTeam).name} vs ${resolveTeam(current.awayTeam).name}`
                  : "—"}
              </p>
              <p style={{ color: "var(--yb-sage)", fontSize: "0.9rem" }}>
                {current ? `${stageLabel(current)} · ${formatKickoffCT(current).full}` : ""}
                {status === "closed" ? " · PAUSED" : ""}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem", flexWrap: "wrap" }}>
                <button className="btn btn--ghost" style={ctrlBtn} onClick={() => nav(-1)} disabled={busy}>◀ Prev game</button>
                <button className="btn btn--ghost" style={ctrlBtn} onClick={() => nav(1)} disabled={busy}>Next game ▶</button>
                <button
                  className="btn"
                  style={{ ...ctrlBtn, background: pinned ? "var(--yb-gold)" : "rgba(74,55,40,0.06)", color: "var(--yb-cocoa)", opacity: pinned ? 1 : 0.55 }}
                  onClick={resumeAuto}
                  disabled={busy || !pinned}
                  title="Resume automatic progression (jump to the live game)"
                >
                  🔴 Auto (live)
                </button>
                <button
                  className="btn"
                  style={{ ...ctrlBtn, background: status === "closed" ? "var(--yb-gold)" : "rgba(74,55,40,0.1)", color: "var(--yb-cocoa)" }}
                  onClick={() => setStatus(status === "closed" ? "open" : "closed")}
                  disabled={busy}
                >
                  {status === "closed" ? "▶ Resume voting" : "⏸ Pause voting"}
                </button>
              </div>
              {pinned && (
                <p style={{ color: "var(--yb-sage)", fontSize: "0.78rem", marginTop: "0.5rem" }}>
                  Auto-progression is paused. Press <b>Auto (live)</b> to jump back to the live game and resume automatic switching.
                </p>
              )}
            </div>

            {/* Raffle draw */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "0.9rem 1rem", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="btn btn--red" onClick={draw} disabled={busy} style={{ flex: "1 1 240px" }}>
                🎡 Spin the wheel on the projector
              </button>
              {drawMsg && <span style={{ color: "var(--yb-cocoa)", fontWeight: 700 }}>{drawMsg}</span>}
            </div>

            {/* Game picker */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team or match #…"
              style={{
                border: "1.5px solid rgba(74,55,40,0.2)",
                borderRadius: 12,
                padding: "0.7rem 1rem",
                color: "var(--yb-cocoa)",
                background: "#fff",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
              }}
            />
            <div className="no-scrollbar" style={{ overflowY: "auto", borderRadius: 12, border: "1px solid rgba(74,55,40,0.12)", minHeight: 120 }}>
              {(() => {
                let lastDay = "";
                return filtered.map((m) => {
                  const h = resolveTeam(m.homeTeam);
                  const a = resolveTeam(m.awayTeam);
                  const ck = formatKickoffCT(m);
                  const isCurrent = m.id === matchId;
                  const isNow = m.id === defaultId;
                  const dayHeader = ck.day !== lastDay ? ck.day : null;
                  lastDay = ck.day;
                  return (
                    <div key={m.id}>
                      {dayHeader && (
                        <div style={{ position: "sticky", top: 0, background: "#efe7da", color: "var(--yb-sage)", fontWeight: 700, fontSize: "0.75rem", padding: "0.3rem 0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {dayHeader}
                        </div>
                      )}
                      <button
                        onClick={() => selectMatch(m.id)}
                        disabled={busy}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.6rem 0.8rem",
                          textAlign: "left",
                          background: isCurrent ? "rgba(255,68,68,0.12)" : "transparent",
                          borderBottom: "1px solid rgba(74,55,40,0.08)",
                          color: "var(--yb-cocoa)",
                        }}
                      >
                        <span style={{ width: 64, fontSize: "0.78rem", color: "var(--yb-sage)", flexShrink: 0 }}>{ck.time.replace(" CT", "")}</span>
                        <span className="emoji">{h.flag}</span>
                        <span style={{ fontWeight: 700 }}>{m.homeTeam}</span>
                        <span style={{ color: "var(--yb-sage)" }}>v</span>
                        <span style={{ fontWeight: 700 }}>{m.awayTeam}</span>
                        <span className="emoji">{a.flag}</span>
                        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--yb-sage)" }}>
                          {isCurrent ? "✓ live" : isNow ? "● now" : stageLabel(m).replace("Group ", "Grp ")}
                        </span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => { sound.toggleMute(); }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--yb-cocoa)", fontWeight: 600 }}
              >
                <span className={`switch ${!sound.muted ? "is-on" : ""}`}><span className="switch__knob" /></span>
                {sound.muted ? "Sound off" : "Sound on"}
              </button>
              <a href="/board" target="_blank" rel="noopener noreferrer" style={{ color: "var(--yb-red)", fontWeight: 700 }}>
                Open projector board ↗
              </a>
            </div>
            {err && <p style={{ color: "var(--yb-red)", fontWeight: 700 }}>{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  padding: "0.5em 0.9em",
  fontSize: "0.9rem",
  background: "rgba(74,55,40,0.08)",
  color: "var(--yb-cocoa)",
};

// Dark-on-cream number pad variant for the PIN screen (the global .key style is
// tuned for the dark kiosk; override colors here so digits read on cream).
function NumberPadDark({
  onDigit,
  onBackspace,
  onClear,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
  const key: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: "1.6rem",
    height: 62,
    borderRadius: 14,
    background: "rgba(74,55,40,0.06)",
    border: "1px solid rgba(74,55,40,0.18)",
    color: "var(--yb-cocoa)",
  };
  return (
    <div className="keypad" style={{ maxWidth: "100%" }}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
        <button key={k} type="button" style={key} onClick={() => onDigit(k)}>{k}</button>
      ))}
      <button type="button" style={{ ...key, color: "var(--yb-red)" }} onClick={onClear}>Clear</button>
      <button type="button" style={key} onClick={() => onDigit("0")}>0</button>
      <button type="button" style={{ ...key, color: "var(--yb-red)" }} onClick={onBackspace} aria-label="Delete">⌫</button>
    </div>
  );
}
