export const EAGER_AUDIO_DAYS = 3;
export const EAGER_AUDIO_MS = EAGER_AUDIO_DAYS * 24 * 60 * 60 * 1000;

export function shouldEagerLoadAudio(timestampMs: number, now = Date.now()): boolean {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return false;
  return now - timestampMs <= EAGER_AUDIO_MS;
}
