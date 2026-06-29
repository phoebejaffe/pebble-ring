import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebase";

const EXTENSIONS = ["", ".m4a", ".aac", ".opus", ".wav", ".mp3", ".caf", ".raw"];
const KNOWN_EXT = /\.(m4a|aac|opus|wav|mp3|caf|raw)$/i;

export type ResolvedRecordingAudio = {
  firebaseUrl: string;
  downloadFileName: string;
};

function candidatePaths(uid: string, fileName: string): string[] {
  const base = fileName.replace(KNOWN_EXT, "");
  const paths = new Set<string>();

  for (const ext of EXTENSIONS) {
    const name = `${base}${ext}`;
    paths.add(`recordings/${uid}/${name}`);
    paths.add(`recordings/${uid}/audio/${name}`);
    paths.add(`users/${uid}/recordings/${name}`);
    paths.add(`users/${uid}/audio/${name}`);
    paths.add(`audio/${uid}/${name}`);
    paths.add(`${uid}/recordings/${name}`);
    paths.add(`${uid}/${name}`);
  }

  return [...paths];
}

function downloadFileNameForPath(storagePath: string, fileName: string): string {
  const fromPath = storagePath.split("/").pop();
  if (fromPath && KNOWN_EXT.test(fromPath)) return fromPath;

  const extFromPath = storagePath.match(KNOWN_EXT)?.[0];
  const base = fileName.replace(KNOWN_EXT, "") || fromPath || "recording";
  return extFromPath ? `${base}${extFromPath}` : `${base}.m4a`;
}

export async function resolveRecordingAudio(
  uid: string,
  fileName: string,
): Promise<ResolvedRecordingAudio | null> {
  for (const path of candidatePaths(uid, fileName)) {
    try {
      const firebaseUrl = await getDownloadURL(ref(storage, path));
      return {
        firebaseUrl,
        downloadFileName: downloadFileNameForPath(path, fileName),
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function recordingAudioProxyUrl(resolved: ResolvedRecordingAudio): string {
  const params = new URLSearchParams({
    src: resolved.firebaseUrl,
    filename: resolved.downloadFileName,
  });
  return `/api/recording-audio?${params.toString()}`;
}

export async function resolveRecordingAudioUrl(
  uid: string,
  fileName: string,
): Promise<string | null> {
  const resolved = await resolveRecordingAudio(uid, fileName);
  return resolved?.firebaseUrl ?? null;
}
