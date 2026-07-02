import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { NIRMALA_SYSTEM, NARMATA_DARK_SYSTEM } from "@/lib/persona";
import { randomFallback } from "@/lib/lines";
import {
  UI_LIMITS,
  type ChatMessage,
  type DocProps,
  type DocSection,
  type Emotion,
  type Lang,
  type Mode,
  type Ref,
  type UiElement,
  type UiSpec,
} from "@/lib/types";

// Vercel AI SDK provider: swap this for the deployed CMA agent later by
// pointing at a custom provider — the route contract stays the same.
const anthropic = createAnthropic({});

// Cheapest model that clears the bar, per team cost rules (../models.yaml).
// Boardroom can be bumped independently (e.g. opus-4-8) via env.
const MODEL = process.env.NIRMALA_MODEL ?? "claude-sonnet-4-6";
const DARK_MODEL = process.env.NIRMALA_DARK_MODEL ?? MODEL;
const MAX_HISTORY = 12;
const MAX_MSG_CHARS = 600;

// ————— Envelope schema —————
// Machine-enforced: the decoder cannot emit a turn without a reply or with an
// off-enum emotion, so the 3D stage always has a valid signal. The ui canvas
// decodes loosely (flat map of {type, children, ...props}) and gets its real
// validation in the catalog walk below.
const EnvelopeZ = z.object({
  reply: z.string().describe("The spoken reply — 2 to 4 short sentences, plain text."),
  emotion: z.enum(["neutral", "angry", "baton", "tax"]),
  // The canvas rides as a JSON string: Anthropic structured outputs are
  // grammar-constrained and reject type-less/record-heavy nodes, so the
  // envelope stays strict while the canvas stays free — sanitizeUi (which
  // parses the string) is the real gate.
  ui: z
    .string()
    .optional()
    .describe(
      'Optional UI canvas as ONE minified JSON string per the UI CANVAS spec, e.g. "{\\"root\\":\\"main\\",\\"elements\\":{...}}". Omit entirely when not needed.',
    ),
  trace: z.array(z.string()).max(6).optional(),
  refs: z.array(z.object({ source: z.string(), detail: z.string() })).max(6).optional(),
});

// ————— Sanitizers —————
// Never trust model-shaped data on the way to the renderer: whitelist types,
// clamp counts and lengths, coerce numbers, drop anything malformed. A dropped
// element beats a broken UI.

const str = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);
const optStr = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const num = (v: unknown): number => Number(v);

function sanitizeTrace(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw.slice(0, 4).map((s) => str(s, 80)).filter(Boolean);
  return steps.length ? steps : undefined;
}

function sanitizeRefs(raw: unknown): Ref[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const refs = raw
    .slice(0, 4)
    .map((r: { source?: unknown; detail?: unknown }, i: number) => ({
      n: i + 1,
      // Context shows sources as [bracketed] names; models sometimes echo the
      // brackets — strip them for clean chips.
      source: str(r?.source, 60).replace(/^\[+|\]+$/g, ""),
      detail: str(r?.detail, 240),
    }))
    .filter((r) => r.source && r.detail);
  return refs.length ? refs : undefined;
}

function chartData(v: unknown): { label: string; value: number }[] {
  return Array.isArray(v)
    ? v
        .slice(0, 8)
        .map((p: { label?: unknown; value?: unknown }) => ({ label: str(p?.label, 24), value: num(p?.value) }))
        .filter((p) => p.label && Number.isFinite(p.value))
    : [];
}

