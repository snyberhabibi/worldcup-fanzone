"use client";

export function Splash() {
  return (
    <main className="screen arcade-bg safe" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
        <span className="emoji anim-float" style={{ fontSize: "3rem" }}>⚽️</span>
        <p className="eyebrow">Connecting…</p>
      </div>
    </main>
  );
}
