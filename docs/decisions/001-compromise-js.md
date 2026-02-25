# ADR-001: Use compromise.js for Lemmatization

## Status

`accepted` — 2026-02-24

## Context

The extension needs to match all forms of a base word (e.g., "run" → runs, ran, running) and handle contractions (haven't, don't, let's). The word list may grow to 10k–50k words, so the solution must scale.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Hand-rolled rules + irregular table** | Zero dependencies, small size | Incomplete coverage, no contraction support, hard to maintain, doesn't scale (giant regex) |
| **wink-lemmatizer** | Small, pure JS, no deps | Needs bundler, less mature, no contraction handling |
| **javascript-lemmatizer** | Browser-ready with demo | Depends on Underscore.js, limited coverage |
| **compromise.js** | Full NLP: lemmatization, contractions, conjugation. Browser-ready. Well-maintained, battle-tested | ~180KB minified |

## Decision

Use **compromise.js**.

The 180KB size is acceptable for a Chrome extension — it loads once per page and is cached. A single webpage image is often larger.

The key architectural shift: instead of *generating all forms from a base word* (forward), we *lemmatize page words back to base form* (reverse) and check against a Set. This gives O(1) lookup per word regardless of vocabulary size.

## Consequences

- Eliminates the hand-rolled `IRREGULAR_FORMS` table and `generateWordForms` function
- Contractions are handled natively (F-02 comes for free)
- Scales to large vocabularies without performance issues
- Adds a ~180KB dependency to the content script
- Need to include compromise.js in the extension bundle (CDN not available in content scripts)
