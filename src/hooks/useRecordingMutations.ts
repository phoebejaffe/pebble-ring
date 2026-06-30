import { useCallback, useEffect, useRef, useState } from "react";
import type { PebbleContent } from "../api";
import { ARCHIVED_LIST_TITLE } from "../lib/archive";
import type { GetIdToken } from "../lib/api-auth";
import { snapshotItemState } from "../lib/item-undo";
import {
  addRecordingToList,
  deleteRecordingItem,
  moveRecordingBetweenLists,
  removeRecordingFromList,
  restoreRecordingItem,
} from "../lib/items-api";
import { listLabel } from "../lib/list-label";
import { createList, ensureArchivedList } from "../lib/lists-api";
import {
  addListToContent,
  mergeItemInContent,
  updateRecordingInContent,
} from "../lib/pebble-content";
import { updateRecordingTranscription } from "../lib/recordings-api";
import { applyTranscriptionToRecording } from "../lib/recording-transcription";
import type { TranscriptionSettings } from "../lib/transcription-settings";
import { retranscribeRecording } from "../retranscribe";
import type { RetranscribeError } from "../retranscribe";
import { itemForRecording, type ParsedItem, type ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";

type ShowUndo = (message: string, onUndo: () => Promise<void>) => void;

type Params = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
  allItems: ParsedItem[];
  items: ParsedItem[];
  lists: ParsedList[];
  recordings: ParsedRecording[];
  archivedList: ParsedList | null;
  transcriptionSettings: TranscriptionSettings;
  selectedListId: string;
  onSelectList: (listId: string) => void;
  getIdToken: GetIdToken;
  showUndo: ShowUndo;
};

export function useRecordingMutations({
  uid,
  content,
  onContentChange,
  allItems,
  items,
  lists,
  recordings,
  archivedList,
  transcriptionSettings,
  selectedListId,
  onSelectList,
  getIdToken,
  showUndo,
}: Params) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef(content);
  const allItemsRef = useRef(allItems);

  useEffect(() => {
    contentRef.current = content;
    allItemsRef.current = allItems;
  }, [allItems, content]);

  const mergeItem = useCallback(
    (updatedItem: ParsedItem) => {
      onContentChange(mergeItemInContent(contentRef.current, updatedItem));
    },
    [onContentChange],
  );

  const registerItemUndo = useCallback(
    (
      message: string,
      snapshot: ReturnType<typeof snapshotItemState>,
      itemAfterChange: ParsedItem,
      onRestored?: () => void,
    ) => {
      showUndo(message, async () => {
        setError(null);
        const restored = await restoreRecordingItem(uid, itemAfterChange, snapshot);
        onContentChange(mergeItemInContent(contentRef.current, restored));
        onRestored?.();
      });
    },
    [onContentChange, showUndo, uid],
  );

  const handleArchive = useCallback(
    async (recording: ParsedRecording) => {
      setBusyId(recording.id);
      setError(null);
      try {
        const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
        const snapshot = snapshotItemState(existingItem);

        let targetList = archivedList;
        let nextContent = content;
        if (!targetList) {
          targetList = await ensureArchivedList(uid);
          nextContent = addListToContent(content, targetList);
          onContentChange(nextContent);
        }

        const updatedItem = await addRecordingToList(uid, recording, existingItem, targetList.id);
        onContentChange(mergeItemInContent(nextContent, updatedItem));

        registerItemUndo(`Item moved to ${ARCHIVED_LIST_TITLE}`, snapshot, updatedItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to archive");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, archivedList, content, onContentChange, registerItemUndo, uid],
  );

  const handleDelete = useCallback(
    async (recording: ParsedRecording) => {
      setBusyId(recording.id);
      setError(null);
      try {
        const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
        const snapshot = snapshotItemState(existingItem);
        const updatedItem = await deleteRecordingItem(uid, recording, existingItem);
        mergeItem(updatedItem);
        registerItemUndo("Item deleted", snapshot, updatedItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, mergeItem, registerItemUndo, uid],
  );

  const handleAddToList = useCallback(
    async (recording: ParsedRecording, listId: string) => {
      setBusyId(recording.id);
      setError(null);
      try {
        const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
        const updatedItem = await addRecordingToList(uid, recording, existingItem, listId);
        mergeItem(updatedItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add to list");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, mergeItem, uid],
  );

  const handleRemoveFromList = useCallback(
    async (recording: ParsedRecording, listId: string) => {
      const existingItem = itemForRecording(items, recording.id);
      if (!existingItem) return;

      setBusyId(recording.id);
      setError(null);
      try {
        const updatedItem = await removeRecordingFromList(uid, existingItem, listId);
        mergeItem(updatedItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove from list");
      } finally {
        setBusyId(null);
      }
    },
    [items, mergeItem, uid],
  );

  const handleRetranscribe = useCallback(
    async (recording: ParsedRecording) => {
      setBusyId(recording.id);
      setError(null);
      try {
        const result = await retranscribeRecording(
          uid,
          recording,
          transcriptionSettings,
          getIdToken,
        );
        onContentChange(
          updateRecordingInContent(contentRef.current, recording.id, result.recording),
        );
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as RetranscribeError).message)
            : err instanceof Error
              ? err.message
              : "Retranscribe failed";
        setError(message);
      } finally {
        setBusyId(null);
      }
    },
    [getIdToken, onContentChange, transcriptionSettings, uid],
  );

  const handleUpdateTranscription = useCallback(
    async (recording: ParsedRecording, transcription: string) => {
      setBusyId(recording.id);
      setError(null);
      try {
        const model = recording.transcribedUsingModel ?? "user-edited";
        await updateRecordingTranscription(uid, recording.id, recording.raw, transcription, model);
        onContentChange(
          updateRecordingInContent(
            contentRef.current,
            recording.id,
            applyTranscriptionToRecording(recording, transcription, model),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update transcription");
      } finally {
        setBusyId(null);
      }
    },
    [onContentChange, uid],
  );

  const handleMoveToList = useCallback(
    async (recordingId: string, toListId: string) => {
      if (toListId === selectedListId) return;

      const recording = recordings.find((entry) => entry.id === recordingId);
      if (!recording) return;

      setBusyId(recordingId);
      setError(null);
      try {
        const existingItem = itemForRecording(allItems, recordingId, { includeDeleted: true });
        const snapshot = snapshotItemState(existingItem);
        const previousListId = selectedListId;

        const updatedItem = await moveRecordingBetweenLists(
          uid,
          recording,
          existingItem,
          selectedListId,
          toListId,
        );
        mergeItem(updatedItem);
        onSelectList(toListId);

        registerItemUndo(`Item moved to ${listLabel(toListId, lists)}`, snapshot, updatedItem, () =>
          onSelectList(previousListId),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move recording");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, lists, mergeItem, onSelectList, recordings, registerItemUndo, selectedListId, uid],
  );

  const handleCreateList = useCallback(
    async (name: string) => {
      setError(null);
      try {
        const list = await createList(uid, name);
        onContentChange(addListToContent(contentRef.current, list));
        onSelectList(list.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create list");
      }
    },
    [onContentChange, onSelectList, uid],
  );

  return {
    busyId,
    error,
    handleArchive,
    handleDelete,
    handleAddToList,
    handleRemoveFromList,
    handleRetranscribe,
    handleUpdateTranscription,
    handleMoveToList,
    handleCreateList,
  };
}
