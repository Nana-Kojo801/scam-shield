// Thin typed wrappers over the Web Speech API. Browser only; every function is safe to call
// when the API is missing and reports that through `supported` instead of throwing.

export type VoiceError = "denied" | "no-speech" | "no-mic" | "network" | "other";

type RecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> };

export interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function synthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function mapVoiceError(code: string): VoiceError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "denied";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "no-mic";
    case "network":
      return "network";
    default:
      return "other";
  }
}

export const VOICE_ERROR_TEXT: Record<VoiceError, string> = {
  denied: "Microphone access was blocked. You can allow it in your browser settings, or paste the message below.",
  "no-speech": "I didn't hear anything. Tap the microphone and try again, or paste the message below.",
  "no-mic": "I couldn't find a microphone. You can paste the message below instead.",
  network: "Speech recognition lost its connection. Try again, or paste the message below.",
  other: "Voice input stopped unexpectedly. Try again, or paste the message below.",
};
