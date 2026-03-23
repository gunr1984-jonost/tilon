"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import type { DailyStat, NightlyStat } from "@/lib/queries";

export type ChartView = "type" | "night";

type Bucket = { date: string; sirens: number; night_sirens: number; pre_alerts: number };

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Advance a YYYY-MM-DD string by N days
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Return YYYY-MM-DD for the Monday on or before a given date string
function toMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

// Return YYYY-MM for a date string
function toMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function toWeekly(daily: DailyStat[], startDate: string, endDate: string): Bucket[] {
  const weeks: Record<string, Bucket> = {};

  // Pre-fill every Monday in the range with zeros
  let cursor = toMonday(startDate);
  while (cursor <= endDate) {
    weeks[cursor] = { date: cursor, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    cursor = addDays(cursor, 7);
  }

  for (const d of daily) {
    const key = toMonday(d.date);
    if (!weeks[key]) weeks[key] = { date: key, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    weeks[key].sirens       += d.sirens;
    weeks[key].night_sirens += d.night_sirens;
    weeks[key].pre_alerts   += d.pre_alerts;
  }
  return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date));
}

function toYearly(daily: DailyStat[], startDate: string, endDate: string): Bucket[] {
  const years: Record<string, Bucket> = {};

  // Pre-fill every year in range with zeros
  let cursor = startDate.slice(0, 4);
  const end = endDate.slice(0, 4);
  while (cursor <= end) {
    years[cursor] = { date: cursor, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    cursor = String(parseInt(cursor) + 1);
  }

  for (const d of daily) {
    const key = d.date.slice(0, 4);
    if (!years[key]) years[key] = { date: key, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    years[key].sirens       += d.sirens;
    years[key].night_sirens += d.night_sirens;
    years[key].pre_alerts   += d.pre_alerts;
  }
  return Object.values(years).sort((a, b) => a.date.localeCompare(b.date));
}

function toMonthly(daily: DailyStat[], startDate: string, endDate: string): Bucket[] {
  const months: Record<string, Bucket> = {};

  // Pre-fill every month in range with zeros
  let cursor = startDate.slice(0, 7);
  const end = endDate.slice(0, 7);
  while (cursor <= end) {
    months[cursor] = { date: cursor, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    const [y, m] = cursor.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    cursor = next;
  }

  for (const d of daily) {
    const key = toMonth(d.date);
    if (!months[key]) months[key] = { date: key, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    months[key].sirens       += d.sirens;
    months[key].night_sirens += d.night_sirens;
    months[key].pre_alerts   += d.pre_alerts;
  }
  return Object.values(months).sort((a, b) => a.date.localeCompare(b.date));
}

function toDaily(daily: DailyStat[], startDate: string, endDate: string): Bucket[] {
  const map: Record<string, Bucket> = {};

  // Pre-fill every day in range
  let cursor = startDate;
  while (cursor <= endDate) {
    map[cursor] = { date: cursor, sirens: 0, night_sirens: 0, pre_alerts: 0 };
    cursor = addDays(cursor, 1);
  }

  for (const d of daily) {
    if (map[d.date]) {
      map[d.date].sirens       = d.sirens;
      map[d.date].night_sirens = d.night_sirens;
      map[d.date].pre_alerts   = d.pre_alerts;
    }
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function formatLabel(date: string, granularity: "day" | "week" | "month" | "year"): string {
  if (granularity === "year")  return date; // already YYYY
  if (granularity === "month") {
    const [y, m] = date.split("-");
    return `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(2)}`;
  }
  const [, m, d] = date.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const hasData = payload.some(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => e.value > 0);
  if (!hasData) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1.5 font-medium">{label}</p>
      {// eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center gap-2 text-zinc-200">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.fill }} />
          <span className="text-zinc-400">{entry.name}</span>
          <span className="font-mono font-semibold ml-auto pl-4">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Charts({
  daily,
  nightly,
  days,
  view,
}: {
  daily: DailyStat[];
  nightly: NightlyStat[];
  days: number;
  view: ChartView;
}) {
  if (daily.length === 0 && nightly.length === 0) {
    return <p className="text-zinc-600 text-sm text-center py-10">No data for this period.</p>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const startDate = days > 0 ? addDays(today, -(days - 1)) : (daily[0]?.date ?? nightly[0]?.night_date ?? today);

  const granularity: "day" | "week" | "month" | "year" =
    days === 0              ? "year"  :
    days >= 180             ? "month" :
    days >= 60              ? "week"  : "day";

  // For night view: aggregate nightly data by the same granularity as daily
  const nightlyAgg: Record<string, number> = {};
  for (const n of nightly) {
    const key =
      granularity === "year"  ? n.night_date.slice(0, 4) :
      granularity === "month" ? n.night_date.slice(0, 7) :
      granularity === "week"  ? toMonday(n.night_date)   :
      n.night_date;
    nightlyAgg[key] = (nightlyAgg[key] ?? 0) + n.night_sirens;
  }

  const buckets: Bucket[] =
    granularity === "year"  ? toYearly(daily, startDate, today)  :
    granularity === "month" ? toMonthly(daily, startDate, today) :
    granularity === "week"  ? toWeekly(daily, startDate, today)  :
    toDaily(daily, startDate, today);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] =
    view === "night"
      ? buckets.map(b => ({ date: formatLabel(b.date, granularity), "Night sirens": nightlyAgg[b.date] ?? 0 }))
      : buckets.map(b => ({
          date: formatLabel(b.date, granularity),
          "Pre-alerts": b.pre_alerts,
          "Sirens":     b.sirens,
        }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%" barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: "#52525b", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
          width={42}
          label={{
            value: view === "night" ? "night sirens" : "count",
            angle: -90,
            position: "insideLeft",
            offset: 12,
            style: { fill: "#3f3f46", fontSize: 10, fontFamily: "var(--font-geist-mono)" },
          }}
        />
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#27272a" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        {view === "night" ? (
          <Bar dataKey="Night sirens" fill="#6366f1" radius={[2, 2, 0, 0]}>
            {data.map((_: unknown, i: number) => (
              <Cell key={i} fill={data[i]["Night sirens"] > 0 ? "#6366f1" : "#27272a"} />
            ))}
          </Bar>
        ) : (
          <>
            <Bar dataKey="Pre-alerts" fill="#d97706" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Sirens"     fill="#dc2626" radius={[2, 2, 0, 0]} />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
