// ============================================================
// Type definitions for Vocabulary Builder extension
// ============================================================

/** Supported CEFR levels */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Supported languages */
export type Language = 'en' | 'fr' | 'es';

/** Word learning status */
export type WordStatus = 'familiar' | 'learning';

/** A word entry stored in Chrome storage */
export interface WordEntry {
  word: string;
  status?: WordStatus;
}

/** CEFR word data organized by level */
export type CefrWordData = Record<CefrLevel, string[]>;

/** Storage data shape for Chrome local storage */
export interface StorageData {
  words_en?: WordEntry[];
  words_fr?: WordEntry[];
  words_es?: WordEntry[];
  language?: Language;
  cefrLevel?: CefrLevel;
  highlightEnabled?: boolean;
  /** @deprecated Legacy key, migrated to cefrLevel */
  commonWordThreshold?: number;
  /** @deprecated Legacy key, migrated to words_en */
  words?: WordEntry[];
}

/** Storage key for words per language */
export type WordsStorageKey = `words_${Language}`;

/** Message types for communication between popup and content scripts */
export interface PageStatsRequest {
  type: 'getPageStats';
}

export interface PageStatsResponse {
  unfamiliar: number;
  learning: number;
  familiar: number;
}

/** Build result of splitting words into familiar/learning Sets */
export interface WordSetsResult {
  familiar: Set<string>;
  learning: Set<string>;
}
