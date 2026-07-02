"use client";

import { useEffect, useState } from "react";
import type { ChartPoint } from "@/lib/types";
import { cardCls, fmt, fmtUnit, palette, seriesColor, titleCls } from "./theme";

type DonutChartProps = { title: string; unit?: string; data: ChartPoint[]; dark?: boolean };

const R = 44;
const SW = 15;
const GAP = 0.008; // ≈2px surface gap between segments (pathLength-normalized)
const SWEEP_MS = 900;

export default function DonutChart({ title, unit, data, dark }: DonutChartProps) {
  const colors = palette(dark);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  // Segments grow one after another (delay = cumulative start), which reads as
  // a single clockwise sweep. Transition, not mask animation — WebKit-safe.
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const shares = data.map((d) => (total > 0 ? Math.max(0, d.value) / total : 0));
  const segments = data.map((d, i) => ({
    ...d,
    share: shares[i],
    start: shares.slice(0, i).reduce((a, b) => a + b, 0),
    color: seriesColor(colors, i),
  }));

  return (
    <div className={cardCls(dark)}>
      <p className={titleCls}>{title}</p>
      {data.length === 0 ? (
        <p className="text-[11px] text-white/35">No data.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0" role="img" aria-label={title}>
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
            <g transform="rotate(-90 60 60)">
              {segments
                .filter((s) => s.share > 0)
                .map((s, i) => {
                  const dash = Math.max(s.share - GAP, 0.004);
                  return (
                    <circle
                      key={i}
                      cx="60"
                      cy="60"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={SW}
                      pathLength={1}
                      strokeDasharray={swept ? `${dash} ${1 - dash}` : `0 1`}
                      strokeDashoffset={-(s.start + GAP / 2)}
                      className="blk-donut-seg"
                      style={{
                        transitionDuration: `${Math.max(s.share * SWEEP_MS, 120)}ms`,
                        transitionDelay: `${150 + s.start * SWEEP_MS}ms`,
                      }}
                    >
                      <title>{`${s.label}: ${fmtUnit(s.value, unit)}`}</title>
                    </circle>
                  );
                })}
            </g>
            <text
              x="60"
              y="58"
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="rgba(255,255,255,0.92)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmt(total)}
            </text>
            <text x="60" y="71" textAnchor="middle" fontSize="7" letterSpacing="0.1em" fill="rgba(255,255,255,0.4)">
              {(unit ?? "total").toUpperCase()}
            </text>
          </svg>

          <ul className="min-w-[120px] flex-1 space-y-1">
            {segments.map((s, i) => (
              <li
                key={`${s.label}-${i}`}
                className="blk-fade flex items-center gap-1.5 text-[10px]"
                style={{ animationDelay: `${250 + i * 80}ms` }}
              >
                <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 truncate text-white/65" title={s.label}>
                  {s.label}
                </span>
                <span className="tabular-nums text-white/85">{fmtUnit(s.value, unit)}</span>
                <span className="w-8 shrink-0 text-right tabular-nums text-white/40">
                  {total > 0 ? `${Math.round(s.share * 100)}%` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
