import { NextRequest, NextResponse, after } from "next/server";
import {
  dripAudience,
  phonesSentAnyType,
  optedOutPhones,
  step1SentEarliest,
  dripTimestampOk,
  recordOptOut,
  smsLogPhones,
  appendSmsLog,
} from "@/lib/db";
import { sendSms, fifa10PromoSms, vendorsFollowupSms } from "@/lib/quo";
import { collectOptOuts } from "@/lib/optout";
import { checkPin } from "@/lib/auth";
import { maskPhone } from "@/lib/format";
import { alertOps } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ── Automated 2-step SMS drip (daily Vercel Cron) ────────────────────────────
// GET  (Bearer ${CRON_SECRET}) = the daily run. Sends nothing unless DRIP_ENABLED
//      is on AND SMS_ALLOW_REAL is on (prod). Fails CLOSED without CRON_SECRET.
//      Each day it: (1) sweeps Quo for new STOP replies -> sms_log opt_out,
//      (2) Step 1: texts the FIFA10 offer to every unique signup who hasn't
//      gotten it (continues the original blast to new signups), (3) Step 2:
//      texts the follow-up to anyone who got Step 1 >= 7 days ago.
// POST (x-kiosk-pin) { mode:"inspect" } = read-only dry-run: returns who WOULD
//      get each step + verifies sms_log has a created_at column. Sends nothing.
// Idempotent: every send is logged with its step type and gated on status='sent',
// so re-runs / retries never double-text. Opt-outs are always excluded.

const STEP1_TYPES = ["blast:fifa10", "promo_fifa10"]; // FIFA10 offer (incl. legacy first-blast type)
const STEP1_LOG = "blast:fifa10";
const STEP2_TYPE = "drip:step2";
const STEP2_DELAY_DAYS = 7;
const MAX_PER_STEP = Number(process.env.DRIP_MAX_PER_STEP || 150); // per-day, per-step backstop; daily cron catches up the rest
const SWEEP_BUDGET_MS = 120_000; // cap the Quo opt-out sweep so it can't blow maxDuration

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}
function dripEnabled(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.DRIP_ENABLED || "").toLowerCase());
}
function sweepEnabled(): boolean {
  return !["0", "false", "no", "off"].includes((process.env.DRIP_SWEEP_OPTOUTS || "on").toLowerCase());
}

type Eligible = { audienceCount: number; optedOut: number; step1: string[]; step2: string[] };

async function computeEligible(nowMs: number): Promise<Eligible> {
  const [audience, step1Sent, opted, step1Dates, step2Sent] = await Promise.all([
    dripAudience(),
    phonesSentAnyType(STEP1_TYPES),
    optedOutPhones(),
    step1SentEarliest(STEP1_TYPES),
    phonesSentAnyType([STEP2_TYPE]),
  ]);
  // Step 1: every real signup not yet sent the offer and not opted out.
  const step1 = audience.filter((p) => !step1Sent.has(p) && !opted.has(p));
  // Step 2: got Step 1 at least N days ago, not yet sent Step 2, not opted out.
  const cutoff = nowMs - STEP2_DELAY_DAYS * 86_400_000;
  const step2: string[] = [];
  for (const [phone, sentAtMs] of step1Dates) {
    if (opted.has(phone) || step2Sent.has(phone)) continue;
    if (sentAtMs <= cutoff) step2.push(phone);
  }
  return { audienceCount: audience.length, optedOut: opted.size, step1, step2 };
}

async function sendBatch(phones: string[], message: string, logType: string) {
  const slice = phones.slice(0, MAX_PER_STEP);
  const tally = { sent: 0, failed: 0, dryRun: 0 };
  let i = 0;
  const POOL = 8;
  const worker = async () => {
    while (i < slice.length) {
      const phone = slice[i++];
      const res = await sendSms(phone, message);
      const status = res.ok ? (res.skipped ? "dry-run" : "sent") : "failed";
      if (status === "sent") tally.sent++;
      else if (status === "dry-run") tally.dryRun++;
      else tally.failed++;
      await appendSmsLog({ phone, type: logType, status, detail: res.error || "" }).catch(() => {});
    }
  };
  await Promise.all(Array.from({ length: Math.min(POOL, slice.length) }, worker));
  return { eligible: phones.length, attempted: slice.length, deferred: phones.length - slice.length, ...tally };
}

// Refresh our opt-out record from Quo before sending (best-effort, time-bounded).
async function refreshOptOuts() {
  const phones = await smsLogPhones();
  const found = await collectOptOuts(phones, Date.now() + SWEEP_BUDGET_MS);
  let recorded = 0;
  for (const o of found.optOuts) {
    const r = await recordOptOut(o.phone, o.text).catch(() => "error");
    if (r === "recorded") recorded++;
  }
  return { scanned: found.scanned, skipped: found.skipped, errors: found.errors, found: found.optOuts.length, recorded };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dripEnabled()) return NextResponse.json({ ok: true, mode: "run", skipped: "DRIP_ENABLED off" });
  try {
    if (!(await dripTimestampOk())) {
      after(() => alertOps("Drip aborted: sms_log has no created_at column (step-2 timing impossible)."));
      return NextResponse.json({ error: "sms_log.created_at missing" }, { status: 500 });
    }
    let sweep: unknown = "disabled";
    if (sweepEnabled()) {
      sweep = await refreshOptOuts().catch((e) => ({ error: e instanceof Error ? e.message : "unknown" }));
    }
    const elig = await computeEligible(Date.now());
    const step1 = await sendBatch(elig.step1, fifa10PromoSms(), STEP1_LOG);
    const step2 = await sendBatch(elig.step2, vendorsFollowupSms(), STEP2_TYPE);
    const summary = {
      ok: true,
      mode: "run",
      audienceCount: elig.audienceCount,
      optedOut: elig.optedOut,
      sweep,
      step1,
      step2,
      at: new Date().toISOString(),
    };
    if (step1.sent + step2.sent > 0) {
      after(() => alertOps(`Drip sent: step1 ${step1.sent}, step2 ${step2.sent} (deferred s1=${step1.deferred} s2=${step2.deferred})`));
    }
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[cron/drip]", e);
    after(() => alertOps(`Drip cron failed: ${e instanceof Error ? e.message : "unknown"}`));
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode !== "inspect") {
    return NextResponse.json({ error: 'POST is read-only; use { "mode":"inspect" }' }, { status: 400 });
  }
  try {
    const tsOk = await dripTimestampOk();
    const elig = await computeEligible(Date.now());
    return NextResponse.json({
      ok: true,
      mode: "inspect",
      smsLogCreatedAtPresent: tsOk,
      audienceCount: elig.audienceCount,
      optedOut: elig.optedOut,
      step1Eligible: elig.step1.length,
      step2Eligible: elig.step2.length,
      step1Sample: elig.step1.slice(0, 6).map(maskPhone),
      step2Sample: elig.step2.slice(0, 6).map(maskPhone),
      config: {
        step2DelayDays: STEP2_DELAY_DAYS,
        maxPerStep: MAX_PER_STEP,
        dripEnabled: dripEnabled(),
        sweepEnabled: sweepEnabled(),
        sendTimeCT: "5:00 PM (cron 0 22 * * * UTC)",
      },
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cron/drip:inspect]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
