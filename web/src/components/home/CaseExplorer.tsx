"use client";

import { Fragment, useState } from "react";
import "./home.css";
import {
  CASES,
  DUTY_LABELS,
  DUTY_ORDER,
  fmtUSD,
  type DutyFilter,
  type PennyCase,
  type TraceKind,
} from "./cases";

// Ledger-paper palette (classes must stay literal for Tailwind's scanner):
// paper #F3ECDA · paper-dark #E7DEC6 · ink #241F16 · ink-soft #5B5344 ·
// ledger #1F4D3D · stamp red #9C3626 / green #2F6B3F · amber #B8823A · rule #C9BE9F

const KIND_STYLES: Record<TraceKind, string> = {
  tool: "bg-[#1F4D3D] text-white",
  read: "bg-[#C9BE9F] text-[#241F16]",
  decide: "bg-[#B8823A] text-white",
};

// Batch-level rubric numbers, derived with the prototype's exact formulas.
const totalTools = CASES.reduce((s, c) => s + c.eff.tools, 0);
const totalCalls = CASES.reduce((s, c) => s + c.eff.calls, 0);
const totalCost = CASES.reduce((s, c) => s + c.eff.cost, 0);
const flaggedCount = CASES.filter((c) => c.status === "flagged").length;
const clearedCount = CASES.length - flaggedCount;

const SCORECARD: ReadonlyArray<readonly [string, string, string]> = [
  [
    "Investigation",
    `${CASES.length}/${CASES.length} cases`,
    "every case reads ≥2 independent records before a call is made",
  ],
  [
    "Method",
    `${(totalCalls / CASES.length).toFixed(1)} steps/case`,
    "avg. read + tool + decide sequence, shown in each trace",
  ],
  [
    "Tool use",
    `${((totalTools / totalCalls) * 100).toFixed(0)}% deterministic`,
    "matching & variance math run as tool calls, not LLM arithmetic",
  ],
  [
    "Communication",
    "1 line, plain English",
    "every case ends in a one-read explanation a controller can act on",
  ],
  [
    "Efficiency & precision",
    `$${(totalCost / CASES.length).toFixed(3)}/case · ${flaggedCount}F ${clearedCount}C`,
    "0 false alarms in this illustrative batch",
  ],
];

