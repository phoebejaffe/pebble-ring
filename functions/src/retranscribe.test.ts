import { describe, expect, it, vi } from "vitest";
import { normalizeRetranscription, retranscribeStoredAudio } from "./retranscribe.js";

describe("normalizeRetranscription", () => {
  it("trims non-empty AssemblyAI text and rejects blank values", () => {
    expect(normalizeRetranscription("  hello world  ")).toBe("hello world");
    expect(normalizeRetranscription(" ")).toBeNull();
    expect(normalizeRetranscription(null)).toBeNull();
  });
});

describe("retranscribeStoredAudio", () => {
  it("generates a signed URL and returns AssemblyAI text", async () => {
    const transcribe = vi.fn(async () => ({ status: "completed", text: "  clearer text  " }));
    const createClient = vi.fn(() => ({ transcripts: { transcribe } }));
    const getSignedUrl = vi.fn(async () => "https://storage.example/audio.m4a");

    await expect(
      retranscribeStoredAudio("recordings/event.m4a", {
        getApiKey: () => "test-key",
        getSignedUrl,
        createClient,
      }),
    ).resolves.toBe("clearer text");
    expect(getSignedUrl).toHaveBeenCalledWith("recordings/event.m4a");
    expect(createClient).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(transcribe).toHaveBeenCalledWith({
      audio: "https://storage.example/audio.m4a",
      speech_models: ["universal-2"],
      filter_profanity: false,
      keyterms_prompt: ["Masumi", "Coreads", "Timeblock", "Noteses"],
    });
  });

  it("uses RETRANSCRIBE_KEYTERMS when configured", async () => {
    vi.stubEnv("RETRANSCRIBE_KEYTERMS", "Masumi , , Co-reads");
    const transcribe = vi.fn(async () => ({ status: "completed", text: "text" }));
    try {
      await retranscribeStoredAudio("recordings/event.m4a", {
        getApiKey: () => "test-key",
        getSignedUrl: async () => "https://storage.example/audio.m4a",
        createClient: () => ({ transcripts: { transcribe } }),
      });
    } finally {
      vi.unstubAllEnvs();
    }
    expect(transcribe.mock.calls[0][0].keyterms_prompt).toEqual(["Masumi", "Co-reads"]);
  });

  it("does nothing when the API key is not configured", async () => {
    const getSignedUrl = vi.fn();
    await expect(
      retranscribeStoredAudio("recordings/event.m4a", {
        getApiKey: () => "",
        getSignedUrl,
      }),
    ).resolves.toBeNull();
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("fails safely when AssemblyAI reports an error", async () => {
    await expect(
      retranscribeStoredAudio("recordings/event.m4a", {
        getApiKey: () => "test-key",
        getSignedUrl: async () => "https://storage.example/audio.m4a",
        createClient: () => ({
          transcripts: { transcribe: async () => ({ status: "error" }) },
        }),
      }),
    ).rejects.toThrow("AssemblyAI transcription failed");
  });
});
