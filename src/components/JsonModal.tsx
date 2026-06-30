import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  data: unknown;
  onClose: () => void;
};

export function JsonModal({ open, title, subtitle, data, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => (data == null ? "" : JSON.stringify(data, null, 2)), [data]);

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

  if (!open || data == null) return null;

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
        aria-labelledby="json-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="json-modal-header">
          <div className="json-modal-title">
            <h2 id="json-modal-title">{title}</h2>
            {subtitle ? <p className="muted json-modal-stats">{subtitle}</p> : null}
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
