"use client";

import { useEffect, useRef, useState } from "react";
import { GREETING, SUGGESTIONS, randomFallback } from "@/lib/lines";
import type { ChatMessage, Mood } from "@/lib/types";

type ChatPanelProps = {
  mood: Mood;
  setMood: (mood: Mood) => void;
  speak: (text: string) => Promise<void>;
  muted: boolean;
  setMuted: (muted: boolean) => void;
};

export default function ChatPanel({ mood, setMood, speak, muted, setMuted }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setInput("");
    setPending(true);
    setMood("thinking");
    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);

    let reply: string;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      reply = typeof data.reply === "string" && data.reply ? data.reply : randomFallback();
    } catch {
      reply = randomFallback();
    }

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setPending(false);
    setMood("speaking");
    await speak(reply);
    setMood("idle");
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-200">Ask Nirmala Tai</p>
          <p className="text-xs text-white/50">
            {mood === "thinking"
              ? "Consulting the bahi-khata…"
              : mood === "speaking"
                ? "Delivering the verdict…"
                : "The controller is in. Bring receipts."}
          </p>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-amber-300/60 hover:text-amber-200"
          title={muted ? "Unmute Tai" : "Mute Tai"}
        >
          {muted ? "🔇 muted" : "🔊 voice on"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, i) => (
          <div key={i} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-amber-200/90 px-3.5 py-2 text-sm text-stone-900"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm border border-pink-400/25 bg-white/5 px-3.5 py-2 text-sm text-white/90"
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-pink-400/25 bg-white/5 px-3.5 py-2 text-sm text-white/50">
              <span className="animate-pulse">तिजोरी खुल रही है…</span>
            </div>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => send(suggestion)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-amber-300/60 hover:text-amber-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="State your business…"
          disabled={pending}
          className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-amber-300/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-amber-200 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
