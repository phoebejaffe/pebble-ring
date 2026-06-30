import { useEffect, useRef } from "react";

type Props = {
  transcription: string;
  busy: boolean;
  onSave: (transcription: string) => void;
};

function readEditorText(element: HTMLDivElement | null): string {
  return element?.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
}

export function RecordingTranscription({ transcription, busy, onSave }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(transcription);

  useEffect(() => {
    committedRef.current = transcription;
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    editor.textContent = transcription;
  }, [transcription]);

  function revertToCommitted() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.textContent = committedRef.current;
  }

  function commitEditing() {
    const editor = editorRef.current;
    if (!editor) return;

    const next = readEditorText(editor);
    if (!next) {
      revertToCommitted();
      return;
    }

    editor.textContent = next;

    if (next !== committedRef.current.trim()) {
      onSave(next);
    }
  }

  return (
    <div
      ref={editorRef}
      contentEditable={busy ? false : true}
      suppressContentEditableWarning
      className={`recording-text${busy ? "" : " recording-text-editable"}`}
      role="textbox"
      aria-label="Transcription"
      aria-multiline="true"
      data-placeholder="No transcription"
      title={busy ? undefined : "Click to edit transcription"}
      onBlur={() => commitEditing()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          revertToCommitted();
          editorRef.current?.blur();
          return;
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          editorRef.current?.blur();
        }
      }}
    />
  );
}
