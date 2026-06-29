import { formatLocalDateTime } from "./format-local-date";
import type { ParsedRecording } from "../types/recording";

export function recordingMatchesSearch(recording: ParsedRecording, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    recording.transcription,
    recording.title,
    formatLocalDateTime(recording.timestampMs),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}
