import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addRecordingToList,
  createList,
  deleteRecordingItem,
  ensureArchivedList,
  moveRecordingBetweenLists,
  removeRecordingFromList,
} from "../lib/lists-api";
import { findArchivedList } from "../lib/archive";
import { useTranscriptionSettings } from "../contexts/TranscriptionSettingsContext";
import { retranscribeRecording } from "../retranscribe";
import type { RetranscribeError } from "../retranscribe";
import {
  parseRecording,
  sortRecordingsNewestFirst,
  type ParsedRecording,
} from "../types/recording";
import {
  EVERYTHING_LIST_ID,
  INBOX_LIST_ID,
  itemForRecording,
  listIdsForRecording,
  parseItem,
  parseList,
  recordingInList,
  sortListsByCount,
  type ParsedItem,
  type ParsedList,
} from "../types/list";
import type { PebbleContent } from "../api";
import { ListDropZone, RecordingCard } from "./RecordingCard";

type Props = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
};

function itemToContentData(item: ParsedItem): Record<string, unknown> {
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

export function RecordingsView({ uid, content, onContentChange }: Props) {
  const [selectedListId, setSelectedListId] = useState(EVERYTHING_LIST_ID);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { settings: transcriptionSettings } = useTranscriptionSettings();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const lists = useMemo(
    () => content.lists.map((l) => parseList(l.id, l.data)).filter((l) => !l.deleted),
    [content.lists],
  );

  const allItems = useMemo(
    () => content.items.map((i) => parseItem(i.id, i.data)),
    [content.items],
  );

  const items = useMemo(() => allItems.filter((i) => !i.deleted), [allItems]);

  const listById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);

  const archivedList = useMemo(() => findArchivedList(lists), [lists]);
  const archivedListId = archivedList?.id ?? null;

  const listFilterOptions = useMemo(
    () => ({ archivedListId, showArchived }),
    [archivedListId, showArchived],
  );

  const recordings = useMemo(
    () =>
      sortRecordingsNewestFirst(
        content.recordings.map((r) => parseRecording(r.id, r.data)),
      ),
    [content.recordings],
  );

  const visibleRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      if (itemForRecording(allItems, recording.id, { includeDeleted: true })?.deleted) {
        return false;
      }
      return recordingInList(items, recording.id, selectedListId, listFilterOptions);
    });
  }, [recordings, allItems, items, selectedListId, listFilterOptions]);

  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [EVERYTHING_LIST_ID]: 0,
      [INBOX_LIST_ID]: 0,
    };
    for (const list of lists) counts[list.id] = 0;

    for (const recording of recordings) {
      if (itemForRecording(allItems, recording.id, { includeDeleted: true })?.deleted) continue;

      if (recordingInList(items, recording.id, EVERYTHING_LIST_ID, listFilterOptions)) {
        counts[EVERYTHING_LIST_ID] = (counts[EVERYTHING_LIST_ID] ?? 0) + 1;
      }
      if (recordingInList(items, recording.id, INBOX_LIST_ID, listFilterOptions)) {
        counts[INBOX_LIST_ID] = (counts[INBOX_LIST_ID] ?? 0) + 1;
      }
      for (const list of lists) {
        if (recordingInList(items, recording.id, list.id, listFilterOptions)) {
          counts[list.id] = (counts[list.id] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [lists, items, allItems, recordings, listFilterOptions]);

  const sortedLists = useMemo(
    () => sortListsByCount(lists, listCounts),
    [lists, listCounts],
  );

  const draggingRecording = draggingId
    ? recordings.find((r) => r.id === draggingId) ?? null
    : null;

  function mergeItem(updatedItem: ParsedItem) {
    const without = content.items.filter((item) => item.id !== updatedItem.id);
    onContentChange({
      ...content,
      items: [...without, { id: updatedItem.id, data: itemToContentData(updatedItem) }],
    });
  }

  function updateLocalRecording(recordingId: string, updater: (r: ParsedRecording) => ParsedRecording) {
    onContentChange({
      ...content,
      recordings: content.recordings.map((r) => {
        if (r.id !== recordingId) return r;
        const parsed = parseRecording(r.id, r.data);
        const next = updater(parsed);
        return { id: r.id, data: next.raw as unknown as Record<string, unknown> };
      }),
    });
  }

  async function handleArchive(recording: ParsedRecording) {
    setBusyId(recording.id);
    setError(null);
    try {
      let targetList = archivedList;
      if (!targetList) {
        targetList = await ensureArchivedList(uid);
        onContentChange({
          ...content,
          lists: [
            ...content.lists,
            {
              id: targetList.id,
              data: {
                title: targetList.title,
                icon: targetList.icon,
                listKind: targetList.listKind,
                seed: targetList.seed,
                deleted: targetList.deleted,
                createdAt: targetList.createdAt,
                updatedAt: targetList.updatedAt,
              },
            },
          ],
        });
      }

      const existingItem = itemForRecording(allItems, recording.id, { includeDeleted: true });
      const updatedItem = await addRecordingToList(uid, recording, existingItem, targetList.id);
      mergeItem(updatedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(recording: ParsedRecording) {
    if (!window.confirm("Delete this recording? It will be removed from your Pebble lists.")) return;
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
  }

  async function handleAddToList(recording: ParsedRecording, listId: string) {
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
  }

  async function handleRemoveFromList(recording: ParsedRecording, listId: string) {
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
  }

  async function handleRetranscribe(recording: ParsedRecording) {
    setBusyId(recording.id);
    setError(null);
    try {
      const result = await retranscribeRecording(uid, recording, transcriptionSettings);
      updateLocalRecording(recording.id, (r) => ({
        ...r,
        transcription: result.transcription,
        title: result.transcription.slice(0, 80) || r.title,
        transcribedUsingModel: result.model,
        raw: {
          ...r.raw,
          updated: Date.now(),
          entries: r.raw.entries.map((entry, index) =>
            index === 0
              ? {
                  ...entry,
                  transcription: result.transcription,
                  transcribedUsingModel: result.model,
                }
              : entry,
          ),
        },
      }));
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
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const recordingId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId?.startsWith("list:")) return;

    const toListId = overId.replace("list:", "");
    const recording = recordings.find((r) => r.id === recordingId);
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
      setSelectedListId(toListId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move recording");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddList() {
    const name = window.prompt("List name");
    if (!name) return;

    setError(null);
    try {
      const list = await createList(uid, name);
      onContentChange({
        ...content,
        lists: [
          ...content.lists,
          {
            id: list.id,
            data: {
              title: list.title,
              icon: list.icon,
              listKind: list.listKind,
              seed: list.seed,
              deleted: list.deleted,
              createdAt: list.createdAt,
              updatedAt: list.updatedAt,
            },
          },
        ],
      });
      setSelectedListId(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    }
  }

  function listsForRecording(recordingId: string): ParsedList[] {
    return listIdsForRecording(items, recordingId)
      .map((id) => listById.get(id))
      .filter((list): list is ParsedList => list != null);
  }

  function availableListsForRecording(recordingId: string): ParsedList[] {
    const assigned = new Set(listIdsForRecording(items, recordingId));
    return lists.filter((list) => !assigned.has(list.id));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(e) => void handleDragEnd(e)}>
      <section className="recordings-view">
        <div className="recordings-toolbar">
          <label className="toggle compact">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Show archived
          </label>
          <button type="button" className="secondary-btn" onClick={() => void handleAddList()}>
            + List
          </button>
        </div>

        <div className="lists-row">
          <ListDropZone
            listId={EVERYTHING_LIST_ID}
            name="Everything"
            count={listCounts[EVERYTHING_LIST_ID] ?? 0}
            active={selectedListId === EVERYTHING_LIST_ID}
            droppable={false}
            onSelect={() => setSelectedListId(EVERYTHING_LIST_ID)}
          />
          {sortedLists.map((list) => (
            <ListDropZone
              key={list.id}
              listId={list.id}
              name={list.title}
              count={listCounts[list.id] ?? 0}
              active={selectedListId === list.id}
              onSelect={() => setSelectedListId(list.id)}
            />
          ))}
          <ListDropZone
            listId={INBOX_LIST_ID}
            name="Unlabeled"
            count={listCounts[INBOX_LIST_ID] ?? 0}
            active={selectedListId === INBOX_LIST_ID}
            onSelect={() => setSelectedListId(INBOX_LIST_ID)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="recordings-list">
          {visibleRecordings.length === 0 ? (
            <p className="muted empty-state">
              {selectedListId === EVERYTHING_LIST_ID
                ? "No recordings yet."
                : "No recordings in this list."}
            </p>
          ) : (
            visibleRecordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                uid={uid}
                recording={recording}
                listChips={listsForRecording(recording.id)}
                availableLists={availableListsForRecording(recording.id)}
                busy={busyId === recording.id}
                onArchive={() => void handleArchive(recording)}
                onDelete={() => void handleDelete(recording)}
                onRetranscribe={() => void handleRetranscribe(recording)}
                onAddToList={(listId) => void handleAddToList(recording, listId)}
                onRemoveFromList={(listId) => void handleRemoveFromList(recording, listId)}
              />
            ))
          )}
        </div>
      </section>

      <DragOverlay>
        {draggingRecording ? (
          <article className="recording-card dragging overlay">
            <div className="recording-body">
              <p>{draggingRecording.transcription}</p>
            </div>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
