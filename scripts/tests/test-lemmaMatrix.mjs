import { lemmaMatrix } from '../../dist/lemmatizer.test.js';

// ── Test utilities ───────────────────────────────────────────────────
let passed = 0
let failed = 0

function test(name, input, expectedLemmas) {
  const result = lemmaMatrix(input)
  const errors = []

  for (const [word, expectedLemma] of Object.entries(expectedLemmas)) {
    const entry = result.find((r) => r.text.toLowerCase() === word.toLowerCase())
    if (!entry) {
      errors.push(`word "${word}" not found in result`)
    } else if (entry.lemma !== expectedLemma) {
      errors.push(`"${word}" → expected "${expectedLemma}", got "${entry.lemma}"`)
    }
  }

  if (errors.length === 0) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name}`)
    errors.forEach((e) => console.log(`      ${e}`))
  }
}

// ── Tests ────────────────────────────────────────────────────────────
console.log('\n=== lemmaMatrix Tests ===\n')

console.log('── Verb Lemmatization ──')
test('Present tense', 'She walks to school', { walks: 'walk' })
test('Past tense', 'He walked yesterday', { walked: 'walk' })
test('Present continuous', 'They are running', { running: 'run' })
test('Past continuous', 'I was sleeping', { sleeping: 'sleep' })
test('Present perfect', 'She has eaten', { eaten: 'eat' })
test('Past perfect', 'He had gone', { gone: 'go' })
test('Irregular past', 'She went home', { went: 'go' })
test('Irregular past (saw)', 'I saw him', { saw: 'see' })
test('Irregular past (took)', 'He took it', { took: 'take' })
test('Auxiliary verb', 'I have a book', { have: 'have' })
test('Copula verb', 'She is happy', { is: 'be' })
test('Negation with not', 'I do not like it', { do: 'do', like: 'like' })

console.log('\n── Noun Lemmatization ──')
test('Regular plural -s', 'The cats sleep', { cats: 'cat' })
test('Regular plural -es', 'The boxes are heavy', { boxes: 'box' })
test('Plural -ies', 'The cities grow', { cities: 'city' })
test('Irregular plural (children)', 'The children play', { children: 'child' })
test('Irregular plural (mice)', 'The mice ran', { mice: 'mouse', ran: 'run' })
test('Irregular plural (men)', 'The men arrived', { men: 'man', arrived: 'arrive' })
test('Same form (sheep)', 'The sheep graze', { sheep: 'sheep' })

console.log('\n── Mixed Sentences ──')
test('Verbs and nouns', 'The dogs were barking', { 
  dogs: 'dog', 
  were: 'be', 
  barking: 'bark' 
})
test('Multiple verbs', 'He stopped running fast', { 
  stopped: 'stop', 
  running: 'run' 
})
test('Plural nouns with past tense', 'The children played games', { 
  children: 'child',
  played: 'play',
  games: 'game'
})

console.log('\n── Edge Cases ──')
test('Adjective (not lemmatized)', 'The happy dogs', { happy: 'happy' })
test('Adverb (not lemmatized)', 'She runs quickly', { quickly: 'quickly', runs: 'run' })
test('Punctuation preserved', 'Hello, world!', { Hello: 'hello', world: 'world' })

console.log('\n── Output Structure ──')
const result = lemmaMatrix('The cat sleeps.')
console.log('  Input: "The cat sleeps."')
console.log('  Output structure check:')
if (result.every(r => r.text && r.lemma !== undefined && r.pre !== undefined && r.post !== undefined)) {
  console.log('  ✓ All items have text, lemma, pre, post properties')
  passed++
} else {
  console.log('  ✗ Missing required properties')
  failed++
}

// ── Summary ──────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(40))
console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`)
console.log('═'.repeat(40) + '\n')

process.exit(failed > 0 ? 1 : 0)
