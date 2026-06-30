import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, type MouseEvent } from "react";
import type { ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";
import { useClickOutside } from "../hooks/useClickOutside";
import type { GetIdToken } from "../lib/api-auth";
import { formatLocalDateTime } from "../lib/format-local-date";
import { shouldEagerLoadAudio } from "../lib/recording-audio-policy";
import { RecordingAudioPlayer } from "./RecordingAudioPlayer";

type RecordingCardProps = {
  uid: string;
  recording: ParsedRecording;
  listChips: ParsedList[];
  availableLists: ParsedList[];
  busy: boolean;
  getIdToken: GetIdToken;
  onArchive: () => void;
  onDelete: (event: MouseEvent<HTMLButtonElement>) => void;
  onRetranscribe: () => void;
  onAddToList: (listId: string) => void;
  onRemoveFromList: (listId: string) => void;
  onShowJson: () => void;
};

export function RecordingCard({
  uid,
  recording,
  listChips,
  availableLists,
  busy,
  getIdToken,
  onArchive,
  onDelete,
  onRetranscribe,
  onAddToList,
  onRemoveFromList,
  onShowJson,
}: RecordingCardProps) {
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const listPickerRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: recording.id,
    data: { type: "recording", recordingId: recording.id },
  });

  useClickOutside(listPickerRef, () => setListPickerOpen(false), { enabled: listPickerOpen });
  useClickOutside(modelMenuRef, () => setModelMenuOpen(false), { enabled: modelMenuOpen });
  useClickOutside(cardMenuRef, () => setCardMenuOpen(false), {
    enabled: cardMenuOpen,
    listenEscape: true,
  });

  return (
    <article ref={setNodeRef} className={`recording-card ${isDragging ? "dragging" : ""}`}>
      <button
        type="button"
        className="drag-handle"
        style={{ touchAction: "none" }}
        {...listeners}
        {...attributes}
        aria-label="Drag"
      >
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
              className="icon-btn"
              title="Archive"
              disabled={busy}
              onClick={onArchive}
            >
              📦
            </button>
            <button
              type="button"
              className="icon-btn danger"
              title="Delete"
              disabled={busy}
              onClick={onDelete}
            >
              🗑️
            </button>
            <div className="tag-picker" ref={cardMenuRef}>
              <button
                type="button"
                className="icon-btn card-menu-trigger"
                title="More options"
                aria-label="More options"
                aria-expanded={cardMenuOpen}
                aria-haspopup="menu"
                disabled={busy}
                onClick={() => setCardMenuOpen((open) => !open)}
              >
                ···
              </button>
              {cardMenuOpen && (
                <div className="tag-menu card-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="tag-menu-item"
                    onClick={() => {
                      setCardMenuOpen(false);
                      onShowJson();
                    }}
                  >
                    Show JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="recording-text">
          {recording.transcription || <em className="muted">No transcription</em>}
        </p>
        <RecordingAudioPlayer
          uid={uid}
          fileName={recording.fileName}
          getIdToken={getIdToken}
          loadMode={shouldEagerLoadAudio(recording.timestampMs) ? "eager" : "lazy"}
        />
      </div>
    </article>
  );
}
