import { useEffect, useState, type MouseEvent } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { EVERYTHING_LIST_ID } from "../types/list";
import type { PebbleContent } from "../api";
import { useAuth } from "../auth";
import { useTranscriptionSettings } from "../contexts/TranscriptionSettingsContext";
import { useUndoToast } from "../hooks/useUndoToast";
import { listDropCollisionDetection, useListDnD } from "../hooks/useListDnD";
import { useRecordingMutations } from "../hooks/useRecordingMutations";
import { useRecordingsData } from "../hooks/useRecordingsData";
import {
  loadRecordingsViewPreferences,
  saveRecordingsViewPreferences,
  sanitizeSelectedListId,
} from "../lib/recordings-view-preferences";
import type { ParsedRecording } from "../types/recording";
import { buildRecordingItemJson } from "../lib/recording-item-json";
import { formatLocalDateTime } from "../lib/format-local-date";
import { ConfirmDialog } from "./ConfirmDialog";
import { JsonModal } from "./JsonModal";
import { Lol } from "./Lol";
import { PromptDialog } from "./PromptDialog";
import { RecordingCard } from "./RecordingCard";
import { RecordingsToolbar } from "./RecordingsToolbar";
import { UndoToastStack } from "./UndoToastStack";

type Props = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
};

export function RecordingsView({ uid, content, onContentChange }: Props) {
  const [selectedListId, setSelectedListId] = useState(
    () => loadRecordingsViewPreferences().selectedListId,
  );
  const [showArchived, setShowArchived] = useState(
    () => loadRecordingsViewPreferences().showArchived,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ParsedRecording | null>(null);
  const [jsonTarget, setJsonTarget] = useState<ParsedRecording | null>(null);
  const [addListOpen, setAddListOpen] = useState(false);
  const [addListForRecording, setAddListForRecording] = useState<ParsedRecording | null>(null);

  const { getIdToken } = useAuth();
  const { settings: transcriptionSettings } = useTranscriptionSettings();

  const {
    allItems,
    archivedList,
    recordings,
    visibleRecordings,
    listCounts,
    lolLists,
    lists,
    listsForRecording,
    availableListsForRecording,
    items,
  } = useRecordingsData({ content, selectedListId, showArchived, searchQuery });

  useEffect(() => {
    saveRecordingsViewPreferences({ selectedListId, showArchived });
  }, [selectedListId, showArchived]);

  useEffect(() => {
    const validListIds = new Set(lists.map((list) => list.id));
    setSelectedListId((current) =>
      sanitizeSelectedListId(current, {
        listIds: validListIds,
        archivedListId: archivedList?.id ?? null,
      }),
    );
  }, [lists, archivedList]);

  const { toasts, showUndo, dismiss, durationMs } = useUndoToast();

  const {
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
  } = useRecordingMutations({
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
    onSelectList: setSelectedListId,
    getIdToken,
    showUndo,
  });

  const {
    sensors,
    draggingId,
    draggingRecording,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  } = useListDnD({
    recordings,
    selectedListId,
    onMoveToList: handleMoveToList,
  });

  const handleDeleteClick = (recording: ParsedRecording, event: MouseEvent<HTMLButtonElement>) => {
    if (event.metaKey) {
      void handleDelete(recording);
      return;
    }
    setDeleteTarget(recording);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={listDropCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <section className="recordings-view">
          <RecordingsToolbar
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />

          <Lol
            lolLists={lolLists}
            archivedList={archivedList}
            listCounts={listCounts}
            selectedListId={selectedListId}
            dragging={draggingId != null}
            onSelectList={setSelectedListId}
            onAddList={() => {
              setAddListForRecording(null);
              setAddListOpen(true);
            }}
          />

          {error && <p className="error">{error}</p>}

          <div className="recordings-list">
            {visibleRecordings.length === 0 ? (
              <p className="muted empty-state">
                {searchQuery.trim()
                  ? "No recordings match your search."
                  : selectedListId === EVERYTHING_LIST_ID
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
                  getIdToken={getIdToken}
                  onArchive={() => void handleArchive(recording)}
                  onDelete={(event) => handleDeleteClick(recording, event)}
                  onRetranscribe={() => void handleRetranscribe(recording)}
                  onAddToList={(listId) => void handleAddToList(recording, listId)}
                  onNewList={() => {
                    setAddListForRecording(recording);
                    setAddListOpen(true);
                  }}
                  onRemoveFromList={(listId) => void handleRemoveFromList(recording, listId)}
                  onShowJson={() => setJsonTarget(recording)}
                  onUpdateTranscription={(transcription) =>
                    void handleUpdateTranscription(recording, transcription)
                  }
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

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete recording?"
        message="This will remove the recording from your Pebble lists. The recording itself is not permanently deleted from Firestore."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void handleDelete(target);
        }}
      />

      <JsonModal
        open={jsonTarget != null}
        title="Item JSON"
        subtitle={jsonTarget ? formatLocalDateTime(jsonTarget.timestampMs) : undefined}
        data={jsonTarget ? buildRecordingItemJson(content, jsonTarget) : null}
        onClose={() => setJsonTarget(null)}
      />

      <PromptDialog
        open={addListOpen}
        title="New list"
        label="List name"
        placeholder="Shopping"
        confirmLabel="Create list"
        onCancel={() => {
          setAddListOpen(false);
          setAddListForRecording(null);
        }}
        onConfirm={(name) => {
          setAddListOpen(false);
          const recording = addListForRecording;
          setAddListForRecording(null);
          void (async () => {
            const list = await handleCreateList(name);
            if (list && recording) {
              await handleAddToList(recording, list.id);
            }
          })();
        }}
      />
      <UndoToastStack toasts={toasts} durationMs={durationMs} onDismiss={dismiss} />
    </>
  );
}
