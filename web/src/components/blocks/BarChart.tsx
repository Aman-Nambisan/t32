import type { ChartPoint } from "@/lib/types";
import { cardCls, fmtUnit, palette, seriesColor, titleCls } from "./theme";

type BarChartProps = { title: string; unit?: string; data: ChartPoint[]; dark?: boolean };

export default function BarChart({ title, unit, data, dark }: BarChartProps) {
  const colors = palette(dark);
  const max = Math.max(0, ...data.map((d) => d.value));

  return (
    <div className={cardCls(dark)}>
      <p className={titleCls}>{title}</p>
      {data.length === 0 ? (
        <p className="text-[11px] text-white/35">No data.</p>
      ) : (
        <div className="space-y-1.5">
          {data.map((d, i) => {
            const pct = max > 0 ? (Math.max(0, d.value) / max) * 100 : 0;
            return (
              <div
                key={`${d.label}-${i}`}
                className="flex items-center gap-2"
                title={`${d.label}: ${fmtUnit(d.value, unit)}`}
              >
                <span className="w-16 shrink-0 truncate text-right text-[10px] leading-4 text-white/55">
                  {d.label}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="blk-grow h-full rounded-r-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: seriesColor(colors, i),
                      animationDelay: `${120 + i * 70}ms`,
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-white/85">
                  {fmtUnit(d.value, unit)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
