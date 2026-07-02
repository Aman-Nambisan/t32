// Shared visual tokens for in-chat blocks.
// Palettes are CVD- and contrast-validated against the near-black chat surface
// (lightness band, chroma floor, adjacent-pair colorblind ΔE, 3:1 contrast).
// Order is deliberate — don't reshuffle hues casually.

const PUBLIC_PALETTE = ["#D97706", "#059669", "#EA580C", "#0D9488", "#65A30D", "#0891B2"];
const BOARDROOM_PALETTE = ["#E5484D", "#8B5CF6", "#D97706", "#F43F5E", "#A855F7", "#B45309"];

export function palette(dark?: boolean): string[] {
  return dark ? BOARDROOM_PALETTE : PUBLIC_PALETTE;
}

/** Series color for slot i — clamped, never cycled (7th+ entries share the last hue). */
export function seriesColor(colors: string[], i: number): string {
  return colors[Math.min(i, colors.length - 1)];
}

export function cardCls(dark?: boolean): string {
  return `w-full min-w-0 rounded-xl border bg-black/40 p-3 ${
    dark ? "border-[#E5484D]/25" : "border-amber-300/20"
  }`;
}

export const titleCls = "mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/50";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const mid = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const small = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function fmt(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 100000) return compact.format(v);
  if (a >= 100) return mid.format(Math.round(v));
  if (a >= 10) return mid.format(v);
  return small.format(v);
}

const CURRENCY_PREFIXES = new Set(["$", "₹", "€", "£", "US$"]);

/** "$" style units prefix; "%" hugs the number; anything else is a spaced suffix. */
export function fmtUnit(v: number, unit?: string): string {
  const n = fmt(v);
  if (!unit) return n;
  if (CURRENCY_PREFIXES.has(unit)) return `${unit}${n}`;
  if (unit === "%") return `${n}%`;
  return `${n} ${unit}`;
}
