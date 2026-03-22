import { NextRequest, NextResponse } from "next/server";
import { getHourlyStats, type Scope } from "@/lib/queries";
import { withCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const rawDays = parseInt(req.nextUrl.searchParams.get("days") ?? "0", 10);
  const days = Number.isFinite(rawDays) && rawDays >= 0 ? Math.min(rawDays, 3650) : 0;
  const scope: Scope = req.nextUrl.searchParams.get("scope") === "national" ? "national" : "local";
  const hourly = withCache(`hourly-stats:${days}:${scope}`, 30_000, () => getHourlyStats(days, scope));
  const hours = hourly.map((r) => r.count);
  return NextResponse.json({ days, hours }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=30" },
  });
}
