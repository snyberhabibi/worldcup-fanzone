"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrTile({ compact = false }: { compact?: boolean }) {
  const size = compact ? 154 : 132;
  return (
    <div className="qr-tile" style={{ width: "100%", ...(compact ? { padding: "clamp(0.7rem, 1.4vw, 1rem)", gap: "clamp(0.7rem, 1.4vw, 1rem)" } : {}) }}>
      <div className="qr-tile__qr" style={compact ? { padding: 8 } : undefined}>
        <QRCodeSVG value="https://yallabites.com/" size={size} bgColor="#ffffff" fgColor="#4A3728" level="M" role="img" aria-label="Scan to download the Yalla Bites app" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.5rem, 2.6vw, 2.2rem)", lineHeight: 1 }}>
          Get Yalla Bites
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "clamp(1rem, 1.6vw, 1.3rem)", lineHeight: 1.2 }}>
          Homemade food, delivered.
        </p>
        <p style={{ color: "var(--yb-sage)", fontSize: "clamp(0.88rem, 1.3vw, 1.05rem)", lineHeight: 1.2 }}>
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
