"use client";

import { QRCodeSVG } from "qrcode.react";

export function VoteQrTile() {
  const base = typeof window !== "undefined" ? window.location.origin : "https://fifa.yallabites.com";
  const url = `${base}/vote`;
  return (
    <div className="qr-tile" style={{ border: "2px solid var(--yb-gold)" }}>
      <div className="qr-tile__qr">
        <QRCodeSVG
          value={url}
          size={140}
          bgColor="#ffffff"
          fgColor="#0f1b3a"
          level="M"
          role="img"
          aria-label="Scan this QR code to vote from your phone"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.3rem, 2.1vw, 1.8rem)", lineHeight: 1 }}>
          📲 Scan to vote
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 800, fontSize: "clamp(0.95rem, 1.5vw, 1.15rem)" }}>
          Can&apos;t reach the iPad? Vote from your phone.
        </p>
        <p style={{ color: "var(--yb-sage)", fontSize: "clamp(0.78rem, 1.1vw, 0.92rem)" }}>
          Pick your team &amp; enter to win free Yalla Bites
        </p>
      </div>
    </div>
  );
}
