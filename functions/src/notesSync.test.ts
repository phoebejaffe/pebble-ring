import { describe, expect, it } from "vitest";
import { formatNoteLine, isNoteTranscription, notesDayKey, prependNoteLine } from "./notesSync.js";

describe("note transcription matching", () => {
  it("recognizes Note as a case-insensitive command and normalizes the line", () => {
    expect(isNoteTranscription("  note: call the dentist")).toBe(true);
    expect(formatNoteLine("  note: call the dentist")).toBe("Note — call the dentist");
  });

  it("does not match words that merely contain note", () => {
    expect(isNoteTranscription("annotate this later")).toBe(false);
    expect(formatNoteLine("Note")).toBe("");
  });

  it("separates a Note line from regular content", () => {
    expect(prependNoteLine("Note — new content", "old content")).toBe(
      "Note — new content\n\nold content",
    );
  });

  it("keeps consecutive Note lines together", () => {
    expect(prependNoteLine("Note — new content", "Note — old content\n\nold content")).toBe(
      "Note — new content\nNote — old content\n\nold content",
    );
  });

  it("leaves a blank line after a Note-only document", () => {
    expect(prependNoteLine("Note — new content", "")).toBe("Note — new content\n\n");
  });
});

describe("notesDayKey", () => {
  it("uses the configured timezone and rollover hour", () => {
    const timestamp = Date.parse("2026-09-11T10:30:00.000Z");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 4)).toBe("2026-09-10");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 2)).toBe("2026-09-11");
  });
});
