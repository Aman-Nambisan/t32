import Anthropic from "@anthropic-ai/sdk";
import { NIRMALA_SYSTEM } from "@/lib/persona";
import { randomFallback } from "@/lib/lines";

// Cheapest model that clears the bar, per team cost rules (../models.yaml).
const MODEL = process.env.NIRMALA_MODEL ?? "claude-sonnet-4-6";
const MAX_HISTORY = 12;
const MAX_MSG_CHARS = 600;

const client = new Anthropic();

type ChatMessage = { role: "user" | "assistant"; content: string };

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

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 250,
      system: NIRMALA_SYSTEM,
      messages: history,
    });
    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();
    return Response.json({ reply: reply || randomFallback(), fallback: !reply });
  } catch (error) {
    // Demo resilience: never surface a broken turn — Tai always has a line.
    console.error("chat route error:", error);
    return Response.json({ reply: randomFallback(), fallback: true });
  }
}
