import { NextRequest, NextResponse } from "next/server";
import { getLatestRelevant, parseScope } from "@/lib/queries";
import { withCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const rawDays = parseInt(req.nextUrl.searchParams.get("days") ?? "0", 10);
  const days = Number.isFinite(rawDays) && rawDays >= 0 ? Math.min(rawDays, 3650) : 0;
  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  const alerts = withCache(`alerts:${limit}:${days}:${scope}`, 5_000, () => getLatestRelevant(limit, days, scope));
  return NextResponse.json({ alerts }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=10" },
  });
}
