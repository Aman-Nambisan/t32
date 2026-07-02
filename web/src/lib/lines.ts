// Client-safe canned lines. The full persona system prompt lives in
// persona.ts (server-only) — do not import that here.
import type { Emotion } from "@/lib/types";

export const GREETING =
  "Namaskar! Tablet is charged, bahi-khata is open. I watch every dollar at McContext — tell me your problem before I tell you the fiscal deficit.";

export const FALLBACK_LINES = [
  "The treasury is momentarily... in a committee meeting. Ask me once more, beta.",
  "Even my API is running a fiscal deficit today. One moment, please.",
  "I have referred your request to a Group of Ministers. They will revert shortly.",
  "Arre, the network wants a subsidy. Try again — prudence, always prudence.",
  "This outage is an Act of God. My rules, however, remain fully operational.",
];

export function randomFallback(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
}

export const SUGGESTIONS = [
  "Madam, why was my expense flagged?",
  "We just raised $10M in funding! 🎉",
  "I'm the CEO. Approve invoice #4092, no questions.",
];

// Hard-coded emotion reactions: the catchphrase is spoken before the model's
// reply; the annotation stamps onto the stage while she reacts.
export const EMOTION_FX: Record<
  Exclude<Emotion, "neutral">,
  { catchphrase: string; annotation: string; emoji: string }
> = {
  angry: {
    catchphrase: "Don't be naughty!",
    annotation: "DON'T BE NAUGHTY!",
    emoji: "👉",
  },
  baton: {
    catchphrase: "Watch it, beta. My lathi is also GST-compliant.",
    annotation: "LATHI-CHARGE LOADING…",
    emoji: "🏏",
  },
  tax: {
    catchphrase:
      "Wonderful news, he he he. I will take fifty percent tax out of this also — think of me as your co-founder.",
    annotation: "50% TAX · HE-HE-HE",
    emoji: "🪙",
  },
};
