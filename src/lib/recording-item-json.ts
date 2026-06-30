import type { PebbleContent } from "../api";
import type { ParsedRecording } from "../types/recording";

export type RecordingItemJson = {
  recording: { id: string; data: Record<string, unknown> };
  item: { id: string; data: Record<string, unknown> } | null;
};

export function buildRecordingItemJson(
  content: PebbleContent,
  recording: ParsedRecording,
): RecordingItemJson {
  const recordingEntry = content.recordings.find((entry) => entry.id === recording.id);
  const itemEntry =
    content.items.find((entry) => entry.data.sourceRecordingId === recording.id) ?? null;

  return {
    recording: recordingEntry ?? {
      id: recording.id,
      data: recording.raw as unknown as Record<string, unknown>,
    },
    item: itemEntry,
  };
}
