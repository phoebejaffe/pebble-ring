import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { fetchPebbleContent, type PebbleContent } from "./api";

export function App() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth();
  const [content, setContent] = useState<PebbleContent | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    <main className="page">
      <header className="header">
        <div>
          <h1>Pebble Ring</h1>
          <p className="muted">
            Signed in as {user.email ?? user.uid}
          </p>
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      {error && <p className="error">{error}</p>}
      {fetching && <p className="muted">Loading your Pebble content…</p>}
      {fetchError && <p className="error">{fetchError}</p>}

      {content && (
        <section className="dump">
          <div className="stats">
            <span>{content.recordings.length} recordings</span>
            <span>{content.items.length} items</span>
            <span>{content.lists.length} lists</span>
          </div>
          <pre>{JSON.stringify(content, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
