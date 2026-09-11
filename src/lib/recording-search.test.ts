import { describe, expect, it } from "vitest";
import { recordingMatchesSearch } from "./recording-search";
import type { ParsedRecording } from "../types/recording";

function recording(overrides: Partial<ParsedRecording> = {}): ParsedRecording {
  return {
    id: "rec1",
    timestampMs: new Date("2026-06-15T12:00:00").getTime(),
    updatedMs: 0,
    title: "Grocery list",
    transcription: "Buy milk and eggs",
    autoTranscription: "Buy milk and eggs",
    userTranscription: "",
    fileName: "audio.m4a",
    status: "done",
    transcribedUsingModel: null,
    raw: {} as ParsedRecording["raw"],
    ...overrides,
  };
}

describe("recordingMatchesSearch", () => {
  it("matches empty query", () => {
    expect(recordingMatchesSearch(recording(), "")).toBe(true);
  });

  it("matches transcription text", () => {
    expect(recordingMatchesSearch(recording(), "milk")).toBe(true);
    expect(recordingMatchesSearch(recording(), "bread")).toBe(false);
  });

  it("matches title", () => {
    expect(recordingMatchesSearch(recording(), "grocery")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(recordingMatchesSearch(recording(), "MILK")).toBe(true);
  });
});
