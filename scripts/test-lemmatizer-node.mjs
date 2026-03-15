/**
 * Node.js test script for lemmatizer logic.
 * Run with: node scripts/test-lemmatizer-node.mjs
 */

import nlp from 'compromise';

console.log('=== Lemmatizer Unit Tests (Sentence-Level Approach) ===\n');

// ============================================================
// Helper: toCoarsePOS
// ============================================================

function toCoarsePOS(tags) {
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

// ============================================================
// New sentence-level lemmatization using compute('root')
// ============================================================

function lemmatizeSentence(text) {
  if (!text?.trim()) return [];

  const tokens = text.match(/\p{L}+|[^\p{L}]+/gu) || [];
  const doc = nlp(text);
  doc.compute('root');

  // Get all terms with root and tags from json()
  const json = doc.json();
  const rootMap = new Map();
  const posMap = new Map();

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
      rootMap.get(lower).push(root);

      if (!posMap.has(lower)) {
        posMap.set(lower, []);
      }
      posMap.get(lower).push(pos);
    }
  }

  // Track consumption indices for duplicate words
  const rootIndexMap = new Map();
  const posIndexMap = new Map();

  // Process tokens
  return tokens.map((t) => {
    const isWord = /\p{L}/u.test(t);
    if (!isWord) {
      return { text: t, lemma: t, pos: 'Other', isWord: false };
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
    let pos = 'Other';
    if (posList && posList.length > 0) {
      const idx = posIndexMap.get(lower) || 0;
      pos = posList[idx] || posList[0];
      posIndexMap.set(lower, idx + 1);
    }

    return { text: t, lemma, pos, isWord: true };
  });
}

// ============================================================
// Test 1: Basic sentence lemmatization
// ============================================================

console.log('--- Test 1: Basic sentence lemmatization ---\n');

const testSentences = [
  'I have two eggs.',
  'The egg is fresh.',
  'He leaves his house every morning.',
  'The leaves are falling from the trees.',
];

testSentences.forEach((sentence) => {
  console.log(`Input: "${sentence}"`);
  const result = lemmatizeSentence(sentence);
  const words = result.filter((r) => r.isWord);
  words.forEach((w) => {
    console.log(`  "${w.text}" (${w.pos}) -> lemma: "${w.lemma}"`);
  });
  console.log('');
});

// ============================================================
// Test 2: Sentence-based word tests
// ============================================================

console.log('--- Test 2: Sentence-based word tests ---\n');

// [sentence, targetWord, expectedLemma, expectedPOS]
const sentenceTestCases = [
  // Nouns
  ['Her eyes are blue.', 'eyes', 'eye', 'Noun'],
  ['The leaves are falling.', 'leaves', 'leaf', 'Noun'],
  ['I have two eggs.', 'eggs', 'egg', 'Noun'],
  ['I remember their names.', 'names', 'name', 'Noun'],
  ['Both sides agreed.', 'sides', 'side', 'Noun'],
  // Verbs
  ['She is telling a story.', 'telling', 'tell', 'Verb'],
  ['The prisoner escaped yesterday.', 'escaped', 'escape', 'Verb'],
  ['He is challenging the rules.', 'challenging', 'challenge', 'Verb'],
  ['He turned around quickly.', 'turned', 'turn', 'Verb'],
  ['We watched the movie.', 'watched', 'watch', 'Verb'],
  ['He leaves early every day.', 'leaves', 'leave', 'Verb'],
  // Adjectives
  ['This is a challenging problem.', 'challenging', 'challenging', 'Adjective'],
  ['It is getting colder outside.', 'colder', 'cold', 'Adjective'],
  ['She is bigger than him.', 'bigger', 'big', 'Adjective'],
  ['This is the biggest house.', 'biggest', 'big', 'Adjective'],
  ['He is young.', 'young', 'young', 'Adjective'],
  ['She is younger than me.', 'younger', 'young', 'Adjective'],
  ['He is the youngest child.', 'youngest', 'young', 'Adjective'],
  // Perfect tenses and phrasal verbs
  ['I have seen you before.', 'seen', 'see', 'Verb'],
  ['I have seen you before.', 'have', 'have', 'Verb'],
  ['How are you getting on?', 'getting', 'get', 'Verb'],
  ['He was given away.', 'given', 'give', 'Verb'],
  ['He does not like apple.', 'does', 'do', 'Verb'],
  ['He does not like apple.', 'like', 'like', 'Verb'],
];

let passed = 0;
let failed = 0;

sentenceTestCases.forEach(
  ([sentence, targetWord, expectedLemma, expectedPOS]) => {
    const result = lemmatizeSentence(sentence);
    const target = result.find(
      (r) => r.text.toLowerCase() === targetWord.toLowerCase()
    );

    if (!target) {
      console.log(`✗ "${targetWord}" not found in "${sentence}"`);
      failed++;
      return;
    }

    const posOk = target.pos === expectedPOS;
    const lemmaOk = target.lemma === expectedLemma;
    const ok = posOk && lemmaOk;

    if (ok) {
      passed++;
      console.log(`✓ "${targetWord}" in "${sentence}"`);
      console.log(`    POS: ${target.pos}, lemma: "${target.lemma}"`);
    } else {
      failed++;
      console.log(`✗ "${targetWord}" in "${sentence}"`);
      console.log(
        `    POS: ${target.pos} (expected: ${expectedPOS}) ${posOk ? '✓' : '✗'}`
      );
      console.log(
        `    lemma: "${target.lemma}" (expected: "${expectedLemma}") ${
          lemmaOk ? '✓' : '✗'
        }`
      );
    }
  }
);

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);

// ============================================================
// Test 3: Context differentiation (same word, different context)
// ============================================================

console.log('\n--- Test 3: Context differentiation ---\n');

const contextTests = [
  {
    desc: '"leaves" as noun vs verb',
    tests: [
      ['The leaves are falling.', 'leaves', 'leaf'],
      ['He leaves early.', 'leaves', 'leave'],
    ],
  },
  {
    desc: '"challenging" as adjective vs verb',
    tests: [
      ['This is a challenging problem.', 'challenging', 'challenging'],
      ['He is challenging the decision.', 'challenging', 'challenge'],
    ],
  },
];

let contextPassed = 0;
let contextFailed = 0;

contextTests.forEach(({ desc, tests }) => {
  console.log(`Testing: ${desc}`);
  tests.forEach(([sentence, targetWord, expectedLemma]) => {
    const result = lemmatizeSentence(sentence);
    const target = result.find(
      (r) => r.text.toLowerCase() === targetWord.toLowerCase()
    );

    if (!target) {
      console.log(`  ✗ "${targetWord}" not found in "${sentence}"`);
      contextFailed++;
      return;
    }

    const ok = target.lemma === expectedLemma;
    if (ok) {
      contextPassed++;
      console.log(`  ✓ "${sentence}"`);
      console.log(`      "${targetWord}" -> "${target.lemma}"`);
    } else {
      contextFailed++;
      console.log(`  ✗ "${sentence}"`);
      console.log(
        `      "${targetWord}" -> "${target.lemma}" (expected: "${expectedLemma}")`
      );
    }
  });
  console.log('');
});

console.log(
  `--- Context Tests: ${contextPassed} passed, ${contextFailed} failed ---`
);

console.log('\n=== Tests Complete ===');
console.log(
  `Total: ${passed + contextPassed} passed, ${failed + contextFailed} failed`
);
