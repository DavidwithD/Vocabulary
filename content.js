// ============================================================
// Common words list (ranked by frequency, loaded from common-words.js)
// ============================================================
// COMMON_WORDS_RANKED is a frequency-ordered array loaded from common-words.js.
// We build a Set from the top N words based on the user's threshold setting.

const DEFAULT_THRESHOLD = 3000;
let COMMON_WORDS = new Set();

function buildCommonWordsSet(threshold) {
  if (typeof COMMON_WORDS_RANKED === 'undefined') return;
  COMMON_WORDS = new Set(COMMON_WORDS_RANKED.slice(0, threshold));
}

// ============================================================
// Lemmatization using compromise.js
// ============================================================

const VOCAB_CLASS = 'vocab-builder-word';  // For familiar words (not visually highlighted)
const UNKNOWN_CLASS = 'vocab-builder-unknown';  // For unknown uncommon words (lavender background)
const LEARNING_CLASS = 'vocab-builder-learning';  // For learning words (amber background)
let baseWordSet = new Set();  // Familiar words
let learningWordSet = new Set();  // Learning words
let lastLocalUpdate = 0;  // Timestamp of last local update to skip redundant re-highlights
let highlightEnabled = true;  // Whether highlighting and click interactions are active

// Page-level unique word counters (accumulated during processTextNode)
const pageUnfamiliarLemmas = new Set();
const pageLearningLemmas = new Set();
const pageFamiliarLemmas = new Set();

/**
 * Build Sets of familiar and learning words from the user's word list.
 * This enables O(1) lookup regardless of vocabulary size.
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

/**
 * Cache for lemmatization results.
 * Avoids redundant compromise.js NLP calls for repeated words.
 */
const lemmaCache = new Map();

/**
 * Lemmatize a word using compromise.js and return its base form.
 * Results are cached for performance.
 * Also handles contractions (e.g., "haven't" → "have").
 */
function lemmatize(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lemmaCache.has(lower)) return lemmaCache.get(lower);

  if (typeof nlp !== 'function') {
    lemmaCache.set(lower, lower);
    return lower;
  }

  const doc = nlp(word);
  let result;

  // For verbs, get the infinitive form
  const verbs = doc.verbs();
  if (verbs.length > 0) {
    result = verbs.toInfinitive().text().toLowerCase();
  } else {
    // For nouns, get singular form
    const nouns = doc.nouns();
    if (nouns.length > 0) {
      result = nouns.toSingular().text().toLowerCase();
    } else {
      // Fallback to root form
      result = doc.text('root').toLowerCase();
    }
  }

  lemmaCache.set(lower, result);
  return result;
}

/**
 * Remove all previously applied highlights, restoring original text nodes.
 */
function removeHighlights(root) {
  const vocab = root.querySelectorAll('.' + VOCAB_CLASS);
  const unknown = root.querySelectorAll('.' + UNKNOWN_CLASS);
  const learning = root.querySelectorAll('.' + LEARNING_CLASS);

  [...vocab, ...unknown, ...learning].forEach(span => {
    const text = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(text, span);
  });

  root.normalize(); // merge adjacent text nodes

  // Reset page stats for full re-highlight
  pageUnfamiliarLemmas.clear();
  pageLearningLemmas.clear();
  pageFamiliarLemmas.clear();
}

const CHUNK_SIZE = 50; // Text nodes processed per animation frame

/**
 * Collect text nodes from `root` that need highlighting.
 */
function collectTextNodes(root) {
  if (typeof nlp !== 'function' || typeof COMMON_WORDS_RANKED === 'undefined') return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent && (parent.classList.contains(VOCAB_CLASS) || parent.classList.contains(UNKNOWN_CLASS) || parent.classList.contains(LEARNING_CLASS))) {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = parent?.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  return textNodes;
}

/**
 * Process a single text node: split into words, classify, and wrap in spans.
 */
function processTextNode(textNode) {
  const text = textNode.textContent;
  if (!text.trim()) return;

  const words = text.split(/\b/);
  const fragment = document.createDocumentFragment();

  words.forEach(word => {
    if (/\w/.test(word)) {
      if (/^[\d.,]+$|^\d+(st|nd|rd|th)$/i.test(word)) {
        fragment.appendChild(document.createTextNode(word));
        return;
      }

      const lemma = lemmatize(word);

      if (baseWordSet.has(lemma)) {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = VOCAB_CLASS;
        span.dataset.lemma = lemma;
        fragment.appendChild(span);
        pageFamiliarLemmas.add(lemma);
      } else if (learningWordSet.has(lemma)) {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = LEARNING_CLASS;
        span.dataset.lemma = lemma;
        span.style.backgroundColor = '#fff3e0';
        span.style.color = '#e65100';
        span.style.cursor = 'pointer';
        fragment.appendChild(span);
        pageLearningLemmas.add(lemma);
      } else if (!COMMON_WORDS.has(lemma)) {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = UNKNOWN_CLASS;
        span.dataset.lemma = lemma;
        span.style.backgroundColor = '#f0e6ff';
        span.style.color = '#5e35b1';
        span.style.cursor = 'pointer';
        fragment.appendChild(span);
        pageUnfamiliarLemmas.add(lemma);
      } else {
        fragment.appendChild(document.createTextNode(word));
      }
    } else {
      fragment.appendChild(document.createTextNode(word));
    }
  });

  textNode.parentNode.replaceChild(fragment, textNode);
}

