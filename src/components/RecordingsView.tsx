import { useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { EVERYTHING_LIST_ID } from "../types/list";
import type { PebbleContent } from "../api";
import { useAuth } from "../auth";
import { useTranscriptionSettings } from "../contexts/TranscriptionSettingsContext";
import { useUndoToast } from "../hooks/useUndoToast";
import { listDropCollisionDetection, useListDnD } from "../hooks/useListDnD";
import { useRecordingMutations } from "../hooks/useRecordingMutations";
import { useRecordingsData } from "../hooks/useRecordingsData";
import type { ParsedRecording } from "../types/recording";
import { ConfirmDialog } from "./ConfirmDialog";
import { Lol } from "./Lol";
import { PromptDialog } from "./PromptDialog";
import { RecordingCard } from "./RecordingCard";
import { RecordingsToolbar } from "./RecordingsToolbar";
import { UndoToastStack } from "./UndoToastStack";

type Props = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function RecordingsView({ uid, content, onContentChange, onRefresh, refreshing }: Props) {
  const [selectedListId, setSelectedListId] = useState(EVERYTHING_LIST_ID);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParsedRecording | null>(null);
  const [addListOpen, setAddListOpen] = useState(false);

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
  } = useRecordingsData({ content, selectedListId, showArchived });

  const { toasts, showUndo, dismiss, durationMs } = useUndoToast();

  const {
    busyId,
    error,
    handleArchive,
    handleDelete,
    handleAddToList,
    handleRemoveFromList,
    handleRetranscribe,
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
            onAddList={() => setAddListOpen(true)}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />

          <Lol
            lolLists={lolLists}
            archivedList={archivedList}
            listCounts={listCounts}
            selectedListId={selectedListId}
            dragging={draggingId != null}
            onSelectList={setSelectedListId}
          />

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
                  getIdToken={getIdToken}
                  onArchive={() => void handleArchive(recording)}
                  onDelete={() => setDeleteTarget(recording)}
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

      <PromptDialog
        open={addListOpen}
        title="New list"
        label="List name"
        placeholder="Shopping"
        confirmLabel="Create list"
        onCancel={() => setAddListOpen(false)}
        onConfirm={(name) => {
          setAddListOpen(false);
          void handleCreateList(name);
        }}
      />
      <UndoToastStack toasts={toasts} durationMs={durationMs} onDismiss={dismiss} />
    </>
  );
}
