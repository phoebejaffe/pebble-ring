import { useCallback, useEffect, useRef, useState } from "react";

export type UndoToastState = {
  message: string;
  onUndo: () => Promise<void>;
};

const UNDO_DURATION_MS = 10_000;

export function useUndoToast() {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showUndo = useCallback(
    (message: string, onUndo: () => Promise<void>) => {
      dismiss();
      setToast({ message, onUndo });
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setToast(null);
      }, UNDO_DURATION_MS);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showUndo, dismiss, durationMs: UNDO_DURATION_MS };
}
