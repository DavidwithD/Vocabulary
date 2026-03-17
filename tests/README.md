# Tests

This folder contains unit tests for the Vocabulary extension.

## Running Tests

To run the `lemmaMatrix` test:

```bash
npm run build:test && node tests/lemmaMatrix.test.mjs
```

Or you can use the existing test command:
```bash
npm test
```

## Test Structure

- **lemmaMatrix.test.mjs** - Unit tests for the `lemmaMatrix` function from `lemmatizer.ts`
  - Tests verb lemmatization (walks → walk, running → run)
  - Tests noun lemmatization (cats → cat, boxes → box)
  - Tests return structure
  - Tests edge cases

## Adding New Tests

1. Create a new `.test.mjs` file in this folder
2. Import the function from `../dist/lemmatizer.test.js` (built by rollup)
3. Write your test assertions
4. Update the npm test script if needed
