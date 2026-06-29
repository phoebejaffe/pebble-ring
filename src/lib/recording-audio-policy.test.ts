import { describe, expect, it } from "vitest";
import { EAGER_AUDIO_MS, shouldEagerLoadAudio } from "./recording-audio-policy";

describe("shouldEagerLoadAudio", () => {
  const now = new Date("2026-06-29T12:00:00Z").getTime();

  it("eager-loads recordings from the last 7 days", () => {
    expect(shouldEagerLoadAudio(now - EAGER_AUDIO_MS + 1, now)).toBe(true);
    expect(shouldEagerLoadAudio(now - 24 * 60 * 60 * 1000, now)).toBe(true);
  });

  it("lazy-loads older recordings", () => {
    expect(shouldEagerLoadAudio(now - EAGER_AUDIO_MS - 1, now)).toBe(false);
    expect(shouldEagerLoadAudio(now - 30 * 24 * 60 * 60 * 1000, now)).toBe(false);
  });

  it("lazy-loads invalid timestamps", () => {
    expect(shouldEagerLoadAudio(0, now)).toBe(false);
    expect(shouldEagerLoadAudio(Number.NaN, now)).toBe(false);
  });
});
