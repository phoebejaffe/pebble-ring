import { EVERYTHING_LIST_ID, INBOX_LIST_ID, type ParsedList } from "../types/list";
import { ListDropZone } from "./ListDropZone";

type Props = {
  lolLists: ParsedList[];
  archivedList: ParsedList | null;
  listCounts: Record<string, number>;
  selectedListId: string;
  dragging: boolean;
  onSelectList: (listId: string) => void;
  onAddList: () => void;
};

export function Lol({
  lolLists,
  archivedList,
  listCounts,
  selectedListId,
  dragging,
  onSelectList,
  onAddList,
}: Props) {
  return (
    <div className={`lol-row${dragging ? " drag-active" : ""}`}>
      <ListDropZone
        listId={EVERYTHING_LIST_ID}
        name="Everything"
        count={listCounts[EVERYTHING_LIST_ID] ?? 0}
        active={selectedListId === EVERYTHING_LIST_ID}
        droppable={false}
        onSelect={() => onSelectList(EVERYTHING_LIST_ID)}
      />
      {lolLists.map((list) => (
        <ListDropZone
          key={list.id}
          listId={list.id}
          name={list.title}
          count={listCounts[list.id] ?? 0}
          active={selectedListId === list.id}
          onSelect={() => onSelectList(list.id)}
        />
      ))}
      <ListDropZone
        listId={INBOX_LIST_ID}
        name="Unlabeled"
        count={listCounts[INBOX_LIST_ID] ?? 0}
        active={selectedListId === INBOX_LIST_ID}
        onSelect={() => onSelectList(INBOX_LIST_ID)}
      />
      {archivedList && (
        <ListDropZone
          listId={archivedList.id}
          name={archivedList.title}
          count={listCounts[archivedList.id] ?? 0}
          active={selectedListId === archivedList.id}
          onSelect={() => onSelectList(archivedList.id)}
        />
      )}
      <button type="button" className="lol-new-list-btn" onClick={onAddList}>
        New List
      </button>
    </div>
  );
}
