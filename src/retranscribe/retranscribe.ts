import { updateRecordingTranscription } from "../lib/recordings-api";
import { applyTranscriptionToRecording } from "../lib/recording-transcription";
import type { GetIdToken } from "../lib/api-auth";
import type { TranscriptionSettings } from "../lib/transcription-settings";
import type { ParsedRecording } from "../types/recording";
import { resolveRecordingAudioUrl } from "./audio";
import { transcribeFromUrl } from "./assemblyai";
import type { RetranscribeError, RetranscribeResult } from "./types";

export async function retranscribeRecording(
  uid: string,
  recording: ParsedRecording,
  settings: TranscriptionSettings,
  getIdToken: GetIdToken,
): Promise<RetranscribeResult> {
  if (!recording.fileName) {
    const err: RetranscribeError = {
      code: "no_audio",
      message: "This recording has no audio file name",
    };
    throw err;
  }

  const audioUrl = await resolveRecordingAudioUrl(uid, recording.fileName, getIdToken);
  if (!audioUrl) {
    const err: RetranscribeError = {
      code: "no_audio",
      message: "Could not find audio in Firebase Storage",
    };
    throw err;
  }

  let transcription: string;
  let model: string;
  try {
    const result = await transcribeFromUrl(audioUrl, settings, getIdToken);
    transcription = result.transcription;
    model = result.model;
  } catch (error) {
    const err: RetranscribeError = {
      code: "transcribe_failed",
      message: error instanceof Error ? error.message : "Transcription failed",
    };
    throw err;
  }

  await updateRecordingTranscription(uid, recording.id, recording.raw, transcription, model);

  return {
    transcription,
    model,
    recording: applyTranscriptionToRecording(recording, transcription, model),
  };
}
