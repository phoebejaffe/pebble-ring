import type { IncomingMessage, ServerResponse } from "node:http";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Auth } from "firebase-admin/auth";

type Firestore = ReturnType<typeof getFirestore>;
type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

function setCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.DASHBOARD_ORIGIN;
  if (origin && (!allowedOrigin || origin === allowedOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function requireUser(req: IncomingMessage, auth: Auth): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const token = header.slice("Bearer ".length).trim();
    return token ? (await auth.verifyIdToken(token)).uid : null;
  } catch {
    return null;
  }
}

function requestId(req: IncomingMessage): string | null {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.get(
    "id",
  );
}

export function createEventsHandler(dependencies: { auth: Auth; firestore: Firestore }) {
  return async function handleEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setCors(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!(await requireUser(req, dependencies.auth))) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const snapshot = await dependencies.firestore
      .collection("webhookEvents")
      .orderBy("recordedAt", "desc")
      .limit(100)
      .get();
    json(res, 200, {
      events: snapshot.docs.map((doc) => {
        const data = doc.data();
        const recordedAt = data.recordedAt?.toMillis?.() ?? null;
        const receivedAt = data.receivedAt?.toMillis?.() ?? null;
        return {
          id: doc.id,
          recordedAt,
          receivedAt,
          client: data.client ?? "unknown",
          transcription: data.transcription ?? null,
          retranscription: data.retranscription ?? null,
          audio: data.audio ?? null,
          processing: data.processing ?? null,
        };
      }),
    });
  };
}

export function createAudioUrlHandler(dependencies: {
  auth: Auth;
  firestore: Firestore;
  bucket: Bucket;
}) {
  return async function handleAudioUrl(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setCors(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!(await requireUser(req, dependencies.auth))) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const id = requestId(req);
    if (!id || !/^[a-f0-9]{32}$/.test(id)) {
      json(res, 400, { error: "A valid event id is required" });
      return;
    }
    const event = await dependencies.firestore.collection("webhookEvents").doc(id).get();
    const path = event.data()?.audio?.path;
    if (!event.exists || typeof path !== "string") {
      json(res, 404, { error: "Audio not found" });
      return;
    }

    const [url] = await dependencies.bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });
    json(res, 200, { url });
  };
}
