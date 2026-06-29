import { msToFirestore } from "./firestore-time";
import type { ParsedItem, ParsedList } from "../types/list";

export function itemToContentData(item: ParsedItem): Record<string, unknown> {
  return {
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    title: item.title,
    body: item.body,
    done: item.done,
    dueAt: item.dueAt,
    parentListIds: item.parentListIds,
    sourceRecordingId: item.sourceRecordingId,
    sourceToolCallId: item.sourceToolCallId,
    metadata: item.metadata,
    deleted: item.deleted,
  };
}

export function itemToFirestore(item: ParsedItem) {
  return {
    createdAt: msToFirestore(item.createdAt),
    updatedAt: msToFirestore(item.updatedAt),
    title: item.title,
    body: item.body,
    done: item.done,
    dueAt: item.dueAt == null ? null : msToFirestore(item.dueAt),
    parentListIds: item.parentListIds,
    sourceRecordingId: item.sourceRecordingId,
    sourceToolCallId: item.sourceToolCallId,
    metadata: item.metadata,
    deleted: item.deleted,
  };
}

export function listToContentData(list: ParsedList): Record<string, unknown> {
  return {
    title: list.title,
    icon: list.icon,
    listKind: list.listKind,
    seed: list.seed,
    deleted: list.deleted,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}
