// ============================================================
// DOM highlighting — tree walking, node processing, chunked rendering
// ============================================================

const CHUNK_SIZE = 50; // Text nodes processed per animation frame

// Unicode-aware word detection: matches letters including accented characters
const WORD_CHAR_RE = /\p{L}/u;
// Split text into word and non-word tokens (Unicode-aware)
function splitIntoTokens(text) {
  return text.match(/\p{L}+|[^\p{L}]+/gu) || [];
}
function isWordToken(token) {
  return WORD_CHAR_RE.test(token);
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

/**
 * Collect text nodes from `root` that need highlighting.
 */
function collectTextNodes(root) {
  if (typeof CEFR_WORDS === 'undefined' && typeof CEFR_WORDS_FR === 'undefined') return [];

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

  const tokens = splitIntoTokens(text);
  const fragment = document.createDocumentFragment();

  tokens.forEach(word => {
    if (isWordToken(word)) {
      if (/^[\d.,]+$|^\d+(st|nd|rd|th|er|ère|ème)$/i.test(word)) {
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
 */
function refreshHighlighting() {
  removeHighlights(document.body);
  highlightWords(document.body);
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

    const tokens = splitIntoTokens(text);
    // Quick check: does this node contain the target word?
    const hasTarget = tokens.some(w => isWordToken(w) && lemmatize(w) === targetLemma);
    if (!hasTarget) return;

    const fragment = document.createDocumentFragment();
    tokens.forEach(w => {
      if (isWordToken(w) && !/^[\d.,]+$|^\d+(st|nd|rd|th|er|ère|ème)$/i.test(w) && lemmatize(w) === targetLemma) {
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
