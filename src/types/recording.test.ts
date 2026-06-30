import { describe, expect, it } from "vitest";
import { parseRecording } from "./recording";

describe("parseRecording", () => {
  it("prefers assistant session user content over entry transcription", () => {
    const parsed = parseRecording("rec-1", {
      timestamp: 1_700_000_000_000,
      updated: 1_700_000_000_000,
      entries: [{ timestamp: 1_700_000_000_000, transcription: "auto text", status: "done" }],
      assistant_session: {
        title: null,
        messages: [{ role: "user", content: "corrected text" }],
      },
    });

    expect(parsed.transcription).toBe("corrected text");
  });

  it("falls back to entry transcription when user content is missing", () => {
    const parsed = parseRecording("rec-1", {
      timestamp: 1_700_000_000_000,
      updated: 1_700_000_000_000,
      entries: [{ timestamp: 1_700_000_000_000, transcription: "auto text", status: "done" }],
      assistant_session: null,
    });

    expect(parsed.transcription).toBe("auto text");
  });
});
