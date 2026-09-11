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

/**
 * Persists a user-edited transcription without destroying the automatic
 * transcription. The edit is stored on the assistant-session user message
 * (the override layer parsed by {@link parseRecording}), leaving the first
 * entry's auto transcription intact so an empty `userTranscription` erases the
 * override and reveals the auto transcription again.
 *
 * When a recording has no assistant-session user message there is no separate
 * override layer, so the edit falls back to the first entry.
 */
export function applyUserTranscriptionToDoc(
  docData: RecordingDoc,
  userTranscription: string,
  now = Date.now(),
): RecordingDoc {
  const session = docData.assistant_session;
  const hasUserMessage = session?.messages.some((message) => message.role === "user") ?? false;

  if (session && hasUserMessage) {
    let replaced = false;
    const messages = session.messages.map((message) => {
      if (!replaced && message.role === "user") {
        replaced = true;
        return { ...message, content: userTranscription };
      }
      return message;
    });

    return {
      ...docData,
      updated: now,
      assistant_session: { ...session, messages },
    };
  }

  const entries = docData.entries.map((entry, index) =>
    index === 0 ? { ...entry, transcription: userTranscription } : entry,
  );

  return {
    ...docData,
    updated: now,
    entries,
  };
}

export function applyUserTranscriptionToRecording(
  recording: ParsedRecording,
  userTranscription: string,
  now = Date.now(),
): ParsedRecording {
  const raw = applyUserTranscriptionToDoc(recording.raw, userTranscription, now);
  return parseRecording(recording.id, raw as unknown as Record<string, unknown>);
}
