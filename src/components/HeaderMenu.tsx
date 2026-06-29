import { useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";

type Props = {
  onSignOut: () => void;
  onShowRawJson: () => void;
};

export function HeaderMenu({ onSignOut, onShowRawJson }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useClickOutside(rootRef, () => setOpen(false), { enabled: open, listenEscape: true });

  return (
    <div className="header-menu" ref={rootRef}>
      <button
        type="button"
        className="menu-trigger"
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        ···
      </button>
      {open && (
        <div className="menu-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onShowRawJson();
            }}
          >
            Show raw JSON
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
