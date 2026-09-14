import { describe, expect, it, vi } from "vitest";
import { classifyTranscription } from "./classifyTask.js";

function response(content: string, ok = true) {
  return {
    ok,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

describe("classifyTranscription", () => {
  it("parses a task classification", async () => {
    const fetch = vi.fn(async () => response('{"isTask":true,"confidence":0.93}'));
    await expect(
      classifyTranscription("Put earrings in your ears", { getApiKey: () => "key", fetch }),
    ).resolves.toEqual({ isTask: true, confidence: 0.93 });
    expect(fetch).toHaveBeenCalledWith(
      "https://llm-gateway.assemblyai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accepts JSON wrapped in markdown fences", async () => {
    const fetch = vi.fn(async () => response('```json\n{"isTask":false,"confidence":0.88}\n```'));
    await expect(
      classifyTranscription("Judy loves whales", { getApiKey: () => "key", fetch }),
    ).resolves.toEqual({ isTask: false, confidence: 0.88 });
  });

  it("returns null without a configured key", async () => {
    const fetch = vi.fn();
    await expect(
      classifyTranscription("hello", { getApiKey: () => "", fetch }),
    ).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects failed gateway responses", async () => {
    const fetch = vi.fn(async () => response("", false));
    await expect(classifyTranscription("hello", { getApiKey: () => "key", fetch })).rejects.toThrow(
      "AssemblyAI task classification failed",
    );
  });
});
