# ADR-003: CEFR Vocabulary Data Sources

## Status

`accepted` — 2026-03-02

## Context

To implement CEFR level–based word filtering (F-11), we needed a vocabulary dataset that:

1. Covers all six CEFR levels (A1–C2)
2. Is large enough to replace the existing ~10K frequency-ranked word list
3. Is freely available (no licensing restriction for use in an open-source extension)
4. Is single-word entries suitable for per-word highlighting (no multi-word phrases)

The official Cambridge **English Vocabulary Profile (EVP)** is the gold standard for CEFR-graded vocabulary but is proprietary — only accessible via a web UI, no download.

## Options Considered

| Option | Words | Levels | License | Notes |
|---|---|---|---|---|
| **Cambridge EVP** | ~10,000 | A1–C2 | Proprietary | No download available |
| **EFLLex** (UCLouvain) | 15,280 lemmas | A1–C1 | CC BY-NC-SA 4.0 | Frequency per level, no C2 |
| **OLP CEFR-J** | ~3,000 | A1–B2 | CC BY-SA 4.0 | Too small, English learner focus |
| **Octanove Vocabulary Profile** | ~1,000 | C1–C2 | CC BY-SA 4.0 | Supplements C1/C2 gap |
| **Oxford 5000** | ~5,000 | A1–C1 | Oxford copyright | Not freely reusable |
| **Kaggle 10K CEFR** | ~10,000 | A1–C2 | Unverified | Source and methodology unclear |

## Decision

Use **EFLLex** as the primary source, supplemented by the **Octanove Vocabulary Profile** for C2 coverage.

**EFLLex** was chosen because:
- Largest freely available CEFR-graded English lexicon (15,280 lemmas)
- Academic quality — based on corpus analysis of 21 EFL textbooks and online resources
- Frequency-per-level data allows principled level assignment (see below)
- Published by UCLouvain's CENTAL lab, the same team behind the CEFRLex project

**Octanove** was chosen to fill C2 because:
- EFLLex only covers up to C1
- Octanove is the most credible freely available C1/C2 supplement
- CC BY-SA 4.0 is compatible with the extension's use

**Oxford 5000** and **Kaggle 10K** were rejected: Oxford due to licensing, Kaggle due to opaque sourcing.

### Level Assignment Strategy

EFLLex provides normalized frequency per CEFR level, not a single assigned level. The build script assigns each word to the **lowest level where its aggregated frequency (summed across POS tags) first reaches a minimum threshold** (currently 5.0 per million words):

```
for each level A1 → C1:
  if sum_freq[level] >= 5.0 → assign this level and stop
if no level qualifies → assign C2
```

This is pedagogically correct: a word that appears significantly in A2 materials but also in C1 materials is still an A2 word — learners encounter it early. The alternative (assigning to the *peak* frequency level) was tried first and produced poor results (e.g., "about" assigned to B1 instead of A1) because very common words have relatively high frequency at all levels.

## Consequences

- Combined English dataset: ~10,637 unique single-word lemmas
- Words containing underscores (multi-word entries like `ice_cream`) are filtered out — the extension highlights individual words only
- C2 coverage is limited (~766 words from Octanove), which is appropriate since C2 represents mastery-level vocabulary
- Source TSV/CSV files are gitignored (build inputs only); the generated `data/cefr-words.js` is committed
- Rebuild requires downloading source files to `sources/` and running `npm run build:cefr`
- The CC BY-NC-SA 4.0 license on EFLLex prohibits commercial use — acceptable for this open-source extension
