// ============================================================
// Lemmatization — dispatches to English (compromise.js) or French (rule-based)
// ============================================================

/**
 * Cache for English lemmatization results.
 * Avoids redundant compromise.js NLP calls for repeated words.
 */
const lemmaCache = new Map();

/**
 * Lemmatize a word using compromise.js (English) and return its base form.
 * Results are cached for performance.
 * Also handles contractions (e.g., "haven't" → "have").
 */
function lemmatizeEn(word) {
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
 * Dispatch lemmatization to the correct language handler.
 */
function lemmatize(word) {
  if (currentLanguage === 'fr') return lemmatizeFr(word);
  if (currentLanguage === 'es') return lemmatizeEs(word);
  return lemmatizeEn(word);
}
