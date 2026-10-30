"use client";

import { useState } from "react";
import type { Point } from "@/lib/insights";
import { fmtDate, fmtNumber } from "@/lib/format";

type Band = { from: number; to: number; label?: string };

export function LineChart({
  points,
  unit,
  color = "#1f8a62",
  band,
  height = 180,
  digits = 1,
}: {
  points: Point[];
  unit?: string;
  color?: string;
  band?: Band;
  height?: number;
  digits?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 560;
  const pad = { top: 16, right: 16, bottom: 26, left: 40 };

  if (points.length === 0) {
    return <div className="grid place-items-center text-sm text-ink-500" style={{ height }}>Sin datos todavía</div>;
  }

  const values = points.map((p) => p.value);
  const times = points.map((p) => new Date(p.date).getTime());
  let min = Math.min(...values, ...(band ? [band.from] : []));
  let max = Math.max(...values, ...(band ? [band.to] : []));
  if (band && band.to > max * 1.6) max = Math.max(...values) * 1.15;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);

  const x = (t: number) => (t1 === t0 ? pad.left + (width - pad.left - pad.right) / 2 : pad.left + ((t - t0) / (t1 - t0)) * (width - pad.left - pad.right));
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * (height - pad.top - pad.bottom);

  const coords = points.map((p, i) => ({ x: x(times[i]), y: y(p.value), p }));
  const path = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = coords.length > 1 ? `${path} L${coords.at(-1)!.x.toFixed(1)},${height - pad.bottom} L${coords[0].x.toFixed(1)},${height - pad.bottom} Z` : "";
  const ticks = [min + (max - min) * 0.15, (min + max) / 2, max - (max - min) * 0.15];
  const gradientId = `g-${color.replace("#", "")}`;
  const active = hover != null ? coords[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {band && (
          <rect
            x={pad.left}
            width={width - pad.left - pad.right}
            y={y(Math.min(band.to, max))}
            height={Math.max(0, y(Math.max(band.from, min)) - y(Math.min(band.to, max)))}
            fill="#34a172"
            opacity="0.08"
          />
        )}
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#0d1f18" strokeOpacity="0.06" />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#6f9587">
              {fmtNumber(tick, tick >= 100 ? 0 : 1)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <g key={c.p.date + i}>
            <circle cx={c.x} cy={c.y} r={hover === i ? 5 : 3.5} fill="white" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <rect
              x={c.x - 18}
              y={pad.top}
              width={36}
              height={height - pad.top - pad.bottom}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          </g>
        ))}
        <text x={pad.left} y={height - 6} fontSize="11" fill="#6f9587">
          {fmtDate(points[0].date, { year: "2-digit" })}
        </text>
        {points.length > 1 && (
          <text x={width - pad.right} y={height - 6} fontSize="11" fill="#6f9587" textAnchor="end">
            {fmtDate(points.at(-1)!.date, { year: "2-digit" })}
          </text>
        )}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs text-white shadow-lift"
          style={{ left: `${(active.x / width) * 100}%`, top: `${(active.y / height) * 100}%`, marginTop: -8 }}
        >
          <p className="font-semibold">
            {fmtNumber(active.p.value, digits)} {unit}
          </p>
          <p className="text-white/60">{fmtDate(active.p.date)}</p>
        </div>
      )}
    </div>
  );
}
