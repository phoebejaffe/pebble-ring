import type { User } from "firebase/auth";

export type RecordingEvent = {
  id: string;
  recordedAt: number | null;
  receivedAt: number | null;
  client: string;
  transcription: string | null;
  audio: {
    path: string;
    contentType: string;
    size: number;
    originalFileName: string | null;
  } | null;
  processing: {
    status: string;
    category?: string | null;
    labels?: string[];
    reason?: string;
  } | null;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string, user: User): Promise<Response> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed");
  return response;
}

export async function fetchEvents(user: User): Promise<RecordingEvent[]> {
  const response = await apiFetch("/eventsApi", user);
  return ((await response.json()) as { events: RecordingEvent[] }).events;
}

export async function fetchAudioUrl(user: User, eventId: string): Promise<string> {
  const response = await apiFetch(`/eventAudioUrl?id=${encodeURIComponent(eventId)}`, user);
  return ((await response.json()) as { url: string }).url;
}
