export type WordPreference = {
  id: string;
  /** Word or name to prefer in transcripts */
  preferred: string;
  /** Misheard variants to replace, e.g. Masami */
  alternatives: string[];
};

export type TranscriptionSettings = {
  wordPreferences: WordPreference[];
};

const STORAGE_KEY = "pebble-ring-transcription-settings";

export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
  wordPreferences: [
    {
      id: "masumi",
      preferred: "Masumi",
      alternatives: ["Masami", "masami", "MASAMI"],
    },
  ],
};

export function createWordPreferenceId(): string {
  return `word_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadTranscriptionSettings(): TranscriptionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TRANSCRIPTION_SETTINGS;
    const parsed = JSON.parse(raw) as TranscriptionSettings;
    if (!Array.isArray(parsed.wordPreferences)) return DEFAULT_TRANSCRIPTION_SETTINGS;
    return {
      wordPreferences: parsed.wordPreferences
        .filter((p) => p && typeof p.preferred === "string")
        .map((p) => ({
          id: typeof p.id === "string" ? p.id : createWordPreferenceId(),
          preferred: p.preferred.trim(),
          alternatives: Array.isArray(p.alternatives)
            ? p.alternatives.map((a) => String(a).trim()).filter(Boolean)
            : [],
        }))
        .filter((p) => p.preferred.length > 0),
    };
  } catch {
    return DEFAULT_TRANSCRIPTION_SETTINGS;
  }
}

export function saveTranscriptionSettings(settings: TranscriptionSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export type AssemblyAiWordConfig = {
  word_boost: string[];
  custom_spelling: Array<{ from: string[]; to: string }>;
  boost_param: "high";
};

export function toAssemblyAiWordConfig(
  settings: TranscriptionSettings,
): AssemblyAiWordConfig {
  const word_boost: string[] = [];
  const custom_spelling: Array<{ from: string[]; to: string }> = [];

  for (const pref of settings.wordPreferences) {
    const preferred = pref.preferred.trim();
    if (!preferred) continue;

    word_boost.push(preferred);

    const alternatives = pref.alternatives.map((a) => a.trim()).filter(Boolean);
    if (alternatives.length > 0) {
      custom_spelling.push({ from: alternatives, to: preferred });
    }
  }

  return {
    word_boost,
    custom_spelling,
    boost_param: "high",
  };
}
