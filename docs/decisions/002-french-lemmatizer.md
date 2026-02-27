# ADR-002: Rule-based French Lemmatizer

## Status

`accepted` — 2026-02-27

## Context

Adding French language support requires lemmatizing French words on web pages back to their base form (e.g., "mangeons" → "manger", "animaux" → "animal"). The existing English lemmatizer uses compromise.js, which is English-only.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **node-lefff** (LEFFF dictionary lookup) | Comprehensive coverage of French morphology; based on well-known LEFFF lexicon | Node.js package, unclear browser compatibility; dictionary file likely very large; LGPL license |
| **nlp-js-tools-french** | Includes tokenizer, POS tagger, lemmatizer, stemmer | Large package; unclear browser/extension compatibility; may be overkill |
| **Pre-expanded word list** (generate all inflected forms at build time) | No runtime lemmatizer needed; simple Set lookup | Massively inflates word list size (each verb has 50+ forms); user-added words still need lemmatization |
| **Rule-based lemmatizer** | Small footprint; no dependencies; fast; covers majority of common patterns | Incomplete coverage; some irregular forms will be missed |

## Decision

Use a **lightweight rule-based lemmatizer** with an irregular verb lookup table.

French morphology is more regular than English in many ways. A small set of rules covers the most common patterns:

- **Irregular verb table** (~20 most frequent verbs with all conjugated forms) handles the hardest cases
- **Suffix rules** handle regular -er/-ir verb conjugations, plural nouns (-s, -aux→-al), and feminine adjectives (-ive→-if, -euse→-eur)
- **Fallback** returns the lowercase word as-is

This approach is pragmatic for a Chrome extension: zero dependencies, small file size, fast execution. Coverage is imperfect but sufficient for CEFR common word detection and typical vocabulary building use.

## Consequences

- New file: `content/lemmatizer-fr.js` (~300 lines, mostly the irregular verb table)
- `content/lemmatizer.js` dispatches to English or French lemmatizer based on `currentLanguage`
- Each language has its own lemma cache (`lemmaCache` for English, `lemmaCacheFr` for French)
- Some uncommon irregular verb forms will not lemmatize correctly — they will be treated as unfamiliar words, which is acceptable (user can still click to add them)
- Coverage can be improved iteratively by expanding the irregular table or adding more suffix rules
