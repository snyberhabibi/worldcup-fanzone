// Opt-out (STOP) collection from Quo. Quo enforces opt-outs at the carrier level
// (a STOP'd number is auto-suppressed and won't receive sends), but it exposes
// no "list all opt-outs" endpoint — GET /v1/messages requires a phoneNumberId +
// a specific participant. So we scan each contact's conversation for an incoming
// carrier opt-out keyword. Used by the daily drip cron to keep our own sms_log
// opt_out record fresh before sending. SERVER-SIDE ONLY (needs QUO_KEY).

const QUO_BASE = "https://api.quo.com/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Exact-match carrier opt-out keywords (what actually triggers suppression).
const OPT_WORDS = new Set(["stop", "stopall", "stop all", "unsubscribe", "cancel", "end", "quit", "optout", "opt out"]);

// Quo rate-limits bursts (HTTP 429); retry 429/5xx with exponential backoff.
async function quoGet(path: string, key: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`${QUO_BASE}${path}`, { headers: { Authorization: key }, signal: ctrl.signal });
      if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt < 6) {
        await sleep(Math.min(8000, 400 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`http-${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

export type FoundOptOut = { phone: string; text: string; at: string };

/** Scan the given 10-digit phones' Quo conversations for incoming STOP-type
 *  replies. Resilient: per-phone errors are collected, not thrown. Time-bounded
 *  by the caller via deadlineMs (epoch ms) so a slow Quo can't blow the cron's
 *  maxDuration — phones not reached before the deadline are reported in `skipped`. */
export async function collectOptOuts(
  phones: string[],
  deadlineMs: number
): Promise<{ optOuts: FoundOptOut[]; errors: number; scanned: number; skipped: number }> {
  const key = process.env.QUO_KEY?.trim();
  const from = (process.env.QUO_FROM || "+14692770767").trim();
  if (!key) return { optOuts: [], errors: 0, scanned: 0, skipped: phones.length };

  const pnResp = (await quoGet("/phone-numbers", key)) as { data?: { id: string; number: string }[] };
  const mine = (pnResp.data || []).find((p) => p.number === from);
  if (!mine) throw new Error(`QUO_FROM ${from} not found among Quo numbers`);
  const pnId = mine.id;

  const optOuts: FoundOptOut[] = [];
  let errors = 0;
  let scanned = 0;
  let i = 0;
  const POOL = 3; // stay under Quo's burst limit; quoGet also backs off on 429
  const worker = async () => {
    while (i < phones.length) {
      if (Date.now() > deadlineMs) return;
      const phone = phones[i++];
      await sleep(120);
      scanned++;
      try {
        const qs = new URLSearchParams({ phoneNumberId: pnId, maxResults: "100" });
        qs.append("participants", `+1${phone}`);
        const resp = (await quoGet(`/messages?${qs.toString()}`, key)) as {
          data?: { text?: string; direction?: string; createdAt?: string }[];
        };
        for (const m of resp.data || []) {
          if (m.direction !== "incoming") continue;
          const norm = (m.text || "").trim().toLowerCase().replace(/[.!?]+$/, "");
          if (OPT_WORDS.has(norm)) optOuts.push({ phone, text: (m.text || "").trim(), at: m.createdAt || "" });
        }
      } catch {
        errors++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(POOL, phones.length) }, worker));
  return { optOuts, errors, scanned, skipped: phones.length - scanned };
}
