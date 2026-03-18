# Features

## Index

| ID | Feature | Status | Spec |
|---|---|---|---|
| F-01 | [Word Form Highlighting](F-01-word-highlighting.md) | `done` | Highlight all forms of saved words on web pages |
| F-02 | [Contraction Support](F-02-contraction-support.md) | `done` | Handle haven't, don't, let's, etc. |
| F-03 | [Smart Word Discovery](F-03-smart-discovery.md) | `done` | Click-to-add with common words filter and three-state lifecycle |
| F-04 | [Learning State](F-04-learning-state.md) | `done` | Intermediate "learning" state between unfamiliar and familiar |
| F-05 | [Remove Definition Storage](F-05-remove-definition.md) | `done` | Remove manual word entry and definition field from popup |
| F-06 | [Configurable Common Words Threshold](F-06-configurable-threshold.md) | `done` | Adjustable common words filter (1k–10k) from popup |
| F-07 | [Page Statistics](F-07-page-stats.md) | `done` | Show unfamiliar/learning/familiar word counts per page in popup |
| F-08 | [Highlight Toggle](F-08-highlight-toggle.md) | `done` | Toggle highlighting on/off from popup for distraction-free reading |
| F-09 | [Copy & Download](F-09-copy-download.md) | `done` | Copy or download word lists as plain text |
| F-10 | [French Language Support](F-10-french-language.md) | `done` | Language selector with French CEFR word list and lemmatizer |
| F-11 | [CEFR Vocabulary Levels](F-11-cefr-vocabulary-levels.md) | `done` | Replace numeric threshold with A1–C2 CEFR level selector backed by EFLLex data |
| F-12 | [Spanish Language Support](F-12-spanish-language.md) | `done` | Language selector with Spanish CEFR word list and lemmatizer |
| F-13 | [Word Filtering](F-13-word-filtering.md) | `in-progress` | Skip single-letter tokens and non-Latin characters per language |
| F-14 | [Unknown Word List](F-14-unknown-word-list.md) | `done` | Temporary per-page unknown word list in popup with add-to-learning action |

<!-- Add new features here -->

## Status Legend

| Status | Meaning |
|---|---|
| `planned` | Spec written, not yet implemented |
| `in-progress` | Currently being built |
| `done` | Implemented and working |
| `cut` | Decided not to do |

## Adding a New Feature

1. Create `F-XX-feature-name.md` using the template below
2. Add a row to the index table above

### Template

```markdown
# F-XX: Feature Name

## Problem
What problem does this solve?

## Solution
How do we solve it?

## Details
Specifics, edge cases, examples.

## Dependencies
Other features or decisions this depends on.
```
