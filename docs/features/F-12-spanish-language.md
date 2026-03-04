# F-12: Spanish Language Support

## Problem

The extension only supports English and French. Users learning Spanish vocabulary need the same highlighting and word-tracking workflow on Spanish web pages.

## Solution

Add Spanish (`es`) as a third language option in the popup. Each language operates as a separate mode with its own CEFR word list, lemmatizer, and saved word list.

## Details

### Language Selector

The existing `<select>` dropdown gains a new option: `<option value="es">Español</option>`. Stored as `language: 'es'` in `chrome.storage.local`. Changing language triggers a full re-highlight on all open tabs.

### Spanish CEFR Word List

- Source: **ELELex** (UCLouvain CEFRLex project, CC BY-NC-SA 4.0) — 14,290 lexical entries with frequency profiles per CEFR level
- Build script: `scripts/build-cefr-words-es.js` parses `ELELex.tsv` (tab-separated), assigns each word to its lowest-frequency CEFR level meeting threshold (≥ 5), outputs `data/cefr-words-es.js`
- Result: **12,300 unique Spanish words** across A1–C2, stored as `CEFR_WORDS_ES` object

ELELex column format differs from FLELex/EFLLex: columns are quoted and named `level_freq@a1` (lowercase) instead of `freq_A1`. The build script handles this.

### Spanish Lemmatizer

Rule-based lemmatizer in `content/lemmatizer-es.js`:

- **Irregular verb table**: ~15 most common verbs (ser, estar, haber, tener, ir, hacer, poder, querer, decir, saber, venir, poner, salir, dar, ver, conocer, conducir, traer, oír, caer)
- **Verb conjugation rules** for three groups:
  - -ar verbs: present, imperfect (-aba), preterite, future (-aré), conditional (-aría), past participle (-ado), gerund (-ando)
  - -er verbs: present, imperfect (-ía), future (-eré), conditional (-ería), past participle (-ido), gerund (-iendo)
  - -ir verbs: present (-imos/-ís), future (-iré), conditional (-iría), past participle (-ido)
- **Noun/adjective rules**: plural -s, -es (after consonant), -ces → -z
- **Fallback**: lowercase word as-is

### Ordinal Number Handling

Spanish ordinals use º/ª (1º, 2ª). The number pattern in `content/highlighter.js` was extended to exclude these from highlighting.

### Separate Word Lists

Each language has its own storage key:
- `words_en` — English
- `words_fr` — French
- `words_es` — Spanish

### Files

| File | Role |
|---|---|
| `data/cefr-words-es.js` | Spanish CEFR word list (generated) |
| `content/lemmatizer-es.js` | Rule-based Spanish lemmatizer |
| `scripts/build-cefr-words-es.js` | Build script for Spanish word list |
| `sources/ELELex.tsv` | Source data from UCLouvain (gitignored) |

### Limitations

- The rule-based Spanish lemmatizer covers common patterns but is not exhaustive. Some irregular forms may not be recognized.
- Stem-changing verbs (e→ie, o→ue, e→i) are only covered in the irregular table for the most common verbs; regular stem-changers may not lemmatize correctly.

## Dependencies

- [F-10: French Language Support](F-10-french-language.md) — same multi-language architecture
- [F-11: CEFR Vocabulary Levels](F-11-cefr-vocabulary-levels.md) — CEFR level selector applies to all languages
