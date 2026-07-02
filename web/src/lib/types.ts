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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  blocks?: Block[];
  trace?: string[];
  refs?: Ref[];
};
