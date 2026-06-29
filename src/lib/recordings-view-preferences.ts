import { EVERYTHING_LIST_ID, INBOX_LIST_ID } from "../types/list";

export type RecordingsViewPreferences = {
  selectedListId: string;
  showArchived: boolean;
};

const STORAGE_KEY = "pebble-ring-recordings-view-preferences";

export const DEFAULT_RECORDINGS_VIEW_PREFERENCES: RecordingsViewPreferences = {
  selectedListId: EVERYTHING_LIST_ID,
  showArchived: false,
};

export type ValidListIds = {
  listIds: Set<string>;
  archivedListId: string | null;
};

export function loadRecordingsViewPreferences(): RecordingsViewPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECORDINGS_VIEW_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<RecordingsViewPreferences>;
    return {
      selectedListId:
        typeof parsed.selectedListId === "string" && parsed.selectedListId.length > 0
          ? parsed.selectedListId
          : DEFAULT_RECORDINGS_VIEW_PREFERENCES.selectedListId,
      showArchived: typeof parsed.showArchived === "boolean" ? parsed.showArchived : false,
    };
  } catch {
    return DEFAULT_RECORDINGS_VIEW_PREFERENCES;
  }
}

export function saveRecordingsViewPreferences(preferences: RecordingsViewPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function isValidSelectedListId(listId: string, valid: ValidListIds): boolean {
  if (listId === EVERYTHING_LIST_ID || listId === INBOX_LIST_ID) return true;
  if (valid.archivedListId && listId === valid.archivedListId) return true;
  return valid.listIds.has(listId);
}

export function sanitizeSelectedListId(listId: string, valid: ValidListIds): string {
  return isValidSelectedListId(listId, valid) ? listId : EVERYTHING_LIST_ID;
}
