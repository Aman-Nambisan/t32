"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import { useSpeech } from "@/hooks/useSpeech";
import { BOARDROOM_PIN, EMOTION_FX, GREETINGS, WRONG_PIN_LINES } from "@/lib/lines";
import type { Emotion, Lang, Mode, Mood } from "@/lib/types";

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

// The two faces of the product. Boardroom is the governance pitch made
// visible: same agent, CXO clearance ⇒ different context, different Tai.
const SKIN = {
  public: {
    page: "from-[#0A1210] via-[#0C1418] to-[#131018]",
    eyebrow: "Penny · Finance & Controls · Team t32",
    eyebrowText: "text-emerald-300/70",
    h1: "Don't Mess With Narmata",
    h1Text: "text-amber-100",
    seal: "🪷",
    sealCaption: "Ministry of No Nonsense",
    stage: "bg-[radial-gradient(ellipse_at_50%_35%,#1C2B26_0%,#0C1114_70%)]",
    nameplate: "Smt. Narmata Tai · Controller-General, McContext",
    thinkingPlate: "Tai is auditing your request…",
    speakingPlate: "Tai has the floor.",
  },
  boardroom: {
    page: "from-[#150609] via-[#0E040A] to-[#060308]",
    eyebrow: "Penny · CXO Clearance · The Shadow Ledger",
    eyebrowText: "text-red-400/80",
    h1: "Narmata: After Hours",
    h1Text: "text-red-100",
    seal: "🕯️",
    sealCaption: "Ministry of Quiet Savings",
    stage: "bg-[radial-gradient(ellipse_at_50%_35%,#2E1016_0%,#0A0508_70%)]",
    nameplate: "N. · Consigliere-General · Strictly off the record",
    thinkingPlate: "Tai is checking who else is listening…",
    speakingPlate: "This stays in the room.",
  },
} as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("public");
  const [lang, setLang] = useState<Lang>("hinglish");
  const [mood, setMood] = useState<Mood>("idle");
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [emotionNonce, setEmotionNonce] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const { speak, cancel, energyRef, muted, setMuted, unlock } = useSpeech();

  function handleEmotion(next: Emotion) {
    setEmotion(next);
    if (next !== "neutral") setEmotionNonce((n) => n + 1);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setEmotion("neutral");
    setMood("idle");
    setGateOpen(false);
  }

  const skin = SKIN[mode];
  const fx = emotion !== "neutral" ? EMOTION_FX[mode][emotion] : null;

  return (
    <main
      className={`flex min-h-screen flex-col bg-gradient-to-b text-white transition-colors duration-700 md:h-screen md:min-h-0 md:overflow-hidden ${skin.page}`}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-1 pt-4 md:px-10">
        <div>
          <p
            className={`text-[11px] font-medium uppercase tracking-[0.3em] transition-colors duration-700 ${skin.eyebrowText}`}
          >
            {skin.eyebrow}
          </p>
          <h1
            className={`font-display mt-0.5 text-2xl font-semibold tracking-tight transition-colors duration-700 md:text-4xl ${skin.h1Text}`}
          >
            {skin.h1}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="hidden select-none items-center gap-2 md:flex">
            <p className="text-2xl">{skin.seal}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">{skin.sealCaption}</p>
          </div>
          {mode === "public" ? (
            <button
              onClick={() => setGateOpen(true)}
              className="rounded-full border border-red-400/40 bg-red-950/40 px-4 py-1.5 text-xs font-medium text-red-200 transition hover:border-red-300 hover:bg-red-900/50"
            >
              🔒 The Boardroom
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={() => {
                  unlock();
                  cancel();
                  switchMode("public");
                  setMood("speaking");
                  void speak(
                    lang === "english"
                      ? "You saw nothing. We were never here."
                      : "You saw nothing, beta. We were never here.",
                    false,
                    lang,
                  ).finally(() =>
                    setMood("idle"),
                  );
                }}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-amber-300/60 hover:text-amber-200"
              >
                🔓 Leave the room
              </button>
              <span className="rounded-full border border-red-500/40 bg-red-950/50 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-red-300">
                context: CFO · row-level clearance
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row md:gap-5 md:px-10 md:pb-6">
        <section
          className={`relative min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-white/10 transition-colors duration-700 md:min-h-0 ${skin.stage}`}
        >
          <NirmalaStage
            mood={mood}
            emotion={emotion}
            energyRef={energyRef}
            dark={mode === "boardroom"}
          />

          {fx && (
            <div
              key={emotionNonce}
              className={`stamp-in pointer-events-none absolute right-5 top-5 rotate-6 rounded-xl border-4 bg-black/65 px-5 py-3 backdrop-blur ${EMOTION_STYLES[emotion as Exclude<Emotion, "neutral">]}`}
            >
              <p className="text-2xl">{fx.emoji}</p>
              <p className="font-display text-xl font-bold tracking-wide">{fx.annotation}</p>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-200/20 bg-black/50 px-4 py-1.5 text-xs tracking-wide text-amber-100/80 backdrop-blur">
            {mood === "thinking"
              ? skin.thinkingPlate
              : mood === "speaking"
                ? skin.speakingPlate
                : skin.nameplate}
          </div>
        </section>

        <aside className="h-[520px] w-full min-h-0 md:h-full md:w-[440px] lg:w-[500px] xl:w-[560px]">
          <ChatPanel
            mode={mode}
            lang={lang}
            setLang={setLang}
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

      <footer className="shrink-0 px-6 pb-4 text-center text-[11px] text-white/30 md:px-10">
        Parody for the Atlan AI Hackathon 2026 · Not affiliated with any real official · Fronted by
        Penny, the finance &amp; controls agent
        {mode === "boardroom" && " · Boardroom figures are simulated demo data"}
      </footer>

      {/* Pre-warm the emoji glyph cache: the very first emote otherwise
          paints as a grey tofu box for a frame while the font loads */}
      <span aria-hidden className="pointer-events-none fixed -left-96 top-0 select-none opacity-0">
        💢🤑😤🤔🚨🤫👉🏏🪙🕯️
      </span>

      {gateOpen && (
        <BoardroomGate
          onGranted={() => {
            unlock();
            cancel();
            switchMode("boardroom");
            // The reveal beat: she spins, lights go red, a low laugh, then
            // the whispered welcome.
            setMood("speaking");
            void speak(`He he he he heh… ${GREETINGS.boardroom}`, true, lang).finally(() =>
              setMood("idle"),
            );
          }}
          onClose={() => setGateOpen(false)}
        />
      )}
    </main>
  );
}

// The clearance theatre: a PIN pad guarding the boardroom. Wrong answers get
// scolded; the right answer is the one number Tai never stops saying.
function BoardroomGate({ onGranted, onClose }: { onGranted: () => void; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [scold, setScold] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === BOARDROOM_PIN) {
      setGranted(true);
      setTimeout(onGranted, 900);
    } else {
      setScold(WRONG_PIN_LINES[Math.floor(Math.random() * WRONG_PIN_LINES.length)]);
      setShakeNonce((n) => n + 1);
      setPin("");
      inputRef.current?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        key={shakeNonce}
        className={`w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#150609] p-6 text-center shadow-2xl shadow-red-950/50 ${shakeNonce ? "gate-shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {granted ? (
          <div className="stamp-in py-6">
            <p className="text-3xl">🔓</p>
            <p className="font-display mt-2 text-2xl font-bold tracking-wide text-red-300">
              ACCESS GRANTED
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
              welcome to the boardroom
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-400/80">
              executive access
            </p>
            <p className="font-display mt-1 text-xl font-semibold text-red-100">The Boardroom</p>
            <p className="mt-2 text-xs text-white/50">
              CXO clearance required. Some context is only for some people — that&apos;s not a
              bug, that&apos;s governance.
            </p>
            <form onSubmit={submit} className="mt-4">
              <input
                ref={inputRef}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••••••"
                className="w-56 rounded-xl border border-red-500/40 bg-black/50 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-red-100 placeholder-white/25 outline-none focus:border-red-300"
              />
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-red-400 px-5 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-300"
                >
                  Enter
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:text-white"
                >
                  Flee
                </button>
              </div>
            </form>
            <p className="mt-3 min-h-4 text-xs">
              {scold ? (
                <span className="text-red-300">{scold}</span>
              ) : (
                <span className="text-white/30">
                  Hint: the most unbreakable password known to executives.
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
