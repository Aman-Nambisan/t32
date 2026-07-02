"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// TTS with true amplitude reactivity: /api/tts (edge-tts NeerjaNeural) returns
// audio bytes → <audio> + AnalyserNode → energyRef (0..1) read per-frame by
// the 3D stage. Falls back to Web Speech boundary pulses, then silent pulses.
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const energyRef = useRef(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number>(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const fakeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      voiceRef.current =
        voices.find((v) => v.lang === "en-IN") ??
        voices.find((v) => /india|veena|lekha|neerja/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith("en-GB")) ??
        voices[0];
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // Must run synchronously inside a user gesture (the Send click) so the
  // AudioContext is allowed to play — autoplay policy.
  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const audio = new Audio();
      const source = ctx.createMediaElementSource(audio); // legal once per element
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      audioRef.current = audio;
      freqRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
  }, []);

  const stopMeters = () => {
    cancelAnimationFrame(rafRef.current);
    if (fakeTimer.current) {
      clearInterval(fakeTimer.current);
      fakeTimer.current = null;
    }
  };

  const cancel = useCallback(() => {
    stopMeters();
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const meterLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const freq = freqRef.current;
    if (!analyser || !freq) return;
    analyser.getByteFrequencyData(freq);
    let sum = 0;
    for (let i = 0; i < freq.length; i++) sum += freq[i];
    energyRef.current = Math.min(1, (sum / freq.length / 255) * 2.4);
    rafRef.current = requestAnimationFrame(meterLoop);
  }, []);

  const speakSilent = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      setSpeaking(true);
      const durationMs = Math.min(9000, Math.max(1500, text.split(/\s+/).length * 230));
      fakeTimer.current = setInterval(() => (energyRef.current = 1), 210);
      setTimeout(() => {
        stopMeters();
        setSpeaking(false);
        resolve();
      }, durationMs);
    });
  }, []);

  const speakWebSpeech = useCallback(
    (text: string): Promise<void> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return speakSilent(text);
      }
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.lang = voiceRef.current?.lang ?? "en-IN";
        utterance.pitch = 1.1;
        utterance.onstart = () => {
          setSpeaking(true);
          energyRef.current = 1;
        };
        utterance.onboundary = () => (energyRef.current = 1);
        const finish = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      });
    },
    [speakSilent],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (mutedRef.current) return speakSilent(text);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        unlock();
        const audio = audioRef.current;
        const ctx = ctxRef.current;
        if (!audio || !ctx) throw new Error("no audio graph");
        if (ctx.state === "suspended") await ctx.resume();

        const url = URL.createObjectURL(blob);
        return await new Promise<void>((resolve, reject) => {
          audio.src = url;
          audio.onplay = () => {
            setSpeaking(true);
            meterLoop();
          };
          const finish = () => {
            stopMeters();
            energyRef.current = 0;
            setSpeaking(false);
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onended = finish;
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("audio playback failed"));
          };
          audio.play().catch(reject);
        });
      } catch {
        return speakWebSpeech(text);
      }
    },
    [meterLoop, speakSilent, speakWebSpeech, unlock],
  );

  return { speak, cancel, speaking, muted, setMuted, energyRef, unlock };
}
