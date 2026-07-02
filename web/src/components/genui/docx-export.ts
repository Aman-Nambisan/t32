import type { DocProps, DocSection } from "@/lib/types";
// Type-only (erased at compile time): the runtime module loads via dynamic
// import inside downloadDocx so `docx` stays out of the main chat bundle.
import type { Paragraph as DocxParagraph, Table as DocxTable } from "docx";

// ——— Defensive coercion, shared with DocArtifact ———
// The server sanitizes doc specs, but a malformed field must degrade to
// nothing — never crash the chat or the export. Helpers live in this leaf
// module so the renderer can import them without a cycle.

export function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

export function asLines(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asText).filter(Boolean) : [];
}

export function asKv(v: unknown): { k: string; v: string }[] {
  if (!Array.isArray(v)) return [];
  const out: { k: string; v: string }[] = [];
  for (const it of v) {
    if (!it || typeof it !== "object") continue;
    const rec = it as { k?: unknown; v?: unknown };
    const k = asText(rec.k);
    const val = asText(rec.v);
    if (k || val) out.push({ k, v: val });
  }
  return out;
}

const NUMERIC_RE = /^[\s($€£₹+-]*\d[\d,.\s%)]*$/;

export function isNumericCell(text: string): boolean {
  return NUMERIC_RE.test(text.trim());
}

export type DocCell = { text: string; numeric: boolean };
export type DocTableData = { columns: string[]; rows: DocCell[][] };

export function asTable(s: { columns?: unknown; rows?: unknown }): DocTableData | null {
  const columns = asLines(s.columns);
  if (columns.length === 0) return null;
  const rows: DocCell[][] = [];
  if (Array.isArray(s.rows)) {
    for (const r of s.rows) {
      if (!Array.isArray(r)) continue;
      rows.push(
        columns.map((_, i) => {
          const raw: unknown = r[i];
          const text =
            typeof raw === "number" && Number.isFinite(raw)
              ? raw.toLocaleString("en-US")
              : asText(raw);
          return { text, numeric: typeof raw === "number" || isNumericCell(text) };
        }),
      );
    }
  }
  return { columns, rows };
}

/** Runtime-junk kinds fall back to "letter" so both surfaces render something. */
export function kindOf(doc: DocProps): DocProps["kind"] {
  return doc.kind === "notice" || doc.kind === "memo" || doc.kind === "email"
    ? doc.kind
    : "letter";
}

function slugOf(doc: DocProps): string {
  const base = asText(doc.title) || asText(doc.subject) || kindOf(doc);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "document";
}

const INK = "1C1917";
const GRAY = "78716C";
const RED = "B91C1C";
const TABLE_BORDER = "D6D0C4";