function sanitizeDoc(el: Record<string, unknown>): (UiElement & { type: "doc" }) | null {
  const kinds = ["letter", "notice", "email", "memo"] as const;
  const kind = kinds.includes(el.kind as (typeof kinds)[number])
    ? (el.kind as DocProps["kind"])
    : null;
  if (!kind) return null;
  const rawSections = Array.isArray(el.sections) ? el.sections.slice(0, UI_LIMITS.maxSections) : [];
  const sections: DocSection[] = [];
  for (const s of rawSections as Record<string, unknown>[]) {
    if (!s || typeof s !== "object") continue;
    if (s.kind === "para" || s.kind === "heading") {
      const text = str(s.text, s.kind === "para" ? 900 : 120);
      if (text) sections.push({ kind: s.kind, text });
    } else if (s.kind === "clauses" || s.kind === "bullets") {
      const items = Array.isArray(s.items)
        ? s.items.slice(0, 12).map((i) => str(i, s.kind === "clauses" ? 500 : 300)).filter(Boolean)
        : [];
      if (items.length) sections.push({ kind: s.kind, items });
    } else if (s.kind === "kv") {
      const items = Array.isArray(s.items)
        ? s.items
            .slice(0, 10)
            .map((i: { k?: unknown; v?: unknown }) => ({ k: str(i?.k, 40), v: str(i?.v, 120) }))
            .filter((i) => i.k && i.v)
        : [];
      if (items.length) sections.push({ kind: "kv", items });
    } else if (s.kind === "table") {
      const columns = Array.isArray(s.columns)
        ? s.columns.slice(0, 6).map((c) => str(c, 24)).filter(Boolean)
        : [];
      const rows = Array.isArray(s.rows)
        ? s.rows
            .slice(0, 14)
            .filter(Array.isArray)
            .map((r: unknown[]) =>
              r.slice(0, columns.length).map((c) => (typeof c === "number" && Number.isFinite(c) ? c : str(c, 40))),
            )
        : [];
      if (columns.length && rows.length) sections.push({ kind: "table", columns, rows });
    }
  }
  if (!sections.length) return null;
  const lh = el.letterhead as { org?: unknown; sub?: unknown } | undefined;
  const sig = el.signature as { name?: unknown; title?: unknown; org?: unknown } | undefined;
  const lines = (v: unknown): string[] | undefined => {
    const out = Array.isArray(v) ? v.slice(0, 6).map((l) => str(l, 80)).filter(Boolean) : [];
    return out.length ? out : undefined;
  };
  return {
    type: "doc",
    kind,
    title: optStr(el.title, 80),
    letterhead: lh && optStr(lh.org, 60) ? { org: str(lh.org, 60), sub: optStr(lh.sub, 80) } : undefined,
    date: optStr(el.date, 40),
    to: lines(el.to),
    from: lines(el.from),
    subject: optStr(el.subject, 160),
    salutation: optStr(el.salutation, 80),
    sections,
    closing: optStr(el.closing, 40),
    signature: sig && optStr(sig.name, 60) ? { name: str(sig.name, 60), title: optStr(sig.title, 60), org: optStr(sig.org, 60) } : undefined,
    classification: optStr(el.classification, 32),
  };
}

const CONTAINERS = new Set(["row", "col", "grid", "card"]);

