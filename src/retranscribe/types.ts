export type RetranscribeResult = {
  transcription: string;
  model: string;
};

export type RetranscribeError = {
  code: "no_audio" | "transcribe_failed" | "not_configured";
  message: string;
};
