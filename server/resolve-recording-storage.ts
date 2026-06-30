import { firebaseConfig } from "../src/config";
import { candidatePaths, downloadFileNameForPath } from "../src/lib/recording-audio-paths";

export type ResolvedRecordingStorage = {
  firebaseUrl: string;
  downloadFileName: string;
  storagePath: string;
};

type StorageMetadata = {
  downloadTokens?: string;
};

function encodeObjectName(path: string): string {
  return encodeURIComponent(path);
}

function buildDownloadUrl(storagePath: string, downloadToken: string): string {
  const bucket = firebaseConfig.storageBucket;
  const encoded = encodeObjectName(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${downloadToken}`;
}

async function tryResolvePath(storagePath: string, idToken: string): Promise<string | null> {
  const bucket = firebaseConfig.storageBucket;
  const encoded = encodeObjectName(storagePath);
  const metadataUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}`;

  const response = await fetch(metadataUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) return null;

  const metadata = (await response.json()) as StorageMetadata;
  const downloadToken = metadata.downloadTokens?.split(",")[0]?.trim();
  if (!downloadToken) return null;

  return buildDownloadUrl(storagePath, downloadToken);
}

export async function resolveRecordingStorage(
  uid: string,
  fileName: string,
  idToken: string,
): Promise<ResolvedRecordingStorage | null> {
  for (const storagePath of candidatePaths(uid, fileName)) {
    const firebaseUrl = await tryResolvePath(storagePath, idToken);
    if (!firebaseUrl) continue;

    return {
      firebaseUrl,
      downloadFileName: downloadFileNameForPath(storagePath, fileName),
      storagePath,
    };
  }

  return null;
}
