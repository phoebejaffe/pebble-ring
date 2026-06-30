import type { PebbleContent } from "../api";
import { JsonModal } from "./JsonModal";

type Props = {
  open: boolean;
  content: PebbleContent | null;
  onClose: () => void;
};

export function RawJsonModal({ open, content, onClose }: Props) {
  if (!content) return null;

  return (
    <JsonModal
      open={open}
      title="Raw JSON"
      subtitle={`${content.recordings.length} recordings · ${content.items.length} items · ${content.lists.length} lists`}
      data={content}
      onClose={onClose}
    />
  );
}
