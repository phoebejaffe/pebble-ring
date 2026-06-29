import type { UndoToastEntry } from "../hooks/useUndoToast";
import { UndoToast } from "./UndoToast";

type Props = {
  toasts: UndoToastEntry[];
  durationMs: number;
  onDismiss: (id: string) => void;
};

export function UndoToastStack({ toasts, durationMs, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="undo-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <UndoToast
          key={toast.id}
          message={toast.message}
          durationMs={durationMs}
          onUndo={toast.onUndo}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
