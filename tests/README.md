# Tests

This folder contains unit tests for the Vocabulary extension, powered by [Vitest](https://vitest.dev/).

## Running Tests

```bash
npm test            # run all tests once
npm run test:watch  # watch mode (re-runs on file save)
```

## Test Structure

- **lemmatizer.test.ts** — Unit tests for `lemmatizeEn`
  - Verb lemmatization (walks -> walk, running -> run)
  - Noun lemmatization (cats -> cat, boxes -> box)
  - Passive and multi-verb constructions (was seen leaving -> be, see, leave)
  - Return structure and punctuation handling
  - Edge cases
- **lemmatizer-whitespace.test.ts** — Whitespace and punctuation preservation
  - Verifies `pre + text + post` reconstructs the original input
  - Covers punctuation, spacing variations, quotes, contractions

## Adding New Tests

1. Create a new `.test.ts` file in this folder
2. Import directly from `../src/...` (no build step needed)
3. Use `describe`, `it`, `expect` from `vitest`
