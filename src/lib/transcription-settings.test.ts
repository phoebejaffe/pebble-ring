import { describe, expect, it } from "vitest";
import { toAssemblyAiWordConfig } from "./transcription-settings";

describe("toAssemblyAiWordConfig", () => {
  it("maps preferred words and custom spellings", () => {
    expect(
      toAssemblyAiWordConfig({
        wordPreferences: [
          { id: "1", preferred: "Masumi", alternatives: ["Masami", "masami"] },
          { id: "2", preferred: "Pebble", alternatives: [] },
        ],
      }),
    ).toEqual({
      word_boost: ["Masumi", "Pebble"],
      custom_spelling: [{ from: ["Masami", "masami"], to: "Masumi" }],
      boost_param: "high",
    });
  });

  it("skips blank preferences", () => {
    expect(
      toAssemblyAiWordConfig({
        wordPreferences: [{ id: "1", preferred: "  ", alternatives: ["x"] }],
      }),
    ).toEqual({
      word_boost: [],
      custom_spelling: [],
      boost_param: "high",
    });
  });
});
