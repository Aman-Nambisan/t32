import Anthropic from "@anthropic-ai/sdk";
import { NIRMALA_SYSTEM } from "@/lib/persona";
import { randomFallback } from "@/lib/lines";
import { EMOTIONS, type ChatMessage, type Emotion } from "@/lib/types";

// Cheapest model that clears the bar, per team cost rules (../models.yaml).
const MODEL = process.env.NIRMALA_MODEL ?? "claude-sonnet-4-6";
const MAX_HISTORY = 12;
const MAX_MSG_CHARS = 600;

const client = new Anthropic();

function parseModelJson(raw: string): { reply: string; emotion: Emotion } {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.reply === "string" && parsed.reply.trim()) {
        const emotion = EMOTIONS.includes(parsed.emotion) ? parsed.emotion : "neutral";
        return { reply: parsed.reply.trim(), emotion };
      }
    }
  } catch {
    // fall through — treat raw text as the reply
  }
  return { reply: raw.trim(), emotion: "neutral" };
}

// Hard-coded triggers as a safety net when the model says neutral.
function keywordEmotion(userText: string): Emotion {
  if (/fund(ing|raise)|raise (a |our )?round|investor|valuation|series [abc]\b|venture capital|we raised|crores?|windfall|jackpot/i.test(userText)) return "tax";
  if (/\bsue\b|lawsuit|legal action|court|lawyer|attorney|breach of contract|i'll report you|regulator/i.test(userText)) return "baton";
  if (/scam|bribe|kickback|fake invoice|launder|off the books|bypass|override the|no questions asked|just approve/i.test(userText)) return "angry";
  return "neutral";
}

export async function POST(request: Request) {
  let history: ChatMessage[];
  try {
    const body = await request.json();
    history = (body.messages as ChatMessage[])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return Response.json({ error: "last message must be from user" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const lastUserText = history[history.length - 1].content;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: NIRMALA_SYSTEM,
      messages: history,
    });
    const raw = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();
    const { reply, emotion } = parseModelJson(raw);
    const finalEmotion = emotion === "neutral" ? keywordEmotion(lastUserText) : emotion;
    return Response.json({
      reply: reply || randomFallback(),
      emotion: finalEmotion,
      fallback: !reply,
    });
  } catch (error) {
    // Demo resilience: never surface a broken turn — Tai always has a line.
    console.error("chat route error:", error);
    return Response.json({ reply: randomFallback(), emotion: "neutral", fallback: true });
  }
}
