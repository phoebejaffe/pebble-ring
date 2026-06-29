import { EVERYTHING_LIST_ID, INBOX_LIST_ID, type ParsedList } from "../types/list";
import { ListDropZone } from "./ListDropZone";

type Props = {
  sortedLists: ParsedList[];
  listCounts: Record<string, number>;
  selectedListId: string;
  dragging: boolean;
  onSelectList: (listId: string) => void;
};

export function ListsRow({
  sortedLists,
  listCounts,
  selectedListId,
  dragging,
  onSelectList,
}: Props) {
  return (
    <div className={`lists-row${dragging ? " drag-active" : ""}`}>
      <ListDropZone
        listId={EVERYTHING_LIST_ID}
        name="Everything"
        count={listCounts[EVERYTHING_LIST_ID] ?? 0}
        active={selectedListId === EVERYTHING_LIST_ID}
        droppable={false}
        onSelect={() => onSelectList(EVERYTHING_LIST_ID)}
      />
      {sortedLists.map((list) => (
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
    </div>
  );
}
