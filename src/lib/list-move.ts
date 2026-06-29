import { EVERYTHING_LIST_ID, INBOX_LIST_ID } from "../types/list";

export function computeParentListIds(
  existingParentListIds: string[],
  fromListId: string,
  toListId: string,
): string[] {
  if (toListId === INBOX_LIST_ID) {
    return [];
  }

  let parentListIds = [...existingParentListIds];

  if (fromListId !== INBOX_LIST_ID && fromListId !== EVERYTHING_LIST_ID) {
    parentListIds = parentListIds.filter((id) => id !== fromListId);
  }

  if (!parentListIds.includes(toListId)) {
    parentListIds.push(toListId);
  }

  return parentListIds;
}
