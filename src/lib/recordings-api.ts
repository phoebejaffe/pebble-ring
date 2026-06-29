import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import type { RecordingDoc } from "../types/recording";

export async function updateRecordingTranscription(
  uid: string,
  recordingId: string,
  docData: RecordingDoc,
  transcription: string,
  model: string,
): Promise<void> {
  const now = Date.now();
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

  await updateDoc(doc(db, firestorePaths.recordings(uid), recordingId), {
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
  });
}
