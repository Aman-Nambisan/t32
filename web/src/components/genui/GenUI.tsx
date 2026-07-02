"use client";

import dynamic from "next/dynamic";
import { Component, type CSSProperties, type ReactNode } from "react";
import type { ChartPoint, UiElement, UiSpec } from "@/lib/types";
import { UI_LIMITS } from "@/lib/types";
import BarChart from "../blocks/BarChart";
import DonutChart from "../blocks/DonutChart";
import LineChart from "../blocks/LineChart";
import StatsCard from "../blocks/StatsCard";
import { cardCls, fmt, palette, titleCls } from "../blocks/theme";
import DocArtifact from "./DocArtifact";
import "../blocks/blocks.css"; // chart components lean on blk-* keyframes
import "./genui.css";

function CoinsLoading() {
  return <div className="h-[248px] w-full animate-pulse rounded-xl border border-white/10 bg-black/40" />;
}

// Lazy-load the R3F block so three.js stays out of the main chat bundle.
const CoinStacks3D = dynamic(() => import("../blocks/CoinStacks3D"), {
  ssr: false,
  loading: CoinsLoading,
});

// LLM output can defy the types at runtime; only strings/numbers may hit JSX text.
function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function gapStyle(gap?: number): CSSProperties {
  const g = typeof gap === "number" && Number.isFinite(gap) ? Math.min(6, Math.max(1, gap)) : 2.5;
  return { gap: `${g * 0.25}rem` };
}

function chartData(data: ChartPoint[] | undefined): ChartPoint[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((d) => d != null && typeof d === "object" && typeof d.value === "number" && Number.isFinite(d.value))
    .slice(0, UI_LIMITS.maxChildren)
    .map((d) => ({ label: str(d.label) || "—", value: d.value }));
}

