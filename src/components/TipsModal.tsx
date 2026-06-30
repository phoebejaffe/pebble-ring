import { useEscapeKey } from "../hooks/useEscapeKey";
import { APP_TIPS } from "../lib/tips";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TipsModal({ open, onClose }: Props) {
  useEscapeKey(onClose, open);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog-panel tips-modal"
        role="dialog"
        aria-labelledby="tips-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="tips-modal-title" className="dialog-title">
          Tips
        </h2>
        <ul className="tips-list">
          {APP_TIPS.map((tip) => (
            <li key={tip.id}>{tip.text}</li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
