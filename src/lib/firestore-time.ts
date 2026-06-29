export type FirestoreTimestamp = {
  epochSeconds: number;
  nanosecondsOfSecond: number;
};

export function msToFirestore(ms: number): FirestoreTimestamp {
  const epochSeconds = Math.floor(ms / 1000);
  return {
    epochSeconds,
    nanosecondsOfSecond: (ms - epochSeconds * 1000) * 1e6,
  };
}

export function firestoreToMs(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value > 1e12 ? value : value * 1000;
  if (typeof value === "object") {
    const ts = value as Record<string, unknown>;
    if (typeof ts.toMillis === "function") {
      return (ts.toMillis as () => number)();
    }
    if (typeof ts.seconds === "number") {
      return ts.seconds * 1000 + Math.floor(((ts.nanoseconds as number) ?? 0) / 1e6);
    }
    if (typeof ts.epochSeconds === "number") {
      return ts.epochSeconds * 1000 + Math.floor(((ts.nanosecondsOfSecond as number) ?? 0) / 1e6);
    }
    if (typeof ts._seconds === "number") {
      return ts._seconds * 1000 + Math.floor(((ts._nanoseconds as number) ?? 0) / 1e6);
    }
  }
  return 0;
}
