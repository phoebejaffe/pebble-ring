import { describe, expect, it } from "vitest";
import { EVERYTHING_LIST_ID, INBOX_LIST_ID } from "../types/list";
import { recordingMatchesSearch } from "../lib/recording-search";
import type { ParsedItem, ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";
import { itemForRecording, recordingInList } from "../types/list";

function countListsForSearch(
  recordings: ParsedRecording[],
  allItems: ParsedItem[],
  items: ParsedItem[],
  lists: ParsedList[],
  searchQuery: string,
  listFilterOptions: { archivedListId: string | null; showArchived: boolean },
): Record<string, number> {
  const counts: Record<string, number> = {
    [EVERYTHING_LIST_ID]: 0,
    [INBOX_LIST_ID]: 0,
  };
  for (const list of lists) counts[list.id] = 0;

  for (const recording of recordings) {
    if (itemForRecording(allItems, recording.id, { includeDeleted: true })?.deleted) continue;
    if (!recordingMatchesSearch(recording, searchQuery)) continue;

    if (recordingInList(items, recording.id, EVERYTHING_LIST_ID, listFilterOptions)) {
      counts[EVERYTHING_LIST_ID] += 1;
    }
    if (recordingInList(items, recording.id, INBOX_LIST_ID, listFilterOptions)) {
      counts[INBOX_LIST_ID] += 1;
    }
    for (const list of lists) {
      if (recordingInList(items, recording.id, list.id, listFilterOptions)) {
        counts[list.id] += 1;
      }
    }
  }

  return counts;
}

describe("list counts with search", () => {
  const lists: ParsedList[] = [
    {
      id: "list-shopping",
      title: "Shopping",
      icon: "🛒",
      listKind: "note",
      seed: null,
      deleted: false,
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  const recordings: ParsedRecording[] = [
    {
      id: "rec-1",
      timestampMs: 0,
      updatedMs: 0,
      title: "Milk",
      transcription: "buy milk",
      autoTranscription: "buy milk",
      userTranscription: "",
      fileName: null,
      status: "done",
      transcribedUsingModel: null,
      raw: {} as ParsedRecording["raw"],
    },
    {
      id: "rec-2",
      timestampMs: 0,
      updatedMs: 0,
      title: "Eggs",
      transcription: "buy eggs",
      autoTranscription: "buy eggs",
      userTranscription: "",
      fileName: null,
      status: "done",
      transcribedUsingModel: null,
      raw: {} as ParsedRecording["raw"],
    },
  ];

  const items: ParsedItem[] = [
    {
      id: "item-1",
      title: "buy milk",
      body: "",
      done: false,
      dueAt: null,
      parentListIds: ["list-shopping"],
      sourceRecordingId: "rec-1",
      sourceToolCallId: null,
      metadata: { type: "note" },
      deleted: false,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "item-2",
      title: "buy eggs",
      body: "",
      done: false,
      dueAt: null,
      parentListIds: [],
      sourceRecordingId: "rec-2",
      sourceToolCallId: null,
      metadata: { type: "note" },
      deleted: false,
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  it("filters LOL counts by search query", () => {
    const options = { archivedListId: null, showArchived: false };

    expect(countListsForSearch(recordings, items, items, lists, "", options)).toMatchObject({
      [EVERYTHING_LIST_ID]: 2,
      [INBOX_LIST_ID]: 1,
      "list-shopping": 1,
    });

    expect(countListsForSearch(recordings, items, items, lists, "milk", options)).toMatchObject({
      [EVERYTHING_LIST_ID]: 1,
      [INBOX_LIST_ID]: 0,
      "list-shopping": 1,
    });
  });
});
