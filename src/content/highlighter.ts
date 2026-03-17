// ============================================================
// DOM highlighting — tree walking, node processing, chunked rendering
// ============================================================

import {
  FAMILIAR_CLASS,
  UNKNOWN_CLASS,
  LEARNING_CLASS,
  currentLanguage,
  COMMON_WORDS,
  familiarWordSet,
  learningWordSet,
  pageUnfamiliarLemmas,
  pageLearningLemmas,
  pageFamiliarLemmas,
  pageCommonLemmas,
} from './state';
import { lemmatizeSentence } from './lemmatizer';
import { LemmaMatrixTerm, LemmatizedTerm } from '../types';

const CHUNK_SIZE = 50; // Text nodes processed per animation frame

// Unicode-aware word detection: matches letters including accented characters
const WORD_CHAR_RE = /\p{L}/u;

function isWordToken(token: string): boolean {
  return WORD_CHAR_RE.test(token);
}

// Skip numbers, ordinals, single-letter words, and non-applicable scripts per language
function shouldSkipWord(word: string): boolean {
  if (/^[\d.,]+$|^\d+(st|nd|rd|th|er|ère|ème|[ºª])$/i.test(word)) return true;
  if (word.length <= 1) return true;
  if (currentLanguage === 'en' && !/^[a-zA-Z]+$/.test(word)) return true;
  if (
    (currentLanguage === 'fr' || currentLanguage === 'es') &&
    !/^[a-zA-ZÀ-ÖØ-öø-ÿ]+$/.test(word)
  )
    return true;
  return false;
}

/**
 * Remove all previously applied highlights, restoring original text nodes.
 */
export function removeHighlights(root: Element | Document): void {
  const vocab = root.querySelectorAll('.' + FAMILIAR_CLASS);
  const unknown = root.querySelectorAll('.' + UNKNOWN_CLASS);
  const learning = root.querySelectorAll('.' + LEARNING_CLASS);

  [...vocab, ...unknown, ...learning].forEach((span) => {
    const text = document.createTextNode(span.textContent || '');
    span.parentNode?.replaceChild(text, span);
  });

  if (root instanceof Element) {
    root.normalize(); // merge adjacent text nodes
  } else {
    root.body?.normalize();
  }

  // Reset page stats and node maps for full re-highlight
  pageUnfamiliarLemmas.clear();
  pageLearningLemmas.clear();
  pageFamiliarLemmas.clear();
  pageCommonLemmas.clear();
}

// Block-level tags for finding immediate context
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'TD',
  'TH',
  'ARTICLE',
  'SECTION',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

/**
 * Find the nearest block-level ancestor (p, div, li, etc.) for immediate processing.
 */
