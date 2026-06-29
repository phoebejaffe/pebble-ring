import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "./verify-auth";

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

function isAllowedSource(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function safeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base || "recording.m4a";
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

  if (!(await requireAuth(req, res))) return;

  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const src = requestUrl.searchParams.get("src");
  const filename = safeFilename(requestUrl.searchParams.get("filename") ?? "recording.m4a");

  if (!src || !isAllowedSource(src)) {
    res.statusCode = 400;
    res.end("Invalid audio source");
    return;
  }

  try {
    const upstream = await fetch(src);
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end("Failed to fetch audio");
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "audio/mp4";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch {
    res.statusCode = 502;
    res.end("Failed to proxy audio");
  }
}
