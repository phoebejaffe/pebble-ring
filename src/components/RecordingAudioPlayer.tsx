import { useEffect, useState } from "react";
import {
  recordingAudioProxyUrl,
  resolveRecordingAudio,
  type ResolvedRecordingAudio,
} from "../lib/recording-audio";

type Props = {
  uid: string;
  fileName: string | null;
};

export function RecordingAudioPlayer({ uid, fileName }: Props) {
  const [resolved, setResolved] = useState<ResolvedRecordingAudio | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileName) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResolved(null);
    setPlaybackUrl(null);

    resolveRecordingAudio(uid, fileName)
      .then((audio) => {
        if (cancelled) return;
        if (!audio) {
          setError("Audio not found in storage");
          return;
        }
        setResolved(audio);
        setPlaybackUrl(recordingAudioProxyUrl(audio));
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load audio");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, fileName]);

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
