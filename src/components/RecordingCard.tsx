import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";
import { useClickOutside } from "../hooks/useClickOutside";
import type { GetIdToken } from "../lib/api-auth";
import { formatLocalDateTime } from "../lib/format-local-date";
import { shouldEagerLoadAudio } from "../lib/recording-audio-policy";
import { RecordingAudioPlayer } from "./RecordingAudioPlayer";
import { RecordingTranscription } from "./RecordingTranscription";

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
  onNewList: () => void;
  onShowJson: () => void;
  onUpdateTranscription: (transcription: string) => void;
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
  onNewList,
  onShowJson,
  onUpdateTranscription,
}: RecordingCardProps) {
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const listPickerRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const hasTranscription = recording.transcription.trim().length > 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: recording.id,
    data: { type: "recording", recordingId: recording.id },
  });

  useClickOutside(listPickerRef, () => setListPickerOpen(false), { enabled: listPickerOpen });
  useClickOutside(cardMenuRef, () => setCardMenuOpen(false), {
    enabled: cardMenuOpen,
    listenEscape: true,
  });

  function stopDrag(event: PointerEvent) {
    event.stopPropagation();
  }

  return (
    <article
      ref={setNodeRef}
      className={`recording-card ${isDragging ? "dragging" : ""}`}
      style={{ touchAction: "none" }}
      {...listeners}
      {...attributes}
    >
      <div className="recording-body">
        <div className="recording-header">
          <div className="recording-header-row">
            <time
              className="recording-time"
              dateTime={new Date(recording.timestampMs).toISOString()}
            >
              {formatLocalDateTime(recording.timestampMs)}
            </time>
            <div className="recording-actions" onPointerDown={stopDrag}>
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
                    {recording.fileName && (
                      <button
                        type="button"
                        role="menuitem"
                        className="tag-menu-item card-menu-item-wrap"
                        disabled={busy}
                        onClick={() => {
                          setCardMenuOpen(false);
                          onRetranscribe();
                        }}
                      >
                        {!hasTranscription
                          ? "Transcribe with universal-2"
                          : recording.transcribedUsingModel
                            ? `Audio transcribed with ${recording.transcribedUsingModel} — Retranscribe with universal-2`
                            : "Retranscribe with universal-2"}
                      </button>
                    )}
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
          {(listChips.length > 0 || availableLists.length > 0) && (
            <div className="recording-list-chips" onPointerDown={stopDrag}>
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
                    <button
                      type="button"
                      role="menuitem"
                      className="tag-menu-item tag-menu-item-new-list"
                      onClick={() => {
                        setListPickerOpen(false);
                        onNewList();
                      }}
                    >
                      New list
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <RecordingTranscription
          transcription={recording.transcription}
          autoTranscription={recording.autoTranscription}
          busy={busy}
          onSave={onUpdateTranscription}
        />
        <div onPointerDown={stopDrag}>
          <RecordingAudioPlayer
            uid={uid}
            fileName={recording.fileName}
            getIdToken={getIdToken}
            loadMode={shouldEagerLoadAudio(recording.timestampMs) ? "eager" : "lazy"}
          />
        </div>
      </div>
    </article>
  );
}
