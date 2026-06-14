import Link from "next/link";
import { CopyVoteLink } from "@/components/CopyVoteLink";

export default function LauncherPage() {
  return (
    <main
      className="screen arcade-bg safe"
      style={{ alignItems: "center", justifyContent: "flex-start", overflowY: "auto" }}
    >
      <div
        className="anim-rise"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.4rem",
          padding: "clamp(1.5rem, 4vh, 2.5rem) 1.5rem",
          maxWidth: 960,
          width: "100%",
          margin: "auto",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p className="eyebrow">DAR Coffee × Yalla Bites × Haus of Design</p>
          <h1
            className="display"
            style={{ fontSize: "clamp(2.2rem, 7vw, 5rem)", marginTop: "0.4rem" }}
          >
            World Cup <span className="text-shimmer">Vote</span>
          </h1>
          <p className="text-dim" style={{ marginTop: "0.8rem", fontSize: "clamp(1rem, 2vw, 1.25rem)" }}>
            Staff start here — open each screen on its own device, in fullscreen.
          </p>
        </div>

        {/* PRIMARY staff entry — the one prominent (red) thing on the page so a
            barista at the register knows exactly where to begin. */}
        <Link href="/barista" className="panel" style={baristaBannerStyle}>
          <span style={{ fontSize: "2.4rem" }} className="emoji">⚙️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="display" style={{ fontSize: "clamp(1.3rem, 4vw, 1.6rem)", display: "block" }}>
              Barista Setup &amp; Controls
            </span>
            <span className="text-dim" style={{ fontSize: "0.95rem" }}>
              Pin tonight&apos;s game, pause/resume voting, and draw the raffle — right from your phone. Start here.
            </span>
          </div>
          <span className="btn btn--red" style={{ flexShrink: 0 }}>Open controls →</span>
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.1rem",
            width: "100%",
          }}
        >
          <Link href="/kiosk" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "2.8rem" }} className="emoji">🕹️</span>
            <span className="display" style={{ fontSize: "1.7rem" }}>Voting Kiosk</span>
            <span style={tagStyle}>FOR CUSTOMERS · iPAD</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              The tap-to-vote screen at the register. Lock it down with Guided Access.
            </span>
            <span className="btn btn--gold" style={{ marginTop: "0.4rem" }}>Set up kiosk on this iPad →</span>
          </Link>

          <Link href="/vote" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "2.8rem" }} className="emoji">📲</span>
            <span className="display" style={{ fontSize: "1.7rem" }}>Fan Voting</span>
            <span style={tagStyle}>FOR FANS&apos; PHONES</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              The phone voting page. Share the link / QR so fans vote from their seat.
            </span>
            <span className="btn btn--gold" style={{ marginTop: "0.4rem" }}>Open vote page →</span>
          </Link>

          <Link href="/board" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "2.8rem" }} className="emoji">📺</span>
            <span className="display" style={{ fontSize: "1.7rem" }}>Live Board</span>
            <span style={tagStyle}>FOR THE PROJECTOR</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              Live tally + spin-the-wheel + Yalla Bites QR. Read-only.
            </span>
            <span className="btn btn--gold" style={{ marginTop: "0.4rem" }}>Launch board →</span>
          </Link>
        </div>

        <CopyVoteLink />

        {/* Plain-English setup checklist a non-technical barista can follow. */}
        <div className="panel" style={{ width: "100%", padding: "1.1rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p className="display text-gold" style={{ fontSize: "1.1rem" }}>Setting up tonight?</p>
          <ol style={{ margin: 0, paddingLeft: "1.3rem", display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.95rem", lineHeight: 1.45 }}>
            <li>On your phone, open <b>Barista Setup &amp; Controls</b> and pin the game that&apos;s on.</li>
            <li>On the iPad, open <b>Voting Kiosk</b>, then <b>triple-click the side button</b> and enter the device passcode to lock it in Guided Access. (Triple-click + passcode again to unlock it later.)</li>
            <li>On the projector, open <b>Live Board</b> in fullscreen.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

const launchCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.6rem",
  padding: "1.6rem 1.25rem",
  textDecoration: "none",
  color: "inherit",
};

const baristaBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
  width: "100%",
  padding: "1.2rem 1.4rem",
  textDecoration: "none",
  color: "inherit",
  border: "2px solid color-mix(in srgb, var(--yb-red) 55%, transparent)",
  background: "color-mix(in srgb, var(--yb-red) 12%, transparent)",
};

const tagStyle: React.CSSProperties = {
  color: "var(--yb-gold)",
  fontWeight: 800,
  fontSize: "0.72rem",
  letterSpacing: "0.1em",
};
