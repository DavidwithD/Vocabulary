// ============================================================
// Click interactions and word state transitions
// ============================================================

import type { CefrLevel, Language, WordEntry, WordStatus } from '../types';
import * as store from '../storage/store';
import {
  FAMILIAR_CLASS,
  UNKNOWN_CLASS,
  LEARNING_CLASS,
  DEFAULT_CEFR_LEVEL,
  DEFAULT_LANGUAGE,
  familiarWordSet,
  learningWordSet,
  highlightEnabled,
  lastLocalUpdate,
  pageUnfamiliarLemmas,
  pageLearningLemmas,
  pageFamiliarLemmas,
  pageCommonLemmas,
  setCurrentLanguage,
  setFamiliarWordSet,
  setLearningWordSet,
  setLastLocalUpdate,
  setHighlightEnabled,
  getWordsKey,
  buildCommonWordsSet,
  thresholdToCefrLevel,
  buildWordSets,
} from './state';
import {
  highlightWords,
  removeHighlights,
  refreshHighlighting,
  createWordSpan,
} from './highlighter';

/**
 * Persist a lemma with the given status in chrome.storage and update the in-memory word set.
 * If the word already exists in storage, its status is updated; otherwise it is added.
 */
export function saveWord(lemma: string, status: WordStatus, targetSet: Set<string>): void {
  targetSet.add(lemma);
  setLastLocalUpdate(Date.now());

  const key = getWordsKey();
  store.get(key).then((words) => {
    const index = words.findIndex((entry) => entry.word.toLowerCase() === lemma);
    if (index !== -1) {
      words[index] = { ...words[index], status };
    } else {
      words.unshift({ word: lemma, status });
    }
    store.set(key, words);
  });
}

/**
 * Move all spans for a lemma from one map to another, applying new styles.
 */
function moveSpans(
  lemma: string,
  from: Map<string, Set<HTMLSpanElement>>,
  to: Map<string, Set<HTMLSpanElement>>,
  className: string,
  styles: { bg: string; color: string; cursor: string }
): void {
  const spans = from.get(lemma);
  if (!spans) return;

  let targetSet = to.get(lemma);
  if (!targetSet) {
    targetSet = new Set();
    to.set(lemma, targetSet);
  }

  for (const span of spans) {
    span.className = className;
    span.style.backgroundColor = styles.bg;
    span.style.color = styles.color;
    span.style.cursor = styles.cursor;
    targetSet.add(span);
  }
  from.delete(lemma);
}

/**
 * Add an unknown word to the learning list.
 * Uses the lemma map for instant DOM updates.
 */
function addWordAsLearning(lemma: string): void {
  saveWord(lemma, 'learning', learningWordSet);
  moveSpans(lemma, pageUnfamiliarLemmas, pageLearningLemmas,
    LEARNING_CLASS, { bg: '#fff3e0', color: '#e65100', cursor: 'pointer' });
}

/**
 * Promote a learning word to familiar.
 * Uses the lemma map for instant DOM updates.
 */
function promoteToFamiliar(lemma: string): void {
  learningWordSet.delete(lemma);
  saveWord(lemma, 'familiar', familiarWordSet);
  moveSpans(lemma, pageLearningLemmas, pageFamiliarLemmas,
    FAMILIAR_CLASS, { bg: '', color: '', cursor: '' });
}

/**
 * Demote a familiar word back to learning.
 * Uses the lemma map for instant DOM updates.
 */
function demoteToLearning(lemma: string): void {
  familiarWordSet.delete(lemma);
  saveWord(lemma, 'learning', learningWordSet);
  moveSpans(lemma, pageFamiliarLemmas, pageLearningLemmas,
    LEARNING_CLASS, { bg: '#fff3e0', color: '#e65100', cursor: 'pointer' });
}

/**
 * Handle double-click on a common word (plain text).
 * Validates the selection, then replaces all matching text nodes with learning spans.
 */
function addCommonWordAsLearning(): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  const textNode = selection?.anchorNode;

  if (!selectedText || !/^\p{L}+$/u.test(selectedText) ||
      textNode?.nodeType !== Node.TEXT_NODE) return;

  const lemma = (textNode as any).lemma;

  selection?.removeAllRanges();
  saveWord(lemma, 'learning', learningWordSet);

  const textNodes = pageCommonLemmas.get(lemma);
  if (!textNodes) return;

  let learningSet = pageLearningLemmas.get(lemma);
  if (!learningSet) {
    learningSet = new Set();
    pageLearningLemmas.set(lemma, learningSet);
  }

  for (const node of textNodes) {
    if (!node.parentNode) continue;
    const span = createWordSpan(node.textContent || '', lemma, 'learning');
    node.parentNode.replaceChild(span, node);
    learningSet.add(span);
  }
  pageCommonLemmas.delete(lemma);
}

// ============================================================
// Click and double-click event handlers
// ============================================================

/**
 * Handle single clicks:
 * - Unknown word → add to learning
 * - Learning word → promote to familiar
 */
