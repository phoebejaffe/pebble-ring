import { useEffect, useMemo, useState } from "react";
import type { PebbleContent } from "../api";

type Props = {
  open: boolean;
  content: PebbleContent | null;
  onClose: () => void;
};

export function RawJsonModal({ open, content, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () => (content ? JSON.stringify(content, null, 2) : ""),
    [content],
  );

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !content) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="json-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="json-modal"
        role="dialog"
        aria-labelledby="raw-json-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="json-modal-header">
          <div className="json-modal-title">
            <h2 id="raw-json-title">Raw JSON</h2>
            <p className="muted json-modal-stats">
              {content.recordings.length} recordings · {content.items.length} items ·{" "}
              {content.lists.length} lists
            </p>
          </div>
          <div className="json-modal-actions">
            <button type="button" className="secondary-btn" onClick={() => void handleCopy()}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>
        <div className="json-modal-body">
          <pre>{json}</pre>
        </div>
      </div>
    </div>
  );
}
