import type { PebbleContent } from "../api";
import { parseRecording, type ParsedRecording } from "../types/recording";
import type { ParsedItem, ParsedList } from "../types/list";
import { itemToContentData, listToContentData } from "./firestore-serialize";

export function mergeItemInContent(content: PebbleContent, updatedItem: ParsedItem): PebbleContent {
  const without = content.items.filter((item) => item.id !== updatedItem.id);
  return {
    ...content,
    items: [...without, { id: updatedItem.id, data: itemToContentData(updatedItem) }],
  };
}

export function addListToContent(content: PebbleContent, list: ParsedList): PebbleContent {
  return {
    ...content,
    lists: [...content.lists, { id: list.id, data: listToContentData(list) }],
  };
}

export function updateRecordingInContent(
  content: PebbleContent,
  recordingId: string,
  next: ParsedRecording,
): PebbleContent {
  return {
    ...content,
    recordings: content.recordings.map((recording) =>
      recording.id === recordingId
        ? { id: recording.id, data: next.raw as unknown as Record<string, unknown> }
        : recording,
    ),
  };
}

export function parseRecordingFromContent(
  content: PebbleContent,
  recordingId: string,
): ParsedRecording | null {
  const raw = content.recordings.find((recording) => recording.id === recordingId);
  if (!raw) return null;
  return parseRecording(raw.id, raw.data);
}
