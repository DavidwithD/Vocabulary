import { lemmaMatrix } from '../dist/lemmatizer.test.js';

// ── Test utilities ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failed++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
  } else {
    passed++;
    console.log(`  ✓ ${message}`);
  }
}

function testLemma(input, word, expectedLemma) {
  const result = lemmaMatrix(input);
  const entry = result.find((r) => r.text.toLowerCase() === word.toLowerCase());
  
  if (!entry) {
    failed++;
    console.log(`  ✗ "${word}" in "${input}"`);
    console.log(`    Word not found in result`);
    return;
  }
  
  assertEquals(entry.lemma, expectedLemma, `"${word}" → "${expectedLemma}" in "${input}"`);
}

// ── Tests ────────────────────────────────────────────────────────────
console.log('\n=== lemmaMatrix Unit Tests ===\n');

console.log('Basic verb lemmatization:');
testLemma('She walks to school', 'walks', 'walk');
testLemma('He walked yesterday', 'walked', 'walk');
testLemma('They are running', 'running', 'run');

console.log('\nBasic noun lemmatization:');
testLemma('The cats sleep', 'cats', 'cat');
testLemma('The boxes are heavy', 'boxes', 'box');

console.log('\nReturn structure:');
const result = lemmaMatrix('Hello world');
assertEquals(result.length, 2, 'Returns correct number of tokens');
assertEquals(typeof result[0].text, 'string', 'Each token has text property');
assertEquals(typeof result[0].lemma, 'string', 'Each token has lemma property');
assertEquals(typeof result[0].pre, 'string', 'Each token has pre property');
assertEquals(typeof result[0].post, 'string', 'Each token has post property');

console.log('\nPunctuation handling:');
testLemma('The cats, dogs, and birds', 'cats', 'cat');
testLemma('She walks!', 'walks', 'walk');
testLemma('They are running?', 'running', 'run');
testLemma('The boxes are here.', 'boxes', 'box');
const punctResult = lemmaMatrix('Hello, world!');
const hasNoPunctuation = punctResult.every(r => !/[.,!?;:]/.test(r.text));
assertEquals(hasNoPunctuation, true, 'Punctuation is filtered out from results');
testLemma('Running, walking, talking?', 'walking', 'walk');

console.log('\nEdge cases:');
const emptyResult = lemmaMatrix('');
assertEquals(emptyResult.length, 0, 'Empty string returns empty array');

const whitespaceResult = lemmaMatrix('   ');
assertEquals(whitespaceResult.length, 0, 'Whitespace-only input returns empty array');

// ── Summary ──────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`─────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
