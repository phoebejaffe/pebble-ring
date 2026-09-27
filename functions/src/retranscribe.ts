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
      keyterms_prompt?: string[];
    }) => Promise<{ status?: string; text?: string | null }>;
  };
};

// Proper nouns the ring hears often; keyterms_prompt biases universal-2
// toward these spellings. Override with comma-separated RETRANSCRIBE_KEYTERMS.
const DEFAULT_KEYTERMS = ["Masumi", "Coreads", "Timeblock"];

export function transcriptionKeyterms(): string[] {
  const configured = (process.env.RETRANSCRIBE_KEYTERMS ?? "").trim();
  if (!configured) return DEFAULT_KEYTERMS;
  return configured
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
}

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
    keyterms_prompt: transcriptionKeyterms(),
  });
  if (result.status === "error") throw new Error("AssemblyAI transcription failed");
  return normalizeRetranscription(result.text);
}
