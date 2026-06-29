import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import { msToFirestore } from "./firestore-time";
import type { ParsedList } from "../types/list";
import { ARCHIVED_LIST_TITLE } from "./archive";

function newDocId(uid: string, kind: "items" | "lists"): string {
  const path = kind === "items" ? firestorePaths.items(uid) : firestorePaths.lists(uid);
  return doc(collection(db, path)).id;
}

export async function createList(uid: string, title: string): Promise<ParsedList> {
  const now = Date.now();
  const id = newDocId(uid, "lists");
  const list: ParsedList = {
    id,
    title: title.trim() || "New list",
    icon: "📝",
    listKind: "note",
    seed: null,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, firestorePaths.lists(uid), id), {
    createdAt: msToFirestore(now),
    updatedAt: msToFirestore(now),
    title: list.title,
    icon: list.icon,
    listKind: list.listKind,
    seed: null,
    deleted: false,
  });

  return list;
}

export async function ensureArchivedList(uid: string): Promise<ParsedList> {
  const now = Date.now();
  const id = newDocId(uid, "lists");
  const list: ParsedList = {
    id,
    title: ARCHIVED_LIST_TITLE,
    icon: "📦",
    listKind: "note",
    seed: null,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, firestorePaths.lists(uid), id), {
    createdAt: msToFirestore(now),
    updatedAt: msToFirestore(now),
    title: list.title,
    icon: list.icon,
    listKind: list.listKind,
    seed: null,
    deleted: false,
  });

  return list;
}

export {
  addRecordingToList,
  deleteRecordingItem,
  moveRecordingBetweenLists,
  removeRecordingFromList,
} from "./items-api";
