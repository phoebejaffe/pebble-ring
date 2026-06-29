import { useEffect, type RefObject } from "react";

type Options = {
  enabled?: boolean;
  listenEscape?: boolean;
};

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  { enabled = true, listenEscape = false }: Options = {},
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (listenEscape && event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    if (listenEscape) document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      if (listenEscape) document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, listenEscape, onClose, ref]);
}
