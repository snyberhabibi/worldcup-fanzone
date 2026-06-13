"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrTile({ compact = false }: { compact?: boolean }) {
  const size = compact ? 154 : 132;
  return (
    <div className="qr-tile" style={compact ? { padding: "clamp(0.7rem, 1.4vw, 1rem)", gap: "clamp(0.7rem, 1.4vw, 1rem)" } : undefined}>
      <div className="qr-tile__qr" style={compact ? { padding: 8 } : undefined}>
        <QRCodeSVG value="https://yallabites.com/" size={size} bgColor="#ffffff" fgColor="#4A3728" level="M" role="img" aria-label="Scan to download the Yalla Bites app" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.1rem, 1.9vw, 1.6rem)", lineHeight: 1 }}>
          Get Yalla Bites
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "clamp(0.85rem, 1.3vw, 1.05rem)" }}>
          Homemade food, delivered.
        </p>
        <p style={{ color: "var(--yb-sage)", fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)" }}>
          The UberEats for home cooks — scan to order
        </p>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/appstore-badge.png" alt="Download on the App Store" style={{ height: compact ? 26 : 30 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/googleplay-badge.png" alt="Get it on Google Play" style={{ height: compact ? 26 : 30 }} />
        </div>
      </div>
    </div>
  );
}
