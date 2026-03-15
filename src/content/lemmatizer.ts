// ============================================================
// Lemmatization — dispatches to English (compromise.js) or French/Spanish (rule-based)
// ============================================================

import { currentLanguage } from './state';
import { lemmatizeFr } from './lemmatizer-fr';
import { lemmatizeEs } from './lemmatizer-es';

/**
 * Cache for English lemmatization results.
 * Avoids redundant compromise.js NLP calls for repeated words.
 */
const lemmaCache = new Map<string, string>();

/**
 * Lemmatize a word using compromise.js (English) and return its base form.
 * Results are cached for performance.
 * Also handles contractions (e.g., "haven't" → "have").
 */
function lemmatizeEn(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lemmaCache.has(lower)) return lemmaCache.get(lower)!;

  if (typeof nlp !== 'function') {
    lemmaCache.set(lower, lower);
    return lower;
  }

  const doc = nlp(word);
  let result: string;

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
export function lemmatize(word: string): string {
  if (currentLanguage === 'fr') return lemmatizeFr(word);
  if (currentLanguage === 'es') return lemmatizeEs(word);
  return lemmatizeEn(word);
}
