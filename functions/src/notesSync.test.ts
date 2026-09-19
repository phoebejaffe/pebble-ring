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

  it("links a trailing space to the recording when a link URL is provided", () => {
    expect(formatTranscriptionLine("call the dentist", "https://example.com/r?id=1")).toBe(
      "💡 call the dentist[ ](https://example.com/r?id=1)",
    );
  });

  it("formats classified tasks as Markdown checkboxes", () => {
    expect(formatTranscriptionLine("put earrings in", "https://example.com/r?id=1", true)).toBe(
      "- [ ] 💡 put earrings in[ ](https://example.com/r?id=1)",
    );
  });

  it("separates a transcription line from regular content", () => {
    expect(prependNoteLine("💡 new content", "old content")).toBe("💡 new content\n\nold content");
  });

  it("separates consecutive transcription lines with a blank line", () => {
    expect(prependNoteLine("💡 new content", "💡 old content\n\nold content")).toBe(
      "💡 new content\n\n💡 old content\n\nold content",
    );
  });

  it("keeps consecutive linked transcription lines together", () => {
    expect(
      prependNoteLine(
        "💡 new[ ](https://example.com/2)",
        "💡 old[ ](https://example.com/1)\n\nrest",
      ),
    ).toBe("💡 new[ ](https://example.com/2)\n\n💡 old[ ](https://example.com/1)\n\nrest");
  });

  it("keeps task and transcription lines together", () => {
    expect(prependNoteLine("💡 new", "- [ ] 💡 old[ ](https://example.com/1)\n\nrest")).toBe(
      "💡 new\n\n- [ ] 💡 old[ ](https://example.com/1)\n\nrest",
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
