import { describe, expect, it } from "vitest";
import { EVERYTHING_LIST_ID, INBOX_LIST_ID, recordingInList, type ParsedItem } from "./list";

const archivedListId = "list-archived";
const shoppingListId = "list-shopping";

function item(recordingId: string, parentListIds: string[]): ParsedItem {
  return {
    id: `item-${recordingId}`,
    title: "Recording",
    body: "",
    done: false,
    dueAt: null,
    parentListIds,
    sourceRecordingId: recordingId,
    sourceToolCallId: null,
    metadata: { type: "note" },
    deleted: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("recordingInList", () => {
  const items = [
    item("rec-unlabeled", []),
    item("rec-shopping", [shoppingListId]),
    item("rec-archived", [archivedListId, shoppingListId]),
  ];

  it("includes all non-deleted recordings in Everything by default", () => {
    expect(recordingInList(items, "rec-shopping", EVERYTHING_LIST_ID)).toBe(true);
  });

  it("hides archived recordings from Everything unless showArchived is on", () => {
    expect(
      recordingInList(items, "rec-archived", EVERYTHING_LIST_ID, {
        archivedListId,
        showArchived: false,
      }),
    ).toBe(false);

    expect(
      recordingInList(items, "rec-archived", EVERYTHING_LIST_ID, {
        archivedListId,
        showArchived: true,
      }),
    ).toBe(true);
  });

  it("still shows archived recordings in the Archived list", () => {
    expect(
      recordingInList(items, "rec-archived", archivedListId, {
        archivedListId,
        showArchived: false,
      }),
    ).toBe(true);
  });

  it("treats empty parentListIds as Unlabeled", () => {
    expect(recordingInList(items, "rec-unlabeled", INBOX_LIST_ID)).toBe(true);
    expect(recordingInList(items, "rec-shopping", INBOX_LIST_ID)).toBe(false);
  });

  it("matches explicit list membership", () => {
    expect(recordingInList(items, "rec-shopping", shoppingListId)).toBe(true);
    expect(recordingInList(items, "rec-unlabeled", shoppingListId)).toBe(false);
  });
});
