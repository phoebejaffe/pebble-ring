import { describe, expect, it } from "vitest";
import { EVERYTHING_LIST_ID, INBOX_LIST_ID } from "../types/list";
import { computeParentListIds } from "./list-move";

describe("computeParentListIds", () => {
  it("adds a list when moving from Everything", () => {
    expect(computeParentListIds(["list-a"], EVERYTHING_LIST_ID, "list-b")).toEqual([
      "list-a",
      "list-b",
    ]);
  });

  it("swaps lists when moving between labeled lists", () => {
    expect(computeParentListIds(["list-a", "list-b"], "list-a", "list-c")).toEqual([
      "list-b",
      "list-c",
    ]);
  });

  it("clears all list tags when moving to Unlabeled", () => {
    expect(computeParentListIds(["list-a", "list-b"], "list-a", INBOX_LIST_ID)).toEqual([]);
  });

  it("creates a new tag when moving from Unlabeled", () => {
    expect(computeParentListIds([], INBOX_LIST_ID, "list-a")).toEqual(["list-a"]);
  });
});
