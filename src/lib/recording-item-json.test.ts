import { describe, expect, it } from "vitest";
import { buildRecordingItemJson } from "./recording-item-json";
import type { ParsedRecording } from "../types/recording";

const recording: ParsedRecording = {
  id: "rec-1",
  timestampMs: 1_700_000_000_000,
  updatedMs: 1_700_000_000_000,
  title: "Test",
  transcription: "Hello",
  autoTranscription: "Hello",
  userTranscription: "",
  fileName: "clip.m4a",
  status: "done",
  transcribedUsingModel: null,
  raw: { timestamp: 1_700_000_000_000, entries: [] } as ParsedRecording["raw"],
};

describe("buildRecordingItemJson", () => {
  it("includes recording and linked item documents", () => {
    const payload = buildRecordingItemJson(
      {
        uid: "user-1",
        recordings: [{ id: "rec-1", data: { entries: [{ transcription: "Hello" }] } }],
        items: [{ id: "item-1", data: { sourceRecordingId: "rec-1", title: "Hello" } }],
        lists: [],
        user: null,
      },
      recording,
    );

    expect(payload.recording.id).toBe("rec-1");
    expect(payload.item?.id).toBe("item-1");
  });

  it("returns null item when none is linked", () => {
    const payload = buildRecordingItemJson(
      {
        uid: "user-1",
        recordings: [{ id: "rec-1", data: { entries: [] } }],
        items: [],
        lists: [],
        user: null,
      },
      recording,
    );

    expect(payload.item).toBeNull();
  });
});
