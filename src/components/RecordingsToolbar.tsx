type Props = {
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function RecordingsToolbar({
  showArchived,
  onShowArchivedChange,
  searchQuery,
  onSearchQueryChange,
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
      <input
        type="search"
        className="recordings-search"
        placeholder="Search recordings…"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        aria-label="Search recordings"
      />
    </div>
  );
}
