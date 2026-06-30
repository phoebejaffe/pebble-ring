import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRecordingStorage } from "./resolve-recording-storage";
import { requireAuth } from "./verify-auth";

const ALLOWED_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

function isAllowedSource(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return (
      protocol === "https:" &&
      ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

function safeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base || "recording.m4a";
}

async function streamAudioFromUrl(
  src: string,
  filename: string,
  res: ServerResponse,
): Promise<boolean> {
  const upstream = await fetch(src);
  if (!upstream.ok) {
    res.statusCode = upstream.status;
    res.end("Failed to fetch audio");
    return false;
  }

  const contentType = upstream.headers.get("content-type") ?? "audio/mp4";
  const buffer = Buffer.from(await upstream.arrayBuffer());

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
  return true;
}

function readQueryParams(req: IncomingMessage): URLSearchParams {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  return requestUrl.searchParams;
}

function readUidAndFileName(params: URLSearchParams): { uid: string; fileName: string } | null {
  const uid = params.get("uid")?.trim() ?? "";
  const fileName = params.get("fileName")?.trim() ?? "";
  if (!uid || !fileName) return null;
  return { uid, fileName };
}

export async function handleRecordingAudioResolveRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const params = readQueryParams(req);
  const target = readUidAndFileName(params);
  if (!target) {
    res.statusCode = 400;
    res.end("uid and fileName are required");
    return;
  }

  if (user.uid !== target.uid) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  if (!user.idToken) {
    res.statusCode = 503;
    res.end("Storage resolution requires authentication");
    return;
  }

  const resolved = await resolveRecordingStorage(target.uid, target.fileName, user.idToken);
  if (!resolved) {
    res.statusCode = 404;
    res.end("Audio not found");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      firebaseUrl: resolved.firebaseUrl,
      downloadFileName: resolved.downloadFileName,
    }),
  );
}

export async function handleRecordingAudioRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const params = readQueryParams(req);
  const target = readUidAndFileName(params);

  if (target) {
    if (user.uid !== target.uid) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    if (!user.idToken) {
      res.statusCode = 503;
      res.end("Storage resolution requires authentication");
      return;
    }

    const resolved = await resolveRecordingStorage(target.uid, target.fileName, user.idToken);
    if (!resolved) {
      res.statusCode = 404;
      res.end("Audio not found");
      return;
    }

    try {
      await streamAudioFromUrl(resolved.firebaseUrl, resolved.downloadFileName, res);
    } catch {
      res.statusCode = 502;
      res.end("Failed to proxy audio");
    }
    return;
  }

  const src = params.get("src");
  const filename = safeFilename(params.get("filename") ?? "recording.m4a");

  if (!src || !isAllowedSource(src)) {
    res.statusCode = 400;
    res.end("Invalid audio source");
    return;
  }

  try {
    await streamAudioFromUrl(src, filename, res);
  } catch {
    res.statusCode = 502;
    res.end("Failed to proxy audio");
  }
}
