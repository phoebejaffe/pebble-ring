import { firestoreToMs } from "../lib/firestore-time";

export const INBOX_LIST_ID = "__inbox__";
export const EVERYTHING_LIST_ID = "__everything__";

export type ListKind = "note" | "checklist" | "bullets";

export type ParsedList = {
  id: string;
  title: string;
  icon: string;
  listKind: ListKind;
  seed: string | null;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ItemMetadata = {
  type: string;
  [key: string]: unknown;
};

export type ParsedItem = {
  id: string;
  title: string;
  body: string;
  done: boolean;
  dueAt: number | null;
  parentListIds: string[];
  sourceRecordingId: string | null;
  sourceToolCallId: string | null;
  metadata: ItemMetadata;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
};

export function parseList(id: string, data: Record<string, unknown>): ParsedList {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled list",
    icon: typeof data.icon === "string" ? data.icon : "📝",
    listKind: (typeof data.listKind === "string" ? data.listKind : "note") as ListKind,
    seed: typeof data.seed === "string" ? data.seed : null,
    deleted: !!data.deleted,
    createdAt: firestoreToMs(data.createdAt),
    updatedAt: firestoreToMs(data.updatedAt),
  };
}

export function parseItem(id: string, data: Record<string, unknown>): ParsedItem {
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as ItemMetadata)
      : { type: "note" };

  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    done: !!data.done,
    dueAt: data.dueAt == null ? null : firestoreToMs(data.dueAt),
    parentListIds: Array.isArray(data.parentListIds)
      ? data.parentListIds.filter((id): id is string => typeof id === "string")
      : [],
    sourceRecordingId:
      typeof data.sourceRecordingId === "string" ? data.sourceRecordingId : null,
    sourceToolCallId:
      typeof data.sourceToolCallId === "string" ? data.sourceToolCallId : null,
    metadata: { ...metadata, type: metadata.type ?? "note" },
    deleted: !!data.deleted,
    createdAt: firestoreToMs(data.createdAt),
    updatedAt: firestoreToMs(data.updatedAt),
  };
}

export function sortLists(lists: ParsedList[]): ParsedList[] {
  return [...lists]
    .filter((list) => !list.deleted)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function sortListsByCount(
  lists: ParsedList[],
  counts: Record<string, number>,
): ParsedList[] {
  return [...lists]
    .filter((list) => !list.deleted)
    .sort((a, b) => {
      const countDiff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
      if (countDiff !== 0) return countDiff;
      return a.title.localeCompare(b.title);
    });
}

export function itemForRecording(
  items: ParsedItem[],
  recordingId: string,
  { includeDeleted = false } = {},
): ParsedItem | null {
  return (
    items.find(
      (item) =>
        item.sourceRecordingId === recordingId && (includeDeleted || !item.deleted),
    ) ?? null
  );
}

export function listIdsForRecording(items: ParsedItem[], recordingId: string): string[] {
  const item = itemForRecording(items, recordingId);
  return item?.parentListIds ?? [];
}

export type RecordingListFilterOptions = {
  archivedListId?: string | null;
  showArchived?: boolean;
};

export function recordingInList(
  items: ParsedItem[],
  recordingId: string,
  listId: string,
  { archivedListId = null, showArchived = false }: RecordingListFilterOptions = {},
): boolean {
  const archived =
    archivedListId != null &&
    listIdsForRecording(items, recordingId).includes(archivedListId);

  if (!showArchived && archived && listId !== archivedListId) {
    return false;
  }

  if (listId === EVERYTHING_LIST_ID) return true;
  if (listId === INBOX_LIST_ID) {
    const item = itemForRecording(items, recordingId);
    return !item || item.parentListIds.length === 0;
  }
  return listIdsForRecording(items, recordingId).includes(listId);
}
