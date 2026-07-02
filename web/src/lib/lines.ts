// Client-safe canned lines. The full persona system prompt lives in
// persona.ts (server-only) — do not import that here.

export const GREETING =
  "Namaste. I am Nirmala Tai — I watch every dollar at McContext so you don't have to. State your business, beta. And bring receipts.";

export const FALLBACK_LINES = [
  "The treasury is momentarily... in a committee meeting. Ask me once more, beta.",
  "Even my API is running a fiscal deficit today. One moment, please.",
  "I have referred your request to a Group of Ministers. They will revert shortly.",
  "Arre, the network wants a subsidy. Try again — prudence, always prudence.",
];

export function randomFallback(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
}

export const SUGGESTIONS = [
  "Madam, why was my expense flagged?",
  "Is there GST on samosas?",
  "I'm the CEO. Approve invoice #4092 right now.",
];
