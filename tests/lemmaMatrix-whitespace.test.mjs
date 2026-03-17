import { lemmaMatrix } from '../dist/lemmatizer.test.js';

// ── Test utilities ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    failed++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: "${expected}"`);
    console.log(`    Actual:   "${actual}"`);
  } else {
    passed++;
    console.log(`  ✓ ${message}`);
  }
}

function testTextReconstruction(input) {
  const terms = lemmaMatrix(input);
  const reconstructed = terms.map(t => t.pre + t.text + t.post).join('');
  assertEquals(reconstructed, input, `Text preservation: "${input}"`);
  return reconstructed === input;
}

// ── Tests ────────────────────────────────────────────────────────────
console.log('\n=== lemmaMatrix Whitespace & Punctuation Preservation Tests ===\n');

console.log('Basic punctuation:');
testTextReconstruction('Hello, world!');
testTextReconstruction('She walks. He runs.');
testTextReconstruction('Is it working?');
testTextReconstruction('Yes! No? Maybe...');

console.log('\nWhitespace variations:');
testTextReconstruction('Single space');
testTextReconstruction('Double  space');
testTextReconstruction('  Leading space');
testTextReconstruction('Trailing space  ');
testTextReconstruction('Multiple   spaces    here');

console.log('\nComplex punctuation:');
testTextReconstruction('The cats, dogs, and birds are here.');
testTextReconstruction('"Hello," she said. "How are you?"');
testTextReconstruction('(This is a test.)');
testTextReconstruction('Price: $10.50');
testTextReconstruction('Email: test@example.com');

console.log('\nMultiple sentences:');
testTextReconstruction('First sentence! Second sentence? Third sentence.');
testTextReconstruction('I walked. Then I ran. Finally, I stopped.');

console.log('\nEdge cases:');
// Whitespace-only returns empty (expected behavior)
const emptyResult = lemmaMatrix('   ');
assertEquals(emptyResult.length, 0, 'Whitespace-only returns empty array');
const reconstructed = emptyResult.map(t => t.pre + t.text + t.post).join('');
assertEquals(reconstructed, '', 'Whitespace-only reconstructs to empty string');

testTextReconstruction('a'); // Single letter
testTextReconstruction('I'); // Single capital
testTextReconstruction('I\'m happy!'); // Contractions

console.log('\nPunctuation combinations:');
testTextReconstruction('Well... okay.');
testTextReconstruction('What?! Really?!');
testTextReconstruction('One; two: three.');

// ── Summary ──────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`─────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
