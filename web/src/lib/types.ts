export type Mood = "idle" | "thinking" | "speaking";

export type Emotion = "neutral" | "angry" | "baton" | "tax";

export const EMOTIONS: Emotion[] = ["neutral", "angry", "baton", "tax"];

export type ChatMessage = { role: "user" | "assistant"; content: string };
