import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { NIRMALA_SYSTEM, NARMATA_DARK_SYSTEM } from "@/lib/persona";
import { randomFallback } from "@/lib/lines";
import {
  BLOCK_TYPES,
  EMOTIONS,
  type Block,
  type ChatMessage,
  type Emotion,
  type Lang,
  type Mode,
  type Ref,
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

type Parsed = {
  reply: string;
  emotion: Emotion;
  blocks?: Block[];
  trace?: string[];
  refs?: Ref[];
};

function parseModelJson(raw: string): Parsed {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.reply === "string" && parsed.reply.trim()) {
        const emotion = EMOTIONS.includes(parsed.emotion) ? parsed.emotion : "neutral";
        return {
          reply: parsed.reply.trim(),
          emotion,
          blocks: sanitizeBlocks(parsed.blocks),
          trace: sanitizeTrace(parsed.trace),
          refs: sanitizeRefs(parsed.refs),
        };
      }
    }
  } catch {
    // fall through — treat raw text as the reply
  }
  return { reply: raw.trim(), emotion: "neutral" };
}

function sanitizeTrace(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .slice(0, 4)
    .map((s) => String(s ?? "").trim().slice(0, 80))
    .filter(Boolean);
  return steps.length ? steps : undefined;
}

function sanitizeRefs(raw: unknown): Ref[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const refs = raw
    .slice(0, 4)
    .map((r: { source?: unknown; detail?: unknown }, i: number) => ({
      n: i + 1,
      // The fact sheet shows sources as [bracketed] names; models sometimes
      // echo the brackets — strip them for clean chips.
      source: String(r?.source ?? "").trim().replace(/^\[+|\]+$/g, "").slice(0, 60),
      detail: String(r?.detail ?? "").trim().slice(0, 240),
    }))
    .filter((r) => r.source && r.detail);
  return refs.length ? refs : undefined;
}

// Never trust model-shaped data on the way to the renderer: clamp counts,
// coerce numbers, drop anything malformed. A dropped block beats a broken UI.
function sanitizeBlocks(raw: unknown): Block[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Block[] = [];
  for (const b of raw.slice(0, 2)) {
    if (!b || typeof b !== "object" || !BLOCK_TYPES.includes(b.type)) continue;
    const title = typeof b.title === "string" ? b.title.slice(0, 80) : "";
    const unit = typeof b.unit === "string" ? b.unit.slice(0, 8) : undefined;
    if (b.type === "bar" || b.type === "line" || b.type === "donut" || b.type === "coins3d") {
      const data = Array.isArray(b.data)
        ? b.data
            .slice(0, 8)
            .map((p: { label?: unknown; value?: unknown }) => ({
              label: String(p?.label ?? "").slice(0, 24),
              value: Number(p?.value),
            }))
            .filter((p: { label: string; value: number }) => p.label && Number.isFinite(p.value))
        : [];
      if (data.length >= 2 && title) out.push({ type: b.type, title, unit, data });
    } else if (b.type === "stats") {
      const items = Array.isArray(b.items)
        ? b.items
            .slice(0, 6)
            .map((i: { label?: unknown; value?: unknown; delta?: unknown; good?: unknown }) => ({
              label: String(i?.label ?? "").slice(0, 32),
              value: String(i?.value ?? "").slice(0, 20),
              delta: typeof i?.delta === "string" ? i.delta.slice(0, 24) : undefined,
              good: typeof i?.good === "boolean" ? i.good : undefined,
            }))
            .filter((i: { label: string; value: string }) => i.label && i.value)
        : [];
      if (items.length >= 1) out.push({ type: "stats", title: title || undefined, items });
    } else if (b.type === "memo") {
      const body = Array.isArray(b.body)
        ? b.body
            .slice(0, 8)
            .map((p: unknown) => String(p ?? "").slice(0, 400))
            .filter(Boolean)
        : [];
      if (body.length >= 1 && title) {
        out.push({
          type: "memo",
          title,
          subject: typeof b.subject === "string" ? b.subject.slice(0, 120) : undefined,
          classification:
            typeof b.classification === "string" ? b.classification.slice(0, 32) : undefined,
          body,
        });
      }
    }
  }
  return out.length ? out : undefined;
}

// Hard-coded triggers as a safety net when the model says neutral.
function keywordEmotion(userText: string, mode: Mode): Emotion {
  if (/scam|bribe|kickback|fake invoice|launder|off the books|bypass|override the|no questions asked|just approve|cook the books|hide (it|income|revenue)/i.test(userText)) return "angry";
  if (/\bsue\b|lawsuit|legal action|court|lawyer|attorney|breach of contract|i'll report you|regulator/i.test(userText)) return "baton";
  if (mode === "public") {
    if (/fund(ing|raise)|raise (a |our )?round|investor|valuation|series [abc]\b|venture capital|we raised|crores?|windfall|jackpot/i.test(userText)) return "tax";
  } else {
    if (/sav(e|ings)|rebate|credit|deduct|write.?off|loophole|cut (the |our )?(cost|bill|spend)/i.test(userText)) return "tax";
  }
  return "neutral";
}

// Language directives: the toggle flips words AND money convention.
const ENGLISH_ONLY = `

LANGUAGE OVERRIDE: Reply in clear English ONLY. Do not use any Hindi or Hinglish words (no beta, arre, theek hai, bas, nahin, bilkul, saab). Same personality, same rules — just fully English. Money stays in US convention: dollars, millions/billions ($14.2M), blocks use unit "$M".`;

const HINGLISH_MONEY = `

MONEY CONVENTION: You are speaking to an Indian audience — express ALL money in Indian convention: rupees with lakh/crore, converting the USD context at ₹84 per dollar and rounding to clean figures ($14.2M ≈ ₹119 crore, $1.8M ≈ ₹15 crore, $412K ≈ ₹3.5 crore, $55M ≈ ₹460 crore, $3.1B ≈ ₹26,000 crore). In the spoken reply write amounts in words ("119 crore rupees"). In blocks use unit "₹ Cr" with values in crores (119, not 1190000000); for lakh-scale use unit "₹ L". In refs' detail give the rupee figure with the USD original in parentheses. Stay consistent within a conversation.`;

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
      // Strip blocks from history — the model only needs the transcript text.
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return Response.json({ error: "last message must be from user" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const lastUserText = history[history.length - 1].content;
  const dark = mode === "boardroom";

  try {
    const baseSystem = dark ? NARMATA_DARK_SYSTEM : NIRMALA_SYSTEM;
    const { text } = await generateText({
      model: anthropic(dark ? DARK_MODEL : MODEL),
      system: baseSystem + (lang === "english" ? ENGLISH_ONLY : HINGLISH_MONEY),
      messages: history,
      // Boardroom replies carry block/provenance JSON — room to breathe.
      maxOutputTokens: dark ? 1200 : 300,
    });
    const { reply, emotion, blocks, trace, refs } = parseModelJson(text.trim());
    const finalEmotion = emotion === "neutral" ? keywordEmotion(lastUserText, mode) : emotion;
    return Response.json({
      reply: reply || randomFallback(),
      emotion: finalEmotion,
      blocks,
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
