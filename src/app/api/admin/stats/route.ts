import { NextRequest, NextResponse } from "next/server";
import { voterStats } from "@/lib/db";
import { checkPin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Read-only voter stats for the owner: how many unique people (phone numbers)
// have voted, total votes, games covered. Excludes synthetic load-test data
// (reserved 555 numbers + match 104). PIN-guarded (x-kiosk-pin) — aggregate
// counts only, no PII.
export async function GET(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const stats = await voterStats();
    return NextResponse.json({ ok: true, ...stats, at: new Date().toISOString() });
  } catch (e) {
    console.error("[stats]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
