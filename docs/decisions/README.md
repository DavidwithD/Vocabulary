# Architecture Decision Records

## Index

| ID | Decision | Date | Status |
|---|---|---|---|
| [001](001-compromise-js.md) | Use compromise.js for lemmatization | 2026-02-24 | `accepted` |
| [002](002-french-lemmatizer.md) | Rule-based French lemmatizer | 2026-02-27 | `accepted` |

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
