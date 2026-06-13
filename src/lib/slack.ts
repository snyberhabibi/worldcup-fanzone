// Slack CRM notification (server-side). Token + channel are copied from the
// yalla-bites-apply workspace into env. Fire-and-forget; never blocks a vote.

export async function notifyCrm(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_CRM_CHANNEL_ID?.trim();
  if (!token || !channel) {
    console.warn("[slack] missing SLACK_BOT_TOKEN or SLACK_CRM_CHANNEL_ID");
    return { ok: false, error: "no-config" };
  }
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
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
  }
}

export function signupMessage(firstName: string, phone: string, teamName: string, matchup: string): string {
  const pretty =
    phone.length === 10 ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
  return `🎉 *NEW FanZone Sign-up*\n• Name: ${firstName}\n• Number: ${pretty}\n• Vote: ${teamName} (${matchup})`;
}
