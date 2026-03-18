// ============================================================
// Lemmatization — dispatches to English (compromise.js) or French/Spanish (rule-based)
// ============================================================

import type { CoarsePOS, LemmatizedTerm, LemmaMatrixTerm } from '../types';
import { currentLanguage } from './state';
import { lemmatizeFr } from './lemmatizer-fr';
import { lemmatizeEs } from './lemmatizer-es';
import nlp from 'compromise';

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


interface VerbConjugation {
  Infinitive?: string;
  PastTense?: string;
  PresentTense?: string;
  Gerund?: string;
  // Add other conjugation forms as needed
}

/**
 * Lemmatize a sentence while preserving pre/post punctuation and whitespace.
 * Uses compromise.js's compute('root') for better accuracy on verbs and nouns.
 * Returns an array of { text, lemma, pre, post } for each token.
 * @param text 
 * @returns { text: string; lemma: string; pre: string; post: string }[]
 */
export function lemmatizeEn(text: string): LemmaMatrixTerm[] {
  const doc = nlp(text)

  ;(doc as any).compute('root')

  const verbLemmas = new Map()
  doc.verbs().json().forEach((group: { verb: any; terms: any; }) => {
    const verb = group.verb
    if (!verb) return
    for (const term of group.terms) {
      const key = `${term.index[0]}_${term.index[1]}`
      if (term.tags.includes('Negative') || term.tags.includes('Adverb')) {
        continue
      } else {
        const conj = nlp(term.normal).verbs().conjugate()[0] as VerbConjugation | undefined
        verbLemmas.set(key, conj?.Infinitive || term.root || term.normal)
      }
    }
  })

  const json = doc.json()
  const result = []

  for (const sentence of json) {
    for (const term of sentence.terms) {
      if (term.tags.includes('Punctuation')) continue
      const key = `${term.index[0]}_${term.index[1]}`

      let lemma
      if (verbLemmas.has(key)) {
        lemma = verbLemmas.get(key)
      } else {
        lemma = term.root || term.normal || term.text.toLowerCase()
      }

      result.push({ text: term.text, lemma, pre: term.pre, post: term.post })
    }
  }

  return result
}

/**
 * Lemmatize a sentence dispatching to the correct language handler.
 * For English, uses lemmaMatrix (better accuracy with pre/post preservation).
 * For French/Spanish, falls back to word-by-word processing (no POS context).
 * 
 * Note: Return type varies by language:
 * - English: { text, lemma, pre, post }[]
 * - French/Spanish: { text, lemma, pos, isWord }[]
 */
export function lemmatizeSentence(text: string): LemmatizedTerm[] | LemmaMatrixTerm[] {
  if (currentLanguage === 'en') {
    return lemmatizeEn(text);
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
