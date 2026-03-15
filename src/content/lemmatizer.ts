// ============================================================
// Lemmatization — dispatches to English (compromise.js) or French/Spanish (rule-based)
// ============================================================

import type { CoarsePOS, LemmatizedTerm } from '../types';
import { currentLanguage } from './state';
import { lemmatizeFr } from './lemmatizer-fr';
import { lemmatizeEs } from './lemmatizer-es';

/**
 * Map fine-grained compromise.js tags to coarse POS categories.
 */
function toCoarsePOS(tags: string[] | undefined): CoarsePOS {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return 'Other';
  }
  if (
    tags.some(
      (t) =>
        t === 'Verb' ||
        t.includes('Tense') ||
        t === 'Gerund' ||
        t === 'Infinitive' ||
        t === 'PastParticiple' ||
        t === 'PresentParticiple'
    )
  ) {
    return 'Verb';
  }
  if (tags.some((t) => t === 'Adjective' || t === 'Comparable')) {
    return 'Adjective';
  }
  if (tags.some((t) => t === 'Adverb')) {
    return 'Adverb';
  }
  if (
    tags.some(
      (t) =>
        t === 'Noun' || t === 'Singular' || t === 'Plural' || t === 'Pronoun'
    )
  ) {
    return 'Noun';
  }
  return 'Other';
}

/**
 * Lemmatize a sentence/text with full context (English).
 * Uses compute('root') to get root forms while preserving alignment.
 *
 * Strategy:
 * 1. Parse sentence with nlp()
 * 2. Call compute('root') to add root property to each term
 * 3. Extract root and POS from json() output
 */
export function lemmatizeSentenceEn(text: string): LemmatizedTerm[] {
  if (!text?.trim()) return [];

  // Split by word boundaries to preserve whitespace/punctuation
  const tokens = text.match(/\p{L}+|[^\p{L}]+/gu) || [];

  if (typeof nlp !== 'function') {
    // Fallback: no NLP available
    return tokens.map((t) => ({
      text: t,
      lemma: t.toLowerCase(),
      pos: 'Other' as CoarsePOS,
      isWord: /\p{L}/u.test(t),
    }));
  }

  const doc = nlp(text);
  doc.compute('root');

  // Get all terms with root and tags from json()
  const json = doc.json();
  const rootMap = new Map<string, string[]>();
  const posMap = new Map<string, CoarsePOS[]>();

  for (const sentence of json) {
    const terms = sentence.terms || [];
    for (const term of terms) {
      if (!term.text) continue;
      const lower = term.text.toLowerCase();
      const root = term.root || term.normal || lower;
      const pos = toCoarsePOS(term.tags);

      if (!rootMap.has(lower)) {
        rootMap.set(lower, []);
      }
      rootMap.get(lower)!.push(root);

      if (!posMap.has(lower)) {
        posMap.set(lower, []);
      }
      posMap.get(lower)!.push(pos);
    }
  }

  // Track consumption indices for duplicate words
  const rootIndexMap = new Map<string, number>();
  const posIndexMap = new Map<string, number>();

  // Process tokens, looking up roots and POS
  return tokens.map((t) => {
    const isWord = /\p{L}/u.test(t);

    if (!isWord) {
      return {
        text: t,
        lemma: t,
        pos: 'Other' as CoarsePOS,
        isWord: false,
      };
    }

    const lower = t.toLowerCase();

    // Get root (handle duplicates)
    const rootList = rootMap.get(lower);
    let lemma = lower;
    if (rootList && rootList.length > 0) {
      const idx = rootIndexMap.get(lower) || 0;
      lemma = rootList[idx] || rootList[0];
      rootIndexMap.set(lower, idx + 1);
    }

    // Get POS (handle duplicates)
    const posList = posMap.get(lower);
    let pos: CoarsePOS = 'Other';
    if (posList && posList.length > 0) {
      const idx = posIndexMap.get(lower) || 0;
      pos = posList[idx] || posList[0];
      posIndexMap.set(lower, idx + 1);
    }

    return {
      text: t,
      lemma,
      pos,
      isWord: true,
    };
  });
}

/**
 * Lemmatize a sentence dispatching to the correct language handler.
 * For French/Spanish, falls back to word-by-word processing (no POS context).
 */
export function lemmatizeSentence(text: string): LemmatizedTerm[] {
  if (currentLanguage === 'en') {
    return lemmatizeSentenceEn(text);
  }

  // Fallback for French/Spanish: word-by-word with their rule-based lemmatizers
  const tokens = text.match(/\p{L}+|[^\p{L}]+/gu) || [];
  const lemmatizer = currentLanguage === 'fr' ? lemmatizeFr : lemmatizeEs;

  return tokens.map((t) => {
    const isWord = /\p{L}/u.test(t);
    return {
      text: t,
      lemma: isWord ? lemmatizer(t) : t,
      pos: 'Other' as CoarsePOS,
      isWord,
    };
  });
}

/**
 * Single-word lemmatize function for one-off lookups.
 * Uses sentence-level processing for accuracy even on single words.
 */
function lemmatizeEn(word: string): string {
  if (!word) return '';
  const result = lemmatizeSentenceEn(word);
  const wordResult = result.find((r) => r.isWord);
  return wordResult?.lemma || word.toLowerCase();
}

/**
 * Dispatch lemmatization to the correct language handler.
 */
export function lemmatize(word: string): string {
  if (currentLanguage === 'fr') return lemmatizeFr(word);
  if (currentLanguage === 'es') return lemmatizeEs(word);
  return lemmatizeEn(word);
}
