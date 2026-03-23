import { NextRequest, NextResponse } from "next/server";
import { getDailyStats, getNightlyStats, getAvgSaferoomSecs, parseScope } from "@/lib/queries";
import { withCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  // days=0 means all time
  const rawDays = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(rawDays) && rawDays >= 0 ? Math.min(rawDays, 3650) : 30;
  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  const daily          = withCache(`stats:daily:${days}:${scope}`,        5_000, () => getDailyStats(days, scope));
  const nightly        = withCache(`stats:nightly:${days}:${scope}`,      5_000, () => getNightlyStats(days, scope));
  const avgSaferoomSecs = withCache(`stats:saferoom:${days}:${scope}`,   30_000, () => getAvgSaferoomSecs(days, scope));
  return NextResponse.json({ daily, nightly, avgSaferoomSecs }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=10" },
  });
}
