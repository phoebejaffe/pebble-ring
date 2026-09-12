import { describe, expect, it } from "vitest";
import { formatTranscriptionLine, notesDayKey, prependNoteLine } from "./notesSync.js";

describe("transcription lines", () => {
  it("prefixes every transcription with a bulb", () => {
    expect(formatTranscriptionLine("  call the dentist")).toBe("💡 call the dentist");
    expect(formatTranscriptionLine("Note: buy milk")).toBe("💡 Note: buy milk");
  });

  it("returns an empty line for blank transcriptions", () => {
    expect(formatTranscriptionLine("   ")).toBe("");
  });

  it("separates a transcription line from regular content", () => {
    expect(prependNoteLine("💡 new content", "old content")).toBe("💡 new content\n\nold content");
  });

  it("keeps consecutive transcription lines together", () => {
    expect(prependNoteLine("💡 new content", "💡 old content\n\nold content")).toBe(
      "💡 new content\n💡 old content\n\nold content",
    );
  });

  it("leaves a blank line after a transcription-only document", () => {
    expect(prependNoteLine("💡 new content", "")).toBe("💡 new content\n\n");
  });
});

describe("notesDayKey", () => {
  it("uses the configured timezone and rollover hour", () => {
    const timestamp = Date.parse("2026-09-11T10:30:00.000Z");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 4)).toBe("2026-09-10");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 2)).toBe("2026-09-11");
  });
});
