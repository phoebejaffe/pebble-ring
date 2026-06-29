import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import { applyTranscriptionToDoc } from "./recording-transcription";
import type { RecordingDoc } from "../types/recording";

export async function updateRecordingTranscription(
  uid: string,
  recordingId: string,
  docData: RecordingDoc,
  transcription: string,
  model: string,
): Promise<void> {
  const updated = applyTranscriptionToDoc(docData, transcription, model);
  await updateDoc(doc(db, firestorePaths.recordings(uid), recordingId), {
    updated: updated.updated,
    entries: updated.entries,
    ...(updated.assistant_session ? { assistant_session: updated.assistant_session } : {}),
  });
}
