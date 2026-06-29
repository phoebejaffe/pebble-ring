import type { TranscriptionSettings } from "../lib/transcription-settings";
import { toAssemblyAiWordConfig } from "../lib/transcription-settings";
import type { GetIdToken } from "../lib/api-auth";
import { fetchWithAuth } from "../lib/api-auth";

export type TranscribeApiResult = {
  transcription: string;
  model: string;
};

export async function transcribeFromUrl(
  audioUrl: string,
  settings: TranscriptionSettings,
  getIdToken: GetIdToken,
): Promise<TranscribeApiResult> {
  const wordConfig = toAssemblyAiWordConfig(settings);

  const res = await fetchWithAuth(
    "/api/transcribe",
    getIdToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl, wordConfig }),
    },
  );

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
