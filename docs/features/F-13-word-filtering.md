# F-13: Word Filtering

## Problem

The highlighter picks up tokens that are not meaningful English words:

1. **Single-letter tokens** — `a`, `b`, `z`, etc. These are too short to be useful vocabulary items and create visual noise.
2. **Non-Latin characters** — IPA transcriptions (`/ˈdʌbəl.juː/`), Old English letters (`Ƿ`, `Þ`, `Ð`, `Æ`), Japanese (`けんとう`, `検討`), and other non-Latin scripts. The Unicode-aware tokenizer (`\p{L}+`) correctly extracts these as letter sequences, but they should not be classified or highlighted when the user is studying English, French, or Spanish.

## Solution

Add a `shouldSkipWord(word)` guard in `content/highlighter.js` that rejects a token before it reaches lemmatization or classification:

1. **Length check** — skip any token with `word.length <= 1`.
2. **Script check** (per language):
   - **English** — `/^[a-zA-Z]+$/` (basic Latin only)
   - **French / Spanish** — `/^[a-zA-ZÀ-ÖØ-öø-ÿ]+$/` (basic Latin + accented Latin characters like `é`, `ñ`, `ü`, etc.)

This filters out IPA symbols, CJK, Cyrillic, archaic letters, and other non-applicable scripts in all three language modes.

The guard applies in both `processTextNode` and `wrapWordInTextNodes`. Skipped tokens are rendered as plain text nodes — they are never wrapped in highlight spans and never counted in page stats.

## Details

- The filter runs *after* `isWordToken()` and the existing number/ordinal check, *before* `lemmatize()` — so it avoids unnecessary NLP calls on tokens that will be discarded.
- No changes to storage, popup, or word sets.
- No new user-facing settings — the filtering is automatic.

### Examples

| Token | Language | Result |
|---|---|---|
| `a` | en | skipped (single letter) |
| `I` | en | skipped (single letter) |
| `Þ` | en | skipped (single letter + non-Latin) |
| `ˈdʌbəl` | en | skipped (non-Latin characters) |
| `けんとう` | en | skipped (non-Latin characters) |
| `running` | en | processed normally |
| `café` | fr | processed normally (Latin + accents) |
| `niño` | es | processed normally (Latin + accents) |
| `けんとう` | fr | skipped (non-Latin characters) |
| `検討` | es | skipped (non-Latin characters) |

## Dependencies

- [F-01: Word Form Highlighting](F-01-word-highlighting.md) — the highlighting pipeline where the guard is inserted
