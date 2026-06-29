import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import { msToFirestore } from "./firestore-time";
import { itemToFirestore } from "./firestore-serialize";
import { computeParentListIds } from "./list-move";
import type { ParsedItem } from "../types/list";
import type { ParsedRecording } from "../types/recording";

function newItemId(uid: string): string {
  return doc(collection(db, firestorePaths.items(uid))).id;
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
  const parentListIds = computeParentListIds(
    existingItem?.parentListIds ?? [],
    fromListId,
    toListId,
  );
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

export async function restoreRecordingItem(
  uid: string,
  currentItem: ParsedItem,
  snapshot: { parentListIds: string[]; deleted: boolean },
): Promise<ParsedItem> {
  const now = Date.now();
  const updated: ParsedItem = {
    ...currentItem,
    parentListIds: [...snapshot.parentListIds],
    deleted: snapshot.deleted,
    updatedAt: now,
  };

  await updateDoc(doc(db, firestorePaths.items(uid), currentItem.id), {
    parentListIds: snapshot.parentListIds,
    deleted: snapshot.deleted,
    updatedAt: msToFirestore(now),
  });

  return updated;
}
