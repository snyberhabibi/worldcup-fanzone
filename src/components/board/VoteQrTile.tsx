"use client";

import { QRCodeSVG } from "qrcode.react";

export function VoteQrTile({ compact = false }: { compact?: boolean }) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://fifa.yallabites.com";
  const url = `${base}/vote`;
  const size = compact ? 162 : 140;
  return (
    <div
      className="qr-tile"
      style={{ border: "2px solid var(--yb-gold)", width: "100%", ...(compact ? { padding: "clamp(0.7rem, 1.4vw, 1rem)", gap: "clamp(0.7rem, 1.4vw, 1rem)" } : {}) }}
    >
      <div className="qr-tile__qr" style={compact ? { padding: 8 } : undefined}>
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor="#0f1b3a"
          level="M"
          role="img"
          aria-label="Scan this QR code to vote from your phone"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.6rem, 2.7vw, 2.3rem)", lineHeight: 1 }}>
          📲 Scan to vote
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 800, fontSize: "clamp(1.05rem, 1.7vw, 1.35rem)", lineHeight: 1.2 }}>
          Can&apos;t reach the iPad? Vote from your phone.
        </p>
        <p style={{ color: "var(--yb-sage)", fontSize: "clamp(0.9rem, 1.3vw, 1.1rem)", lineHeight: 1.2 }}>
          Pick your team &amp; enter to win free Yalla Bites
        </p>
      </div>
    </div>
  );
}