/** Map a DocProps to a real Word file and trigger a browser download. Never throws. */
export async function downloadDocx(doc: DocProps): Promise<void> {
  try {
    const {
      AlignmentType,
      BorderStyle,
      Document,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = await import("docx");

    const kind = kindOf(doc);
    const body: (DocxParagraph | DocxTable)[] = [];

    const rule = (double: boolean) =>
      new Paragraph({
        spacing: { after: 240 },
        border: {
          bottom: { style: double ? BorderStyle.DOUBLE : BorderStyle.SINGLE, size: 6, color: INK },
        },
      });

    const classification = asText(doc.classification);
    if (kind !== "email" && classification) {
      body.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: classification.toUpperCase(),
              bold: true,
              color: RED,
              size: 20,
              characterSpacing: 40,
            }),
          ],
        }),
      );
    }

    const org = asText(doc.letterhead?.org);
    const orgSub = asText(doc.letterhead?.sub);
    if (kind !== "email" && org) {
      body.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: orgSub ? 30 : 60 },
          children: [
            new TextRun({ text: org, bold: true, allCaps: true, size: 30, characterSpacing: 30 }),
          ],
        }),
      );
      if (orgSub) {
        body.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: orgSub,
                allCaps: true,
                size: 16,
                color: GRAY,
                characterSpacing: 60,
              }),
            ],
          }),
        );
      }
      body.push(rule(true));
    }

    if (kind === "notice") {
      body.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 280 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: INK },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: INK },
          },
          children: [
            new TextRun({ text: "FORMAL NOTICE", bold: true, size: 20, characterSpacing: 90 }),
          ],
        }),
      );
    }

    const date = asText(doc.date);
    const to = asLines(doc.to);
    const from = asLines(doc.from);
    const subject = asText(doc.subject);

    if (kind === "memo") {
      body.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "MEMORANDUM", bold: true, size: 26, characterSpacing: 90 }),
          ],
        }),
      );
      const meta: [string, string][] = [
        ["TO", to.join(", ")],
        ["FROM", from.join(", ")],
        ["DATE", date],
        ["RE", subject],
      ];
      for (const [k, v] of meta) {
        if (!v) continue;
        body.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun({ text: v })],
          }),
        );
      }
      body.push(rule(false));
    } else if (kind === "email") {
      const meta: [string, string][] = [
        ["From", from.join(", ")],
        ["To", to.join(", ")],
        ["Subject", subject],
        ["Date", date],
      ];
      for (const [k, v] of meta) {
        if (!v) continue;
        body.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun({ text: v })],
          }),
        );
      }
      body.push(rule(false));
    } else {
      if (date) {
        body.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 240 },
            children: [new TextRun({ text: date })],
          }),
        );
      }
      to.forEach((line, i) => {
        body.push(
          new Paragraph({
            spacing: { after: i === to.length - 1 ? 240 : 20 },
            children: [new TextRun({ text: line, bold: i === 0 })],
          }),
        );
      });
      if (from.length > 0) {
        body.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: "FROM", bold: true, size: 16, color: GRAY, characterSpacing: 40 }),
            ],
          }),
        );
        from.forEach((line, i) => {
          body.push(
            new Paragraph({
              spacing: { after: i === from.length - 1 ? 240 : 20 },
              children: [new TextRun({ text: line })],
            }),
          );
        });
      }
      if (subject) {
        body.push(
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: `RE: ${subject}`, bold: true })],
          }),
        );
      }
    }

    const salutation = asText(doc.salutation);
    if (salutation) {
      body.push(
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: salutation })] }),
      );
    }

    const sections: DocSection[] = Array.isArray(doc.sections) ? doc.sections : [];
    let clauseN = 0; // clause numbering runs 1..N across the whole document
    for (const s of sections) {
      if (!s || typeof s !== "object") continue;
      switch (s.kind) {
        case "para": {
          const text = asText(s.text);
          if (text) {
            body.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 160 },
                children: [new TextRun({ text })],
              }),
            );
          }
          break;
        }
        case "heading": {
          const text = asText(s.text);
          if (text) {
            body.push(
              new Paragraph({
                spacing: { before: 160, after: 120 },
                children: [
                  new TextRun({ text, bold: true, smallCaps: true, characterSpacing: 30 }),
                ],
              }),
            );
          }
          break;
        }
        case "clauses": {
          for (const item of asLines(s.items)) {
            clauseN += 1;
            body.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120 },
                indent: { left: 360, hanging: 360 },
                children: [new TextRun({ text: `${clauseN}. ${item}` })],
              }),
            );
          }
          break;
        }
        case "bullets": {
          for (const item of asLines(s.items)) {
            body.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 60 },
                children: [new TextRun({ text: item })],
              }),
            );
          }
          break;
        }
        case "kv": {
          for (const { k, v } of asKv(s.items)) {
            body.push(
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: k ? `${k}: ` : "", bold: true }),
                  new TextRun({ text: v }),
                ],
              }),
            );
          }
          break;
        }
        case "table": {
          const t = asTable(s);
          if (!t) break;
          const edge = { style: BorderStyle.SINGLE, size: 4, color: TABLE_BORDER } as const;
          const header = new TableRow({
            tableHeader: true,
            children: t.columns.map(
              (c) =>
                new TableCell({
                  shading: { fill: "F3EEE3" },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: c, bold: true, size: 18, allCaps: true })],
                    }),
                  ],
                }),
            ),
          });
          const rows = t.rows.map(
            (r) =>
              new TableRow({
                children: r.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: cell.numeric ? AlignmentType.RIGHT : AlignmentType.LEFT,
                          children: [new TextRun({ text: cell.text, size: 20 })],
                        }),
                      ],
                    }),
                ),
              }),
          );
          body.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40, left: 100, right: 100 },
              borders: {
                top: edge,
                bottom: edge,
                left: edge,
                right: edge,
                insideHorizontal: edge,
                insideVertical: edge,
              },
              rows: [header, ...rows],
            }),
          );
          body.push(new Paragraph({ spacing: { after: 120 } })); // tables carry no spacing of their own
          break;
        }
        default:
          break;
      }
    }

    const closing = asText(doc.closing);
    const sigName = asText(doc.signature?.name);
    const sigTitle = asText(doc.signature?.title);
    const sigOrg = asText(doc.signature?.org);
    if (closing) {
      body.push(
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: closing })] }),
      );
    }
    if (sigName || sigTitle || sigOrg) {
      const gap = kind === "email" ? 1 : 3; // paper leaves room for a wet signature
      for (let i = 0; i < gap; i += 1) body.push(new Paragraph({}));
      if (sigName) {
        body.push(new Paragraph({ children: [new TextRun({ text: sigName, bold: true })] }));
      }
      if (sigTitle) {
        body.push(new Paragraph({ children: [new TextRun({ text: sigTitle, size: 20 })] }));
      }
      if (sigOrg) {
        body.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sigOrg,
                size: 18,
                color: GRAY,
                allCaps: true,
                characterSpacing: 30,
              }),
            ],
          }),
        );
      }
    }

    const file = new Document({
      title: asText(doc.title) || subject || undefined,
      subject: subject || undefined,
      creator: org || sigOrg || "Penny",
      styles: {
        default: {
          document: {
            run: { font: "Georgia", size: 22 }, // 11pt (docx sizes are half-points)
            paragraph: { spacing: { line: 276 } }, // 1.15 line spacing
          },
        },
      },
      sections: [
        {
          properties: {
            page: { margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" } },
          },
          children: body,
        },
      ],
    });

    const blob = await Packer.toBlob(file);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugOf(doc)}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); // let the download claim the blob first
  } catch (err) {
    console.error("[doc-artifact] docx export failed", err); // never crash the chat
  }
}
