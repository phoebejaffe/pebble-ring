import { useDroppable } from "@dnd-kit/core";

type ListDropProps = {
  listId: string;
  name: string;
  count: number;
  active: boolean;
  droppable?: boolean;
  onSelect: () => void;
};

export function ListDropZone({
  listId,
  name,
  count,
  active,
  droppable = true,
  onSelect,
}: ListDropProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list:${listId}`,
    data: { type: "list", listId },
    disabled: !droppable,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      className={`list-drop ${active ? "active" : ""} ${isOver ? "over" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="list-name">
        {name} <span className="list-count">({count})</span>
      </span>
    </div>
  );
}
