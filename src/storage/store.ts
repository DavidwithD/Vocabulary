// ============================================================
// Typed wrapper around chrome.storage.local
// ============================================================

import type { CefrLevel, Language, WordEntry } from '../types';

/** Shape of all active storage keys with their types and defaults */
export interface StoreData {
  words_en: WordEntry[];
  words_fr: WordEntry[];
  words_es: WordEntry[];
  language: Language;
  cefrLevel: CefrLevel;
  highlightEnabled: boolean;
}

/** Typed change records passed to subscribe() listeners */
export type StoreChanges = {
  [K in keyof StoreData]?: { oldValue?: StoreData[K]; newValue?: StoreData[K] };
};

const DEFAULTS: StoreData = {
  words_en: [],
  words_fr: [],
  words_es: [],
  language: 'en',
  cefrLevel: 'B2',
  highlightEnabled: true,
};

/** Get a single typed value, returning the built-in default if unset. */
export function get<K extends keyof StoreData>(key: K): Promise<StoreData[K]> {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [key]: DEFAULTS[key] }, (data) => {
      resolve(data[key] as StoreData[K]);
    });
  });
}

/** Get multiple typed values in a single storage call. */
export function getMany<K extends keyof StoreData>(
  keys: K[]
): Promise<Pick<StoreData, K>> {
  const defaults = Object.fromEntries(keys.map((k) => [k, DEFAULTS[k]]));
  return new Promise((resolve) => {
    chrome.storage.local.get(defaults, (data) => {
      resolve(data as Pick<StoreData, K>);
    });
  });
}

/** Set a single typed value. */
export function set<K extends keyof StoreData>(
  key: K,
  value: StoreData[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/** Remove a key from storage (for migrations). */
export function remove(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

/** Get the word list for a language. */
export function getWords(lang: Language): Promise<WordEntry[]> {
  return get(`words_${lang}`);
}

/** Set the word list for a language. */
export function setWords(lang: Language, words: WordEntry[]): Promise<void> {
  return set(`words_${lang}`, words);
}

/**
 * Subscribe to storage changes for active keys.
 * Returns an unsubscribe function.
 */
export function subscribe(listener: (changes: StoreChanges) => void): () => void {
  const handler = (
    raw: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area !== 'local') return;
    listener(raw as StoreChanges);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
