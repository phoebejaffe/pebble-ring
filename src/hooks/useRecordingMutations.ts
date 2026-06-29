import { useCallback, useState } from "react";
import type { PebbleContent } from "../api";
import {
  addRecordingToList,
  deleteRecordingItem,
  moveRecordingBetweenLists,
  removeRecordingFromList,
} from "../lib/items-api";
import { createList, ensureArchivedList } from "../lib/lists-api";
import { addListToContent, mergeItemInContent, updateRecordingInContent } from "../lib/pebble-content";
import type { TranscriptionSettings } from "../lib/transcription-settings";
import { retranscribeRecording } from "../retranscribe";
import type { RetranscribeError } from "../retranscribe";
import { itemForRecording, type ParsedItem, type ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";

type Params = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
  allItems: ParsedItem[];
  items: ParsedItem[];
  recordings: ParsedRecording[];
  archivedList: ParsedList | null;
  transcriptionSettings: TranscriptionSettings;
  selectedListId: string;
  onSelectList: (listId: string) => void;
};

export function useRecordingMutations({
  uid,
  content,
  onContentChange,
  allItems,
  items,
  recordings,
  archivedList,
  transcriptionSettings,
  selectedListId,
  onSelectList,
}: Params) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mergeItem = useCallback(
    (updatedItem: ParsedItem) => {
      onContentChange(mergeItemInContent(content, updatedItem));
    },
    [content, onContentChange],
  );

  const handleArchive = useCallback(
    async (recording: ParsedRecording) => {
      setBusyId(recording.id);
      setError(null);
      try {
        let targetList = archivedList;
        let nextContent = content;
        if (!targetList) {
          targetList = await ensureArchivedList(uid);
          nextContent = addListToContent(content, targetList);
          onContentChange(nextContent);
        }

        const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
        const updatedItem = await addRecordingToList(uid, recording, existingItem, targetList.id);
        onContentChange(mergeItemInContent(nextContent, updatedItem));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to archive");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, archivedList, content, onContentChange, uid],
  );

  const handleDelete = useCallback(
    async (recording: ParsedRecording) => {
      if (!window.confirm("Delete this recording? It will be removed from your Pebble lists.")) {
        return;
      }
      setBusyId(recording.id);
      setError(null);
      try {
        const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
        const updatedItem = await deleteRecordingItem(uid, recording, existingItem);
        mergeItem(updatedItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, mergeItem, uid],
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
        const result = await retranscribeRecording(uid, recording, transcriptionSettings);
        onContentChange(updateRecordingInContent(content, recording.id, result.recording));
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
    [content, onContentChange, transcriptionSettings, uid],
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
        const updatedItem = await moveRecordingBetweenLists(
          uid,
          recording,
          existingItem,
          selectedListId,
          toListId,
        );
        mergeItem(updatedItem);
        onSelectList(toListId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move recording");
      } finally {
        setBusyId(null);
      }
    },
    [allItems, mergeItem, onSelectList, recordings, selectedListId, uid],
  );

  const handleAddList = useCallback(async () => {
    const name = window.prompt("List name");
    if (!name) return;

    setError(null);
    try {
      const list = await createList(uid, name);
      onContentChange(addListToContent(content, list));
      onSelectList(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    }
  }, [content, onContentChange, onSelectList, uid]);

  return {
    busyId,
    error,
    handleArchive,
    handleDelete,
    handleAddToList,
    handleRemoveFromList,
    handleRetranscribe,
    handleMoveToList,
    handleAddList,
  };
}
