import { assemblyAiApiKey } from "./retranscribe.js";

const CLASSIFIER_MODEL = "gemini-2.5-flash-lite";
const CLASSIFIER_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions";

export type TaskClassification = {
  isTask: boolean;
  confidence: number;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

function apiKey(): string {
  try {
    return assemblyAiApiKey.value().trim();
  } catch {
    return "";
  }
}

function parseClassification(content: unknown): TaskClassification | null {
  if (typeof content !== "string") return null;
  const json = content.match(/\{[\s\S]*\}/u)?.[0];
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { isTask?: unknown; confidence?: unknown };
    const confidence = Number(parsed.confidence);
    if (typeof parsed.isTask !== "boolean" || !Number.isFinite(confidence)) return null;
    return { isTask: parsed.isTask, confidence: Math.min(1, Math.max(0, confidence)) };
  } catch {
    return null;
  }
}

export async function classifyTranscription(
  transcription: string,
  dependencies: {
    getApiKey?: () => string;
    fetch?: typeof fetch;
  } = {},
): Promise<TaskClassification | null> {
  const key = dependencies.getApiKey?.() ?? apiKey();
  if (!key) return null;

  const fetcher = dependencies.fetch ?? fetch;
  const response = await fetcher(CLASSIFIER_URL, {
    method: "POST",
    headers: { authorization: key, "content-type": "application/json" },
    body: JSON.stringify({
      model: CLASSIFIER_MODEL,
      messages: [
        {
          role: "system",
          content:
            'Classify whether the user transcription is an actionable task. A task is an imperative instruction, intended commitment, or concrete thing the user wants done. Questions, ideas, observations, facts, and reflections are not tasks. Return JSON only: {"isTask":true|false,"confidence":0.0}.',
        },
        { role: "user", content: transcription },
      ],
      max_tokens: 40,
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error("AssemblyAI task classification failed");
  const result = (await response.json()) as ChatResponse;
  return parseClassification(result.choices?.[0]?.message?.content);
}