function findBlockAncestor(node: Node): Element | null {
  let current = node.parentElement;
  while (current && current !== document.body) {
    if (BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Collect text nodes from `root` that need highlighting.
 */
function collectTextNodes(root: Element | Document): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const parent = node.parentElement;
      if (
        parent &&
        (parent.classList.contains(FAMILIAR_CLASS) ||
          parent.classList.contains(UNKNOWN_CLASS) ||
          parent.classList.contains(LEARNING_CLASS))
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = parent?.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  return textNodes;
}

/**
 * Collect text nodes from root, excluding nodes inside a specific element.
 */
function collectTextNodesExcluding(
  root: Element | Document,
  exclude: Element | null
): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      // Skip if inside excluded element
      if (exclude && exclude.contains(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = node.parentElement;
      if (
        parent &&
        (parent.classList.contains(FAMILIAR_CLASS) ||
          parent.classList.contains(UNKNOWN_CLASS) ||
          parent.classList.contains(LEARNING_CLASS))
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = parent?.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  return textNodes;
}

// Word classification result
type WordClass = 'familiar' | 'learning' | 'unknown' | 'common';

/**
 * Classify a lemma based on word sets.
 */
function classifyLemma(lemma: string): WordClass {
  if (familiarWordSet.has(lemma)) return 'familiar';
  if (learningWordSet.has(lemma)) return 'learning';
  if (COMMON_WORDS.has(lemma)) return 'common';
  return 'unknown';
}

/**
 * Create a text node with an attached lemma property for tracking.
 */
function createTextNode(text: string, lemma: string = ''): Text {
  const plainText = document.createTextNode(text);
  (plainText as any).lemma = lemma;
  return plainText;
}

/**
 * Create a highlighted span for a word.
 */
export function createWordSpan(
  text: string,
  lemma: string,
  wordClass: Exclude<WordClass, 'common'>
): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  span.dataset.lemma = lemma;

  switch (wordClass) {
    case 'familiar':
      span.className = FAMILIAR_CLASS;
      break;
    case 'learning':
      span.className = LEARNING_CLASS;
      span.style.backgroundColor = '#fff3e0';
      span.style.color = '#e65100';
      span.style.cursor = 'pointer';
      break;
    case 'unknown':
      span.className = UNKNOWN_CLASS;
      span.style.backgroundColor = '#f0e6ff';
      span.style.color = '#5e35b1';
      span.style.cursor = 'pointer';
      break;
  }

  return span;
}

/**
 * Register a node in a lemma map (get-or-create the inner Set).
 */
function addToLemmaMap<T>(map: Map<string, Set<T>>, lemma: string, node: T): void {
  let set = map.get(lemma);
  if (!set) {
    set = new Set();
    map.set(lemma, set);
  }
  set.add(node);
}

/**
 * Track a lemma and its DOM node in the page-level maps.
 */
function trackLemma(
  lemma: string,
  wordClass: WordClass,
  node: HTMLSpanElement | Text
): void {
  switch (wordClass) {
    case 'familiar':
      addToLemmaMap(pageFamiliarLemmas, lemma, node as HTMLSpanElement);
      break;
    case 'learning':
      addToLemmaMap(pageLearningLemmas, lemma, node as HTMLSpanElement);
      break;
    case 'unknown':
      addToLemmaMap(pageUnfamiliarLemmas, lemma, node as HTMLSpanElement);
      break;
    case 'common':
      addToLemmaMap(pageCommonLemmas, lemma, node as Text);
      break;
  }
}

/**
 *  Given a word and its lemma, determine if it should be highlighted and create the appropriate node.
 * @param text The original word text from the page
 * @param lemma The lemmatized form of the word used for classification
 * @returns The created HTMLSpanElement or Text node
 */
function createNodeByLemma(text: string, lemma: string): HTMLSpanElement | Text {
  const wordClass = classifyLemma(lemma);

  let node = (wordClass === 'common' || shouldSkipWord(text)) ? createTextNode(text, lemma) : createWordSpan(text, lemma, wordClass);

  trackLemma(lemma, wordClass, node);
  return node;
}

/**
 * Helper to process lemmatized terms and build a fragment.
 * Handles both lemmaMatrix (with pre/post) and lemmatizeSentence (with isWord) results.
 */
function buildFragmentFromTerms(
  terms: LemmatizedTerm[] | LemmaMatrixTerm[]
): DocumentFragment {

  const fragment = document.createDocumentFragment();
  const isLemmaMatrix = 'pre' in (terms[0] || {});

  if (isLemmaMatrix) {
    // lemmaMatrix format: { text, lemma, pre, post }
    for (const term of terms as LemmaMatrixTerm[]) {
      if (term.pre) {
        fragment.appendChild(createTextNode(term.pre));
      }

      fragment.appendChild(createNodeByLemma(term.text, term.lemma));

      if (term.post) {
        fragment.appendChild(createTextNode(term.post));
      }
    }
  } else {
    // lemmatizeSentence format: { text, lemma, pos, isWord }
    for (const term of terms as LemmatizedTerm[]) {
      if (!term.isWord || shouldSkipWord(term.text)) {
        const plainText = createTextNode(term.text, term.lemma);
        fragment.appendChild(plainText);
        continue;
      }

      fragment.appendChild(createNodeByLemma(term.text, term.lemma));
    }
  }

  return fragment;
}

/**
 * Process a single text node using sentence-level POS tagging.
 * Splits into tokens with context-aware lemmatization, then classifies and wraps in spans.
 */
function processTextNode(textNode: Text): void {
  const text = textNode.textContent;
  if (!text?.trim()) return;

  const terms = lemmatizeSentence(text);

  const fragment = buildFragmentFromTerms(terms);

  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Walk all text nodes in `root` and highlight words.
 * Processes in chunks of CHUNK_SIZE nodes per animation frame to avoid blocking.
 */
export function highlightWords(root: Element | Document): void {
  const textNodes = collectTextNodes(root);
  if (textNodes.length === 0) return;

  let i = 0;
  function processChunk(): void {
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
 */
export function refreshHighlighting(): void {
  removeHighlights(document.body);
  highlightWords(document.body);
}
