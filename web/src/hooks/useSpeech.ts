"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech TTS with an Indian-English voice preference. energyRef pulses to
// 1 on each spoken word boundary; the 3D stage reads and decays it per frame.
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const energyRef = useRef(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const fakePulseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      voiceRef.current =
        voices.find((v) => v.lang === "en-IN") ??
        voices.find((v) => /india|veena|lekha|rishi|neerja|kalpana/i.test(v.name)) ??
        voices.find((v) => v.lang === "hi-IN") ??
        voices.find((v) => v.lang.startsWith("en-GB")) ??
        voices.find((v) => v.default) ??
        voices[0];
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const stopFakePulse = () => {
    if (fakePulseTimer.current) {
      clearInterval(fakePulseTimer.current);
      fakePulseTimer.current = null;
    }
  };

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopFakePulse();
    setSpeaking(false);
  }, []);

  // Resolves when the line finishes (or immediately-ish when TTS is
  // unavailable/muted, after a silent mouth-flap pass so the avatar still acts).
  const speak = useCallback((text: string): Promise<void> => {
    const hasTts =
      typeof window !== "undefined" && "speechSynthesis" in window && !mutedRef.current;

    if (!hasTts) {
      return new Promise((resolve) => {
        setSpeaking(true);
        const durationMs = Math.min(7000, Math.max(1500, text.split(/\s+/).length * 240));
        fakePulseTimer.current = setInterval(() => {
          energyRef.current = 1;
        }, 220);
        setTimeout(() => {
          stopFakePulse();
          setSpeaking(false);
          resolve();
        }, durationMs);
      });
    }

    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.lang = voiceRef.current?.lang ?? "en-IN";
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.onstart = () => {
        setSpeaking(true);
        energyRef.current = 1;
      };
      utterance.onboundary = () => {
        energyRef.current = 1;
      };
      const finish = () => {
        setSpeaking(false);
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  return { speak, cancel, speaking, muted, setMuted, energyRef };
}
