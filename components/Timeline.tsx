"use client";

import type { AlertRow, AlertState } from "@/lib/db";

const LEFT_BORDER: Record<AlertState, string> = {
  ACTIVE_SIREN: "border-red-500",
  PRE_ALERT:    "border-amber-400",
  ALL_CLEAR:    "border-emerald-600",
  OTHER:        "border-zinc-700",
};

const LABEL_COLOR: Record<AlertState, string> = {
  ACTIVE_SIREN: "text-red-400",
  PRE_ALERT:    "text-amber-400",
  ALL_CLEAR:    "text-emerald-500",
  OTHER:        "text-zinc-500",
};

const STATE_LABEL: Record<AlertState, string> = {
  ACTIVE_SIREN: "Siren",
  PRE_ALERT:    "Pre-Alert",
  ALL_CLEAR:    "All Clear",
  OTHER:        "Other",
};

function fmt(unixSecs: number) {
  return new Date(unixSecs * 1000).toLocaleString("en-IL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isNight(unixSecs: number): boolean {
  const d = new Date(unixSecs * 1000);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= 21 * 60 || mins < 6 * 60 + 30;
}

export default function Timeline({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) {
    return <p className="text-zinc-600 text-sm text-center py-10">No events in this period.</p>;
  }

  return (
    <ol className="space-y-1 pb-1">
      {alerts.map((a) => {
        const night = isNight(a.sent_at);
        const state = a.state as AlertState;
        return (
          <li
            key={a.id}
            className={`flex items-start gap-4 px-4 py-3 rounded-lg bg-zinc-900/50 border-l-2 ${LEFT_BORDER[state]}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold uppercase tracking-wider ${LABEL_COLOR[state]}`}>
                  {STATE_LABEL[state]}
                </span>
                {night && (
                  <span className="text-xs text-indigo-400/80 font-medium">· night</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed font-mono" title={a.raw_text}>
                {a.raw_text}
              </p>
            </div>
            <time className="text-xs text-zinc-600 font-mono shrink-0 pt-0.5 tabular-nums">
              {fmt(a.sent_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
