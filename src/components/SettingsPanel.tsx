import { useTranscriptionSettings } from "../contexts/TranscriptionSettingsContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsPanel({ open, onClose }: Props) {
  const { settings, addWordPreference, updateWordPreference, removeWordPreference } =
    useTranscriptionSettings();

  if (!open) return null;

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section className="settings-section">
          <h3>Transcription word preferences</h3>
          <p className="muted settings-help">
            Boost preferred spellings during AssemblyAI retranscription and replace common
            mishearings. Default: Masumi instead of Masami.
          </p>

          <div className="word-pref-list">
            {settings.wordPreferences.map((pref) => (
              <div key={pref.id} className="word-pref-row">
                <label>
                  <span>Prefer</span>
                  <input
                    type="text"
                    value={pref.preferred}
                    placeholder="Masumi"
                    onChange={(e) =>
                      updateWordPreference(pref.id, { preferred: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Replace</span>
                  <input
                    type="text"
                    value={pref.alternatives.join(", ")}
                    placeholder="Masami, masami"
                    onChange={(e) =>
                      updateWordPreference(pref.id, {
                        alternatives: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-btn danger"
                  title="Remove"
                  onClick={() => removeWordPreference(pref.id)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="secondary-btn" onClick={addWordPreference}>
            + Add word
          </button>
        </section>
      </div>
    </div>
  );
}
