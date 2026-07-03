import { useCallback, useRef, useState } from "react";
import {
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { ParsedRecording } from "../types/recording";

export const listDropCollisionDetection: CollisionDetection = (args) => {
  const listDroppables = args.droppableContainers.filter((container) =>
    String(container.id).startsWith("list:"),
  );

  return pointerWithin({ ...args, droppableContainers: listDroppables });
};

export function resolveDropListId(event: DragEndEvent): string | null {
  const overData = event.over?.data.current;
  if (overData && typeof overData === "object" && overData.type === "list") {
    return typeof overData.listId === "string" ? overData.listId : null;
  }

  const overId = event.over?.id ? String(event.over.id) : null;
  if (!overId?.startsWith("list:")) return null;
  return overId.slice("list:".length);
}

type Params = {
  recordings: ParsedRecording[];
  selectedListId: string;
  onMoveToList: (recordingId: string, toListId: string) => void | Promise<void>;
};

export function useListDnD({ recordings, selectedListId, onMoveToList }: Params) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const suppressListSelectUntilRef = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const draggingRecording = draggingId
    ? (recordings.find((recording) => recording.id === draggingId) ?? null)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const recordingId = String(event.active.id);
      const toListId = resolveDropListId(event);
      if (!toListId || toListId === selectedListId) return;
      if (!recordings.some((recording) => recording.id === recordingId)) return;

      suppressListSelectUntilRef.current = Date.now() + 300;
      void onMoveToList(recordingId, toListId);
    },
    [onMoveToList, recordings, selectedListId],
  );

  const shouldSuppressListSelect = useCallback(() => {
    return Date.now() < suppressListSelectUntilRef.current;
  }, []);

  return {
    sensors,
    draggingId,
    draggingRecording,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    shouldSuppressListSelect,
  };
}
