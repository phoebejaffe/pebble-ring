import { parseRecording, type ParsedRecording, type RecordingDoc } from "../types/recording";

export function applyTranscriptionToDoc(
  docData: RecordingDoc,
  transcription: string,
  model: string,
  now = Date.now(),
): RecordingDoc {
  const entries = docData.entries.map((entry, index) =>
    index === 0
      ? {
          ...entry,
          transcription,
          transcribedUsingModel: model,
          status: entry.status === "transcription_error" ? "completed" : entry.status,
          error: null,
        }
      : entry,
  );

  const messages = docData.assistant_session?.messages.map((message) =>
    message.role === "user" && message.content != null
      ? { ...message, content: transcription }
      : message,
  );

  return {
    ...docData,
    updated: now,
    entries,
    ...(docData.assistant_session
      ? {
          assistant_session: {
            ...docData.assistant_session,
            title: docData.assistant_session.title ?? transcription.slice(0, 80),
            messages: messages ?? docData.assistant_session.messages,
          },
        }
      : {}),
  };
}

export function applyTranscriptionToRecording(
  recording: ParsedRecording,
  transcription: string,
  model: string,
  now = Date.now(),
): ParsedRecording {
  const raw = applyTranscriptionToDoc(recording.raw, transcription, model, now);
  return parseRecording(recording.id, raw as unknown as Record<string, unknown>);
}
