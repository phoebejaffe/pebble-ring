import { describe, expect, it } from "vitest";
import { applyTranscriptionToDoc, applyTranscriptionToRecording } from "./recording-transcription";
import { parseRecording, type RecordingDoc } from "../types/recording";

const baseDoc: RecordingDoc = {
  timestamp: 1_700_000_000_000,
  updated: 1_700_000_000_000,
  entries: [
    {
      timestamp: 1_700_000_000_000,
      fileName: "clip.m4a",
      status: "transcription_error",
      transcription: "old text",
      transcribedUsingModel: "old-model",
      error: "failed",
      ringTransferInfo: null,
      userMessageId: null,
    },
  ],
  assistant_session: {
    title: "Old title",
    messages: [
      { role: "assistant", content: "hi" },
      { role: "user", content: "old text" },
    ],
  },
  metadata: null,
  encrypted: null,
};

describe("applyTranscriptionToDoc", () => {
  it("updates the first entry, clears errors, and syncs assistant session", () => {
    const updated = applyTranscriptionToDoc(baseDoc, "new text", "universal-2", 1_800_000_000_000);

    expect(updated.updated).toBe(1_800_000_000_000);
    expect(updated.entries[0]).toMatchObject({
      transcription: "new text",
      transcribedUsingModel: "universal-2",
      status: "completed",
      error: null,
    });
    expect(updated.assistant_session?.messages[1]).toEqual({
      role: "user",
      content: "new text",
    });
  });
});

describe("applyTranscriptionToRecording", () => {
  it("re-parses parsed recording fields from the updated doc", () => {
    const recording = parseRecording("rec-1", baseDoc as unknown as Record<string, unknown>);
    const updated = applyTranscriptionToRecording(recording, "new text", "universal-2");

    expect(updated.transcription).toBe("new text");
    expect(updated.transcribedUsingModel).toBe("universal-2");
    expect(updated.title).toBe("Old title");
  });
});