/**
 * Walk all text nodes in `root` and highlight words.
 * Processes in chunks of CHUNK_SIZE nodes per animation frame to avoid blocking.
 */
function highlightWords(root) {
  const textNodes = collectTextNodes(root);
  if (textNodes.length === 0) return;

  let i = 0;
  function processChunk() {
    const end = Math.min(i + CHUNK_SIZE, textNodes.length);
    while (i < end) {
      // Node may have been detached by a previous chunk — skip if so
      if (textNodes[i].parentNode) {
        processTextNode(textNodes[i]);
      }
      i++;
    }
    if (i < textNodes.length) {
      requestAnimationFrame(processChunk);
    }
  }
  requestAnimationFrame(processChunk);
}

/**
 * Remove old highlights, then re-apply with current word sets.
 * Non-blocking: uses chunked processing via requestAnimationFrame.
 */
function refreshHighlighting() {
  removeHighlights(document.body);
  highlightWords(document.body);
}

// ============================================================
// Click interactions
// ============================================================

/**
 * Add an unknown word to the learning list.
 * Provides immediate UI feedback before storage completes.
 */
function addWordAsLearning(lemma) {
  // Immediate visual feedback
  learningWordSet.add(lemma);

  // Update all instances of this lemma on the page
  const allUnknown = document.querySelectorAll('.' + UNKNOWN_CLASS);
  allUnknown.forEach(span => {
    if (span.dataset.lemma === lemma) {
      span.className = LEARNING_CLASS;
      span.style.backgroundColor = '#fff3e0';
      span.style.color = '#e65100';
      span.style.cursor = 'pointer';
    }
  });

  lastLocalUpdate = Date.now();

  chrome.storage.local.get({ words: [] }, (data) => {
    const exists = data.words.some(entry => entry.word.toLowerCase() === lemma);
    if (exists) return;

    const newWord = { word: lemma, status: 'learning' };
    const updatedWords = [newWord, ...data.words];
    chrome.storage.local.set({ words: updatedWords });
  });
}

/**
 * Promote a learning word to familiar.
 * Provides immediate UI feedback before storage completes.
 */
function promoteToFamiliar(lemma) {
  // Immediate visual feedback
  learningWordSet.delete(lemma);
  baseWordSet.add(lemma);

  const allLearning = document.querySelectorAll('.' + LEARNING_CLASS);
  allLearning.forEach(span => {
    if (span.dataset.lemma === lemma) {
      span.className = VOCAB_CLASS;
      span.style.backgroundColor = '';
      span.style.color = '';
      span.style.cursor = '';
    }
  });

  lastLocalUpdate = Date.now();

  chrome.storage.local.get({ words: [] }, (data) => {
    const updatedWords = data.words.map(entry => {
      if (entry.word.toLowerCase() === lemma) {
        return { ...entry, status: 'familiar' };
      }
      return entry;
    });
    chrome.storage.local.set({ words: updatedWords });
  });
}

/**
 * Demote a familiar word back to learning.
 * Provides immediate UI feedback before storage completes.
 */
function demoteToLearning(lemma) {
  // Immediate visual feedback
  baseWordSet.delete(lemma);
  learningWordSet.add(lemma);

  const allFamiliar = document.querySelectorAll('.' + VOCAB_CLASS);
  allFamiliar.forEach(span => {
    if (span.dataset.lemma === lemma) {
      span.className = LEARNING_CLASS;
      span.style.backgroundColor = '#fff3e0';
      span.style.color = '#e65100';
      span.style.cursor = 'pointer';
    }
  });

  lastLocalUpdate = Date.now();

  chrome.storage.local.get({ words: [] }, (data) => {
    const updatedWords = data.words.map(entry => {
      if (entry.word.toLowerCase() === lemma) {
        return { ...entry, status: 'learning' };
      }
      return entry;
    });
    chrome.storage.local.set({ words: updatedWords });
  });
}

/**
 * Add a common word (plain text, no span) to the learning list.
 * Uses a targeted DOM walk to find and wrap only matching text nodes,
 * avoiding a full-page refresh.
 */
