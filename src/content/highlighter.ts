// ============================================================
// DOM highlighting — tree walking, node processing, chunked rendering
// ============================================================

import {
  VOCAB_CLASS,
  UNKNOWN_CLASS,
  LEARNING_CLASS,
  currentLanguage,
  COMMON_WORDS,
  baseWordSet,
  learningWordSet,
  pageUnfamiliarLemmas,
  pageLearningLemmas,
  pageFamiliarLemmas,
} from './state';
import { lemmatize, lemmatizeSentence } from './lemmatizer';
import type { LemmatizedTerm } from '../types';

const CHUNK_SIZE = 50; // Text nodes processed per animation frame

// Unicode-aware word detection: matches letters including accented characters
const WORD_CHAR_RE = /\p{L}/u;

// Split text into word and non-word tokens (Unicode-aware)
function splitIntoTokens(text: string): string[] {
  return text.match(/\p{L}+|[^\p{L}]+/gu) || [];
}

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
  const vocab = root.querySelectorAll('.' + VOCAB_CLASS);
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

  // Reset page stats for full re-highlight
  pageUnfamiliarLemmas.clear();
  pageLearningLemmas.clear();
  pageFamiliarLemmas.clear();
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
        (parent.classList.contains(VOCAB_CLASS) ||
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
        (parent.classList.contains(VOCAB_CLASS) ||
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
  if (baseWordSet.has(lemma)) return 'familiar';
  if (learningWordSet.has(lemma)) return 'learning';
  if (COMMON_WORDS.has(lemma)) return 'common';
  return 'unknown';
}

/**
 * Create a highlighted span for a word.
 */
function createWordSpan(
  text: string,
  lemma: string,
  wordClass: Exclude<WordClass, 'common'>
): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  span.dataset.lemma = lemma;

  switch (wordClass) {
    case 'familiar':
      span.className = VOCAB_CLASS;
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
 * Track a lemma in page statistics.
 */
function trackLemma(
  lemma: string,
  wordClass: Exclude<WordClass, 'common'>
): void {
  switch (wordClass) {
    case 'familiar':
      pageFamiliarLemmas.add(lemma);
      break;
    case 'learning':
      pageLearningLemmas.add(lemma);
      break;
    case 'unknown':
      pageUnfamiliarLemmas.add(lemma);
      break;
  }
}

/**
 * Process a single text node using sentence-level POS tagging.
 * Splits into tokens with context-aware lemmatization, then classifies and wraps in spans.
 */
function processTextNode(textNode: Text): void {
  const text = textNode.textContent;
  if (!text?.trim()) return;

  const terms = lemmatizeSentence(text);
  const fragment = document.createDocumentFragment();

  for (const term of terms) {
    // Non-word tokens and skipped words → plain text
    if (!term.isWord || shouldSkipWord(term.text)) {
      fragment.appendChild(document.createTextNode(term.text));
      continue;
    }

    const wordClass = classifyLemma(term.lemma);

    // Common words → plain text (no highlight)
    if (wordClass === 'common') {
      fragment.appendChild(document.createTextNode(term.text));
      continue;
    }

    // Familiar, learning, unknown → highlighted span
    const span = createWordSpan(term.text, term.lemma, wordClass);
    fragment.appendChild(span);
    trackLemma(term.lemma, wordClass);
  }

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

/**
 * Wrap occurrences of a lemma in a single text node as learning spans.
 */
function wrapLemmaInTextNode(textNode: Text, targetLemma: string): void {
  const text = textNode.textContent;
  if (!text?.trim()) return;

  const terms = lemmatizeSentence(text);

  // Quick check: does this node contain the target word?
  const hasTarget = terms.some(
    (t) => t.isWord && !shouldSkipWord(t.text) && t.lemma === targetLemma
  );
  if (!hasTarget) return;

  const fragment = document.createDocumentFragment();
  for (const term of terms) {
    if (
      term.isWord &&
      !shouldSkipWord(term.text) &&
      term.lemma === targetLemma
    ) {
      const span = createWordSpan(term.text, term.lemma, 'learning');
      fragment.appendChild(span);
      trackLemma(term.lemma, 'learning');
    } else {
      fragment.appendChild(document.createTextNode(term.text));
    }
  }
  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Process text nodes in background chunks using requestIdleCallback.
 * Falls back to setTimeout for browsers without requestIdleCallback.
 */
function processNodesInBackground(
  nodes: Text[],
  targetLemma: string,
  chunkSize: number = 20
): void {
  let index = 0;

  const scheduleNext =
    typeof requestIdleCallback !== 'undefined'
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 100 })
      : (cb: () => void) => setTimeout(cb, 0);

  function processChunk(): void {
    const end = Math.min(index + chunkSize, nodes.length);

    while (index < end) {
      const textNode = nodes[index];
      // Node may have been removed or replaced since collection
      if (textNode.parentNode) {
        wrapLemmaInTextNode(textNode, targetLemma);
      }
      index++;
    }

    if (index < nodes.length) {
      scheduleNext(processChunk);
    }
  }

  if (nodes.length > 0) {
    scheduleNext(processChunk);
  }
}

/**
 * Walk text nodes in `root` and wrap occurrences of a specific lemma
 * as learning spans. Prioritizes the local block containing the interaction,
 * then processes the rest of the page in background chunks to avoid freezing.
 */
export function wrapWordInTextNodes(
  root: Element | Document,
  targetLemma: string,
  immediateContext?: Node
): void {
  // Step 1: Find and immediately process the local block
  const localBlock = immediateContext
    ? findBlockAncestor(immediateContext)
    : null;

  if (localBlock) {
    const localNodes = collectTextNodes(localBlock);
    for (const textNode of localNodes) {
      wrapLemmaInTextNode(textNode, targetLemma);
    }
  }

  // Step 2: Process remaining nodes in background
  const remainingNodes = collectTextNodesExcluding(root, localBlock);
  processNodesInBackground(remainingNodes, targetLemma);
}
