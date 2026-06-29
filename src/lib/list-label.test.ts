import { describe, expect, it } from "vitest";
import { INBOX_LIST_ID } from "../types/list";
import { listLabel } from "./list-label";

describe("listLabel", () => {
  it("returns friendly names for pseudo lists", () => {
    expect(listLabel(INBOX_LIST_ID, [])).toBe("Unlabeled");
  });

  it("returns the list title when known", () => {
    expect(
      listLabel("list-shopping", [
        {
          id: "list-shopping",
          title: "Shopping",
          icon: "🛒",
          listKind: "note",
          seed: null,
          deleted: false,
          createdAt: 0,
          updatedAt: 0,
        },
      ]),
    ).toBe("Shopping");
  });
});
