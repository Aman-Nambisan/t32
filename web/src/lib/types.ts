export type Mood = "idle" | "thinking" | "speaking";

export type Emotion = "neutral" | "angry" | "baton" | "tax";

export const EMOTIONS: Emotion[] = ["neutral", "angry", "baton", "tax"];

// Public Narmata vs the CXO-clearance boardroom. Mode gates persona, theme,
// voice register and which context the model is allowed to see (the pitch:
// governance — some context exists only for some people).
export type Mode = "public" | "boardroom";

// Hinglish (default flavor) vs plain-English replies + matching TTS voice.
export type Lang = "hinglish" | "english";

export type ChartPoint = { label: string; value: number };

// Rich in-chat artifacts the model may emit alongside its reply (boardroom
// only). Rendered by components/blocks/Blocks.tsx.
export type Block =
  | { type: "bar" | "line" | "donut"; title: string; unit?: string; data: ChartPoint[] }
  | {
      type: "stats";
      title?: string;
      items: { label: string; value: string; delta?: string; good?: boolean }[];
    }
  | { type: "memo"; title: string; subject?: string; body: string[]; classification?: string }
  | { type: "coins3d"; title: string; unit?: string; data: ChartPoint[] };

export const BLOCK_TYPES = ["bar", "line", "donut", "stats", "memo", "coins3d"] as const;

// Provenance layer: the investigation steps the model declares it took, and
// hoverable references naming the source behind each number. Same contract
// the real Penny agent's run_sql trace will feed later.
export type Ref = { n: number; source: string; detail: string };

// ————— Generative UI canvas (v2) —————
// The model composes a UI from a CATALOG of primitives as a FLAT element map
// (json-render/A2UI shape): every element is independently parseable, missing
// children are simply "not arrived yet", and the decode schema stays
// non-recursive. The envelope (reply/emotion/trace/refs) is machine-enforced;
// the canvas is free-form but catalog-validated server-side before render.

export type DocSection =
  | { kind: "para"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "clauses"; items: string[] } // numbered legal/contract clauses
  | { kind: "bullets"; items: string[] }
  | { kind: "kv"; items: { k: string; v: string }[] } // Re: / Amount: rows
  | { kind: "table"; columns: string[]; rows: (string | number)[][] };

// A formal document artifact rendered as a paper page (letter/notice/email/
// memo) with real exports (.docx / print-to-PDF). The model supplies the
// anatomy; the renderer owns all typography.
export type DocProps = {
  kind: "letter" | "notice" | "email" | "memo";
  title?: string; // chat-facing label, e.g. "Formal demand notice"
  letterhead?: { org: string; sub?: string };
  date?: string;
  to?: string[]; // recipient block, one line per entry
  from?: string[];
  subject?: string;
  salutation?: string;
  sections: DocSection[];
  closing?: string; // "Sincerely,"
  signature?: { name: string; title?: string; org?: string };
  classification?: string; // e.g. CONFIDENTIAL — draws the stamp
};

// One element in the flat map. Props are inline (one less nesting level for
// the model to get wrong); `children` are ids into UiSpec.elements.
export type UiElement =
  // layout
  | { type: "row"; gap?: number; children: string[] }
  | { type: "col"; gap?: number; children: string[] }
  | { type: "grid"; cols?: number; children: string[] }
  | { type: "card"; title?: string; accent?: "default" | "good" | "bad" | "warn"; children: string[] }
  // atoms
  | { type: "callout"; tone: "info" | "success" | "warning" | "danger"; title?: string; body: string }
  | { type: "stat"; label: string; value: string; delta?: string; good?: boolean; spark?: number[] }
  | { type: "table"; title?: string; columns: string[]; rows: (string | number)[][]; highlight?: number[] }
  | { type: "timeline"; title?: string; items: { label: string; detail?: string; status?: "done" | "flag" | "clear" }[] }
  | { type: "progress"; label: string; pct: number; detail?: string }
  // documents
  | ({ type: "doc" } & DocProps)
  // charts (same props as legacy blocks — rendered by the existing suite)
  | { type: "bar" | "line" | "donut" | "coins3d"; title: string; unit?: string; data: ChartPoint[] }
  | { type: "stats"; title?: string; items: { label: string; value: string; delta?: string; good?: boolean }[] };

export type UiSpec = {
  root: string;
  elements: Record<string, UiElement>;
};

export const UI_TYPES = [
  "row", "col", "grid", "card",
  "callout", "stat", "table", "timeline", "progress",
  "doc",
  "bar", "line", "donut", "coins3d", "stats",
] as const;

// Shared clamps — the route sanitizer enforces them, the renderer assumes them.
export const UI_LIMITS = {
  maxElements: 80,
  maxDepth: 6,
  maxChildren: 12,
  maxTableRows: 30,
  maxTableCols: 8,
  maxSections: 14,
  maxSpark: 24,
} as const;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  blocks?: Block[]; // legacy path — older messages / fallback
  ui?: UiSpec;
  trace?: string[];
  refs?: Ref[];
};
