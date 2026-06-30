import { describe, expect, it } from "vitest";
import { candidateFileNames, candidatePaths } from "./recording-audio-paths";

describe("candidateFileNames", () => {
  it("tries the exact filename first when it already has an extension", () => {
    expect(candidateFileNames("ring_abc.raw")[0]).toBe("ring_abc.raw");
  });

  it("dedupes extension variants", () => {
    const names = candidateFileNames("clip.m4a");
    expect(names.filter((name) => name === "clip.m4a")).toHaveLength(1);
  });
});

describe("candidatePaths", () => {
  it("prioritizes uid-root paths for the exact filename", () => {
    const paths = candidatePaths("user-1", "ring_abc.raw");
    expect(paths[0]).toBe("user-1/ring_abc.raw");
  });

  it("dedupes repeated storage paths", () => {
    const paths = candidatePaths("user-1", "clip.m4a");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
