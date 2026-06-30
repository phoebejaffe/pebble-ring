import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { fetchPebbleContent, type PebbleContent } from "./api";
import { RecordingsView } from "./components/RecordingsView";
import { SettingsPanel } from "./components/SettingsPanel";
import { HeaderMenu } from "./components/HeaderMenu";
import { RawJsonModal } from "./components/RawJsonModal";
import { TipsModal } from "./components/TipsModal";
import { TranscriptionSettingsProvider } from "./contexts/TranscriptionSettingsContext";

export function App() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();
  const [content, setContent] = useState<PebbleContent | null>(null);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const refreshContent = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);
    setFetchError(null);

    try {
      const data = await fetchPebbleContent(user.uid);
      setContent(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setContent(null);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setFetching(true);
    setFetchError(null);

    fetchPebbleContent(user.uid)
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load content");
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <main className="page">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="page">
        <div className="card">
          <h1>Pebble Ring</h1>
          <p>Sign in with the same Google account you use for Pebble / Index.</p>
          <button type="button" onClick={() => void signInWithGoogle()}>
            Sign in with Google
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <TranscriptionSettingsProvider>
      <main className="page wide">
        <header className="header">
          <h1>Pebble Ring</h1>
          <HeaderMenu
            userLabel={user.email ?? user.uid}
            refreshing={refreshing}
            onRefresh={() => void refreshContent()}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenTips={() => setTipsOpen(true)}
            onShowRawJson={() => setRawJsonOpen(true)}
            onSignOut={() => void signOut()}
          />
        </header>

        {error && <p className="error">{error}</p>}
        {fetching && <p className="muted">Loading your Pebble content…</p>}
        {fetchError && <p className="error">{fetchError}</p>}

        {content && (
          <RecordingsView uid={user.uid} content={content} onContentChange={setContent} />
        )}

        <RawJsonModal open={rawJsonOpen} content={content} onClose={() => setRawJsonOpen(false)} />

        <TipsModal open={tipsOpen} onClose={() => setTipsOpen(false)} />

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>
    </TranscriptionSettingsProvider>
  );
}
