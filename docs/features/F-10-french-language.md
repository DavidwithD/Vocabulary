# F-10: French Language Support

## Problem

The extension only supports English. Users learning French vocabulary need the same highlighting and word-tracking workflow on French web pages, with accented characters (é, è, ê, ç, à, ù, ô, etc.) handled correctly.

## Solution

Add a language selector (English / Français) in the popup. Each language operates as a separate mode with its own CEFR word list, lemmatizer, and saved word list.

## Details

### Language Selector

A `<select>` dropdown in the popup settings, above the highlight toggle. Stored as `language` in `chrome.storage.local` (`'en'` or `'fr'`, default `'en'`). Changing language triggers a full re-highlight on all open tabs.

### French CEFR Word List

- Source: **FLELex** (UCLouvain, CC BY-NC-SA 4.0) — 14,236 lemmas with frequency profiles per CEFR level
- Build script: `scripts/build-cefr-words-fr.js` parses `FLELex.csv` (tab-separated), assigns each word to its highest-frequency CEFR level, outputs `cefr-words-fr.js`
- Result: 13,048 unique French words across A1–C2, stored as `CEFR_WORDS_FR` object

### French Lemmatizer

Rule-based lemmatizer in `content/lemmatizer-fr.js` (see [ADR-002](../decisions/002-french-lemmatizer.md)):

- **Irregular verb table**: ~20 most common verbs (être, avoir, aller, faire, pouvoir, vouloir, savoir, voir, venir, devoir, dire, prendre, mettre, tenir, connaître, croire, écrire, lire, partir, mourir, naître, ouvrir, suivre, recevoir, boire, conduire, plaire)
- **Verb conjugation rules**: -er group (present, imperfect, future, conditional, past participle), -ir group (-issons/-issez/-issent patterns)
- **Noun/adjective rules**: plural (-s, -x, -aux→-al, -eaux→-eau), feminine (-ive→-if, -euse→-eur, -trice→-teur)
- **Fallback**: lowercase word as-is

### Unicode Word Boundaries

Replaced `\b` and `\w` with Unicode-aware `\p{L}` regex in `content/highlighter.js`. This handles accented characters correctly for French and also improves English handling for edge cases (e.g., accented names).

### Separate Word Lists

Each language has its own storage key:
- `words_en` — English word list
- `words_fr` — French word list

Existing `words` data is auto-migrated to `words_en` on first load.

### Files

| File | Role |
|---|---|
| `cefr-words-fr.js` | French CEFR word list (generated) |
| `content/lemmatizer-fr.js` | Rule-based French lemmatizer |
| `scripts/build-cefr-words-fr.js` | Build script for French word list |
| `FLELex.csv` | Source data from UCLouvain |

### Limitations

- The rule-based French lemmatizer covers common patterns but is not exhaustive. Some irregular forms may not be recognized.
- Compound words and multi-word expressions are not handled.

## Dependencies

- [F-01: Word Form Highlighting](F-01-word-highlighting.md)
- [F-03: Smart Word Discovery](F-03-smart-discovery.md)
- [ADR-002: Rule-based French lemmatizer](../decisions/002-french-lemmatizer.md)
