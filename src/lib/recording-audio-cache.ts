function cacheKey(uid: string, fileName: string): string {
  return `${uid}:${fileName}`;
}

const missingAudio = new Set<string>();

export function isKnownMissingAudio(uid: string, fileName: string): boolean {
  return missingAudio.has(cacheKey(uid, fileName));
}

export function markMissingAudio(uid: string, fileName: string): void {
  missingAudio.add(cacheKey(uid, fileName));
}
