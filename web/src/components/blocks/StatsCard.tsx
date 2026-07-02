import { cardCls, titleCls } from "./theme";

type StatItem = { label: string; value: string; delta?: string; good?: boolean };
type StatsCardProps = { title?: string; items: StatItem[]; dark?: boolean };

function deltaCls(good?: boolean): string {
  if (good === true) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (good === false) return "border-red-400/30 bg-red-500/10 text-red-300";
  return "border-white/15 bg-white/5 text-white/55";
}

export default function StatsCard({ title, items, dark }: StatsCardProps) {
  return (
    <div className={cardCls(dark)}>
      {title && <p className={titleCls}>{title}</p>}
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="blk-in rounded-lg border border-white/10 bg-white/[0.04] p-2"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <p className="truncate text-[9px] uppercase tracking-wider text-white/45" title={item.label}>
              {item.label}
            </p>
            <p className="mt-0.5 break-words text-[15px] font-semibold leading-tight tabular-nums text-white/95">
              {item.value}
            </p>
            {item.delta && (
              <span
                className={`mt-1 inline-block rounded-full border px-1.5 py-px text-[9px] font-medium tabular-nums ${deltaCls(item.good)}`}
              >
                {item.delta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
