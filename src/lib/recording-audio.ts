import type { GetIdToken } from "./api-auth";
import { fetchWithAuth } from "./api-auth";
import { isKnownMissingAudio, markMissingAudio } from "./recording-audio-cache";

export function recordingAudioProxyUrl(uid: string, fileName: string): string {
  const params = new URLSearchParams({ uid, fileName });
  return `/api/recording-audio?${params.toString()}`;
}

export async function resolveRecordingAudioUrl(
  uid: string,
  fileName: string,
  getIdToken: GetIdToken,
): Promise<string | null> {
  if (isKnownMissingAudio(uid, fileName)) return null;

  const params = new URLSearchParams({ uid, fileName });
  const response = await fetchWithAuth(`/api/recording-audio-resolve?${params}`, getIdToken);

  if (response.status === 404) {
    markMissingAudio(uid, fileName);
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as { firebaseUrl?: string };
  return data.firebaseUrl ?? null;
}

export { isKnownMissingAudio, markMissingAudio };
