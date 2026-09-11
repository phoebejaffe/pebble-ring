import { firestoreToMs, type FirestoreTimestamp } from "../lib/firestore-time";

export type { FirestoreTimestamp };

export type RecordingEntry = {
  timestamp: FirestoreTimestamp | number;
  fileName: string | null;
  status: string;
  transcription: string | null;
  transcribedUsingModel: string | null;
  error: string | null;
  ringTransferInfo: unknown;
  userMessageId: number | null;
};

export type AssistantMessage = {
  role: string;
  content: string | null;
  tool_calls?: unknown;
  language_model_used?: string;
  tool_call_id?: string;
  semantic_result?: unknown;
};

export type RecordingDoc = {
  timestamp: FirestoreTimestamp | number;
  updated: number;
  entries: RecordingEntry[];
  assistant_session: {
    title: string | null;
    messages: AssistantMessage[];
  } | null;
  metadata: unknown;
  encrypted: unknown;
};

export type ParsedRecording = {
  id: string;
  timestampMs: number;
  updatedMs: number;
  title: string;
  transcription: string;
  autoTranscription: string;
  userTranscription: string;
  fileName: string | null;
  status: string;
  transcribedUsingModel: string | null;
  raw: RecordingDoc;
};

export function parseRecording(id: string, data: Record<string, unknown>): ParsedRecording {
  const doc = data as unknown as RecordingDoc;
  const firstEntry = doc.entries?.[0];
  const userMessage = doc.assistant_session?.messages?.find((m) => m.role === "user");
  const autoTranscription = firstEntry?.transcription?.trim() ?? "";
  const userTranscription = userMessage?.content?.trim() ?? "";

  const transcription = userTranscription || autoTranscription || "";

  const title =
    doc.assistant_session?.title?.trim() || userTranscription || transcription || "Recording";

  const recordingTs = firestoreToMs(doc.timestamp);
  const entryTs = firstEntry ? firestoreToMs(firstEntry.timestamp) : 0;
  const timestampMs = entryTs > 0 ? entryTs : recordingTs;
  const updatedMs = firestoreToMs(doc.updated) || recordingTs;

  return {
    id,
    timestampMs,
    updatedMs,
    title,
    transcription,
    autoTranscription,
    userTranscription,
    fileName: firstEntry?.fileName ?? null,
    status: firstEntry?.status ?? "unknown",
    transcribedUsingModel: firstEntry?.transcribedUsingModel ?? null,
    raw: doc,
  };
}

export function sortRecordingsNewestFirst(recordings: ParsedRecording[]): ParsedRecording[] {
  return [...recordings].sort((a, b) => b.timestampMs - a.timestampMs);
}
