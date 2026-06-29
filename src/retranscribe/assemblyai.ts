import type { TranscriptionSettings } from "../lib/transcription-settings";
import { toAssemblyAiWordConfig } from "../lib/transcription-settings";

export type TranscribeApiResult = {
  transcription: string;
  model: string;
};

export async function transcribeFromUrl(
  audioUrl: string,
  settings: TranscriptionSettings,
): Promise<TranscribeApiResult> {
  const wordConfig = toAssemblyAiWordConfig(settings);

  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioUrl, wordConfig }),
  });

  const data = (await res.json()) as { transcript?: string; model?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? `Transcription failed (${res.status})`);
  }

  const transcription = (data.transcript ?? "").trim();
  if (!transcription) {
    throw new Error("Transcription returned empty text");
  }

  return {
    transcription,
    model: data.model ?? "assemblyai/universal-2",
  };
}
