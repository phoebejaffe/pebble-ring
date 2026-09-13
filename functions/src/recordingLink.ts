import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";

type Firestore = ReturnType<typeof getFirestore>;
type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

export const linkSigningSecret = defineSecret("LINK_SIGNING_SECRET");

function secretValue(): string {
  try {
    return linkSigningSecret.value().trim();
  } catch {
    return "";
  }
}

export function recordingLinkToken(eventId: string, secret: string): string {
  return createHmac("sha256", secret).update(`recording:${eventId}`).digest("base64url");
}

function tokenValid(eventId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(recordingLinkToken(eventId, secret));
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function linkBaseUrl(): string {
  if (process.env.RECORDING_LINK_BASE_URL) return process.env.RECORDING_LINK_BASE_URL;
  const projectId = process.env.GCLOUD_PROJECT ?? getApps()[0]?.options.projectId;
  return projectId ? `https://us-central1-${projectId}.cloudfunctions.net/recordingAudio` : "";
}

export function recordingLinkUrl(eventId: string): string | null {
  const secret = secretValue();
  const base = linkBaseUrl();
  if (!secret || !base) return null;
  const params = new URLSearchParams({ id: eventId, t: recordingLinkToken(eventId, secret) });
  return `${base}?${params.toString()}`;
}

export function createRecordingAudioHandler(dependencies: {
  firestore: Firestore;
  bucket: Bucket;
}) {
  return async function handleRecordingAudio(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end();
      return;
    }
    const secret = secretValue();
    const params = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
      .searchParams;
    const id = params.get("id");
    const token = params.get("t");
    if (!secret || !id || !token || !/^[a-f0-9]{32}$/.test(id) || !tokenValid(id, token, secret)) {
      res.statusCode = 403;
      res.end();
      return;
    }

    const event = await dependencies.firestore.collection("webhookEvents").doc(id).get();
    const path = event.data()?.audio?.path;
    if (!event.exists || typeof path !== "string") {
      res.statusCode = 404;
      res.end();
      return;
    }

    const [url] = await dependencies.bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });
    res.statusCode = 302;
    res.setHeader("Location", url);
    res.setHeader("Cache-Control", "private, no-store");
    res.end();
  };
}
