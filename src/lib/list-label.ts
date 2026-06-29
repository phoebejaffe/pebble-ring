import { EVERYTHING_LIST_ID, INBOX_LIST_ID, type ParsedList } from "../types/list";
import { ARCHIVED_LIST_TITLE } from "./archive";

export function listLabel(listId: string, lists: ParsedList[]): string {
  if (listId === INBOX_LIST_ID) return "Unlabeled";
  if (listId === EVERYTHING_LIST_ID) return "Everything";
  const list = lists.find((entry) => entry.id === listId);
  if (list) return list.title;
  if (listId.toLowerCase().includes("archived")) return ARCHIVED_LIST_TITLE;
  return "list";
}
