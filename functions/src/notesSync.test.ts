import { describe, expect, it } from "vitest";
import { formatTranscriptionLine, notesDayKey, prependNoteLine } from "./notesSync.js";

describe("transcription lines", () => {
  it("writes transcriptions as plain text lines", () => {
    expect(formatTranscriptionLine("  call the dentist")).toBe("call the dentist");
    expect(formatTranscriptionLine("Note: buy milk")).toBe("Note: buy milk");
  });

  it("returns an empty line for blank transcriptions", () => {
    expect(formatTranscriptionLine("   ")).toBe("");
  });

  it("links a trailing double underscore to the recording", () => {
    expect(formatTranscriptionLine("call the dentist", "https://example.com/r?id=1")).toBe(
      "call the dentist[__](https://example.com/r?id=1)",
    );
  });

  it("formats classified tasks as Markdown checkboxes", () => {
    expect(formatTranscriptionLine("put earrings in", "https://example.com/r?id=1", true)).toBe(
      "- [ ] put earrings in[__](https://example.com/r?id=1)",
    );
  });

  it("separates a transcription line from regular content", () => {
    expect(prependNoteLine("new content", "old content")).toBe("new content\n\nold content");
  });

  it("separates consecutive transcription lines with a blank line", () => {
    expect(prependNoteLine("new content", "old content\n\nolder content")).toBe(
      "new content\n\nold content\n\nolder content",
    );
  });

  it("keeps consecutive linked transcription lines together", () => {
    expect(
      prependNoteLine("new[__](https://example.com/2)", "old[__](https://example.com/1)\n\nrest"),
    ).toBe("new[__](https://example.com/2)\n\nold[__](https://example.com/1)\n\nrest");
  });

  it("keeps task and transcription lines together", () => {
    expect(prependNoteLine("new", "- [ ] old[__](https://example.com/1)\n\nrest")).toBe(
      "new\n\n- [ ] old[__](https://example.com/1)\n\nrest",
    );
  });

  it("leaves a blank line after a transcription-only document", () => {
    expect(prependNoteLine("new content", "")).toBe("new content\n\n");
  });
});

describe("notesDayKey", () => {
  it("uses the configured timezone and rollover hour", () => {
    const timestamp = Date.parse("2026-09-11T10:30:00.000Z");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 4)).toBe("2026-09-10");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 2)).toBe("2026-09-11");
  });
});
