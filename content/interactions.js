// ============================================================
// Click interactions and word state transitions
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

  const key = getWordsKey();
  chrome.storage.local.get({ [key]: [] }, (data) => {
    const words = data[key];
    const exists = words.some(entry => entry.word.toLowerCase() === lemma);
    if (exists) return;

    const newWord = { word: lemma, status: 'learning' };
    const updatedWords = [newWord, ...words];
    chrome.storage.local.set({ [key]: updatedWords });
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

  const key = getWordsKey();
  chrome.storage.local.get({ [key]: [] }, (data) => {
    const updatedWords = data[key].map(entry => {
      if (entry.word.toLowerCase() === lemma) {
        return { ...entry, status: 'familiar' };
      }
      return entry;
    });
    chrome.storage.local.set({ [key]: updatedWords });
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

  const key = getWordsKey();
  chrome.storage.local.get({ [key]: [] }, (data) => {
    const updatedWords = data[key].map(entry => {
      if (entry.word.toLowerCase() === lemma) {
        return { ...entry, status: 'learning' };
      }
      return entry;
    });
    chrome.storage.local.set({ [key]: updatedWords });
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

  const key = getWordsKey();
  chrome.storage.local.get({ [key]: [] }, (data) => {
    const words = data[key];
    const exists = words.some(entry => entry.word.toLowerCase() === lemma);
    if (exists) return;

    const newWord = { word: lemma, status: 'learning' };
    const updatedWords = [newWord, ...words];
    chrome.storage.local.set({ [key]: updatedWords });
  });

  // Targeted update: walk text nodes and wrap only this word's occurrences
  wrapWordInTextNodes(document.body, lemma);
}

// ============================================================
// Click and double-click event handlers
// ============================================================

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
    if (selectedText && /^\p{L}+$/u.test(selectedText)) {
      const lemma = lemmatize(selectedText);
      if (COMMON_WORDS.has(lemma)) {
        addCommonWordAsLearning(selectedText);
        selection.removeAllRanges();
      }
    }
  }
});

// ============================================================
// Initialization and storage listeners
// ============================================================

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

// Load words from storage and start highlighting
chrome.storage.local.get({
  words: null, words_en: null, words_fr: [],
  language: DEFAULT_LANGUAGE,
  cefrLevel: null, commonWordThreshold: null,
  highlightEnabled: true
}, (data) => {
  // Migration: move old `words` key to `words_en`
  if (data.words !== null && data.words_en === null) {
    chrome.storage.local.set({ words_en: data.words });
    chrome.storage.local.remove('words');
    data.words_en = data.words;
  }

  // Migration: convert old numeric threshold to CEFR level
  let level = data.cefrLevel;
  if (!level && data.commonWordThreshold) {
    level = thresholdToCefrLevel(data.commonWordThreshold);
    chrome.storage.local.set({ cefrLevel: level });
    chrome.storage.local.remove('commonWordThreshold');
  }

  currentLanguage = data.language || DEFAULT_LANGUAGE;
  buildCommonWordsSet(level || DEFAULT_CEFR_LEVEL);

  const wordsKey = getWordsKey();
  const wordList = data[wordsKey] || [];
  const { familiar, learning } = buildWordSets(wordList);
  baseWordSet = familiar;
  learningWordSet = learning;
  highlightEnabled = data.highlightEnabled;
  if (highlightEnabled) {
    highlightWords(document.body);
  } else {
    observer.disconnect();
  }
});

if (highlightEnabled) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// Re-highlight when word list or settings change
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

  // Language changed from popup — switch everything and re-highlight
  if (changes.language) {
    currentLanguage = changes.language.newValue || DEFAULT_LANGUAGE;
    // Rebuild common words for the new language
    chrome.storage.local.get({ cefrLevel: DEFAULT_CEFR_LEVEL }, (data) => {
      buildCommonWordsSet(data.cefrLevel || DEFAULT_CEFR_LEVEL);
      // Load word list for the new language
      const wordsKey = getWordsKey();
      chrome.storage.local.get({ [wordsKey]: [] }, (wordData) => {
        const { familiar, learning } = buildWordSets(wordData[wordsKey]);
        baseWordSet = familiar;
        learningWordSet = learning;
        if (highlightEnabled) refreshHighlighting();
      });
    });
    return;
  }

  // CEFR level changed from popup — rebuild common words Set and refresh
  if (changes.cefrLevel) {
    buildCommonWordsSet(changes.cefrLevel.newValue || DEFAULT_CEFR_LEVEL);
    if (highlightEnabled) refreshHighlighting();
    return;
  }

  // Word list changed for the current language
  const wordsKey = getWordsKey();
  if (changes[wordsKey]) {
    // If update happened less than 500ms ago, it was from this page - skip refresh
    const now = Date.now();
    if (now - lastLocalUpdate < 500) {
      return;
    }

    // Update from another source (popup, another tab) - need full refresh
    const { familiar, learning } = buildWordSets(changes[wordsKey].newValue || []);
    baseWordSet = familiar;
    learningWordSet = learning;
    if (highlightEnabled) refreshHighlighting();
  }
});

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
