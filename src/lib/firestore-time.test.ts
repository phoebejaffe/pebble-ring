import { describe, expect, it } from "vitest";
import { firestoreToMs, msToFirestore } from "./firestore-time";

describe("firestoreToMs", () => {
  it("returns 0 for nullish values", () => {
    expect(firestoreToMs(null)).toBe(0);
    expect(firestoreToMs(undefined)).toBe(0);
  });

  it("treats large numbers as milliseconds", () => {
    expect(firestoreToMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it("treats small numbers as seconds", () => {
    expect(firestoreToMs(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it("reads pebble epochSeconds timestamps", () => {
    expect(
      firestoreToMs({
        epochSeconds: 1_700_000_000,
        nanosecondsOfSecond: 500_000_000,
      }),
    ).toBe(1_700_000_000_500);
  });
});

describe("msToFirestore", () => {
  it("round-trips through firestoreToMs", () => {
    const ms = 1_700_000_123_456;
    expect(firestoreToMs(msToFirestore(ms))).toBe(ms);
  });
});
