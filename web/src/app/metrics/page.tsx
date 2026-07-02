import Link from "next/link";
import {
  loadLatestRun,
  axisMean,
  dutyCases,
  adversarialCases,
  statusFor,
  type CaseResult,
  type Status,
} from "@/lib/metrics";

// Always read the freshest runs/*.json at request time (a new bench should show up on reload).
export const dynamic = "force-dynamic";

// Fixed status palette (dataviz skill) — never themed, always paired with an icon + label so meaning
// is never carried by color alone.
const STATUS: Record<Status, { color: string; icon: string; word: string }> = {
  good: { color: "var(--st-good)", icon: "●", word: "solid" },
  warning: { color: "var(--st-warning)", icon: "◐", word: "watch" },
  serious: { color: "var(--st-serious)", icon: "▲", word: "weak" },
  critical: { color: "var(--st-critical)", icon: "✕", word: "fail" },
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fmt = (v: number | null, d = 2) => (v == null ? "—" : v.toFixed(d));

function StatTile({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: Status;
}) {
  const s = status ? STATUS[status] : null;
  return (
    <div className="rounded-xl border border-[var(--hair)] bg-[var(--surface)] p-5 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums text-[var(--ink)]">{value}</span>
        {s && (
          <span className="text-sm font-medium" style={{ color: s.color }}>
            {s.icon} {s.word}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-[var(--muted)] mt-1">{sub}</div>}
    </div>
  );
}

function DutyBar({ c }: { c: CaseResult }) {
  const w = Math.max(2, c.scoreWorst * 100);
  const st = statusFor(c.scoreWorst);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-44 shrink-0 text-sm text-[var(--ink)] truncate">
        {c.id.replace(/-review$/, "").replace(/-/g, " ")}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-[var(--track)] relative">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${w}%`, background: STATUS[st].color }}
        />
      </div>
      <div className="w-40 shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">
        worst <span className="text-[var(--ink)] font-medium">{fmt(c.scoreWorst)}</span> · pass{" "}
        <span className="text-[var(--ink)] font-medium">{pct(c.passRate)}</span> · det{" "}
        <span className="text-[var(--ink)] font-medium">{fmt(c.det)}</span>
      </div>
    </div>
  );
}

function AdversarialChip({ c }: { c: CaseResult }) {
  const held = c.passRate >= 0.999 && c.criticalFailures.length === 0;
  const st: Status = held ? "good" : c.passRate >= 0.5 ? "serious" : "critical";
  const s = STATUS[st];
  return (
    <div className="rounded-lg border border-[var(--hair)] bg-[var(--surface)] px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-[var(--ink)]">
        {c.id.replace(/-/g, " ")}
      </div>
      <div className="text-sm font-medium whitespace-nowrap" style={{ color: s.color }}>
        {s.icon} {held ? "held the line" : "review"} · {pct(c.passRate)}
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const run = loadLatestRun();

  return (
    <main className="metrics min-h-full px-6 py-10 md:px-12 md:py-14 max-w-6xl mx-auto w-full">
      <style>{`
        .metrics{
          --surface:#fcfcfb; --plane:#f9f9f7; --ink:#0b0b0b; --sec:#52514e; --muted:#898781;
          --hair:rgba(11,11,11,0.10); --track:#e1e0d9;
          --st-good:#0ca30c; --st-warning:#eda100; --st-serious:#ec835a; --st-critical:#d03b3b;
          --seq:#2a78d6;
        }
        @media (prefers-color-scheme:dark){
          .metrics{
            --surface:#1a1a19; --plane:#0d0d0d; --ink:#ffffff; --sec:#c3c2b7; --muted:#898781;
            --hair:rgba(255,255,255,0.10); --track:#2c2c2a;
            --st-good:#0ca30c; --st-warning:#fab219; --st-serious:#ec835a; --st-critical:#d03b3b;
            --seq:#3987e5;
          }
        }
      `}</style>

      {/* Header */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            McContext · Penny · Controls
          </div>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--ink)] mt-1"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Agent metrics
          </h1>
        </div>
        <Link
          href="/"
          className="text-sm text-[var(--sec)] hover:text-[var(--ink)] underline underline-offset-4"
        >
          ← Nirmala
        </Link>
      </header>

      {!run ? (
        <div className="rounded-xl border border-[var(--hair)] bg-[var(--surface)] p-8 text-[var(--sec)]">
          No eval runs found yet. Run <code className="text-[var(--ink)]">make bench SUITE=finance</code>{" "}
          to produce a <code>runs/*.json</code>, then reload.
        </div>
      ) : (
        <>
          {/* Provenance banner */}
          <div className="mb-8 text-xs text-[var(--muted)] leading-relaxed">
            From local review-mode eval <span className="text-[var(--sec)]">({run.runId})</span> · model{" "}
            <span className="text-[var(--sec)]">{run.agentModel}</span> ·{" "}
            <span className="text-[var(--sec)]">{run.repeats}×</span> repeats per case · scored by an
            independent judge + deterministic checks. Live $-exposure (world.*) is a separate panel
            (coming next).
          </div>

          {/* Hero KPI row */}
          <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <StatTile
              label="Suite pass-rate"
              value={pct(run.passRate)}
              sub="runs with zero critical + deterministic failures"
              status={statusFor(run.passRate)}
            />
            <StatTile
              label="Mean worst-case"
              value={fmt(run.worstMean)}
              sub="reliability floor across repeats — right every time"
              status={statusFor(run.worstMean)}
            />
            <StatTile
              label="Security (adversarial)"
              value={fmt(axisMean(run.cases, "security"))}
              sub="resists authority-spoof + injection"
              status={statusFor(axisMean(run.cases, "security"))}
            />
            <StatTile
              label="Precision"
              value={fmt(axisMean(run.cases, "precision"))}
              sub="catches real leaks without crying wolf"
              status={statusFor(axisMean(run.cases, "precision"))}
            />
            <StatTile
              label="Deterministic checks"
              value={fmt(run.detMean)}
              sub="grounding · structured · decision · retrieved"
              status={statusFor(run.detMean)}
            />
            <StatTile
              label="Est cost / full pass"
              value={run.cost ? `$${run.cost.estCostUsd.toFixed(4)}` : "pending"}
              sub={
                run.cost
                  ? `$50 cap ≈ ${Math.floor(50 / (run.cost.estCostUsd || 1))} passes · ${run.cost.toolCalls} tool-calls`
                  : "fills when a cost-instrumented run lands"
              }
              status={run.cost ? "good" : "warning"}
            />
          </section>

          {/* Per-duty */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">By duty — worst-case score</h2>
            <p className="text-xs text-[var(--muted)] mb-4">
              The floor each control holds across repeats. A duty is only as trustworthy as its worst run.
            </p>
            <div className="rounded-xl border border-[var(--hair)] bg-[var(--surface)] p-5">
              {dutyCases(run.cases).map((c) => (
                <DutyBar key={c.id} c={c} />
              ))}
            </div>
          </section>

          {/* Adversarial resistance */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">Adversarial resistance</h2>
            <p className="text-xs text-[var(--muted)] mb-4">
              Can Penny be talked out of the rules? Authority-spoofing and instructions hidden in data.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {adversarialCases(run.cases).map((c) => (
                <AdversarialChip key={c.id} c={c} />
              ))}
            </div>
          </section>

          {/* What to fix */}
          {run.criticalFailures.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">
                What to fix{" "}
                <span className="text-[var(--st-critical)]">({run.criticalFailures.length})</span>
              </h2>
              <ul className="mt-3 space-y-1.5">
                {run.criticalFailures.slice(0, 12).map((f, i) => (
                  <li key={i} className="text-sm text-[var(--sec)] flex gap-2">
                    <span className="text-[var(--st-critical)]">✕</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
