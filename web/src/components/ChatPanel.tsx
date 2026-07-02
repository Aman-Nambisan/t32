"use client";

import { useEffect, useRef, useState } from "react";
import Blocks from "@/components/blocks/Blocks";
import GenUI from "@/components/genui/GenUI";
import { RefChips, ResearchingBubble, TraceTrail } from "@/components/Research";
import {
  EMOTION_CATCHPHRASE_EN,
  EMOTION_FX,
  GREETINGS,
  SUGGESTIONS,
  randomFallback,
} from "@/lib/lines";
import type { Block, ChatMessage, Emotion, Lang, Mode, Mood, Ref, UiSpec } from "@/lib/types";

type ChatPanelProps = {
  mode: Mode;
  lang: Lang;
  setLang: (lang: Lang) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  onEmotion: (emotion: Emotion) => void;
  speak: (text: string, dark?: boolean, lang?: Lang) => Promise<void>;
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
  lang,
  setLang,
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
    let ui: UiSpec | undefined;
    let trace: string[] | undefined;
    let refs: Ref[] | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode, lang }),
      });
      const data = await res.json();
      reply = typeof data.reply === "string" && data.reply ? data.reply : randomFallback();
      if (data.emotion && data.emotion !== "neutral" && data.emotion in EMOTION_FX[mode]) {
        emotion = data.emotion as Emotion;
      }
      if (Array.isArray(data.blocks) && data.blocks.length) blocks = data.blocks as Block[];
      if (data.ui && typeof data.ui === "object" && data.ui.root) ui = data.ui as UiSpec;
      if (Array.isArray(data.trace) && data.trace.length) trace = data.trace as string[];
      if (Array.isArray(data.refs) && data.refs.length) refs = data.refs as Ref[];
    } catch {
      reply = randomFallback();
    }

    const emo = emotion as Exclude<Emotion, "neutral">;
    const catchphrase =
      emotion !== "neutral"
        ? lang === "english"
          ? EMOTION_CATCHPHRASE_EN[mode][emo]
          : EMOTION_FX[mode][emo].catchphrase
        : null;
    const spoken = catchphrase ? `${catchphrase} ${reply}` : reply;

    append(mode, { role: "assistant", content: spoken, blocks, ui, trace, refs });
    setPending(false);
    setMood("speaking");
    onEmotion(emotion);
    await speak(spoken, dark, lang);
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLang(lang === "hinglish" ? "english" : "hinglish")}
            className={`rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition ${t.chip}`}
            title={lang === "hinglish" ? "Switch Tai to plain English" : "Switch Tai back to Hinglish"}
          >
            {lang === "hinglish" ? "🇮🇳 Hinglish" : "🌐 English"}
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className={`rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition ${t.chip}`}
            title={muted ? "Unmute Tai" : "Mute Tai"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4"
      >
        {messages.map((message, i) => (
          <div
            key={`${mode}-${i}`}
            className={
              message.role === "user"
                ? "msg-in flex justify-end"
                : "msg-in flex flex-col items-start gap-2"
            }
          >
            <div
              className={
                message.role === "user"
                  ? `max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm ${t.userBubble}`
                  : `max-w-[90%] rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm ${t.aiBubble}`
              }
            >
              {message.trace && <TraceTrail trace={message.trace} dark={dark} />}
              {message.content}
              {message.refs && <RefChips refs={message.refs} dark={dark} />}
            </div>
            {message.ui && (
              <div className="w-full max-w-[97%]">
                <GenUI spec={message.ui} dark={dark} />
              </div>
            )}
            {!message.ui && message.blocks && (
              <div className="w-full max-w-[97%]">
                <Blocks blocks={message.blocks} dark={dark} />
              </div>
            )}
          </div>
        ))}
        {showSuggestions && (
          <div className="msg-in flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS[mode].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => send(suggestion)}
                className={`rounded-full border border-white/15 px-3 py-1.5 text-left text-xs text-white/70 transition ${t.chip}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {pending && (
          <div className="msg-in flex justify-start">
            <ResearchingBubble mode={mode} />
          </div>
        )}
      </div>

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
