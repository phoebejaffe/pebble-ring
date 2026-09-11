import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAudioUrl, fetchEvents, type RecordingEvent } from "./api";
import { useAuth } from "./auth";

function formatDate(timestamp: number | null): string {
  return timestamp ? new Date(timestamp).toLocaleString() : "Unknown time";
}

function RecordingCard({ event }: { event: RecordingEvent }) {
  const { user } = useAuth();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const loadAudio = async () => {
    if (!user || !event.audio || audioUrl) return;
    setAudioLoading(true);
    setAudioError(null);
    try {
      setAudioUrl(await fetchAudioUrl(user, event.id));
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Could not load audio");
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <article className="recording-card">
      <div className="recording-header-row">
        <time
          className="recording-time"
          dateTime={event.recordedAt ? new Date(event.recordedAt).toISOString() : undefined}
        >
          {formatDate(event.recordedAt)}
        </time>
        <span className="model-tag">{event.processing?.status ?? "received"}</span>
      </div>
      <p className="recording-client">{event.client}</p>
      <p className="recording-text">
        {event.transcription || <span className="muted">No transcription was included.</span>}
      </p>
      {event.audio && (
        <div className="audio-load">
          {audioUrl ? (
            <audio className="recording-audio" controls src={audioUrl} />
          ) : (
            <button
              type="button"
              className="audio-load-btn"
              disabled={audioLoading}
              onClick={() => void loadAudio()}
            >
              {audioLoading ? "Loading audio…" : "Load recording"}
            </button>
          )}
          {audioError && <p className="audio-status error">{audioError}</p>}
        </div>
      )}
    </article>
  );
}

export function App() {
  const { user, loading: authLoading, error: authError, configured, signIn, signOut } = useAuth();
  const [events, setEvents] = useState<RecordingEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchEvents(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recordings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return events;
    return events.filter((event) =>
      [
        event.transcription,
        event.client,
        event.processing?.category,
        ...(event.processing?.labels ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [events, query]);

  if (!configured) {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">Pebble Index</p>
          <h1>Configure the dashboard</h1>
          <p>
            Set the VITE_FIREBASE_* values for your Firebase project and VITE_API_BASE_URL before
            signing in.
          </p>
        </section>
      </main>
    );
  }

  if (authLoading) return <main className="page">Loading…</main>;

  if (!user) {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">Pebble Index</p>
          <h1>Your recordings</h1>
          <p>Sign in to browse recordings and transcriptions received by your private webhook.</p>
          <button type="button" onClick={() => void signIn()}>
            Sign in with Google
          </button>
          {(authError || error) && <p className="error">{authError || error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page wide">
      <header className="header">
        <div>
          <p className="eyebrow">Pebble Index</p>
          <h1>Recordings</h1>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-btn"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className="secondary-btn" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="recordings-toolbar">
        <span className="muted">{visibleEvents.length} recordings</span>
        <input
          className="recordings-search"
          type="search"
          placeholder="Search transcriptions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {loading && events.length === 0 && <p className="muted">Loading recordings…</p>}
      {!loading && visibleEvents.length === 0 ? (
        <p className="empty-state muted">No recordings found.</p>
      ) : (
        <section className="recordings-list">
          {visibleEvents.map((event) => (
            <RecordingCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </main>
  );
}
