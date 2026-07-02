"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import { useSpeech } from "@/hooks/useSpeech";
import type { Mood } from "@/lib/types";

const NirmalaStage = dynamic(() => import("@/components/NirmalaStage"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/40">
      <span className="animate-pulse">Summoning the Finance Minister…</span>
    </div>
  ),
});

export default function Home() {
  const [mood, setMood] = useState<Mood>("idle");
  const { speak, energyRef, muted, setMuted } = useSpeech();

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#0A1210] via-[#0C1418] to-[#131018] text-white">
      <header className="flex items-center justify-between px-6 pb-2 pt-6 md:px-10">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-300/70">
            Penny · Finance &amp; Controls · Team t32
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-amber-100 md:text-5xl">
            Don&apos;t Mess With Nirmala
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
          <NirmalaStage mood={mood} energyRef={energyRef} />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/20 bg-black/50 px-4 py-1.5 text-xs tracking-wide text-amber-100/80 backdrop-blur">
            {mood === "thinking"
              ? "Tai is auditing your request…"
              : mood === "speaking"
                ? "Tai has the floor."
                : "Smt. Nirmala Tai · Controller-General, McContext"}
          </div>
        </section>

        <aside className="h-[520px] w-full md:h-auto md:w-[400px] lg:w-[430px]">
          <ChatPanel mood={mood} setMood={setMood} speak={speak} muted={muted} setMuted={setMuted} />
        </aside>
      </div>

      <footer className="px-6 pb-4 text-center text-[11px] text-white/30 md:px-10">
        Parody for the Atlan AI Hackathon 2026 · Not affiliated with any real official ·
        Fronted by Penny, the finance &amp; controls agent
      </footer>
    </main>
  );
}
