import { describe, it, expect } from 'vitest';
import { lemmatizeEn } from '../src/content/lemmatizer';

function expectTextPreserved(input: string) {
  const terms = lemmatizeEn(input);
  const reconstructed = terms.map((t) => t.pre + t.text + t.post).join('');
  expect(reconstructed, `Text preservation: "${input}"`).toBe(input);
}

describe('lemmatizeEn whitespace & punctuation preservation', () => {
  describe('basic punctuation', () => {
    it('Hello, world!', () => expectTextPreserved('Hello, world!'));
    it('She walks. He runs.', () => expectTextPreserved('She walks. He runs.'));
    it('Is it working?', () => expectTextPreserved('Is it working?'));
    it('Yes! No? Maybe...', () => expectTextPreserved('Yes! No? Maybe...'));
  });

  describe('whitespace variations', () => {
    it('single space', () => expectTextPreserved('Single space'));
    it('double space', () => expectTextPreserved('Double  space'));
    it('leading space', () => expectTextPreserved('  Leading space'));
    it('trailing space', () => expectTextPreserved('Trailing space  '));
    it('multiple spaces', () => expectTextPreserved('Multiple   spaces    here'));
  });

  describe('complex punctuation', () => {
    it('commas in list', () => expectTextPreserved('The cats, dogs, and birds are here.'));
    it('quoted speech', () => expectTextPreserved('"Hello," she said. "How are you?"'));
    it('parentheses', () => expectTextPreserved('(This is a test.)'));
    it('colon with number', () => expectTextPreserved('Price: $10.50'));
    it('email address', () => expectTextPreserved('Email: test@example.com'));
  });

  describe('multiple sentences', () => {
    it('exclamation and question', () => expectTextPreserved('First sentence! Second sentence? Third sentence.'));
    it('three sentences', () => expectTextPreserved('I walked. Then I ran. Finally, I stopped.'));
  });

  describe('edge cases', () => {
    it('whitespace-only returns empty array', () => {
      const result = lemmatizeEn('   ');
      expect(result.length).toBe(0);
      const reconstructed = result.map((t) => t.pre + t.text + t.post).join('');
      expect(reconstructed).toBe('');
    });

    it('single letter', () => expectTextPreserved('a'));
    it('single capital', () => expectTextPreserved('I'));
    it('contraction', () => expectTextPreserved("I'm happy!"));
  });

  describe('punctuation combinations', () => {
    it('ellipsis', () => expectTextPreserved('Well... okay.'));
    it('interrobang', () => expectTextPreserved('What?! Really?!'));
    it('semicolon and colon', () => expectTextPreserved('One; two: three.'));
  });
});
