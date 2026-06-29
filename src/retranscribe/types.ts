import type { ParsedRecording } from "../types/recording";

export type RetranscribeResult = {
  transcription: string;
  model: string;
  recording: ParsedRecording;
};

export type RetranscribeError = {
  code: "no_audio" | "transcribe_failed" | "not_configured";
  message: string;
};
