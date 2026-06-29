import { useEffect, useState } from "react";
import type { GetIdToken } from "../lib/api-auth";
import { fetchWithAuth } from "../lib/api-auth";
import {
  recordingAudioProxyUrl,
  resolveRecordingAudio,
  type ResolvedRecordingAudio,
} from "../lib/recording-audio";

type Props = {
  uid: string;
  fileName: string | null;
  getIdToken: GetIdToken;
};

export function RecordingAudioPlayer({ uid, fileName, getIdToken }: Props) {
  const [resolved, setResolved] = useState<ResolvedRecordingAudio | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileName) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setResolved(null);
    setPlaybackUrl(null);

    async function loadAudio() {
      try {
        const audio = await resolveRecordingAudio(uid, fileName!);
        if (cancelled) return;
        if (!audio) {
          setError("Audio not found in storage");
          return;
        }

        setResolved(audio);
        const proxyUrl = recordingAudioProxyUrl(audio);
        const response = await fetchWithAuth(proxyUrl, getIdToken);
        if (!response.ok) {
          throw new Error("Failed to load audio");
        }

        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setPlaybackUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setError("Failed to load audio");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAudio();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileName, getIdToken, uid]);

  if (!fileName) {
    return <p className="audio-status muted">No audio file</p>;
  }

  if (loading) {
    return <p className="audio-status muted">Loading audio…</p>;
  }

  if (error) {
    return <p className="audio-status error">{error}</p>;
  }

  if (!playbackUrl || !resolved) {
    return null;
  }

  return (
    <audio
      className="recording-audio"
      controls
      preload="metadata"
      src={playbackUrl}
      onError={() => {
        setPlaybackUrl((current) =>
          current === resolved.firebaseUrl ? current : resolved.firebaseUrl,
        );
      }}
    >
      Your browser does not support audio playback.
    </audio>
  );
}
