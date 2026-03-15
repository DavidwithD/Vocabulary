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
  /** Get all terms (words) with their POS tags */
  terms(): NlpTerms;
  /** Get adjectives in the document */
  adjectives(): NlpDocument;
  /** Get adverbs in the document */
  adverbs(): NlpDocument;
  /** Clone the document for transformation without mutating original */
  clone(): NlpDocument;
  /** Compute additional properties like 'root' on each term */
  compute(operation: 'root'): NlpDocument;
  /** Get full JSON representation of the document */
  json(): NlpSentence[];
}

interface NlpTerms {
  /** Convert terms to JSON format with POS tags */
  json(): NlpTermGroup[];
  /** Number of terms */
  length: number;
  /** Filter out terms matching a tag */
  not(tag: string): NlpTerms;
  /** Output as array of strings */
  out(format: 'array'): string[];
}

/** A term group from compromise.js terms().json() */
interface NlpTermGroup {
  /** The text of this term group */
  text: string;
  /** Nested array of individual terms with POS info */
  terms: NlpTerm[];
}

/** A sentence from compromise.js json() output */
interface NlpSentence {
  /** The text of this sentence */
  text: string;
  /** Array of terms in the sentence */
  terms: NlpTerm[];
}

/** A single term from compromise.js with POS information */
interface NlpTerm {
  /** The original text */
  text: string;
  /** Normalized/lowercase text */
  normal: string;
  /** Root/lemma form (populated after compute('root')) */
  root?: string;
  /** Array of POS tags (e.g., ['Verb', 'PastTense']) */
  tags: string[];
  /** Pre-text (whitespace before) */
  pre: string;
  /** Post-text (whitespace/punctuation after) */
  post: string;
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
