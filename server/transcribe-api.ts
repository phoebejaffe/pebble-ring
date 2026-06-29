import type { IncomingMessage, ServerResponse } from "node:http";
import { AssemblyAI } from "assemblyai";
import type { AssemblyAiWordConfig } from "../src/lib/transcription-settings";
import { requireAuth } from "./verify-auth";

const MODEL = "universal-2";

type TranscribeBody = {
  audioUrl?: string;
  wordConfig?: AssemblyAiWordConfig;
};

export async function handleTranscribeRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!(await requireAuth(req, res))) return;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "ASSEMBLYAI_API_KEY is not configured" }));
    return;
  }

  let body = "";
  for await (const chunk of req) body += chunk;

  let parsed: TranscribeBody;
  try {
    parsed = JSON.parse(body) as TranscribeBody;
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const audioUrl = typeof parsed.audioUrl === "string" ? parsed.audioUrl.trim() : "";
  if (!audioUrl) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "audioUrl is required" }));
    return;
  }

  const wordConfig = parsed.wordConfig;
  const word_boost = wordConfig?.word_boost?.filter(Boolean) ?? [];
  const custom_spelling = wordConfig?.custom_spelling?.filter(
    (entry) => entry.to && entry.from?.length,
  ) ?? [];

  try {
    const client = new AssemblyAI({ apiKey });
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      speech_models: [MODEL],
      language_code: "en",
      language_detection: false,
      filter_profanity: false,
      ...(word_boost.length > 0
        ? {
            word_boost,
            boost_param: wordConfig?.boost_param ?? "high",
          }
        : {}),
      ...(custom_spelling.length > 0 ? { custom_spelling } : {}),
    });

    if (transcript.status === "error") {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: transcript.error ?? "Transcription failed" }));
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        transcript: (transcript.text ?? "").trim(),
        model: `assemblyai/${MODEL}`,
      }),
    );
  } catch (error) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Transcription failed",
      }),
    );
  }
}
