import { NextRequest, NextResponse } from "next/server";
import emitter from "@/lib/emitter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.WORKER_SECRET ?? "";
  if (secret && req.headers.get("x-worker-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  emitter.emit("alert", body);
  return NextResponse.json({ ok: true });
}
