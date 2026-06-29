export type ItemUndoSnapshot = {
  parentListIds: string[];
  deleted: boolean;
};

export function snapshotItemState(
  item: { parentListIds: string[]; deleted: boolean } | null,
): ItemUndoSnapshot {
  if (!item) {
    return { parentListIds: [], deleted: false };
  }
  return {
    parentListIds: [...item.parentListIds],
    deleted: item.deleted,
  };
}
