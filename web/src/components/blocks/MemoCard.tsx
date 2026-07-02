"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { titleCls } from "./theme";

type MemoCardProps = { title: string; subject?: string; body: string[]; classification?: string };

export default function MemoCard({ title, subject, body, classification }: MemoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const paragraphs = expanded ? body : body.slice(0, 1);
  const stamp = (classification || "CONFIDENTIAL").toUpperCase();

  function printMemo() {
    const paper = paperRef.current;
    if (!paper) return;
    flushSync(() => setExpanded(true)); // print the full memo, not the collapsed view
    paper.classList.add("blk-memo-print");
    document.body.classList.add("blk-printing");
    const cleanup = () => {
      document.body.classList.remove("blk-printing");
      paper.classList.remove("blk-memo-print");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    try {
      window.print();
    } finally {
      cleanup();
    }
  }

  return (
    <div className="w-full min-w-0">
      <p className={titleCls}>{title}</p>
      <div
        ref={paperRef}
        className="relative w-full overflow-hidden rounded-lg border border-stone-400/40 bg-[#F6EFDF] p-3 text-stone-900 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      >
        <div className="text-center">
          <p className="font-display text-[11px] font-bold tracking-[0.14em] text-stone-900">
            MINISTRY OF NO NONSENSE
          </p>
          <p className="mt-0.5 text-[7.5px] tracking-[0.32em] text-stone-500">McCONTEXT INTERNAL</p>
        </div>
        <div className="mt-2 border-t-2 border-stone-800">
          <div className="mt-[2px] border-t border-stone-800" />
        </div>

        <dl className="mt-2 grid grid-cols-[52px_1fr] gap-y-0.5 text-[10px] leading-4">
          <dt className="tracking-wider text-stone-500">TO</dt>
          <dd className="text-stone-800">The Boardroom (CXO clearance)</dd>
          <dt className="tracking-wider text-stone-500">FROM</dt>
          <dd className="text-stone-800">Smt. Narmata Tai, Controller-General</dd>
          <dt className="tracking-wider text-stone-500">SUBJECT</dt>
          <dd className="font-display font-semibold text-stone-900">{subject ?? title}</dd>
        </dl>
        <div className="my-2 border-t border-stone-300" />

        <div className="space-y-1.5 pr-2 font-display text-[11px] leading-relaxed text-stone-800">
          {paragraphs.map((p, i) =>
            p.startsWith("• ") ? (
              <p key={i} className="flex gap-1.5 pl-1">
                <span className="text-stone-500">•</span>
                <span>{p.slice(2)}</span>
              </p>
            ) : (
              <p key={i}>{p}</p>
            ),
          )}
          {!expanded && body.length > 1 && <p className="tracking-widest text-stone-400">···</p>}
        </div>

        {expanded && (
          <div className="mt-3 text-right">
            <p className="font-display text-[13px] italic text-stone-800">— Narmata Tai</p>
            <p className="text-[8px] uppercase tracking-wider text-stone-500">
              Controller-General · Ministry of No Nonsense
            </p>
          </div>
        )}

        <div
          aria-hidden
          className="blk-stamp pointer-events-none absolute right-2 top-10 border-4 border-double border-red-700/70 px-2 py-0.5 mix-blend-multiply"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-700/80">
            {stamp}
          </span>
        </div>

        <div className="blk-noprint mt-2.5 flex items-center gap-2 border-t border-stone-300 pt-2">
          {body.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded-full border border-stone-400 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-stone-600 transition hover:bg-stone-800/5"
            >
              {expanded ? "Collapse memo" : "Read full memo"}
            </button>
          )}
          <button
            type="button"
            onClick={printMemo}
            className="rounded-full border border-stone-400 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-stone-600 transition hover:bg-stone-800/5"
          >
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
