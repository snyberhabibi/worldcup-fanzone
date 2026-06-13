"use client";

import { QRCodeSVG } from "qrcode.react";

// Board "get the app" tile. vh-sized like VoteQrTile so it fits any display.
export function QrTile({ compact = false }: { compact?: boolean }) {
  const qr = compact ? "clamp(80px, 13vh, 150px)" : "150px";
  return (
    <div
      className="qr-tile"
      style={{
        width: "100%",
        overflow: "hidden",
        gap: "clamp(0.6rem, 1.4vw, 1.2rem)",
        padding: "clamp(0.6rem, 1.5vh, 1.1rem)",
      }}
    >
      <div className="qr-tile__qr" style={{ padding: 8, width: qr, height: qr, display: "flex", flexShrink: 0 }}>
        <QRCodeSVG
          value="https://yallabites.com/"
          size={160}
          bgColor="#ffffff"
          fgColor="#4A3728"
          level="M"
          role="img"
          aria-label="Scan to download the Yalla Bites app"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.1rem, 0.5vh, 0.3rem)", flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.05rem, 2.9vh, 2rem)", lineHeight: 1.02 }}>
          Get Yalla Bites
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "clamp(0.8rem, 1.85vh, 1.2rem)", lineHeight: 1.15 }}>
          Homemade food, delivered.
        </p>
        <div style={{ display: "flex", gap: "0.35rem", marginTop: "clamp(0.1rem, 0.5vh, 0.3rem)", alignItems: "center", minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/appstore-badge.png" alt="Download on the App Store" style={{ height: "auto", width: "auto", maxWidth: "47%", maxHeight: "clamp(16px, 3vh, 28px)", flexShrink: 1 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/googleplay-badge.png" alt="Get it on Google Play" style={{ height: "auto", width: "auto", maxWidth: "47%", maxHeight: "clamp(16px, 3vh, 28px)", flexShrink: 1 }} />
        </div>
      </div>
    </div>
  );
}