function addCommonWordAsLearning(word) {
  const lemma = lemmatize(word);
  learningWordSet.add(lemma);

  lastLocalUpdate = Date.now();

  chrome.storage.local.get({ words: [] }, (data) => {
    const exists = data.words.some(entry => entry.word.toLowerCase() === lemma);
    if (exists) return;

    const newWord = { word: lemma, status: 'learning' };
    const updatedWords = [newWord, ...data.words];
    chrome.storage.local.set({ words: updatedWords });
  });

  // Targeted update: walk text nodes and wrap only this word's occurrences
  wrapWordInTextNodes(document.body, lemma);
}

/**
 * Walk text nodes in `root` and wrap occurrences of a specific lemma
 * as learning spans. Only touches nodes containing the target word.
 */
function wrapWordInTextNodes(root, targetLemma) {
  const textNodes = collectTextNodes(root);

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    if (!text.trim()) return;

    const words = text.split(/\b/);
    // Quick check: does this node contain the target word?
    const hasTarget = words.some(w => /\w/.test(w) && lemmatize(w) === targetLemma);
    if (!hasTarget) return;

    const fragment = document.createDocumentFragment();
    words.forEach(w => {
      if (/\w/.test(w) && !/^[\d.,]+$|^\d+(st|nd|rd|th)$/i.test(w) && lemmatize(w) === targetLemma) {
        const span = document.createElement('span');
        span.textContent = w;
        span.className = LEARNING_CLASS;
        span.dataset.lemma = targetLemma;
        span.style.backgroundColor = '#fff3e0';
        span.style.color = '#e65100';
        span.style.cursor = 'pointer';
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(w));
      }
    });
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

/**
 * Handle single clicks:
 * - Unknown word → add to learning
 * - Learning word → promote to familiar
 */
document.addEventListener('click', (e) => {
  if (!highlightEnabled) return;
  const target = e.target;

  if (target.classList.contains(UNKNOWN_CLASS)) {
    const lemma = target.dataset.lemma;
    addWordAsLearning(lemma);
  } else if (target.classList.contains(LEARNING_CLASS)) {
    const lemma = target.dataset.lemma;
    promoteToFamiliar(lemma);
  }
});

/**
 * Handle double clicks:
 * - Familiar word → demote to learning
 * - Common word (plain text) → add to learning
 */
document.addEventListener('dblclick', (e) => {
  if (!highlightEnabled) return;
  const target = e.target;

  if (target.classList.contains(VOCAB_CLASS)) {
    const lemma = target.dataset.lemma;
    demoteToLearning(lemma);
  } else if (!target.classList.contains(UNKNOWN_CLASS) && !target.classList.contains(LEARNING_CLASS)) {
    // Possibly a common word (plain text)
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && /^\w+$/.test(selectedText)) {
      const lemma = lemmatize(selectedText);
      if (COMMON_WORDS.has(lemma)) {
        addCommonWordAsLearning(selectedText);
        selection.removeAllRanges();
      }
    }
  }
});

// ============================================================
// Initialization: load words from storage and start highlighting
// ============================================================

chrome.storage.local.get({ words: [], commonWordThreshold: DEFAULT_THRESHOLD, highlightEnabled: true }, (data) => {
  buildCommonWordsSet(data.commonWordThreshold);
  const { familiar, learning } = buildWordSets(data.words);
  baseWordSet = familiar;
  learningWordSet = learning;
  highlightEnabled = data.highlightEnabled;
  if (highlightEnabled) {
    highlightWords(document.body);
  } else {
    observer.disconnect();
  }
});

// Re-highlight when word list changes (e.g., user adds/removes a word in popup)
// Skip if we just updated from this page to avoid expensive re-highlighting
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // Highlight toggle changed from popup
  if (changes.highlightEnabled) {
    highlightEnabled = changes.highlightEnabled.newValue;
    if (highlightEnabled) {
      highlightWords(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      removeHighlights(document.body);
      observer.disconnect();
    }
    return;
  }

  // Threshold changed from popup — rebuild common words Set and refresh
  if (changes.commonWordThreshold) {
    buildCommonWordsSet(changes.commonWordThreshold.newValue || DEFAULT_THRESHOLD);
    if (highlightEnabled) refreshHighlighting();
    return;
  }

  if (changes.words) {
    // If update happened less than 500ms ago, it was from this page - skip refresh
    const now = Date.now();
    if (now - lastLocalUpdate < 500) {
      return;
    }

    // Update from another source (popup, another tab) - need full refresh
    const { familiar, learning } = buildWordSets(changes.words.newValue || []);
    baseWordSet = familiar;
    learningWordSet = learning;
    if (highlightEnabled) refreshHighlighting();
  }
});

// Highlight dynamically added content (SPAs, infinite scroll, etc.)
const observer = new MutationObserver((mutations) => {
  if (!highlightEnabled) return;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        highlightWords(node);
      }
    });
  });
});

if (highlightEnabled) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// Respond to popup requests for page statistics
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getPageStats') {
    sendResponse({
      unfamiliar: pageUnfamiliarLemmas.size,
      learning: pageLearningLemmas.size,
      familiar: pageFamiliarLemmas.size
    });
  }
});
