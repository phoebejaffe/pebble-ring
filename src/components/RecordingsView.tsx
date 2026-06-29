import { useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { EVERYTHING_LIST_ID } from "../types/list";
import type { PebbleContent } from "../api";
import { useTranscriptionSettings } from "../contexts/TranscriptionSettingsContext";
import { listDropCollisionDetection, useListDnD } from "../hooks/useListDnD";
import { useRecordingMutations } from "../hooks/useRecordingMutations";
import { useRecordingsData } from "../hooks/useRecordingsData";
import { ListsRow } from "./ListsRow";
import { RecordingCard } from "./RecordingCard";
import { RecordingsToolbar } from "./RecordingsToolbar";

type Props = {
  uid: string;
  content: PebbleContent;
  onContentChange: (content: PebbleContent) => void;
};

export function RecordingsView({ uid, content, onContentChange }: Props) {
  const [selectedListId, setSelectedListId] = useState(EVERYTHING_LIST_ID);
  const [showArchived, setShowArchived] = useState(false);

  const { settings: transcriptionSettings } = useTranscriptionSettings();

  const {
    allItems,
    archivedList,
    recordings,
    visibleRecordings,
    listCounts,
    sortedLists,
    listsForRecording,
    availableListsForRecording,
    items,
  } = useRecordingsData({ content, selectedListId, showArchived });

  const {
    busyId,
    error,
    handleArchive,
    handleDelete,
    handleAddToList,
    handleRemoveFromList,
    handleRetranscribe,
    handleMoveToList,
    handleAddList,
  } = useRecordingMutations({
    uid,
    content,
    onContentChange,
    allItems,
    items,
    recordings,
    archivedList,
    transcriptionSettings,
    selectedListId,
    onSelectList: setSelectedListId,
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
          onAddList={() => void handleAddList()}
        />

        <ListsRow
          sortedLists={sortedLists}
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
