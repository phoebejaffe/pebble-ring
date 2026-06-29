type Props = {
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  onAddList: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function RecordingsToolbar({
  showArchived,
  onShowArchivedChange,
  onAddList,
  onRefresh,
  refreshing,
}: Props) {
  return (
    <div className="recordings-toolbar">
      <label className="toggle compact">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => onShowArchivedChange(event.target.checked)}
        />
        Show archived
      </label>
      <button
        type="button"
        className="secondary-btn"
        disabled={refreshing}
        onClick={onRefresh}
        title="Reload from Firestore"
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
      <button type="button" className="secondary-btn" onClick={onAddList}>
        + List
      </button>
    </div>
  );
}
