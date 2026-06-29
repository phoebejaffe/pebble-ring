import { useMemo } from "react";
import type { PebbleContent } from "../api";
import { findArchivedList } from "../lib/archive";
import {
  EVERYTHING_LIST_ID,
  INBOX_LIST_ID,
  itemForRecording,
  listIdsForRecording,
  parseItem,
  parseList,
  recordingInList,
  sortLolLists,
  type ParsedItem,
  type ParsedList,
  type RecordingListFilterOptions,
} from "../types/list";
import {
  parseRecording,
  sortRecordingsNewestFirst,
  type ParsedRecording,
} from "../types/recording";

type Params = {
  content: PebbleContent;
  selectedListId: string;
  showArchived: boolean;
};

export function useRecordingsData({ content, selectedListId, showArchived }: Params) {
  const lists = useMemo(
    () =>
      content.lists.map((list) => parseList(list.id, list.data)).filter((list) => !list.deleted),
    [content.lists],
  );

  const allItems = useMemo(
    () => content.items.map((item) => parseItem(item.id, item.data)),
    [content.items],
  );

  const items = useMemo(() => allItems.filter((item) => !item.deleted), [allItems]);

  const listById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);

  const archivedList = useMemo(() => findArchivedList(lists), [lists]);
  const archivedListId = archivedList?.id ?? null;

  const listFilterOptions: RecordingListFilterOptions = useMemo(
    () => ({ archivedListId, showArchived }),
    [archivedListId, showArchived],
  );

  const recordings = useMemo(
    () =>
      sortRecordingsNewestFirst(
        content.recordings.map((recording) => parseRecording(recording.id, recording.data)),
      ),
    [content.recordings],
  );

  const visibleRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      if (itemForRecording(allItems, recording.id, { includeDeleted: true })?.deleted) {
        return false;
      }
      return recordingInList(items, recording.id, selectedListId, listFilterOptions);
    });
  }, [recordings, allItems, items, selectedListId, listFilterOptions]);

  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [EVERYTHING_LIST_ID]: 0,
      [INBOX_LIST_ID]: 0,
    };
    for (const list of lists) counts[list.id] = 0;

    for (const recording of recordings) {
      if (itemForRecording(allItems, recording.id, { includeDeleted: true })?.deleted) continue;

      if (recordingInList(items, recording.id, EVERYTHING_LIST_ID, listFilterOptions)) {
        counts[EVERYTHING_LIST_ID] = (counts[EVERYTHING_LIST_ID] ?? 0) + 1;
      }
      if (recordingInList(items, recording.id, INBOX_LIST_ID, listFilterOptions)) {
        counts[INBOX_LIST_ID] = (counts[INBOX_LIST_ID] ?? 0) + 1;
      }
      for (const list of lists) {
        if (recordingInList(items, recording.id, list.id, listFilterOptions)) {
          counts[list.id] = (counts[list.id] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [lists, items, allItems, recordings, listFilterOptions]);

  const lolLists = useMemo(
    () => sortLolLists(lists, listCounts, archivedListId),
    [lists, listCounts, archivedListId],
  );

  function listsForRecording(recordingId: string): ParsedList[] {
    return listIdsForRecording(items, recordingId)
      .map((id) => listById.get(id))
      .filter((list): list is ParsedList => list != null);
  }

  function availableListsForRecording(recordingId: string): ParsedList[] {
    const assigned = new Set(listIdsForRecording(items, recordingId));
    return lists.filter((list) => !assigned.has(list.id));
  }

  return {
    lists,
    allItems,
    items,
    listById,
    archivedList,
    recordings,
    visibleRecordings,
    listCounts,
    lolLists,
    listsForRecording,
    availableListsForRecording,
  };
}

export type { ParsedItem, ParsedList, ParsedRecording };
