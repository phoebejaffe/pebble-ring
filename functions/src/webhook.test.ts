import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createWebhookHandler, parseMultipartRequest, type EventStore } from "./webhook.js";

const boundary = "test-boundary";

function multipart(fields: Record<string, string>, audio?: Buffer): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  if (audio) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        'Content-Disposition: form-data; name="audio"; filename="ring.m4a"\r\nContent-Type: audio/mp4\r\n\r\n',
      ),
    );
    chunks.push(audio, Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

function request(body: Buffer, authorization = "Bearer test-token") {
  return Object.assign(Readable.from(body), {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length),
      authorization,
    },
  });
}

function response() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(value?: string) {
      this.body = value ?? "";
    },
  };
}

describe("parseMultipartRequest", () => {
  it("parses the Index audio and transcription fields", async () => {
    const payload = await parseMultipartRequest(
      request(
        multipart(
          { recordedAt: "1730000000000", client: "ring", transcription: "Remember milk" },
          Buffer.from("m4a"),
        ),
      ),
    );

    expect(payload).toMatchObject({
      recordedAt: 1730000000000,
      client: "ring",
      transcription: "Remember milk",
      audioContentType: "audio/mp4",
      audioFileName: "ring.m4a",
      audioSize: 3,
    });
  });

  it("accepts text-only events", async () => {
    const payload = await parseMultipartRequest(
      request(multipart({ recordedAt: "1730000000000", client: "ring", transcription: "Hello" })),
    );
    expect(payload.audio).toBeNull();
    expect(payload.transcription).toBe("Hello");
  });
});

describe("createWebhookHandler", () => {
  it("authenticates and stores an event", async () => {
    const events = new Map<string, unknown>();
    const store: EventStore = {
      has: async (id) => events.has(id),
      save: async (event) => void events.set(event.id, event),
    };
    const handler = createWebhookHandler({ authToken: "test-token", store });
    const res = response();

    await handler(
      request(multipart({ recordedAt: "1730000000000", client: "ring", transcription: "Hello" })),
      res,
    );

    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body)).toMatchObject({ accepted: true, duplicate: false });
    expect(events.size).toBe(1);
  });

  it("rejects an invalid token without consuming the payload", async () => {
    const store: EventStore = { has: async () => false, save: async () => undefined };
    const handler = createWebhookHandler({ authToken: "test-token", store });
    const res = response();

    await handler(request(Buffer.from("not parsed"), "Bearer wrong-token"), res);

    expect(res.statusCode).toBe(401);
  });
});
