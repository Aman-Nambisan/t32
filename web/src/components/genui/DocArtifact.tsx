"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DocProps, DocSection } from "@/lib/types";
import { asKv, asLines, asTable, asText, downloadDocx, kindOf } from "./docx-export";
import "./docartifact.css";

const KIND_LABEL: Record<DocProps["kind"], string> = {
  letter: "Letter",
  notice: "Formal notice",
  email: "Email",
  memo: "Memo",
};

/** Sections come server-sanitized, but junk must skip cleanly — never crash. */
function sectionsOf(doc: DocProps): DocSection[] {
  if (!Array.isArray(doc.sections)) return [];
  return doc.sections.filter(
    (s): s is DocSection =>
      !!s && typeof s === "object" && typeof (s as { kind?: unknown }).kind === "string",
  );
}

function Chip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/50 transition hover:border-white/40 hover:text-white disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PaperSection({ s }: { s: DocSection }): ReactNode {
  switch (s.kind) {
    case "para": {
      const text = asText(s.text);
      return text ? (
        <div className="doc-sec">
          <p className="hyphens-auto text-justify">{text}</p>
        </div>
      ) : null;
    }
    case "heading": {
      const text = asText(s.text);
      return text ? (
        <div className="doc-sec pt-1.5">
          <p className="doc-smallcaps font-display text-[0.95em] font-semibold tracking-[0.12em] text-stone-900">
            {text}
          </p>
        </div>
      ) : null;
    }
    case "clauses": {
      const items = asLines(s.items);
      return items.length > 0 ? (
        <ol className="doc-sec space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="doc-clause hyphens-auto">
              {item}
            </li>
          ))}
        </ol>
      ) : null;
    }
    case "bullets": {
      const items = asLines(s.items);
      return items.length > 0 ? (
        <ul className="doc-sec list-disc space-y-1 pl-5 marker:text-stone-500">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null;
    }
    case "kv": {
      const items = asKv(s.items);
      return items.length > 0 ? (
        <dl className="doc-sec grid grid-cols-[minmax(7.5rem,auto)_1fr] gap-x-4 gap-y-1.5">
          {items.map((it, i) => (
            <Fragment key={i}>
              <dt className="pt-[0.2em] text-[0.78em] uppercase tracking-[0.14em] text-stone-500">
                {it.k}
              </dt>
              <dd className="min-w-0 break-words text-stone-900">{it.v}</dd>
            </Fragment>
          ))}
        </dl>
      ) : null;
    }
    case "table": {
      const t = asTable(s);
      return t ? (
        <div className="doc-sec doc-scroll overflow-x-auto">
          <table className="w-full border-collapse text-[0.92em]">
            <thead>
              <tr>
                {t.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border border-[#D6D0C4] bg-[#F3EEE3] px-2 py-1 text-left text-[0.92em] font-bold uppercase tracking-[0.08em] text-stone-700"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-[#D6D0C4] px-2 py-1 align-top ${
                        cell.numeric ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {cell.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null;
    }
    default:
      return null;
  }
}

function EmailSection({ s }: { s: DocSection }): ReactNode {
  switch (s.kind) {
    case "para": {
      const text = asText(s.text);
      return text ? <p>{text}</p> : null;
    }
    case "heading": {
      const text = asText(s.text);
      return text ? <p className="font-semibold text-white/90">{text}</p> : null;
    }
    case "bullets": {
      const items = asLines(s.items);
      return items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 marker:text-white/30">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null;
    }
    case "clauses": {
      const items = asLines(s.items);
      return items.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-5 marker:text-white/40">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : null;
    }
    case "kv": {
      const items = asKv(s.items);
      return items.length > 0 ? (
        <div className="space-y-0.5">
          {items.map((it, i) => (
            <p key={i}>
              {it.k && <span className="text-white/45">{it.k}: </span>}
              {it.v}
            </p>
          ))}
        </div>
      ) : null;
    }
    case "table": {
      const t = asTable(s);
      return t ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {t.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border border-white/10 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-white/10 px-2 py-1 align-top ${
                        cell.numeric ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {cell.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null;
    }
    default:
      return null;
  }
}

/** Plaintext assembly (headers + body) for the email Copy button. */
function emailPlaintext(doc: DocProps): string {
  const out: string[] = [];
  const from = asLines(doc.from);
  const to = asLines(doc.to);
  const subject = asText(doc.subject);
  const date = asText(doc.date);
  if (from.length > 0) out.push(`From: ${from.join(", ")}`);
  if (to.length > 0) out.push(`To: ${to.join(", ")}`);
  if (subject) out.push(`Subject: ${subject}`);
  if (date) out.push(`Date: ${date}`);
  if (out.length > 0) out.push("");
  const salutation = asText(doc.salutation);
  if (salutation) out.push(salutation, "");
  let clauseN = 0;
  for (const s of sectionsOf(doc)) {
    switch (s.kind) {
      case "para": {
        const t = asText(s.text);
        if (t) out.push(t, "");
        break;
      }
      case "heading": {
        const t = asText(s.text);
        if (t) out.push(t.toUpperCase(), "");
        break;
      }
      case "bullets": {
        const items = asLines(s.items);
        if (items.length > 0) out.push(...items.map((x) => `- ${x}`), "");
        break;
      }
      case "clauses": {
        const items = asLines(s.items);
        if (items.length > 0) {
          out.push(
            ...items.map((x) => {
              clauseN += 1;
              return `${clauseN}. ${x}`;
            }),
            "",
          );
        }
        break;
      }
      case "kv": {
        const items = asKv(s.items);
        if (items.length > 0) out.push(...items.map((it) => (it.k ? `${it.k}: ${it.v}` : it.v)), "");
        break;
      }
      case "table": {
        const t = asTable(s);
        if (t) {
          out.push(
            t.columns.join(" | "),
            ...t.rows.map((r) => r.map((c) => c.text).join(" | ")),
            "",
          );
        }
        break;
      }
      default:
        break;
    }
  }
  const closing = asText(doc.closing);
  if (closing) out.push(closing);
  out.push(
    ...[asText(doc.signature?.name), asText(doc.signature?.title), asText(doc.signature?.org)].filter(
      Boolean,
    ),
  );
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function EmailCard({ doc, dark }: { doc: DocProps; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copyEmail = useCallback(() => {
    void navigator.clipboard
      .writeText(emailPlaintext(doc))
      .then(() => {
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1600);
      })
      .catch((err: unknown) => console.error("[doc-artifact] copy failed", err));
  }, [doc]);

  const to = asLines(doc.to);
  const from = asLines(doc.from);
  const subject = asText(doc.subject);
  const date = asText(doc.date);
  const salutation = asText(doc.salutation);
  const closing = asText(doc.closing);
  const sigName = asText(doc.signature?.name);
  const sigTitle = asText(doc.signature?.title);
  const sigOrg = asText(doc.signature?.org);
  const sections = sectionsOf(doc);
  const label = asText(doc.title) || KIND_LABEL.email;
  const meta = (
    [
      ["From", from.join(", ")],
      ["To", to.join(", ")],
      ["Subject", subject],
      ["Date", date],
    ] as [string, string][]
  ).filter(([, v]) => v !== "");

  return (
    <div className="w-full min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {label}
        </p>
        <Chip onClick={copyEmail}>{copied ? "Copied" : "Copy"}</Chip>
      </div>

      <div
        className={`w-full min-w-0 overflow-hidden rounded-xl border bg-black/40 ${
          dark ? "border-[#E5484D]/25" : "border-amber-300/20"
        }`}
      >
        {meta.length > 0 && (
          <dl className="grid grid-cols-[3.9rem_1fr] gap-x-3 gap-y-1 border-b border-white/10 px-4 py-3">
            {meta.map(([k, v]) => (
              <Fragment key={k}>
                <dt className="pt-[3px] text-[10px] uppercase tracking-wider text-white/35">{k}</dt>
                <dd
                  className={`min-w-0 break-words text-[12px] leading-5 ${
                    k === "Subject" ? "font-semibold text-white/95" : "text-white/75"
                  }`}
                >
                  {v}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}

        <div className="space-y-3 px-4 py-3.5 text-[13px] leading-relaxed text-white/80">
          {salutation && <p>{salutation}</p>}
          {sections.map((s, i) => (
            <EmailSection key={i} s={s} />
          ))}
          {(closing || sigName || sigTitle || sigOrg) && (
            <div>
              {closing && <p>{closing}</p>}
              {sigName && (
                <p className={`font-medium text-white/90 ${closing ? "mt-2" : ""}`}>{sigName}</p>
              )}
              {(sigTitle || sigOrg) && (
                <p className="text-[11px] text-white/50">
                  {[sigTitle, sigOrg].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocArtifact({ doc, dark }: { doc: DocProps; dark?: boolean }) {
  const uid = useId();
  const paperRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // If the artifact unmounts mid-print (chat rerender), unflag the body.
  useEffect(() => {
    return () => {
      if (document.body.getAttribute("data-print-doc") === uid) {
        document.body.removeAttribute("data-print-doc");
      }
    };
  }, [uid]);

  const printDoc = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    // Pair body ← uid → this paper imperatively; the print CSS keys on the
    // pair, so several doc artifacts in one chat never collide.
    document.body.setAttribute("data-print-doc", uid);
    paper.setAttribute("data-doc-printing", "");
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.body.removeAttribute("data-print-doc");
      paper.removeAttribute("data-doc-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    try {
      window.print();
    } finally {
      // afterprint is flaky cross-browser (Safari returns before the dialog
      // closes) — the timeout guarantees the flags come off.
      window.setTimeout(cleanup, 1500);
    }
  }, [uid]);

  const exportDocx = useCallback(() => {
    if (exporting) return;
    setExporting(true);
    void downloadDocx(doc).finally(() => setExporting(false));
  }, [doc, exporting]);

  const kind = kindOf(doc);
  if (kind === "email") return <EmailCard doc={doc} dark={dark} />;

  const isMemo = kind === "memo";
  const org = asText(doc.letterhead?.org);
  const orgSub = asText(doc.letterhead?.sub);
  const date = asText(doc.date);
  const to = asLines(doc.to);
  const from = asLines(doc.from);
  const subject = asText(doc.subject);
  const salutation = asText(doc.salutation);
  const closing = asText(doc.closing);
  const sigName = asText(doc.signature?.name);
  const sigTitle = asText(doc.signature?.title);
  const sigOrg = asText(doc.signature?.org);
  const classification = asText(doc.classification);
  const sections = sectionsOf(doc);
  const label = asText(doc.title) || KIND_LABEL[kind];
  const memoMeta = isMemo
    ? (
        [
          ["TO", to.join(", ")],
          ["FROM", from.join(", ")],
          ["DATE", date],
          ["RE", subject],
        ] as [string, string][]
      ).filter(([, v]) => v !== "")
    : [];

  return (
    <div className="w-full min-w-0">
      <div className="doc-noprint mb-1.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip onClick={printDoc}>PDF</Chip>
          <Chip onClick={exportDocx} disabled={exporting}>
            {exporting ? "…" : "DOCX"}
          </Chip>
        </div>
      </div>

      <div
        ref={paperRef}
        data-doc-uid={uid}
        className="doc-paper relative w-full min-w-0 rounded-[3px] bg-[#FBF7EF] p-6 text-[#1C1917] shadow-[0_18px_50px_rgba(0,0,0,0.5)] ring-1 ring-stone-950/20 sm:p-10"
      >
        {classification && (
          <div aria-hidden className="doc-stamp text-[0.85em] font-bold tracking-[0.22em]">
            {classification.toUpperCase()}
          </div>
        )}

        {org && (
          <header className="text-center">
            <p className="doc-smallcaps font-display text-[1.35em] font-bold tracking-[0.06em]">
              {org}
            </p>
            {orgSub && (
              <p className="mt-1 text-[0.78em] uppercase tracking-[0.3em] text-stone-500">
                {orgSub}
              </p>
            )}
            <div className="mt-3 border-t-2 border-stone-800">
              <div className="mt-[2px] border-t border-stone-800" />
            </div>
          </header>
        )}

        {kind === "notice" && (
          <div className={`border-y border-stone-500/60 py-1.5 text-center ${org ? "mt-4" : ""}`}>
            <p className="font-display text-[0.85em] font-semibold uppercase tracking-[0.35em] text-stone-800">
              Formal Notice
            </p>
          </div>
        )}

        {isMemo ? (
          <>
            <p
              className={`text-center font-display text-[1.2em] font-bold tracking-[0.3em] ${
                org ? "mt-5" : ""
              }`}
            >
              MEMORANDUM
            </p>
            {memoMeta.length > 0 && (
              <dl className="mt-4 grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-1">
                {memoMeta.map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="pt-[0.2em] text-[0.78em] tracking-[0.18em] text-stone-500">
                      {k}
                    </dt>
                    <dd className={k === "RE" ? "font-semibold" : ""}>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            )}
            <div className="mt-3 border-t border-stone-800" />
          </>
        ) : (
          <>
            {date && <p className="mt-6 text-right">{date}</p>}
            {to.length > 0 && (
              <div className={date ? "mt-5" : "mt-6"}>
                {to.map((line, i) => (
                  <p key={i} className={i === 0 ? "font-semibold" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            )}
            {from.length > 0 && (
              <div className="mt-4">
                <p className="text-[0.72em] uppercase tracking-[0.22em] text-stone-500">From</p>
                {from.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
            {subject && <p className="mt-5 font-semibold">RE: {subject}</p>}
          </>
        )}

        {salutation && <p className="mt-5">{salutation}</p>}

        {sections.length > 0 && (
          <div className="doc-sections mt-4 space-y-3.5">
            {sections.map((s, i) => (
              <PaperSection key={i} s={s} />
            ))}
          </div>
        )}

        {(closing || sigName || sigTitle || sigOrg) && (
          <div className="doc-sig mt-7">
            {closing && <p>{closing}</p>}
            {(sigName || sigTitle || sigOrg) && (
              <div className={closing ? "mt-2" : ""}>
                {/* gap for a wet signature; the italic flourish stands in for one */}
                {sigName ? (
                  <p className="pt-7 font-display text-[1.3em] italic leading-none text-stone-700/90">
                    {sigName}
                  </p>
                ) : (
                  <div className="h-10" />
                )}
                {sigName && <p className="mt-2.5 font-semibold">{sigName}</p>}
                {sigTitle && <p className="text-[0.85em] text-stone-600">{sigTitle}</p>}
                {sigOrg && (
                  <p className="mt-0.5 text-[0.78em] uppercase tracking-[0.18em] text-stone-500">
                    {sigOrg}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