export default function CaseExplorer() {
  const [duty, setDuty] = useState<DutyFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string>(CASES[0].id);

  const filtered = duty === "ALL" ? CASES : CASES.filter((c) => c.dutyShort === duty);
  // Derived selection: if the filter hides the chosen case, fall back to the
  // first visible one without losing the original pick.
  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0];

  return (
    <section id="cases" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="home-reveal max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
            Exhibit A · one day&apos;s batch
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            See a day&apos;s batch — flags <span className="text-amber-300">and</span> clears
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            Anyone can produce a caught list. Penny also shows the fraud-looking cases it proved
            innocent — receipts attached, $0 billed. Pick a duty to filter, pick a case to read the
            full investigation.
          </p>
        </div>

        <div className="home-reveal relative mt-12">
          <span className="absolute -top-3 left-6 z-10 -rotate-2 rounded-sm border border-[#9C3626]/60 bg-[#F3ECDA] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9C3626] shadow-lg">
            Exhibit A
          </span>

          <div className="overflow-hidden rounded-xl bg-[#F3ECDA] text-[#241F16] shadow-[0_40px_90px_-25px_rgba(0,0,0,0.85)] ring-1 ring-white/15">
            {/* Masthead */}
            <div className="border-b-[3px] border-[#241F16] px-5 pb-4 pt-5 md:px-8">
              <p className="font-display text-2xl font-bold text-[#1F4D3D] md:text-3xl">Penny</p>
              <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#5B5344]">
                Finance &amp; Controls · McContext — a day&apos;s cases, mapped to the bench rubric
              </p>
              <p className="mt-2 font-mono text-[10.5px] text-[#B8823A]">
                Click a duty tile to filter · click a case to see its full investigation trace
              </p>
            </div>

            {/* Duty filter strip */}
            <div className="grid grid-cols-3 gap-px border-b border-[#C9BE9F] bg-[#C9BE9F] sm:grid-cols-4 md:grid-cols-7">
              <DutyTile
                active={duty === "ALL"}
                onClick={() => setDuty("ALL")}
                name="All duties"
                count="6/6"
                sub="covered"
              />
              {DUTY_ORDER.map((d) => {
                const f = CASES.filter((c) => c.dutyShort === d && c.status === "flagged").length;
                const cl = CASES.filter((c) => c.dutyShort === d && c.status === "cleared").length;
                return (
                  <DutyTile
                    key={d}
                    active={duty === d}
                    onClick={() => setDuty(d)}
                    name={DUTY_LABELS[d]}
                    count={String(f + cl)}
                    sub={`${f}F · ${cl}C`}
                  />
                );
              })}
            </div>

            {/* Rubric scorecard */}
            <div className="grid grid-cols-2 gap-px border-b border-[#C9BE9F] bg-[#C9BE9F] sm:grid-cols-3 md:grid-cols-5">
              {SCORECARD.map(([dim, val, desc]) => (
                <div key={dim} className="bg-white px-3.5 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#B8823A]">
                    {dim}
                  </p>
                  <p className="mt-1 font-mono text-[15px] font-semibold text-[#241F16]">{val}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-[#5B5344]">{desc}</p>
                </div>
              ))}
            </div>

            {/* Case list + detail; the list stacks above the detail on narrow screens */}
            <div className="grid md:grid-cols-[300px_1fr]">
              <aside className="border-b border-[#C9BE9F] md:border-b-0 md:border-r">
                <p className="px-4 pb-2 pt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[#5B5344]">
                  {duty === "ALL" ? "All duties" : DUTY_LABELS[duty]} · {filtered.length}{" "}
                  {filtered.length === 1 ? "case" : "cases"}
                </p>
                <div>
                  {filtered.map((c) => {
                    const isSelected = selected?.id === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-start gap-2.5 border-b border-l-4 border-b-[#C9BE9F] px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-l-[#1F4D3D] bg-[#E7DEC6]"
                            : "border-l-transparent hover:bg-[#E7DEC6]"
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            c.status === "flagged" ? "bg-[#9C3626]" : "bg-[#2F6B3F]"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-[9.5px] uppercase tracking-wide text-[#5B5344]">
                            {DUTY_LABELS[c.dutyShort]}
                          </span>
                          <span className="font-display block text-sm font-semibold leading-snug">
                            {c.title}
                          </span>
                          <span className="block font-mono text-[11px] text-[#5B5344]">
                            {c.store}
                            {c.amount > 0 ? ` · ${fmtUSD(c.amount)}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {selected && <CaseDetail c={selected} />}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[#C9BE9F] px-5 py-3 font-mono text-[10.5px] text-[#5B5344] md:px-8">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#9C3626]" />
                Flagged — real leak, evidence attached
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2F6B3F]" />
                Correctly cleared — looked wrong, wasn&apos;t
              </span>
              <span>Illustrative demo batch — not a live bench score</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DutyTile({
  active,
  onClick,
  name,
  count,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  count: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2 py-3 text-center transition-colors ${
        active ? "bg-[#1F4D3D]" : "bg-[#F3ECDA] hover:bg-[#E7DEC6]"
      }`}
    >
      <span
        className={`flex h-7 items-center justify-center font-mono text-[9.5px] uppercase leading-tight tracking-wide ${
          active ? "text-[#F3ECDA]" : "text-[#5B5344]"
        }`}
      >
        {name}
      </span>
      <span
        className={`block font-display text-xl font-bold ${
          active ? "text-[#F3ECDA]" : "text-[#1F4D3D]"
        }`}
      >
        {count}
      </span>
      <span
        className={`block font-mono text-[9px] ${
          active ? "text-[#F3ECDA]/80" : "text-[#2F6B3F]"
        }`}
      >
        {sub}
      </span>
    </button>
  );
}

function CaseDetail({ c }: { c: PennyCase }) {
  return (
    <article className="relative min-w-0 px-5 pb-8 pt-6 md:px-8 md:pb-10">
      {/* Verdict stamp — keyed so it re-slams on every case change */}
      <div
        key={c.id}
        className={`stamp-in absolute right-5 top-6 rounded-md border-[3px] px-3.5 py-1.5 font-mono text-xs font-semibold tracking-[0.25em] mix-blend-multiply md:right-8 ${
          c.status === "flagged"
            ? "border-[#9C3626] text-[#9C3626]"
            : "border-[#2F6B3F] text-[#2F6B3F]"
        }`}
      >
        {c.status.toUpperCase()}
      </div>

      <header className="pr-24 md:pr-36">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#B8823A]">
          {DUTY_LABELS[c.dutyShort]}
        </p>
        <h3 className="font-display mt-1.5 max-w-[560px] text-xl font-bold leading-tight md:text-2xl">
          {c.title}
        </h3>
        <p className="mt-1 font-mono text-xs text-[#5B5344]">
          {c.store}
          {c.amount > 0 ? ` · ${fmtUSD(c.amount)} exposure` : ""}
        </p>
      </header>

      <SectionLabel chip="investigation · method · tool use">Investigation trace</SectionLabel>
      <ol className="max-w-[640px] overflow-hidden rounded border border-[#C9BE9F]">
        {c.trace.map(([kind, text], i) => (
          <li key={i} className="grid grid-cols-[26px_1fr] border-b border-[#C9BE9F] last:border-b-0">
            <span className="flex items-center justify-center bg-[#E7DEC6] font-mono text-[10.5px] text-[#5B5344]">
              {i + 1}
            </span>
            <span className="min-w-0 break-words px-3 py-2 font-mono text-xs leading-relaxed">
              <span
                className={`mr-2 inline-block rounded-full px-1.5 py-px font-mono text-[9px] uppercase tracking-wide ${KIND_STYLES[kind]}`}
              >
                {kind}
              </span>
              {text}
            </span>
          </li>
        ))}
      </ol>

      <SectionLabel>Evidence</SectionLabel>
      <dl className="max-w-[640px] overflow-hidden rounded border border-[#C9BE9F]">
        {c.evidence.map(([label, value]) => (
          <div
            key={label}
            className="grid border-b border-[#C9BE9F] last:border-b-0 sm:grid-cols-[170px_1fr]"
          >
            <dt className="bg-[#E7DEC6] px-3 py-2 font-mono text-[10.5px] text-[#5B5344] sm:border-r sm:border-[#C9BE9F]">
              {label}
            </dt>
            <dd className="min-w-0 break-words px-3 py-2 font-mono text-xs leading-relaxed">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <SectionLabel chip="communication">Explanation</SectionLabel>
      <Narrative text={c.narrative} />

      <SectionLabel chip="efficiency">Cost of this investigation</SectionLabel>
      <div className="flex max-w-[640px] flex-wrap gap-3">
        {(
          [
            [String(c.eff.calls), "Total steps"],
            [String(c.eff.tools), "Deterministic tools"],
            [`${c.eff.secs}s`, "Wall time"],
            [`$${c.eff.cost.toFixed(2)}`, "Est. model cost"],
          ] as const
        ).map(([n, l]) => (
          <div
            key={l}
            className="min-w-[104px] rounded border border-[#C9BE9F] bg-[#E7DEC6] px-3.5 py-2 text-center"
          >
            <p className="font-mono text-base font-semibold text-[#1F4D3D]">{n}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-[#5B5344]">
              {l}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SectionLabel({ children, chip }: { children: React.ReactNode; chip?: string }) {
  return (
    <p className="mb-2 mt-6 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.15em] text-[#1F4D3D]">
      {children}
      {chip && (
        <span className="rounded-full bg-[#B8823A] px-2 py-0.5 font-mono text-[9px] normal-case tracking-wide text-white">
          {chip}
        </span>
      )}
    </p>
  );
}

// Renders the verbatim narrative strings, honoring their <b> emphasis markers
// as real elements (no innerHTML).
function Narrative({ text }: { text: string }) {
  return (
    <p className="max-w-[600px] text-sm leading-relaxed">
      {text.split(/<\/?b>/).map((seg, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-semibold text-[#1F4D3D]">
            {seg}
          </b>
        ) : (
          <Fragment key={i}>{seg}</Fragment>
        ),
      )}
    </p>
  );
}
