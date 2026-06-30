import { useEffect, useRef, useState } from "react";
import type { GetIdToken } from "../lib/api-auth";
import { fetchWithAuth } from "../lib/api-auth";
import {
  isKnownMissingAudio,
  markMissingAudio,
  recordingAudioProxyUrl,
} from "../lib/recording-audio";

type Props = {
  uid: string;
  fileName: string | null;
  getIdToken: GetIdToken;
  loadMode?: "eager" | "lazy";
};

const MISSING_AUDIO_MESSAGE = "Audio not found. Try opening the Pebble app to sync.";

export function RecordingAudioPlayer({ uid, fileName, getIdToken, loadMode = "eager" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loadMode === "eager");
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

    if (isKnownMissingAudio(uid, fileName)) {
      setError(MISSING_AUDIO_MESSAGE);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setPlaybackUrl(null);

    async function loadAudio() {
      try {
        const proxyUrl = recordingAudioProxyUrl(uid, fileName!);
        const response = await fetchWithAuth(proxyUrl, getIdToken);
        if (cancelled) return;

        if (response.status === 404) {
          markMissingAudio(uid, fileName!);
          setError(MISSING_AUDIO_MESSAGE);
          return;
        }

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

  if (!playbackUrl) {
    return <div ref={containerRef} />;
  }

  return (
    <div ref={containerRef} className="recording-audio-wrap">
      <audio className="recording-audio" controls preload="metadata" src={playbackUrl}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
