# F-03: Smart Word Discovery

## Problem

Users need a way to discover and add new vocabulary words while reading, but:
- Highlighting all unknown words creates visual clutter
- Manual word selection is tedious
- Accidentally adding common words (the, is, and) pollutes the vocabulary list
- A binary know/don't-know model doesn't reflect reality — many words are partially known

## Solution

**Smart highlighting** + **click-to-add** with three-tier visual system and a **learning** intermediate state:

### Visual States

| Word Type | CSS Class | Appearance | Interaction |
|---|---|---|---|
| Common word (top 3000) | *(none — plain text)* | Normal text | Double-click → add to learning |
| Unfamiliar (uncommon, not in list) | `vocab-builder-unknown` | Lavender bg `#f0e6ff`, purple text `#5e35b1` | Click → add to learning |
| Learning (partially known) | `vocab-builder-learning` | Amber bg `#fff3e0`, orange text `#e65100` | Click → promote to familiar |
| Familiar (well known) | `vocab-builder-word` | Normal text | Double-click → demote to learning |

### State Transitions

```
Unfamiliar ──click──► Learning ──click──► Familiar
                         ▲                    │
                         └──── double-click ───┘
                         ▲
    Common words ────────┘ (double-click)
```

### Behavior

```
Page word: "the"
  → In top 3000 common words
  → Appears as normal text
  → DOUBLE-CLICK → adds to learning → shows amber background

Page word: "algorithm"
  → NOT in user's list + NOT in top 3000
  → Shows lavender background (#f0e6ff)
  → CLICK → adds to learning → shows amber background (#fff3e0)

Page word: "ephemeral" (in learning list)
  → Shows amber background (#fff3e0)
  → CLICK → promotes to familiar → normal text

Page word: "run" (in familiar list)
  → Shows as normal text
  → DOUBLE-CLICK → demotes to learning → shows amber background
```

## Data Model

Word objects include a `status` field:

```json
{
  "words": [
    { "word": "algorithm", "definition": "", "status": "learning" },
    { "word": "run", "definition": "to move quickly", "status": "familiar" }
  ]
}
```

**Backward compatibility:** Words without a `status` field default to `"familiar"`.

**In-memory lookup:** Two Sets for O(1) performance:
- `baseWordSet` — familiar words
- `learningWordSet` — learning words

## Design Decisions

### 1. Three-State Word Lifecycle

**Change from previous two-state model**: Words now progress through unfamiliar → learning → familiar instead of jumping directly to familiar.

**Rationale:**
- Spaced-repetition research shows intermediate states improve retention
- Users often "kind of know" a word but need further exposure
- The learning state (amber highlight) keeps partially-known words visible on pages for passive review
- Familiar words become invisible (normal text), reducing clutter for mastered vocabulary

### 2. Single Click for State Progression

**Click unfamiliar → learning** (instant):
- Fast interaction, low friction
- Lavender background makes unfamiliar words visually distinct — accidental clicks are unlikely

**Click learning → familiar** (instant):
- Same direct interaction — no delay needed

### 3. Double-Click Interactions

**Double-click familiar → demote to learning:**
- Allows users to "un-learn" words they've forgotten
- Replaces the old "Are you familiar?" Yes/No popup with a direct action

**Double-click common word → add to learning:**
- Uses `window.getSelection()` since common words have no span wrapper
- Allows adding any word (even common ones) if the user wants to study it

### 4. Color Scheme (unchanged)

| State | Background | Text | Semantic |
|---|---|---|---|
| Unfamiliar | `#f0e6ff` (lavender) | `#5e35b1` (purple) | "Unknown — discover me" |
| Learning | `#fff3e0` (amber) | `#e65100` (orange) | "In progress — review me" |
| Familiar | none | inherited | "Mastered — invisible" |

### 5. Top 3000 Common Words Filter

**Dataset:** Top 3000 most frequent English words (based on corpus analysis)

**Coverage:** ~95% of everyday written English

**Implementation:** Embedded as JSON Set in content script (~15KB)

## Popup UI

The popup word list is split into two tabs:
- **Learning** tab — words with `status: "learning"`, shown with amber dot
- **Familiar** tab — words with `status: "familiar"`, shown with green dot

Each word entry has action buttons:
- Learning words: checkmark (promote to familiar) + delete
- Familiar words: return arrow (demote to learning) + delete

Words added via the popup default to `status: "learning"`.

## Performance Considerations

### Lemmatization Cache
- `lemmaCache`: a `Map<string, string>` caching `word → lemma` results
- Most pages repeat words — each unique word only needs one compromise.js NLP call
- Dramatically speeds up re-highlights and repeated words across the page
- Bounded by page vocabulary size (typically < 5000 entries), never cleared

### Chunked DOM Processing
- `highlightWords` processes text nodes in batches of 50 per animation frame
- Uses `requestAnimationFrame` to yield to the browser between chunks
- Prevents UI freezes on long pages (thousands of words)
- Total processing time is similar, but the page remains responsive

### Initial Page Load
- Typical article: 500-1000 words total
- After filtering top 3000: ~100-200 words with background (unfamiliar + learning)
- Each word wrapped in `<span>` only if needed
- O(1) Set lookup for common words, familiar, and learning checks
- Chunked processing prevents initial load from freezing the page

### Click Interaction Performance

**Solution:** Immediate visual feedback with optimistic UI updates

1. **Instant UI Update**: When user clicks a word, immediately update all instances on the page by swapping CSS classes and inline styles
2. **In-Memory State**: Update `baseWordSet` / `learningWordSet` immediately (synchronous)
3. **Background Storage**: Chrome storage update happens asynchronously
4. **Skip Redundant Refresh**: Storage change listener detects local updates (within 500ms) and skips expensive full-page re-highlighting

**Common word addition:** Uses a targeted DOM walk to find and wrap only that word's text nodes, avoiding a full-page refresh.

**Result:** All click interactions feel instant (< 50ms)

### Storage Change Handling
- Updates from popup: Full page re-highlight (chunked, non-blocking)
- Updates from same page clicks: Skipped (already updated UI)
- Time-based detection: 500ms window to detect local updates

## Edge Cases

### Contractions
- "haven't" lemmatizes to "have"
- If "have" is in top 3000 → ignored (unless user double-clicks to add to learning)
- If "have" NOT in top 3000 and NOT in list → show lavender background on "haven't"

### Numbers
- All numeric values are ignored (123, 2026, 3.14, etc.)
- Numbers with letters (4th, 1st, 2nd) are filtered out
- Pattern: `/^[\d.,]+$|^\d+(st|nd|rd|th)$/` matches pure numbers or ordinals

### Word Forms
- "running" lemmatizes to "run"
- Check lemma against familiar Set, learning Set, and common words
- Ensures all forms treated consistently

### Dynamically Added Content
- MutationObserver re-processes new nodes
- Maintains highlighting on SPAs, infinite scroll, etc.

### Backward Compatibility
- Existing word entries without `status` field default to `"familiar"`
- No migration needed — status is written on first state change

## Dependencies

- [F-01: Word Form Highlighting](F-01-word-highlighting.md) - lemmatization approach
- [ADR-001: Use compromise.js](../decisions/001-compromise-js.md) - NLP library

## Future Enhancements

- [ ] Configurable common words threshold (F-04)
- [ ] Export/import word lists
- [ ] Spaced repetition quiz mode
- [ ] Bulk promote/demote in popup UI
