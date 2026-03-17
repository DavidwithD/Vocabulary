// ============================================================
// Global state and constants for the vocabulary content script
// ============================================================

import type {
  CefrLevel,
  Language,
  WordEntry,
  CefrWordData,
  WordSetsResult,
} from '../types';
// CEFR_WORDS, CEFR_LEVELS, CEFR_WORDS_FR, CEFR_WORDS_ES are global variables
// loaded from data/*.js files before this bundle runs (see manifest.json)

export const FAMILIAR_CLASS = 'vocab-builder-word'; // Familiar words (not visually highlighted)
export const UNKNOWN_CLASS = 'vocab-builder-unknown'; // Unknown uncommon words (lavender background)
export const LEARNING_CLASS = 'vocab-builder-learning'; // Learning words (amber background)

export const DEFAULT_CEFR_LEVEL: CefrLevel = 'B2';
export const DEFAULT_LANGUAGE: Language = 'en';

export let currentLanguage: Language = DEFAULT_LANGUAGE;
export let COMMON_WORDS = new Set<string>(); // Common words at or below the user's CEFR threshold, built from CEFR_WORDS data

export let familiarWordSet = new Set<string>(); // Familiar words
export let learningWordSet = new Set<string>(); // Learning words
export let lastLocalUpdate = 0; // Timestamp of last local update to skip redundant re-highlights
export let highlightEnabled = true; // Whether highlighting and click interactions are active

// Page-level lemma → DOM node maps (accumulated during processTextNode)
// Used for O(1) lookup on click/dblclick and for page stats (.size)
export type LemmaSpanMap = Map<string, Set<HTMLSpanElement>>;
export type LemmaTextMap = Map<string, Set<Text>>;

export const pageUnfamiliarLemmas: LemmaSpanMap = new Map();
export const pageLearningLemmas: LemmaSpanMap = new Map();
export const pageFamiliarLemmas: LemmaSpanMap = new Map();
export const pageCommonLemmas: LemmaTextMap = new Map();

// Setters for mutable state (since we export lets)
export function setCurrentLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function setCommonWords(words: Set<string>): void {
  COMMON_WORDS = words;
}

export function setFamiliarWordSet(words: Set<string>): void {
  familiarWordSet = words;
}

export function setLearningWordSet(words: Set<string>): void {
  learningWordSet = words;
}

export function setLastLocalUpdate(time: number): void {
  lastLocalUpdate = time;
}

export function setHighlightEnabled(enabled: boolean): void {
  highlightEnabled = enabled;
}

/**
 * Get the storage key for the current language's word list.
 */
export function getWordsKey(): `words_${Language}` {
  return `words_${currentLanguage}`;
}

/**
 * Build the common words Set from all words at or below the given CEFR level.
 * Picks the correct word list based on currentLanguage.
 */
export function buildCommonWordsSet(cefrLevel: CefrLevel): void {
  const source: CefrWordData | null =
    currentLanguage === 'fr'
      ? CEFR_WORDS_FR
      : currentLanguage === 'es'
      ? CEFR_WORDS_ES
      : CEFR_WORDS;
  if (!source) return;

  const idx = CEFR_LEVELS.indexOf(cefrLevel);
  if (idx === -1) return;

  const words: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const level = CEFR_LEVELS[i];
    words.push(...source[level]);
  }
  COMMON_WORDS = new Set(words);
}

/**
 * Convert legacy numeric threshold to approximate CEFR level.
 * Used for one-time migration of existing users.
 */
export function thresholdToCefrLevel(threshold: number): CefrLevel {
  if (threshold <= 1000) return 'A2';
  if (threshold <= 2000) return 'B1';
  if (threshold <= 3000) return 'B2';
  if (threshold <= 5000) return 'C1';
  return 'C2';
}

/**
 * Build Sets of familiar and learning words from the user's word list.
 * Enables O(1) lookup regardless of vocabulary size.
 * Words without a status field default to 'familiar' (backward compat).
 */
export function buildWordSets(words: WordEntry[]): WordSetsResult {
  const familiar = new Set<string>();
  const learning = new Set<string>();
  if (!words || words.length === 0) return { familiar, learning };

  words.forEach((entry) => {
    const w = entry.word.toLowerCase().trim();
    const status = entry.status || 'familiar';
    if (status === 'learning') {
      learning.add(w);
    } else {
      familiar.add(w);
    }
  });

  return { familiar, learning };
}
