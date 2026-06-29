import { useEffect, useRef, useState } from "react";
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
  loadMode?: "eager" | "lazy";
};

export function RecordingAudioPlayer({ uid, fileName, getIdToken, loadMode = "eager" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loadMode === "eager");
  const [resolved, setResolved] = useState<ResolvedRecordingAudio | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadMode !== "lazy" || shouldLoad) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMode, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !fileName) return;

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
  }, [shouldLoad, fileName, getIdToken, uid]);

  if (!fileName) {
    return <p className="audio-status muted">No audio file</p>;
  }

  if (!shouldLoad) {
    return (
      <div ref={containerRef} className="audio-status">
        <button type="button" className="audio-load-btn" onClick={() => setShouldLoad(true)}>
          Load audio
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div ref={containerRef} className="audio-status muted">
        Loading audio…
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="audio-status error">
        {error}
      </div>
    );
  }

  if (!playbackUrl || !resolved) {
    return <div ref={containerRef} />;
  }

  return (
    <div ref={containerRef}>
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
    </div>
  );
}