/** Polyline points for a ~64×20 sparkline, normalized to the series min/max. */
function sparkPoints(spark?: number[]): string | null {
  if (!Array.isArray(spark)) return null;
  const vals = spark
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .slice(0, UI_LIMITS.maxSpark);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  return vals
    .map((v, i) => {
      const x = 1 + (i / (vals.length - 1)) * 62;
      const y = span > 0 ? 18 - ((v - min) / span) * 16 : 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const CARD_ACCENT: Record<string, string> = {
  good: "rgba(52,211,153,0.35)",
  bad: "rgba(248,113,113,0.4)",
  warn: "rgba(251,191,36,0.35)",
};

const CALLOUT_TONES: Record<string, { box: string; title: string }> = {
  info: { box: "border-sky-400/70 bg-sky-400/10", title: "text-sky-300" },
  success: { box: "border-emerald-400/70 bg-emerald-400/10", title: "text-emerald-300" },
  warning: { box: "border-amber-400/70 bg-amber-400/10", title: "text-amber-300" },
  danger: { box: "border-red-400/70 bg-red-500/10", title: "text-red-300" },
};

type WalkCtx = {
  elements: Record<string, UiElement>;
  dark?: boolean;
  budget: { left: number }; // global rendered-node cap across the whole canvas
};

function renderChildren(
  ctx: WalkCtx,
  parentId: string,
  ids: string[],
  depth: number,
  visited: ReadonlySet<string>,
  itemCls: string,
): ReactNode[] {
  if (!Array.isArray(ids)) return [];
  const branch = new Set(visited).add(parentId); // per-branch: siblings may share ids, ancestors may not
  const out: ReactNode[] = [];
  ids.slice(0, UI_LIMITS.maxChildren).forEach((childId, i) => {
    if (typeof childId !== "string") return;
    const node = renderElement(childId, ctx, depth + 1, branch);
    // Skip nulls entirely — empty wrappers would still eat flex/grid gap.
    if (node != null) {
      out.push(
        <div key={`${childId}-${i}`} className={itemCls}>
          {node}
        </div>,
      );
    }
  });
  return out;
}

function renderElement(id: string, ctx: WalkCtx, depth: number, visited: ReadonlySet<string>): ReactNode {
  if (depth > UI_LIMITS.maxDepth || visited.has(id) || ctx.budget.left <= 0) return null;
  const el = ctx.elements[id];
  if (!el || typeof el !== "object") return null;
  ctx.budget.left -= 1;

  switch (el.type) {
    case "row":
      return (
        <div className="flex min-w-0 flex-wrap" style={gapStyle(el.gap)}>
          {renderChildren(ctx, id, el.children, depth, visited, "min-w-0 grow basis-36")}
        </div>
      );

    case "col":
      return (
        <div className="flex min-w-0 flex-col" style={gapStyle(el.gap)}>
          {renderChildren(ctx, id, el.children, depth, visited, "min-w-0")}
        </div>
      );

    case "grid": {
      const cols =
        typeof el.cols === "number" && Number.isFinite(el.cols)
          ? Math.min(4, Math.max(1, Math.round(el.cols)))
          : 2;
      // Inline template — the Tailwind JIT can't see runtime column counts.
      return (
        <div
          className="gui-grid min-w-0"
          style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...gapStyle(undefined) }}
        >
          {renderChildren(ctx, id, el.children, depth, visited, "min-w-0")}
        </div>
      );
    }

    case "card": {
      const accent = el.accent && el.accent !== "default" ? CARD_ACCENT[el.accent] : undefined;
      return (
        <div className={cardCls(ctx.dark)} style={accent ? { borderColor: accent } : undefined}>
          {el.title ? <p className={titleCls}>{str(el.title)}</p> : null}
          <div className="flex min-w-0 flex-col gap-2">
            {renderChildren(ctx, id, el.children, depth, visited, "min-w-0")}
          </div>
        </div>
      );
    }

    case "callout": {
      const tone = CALLOUT_TONES[el.tone] ?? CALLOUT_TONES.info;
      return (
        <div className={`min-w-0 rounded-md border-l-2 px-3 py-2 ${tone.box}`}>
          {el.title ? (
            <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-widest ${tone.title}`}>
              {str(el.title)}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-white/80">{str(el.body)}</p>
        </div>
      );
    }

    case "stat": {
      const points = sparkPoints(el.spark);
      const deltaCls =
        el.good === true ? "text-emerald-300" : el.good === false ? "text-red-300" : "text-white/50";
      return (
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
          <p className="truncate text-[10px] uppercase tracking-widest text-white/50" title={str(el.label)}>
            {str(el.label)}
          </p>
          <div className="mt-0.5 flex items-end justify-between gap-2">
            <p className="min-w-0 truncate text-xl font-semibold leading-tight tabular-nums text-white/95">
              {str(el.value)}
            </p>
            {points && (
              <svg viewBox="0 0 64 20" className="h-5 w-16 shrink-0" aria-hidden>
                <polyline
                  points={points}
                  fill="none"
                  stroke={palette(ctx.dark)[0]}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          {el.delta ? <p className={`mt-0.5 text-[11px] tabular-nums ${deltaCls}`}>{str(el.delta)}</p> : null}
        </div>
      );
    }

    case "table": {
      const columns = (Array.isArray(el.columns) ? el.columns : []).slice(0, UI_LIMITS.maxTableCols);
      const rows = (Array.isArray(el.rows) ? el.rows : [])
        .slice(0, UI_LIMITS.maxTableRows)
        .map((r) => (Array.isArray(r) ? r.slice(0, UI_LIMITS.maxTableCols) : []));
      const colCount = Math.max(columns.length, ...rows.map((r) => r.length), 0);
      if (rows.length === 0 || colCount === 0) {
        return (
          <div className="w-full min-w-0">
            {el.title ? <p className={titleCls}>{str(el.title)}</p> : null}
            <p className="text-[11px] text-white/35">No rows.</p>
          </div>
        );
      }
      const highlight = new Set(Array.isArray(el.highlight) ? el.highlight : []);
      const accent = palette(ctx.dark)[0];
      const hlBg = `${accent}1F`; // ~12% wash of the mode accent
      const numericCol = Array.from(
        { length: colCount },
        (_, c) =>
          rows.some((r) => typeof r[c] === "number") &&
          rows.every((r) => r[c] == null || typeof r[c] === "number"),
      );
      return (
        <div className="w-full min-w-0">
          {el.title ? <p className={titleCls}>{str(el.title)}</p> : null}
          {/* Scroll containment: wide tables scroll here, never widen the chat. */}
          <div className="min-w-0 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full border-collapse text-xs">
              {columns.length > 0 && (
                <thead>
                  <tr className="border-b border-white/10">
                    {Array.from({ length: colCount }, (_, c) => (
                      <th
                        key={c}
                        className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45 ${
                          numericCol[c] ? "text-right" : "text-left"
                        }`}
                      >
                        {str(columns[c])}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, r) => {
                  const hl = highlight.has(r);
                  return (
                    <tr
                      key={r}
                      className={r % 2 === 1 ? "bg-white/[0.03]" : undefined}
                      style={hl ? { backgroundColor: hlBg } : undefined}
                    >
                      {Array.from({ length: colCount }, (_, c) => {
                        const cell = row[c];
                        const isNum = typeof cell === "number";
                        return (
                          <td
                            key={c}
                            className={`px-2.5 py-1.5 align-top ${
                              isNum
                                ? "whitespace-nowrap text-right tabular-nums text-white/85"
                                : "text-left text-white/70"
                            }`}
                            // Constant 2px so highlight never shifts the layout.
                            style={c === 0 ? { borderLeft: `2px solid ${hl ? accent : "transparent"}` } : undefined}
                          >
                            {isNum ? fmt(cell) : str(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case "timeline": {
      const items = (Array.isArray(el.items) ? el.items : []).slice(0, UI_LIMITS.maxTableRows);
      if (items.length === 0) return null;
      return (
        <div className="w-full min-w-0">
          {el.title ? <p className={titleCls}>{str(el.title)}</p> : null}
          <ol className="ml-1 space-y-2.5 border-l border-white/15 pl-4">
            {items.map((item, i) => {
              const status = item?.status;
              const dot =
                status === "flag"
                  ? "bg-red-400 ring-2 ring-red-400/25"
                  : status === "clear"
                    ? "bg-emerald-400 ring-2 ring-emerald-400/25"
                    : "bg-white/35";
              return (
                <li
                  key={i}
                  className="gui-in relative"
                  style={{ animationDelay: `${Math.min(i, 8) * 120}ms` }}
                >
                  <span aria-hidden className={`absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full ${dot}`} />
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className={`text-sm leading-5 ${status === "flag" || status === "clear" ? "text-white/90" : "text-white/70"}`}>
                      {str(item?.label)}
                    </span>
                    {status === "flag" && (
                      <span className="rounded-full border border-red-400/30 bg-red-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-red-300">
                        Flagged
                      </span>
                    )}
                    {status === "clear" && (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                        Cleared
                      </span>
                    )}
                  </div>
                  {item?.detail ? <p className="mt-0.5 text-xs text-white/55">{str(item.detail)}</p> : null}
                </li>
              );
            })}
          </ol>
        </div>
      );
    }

    case "progress": {
      const raw = typeof el.pct === "number" && Number.isFinite(el.pct) ? el.pct : 0;
      const pct = Math.min(100, Math.max(0, raw));
      const colors = palette(ctx.dark);
      return (
        <div className="w-full min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-white/70">{str(el.label)}</p>
            <p className="shrink-0 text-xs tabular-nums text-white/85">{Math.round(pct)}%</p>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="gui-grow h-full rounded-full"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})` }}
            />
          </div>
          {el.detail ? <p className="mt-1 text-[11px] text-white/50">{str(el.detail)}</p> : null}
        </div>
      );
    }

    case "doc":
      return <DocArtifact doc={el} dark={ctx.dark} />;

    case "bar":
      return <BarChart title={str(el.title)} unit={str(el.unit) || undefined} data={chartData(el.data)} dark={ctx.dark} />;

    case "line":
      return <LineChart title={str(el.title)} unit={str(el.unit) || undefined} data={chartData(el.data)} dark={ctx.dark} />;

    case "donut":
      return <DonutChart title={str(el.title)} unit={str(el.unit) || undefined} data={chartData(el.data)} dark={ctx.dark} />;

    case "coins3d":
      return <CoinStacks3D title={str(el.title)} unit={str(el.unit) || undefined} data={chartData(el.data)} />;

    case "stats": {
      const items = (Array.isArray(el.items) ? el.items : [])
        .filter((it) => it != null && typeof it === "object")
        .slice(0, UI_LIMITS.maxChildren)
        .map((it) => ({
          label: str(it.label),
          value: str(it.value),
          delta: it.delta ? str(it.delta) : undefined,
          good: typeof it.good === "boolean" ? it.good : undefined,
        }));
      if (items.length === 0) return null;
      return <StatsCard title={el.title ? str(el.title) : undefined} items={items} dark={ctx.dark} />;
    }

    default:
      return null; // unknown type from the model — drop silently
  }
}

function Canvas({ spec, dark }: { spec: UiSpec; dark?: boolean }) {
  const ctx: WalkCtx = { elements: spec.elements, dark, budget: { left: UI_LIMITS.maxElements } };
  const node = renderElement(spec.root, ctx, 0, new Set<string>());
  if (node == null) return null;
  return <div className="gui-in flex w-full min-w-0 flex-col gap-2.5">{node}</div>;
}

// LLM-shaped input: a bad canvas must vanish, never take down the chat.
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function GenUI({ spec, dark }: { spec: UiSpec; dark?: boolean }) {
  if (!spec || typeof spec !== "object" || typeof spec.root !== "string") return null;
  if (!spec.elements || typeof spec.elements !== "object") return null;
  return (
    <Boundary>
      <Canvas spec={spec} dark={dark} />
    </Boundary>
  );
}
