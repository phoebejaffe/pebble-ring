import { describe, expect, it } from "vitest";
import { isApiAuthSkipped } from "./verify-auth";

describe("isApiAuthSkipped", () => {
  it("is false by default", () => {
    expect(isApiAuthSkipped()).toBe(false);
  });

  it("is true when PEBBLE_RING_SKIP_API_AUTH=true", () => {
    const previous = process.env.PEBBLE_RING_SKIP_API_AUTH;
    process.env.PEBBLE_RING_SKIP_API_AUTH = "true";
    expect(isApiAuthSkipped()).toBe(true);
    process.env.PEBBLE_RING_SKIP_API_AUTH = previous;
  });
});
