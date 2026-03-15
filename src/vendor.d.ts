// ============================================================
// Type declarations for external libraries and global variables
// ============================================================

import type { CefrLevel, CefrWordData } from './types';

/** Compromise.js NLP library (loaded from vendor/compromise.min.js) */
declare global {
  /**
   * Create a compromise document from text.
   * @param text - The text to parse
   * @returns A compromise document for NLP operations
   */
  function nlp(text: string): NlpDocument;

  /** CEFR word data for English (loaded from data/cefr-words.js) */
  const CEFR_WORDS: CefrWordData;

  /** CEFR levels array (loaded from data/cefr-words.js) */
  const CEFR_LEVELS: CefrLevel[];

  /** CEFR word data for French (loaded from data/cefr-words-fr.js) */
  const CEFR_WORDS_FR: CefrWordData;

  /** CEFR word data for Spanish (loaded from data/cefr-words-es.js) */
  const CEFR_WORDS_ES: CefrWordData;
}

interface NlpDocument {
  /** Get verbs in the document */
  verbs(): NlpVerbs;
  /** Get nouns in the document */
  nouns(): NlpNouns;
  /** Get the text with a specific format */
  text(format?: 'root' | 'normal'): string;
  /** Get the length of matches */
  length: number;
}

interface NlpVerbs {
  /** Convert verbs to infinitive form */
  toInfinitive(): NlpDocument;
  /** Number of verb matches */
  length: number;
}

interface NlpNouns {
  /** Convert nouns to singular form */
  toSingular(): NlpDocument;
  /** Number of noun matches */
  length: number;
}

export {};
