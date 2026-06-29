import { beforeEach, describe, expect, it } from "vitest";
import { EVERYTHING_LIST_ID, INBOX_LIST_ID } from "../types/list";
import {
  DEFAULT_RECORDINGS_VIEW_PREFERENCES,
  loadRecordingsViewPreferences,
  sanitizeSelectedListId,
  saveRecordingsViewPreferences,
} from "./recordings-view-preferences";

describe("recordings-view-preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(loadRecordingsViewPreferences()).toEqual(DEFAULT_RECORDINGS_VIEW_PREFERENCES);
  });

  it("loads and saves preferences", () => {
    saveRecordingsViewPreferences({
      selectedListId: "list-shopping",
      showArchived: true,
    });

    expect(loadRecordingsViewPreferences()).toEqual({
      selectedListId: "list-shopping",
      showArchived: true,
    });
  });

  it("keeps pseudo list ids valid", () => {
    const valid = { listIds: new Set<string>(), archivedListId: null };

    expect(sanitizeSelectedListId(EVERYTHING_LIST_ID, valid)).toBe(EVERYTHING_LIST_ID);
    expect(sanitizeSelectedListId(INBOX_LIST_ID, valid)).toBe(INBOX_LIST_ID);
  });

  it("resets unknown list ids to Everything", () => {
    const valid = {
      listIds: new Set(["list-shopping"]),
      archivedListId: "list-archived",
    };

    expect(sanitizeSelectedListId("list-shopping", valid)).toBe("list-shopping");
    expect(sanitizeSelectedListId("list-archived", valid)).toBe("list-archived");
    expect(sanitizeSelectedListId("list-deleted", valid)).toBe(EVERYTHING_LIST_ID);
  });
});
