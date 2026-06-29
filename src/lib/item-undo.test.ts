import { describe, expect, it } from "vitest";
import { snapshotItemState } from "./item-undo";

describe("snapshotItemState", () => {
  it("captures empty state when no item exists", () => {
    expect(snapshotItemState(null)).toEqual({ parentListIds: [], deleted: false });
  });

  it("copies list tags and deleted flag", () => {
    expect(
      snapshotItemState({
        parentListIds: ["list-a", "list-b"],
        deleted: false,
      }),
    ).toEqual({
      parentListIds: ["list-a", "list-b"],
      deleted: false,
    });
  });
});