// Per-type clamp. Containers return with empty children — the walker fills
// them and drops containers that end up childless.
function cleanElement(el: Record<string, unknown>): UiElement | null {
  const t = el.type;
  switch (t) {
    case "row":
    case "col": {
      const gap = Number.isFinite(num(el.gap)) ? Math.min(6, Math.max(1, Math.round(num(el.gap)))) : undefined;
      return { type: t, gap, children: [] };
    }
    case "grid": {
      const cols = Number.isFinite(num(el.cols)) ? Math.min(4, Math.max(1, Math.round(num(el.cols)))) : 2;
      return { type: "grid", cols, children: [] };
    }
    case "card": {
      const accents = ["default", "good", "bad", "warn"] as const;
      const accent = accents.includes(el.accent as (typeof accents)[number])
        ? (el.accent as "default" | "good" | "bad" | "warn")
        : undefined;
      return { type: "card", title: optStr(el.title, 80), accent, children: [] };
    }
    case "callout": {
      const tones = ["info", "success", "warning", "danger"] as const;
      const tone = tones.includes(el.tone as (typeof tones)[number])
        ? (el.tone as "info" | "success" | "warning" | "danger")
        : "info";
      const body = str(el.body, 400);
      return body ? { type: "callout", tone, title: optStr(el.title, 80), body } : null;
    }
    case "stat": {
      const label = str(el.label, 32);
      const value = str(el.value, 24);
      if (!label || !value) return null;
      const spark = Array.isArray(el.spark)
        ? el.spark.slice(0, UI_LIMITS.maxSpark).map(num).filter(Number.isFinite)
        : undefined;
      return {
        type: "stat",
        label,
        value,
        delta: optStr(el.delta, 24),
        good: typeof el.good === "boolean" ? el.good : undefined,
        spark: spark && spark.length >= 2 ? spark : undefined,
      };
    }
    case "table": {
      const columns = Array.isArray(el.columns)
        ? el.columns.slice(0, UI_LIMITS.maxTableCols).map((c) => str(c, 24)).filter(Boolean)
        : [];
      const rows = Array.isArray(el.rows)
        ? el.rows
            .slice(0, UI_LIMITS.maxTableRows)
            .filter(Array.isArray)
            .map((r: unknown[]) =>
              r.slice(0, columns.length).map((c) => (typeof c === "number" && Number.isFinite(c) ? c : str(c, 40))),
            )
        : [];
      if (!columns.length || !rows.length) return null;
      const highlight = Array.isArray(el.highlight)
        ? el.highlight.map(num).filter((i) => Number.isInteger(i) && i >= 0 && i < rows.length).slice(0, rows.length)
        : undefined;
      return { type: "table", title: optStr(el.title, 80), columns, rows, highlight };
    }
    case "timeline": {
      const statuses = ["done", "flag", "clear"] as const;
      const items = Array.isArray(el.items)
        ? el.items
            .slice(0, 10)
            .map((i: { label?: unknown; detail?: unknown; status?: unknown }) => ({
              label: str(i?.label, 80),
              detail: optStr(i?.detail, 160),
              status: statuses.includes(i?.status as (typeof statuses)[number])
                ? (i?.status as "done" | "flag" | "clear")
                : undefined,
            }))
            .filter((i) => i.label)
        : [];
      return items.length ? { type: "timeline", title: optStr(el.title, 80), items } : null;
    }
    case "progress": {
      const label = str(el.label, 48);
      const pct = num(el.pct);
      if (!label || !Number.isFinite(pct)) return null;
      return { type: "progress", label, pct: Math.min(100, Math.max(0, pct)), detail: optStr(el.detail, 120) };
    }
    case "bar":
    case "line":
    case "donut":
    case "coins3d": {
      const title = str(el.title, 80);
      const data = chartData(el.data);
      return title && data.length >= 2 ? { type: t, title, unit: optStr(el.unit, 8), data } : null;
    }
    case "stats": {
      const items = Array.isArray(el.items)
        ? el.items
            .slice(0, 6)
            .map((i: { label?: unknown; value?: unknown; delta?: unknown; good?: unknown }) => ({
              label: str(i?.label, 32),
              value: str(i?.value, 20),
              delta: optStr(i?.delta, 24),
              good: typeof i?.good === "boolean" ? i.good : undefined,
            }))
            .filter((i) => i.label && i.value)
        : [];
      return items.length ? { type: "stats", title: optStr(el.title, 80), items } : null;
    }
    case "doc":
      return sanitizeDoc(el);
    default:
      return null;
  }
}

function sanitizeUi(raw: unknown): UiSpec | undefined {
  // Models under strict tool grammars sometimes emit the canvas as a
  // JSON-encoded string — meet them halfway before validating.
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!raw || typeof raw !== "object") return undefined;
  const root = (raw as { root?: unknown }).root;
  const src = (raw as { elements?: unknown }).elements;
  if (typeof root !== "string" || !src || typeof src !== "object") return undefined;
  const elements = src as Record<string, Record<string, unknown>>;
  const out: Record<string, UiElement> = {};
  let count = 0;

  const visit = (id: string, depth: number, path: Set<string>): boolean => {
    if (out[id]) return true; // shared node already validated
    if (depth > UI_LIMITS.maxDepth || count >= UI_LIMITS.maxElements || path.has(id)) return false;
    const el = elements[id];
    if (!el || typeof el !== "object") return false;
    const cleaned = cleanElement(el);
    if (!cleaned) return false;
    if (CONTAINERS.has(cleaned.type)) {
      const branch = new Set(path).add(id);
      const kids = (Array.isArray(el.children) ? el.children : [])
        .slice(0, UI_LIMITS.maxChildren)
        .map(String)
        .filter((cid) => visit(cid, depth + 1, branch));
      if (!kids.length) return false; // childless container is noise
      (cleaned as { children: string[] }).children = kids;
    }
    out[id] = cleaned;
    count++;
    return true;
  };

  if (!visit(root, 1, new Set())) return undefined;
  return { root, elements: out };
}

