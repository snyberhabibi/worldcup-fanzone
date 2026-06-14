"use client";

import Link from "next/link";

/**
 * Role-aware staff navigation. Rendered ONLY inside the PIN-unlocked Barista
 * panel, so it can never reach a customer. The context decides what's safe:
 *
 *  - "console": the barista's OWN phone — a normal browser tab. Cross-mode links
 *    are safe and open in NEW tabs (so the console stays put), and Home navigates
 *    this tab back to the launcher. This is the "move freely between modes" hub.
 *
 *  - "locked": a customer-facing surface — the Guided-Access kiosk iPad or the
 *    public vote page. NO new tabs (a _blank from a locked PWA breaks the shell /
 *    strands staff) and NO Home (the launcher's cards are ungated, so landing
 *    there from inside Guided Access would hand a customer the whole app). The
 *    only control is an in-place close that returns to the screen behind the panel.
 */
export function StaffNav({
  context,
  onClose,
}: {
  context: "console" | "locked";
  onClose: () => void;
}) {
  if (context === "locked") {
    return (
      <button type="button" onClick={onClose} style={{ ...pill, fontWeight: 800 }}>
        ← Close controls
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
      <a href="/board" target="_blank" rel="noopener noreferrer" style={pill}>📺 Board ↗</a>
      <a href="/kiosk" target="_blank" rel="noopener noreferrer" style={pill}>🕹️ Kiosk ↗</a>
      <a href="/vote" target="_blank" rel="noopener noreferrer" style={pill}>📲 Fan vote ↗</a>
      <Link href="/" style={{ ...pill, background: "var(--yb-red)", color: "#fff", borderColor: "var(--yb-red)" }}>
        🏠 Home
      </Link>
    </div>
  );
}

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  padding: "0.45rem 0.8rem",
  borderRadius: 999,
  border: "1.5px solid rgba(74,55,40,0.25)",
  background: "rgba(74,55,40,0.05)",
  color: "var(--yb-cocoa)",
  fontWeight: 700,
  fontSize: "0.85rem",
  textDecoration: "none",
  cursor: "pointer",
};
