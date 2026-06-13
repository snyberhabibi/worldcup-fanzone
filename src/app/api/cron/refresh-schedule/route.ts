import { NextRequest, NextResponse, after } from "next/server";
import { computeScheduleSync } from "@/lib/schedule-sync";
import { commitFile } from "@/lib/github";
import { alertOps } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly schedule refresh. Vercel Cron (see vercel.json) hits this once a day
// and, when set, includes `Authorization: Bearer ${CRON_SECRET}`. It resolves
// knockout matchups from the live bracket and commits the result to
// knockout-overrides.json, which redeploys the app with real teams.
//   • Add ?dryRun=1 to preview the proposed changes without committing.
//   • Fails CLOSED: no CRON_SECRET ⇒ every request is denied.
//   • Never throws uncaught; on error it alerts Slack and returns 500.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  try {
    const result = await computeScheduleSync();
    const summary = {
      espnFixtures: result.espnFixtures,
      knockoutMatched: result.knockoutMatched,
      resolved: result.resolved,
    };

    if (!result.changed) {
      return NextResponse.json({ ok: true, changed: false, ...summary });
    }
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, changed: true, ...summary, overrides: result.overrides });
    }

    // Commit the resolved mapping → Vercel redeploys with real knockout teams.
    await commitFile(
      "src/data/knockout-overrides.json",
      JSON.stringify(result.overrides, null, 2) + "\n",
      `chore(schedule): resolve ${result.resolved.length} knockout matchup(s) [auto]`
    );
    after(() =>
      alertOps(
        `schedule cron resolved ${result.resolved.length} game(s) → redeploying: ` +
          result.resolved.map((r) => `#${r.id} ${r.home}-${r.away}`).join(", ")
      )
    );
    return NextResponse.json({ ok: true, changed: true, committed: true, ...summary });
  } catch (e) {
    console.error("refresh-schedule", e);
    after(() => alertOps(`schedule cron FAILED: ${e instanceof Error ? e.message : "unknown error"}`));
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
