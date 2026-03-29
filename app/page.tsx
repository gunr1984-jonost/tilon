"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import Charts, { type ChartView } from "@/components/Charts";
import ThreatClock from "@/components/ThreatClock";
import type { AlertState, AlertRow } from "@/lib/db";
import type { DailyStat, NightlyStat } from "@/lib/queries";
import { SCOPE_OPTIONS, type Scope } from "@/lib/regions";

function isNight(unixSecs: number): boolean {
  const d = new Date(unixSecs * 1000);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= 21 * 60 || mins < 6 * 60 + 30;
}

const WAR_START = new Date("2026-02-28T00:00:00");

function getWarDays() {
  // +1 so the start date itself (Feb 28) is included as a full calendar bar
  return Math.floor((Date.now() - WAR_START.getTime()) / 86_400_000) + 1;
}

const PERIODS: { label: string; days: number }[] = [
  { label: "28/2", days: getWarDays() },
  { label: "1w",   days: 7            },
  { label: "2w",   days: 14           },
  { label: "All",  days: 0            },
];

type TimelineFilter = "all" | "sirens" | "night";

function Tabs<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function formatSaferoomTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function StatTile({
  label,
  value,
  color = "text-zinc-100",
  hint,
}: {
  label: string;
  value: string | number;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-zinc-900 border border-zinc-800/60">
      <span className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      {hint && <span className="text-xs text-zinc-700 normal-case tracking-normal">{hint}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [status, setStatus]         = useState<AlertState>("ALL_CLEAR");
  const [alerts, setAlerts]         = useState<AlertRow[]>([]);
  const [daily, setDaily]           = useState<DailyStat[]>([]);
  const [nightly, setNightly]       = useState<NightlyStat[]>([]);
  const [avgSaferoomSecs, setAvgSaferoomSecs] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt]   = useState<Date | null>(null);

  const [fetchError, setFetchError] = useState(false);

  const [scope, setScope]           = useState<Scope>("tel-aviv");
  const [period, setPeriod]         = useState(getWarDays);
  const [chartView, setChartView]   = useState<ChartView>("type");
  const [tlFilter, setTlFilter]     = useState<TimelineFilter>("all");

  const fetchAbortRef  = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (days: number, sc: Scope, { cancelPrevious = false } = {}) => {
    if (cancelPrevious) fetchAbortRef.current?.abort();
    const ac = new AbortController();
    if (cancelPrevious) fetchAbortRef.current = ac;
    const timeout = setTimeout(() => ac.abort(), 10_000);

    const get = (url: string) =>
      fetch(url, { signal: ac.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });

    try {
      const [s, a, st] = await Promise.all([
        get(`/api/status?scope=${sc}`),
        get(`/api/alerts?limit=100&days=${days}&scope=${sc}`),
        get(`/api/stats?days=${days}&scope=${sc}`),
      ]);
      setStatus(s.status);
      setLastSyncAt(s.lastSyncAt ? new Date(s.lastSyncAt) : null);
      setAlerts(a.alerts);
      setDaily(st.daily);
      setNightly(st.nightly ?? []);
      setAvgSaferoomSecs(st.avgSaferoomSecs ?? null);
      setFetchError(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setFetchError(true);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => { fetchData(period, scope, { cancelPrevious: true }); }, [fetchData, period, scope]);


  // Tick "synced X min ago" display every minute
  useEffect(() => {
    const tick = setInterval(() => setLastSyncAt(t => t ? new Date(t) : t), 60_000);
    return () => clearInterval(tick);
  }, []);

  // 10s background poll
  useEffect(() => {
    const poll = setInterval(() => fetchData(period, scope), 10_000);
    return () => clearInterval(poll);
  }, [fetchData, period, scope]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(period, scope); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData, period, scope]);


  const totalSirens      = daily.reduce((s, d) => s + d.sirens, 0);
  const totalNightSirens = daily.reduce((s, d) => s + d.night_sirens, 0);
  const totalPreAlerts   = daily.reduce((s, d) => s + d.pre_alerts, 0);
  const nightsDisrupted  = daily.filter((d) => d.night_sirens > 0).length;

  const filteredAlerts = useMemo(() => {
    if (tlFilter === "sirens") return alerts.filter((a) => a.state === "ACTIVE_SIREN");
    if (tlFilter === "night")  return alerts.filter((a) => a.state === "ACTIVE_SIREN" && isNight(a.sent_at));
    // "all" = everything except OTHER (noise)
    return alerts.filter((a) => a.state !== "OTHER");
  }, [alerts, tlFilter]);

  const periodLabel = PERIODS.find((p) => p.days === period)?.label ?? `${period}d`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center">
          <pre className="text-zinc-300 text-[0.6rem] leading-tight font-mono inline-block text-left">{`  _______ __          \n /_  __(_) /___  ____ \n  / / / / / __ \\/ __ \\\n / / / / / /_/ / / / /\n/_/ /_/_/\\____/_/ /_/ `}</pre>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-mono">
            <span>⚠ Failed to load data — server may be down</span>
            <button onClick={() => fetchData(period, scope)} className="underline underline-offset-2 hover:text-red-300">retry</button>
          </div>
        )}

        {/* Status — city scopes only */}
        {scope !== "national" && (
          <section className="flex flex-col items-center">
            <StatusBadge status={status} />
          </section>
        )}

        {/* Period + Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Tabs<number>
              value={period}
              onChange={setPeriod}
              options={PERIODS.map((p) => ({ label: p.label, value: p.days }))}
            />
          </div>

          <div className={`grid grid-cols-2 ${scope !== "national" ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3`}>
            <StatTile label="Sirens"           value={totalSirens}      color="text-red-400" />
            <StatTile label="Night sirens"     value={totalNightSirens} color="text-indigo-400" />
            <StatTile label="Pre-alerts"       value={totalPreAlerts}   color="text-amber-400" />
            <StatTile label="Nights disrupted" value={nightsDisrupted}  color="text-zinc-300" hint="≥1 siren 21:00–06:30" />
            {scope !== "national" && (
              <StatTile
                label="Avg saferoom"
                value={avgSaferoomSecs !== null ? formatSaferoomTime(avgSaferoomSecs) : "—"}
                color="text-emerald-400"
                hint="siren → all clear"
              />
            )}
          </div>
          {scope === "national" && (
            <p className="text-[0.65rem] text-zinc-700 font-mono">
              Counts reflect Pikud HaOref Telegram messages — one message may cover multiple regions simultaneously.
            </p>
          )}
        </div>

        {/* Chart */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest">
              {period === 0 ? "Sirens per year" : period >= 180 ? "Sirens per month" : period >= 60 ? "Sirens per week" : "Sirens per day"} · {periodLabel}
            </h2>
            <Tabs<ChartView>
              value={chartView}
              onChange={setChartView}
              options={[
                { label: "By type",      value: "type"  },
                { label: "Night sirens", value: "night" },
              ]}
            />
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 pt-4 pb-2">
            <Charts daily={daily} nightly={nightly} days={period} view={chartView} />
          </div>
        </section>

        {/* Threat Clock */}
        <ThreatClock period={period} periodLabel={periodLabel} scope={scope} />

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
<h2 className="text-xs text-zinc-500 uppercase tracking-widest">
                Events
                <span className="ml-2 text-zinc-700 normal-case tracking-normal">
                  {filteredAlerts.length} shown
                </span>
              </h2>
              {lastSyncAt && (() => {
                const minsAgo = Math.floor((Date.now() - lastSyncAt.getTime()) / 60_000);
                return (
                  <span className="text-xs font-mono text-zinc-700">
                    synced {minsAgo === 0 ? "just now" : `${minsAgo}m ago`}
                  </span>
                );
              })()}
            </div>
            <Tabs<TimelineFilter>
              value={tlFilter}
              onChange={setTlFilter}
              options={[
                { label: "All",          value: "all"    },
                { label: "Sirens",       value: "sirens" },
                { label: "Night sirens", value: "night"  },
              ]}
            />
          </div>
          <div className="overflow-y-auto max-h-96 space-y-1 pr-1">
            <Timeline alerts={filteredAlerts} />
          </div>
        </section>

        <footer className="pt-8 pb-6 text-center text-xs text-zinc-600 border-t border-zinc-800/50 space-y-1">
          <p>
            <a href="https://github.com/gunr1984-jonost/tilon" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">Open source</a>
            {" · "}
            <a href="https://t.me/PikudHaOref_all" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">Data: @PikudHaOref_all</a>
            {" · "}Independent — not affiliated with Pikud HaOref
          </p>
          <p>For life-safety alerts use the <a href="https://www.oref.org.il" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 underline underline-offset-2">official Pikud HaOref channels</a></p>
        </footer>

      </div>
    </div>
  );
}
