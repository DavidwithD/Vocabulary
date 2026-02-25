// ============================================================
// Global state and constants for the vocabulary content script
// ============================================================

const VOCAB_CLASS = 'vocab-builder-word';      // Familiar words (not visually highlighted)
const UNKNOWN_CLASS = 'vocab-builder-unknown';  // Unknown uncommon words (lavender background)
const LEARNING_CLASS = 'vocab-builder-learning'; // Learning words (amber background)

const DEFAULT_THRESHOLD = 3000;
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
 * Build the common words Set from the top N words based on the user's threshold.
 */
function buildCommonWordsSet(threshold) {
  if (typeof COMMON_WORDS_RANKED === 'undefined') return;
  COMMON_WORDS = new Set(COMMON_WORDS_RANKED.slice(0, threshold));
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
