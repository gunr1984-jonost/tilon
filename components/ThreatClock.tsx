"use client";

import { useEffect, useState } from "react";

interface HourlyData {
  days: number;
  hours: number[]; // 24 values, index = hour 0–23
}

/** Light = safe, dark crimson = dangerous. */
function heatColor(t: number): string {
  if (t <= 0) return "#151515";
  if (t < 0.35) {
    const s = t / 0.35;
    const v = Math.round(55 + s * 50);
    return `rgb(${v},${Math.round(v * 0.55)},${Math.round(v * 0.55)})`;
  }
  if (t < 0.7) {
    const s = (t - 0.35) / 0.35;
    const r = Math.round(105 + s * 60);
    const g = Math.round(58  - s * 48);
    return `rgb(${r},${g},${Math.round(g * 0.4)})`;
  }
  const s = (t - 0.7) / 0.3;
  return `rgb(${Math.round(165 + s * 39)},0,0)`;
}

interface Props {
  period: number;       // days; 0 = all time
  periodLabel: string;  // e.g. "28/2", "1w", "All"
  scope: "local" | "national";
}

export default function ThreatClock({ period, periodLabel, scope }: Props) {
  const [data, setData]               = useState<HourlyData | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [now, setNow]                 = useState(() => new Date());

  useEffect(() => {
    setData(null);
    fetch(`/api/hourly-stats?days=${period}&scope=${scope}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [period, scope]);

  // Tick every minute so the hand stays accurate
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!data) return null;

  const { hours } = data;
  const maxVal = Math.max(...hours);
  if (maxVal === 0) return null;

  const totalSirens = hours.reduce((a, b) => a + b, 0);

  const TAU    = Math.PI * 2;
  const innerR = 32;
  const band   = 58;
  const segArc = (14 / 360) * TAU;

  // ── segments ──────────────────────────────────────────────────────────────
  const segments = hours.map((count, h) => {
    const t      = count / maxVal;
    const outerR = innerR + Math.max(band * t, 3);
    const a0     = (h / 24) * TAU - TAU / 4 + (0.5 / 360) * TAU;
    const a1     = a0 + segArc;
    const isHovered = hoveredHour === h;

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    const x0o = (outerR * cos0).toFixed(2), y0o = (outerR * sin0).toFixed(2);
    const x1o = (outerR * cos1).toFixed(2), y1o = (outerR * sin1).toFixed(2);
    const x0i = (innerR * cos0).toFixed(2), y0i = (innerR * sin0).toFixed(2);
    const x1i = (innerR * cos1).toFixed(2), y1i = (innerR * sin1).toFixed(2);

    const d =
      `M${x0i},${y0i} L${x0o},${y0o}` +
      ` A${outerR},${outerR} 0 0,1 ${x1o},${y1o}` +
      ` L${x1i},${y1i}` +
      ` A${innerR},${innerR} 0 0,0 ${x0i},${y0i}`;

    return (
      <path
        key={h}
        d={d}
        fill={heatColor(t)}
        stroke={isHovered ? "rgba(255,255,255,0.55)" : "none"}
        strokeWidth={isHovered ? 1 : 0}
        style={{ cursor: "default" }}
        onMouseEnter={() => setHoveredHour(h)}
        onMouseLeave={() => setHoveredHour(null)}
      />
    );
  });

  // ── hour labels every 3 h ─────────────────────────────────────────────────
  const labelR     = innerR + band + 14;
  const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];
  const labels = labelHours.map((lh) => {
    const a  = (lh / 24) * TAU - TAU / 4;
    const lx = (labelR * Math.cos(a)).toFixed(1);
    const ly = (labelR * Math.sin(a) + 3.5).toFixed(1);
    return (
      <text key={lh} x={lx} y={ly} textAnchor="middle"
        fill={hoveredHour === lh ? "#888" : "#4a4a4a"}
        fontSize="8" fontFamily="'Courier New', monospace">
        {lh}
      </text>
    );
  });

  // ── "now" hand ────────────────────────────────────────────────────────────
  const nowFrac  = (now.getHours() + now.getMinutes() / 60) / 24; // 0–1
  const nowAngle = nowFrac * TAU - TAU / 4;
  const handEnd  = innerR + band + 4;
  const nx  = (handEnd * Math.cos(nowAngle)).toFixed(2);
  const ny  = (handEnd * Math.sin(nowAngle)).toFixed(2);
  const nix = (innerR  * Math.cos(nowAngle)).toFixed(2);
  const niy = (innerR  * Math.sin(nowAngle)).toFixed(2);
  const nowStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  // ── hover info ─────────────────────────────────────────────────────────────
  const hoverInfo = (() => {
    if (hoveredHour === null) return null;
    const h   = hoveredHour;
    const cnt = hours[h];
    const pct = totalSirens > 0 ? ((cnt / totalSirens) * 100).toFixed(1) : "0";
    const h0  = String(h).padStart(2, "0") + ":00";
    const h1  = String((h + 1) % 24).padStart(2, "0") + ":00";
    const rank = [...hours].sort((a, b) => b - a).indexOf(cnt) + 1;
    return { h0, h1, cnt, pct, rank };
  })();

  return (
    <section className="space-y-3">
      <h2 className="text-xs text-zinc-500 uppercase tracking-widest">
        Threat clock · {periodLabel}
      </h2>
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 py-6 flex flex-col items-center gap-4">
        <svg width="240" height="240" viewBox="-120 -120 240 240"
          style={{ overflow: "visible" }}>
          <circle cx="0" cy="0" r={innerR + band + 1} fill="none"
            stroke="#0f0f0f" strokeWidth={band + 1} />
          {segments}
          {/* now hand */}
          <line x1={nix} y1={niy} x2={nx} y2={ny}
            stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          {labels}
          {/* centre — current time */}
          <text x="0" y="5" textAnchor="middle" fill="#aaaaaa" fontSize="13"
            fontFamily="'Courier New', monospace" fontWeight="bold">{nowStr}</text>
        </svg>

        {/* info strip */}
        <div className="h-8 flex items-center justify-center">
          {hoverInfo ? (
            <p className="text-xs font-mono text-center">
              <span className="text-zinc-400">{hoverInfo.h0}–{hoverInfo.h1}</span>
              <span className="mx-2 text-zinc-700">·</span>
              <span style={{ color: heatColor(hours[hoveredHour!] / maxVal) }}
                className="font-bold">{hoverInfo.cnt}</span>
              <span className="text-zinc-600"> sirens</span>
              <span className="mx-2 text-zinc-700">·</span>
              <span className="text-zinc-500">{hoverInfo.pct}% of period</span>
              <span className="mx-2 text-zinc-700">·</span>
              <span className="text-zinc-600">rank #{hoverInfo.rank}</span>
            </p>
          ) : (
            <div className="flex items-center gap-1.5">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                <div key={t} style={{
                  background: heatColor(t), width: 14, height: 8, borderRadius: 2,
                  border: t === 0 ? "1px solid #2a2a2a" : "none",
                }} />
              ))}
              <span className="text-[10px] text-zinc-600 ml-1 font-mono">low → peak</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
