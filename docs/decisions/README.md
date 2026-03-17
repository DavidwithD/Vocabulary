# Architecture Decision Records

## Index

| ID | Decision | Date | Status |
|---|---|---|---|
| [001](001-compromise-js.md) | Use compromise.js for lemmatization | 2026-02-24 | `accepted` |
| [002](002-french-lemmatizer.md) | Rule-based French lemmatizer | 2026-02-27 | `accepted` |
| [003](003-cefr-data-sources.md) | CEFR vocabulary data sources (EFLLex + Octanove) | 2026-03-02 | `accepted` |
| [004](004-lemma-matrix.md) | Replace token-alignment with lemmaMatrix | 2026-03-17 | `accepted` |

<!-- Add new decisions here -->

## Status Legend

| Status | Meaning |
|---|---|
| `proposed` | Under discussion |
| `accepted` | Decision made, will implement |
| `superseded` | Replaced by a later decision |
| `rejected` | Considered but not adopted |

## Adding a New Decision

1. Create `NNN-short-title.md` using the template below
2. Add a row to the index table above

### Template

```markdown
# ADR-NNN: Title

## Status
proposed | accepted | superseded | rejected

## Context
What situation or problem prompted this decision?

## Options Considered
| Option | Pros | Cons |
|---|---|---|

## Decision
What did we decide and why?

## Consequences
What follows from this decision?
```
