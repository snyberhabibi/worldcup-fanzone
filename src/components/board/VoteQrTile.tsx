"use client";

import { QRCodeSVG } from "qrcode.react";

// Board "scan to vote" tile. Sized in vh so the QR + text always fit the footer
// (which is itself a fraction of the viewport height) on any display — phone,
// laptop, 720p or 1080p projector — without clipping or bleeding.
export function VoteQrTile({ compact = false }: { compact?: boolean }) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://fifa.yallabites.com";
  const url = `${base}/vote`;
  const qr = compact ? "clamp(80px, 13vh, 150px)" : "150px";
  return (
    <div
      className="qr-tile"
      style={{
        border: "2px solid var(--yb-gold)",
        width: "100%",
        overflow: "hidden",
        gap: "clamp(0.6rem, 1.4vw, 1.2rem)",
        padding: "clamp(0.6rem, 1.5vh, 1.1rem)",
      }}
    >
      <div className="qr-tile__qr" style={{ padding: 8, width: qr, height: qr, display: "flex", flexShrink: 0 }}>
        <QRCodeSVG
          value={url}
          size={160}
          bgColor="#ffffff"
          fgColor="#0f1b3a"
          level="M"
          role="img"
          aria-label="Scan this QR code to vote from your phone"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.1rem, 0.5vh, 0.3rem)", flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.05rem, 2.9vh, 2rem)", lineHeight: 1.02 }}>
          📲 Scan to vote
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 800, fontSize: "clamp(0.8rem, 1.85vh, 1.2rem)", lineHeight: 1.15 }}>
          Vote from your phone — win FREE Yalla Bites 🎟️
        </p>
      </div>
    </div>
  );
}