document.addEventListener('click', (e: MouseEvent) => {
  if (!highlightEnabled) return;
  const target = e.target as HTMLElement;

  if (target.classList.contains(UNKNOWN_CLASS)) {
    const lemma = target.dataset.lemma;
    if (lemma) addWordAsLearning(lemma);
  } else if (target.classList.contains(LEARNING_CLASS)) {
    const lemma = target.dataset.lemma;
    if (lemma) promoteToFamiliar(lemma);
  }
});

/**
 * Handle double clicks:
 * - Familiar word → demote to learning
 * - Common word (plain text) → add to learning
 */
document.addEventListener('dblclick', (e: MouseEvent) => {
  if (!highlightEnabled) return;
  const target = e.target as HTMLElement;

  if (target.classList.contains(FAMILIAR_CLASS)) {
    const lemma = target.dataset.lemma;
    if (lemma) demoteToLearning(lemma);
  } else if (
    target.classList.contains(UNKNOWN_CLASS) ||
    target.classList.contains(LEARNING_CLASS)
  ) {
    // Do nothing
  } 
  else {
    addCommonWordAsLearning();
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
        highlightWords(node as Element);
      }
    });
  });
});

// Define the storage data interface for type safety
interface InitStorageData {
  words: WordEntry[] | null;
  words_en: WordEntry[] | null;
  words_fr: WordEntry[];
  words_es: WordEntry[];
  language: Language;
  cefrLevel: CefrLevel | null;
  commonWordThreshold: number | null;
  highlightEnabled: boolean;
}

// Load words from storage and start highlighting
chrome.storage.local.get(
  {
    words: null,
    words_en: null,
    words_fr: [],
    words_es: [],
    language: DEFAULT_LANGUAGE,
    cefrLevel: null,
    commonWordThreshold: null,
    highlightEnabled: true,
  },
  (data) => {
    const storageData = data as InitStorageData;

    // Migration: move old `words` key to `words_en`
    if (storageData.words !== null && storageData.words_en === null) {
      store.set('words_en', storageData.words!);
      store.remove('words');
      storageData.words_en = storageData.words;
    }

    // Migration: convert old numeric threshold to CEFR level
    let level = storageData.cefrLevel;
    if (!level && storageData.commonWordThreshold) {
      level = thresholdToCefrLevel(storageData.commonWordThreshold);
      store.set('cefrLevel', level);
      store.remove('commonWordThreshold');
    }

    setCurrentLanguage(storageData.language || DEFAULT_LANGUAGE);
    buildCommonWordsSet(level || DEFAULT_CEFR_LEVEL);

    const wordsKey = getWordsKey();
    type WordsKey = keyof Pick<
      InitStorageData,
      'words_en' | 'words_fr' | 'words_es'
    >;
    const wordList = storageData[wordsKey as WordsKey] || [];
    const { familiar, learning } = buildWordSets(wordList);
    setFamiliarWordSet(familiar);
    setLearningWordSet(learning);
    setHighlightEnabled(storageData.highlightEnabled ?? true);

    if (highlightEnabled) {
      highlightWords(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
);

// Re-highlight when word list or settings change
store.subscribe((changes) => {
  try {
    // Highlight toggle changed from popup
    if (changes.highlightEnabled) {
      setHighlightEnabled(changes.highlightEnabled.newValue ?? true);
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
      setCurrentLanguage(changes.language.newValue ?? DEFAULT_LANGUAGE);
      store.get('cefrLevel')
        .then((cefrLevel) => {
          buildCommonWordsSet(cefrLevel);
          return store.get(getWordsKey());
        })
        .then((wordList) => {
          const { familiar, learning } = buildWordSets(wordList);
          setFamiliarWordSet(familiar);
          setLearningWordSet(learning);
          if (highlightEnabled) refreshHighlighting();
        })
        .catch(() => { /* Extension context invalidated */ });
      return;
    }

    // CEFR level changed from popup — rebuild common words Set and refresh
    if (changes.cefrLevel) {
      buildCommonWordsSet(changes.cefrLevel.newValue ?? DEFAULT_CEFR_LEVEL);
      if (highlightEnabled) refreshHighlighting();
      return;
    }

    // Word list changed for the current language
    const wordsKey = getWordsKey();
    if (changes[wordsKey]) {
      // If update happened less than 500ms ago, it was from this page - skip refresh
      if (Date.now() - lastLocalUpdate < 500) return;

      // Update from another source (popup, another tab) - need full refresh
      const { familiar, learning } = buildWordSets(
        changes[wordsKey]!.newValue ?? []
      );
      setFamiliarWordSet(familiar);
      setLearningWordSet(learning);
      if (highlightEnabled) refreshHighlighting();
    }
  } catch {
    // Extension context invalidated
  }
});

// Respond to popup requests for page statistics and unknown word list
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    if (msg.type === 'getPageStats') {
      sendResponse({
        unfamiliar: pageUnfamiliarLemmas.size,
        learning: pageLearningLemmas.size,
        familiar: pageFamiliarLemmas.size,
      });
    } else if (msg.type === 'getUnknownWords') {
      sendResponse({
        words: Array.from(pageUnfamiliarLemmas.keys()).sort(),
      });
    }
  } catch {
    // Extension context invalidated
  }
});

