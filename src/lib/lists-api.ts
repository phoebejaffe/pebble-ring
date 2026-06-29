import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { firestorePaths } from "../config";
import { msToFirestore } from "./firestore-time";
import { ARCHIVED_LIST_TITLE } from "./archive";
import type { ParsedList } from "../types/list";

function newListId(uid: string): string {
  return doc(collection(db, firestorePaths.lists(uid))).id;
}

type CreateListOptions = {
  icon?: string;
  defaultTitle?: string;
};

export async function createList(
  uid: string,
  title: string,
  { icon = "📝", defaultTitle = "New list" }: CreateListOptions = {},
): Promise<ParsedList> {
  const now = Date.now();
  const id = newListId(uid);
  const list: ParsedList = {
    id,
    title: title.trim() || defaultTitle,
    icon,
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
  return createList(uid, ARCHIVED_LIST_TITLE, {
    icon: "📦",
    defaultTitle: ARCHIVED_LIST_TITLE,
  });
}
