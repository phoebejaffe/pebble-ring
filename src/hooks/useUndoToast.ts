import { useCallback, useEffect, useRef, useState } from "react";

export type UndoToastEntry = {
  id: string;
  message: string;
  onUndo: () => Promise<void>;
};

const UNDO_DURATION_MS = 10_000;

function newToastId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

export function useUndoToast() {
  const [toasts, setToasts] = useState<UndoToastEntry[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showUndo = useCallback(
    (message: string, onUndo: () => Promise<void>) => {
      const id = newToastId();
      setToasts((current) => [...current, { id, message, onUndo }]);
      const timer = window.setTimeout(() => dismiss(id), UNDO_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { toasts, showUndo, dismiss, durationMs: UNDO_DURATION_MS };
}
