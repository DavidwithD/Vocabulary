import { describe, it, expect } from 'vitest';
import { lemmatizeEn } from '../src/content/lemmatizer';

function expectLemma(input: string, word: string, expectedLemma: string) {
  const result = lemmatizeEn(input);
  const entry = result.find((r) => r.text.toLowerCase() === word.toLowerCase());
  expect(entry, `"${word}" not found in result of "${input}"`).toBeDefined();
  expect(entry!.lemma).toBe(expectedLemma);
}

describe('lemmatizeEn', () => {
  describe('basic verb lemmatization', () => {
    it('walks -> walk', () => expectLemma('She walks to school', 'walks', 'walk'));
    it('walked -> walk', () => expectLemma('He walked yesterday', 'walked', 'walk'));
    it('running -> run', () => expectLemma('They are running', 'running', 'run'));
  });

  describe('basic noun lemmatization', () => {
    it('cats -> cat', () => expectLemma('The cats sleep', 'cats', 'cat'));
    it('boxes -> box', () => expectLemma('The boxes are heavy', 'boxes', 'box'));
  });

  describe('return structure', () => {
    it('returns correct number of tokens', () => {
      const result = lemmatizeEn('Hello world');
      expect(result.length).toBe(2);
    });

    it('each token has required properties', () => {
      const result = lemmatizeEn('Hello world');
      expect(typeof result[0].text).toBe('string');
      expect(typeof result[0].lemma).toBe('string');
      expect(typeof result[0].pre).toBe('string');
      expect(typeof result[0].post).toBe('string');
    });
  });

  describe('punctuation handling', () => {
    it('lemmatizes with trailing comma', () => expectLemma('The cats, dogs, and birds', 'cats', 'cat'));
    it('lemmatizes with exclamation', () => expectLemma('She walks!', 'walks', 'walk'));
    it('lemmatizes with question mark', () => expectLemma('They are running?', 'running', 'run'));
    it('lemmatizes with period', () => expectLemma('The boxes are here.', 'boxes', 'box'));

    it('filters out punctuation from results', () => {
      const result = lemmatizeEn('Hello, world!');
      const hasNoPunctuation = result.every((r) => !/[.,!?;:]/.test(r.text));
      expect(hasNoPunctuation).toBe(true);
    });

    it('lemmatizes gerund with comma', () => expectLemma('Running, walking, talking?', 'walking', 'walk'));
  });

  describe('passive and multi-verb constructions', () => {
    it('was seen leaving -> be, see, leave', () => {
      const result = lemmatizeEn('He was seen leaving');
      const lemmas = result.map((r) => r.lemma);
      expect(lemmas).toEqual(['he', 'be', 'see', 'leave']);
    });

    it('has been running -> have, be, run', () => {
      const result = lemmatizeEn('She has been running');
      const lemmas = result.map((r) => r.lemma);
      expect(lemmas).toEqual(['she', 'have', 'be', 'run']);
    });
  });

  describe('edge cases', () => {
    it('empty string returns empty array', () => {
      expect(lemmatizeEn('').length).toBe(0);
    });

    it('whitespace-only returns empty array', () => {
      expect(lemmatizeEn('   ').length).toBe(0);
    });
  });
});
