import { NextRequest, NextResponse } from "next/server";
import { checkPin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lets the kiosk unlock the barista panel without baking the PIN into client JS.
export async function POST(req: NextRequest) {
  if (!rateLimit(`verify:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  return checkPin(req)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false }, { status: 401 });
}
