import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";

type Props = {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  initialValue = "",
  confirmLabel = "Create",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);

  useEscapeKey(onCancel, open);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [initialValue, open]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog-panel"
        role="dialog"
        aria-labelledby="prompt-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="prompt-dialog-title" className="dialog-title">
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className="dialog-field" htmlFor={inputId}>
            <span>{label}</span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="secondary-btn" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" disabled={!value.trim()}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
