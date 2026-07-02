"use client";

import { useEffect, useState } from "react";
import { RESEARCHING_STEPS } from "@/lib/lines";
import type { Mode, Ref } from "@/lib/types";

// The provenance layer: a live "she is working" pulse while the request is
// in flight, then the model's declared investigation trail + hoverable
// source references on the landed reply. Same contract Penny's real
// run_sql trace plugs into later.

export function ResearchingBubble({ mode }: { mode: Mode }) {
  const steps = RESEARCHING_STEPS[mode];
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((prev) => prev + 1), 1500);
    return () => clearInterval(t);
  }, [steps]);

  // Derive the completed list from the tick count (pure — StrictMode-safe).
  const done = Array.from({ length: Math.min(i, 3) }, (_, k) => steps[(i - 1 - k) % steps.length]).reverse();

  const accent = mode === "boardroom" ? "text-red-300/80" : "text-amber-200/80";
  const border = mode === "boardroom" ? "border-red-500/30 bg-red-950/25" : "border-pink-400/25 bg-white/5";

  return (
    <div className={`w-fit max-w-[85%] rounded-2xl rounded-bl-sm border px-3.5 py-2.5 ${border}`}>
      <p className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] ${accent}`}>
        <span className="research-orb" aria-hidden />
        Investigating
      </p>
      <div className="mt-1.5 space-y-0.5">
        {done.map((s, k) => (
          <p key={`${s}-${k}`} className="trace-step-in font-mono text-[10.5px] leading-4 text-white/35">
            <span className="mr-1 text-emerald-400/70">✓</span>
            {s}
          </p>
        ))}
        <p className="shimmer-text font-mono text-[10.5px] leading-4">{steps[i % steps.length]}</p>
      </div>
    </div>
  );
}

export function TraceTrail({ trace, dark }: { trace: string[]; dark: boolean }) {
  return (
    <div
      className={`mb-2 border-b pb-2 ${dark ? "border-red-500/15" : "border-white/10"}`}
    >
      <p
        className={`text-[9px] font-medium uppercase tracking-[0.2em] ${dark ? "text-red-300/60" : "text-amber-200/60"}`}
      >
        Investigation trail
      </p>
      <div className="mt-1 space-y-0.5">
        {trace.map((step, i) => (
          <p
            key={i}
            className="trace-step-in font-mono text-[10.5px] leading-4 text-white/45"
            style={{ animationDelay: `${0.15 + i * 0.35}s` }}
          >
            <span className="mr-1 text-emerald-400/80">✓</span>
            {step}
          </p>
        ))}
      </div>
    </div>
  );
}

export function RefChips({ refs, dark }: { refs: Ref[]; dark: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {refs.map((r) => (
        <span key={r.n} className="group relative">
          <span
            className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] transition ${
              dark
                ? "border-red-500/30 bg-red-950/40 text-red-200/70 hover:border-red-300/70 hover:text-red-100"
                : "border-amber-300/25 bg-amber-950/30 text-amber-100/70 hover:border-amber-200/70 hover:text-amber-50"
            }`}
          >
            <span className="font-mono">[{r.n}]</span>
            <span className="max-w-36 truncate">{r.source}</span>
          </span>
          {/* Hover tooltip: where the number comes from. Centered on the chip
              (an edge-anchored 16rem card would overflow the scroll container
              and manufacture a horizontal scrollbar). */}
          <span
            className={`pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-1.5 w-56 -translate-x-1/2 rounded-xl border p-2.5 text-left opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:-translate-y-0.5 group-hover:opacity-100 ${
              dark ? "border-red-400/40 bg-[#1C0A10]/95 shadow-red-950/60" : "border-amber-300/40 bg-[#141410]/95 shadow-black/60"
            }`}
          >
            <span
              className={`block text-[9px] font-semibold uppercase tracking-[0.15em] ${dark ? "text-red-300" : "text-amber-200"}`}
            >
              {r.source}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-white/75">{r.detail}</span>
            <span className="mt-1.5 block text-[8.5px] uppercase tracking-widest text-white/30">
              simulated CFO data room · live MCP post-demo
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
