import { updateRecordingTranscription } from "../lib/recordings-api";
import type { TranscriptionSettings } from "../lib/transcription-settings";
import type { ParsedRecording } from "../types/recording";
import { resolveRecordingAudioUrl } from "./audio";
import { transcribeFromUrl } from "./assemblyai";
import type { RetranscribeError, RetranscribeResult } from "./types";

export async function retranscribeRecording(
  uid: string,
  recording: ParsedRecording,
  settings: TranscriptionSettings,
): Promise<RetranscribeResult> {
  if (!recording.fileName) {
    const err: RetranscribeError = {
      code: "no_audio",
      message: "This recording has no audio file name",
    };
    throw err;
  }

  const audioUrl = await resolveRecordingAudioUrl(uid, recording.fileName);
  if (!audioUrl) {
    const err: RetranscribeError = {
      code: "no_audio",
      message: "Could not find audio in Firebase Storage",
    };
    throw err;
  }

  let result: RetranscribeResult;
  try {
    result = await transcribeFromUrl(audioUrl, settings);
  } catch (error) {
    const err: RetranscribeError = {
      code: "transcribe_failed",
      message: error instanceof Error ? error.message : "Transcription failed",
    };
    throw err;
  }

  await updateRecordingTranscription(
    uid,
    recording.id,
    recording.raw,
    result.transcription,
    result.model,
  );

  return result;
}
