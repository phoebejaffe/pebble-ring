import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import { msToFirestore } from "./firestore-time";
import type { ParsedItem } from "../types/list";
import { INBOX_LIST_ID, EVERYTHING_LIST_ID } from "../types/list";
import type { ParsedRecording } from "../types/recording";

function newItemId(uid: string): string {
  return doc(collection(db, firestorePaths.items(uid))).id;
}

function itemToFirestore(item: ParsedItem) {
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

function blankItem(recording: ParsedRecording, parentListIds: string[], id: string): ParsedItem {
  const now = Date.now();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    title: recording.transcription.trim() || "Recording",
    body: "",
    done: false,
    dueAt: null,
    parentListIds,
    sourceRecordingId: recording.id,
    sourceToolCallId: null,
    metadata: { type: "note" },
    deleted: false,
  };
}

async function upsertRecordingItem(
  uid: string,
  recording: ParsedRecording,
  existingItem: ParsedItem | null,
  parentListIds: string[],
): Promise<ParsedItem> {
  const now = Date.now();

  if (existingItem) {
    const updated: ParsedItem = {
      ...existingItem,
      parentListIds,
      updatedAt: now,
      deleted: false,
    };
    await updateDoc(doc(db, firestorePaths.items(uid), existingItem.id), {
      parentListIds,
      updatedAt: msToFirestore(now),
      deleted: false,
    });
    return updated;
  }

  const item = blankItem(recording, parentListIds, newItemId(uid));
  await setDoc(doc(db, firestorePaths.items(uid), item.id), itemToFirestore(item));
  return item;
}

export async function moveRecordingBetweenLists(
  uid: string,
  recording: ParsedRecording,
  existingItem: ParsedItem | null,
  fromListId: string,
  toListId: string,
): Promise<ParsedItem> {
  let parentListIds = existingItem ? [...existingItem.parentListIds] : [];

  if (toListId === INBOX_LIST_ID) {
    parentListIds = [];
  } else {
    if (fromListId !== INBOX_LIST_ID && fromListId !== EVERYTHING_LIST_ID) {
      parentListIds = parentListIds.filter((id) => id !== fromListId);
    }

    if (!parentListIds.includes(toListId)) {
      parentListIds.push(toListId);
    }
  }

  return upsertRecordingItem(uid, recording, existingItem, parentListIds);
}

export async function addRecordingToList(
  uid: string,
  recording: ParsedRecording,
  existingItem: ParsedItem | null,
  listId: string,
): Promise<ParsedItem> {
  const parentListIds = existingItem ? [...existingItem.parentListIds] : [];
  if (!parentListIds.includes(listId)) parentListIds.push(listId);
  return upsertRecordingItem(uid, recording, existingItem, parentListIds);
}

export async function removeRecordingFromList(
  uid: string,
  item: ParsedItem,
  listId: string,
): Promise<ParsedItem> {
  const now = Date.now();
  const parentListIds = item.parentListIds.filter((id) => id !== listId);
  const updated: ParsedItem = { ...item, parentListIds, updatedAt: now };
  await updateDoc(doc(db, firestorePaths.items(uid), item.id), {
    parentListIds,
    updatedAt: msToFirestore(now),
  });
  return updated;
}

export async function deleteRecordingItem(
  uid: string,
  recording: ParsedRecording,
  existingItem: ParsedItem | null,
): Promise<ParsedItem> {
  const now = Date.now();

  if (existingItem) {
    const updated: ParsedItem = { ...existingItem, deleted: true, updatedAt: now };
    await updateDoc(doc(db, firestorePaths.items(uid), existingItem.id), {
      deleted: true,
      updatedAt: msToFirestore(now),
    });
    return updated;
  }

  const item: ParsedItem = {
    ...blankItem(recording, [], newItemId(uid)),
    deleted: true,
    updatedAt: now,
  };
  await setDoc(doc(db, firestorePaths.items(uid), item.id), itemToFirestore(item));
  return item;
}
