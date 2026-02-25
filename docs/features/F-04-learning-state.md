# F-04: Learning State

## Problem

A binary know/don't-know model doesn't reflect how vocabulary acquisition works. Users often partially recognize words but need further exposure before they're truly memorized. Without an intermediate state, words jump straight from "unknown" to "learned" with no in-between for review.

## Solution

Add a **learning** state between unfamiliar and familiar, creating a three-state lifecycle:

```
Unfamiliar ──click──► Learning ──click──► Familiar
                         ▲                    │
                         └──── double-click ───┘
                         ▲
    Common words ────────┘ (double-click)
```

Learning words are highlighted in **amber** (`#fff3e0` bg, `#e65100` text) — distinct from the lavender unfamiliar highlight — keeping them visible for passive review while browsing.

## Details

### Data Model

Word objects gain a `status` field: `"learning"` or `"familiar"`. Words without `status` default to `"familiar"` for backward compatibility.

```json
{ "word": "ephemeral", "definition": "lasting a short time", "status": "learning" }
```

### Interactions (Content Script)

| Action | Target | Result |
|---|---|---|
| Click | Unfamiliar word (lavender) | Add to learning (amber) |
| Click | Learning word (amber) | Promote to familiar (normal text) |
| Double-click | Familiar word (normal text) | Demote to learning (amber) |
| Double-click | Common word (normal text) | Add to learning (amber) |

### Popup UI

- Two tabs: **Learning** and **Familiar** with counts
- Learning words: checkmark button (promote) + delete button
- Familiar words: return arrow button (demote) + delete button

### Key Functions (`content.js`)

| Function | Purpose |
|---|---|
| `buildWordSets(words)` | Returns `{ familiar, learning }` Sets from storage array |
| `addWordAsLearning(lemma)` | Unknown → learning (optimistic UI + async storage) |
| `promoteToFamiliar(lemma)` | Learning → familiar |
| `demoteToLearning(lemma)` | Familiar → learning |
| `addCommonWordAsLearning(word)` | Common word → learning (targeted DOM update) |

## Dependencies

- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — base click-to-add and highlighting system
