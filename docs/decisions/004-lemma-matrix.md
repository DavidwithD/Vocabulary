# ADR-004: Replace Token-Alignment with lemmaMatrix

## Status

`accepted` — 2026-03-17

## Context

The previous implementation of `lemmatizeSentence` split text into word/non-word tokens using a regex (`/\p{L}+|[^\p{L}]+/gu`), ran compromise.js separately, then tried to align the two arrays by matching lowercase surface forms. This alignment was fragile:

- Duplicate words in a sentence required index-tracking maps (`rootIndexMap`, `posIndexMap`) that could drift out of sync with compromise's internal tokenization.
- Whitespace and punctuation between words had to be reconstructed from the non-word tokens, but compromise sometimes merges or splits tokens differently than the regex (e.g., contractions, hyphenated words), causing misalignment.
- The approach was duplicated — the test script (`test-lemmatizer-node.mjs`) reimplemented the same logic in plain JS, making it easy for the two to diverge.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Keep token-alignment, add more edge-case fixes** | No refactor needed | Whack-a-mole; fragile by design |
| **Use compromise's `.json()` output with `pre`/`post` fields** | Compromise already tracks whitespace and punctuation per term; no manual alignment needed; single source of truth | Couples us more tightly to compromise's JSON structure |

## Decision

Use compromise's native `.json()` term structure directly via a new `lemmaMatrix()` function.

Each term in compromise's JSON output includes `text`, `pre` (leading whitespace/punctuation), and `post` (trailing whitespace/punctuation). By using these fields directly, we eliminate the manual token-splitting and alignment step entirely.

`lemmaMatrix()` returns `LemmaMatrixTerm[]` — a flat array where `pre + text + post` for all terms reconstructs the original input exactly. The existing `lemmatizeSentence()` is retained as a thin wrapper that maps `LemmaMatrixTerm` to the `LemmatizedTerm` interface used by the highlighter.

The highlighter (`processTextNode`) now builds DOM nodes directly from the matrix terms: `pre` and `post` become text nodes, `text` becomes either a `<span>` (highlighted) or text node (common/skipped).

## Consequences

- Eliminates `splitIntoTokens()` and the `rootIndexMap`/`posIndexMap` alignment machinery
- Whitespace and punctuation are preserved exactly as compromise parsed them — no reconstruction drift
- `lemmaMatrix` is independently testable (new test suite in `tests/`)
- Tighter coupling to compromise's `.json()` shape — if a future compromise version changes the `pre`/`post` contract, we'd need to adapt
- Renamed `baseWordSet` → `familiarWordSet` and `VOCAB_CLASS` → `FAMILIAR_CLASS` for clarity (opportunistic cleanup during the refactor)
