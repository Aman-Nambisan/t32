"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import { useSpeech } from "@/hooks/useSpeech";
import { EMOTION_FX } from "@/lib/lines";
import type { Emotion, Mood } from "@/lib/types";

const NirmalaStage = dynamic(() => import("@/components/NirmalaStage"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/40">
      <span className="animate-pulse">Summoning the Finance Minister…</span>
    </div>
  ),
});

const EMOTION_STYLES: Record<Exclude<Emotion, "neutral">, string> = {
  angry: "border-red-500/90 text-red-300",
  baton: "border-amber-400/90 text-amber-200",
  tax: "border-emerald-400/90 text-emerald-200",
};

export default function Home() {
  const [mood, setMood] = useState<Mood>("idle");
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [emotionNonce, setEmotionNonce] = useState(0);
  const { speak, energyRef, muted, setMuted, unlock } = useSpeech();

  function handleEmotion(next: Emotion) {
    setEmotion(next);
    if (next !== "neutral") setEmotionNonce((n) => n + 1);
  }

  const fx = emotion !== "neutral" ? EMOTION_FX[emotion] : null;

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#0A1210] via-[#0C1418] to-[#131018] text-white">
      <header className="flex items-center justify-between px-6 pb-2 pt-6 md:px-10">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-300/70">
            Penny · Finance &amp; Controls · Team t32
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-amber-100 md:text-5xl">
            Don&apos;t Mess With Narmata
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            The incorruptible controller of McContext&apos;s 2,000 stores. She checks every
            purchase order, invoice and settlement — and she cannot be talked out of the rules.
          </p>
        </div>
        <div className="hidden select-none text-right md:block">
          <p className="text-4xl">🪷</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
            Ministry of No Nonsense
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:gap-5 md:px-10 md:pb-6">
        <section className="relative min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_35%,#1C2B26_0%,#0C1114_70%)]">
          <NirmalaStage mood={mood} emotion={emotion} energyRef={energyRef} />

          {fx && (
            <div
              key={emotionNonce}
              className={`stamp-in pointer-events-none absolute right-5 top-5 rotate-6 rounded-xl border-4 bg-black/65 px-5 py-3 backdrop-blur ${EMOTION_STYLES[emotion as Exclude<Emotion, "neutral">]}`}
            >
              <p className="text-2xl">{fx.emoji}</p>
              <p className="font-display text-xl font-bold tracking-wide">{fx.annotation}</p>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/20 bg-black/50 px-4 py-1.5 text-xs tracking-wide text-amber-100/80 backdrop-blur">
            {mood === "thinking"
              ? "Tai is auditing your request…"
              : mood === "speaking"
                ? "Tai has the floor."
                : "Smt. Narmata Tai · Controller-General, McContext"}
          </div>
        </section>

        <aside className="h-[520px] w-full md:h-auto md:w-[400px] lg:w-[430px]">
          <ChatPanel
            mood={mood}
            setMood={setMood}
            onEmotion={handleEmotion}
            speak={speak}
            unlock={unlock}
            muted={muted}
            setMuted={setMuted}
          />
        </aside>
      </div>

      <footer className="px-6 pb-4 text-center text-[11px] text-white/30 md:px-10">
        Parody for the Atlan AI Hackathon 2026 · Not affiliated with any real official ·
        Fronted by Penny, the finance &amp; controls agent
      </footer>
    </main>
  );
}
