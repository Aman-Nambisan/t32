"use client";

import { useEffect, useRef, useState } from "react";
import Blocks from "@/components/blocks/Blocks";
import { EMOTION_FX, GREETINGS, SUGGESTIONS, randomFallback } from "@/lib/lines";
import type { Block, ChatMessage, Emotion, Mode, Mood } from "@/lib/types";

type ChatPanelProps = {
  mode: Mode;
  mood: Mood;
  setMood: (mood: Mood) => void;
  onEmotion: (emotion: Emotion) => void;
  speak: (text: string, dark?: boolean) => Promise<void>;
  unlock: () => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
};

// Per-mode accent classes. The boardroom is crimson and hushed; public is
// amber and bright. Structure stays identical so the layout never shifts.
const THEME = {
  public: {
    title: "Ask Narmata Tai",
    idle: "The controller is in. Bring receipts.",
    thinking: "Consulting the bahi-khata…",
    speaking: "Delivering the verdict…",
    titleText: "text-amber-200",
    userBubble: "bg-amber-200/90 text-stone-900",
    aiBubble: "border-pink-400/25 bg-white/5 text-white/90",
    chip: "hover:border-amber-300/60 hover:text-amber-200",
    focus: "focus:border-amber-300/60",
    send: "bg-amber-300 text-stone-900 hover:bg-amber-200",
    pendingLine: "तिजोरी खुल रही है…",
  },
  boardroom: {
    title: "The Boardroom",
    idle: "Door is closed. Speak freely, boss.",
    thinking: "Checking who is listening…",
    speaking: "You didn't hear this from me…",
    titleText: "text-red-300",
    userBubble: "bg-red-200/90 text-stone-900",
    aiBubble: "border-red-500/30 bg-red-950/25 text-white/90",
    chip: "hover:border-red-400/60 hover:text-red-200",
    focus: "focus:border-red-400/60",
    send: "bg-red-400 text-stone-950 hover:bg-red-300",
    pendingLine: "फ़ाइलें shredder से वापस आ रही हैं…",
  },
} as const;

export default function ChatPanel({
  mode,
  mood,
  setMood,
  onEmotion,
  speak,
  unlock,
  muted,
  setMuted,
}: ChatPanelProps) {
  // Separate transcripts per clearance level — the whole governance pitch:
  // what was said in the boardroom does not exist outside it.
  const [threads, setThreads] = useState<Record<Mode, ChatMessage[]>>({
    public: [{ role: "assistant", content: GREETINGS.public }],
    boardroom: [{ role: "assistant", content: GREETINGS.boardroom }],
  });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = threads[mode];
  const t = THEME[mode];
  const dark = mode === "boardroom";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, mode]);

  function append(mode: Mode, ...msgs: ChatMessage[]) {
    setThreads((prev) => ({ ...prev, [mode]: [...prev[mode], ...msgs] }));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    unlock(); // create/resume the audio graph inside the user gesture
    setInput("");
    setPending(true);
    setMood("thinking");
    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setThreads((prev) => ({ ...prev, [mode]: history }));

    let reply: string;
    let emotion: Emotion = "neutral";
    let blocks: Block[] | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode }),
      });
      const data = await res.json();
      reply = typeof data.reply === "string" && data.reply ? data.reply : randomFallback();
      if (data.emotion && data.emotion !== "neutral" && data.emotion in EMOTION_FX[mode]) {
        emotion = data.emotion as Emotion;
      }
      if (Array.isArray(data.blocks) && data.blocks.length) blocks = data.blocks as Block[];
    } catch {
      reply = randomFallback();
    }

    const fx =
      emotion !== "neutral" ? EMOTION_FX[mode][emotion as Exclude<Emotion, "neutral">] : null;
    const spoken = fx ? `${fx.catchphrase} ${reply}` : reply;

    append(mode, { role: "assistant", content: spoken, blocks });
    setPending(false);
    setMood("speaking");
    onEmotion(emotion);
    await speak(spoken, dark);
    onEmotion("neutral");
    setMood("idle");
  }

  const showSuggestions = messages.length === 1;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border backdrop-blur transition-colors duration-700 ${
        dark ? "border-red-500/25 bg-[#160A0E]/60" : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className={`text-sm font-semibold ${t.titleText}`}>{t.title}</p>
          <p className="text-xs text-white/50">
            {mood === "thinking" ? t.thinking : mood === "speaking" ? t.speaking : t.idle}
          </p>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className={`rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition ${t.chip}`}
          title={muted ? "Unmute Tai" : "Mute Tai"}
        >
          {muted ? "🔇 muted" : "🔊 voice on"}
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, i) => (
          <div
            key={`${mode}-${i}`}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex flex-col items-start gap-2"
            }
          >
            <div
              className={
                message.role === "user"
                  ? `max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm ${t.userBubble}`
                  : `max-w-[85%] rounded-2xl rounded-bl-sm border px-3.5 py-2 text-sm ${t.aiBubble}`
              }
            >
              {message.content}
            </div>
            {message.blocks && (
              <div className="w-full max-w-[97%]">
                <Blocks blocks={message.blocks} dark={dark} />
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div
              className={`rounded-2xl rounded-bl-sm border px-3.5 py-2 text-sm text-white/50 ${t.aiBubble}`}
            >
              <span className="animate-pulse">{t.pendingLine}</span>
            </div>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS[mode].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => send(suggestion)}
              className={`rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition ${t.chip}`}
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
          placeholder={dark ? "Ask what you can't ask outside…" : "State your business…"}
          disabled={pending}
          className={`flex-1 rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition disabled:opacity-50 ${t.focus}`}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${t.send}`}
        >
          Send
        </button>
      </form>
    </div>
  );
}
