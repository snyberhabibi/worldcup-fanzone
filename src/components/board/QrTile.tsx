"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrTile() {
  return (
    <div className="qr-tile">
      <div className="qr-tile__qr">
        <QRCodeSVG value="https://yallabites.com/" size={132} bgColor="#ffffff" fgColor="#4A3728" level="M" role="img" aria-label="Scan to download the Yalla Bites app" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <p className="display" style={{ color: "var(--yb-red)", fontSize: "clamp(1.2rem, 2vw, 1.7rem)", lineHeight: 1 }}>
          Get Yalla Bites
        </p>
        <p style={{ color: "var(--yb-cocoa)", fontWeight: 700, fontSize: "clamp(0.9rem, 1.4vw, 1.1rem)" }}>
          Homemade food, delivered to your door.
        </p>
        <p style={{ color: "var(--yb-sage)", fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)" }}>
          The UberEats for home cooks — scan to order
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/appstore-badge.png" alt="Download on the App Store" style={{ height: 30 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/googleplay-badge.png" alt="Get it on Google Play" style={{ height: 30 }} />
        </div>
      </div>
    </div>
  );
}
