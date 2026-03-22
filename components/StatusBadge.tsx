"use client";

import type { AlertState } from "@/lib/db";

export default function StatusBadge({ status }: { status: AlertState }) {
  if (status === "ACTIVE_SIREN") {
    return (
      <div className="w-full flex items-center justify-center gap-4 py-5 bg-red-500/10 rounded-xl border border-red-500/30">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <span className="text-2xl font-bold tracking-[0.2em] text-red-400 uppercase">
          Active Siren
        </span>
      </div>
    );
  }

  if (status === "PRE_ALERT") {
    return (
      <div className="w-full flex items-center justify-center gap-4 py-5 bg-amber-500/10 rounded-xl border border-amber-500/30">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
        </span>
        <span className="text-2xl font-bold tracking-[0.2em] text-amber-400 uppercase">
          Pre-Alert
        </span>
      </div>
    );
  }

  if (status === "ALL_CLEAR") {
    return (
      <div className="flex items-center gap-2.5 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-base font-medium tracking-widest text-emerald-400 uppercase">
          All Clear
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="h-2 w-2 rounded-full bg-zinc-600" />
      <span className="text-base font-medium tracking-widest text-zinc-500 uppercase">
        Monitoring
      </span>
    </div>
  );
}
