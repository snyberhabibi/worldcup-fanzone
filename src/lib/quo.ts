// Quo (formerly OpenPhone) SMS — server-side only. The API key never reaches
// the browser. Sends are fire-and-forget from the caller's perspective and
// must NEVER block or fail a vote. Gated by SMS_ALLOW_REAL so it can run in a
// log-only "dry run" mode.

const QUO_URL = "https://api.quo.com/v1/messages";

function fromNumber(): string {
  return (process.env.QUO_FROM || "+14692770767").trim();
}

function realSendEnabled(): boolean {
  const v = (process.env.SMS_ALLOW_REAL || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type SmsResult = { ok: boolean; skipped?: boolean; error?: string };

/** Send an SMS to a 10-digit US number. Resolves (never throws) with a result. */
export async function sendSms(toDigits10: string, content: string): Promise<SmsResult> {
  const key = process.env.QUO_KEY?.trim();
  const to = `+1${toDigits10}`;
  if (!key) {
    console.warn("[sms] QUO_KEY not set — skipping", to);
    return { ok: false, error: "no-key" };
  }
  if (!realSendEnabled()) {
    console.log("[sms:dry-run] to", to, "::", content);
    return { ok: true, skipped: true };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(QUO_URL, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromNumber(), to: [to], content }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[sms] send failed", res.status, t.slice(0, 300));
      return { ok: false, error: `http-${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[sms] error", e);
    return { ok: false, error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

// ── Locked message copy (includes sender ID + STOP per the user's decision) ──
export function welcomeSms(): string {
  return `Welcome to the Fan Zone raffle, sponsored by Yalla Bites — the UberEats for homemade food! Stick around to see if you win! Download Yalla Bites on the App Store today: www.yallabites.com. Reply STOP to opt out.`;
}

export function winnerSms(): string {
  return `CONGRATS! You won the Fan Zone raffle! Use code YALLA20 at checkout on the Yalla Bites app for $20 off your first order + FREE DELIVERY. Download: yallabites.com. Reply STOP to opt out.`;
}
