type Props = {
  message: string;
  durationMs: number;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
};

export function UndoToast({ message, durationMs, onUndo, onDismiss }: Props) {
  async function handleUndo() {
    try {
      await onUndo();
    } finally {
      onDismiss();
    }
  }

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <div className="undo-toast-body">
        <span className="undo-toast-message">{message}</span>
        <button type="button" className="undo-toast-link" onClick={() => void handleUndo()}>
          Undo
        </button>
      </div>
      <div className="undo-toast-progress" aria-hidden>
        <div className="undo-toast-progress-bar" style={{ animationDuration: `${durationMs}ms` }} />
      </div>
    </div>
  );
}
