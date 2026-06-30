import { useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";

type Props = {
  userLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenTips: () => void;
  onShowRawJson: () => void;
  onSignOut: () => void;
};

export function HeaderMenu({
  userLabel,
  refreshing,
  onRefresh,
  onOpenSettings,
  onOpenTips,
  onShowRawJson,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useClickOutside(rootRef, () => setOpen(false), { enabled: open, listenEscape: true });

  function closeMenu(action: () => void) {
    setOpen(false);
    action();
  }

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
          <p className="menu-info">Signed in as {userLabel}</p>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            disabled={refreshing}
            onClick={() => closeMenu(onRefresh)}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => closeMenu(onOpenSettings)}
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => closeMenu(onOpenTips)}
          >
            Tips
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => closeMenu(onShowRawJson)}
          >
            Show raw JSON
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => closeMenu(onSignOut)}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
