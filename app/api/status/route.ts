import { NextRequest, NextResponse } from "next/server";
import { getCurrentStatus, getMeta, parseScope } from "@/lib/queries";

export const dynamic = "force-dynamic";

const WARN_STALE_MS = 5 * 60_000;

export function GET(req: NextRequest) {
  const scope     = parseScope(req.nextUrl.searchParams.get("scope"));
  const status    = getCurrentStatus(scope);
  const lastSyncAt = getMeta("last_sync_at");  // written by telegram-service on every catch-up
  const uptimeSecs = Math.floor(process.uptime());
  return NextResponse.json({ status, lastSyncAt, warnStaleMs: WARN_STALE_MS, uptimeSecs }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=5" },
  });
}
