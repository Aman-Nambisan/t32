import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { EdgeTTS } from "node-edge-tts";

// Voice matrix via the (unofficial) Edge TTS endpoint — free, no key.
// Hinglish → hi-IN Swara: a Hindi neural voice that speaks mixed
// Hindi-English natively, so बेटा never comes out as the Greek letter.
// English → en-IN Neerja (Indian-English). Boardroom = lower and slower.
// Client falls back to Web Speech if this 503s.
const VOICE = { hinglish: "hi-IN-SwaraNeural", english: "en-IN-NeerjaNeural" } as const;
const DARK = { pitch: "-12Hz", rate: "-12%" } as const;

const voices = {
  "hinglish:public": new EdgeTTS({ voice: VOICE.hinglish, timeout: 15_000 }),
  "hinglish:boardroom": new EdgeTTS({ voice: VOICE.hinglish, ...DARK, timeout: 15_000 }),
  "english:public": new EdgeTTS({ voice: VOICE.english, timeout: 15_000 }),
  "english:boardroom": new EdgeTTS({ voice: VOICE.english, ...DARK, timeout: 15_000 }),
};

// Pronunciation lexicon: transliterate the notorious Hinglish words to
// Devanagari for the TTS only (UI text stays Latin). Word-boundary matches,
// longest first so "bahi-khata" wins over "khata".
const LEXICON: [RegExp, string][] = [
  [/\bbahi-?khata\b/gi, "बही-खाता"],
  [/\bnamaskar\b/gi, "नमस्कार"],
  [/\btheek hai\b/gi, "ठीक है"],
  [/\bbilkul\b/gi, "बिल्कुल"],
  [/\bnahin\b/gi, "नहीं"],
  [/\blathi\b/gi, "लाठी"],
  [/\barre?y?\b/gi, "अरे"],
  [/\bbeta\b/gi, "बेटा"],
  [/\bsaab\b/gi, "साब"],
  [/\bbas\b/gi, "बस"],
];

function toSpeakable(text: string, lang: keyof typeof VOICE): string {
  if (lang !== "hinglish") return text;
  let out = text;
  for (const [re, dev] of LEXICON) out = out.replace(re, dev);
  return out;
}

export async function POST(request: Request) {
  let text: string;
  let mode: "public" | "boardroom";
  let lang: keyof typeof VOICE;
  try {
    const body = await request.json();
    text = String(body.text ?? "").slice(0, 900);
    mode = body.mode === "boardroom" ? "boardroom" : "public";
    lang = body.lang === "english" ? "english" : "hinglish";
    if (!text.trim()) return Response.json({ error: "empty text" }, { status: 400 });
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const speakable = toSpeakable(text, lang);

  // Cache by content hash: canned catchphrases repeat constantly.
  const hash = createHash("md5").update(`${lang}:${mode}:${speakable}`).digest("hex");
  const file = path.join(tmpdir(), `nirmala-tts-${hash}.mp3`);

  try {
    if (!existsSync(file)) {
      await voices[`${lang}:${mode}`].ttsPromise(speakable, file);
    }
    const audio = await readFile(file);
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("tts route error:", error);
    return Response.json({ error: "tts unavailable" }, { status: 503 });
  }
}
