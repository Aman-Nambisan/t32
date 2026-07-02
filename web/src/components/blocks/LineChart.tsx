import type { ChartPoint } from "@/lib/types";
import { cardCls, fmtUnit, palette, titleCls } from "./theme";

type LineChartProps = { title: string; unit?: string; data: ChartPoint[]; dark?: boolean };

const W = 260;
const H = 132;
const PL = 10;
const PR = 14;
const PT = 18;
const PB = 22;

function shortLabel(label: string): string {
  return label.length > 7 ? `${label.slice(0, 6)}…` : label;
}

export default function LineChart({ title, unit, data, dark }: LineChartProps) {
  const color = palette(dark)[0];
  const n = data.length;

  if (n === 0) {
    return (
      <div className={cardCls(dark)}>
        <p className={titleCls}>{title}</p>
        <p className="text-[11px] text-white/35">No data.</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const x = (i: number) => (n === 1 ? PL + plotW / 2 : PL + (i * plotW) / (n - 1));
  const y = (v: number) => PT + (1 - (max === min ? 0.5 : (v - min) / (max - min))) * plotH;
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);

  const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const base = H - PB;
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`;
  const labelStep = Math.max(1, Math.ceil(n / 6));
  const drawMs = 900;

  return (
    <div className={cardCls(dark)}>
      <p className={titleCls}>{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={title}>
        {[0, 0.5, 1].map((t) => {
          const gy = PT + t * plotH;
          return (
            <line
              key={t}
              x1={PL}
              x2={W - PR}
              y1={gy}
              y2={gy}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}
        {n > 1 && (
          <path
            d={area}
            fill={color}
            opacity="0.12"
            className="blk-fade"
            style={{ animationDelay: "650ms" }}
          />
        )}
        {n > 1 && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="blk-draw"
            style={{ animationDelay: "150ms" }}
          />
        )}
        {pts.map(([px, py], i) => (
          <circle
            key={i}
            cx={px}
            cy={py}
            r="3"
            fill="#0b0b0e"
            stroke={color}
            strokeWidth="2"
            className="blk-fade"
            style={{ animationDelay: `${150 + (n > 1 ? (i / (n - 1)) * drawMs : 0)}ms` }}
          >
            <title>{`${data[i].label}: ${fmtUnit(data[i].value, unit)}`}</title>
          </circle>
        ))}
        <text
          x={pts[n - 1][0]}
          y={Math.max(pts[n - 1][1] - 8, 9)}
          textAnchor="end"
          fontSize="9"
          fontWeight="600"
          fill="rgba(255,255,255,0.85)"
          style={{ fontVariantNumeric: "tabular-nums", animationDelay: "1050ms" }}
          className="blk-fade"
        >
          {fmtUnit(data[n - 1].value, unit)}
        </text>
        {data.map((d, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={i}
              x={pts[i][0]}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize="8.5"
              fill="rgba(255,255,255,0.4)"
            >
              {shortLabel(d.label)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
