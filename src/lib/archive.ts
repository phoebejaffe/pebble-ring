import {
  listIdsForRecording,
  type ParsedItem,
  type ParsedList,
} from "../types/list";

export const ARCHIVED_LIST_TITLE = "Archived";

export function findArchivedList(lists: ParsedList[]): ParsedList | null {
  return (
    lists.find((list) => list.title.toLowerCase() === ARCHIVED_LIST_TITLE.toLowerCase()) ??
    null
  );
}

export function isRecordingArchived(
  items: ParsedItem[],
  recordingId: string,
  archivedListId: string | null,
): boolean {
  if (!archivedListId) return false;
  return listIdsForRecording(items, recordingId).includes(archivedListId);
}
