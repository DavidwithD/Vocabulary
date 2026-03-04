// ============================================================
// Global state and constants for the vocabulary content script
// ============================================================

const VOCAB_CLASS = 'vocab-builder-word';      // Familiar words (not visually highlighted)
const UNKNOWN_CLASS = 'vocab-builder-unknown';  // Unknown uncommon words (lavender background)
const LEARNING_CLASS = 'vocab-builder-learning'; // Learning words (amber background)

const DEFAULT_CEFR_LEVEL = 'B2';
const DEFAULT_LANGUAGE = 'en';
// CEFR_LEVELS is defined in cefr-words.js: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

let currentLanguage = DEFAULT_LANGUAGE;
let COMMON_WORDS = new Set();

let baseWordSet = new Set();      // Familiar words
let learningWordSet = new Set();  // Learning words
let lastLocalUpdate = 0;          // Timestamp of last local update to skip redundant re-highlights
let highlightEnabled = true;      // Whether highlighting and click interactions are active

// Page-level unique word counters (accumulated during processTextNode)
const pageUnfamiliarLemmas = new Set();
const pageLearningLemmas = new Set();
const pageFamiliarLemmas = new Set();

/**
 * Get the storage key for the current language's word list.
 */
function getWordsKey() {
  return 'words_' + currentLanguage;
}

/**
 * Build the common words Set from all words at or below the given CEFR level.
 * Picks the correct word list based on currentLanguage.
 */
function buildCommonWordsSet(cefrLevel) {
  const source = currentLanguage === 'fr'
    ? (typeof CEFR_WORDS_FR !== 'undefined' ? CEFR_WORDS_FR : null)
    : currentLanguage === 'es'
    ? (typeof CEFR_WORDS_ES !== 'undefined' ? CEFR_WORDS_ES : null)
    : (typeof CEFR_WORDS !== 'undefined' ? CEFR_WORDS : null);
  if (!source) return;

  const idx = CEFR_LEVELS.indexOf(cefrLevel);
  if (idx === -1) return;

  const words = [];
  for (let i = 0; i <= idx; i++) {
    words.push(...source[CEFR_LEVELS[i]]);
  }
  COMMON_WORDS = new Set(words);
}

/**
 * Convert legacy numeric threshold to approximate CEFR level.
 * Used for one-time migration of existing users.
 */
function thresholdToCefrLevel(threshold) {
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
function buildWordSets(words) {
  const familiar = new Set();
  const learning = new Set();
  if (!words || words.length === 0) return { familiar, learning };

  words.forEach(entry => {
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
