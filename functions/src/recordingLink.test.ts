import { describe, expect, it } from "vitest";
import { createRecordingAudioHandler, recordingLinkToken } from "./recordingLink.js";

type Deps = Parameters<typeof createRecordingAudioHandler>[0];

const eventId = "0123456789abcdef0123456789abcdef";

function request(query: string) {
  return { method: "GET", url: `/?${query}`, headers: { host: "localhost" } };
}

function response() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end() {},
  };
}

function deps(audioPath: string | null = "recordings/x.m4a"): Deps {
  const firestore = {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: audioPath !== null,
          data: () => ({ audio: audioPath ? { path: audioPath } : null }),
        }),
      }),
    }),
  } as unknown as Deps["firestore"];
  const bucket = {
    file: () => ({
      getSignedUrl: async () => ["https://storage.example/signed"],
    }),
  } as unknown as Deps["bucket"];
  return { firestore, bucket };
}

describe("recordingAudio", () => {
  it("redirects to a fresh signed URL for a valid token", async () => {
    // The handler reads LINK_SIGNING_SECRET from the environment in tests.
    process.env.LINK_SIGNING_SECRET = "test-secret";
    const token = recordingLinkToken(eventId, "test-secret");
    const res = response();

    await createRecordingAudioHandler(deps())(request(`id=${eventId}&t=${token}`), res);

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe("https://storage.example/signed");
  });

  it("rejects a tampered or missing token", async () => {
    process.env.LINK_SIGNING_SECRET = "test-secret";
    const otherId = "ffffffffffffffffffffffffffffffff";
    const token = recordingLinkToken(otherId, "test-secret");
    const res = response();

    await createRecordingAudioHandler(deps())(request(`id=${eventId}&t=${token}`), res);
    expect(res.statusCode).toBe(403);

    const res2 = response();
    await createRecordingAudioHandler(deps())(request(`id=${eventId}`), res2);
    expect(res2.statusCode).toBe(403);
  });

  it("returns 404 when the event has no audio", async () => {
    process.env.LINK_SIGNING_SECRET = "test-secret";
    const token = recordingLinkToken(eventId, "test-secret");
    const res = response();

    await createRecordingAudioHandler(deps(null))(request(`id=${eventId}&t=${token}`), res);

    expect(res.statusCode).toBe(404);
  });
});