// Hard-coded triggers as a safety net when the model says neutral.
function keywordEmotion(userText: string, mode: Mode): Emotion {
  if (/scam|bribe|kickback|fake invoice|launder|off the books|bypass|override the|no questions asked|just approve|cook the books|hide (it|income|revenue)/i.test(userText)) return "angry";
  if (/i('ll| will) sue\b|suing (you|us)|take (you|us) to court|lawsuit against (you|us)|i'll report you/i.test(userText)) return "baton";
  if (mode === "public") {
    if (/fund(ing|raise)|raise (a |our )?round|investor|valuation|series [abc]\b|venture capital|we raised|crores?|windfall|jackpot/i.test(userText)) return "tax";
  } else {
    if (/sav(e|ings)|rebate|credit|deduct|write.?off|loophole|cut (the |our )?(cost|bill|spend)/i.test(userText)) return "tax";
  }
  return "neutral";
}

// Salvage a usable turn from raw text when structured decoding fails.
function salvage(text: string): { reply: string; emotion: Emotion; ui?: UiSpec; trace?: string[]; refs?: Ref[] } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) return null;
    const emotions: Emotion[] = ["neutral", "angry", "baton", "tax"];
    return {
      reply: parsed.reply.trim(),
      emotion: emotions.includes(parsed.emotion) ? parsed.emotion : "neutral",
      ui: sanitizeUi(parsed.ui),
      trace: sanitizeTrace(parsed.trace),
      refs: sanitizeRefs(parsed.refs),
    };
  } catch {
    return null;
  }
}

// Language directives: the toggle flips words AND money convention.
const ENGLISH_ONLY = `

LANGUAGE OVERRIDE: Reply in clear English ONLY. Do not use any Hindi or Hinglish words (no beta, arre, theek hai, bas, nahin, bilkul, saab). Same personality, same rules — just fully English. Money stays in US convention: dollars, millions/billions ($14.2M), ui elements use unit "$M".`;

const HINGLISH_MONEY = `

MONEY CONVENTION: You are speaking to an Indian audience — express ALL money in Indian convention: rupees with lakh/crore, converting the USD context at ₹84 per dollar and rounding to clean figures ($14.2M ≈ ₹119 crore, $1.8M ≈ ₹15 crore, $412K ≈ ₹3.5 crore, $55M ≈ ₹460 crore, $3.1B ≈ ₹26,000 crore). In the spoken reply write amounts in words ("119 crore rupees"). In ui elements use unit "₹ Cr" with values in crores (119, not 1190000000); for lakh-scale use unit "₹ L". In refs' detail give the rupee figure with the USD original in parentheses. EXCEPTION: formal documents (doc elements — letters, notices, emails to US parties) keep native USD figures. Stay consistent within a conversation.`;

export async function POST(request: Request) {
  let history: ChatMessage[];
  let mode: Mode = "public";
  let lang: Lang = "hinglish";
  try {
    const body = await request.json();
    mode = body.mode === "boardroom" ? "boardroom" : "public";
    lang = body.lang === "english" ? "english" : "hinglish";
    history = (body.messages as ChatMessage[])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .slice(-MAX_HISTORY)
      // Strip ui/blocks from history — the model only needs the transcript text.
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return Response.json({ error: "last message must be from user" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const lastUserText = history[history.length - 1].content;
  const dark = mode === "boardroom";
  const system =
    (dark ? NARMATA_DARK_SYSTEM : NIRMALA_SYSTEM) + (lang === "english" ? ENGLISH_ONLY : HINGLISH_MONEY);
  const model = anthropic(dark ? DARK_MODEL : MODEL);
  // Document/dashboard turns need room; sonnet is cheap enough at this size.
  const maxOutputTokens = dark ? 2600 : 2200;

  try {
    let reply = "";
    let emotion: Emotion = "neutral";
    let ui: UiSpec | undefined;
    let trace: string[] | undefined;
    let refs: Ref[] | undefined;

    try {
      const { object } = await generateObject({ model, system, messages: history, schema: EnvelopeZ, maxOutputTokens });
      reply = object.reply.trim();
      emotion = object.emotion;
      ui = sanitizeUi(object.ui);
      trace = sanitizeTrace(object.trace);
      refs = sanitizeRefs(object.refs);
    } catch (err) {
      // Structured decode failed — salvage the raw text if the SDK surfaced it.
      const text = (err as { text?: string })?.text;
      const saved = typeof text === "string" ? salvage(text) : null;
      if (!saved) throw err;
      ({ reply, emotion } = saved);
      ui = saved.ui;
      trace = saved.trace;
      refs = saved.refs;
    }

    const finalEmotion = emotion === "neutral" ? keywordEmotion(lastUserText, mode) : emotion;
    return Response.json({
      reply: reply || randomFallback(),
      emotion: finalEmotion,
      ui,
      trace,
      refs,
      fallback: !reply,
    });
  } catch (error) {
    // Demo resilience: never surface a broken turn — Tai always has a line.
    console.error("chat route error:", error);
    return Response.json({ reply: randomFallback(), emotion: "neutral", fallback: true });
  }
}
