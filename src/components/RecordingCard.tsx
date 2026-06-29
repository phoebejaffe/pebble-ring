import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import type { ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";
import { formatLocalDateTime } from "../lib/format-local-date";
import { RecordingAudioPlayer } from "./RecordingAudioPlayer";

type RecordingCardProps = {
  uid: string;
  recording: ParsedRecording;
  listChips: ParsedList[];
  availableLists: ParsedList[];
  busy: boolean;
  onDelete: () => void;
  onRetranscribe: () => void;
  onAddToList: (listId: string) => void;
  onRemoveFromList: (listId: string) => void;
};

export function RecordingCard({
  uid,
  recording,
  listChips,
  availableLists,
  busy,
  onDelete,
  onRetranscribe,
  onAddToList,
  onRemoveFromList,
}: RecordingCardProps) {
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const listPickerRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: recording.id,
    data: { type: "recording", recordingId: recording.id },
  });

  useEffect(() => {
    if (!listPickerOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (listPickerRef.current && !listPickerRef.current.contains(event.target as Node)) {
        setListPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listPickerOpen]);

  useEffect(() => {
    if (!modelMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [modelMenuOpen]);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`recording-card ${isDragging ? "dragging" : ""}`}
    >
      <button type="button" className="drag-handle" {...listeners} {...attributes} aria-label="Drag">
        ⠿
      </button>
      <div className="recording-body">
        <div className="recording-header">
          <time className="recording-time" dateTime={new Date(recording.timestampMs).toISOString()}>
            {formatLocalDateTime(recording.timestampMs)}
          </time>
          {recording.transcribedUsingModel && (
            <div className="tag-picker" ref={modelMenuRef}>
              <button
                type="button"
                className="model-tag"
                disabled={busy}
                onClick={() => setModelMenuOpen((open) => !open)}
              >
                {recording.transcribedUsingModel}
              </button>
              {modelMenuOpen && (
                <div className="tag-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="tag-menu-item"
                    disabled={busy}
                    onClick={() => {
                      setModelMenuOpen(false);
                      onRetranscribe();
                    }}
                  >
                    Retranscribe with universal-2
                  </button>
                </div>
              )}
            </div>
          )}
          {listChips.map((list) => (
            <button
              key={list.id}
              type="button"
              className="list-chip"
              title={`Remove from ${list.title}`}
              disabled={busy}
              onClick={() => onRemoveFromList(list.id)}
            >
              {list.icon ? `${list.icon} ` : ""}
              {list.title}
              <span className="list-chip-remove" aria-hidden>
                ×
              </span>
            </button>
          ))}
          {availableLists.length > 0 && (
            <div className="tag-picker" ref={listPickerRef}>
              <button
                type="button"
                className="list-chip list-chip-add"
                title="Add to list"
                disabled={busy}
                onClick={() => setListPickerOpen((open) => !open)}
                aria-label="Add to list"
              >
                +
              </button>
              {listPickerOpen && (
                <div className="tag-menu" role="menu">
                  {availableLists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      role="menuitem"
                      className="tag-menu-item"
                      onClick={() => {
                        setListPickerOpen(false);
                        onAddToList(list.id);
                      }}
                    >
                      {list.icon ? `${list.icon} ` : ""}
                      {list.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="recording-actions">
            <button
              type="button"
              className="icon-btn danger"
              title="Delete"
              disabled={busy}
              onClick={onDelete}
            >
              🗑️
            </button>
          </div>
        </div>
        <p className="recording-text">
          {recording.transcription || <em className="muted">No transcription</em>}
        </p>
        <RecordingAudioPlayer uid={uid} fileName={recording.fileName} />
      </div>
    </article>
  );
}

type ListDropProps = {
  listId: string;
  name: string;
  count: number;
  active: boolean;
  droppable?: boolean;
  onSelect: () => void;
};

export function ListDropZone({
  listId,
  name,
  count,
  active,
  droppable = true,
  onSelect,
}: ListDropProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list:${listId}`,
    data: { type: "list", listId },
    disabled: !droppable,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      className={`list-drop ${active ? "active" : ""} ${isOver ? "over" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="list-name">
        {name} <span className="list-count">({count})</span>
      </span>
    </div>
  );
}
