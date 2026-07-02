import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { EdgeTTS } from "node-edge-tts";

// en-IN-NeerjaNeural: female Indian-English neural voice via the (unofficial)
// Edge TTS endpoint. Free, no key. Client falls back to Web Speech if this 503s.
// Boardroom = same voice, lower and slower: the conspiratorial register.
const voices = {
  public: new EdgeTTS({ voice: "en-IN-NeerjaNeural", timeout: 15_000 }),
  boardroom: new EdgeTTS({
    voice: "en-IN-NeerjaNeural",
    pitch: "-12Hz",
    rate: "-12%",
    timeout: 15_000,
  }),
};

export async function POST(request: Request) {
  let text: string;
  let mode: keyof typeof voices;
  try {
    const body = await request.json();
    text = String(body.text ?? "").slice(0, 900);
    mode = body.mode === "boardroom" ? "boardroom" : "public";
    if (!text.trim()) return Response.json({ error: "empty text" }, { status: 400 });
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  // Cache by content hash: canned catchphrases repeat constantly.
  const hash = createHash("md5").update(`${mode}:${text}`).digest("hex");
  const file = path.join(tmpdir(), `nirmala-tts-${hash}.mp3`);

  try {
    if (!existsSync(file)) {
      await voices[mode].ttsPromise(text, file);
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
