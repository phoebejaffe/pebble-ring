import { describe, expect, it } from "vitest";
import { formatNoteLine, isNoteTranscription, notesDayKey } from "./notesSync.js";

describe("note transcription matching", () => {
  it("recognizes Note as a case-insensitive command and normalizes the line", () => {
    expect(isNoteTranscription("  note: call the dentist")).toBe(true);
    expect(formatNoteLine("  note: call the dentist")).toBe("Note — call the dentist");
  });

  it("does not match words that merely contain note", () => {
    expect(isNoteTranscription("annotate this later")).toBe(false);
    expect(formatNoteLine("Note")).toBe("");
  });
});

describe("notesDayKey", () => {
  it("uses the configured timezone and rollover hour", () => {
    const timestamp = Date.parse("2026-09-11T10:30:00.000Z");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 4)).toBe("2026-09-10");
    expect(notesDayKey(timestamp, "America/Los_Angeles", 2)).toBe("2026-09-11");
  });
});
