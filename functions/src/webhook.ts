import { createHash } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import Busboy from "busboy";

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 1024 * 1024;

export type WebhookPayload = {
  audio: Buffer | null;
  audioContentType: string | null;
  audioFileName: string | null;
  transcription: string | null;
  recordedAt: number;
  client: string;
  audioSize: number;
};

export type StoredEvent = {
  id: string;
  audio: Buffer | null;
  audioContentType: string | null;
  audioFileName: string | null;
  transcription: string | null;
  recordedAt: number;
  client: string;
  audioSize: number;
};

export type EventStore = {
  has: (id: string) => Promise<boolean>;
  save: (event: StoredEvent) => Promise<void>;
};

type ParsedMultipart = Omit<WebhookPayload, "recordedAt" | "client"> & {
  recordedAt: string | null;
  client: string | null;
};

function responseJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function requestHeader(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function isAuthorized(req: IncomingMessage, headerName: string, expectedToken: string): boolean {
  const actual = requestHeader(req.headers, headerName);
  if (!actual) return false;
  const expected =
    headerName.toLowerCase() === "authorization" ? `Bearer ${expectedToken}` : expectedToken;
  return actual === expected;
}

function parseRecordedAt(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) throw new Error("recordedAt must be Unix milliseconds");
  const recordedAt = Number(value);
  if (!Number.isSafeInteger(recordedAt) || recordedAt <= 0) {
    throw new Error("recordedAt must be a positive Unix millisecond timestamp");
  }
  return recordedAt;
}

function eventId(payload: WebhookPayload): string {
  const hash = createHash("sha256");
  hash.update(String(payload.recordedAt));
  hash.update("\0");
  hash.update(payload.client);
  hash.update("\0");
  hash.update(payload.transcription ?? "");
  hash.update("\0");
  if (payload.audio) hash.update(payload.audio);
  return hash.digest("hex").slice(0, 32);
}

export async function parseMultipartRequest(req: IncomingMessage): Promise<WebhookPayload> {
  const contentType = requestHeader(req.headers, "content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data")) {
    throw new Error("Content-Type must be multipart/form-data");
  }

  const parsed: ParsedMultipart = {
    audio: null,
    audioContentType: null,
    audioFileName: null,
    transcription: null,
    recordedAt: null,
    client: null,
    audioSize: 0,
  };

  await new Promise<void>((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 4, fieldSize: 1_000_000 },
    });
    let settled = false;
    let fileTooLarge = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    busboy.on("field", (name, value) => {
      if (name === "transcription") parsed.transcription = value;
      if (name === "recordedAt") parsed.recordedAt = value;
      if (name === "client") parsed.client = value;
    });
    busboy.on("file", (name, stream, info) => {
      if (name !== "audio") {
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => {
        fileTooLarge = true;
      });
      stream.on("end", () => {
        parsed.audio = Buffer.concat(chunks);
        parsed.audioContentType = info.mimeType || "audio/mp4";
        parsed.audioFileName = info.filename || null;
        parsed.audioSize = parsed.audio.length;
      });
    });
    busboy.on("error", fail);
    busboy.on("finish", () => {
      if (settled) return;
      if (fileTooLarge) return fail(new Error("audio exceeds the 25 MB limit"));
      settled = true;
      resolve();
    });

    req.on("error", fail);
    req.pipe(busboy);
  });

  const recordedAt = parseRecordedAt(parsed.recordedAt);
  const client = parsed.client?.trim();
  if (!client) throw new Error("client is required");
  if (!parsed.audio && !parsed.transcription?.trim()) {
    throw new Error("audio or transcription is required");
  }

  return {
    audio: parsed.audio,
    audioContentType: parsed.audioContentType,
    audioFileName: parsed.audioFileName,
    transcription: parsed.transcription?.trim() || null,
    recordedAt,
    client,
    audioSize: parsed.audioSize,
  };
}

export function createWebhookHandler(options: {
  authHeader?: string;
  authToken: string | (() => string);
  store: EventStore;
}) {
  const authHeader = options.authHeader ?? "authorization";
  const getAuthToken = (): string =>
    typeof options.authToken === "function" ? options.authToken() : options.authToken;

  return async function handleWebhookRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method !== "POST") {
      responseJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!isAuthorized(req, authHeader, getAuthToken())) {
      responseJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const length = Number(requestHeader(req.headers, "content-length") ?? 0);
    if (length > MAX_REQUEST_BYTES) {
      responseJson(res, 413, { error: "Request is too large" });
      return;
    }

    try {
      const payload = await parseMultipartRequest(req);
      const id = eventId(payload);
      if (await options.store.has(id)) {
        responseJson(res, 200, { accepted: true, duplicate: true, id });
        return;
      }
      await options.store.save({ ...payload, id });
      responseJson(res, 202, { accepted: true, duplicate: false, id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid webhook request";
      const status = message.includes("exceeds") || message.includes("too large") ? 413 : 400;
      responseJson(res, status, { error: message });
    }
  };
}
