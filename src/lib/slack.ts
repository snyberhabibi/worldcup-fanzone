// Slack CRM notification (server-side). Token + channel are copied from the
// yalla-bites-apply workspace into env. Fire-and-forget; never blocks a vote.

export async function notifyCrm(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_CRM_CHANNEL_ID?.trim();
  if (!token || !channel) {
    console.warn("[slack] missing SLACK_BOT_TOKEN or SLACK_CRM_CHANNEL_ID");
    return { ok: false, error: "no-config" };
  }
  // Mirror the SMS client's discipline: cap the request so a slow/black-holed
  // Slack API can't keep the (after()-extended) serverless invocation alive.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!data.ok) {
      console.error("[slack] postMessage failed", data.error);
      return { ok: false, error: data.error || `http-${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[slack] error", e);
    return { ok: false, error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

// Lightweight ops alerting for the unattended always-on screens: route API
// failures to the same Slack channel so a Sheets outage / token expiry mid-event
// becomes a 30-second fix instead of a silent "board shows 0-0" until a customer
// complains. Debounced per warm instance so a failing poll can't spam the channel.
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 60_000;
export async function alertOps(context: string): Promise<void> {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  lastAlertAt = now;
  await notifyCrm(`⚠️ FanZone API issue — ${context}. Check Vercel logs.`).catch(() => {});
}

export function signupMessage(firstName: string, phone: string, teamName: string, matchup: string): string {
  const pretty =
    phone.length === 10 ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
  return `🎉 *NEW FanZone Sign-up*\n• Name: ${firstName}\n• Number: ${pretty}\n• Vote: ${teamName} (${matchup})`;
}
