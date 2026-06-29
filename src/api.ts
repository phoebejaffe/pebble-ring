import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { firestorePaths } from "./config";

export type PebbleContent = {
  uid: string;
  recordings: Array<{ id: string; data: Record<string, unknown> }>;
  items: Array<{ id: string; data: Record<string, unknown> }>;
  lists: Array<{ id: string; data: Record<string, unknown> }>;
  user: Record<string, unknown> | null;
};

async function fetchCollection(path: string) {
  const snap = await getDocs(collection(db, path));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

export async function fetchPebbleContent(uid: string): Promise<PebbleContent> {
  const [recordings, items, lists, userSnap] = await Promise.all([
    fetchCollection(firestorePaths.recordings(uid)),
    fetchCollection(firestorePaths.items(uid)),
    fetchCollection(firestorePaths.lists(uid)),
    getDoc(doc(db, firestorePaths.user(uid))),
  ]);

  return {
    uid,
    recordings,
    items,
    lists,
    user: userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null,
  };
}
