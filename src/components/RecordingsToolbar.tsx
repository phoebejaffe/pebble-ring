type Props = {
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  onAddList: () => void;
};

export function RecordingsToolbar({ showArchived, onShowArchivedChange, onAddList }: Props) {
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
      <button type="button" className="secondary-btn" onClick={onAddList}>
        + List
      </button>
    </div>
  );
}
