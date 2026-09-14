import { AssemblyAI } from "assemblyai";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";

export const assemblyAiApiKey = defineSecret("ASSEMBLYAI_API_KEY");

function apiKey(): string {
  try {
    return assemblyAiApiKey.value().trim();
  } catch {
    return "";
  }
}

export type AssemblyAiClient = {
  transcripts: {
    transcribe: (input: {
      audio: string;
      speech_models: string[];
      filter_profanity: boolean;
    }) => Promise<{ status?: string; text?: string | null }>;
  };
};

export function normalizeRetranscription(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const normalized = text.trim();
  return normalized || null;
}

export async function retranscribeStoredAudio(
  path: string,
  dependencies: {
    createClient?: (options: { apiKey: string }) => AssemblyAiClient;
    getSignedUrl?: (path: string) => Promise<string>;
    getApiKey?: () => string;
  } = {},
): Promise<string | null> {
  const key = dependencies.getApiKey?.() ?? apiKey();
  if (!key) return null;

  const getSignedUrl =
    dependencies.getSignedUrl ??
    (async (audioPath: string) => {
      const [url] = await getStorage()
        .bucket()
        .file(audioPath)
        .getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000,
        });
      return url;
    });
  const audioUrl = await getSignedUrl(path);
  const client = dependencies.createClient?.({ apiKey: key }) ?? new AssemblyAI({ apiKey: key });
  const result = await client.transcripts.transcribe({
    audio: audioUrl,
    speech_models: ["universal-2"],
    filter_profanity: false,
  });
  if (result.status === "error") throw new Error("AssemblyAI transcription failed");
  return normalizeRetranscription(result.text);
}
