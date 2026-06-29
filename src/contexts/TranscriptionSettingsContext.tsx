import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createWordPreferenceId,
  DEFAULT_TRANSCRIPTION_SETTINGS,
  loadTranscriptionSettings,
  saveTranscriptionSettings,
  type TranscriptionSettings,
  type WordPreference,
} from "../lib/transcription-settings";

type TranscriptionSettingsContextValue = {
  settings: TranscriptionSettings;
  setSettings: (settings: TranscriptionSettings) => void;
  addWordPreference: () => void;
  updateWordPreference: (id: string, patch: Partial<WordPreference>) => void;
  removeWordPreference: (id: string) => void;
};

const TranscriptionSettingsContext = createContext<TranscriptionSettingsContextValue | null>(
  null,
);

export function TranscriptionSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<TranscriptionSettings>(() =>
    loadTranscriptionSettings(),
  );

  const addWordPreference = useCallback(() => {
    setSettingsState((current) => {
      const next = {
        ...current,
        wordPreferences: [
          ...current.wordPreferences,
          { id: createWordPreferenceId(), preferred: "", alternatives: [] },
        ],
      };
      saveTranscriptionSettings(next);
      return next;
    });
  }, []);

  const updateWordPreference = useCallback((id: string, patch: Partial<WordPreference>) => {
    setSettingsState((current) => {
      const next = {
        ...current,
        wordPreferences: current.wordPreferences.map((pref) =>
          pref.id === id ? { ...pref, ...patch } : pref,
        ),
      };
      saveTranscriptionSettings(next);
      return next;
    });
  }, []);

  const removeWordPreference = useCallback((id: string) => {
    setSettingsState((current) => {
      const next = {
        ...current,
        wordPreferences: current.wordPreferences.filter((pref) => pref.id !== id),
      };
      saveTranscriptionSettings(next);
      return next;
    });
  }, []);

  const setSettings = useCallback((next: TranscriptionSettings) => {
    setSettingsState(next);
    saveTranscriptionSettings(next);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      addWordPreference,
      updateWordPreference,
      removeWordPreference,
    }),
    [settings, setSettings, addWordPreference, updateWordPreference, removeWordPreference],
  );

  return (
    <TranscriptionSettingsContext.Provider value={value}>
      {children}
    </TranscriptionSettingsContext.Provider>
  );
}

export function useTranscriptionSettings() {
  const ctx = useContext(TranscriptionSettingsContext);
  if (!ctx) {
    throw new Error("useTranscriptionSettings must be used within TranscriptionSettingsProvider");
  }
  return ctx;
}

export { DEFAULT_TRANSCRIPTION_SETTINGS };
