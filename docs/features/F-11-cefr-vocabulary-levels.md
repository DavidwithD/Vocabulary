# F-11: CEFR Vocabulary Levels

## Problem

The previous common words filter used a raw frequency threshold (1,000–10,000 words). This was opaque to users — "3,000 most common words" doesn't map to anything meaningful in language learning. Users couldn't relate the number to their actual proficiency.

## Solution

Replace the numeric threshold with a **CEFR level selector** (A1–C2) in the popup. The extension builds the "known words" set from all words at or below the selected level. Words above that level — or not in the list at all — are highlighted as unfamiliar.

```
Your level: [B2 ▾]
→ A1 + A2 + B1 + B2 words → COMMON_WORDS Set → not highlighted
→ C1 + C2 words → highlighted as unfamiliar
```

CEFR (Common European Framework of Reference for Languages) is the international standard used by language schools, exams (IELTS, DELF, TOEFL), and textbooks worldwide.

## Details

### Data Sources

Two open datasets are merged into a single generated file per language:

**English (`data/cefr-words.js`):**
- [EFLLex](https://cental.uclouvain.be/cefrlex/efllex/) (UCLouvain, CC BY-NC-SA 4.0) — 15,280 lemmas, A1–C1, with normalized frequency per level per textbook/resource
- [Octanove Vocabulary Profile](https://github.com/openlanguageprofiles/olp-en-cefrj) (CC BY-SA 4.0) — ~1,000 entries at C1/C2, used to supplement C2 coverage

**French (`data/cefr-words-fr.js`):**
- FLELex (UCLouvain, same project) — French equivalent of EFLLex

Combined English dataset: **10,637 unique words** across all levels.
Combined French dataset: **13,048 unique words** across all levels.

### Level Assignment (EFLLex)

EFLLex gives normalized frequency per level (how often a word appears in A1 textbooks, A2 textbooks, etc.), not a single assigned level. The build script assigns each word to the **lowest/first level** where its aggregated frequency (summed across all POS entries) meets a minimum threshold of **5**. This means:

- A word that first reaches frequency ≥ 5 in A1 materials → A1
- A word that first reaches the threshold in B2 materials → B2
- A word that never reaches the threshold in any level → C2 (very rare words)

Words from the Octanove supplement that are not already covered by EFLLex are added at their annotated level (C1 or C2).

### Data File Format

```js
// data/cefr-words.js (auto-generated — do not edit manually)
const CEFR_WORDS = {
  A1: ['afternoon', 'angry', 'beautiful', ...],  // 1,160 words
  A2: ['accident', 'afraid', 'angry', ...],       // 539 words
  B1: ['abandon', 'absence', 'absorb', ...],      // 962 words
  B2: ['abolish', 'abrupt', 'absorbing', ...],    // 723 words
  C1: ['abysmal', 'acrimonious', ...],            // 1,252 words
  C2: ['ablution', 'abscond', ...],               // 6,001 words
};
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
```

Both `CEFR_WORDS` and `CEFR_LEVELS` are shared by both English and French files; the French file defines `CEFR_WORDS_FR` instead.

### Rebuilding the Data File

```bash
npm run build:cefr
```

Requires the source files in `sources/`:
- `sources/EFLLex.tsv`
- `sources/octanove-vocabulary-profile-c1c2-1.0.csv`

These are gitignored (download-only build inputs).

### Storage

New key in `chrome.storage.local`:

```json
{ "cefrLevel": "B2" }
```

Default: `"B2"`. Replaces the old `commonWordThreshold` numeric key.

**Migration:** On first load after update, if `commonWordThreshold` exists but `cefrLevel` does not, the old value is converted automatically:

| Old threshold | → | CEFR level |
|---|---|---|
| ≤ 1,000 | → | A2 |
| ≤ 2,000 | → | B1 |
| ≤ 3,000 | → | B2 |
| ≤ 5,000 | → | C1 |
| > 5,000 | → | C2 |

The old key is removed from storage after migration.

### Popup UI

```
Your level:  [B2 (Upper Intermediate) ▾]
```

Options: A1 (Beginner) / A2 (Elementary) / B1 (Intermediate) / B2 (Upper Intermediate) / C1 (Advanced) / C2 (Proficiency)

Changing the level saves to storage immediately. All open tabs rebuild their `COMMON_WORDS` Set and re-highlight via `storage.onChanged`.

### Files Changed

| File | Change |
|---|---|
| `data/cefr-words.js` | New — CEFR-organized word data (replaces `common-words.js`) |
| `data/cefr-words-fr.js` | New — French CEFR word data |
| `scripts/build-cefr-words.js` | New — build script for English data |
| `scripts/build-cefr-words-fr.js` | New — build script for French data |
| `content/state.js` | `DEFAULT_CEFR_LEVEL`, rewritten `buildCommonWordsSet(cefrLevel)`, `thresholdToCefrLevel()` migration helper |
| `content/highlighter.js` | Guard updated to check `CEFR_WORDS` / `CEFR_WORDS_FR` |
| `content/interactions.js` | Storage key `cefrLevel`, migration from `commonWordThreshold` |
| `popup/popup.html` | CEFR `<select>` dropdown replaces numeric threshold |
| `popup/popup.js` | Binds to `cefrLevel`, includes migration logic |
| `manifest.json` | Swapped `common-words.js` → `data/cefr-words.js` + `data/cefr-words-fr.js` |

## Dependencies

- [F-06: Configurable Common Words Threshold](F-06-configurable-threshold.md) — superseded by this feature
- [F-10: French Language Support](F-10-french-language.md) — CEFR level selector applies to both languages
- [ADR-003: CEFR Data Sources](../decisions/003-cefr-data-sources.md)
