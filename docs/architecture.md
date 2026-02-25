# Architecture

## Components

```
┌─────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                 │
│                                                 │
│  ┌──────────┐   chrome.storage   ┌───────────┐  │
│  │ Popup UI │ ◄════════════════► │  Storage   │  │
│  │          │                    │  (local)   │  │
│  └─────┬────┘                    └─────┬──────┘  │
│        │                               │         │
│        │  sendMessage /    onChanged    │         │
│        │  getPageStats                  │         │
│        │                               ▼         │
│        │                         ┌───────────┐   │
│        └────────────────────────►│  Content   │   │
│                                  │  Script    │   │
│                                  └─────┬──────┘  │
│                                        │         │
│                                        ▼         │
│                                  ┌───────────┐   │
│                                  │  Web Page  │   │
│                                  │  (DOM)     │   │
│                                  └───────────┘   │
└─────────────────────────────────────────────────┘
```

| Component | Files | Role |
|---|---|---|
| Popup UI | `popup.html`, `popup.js`, `styles.css` | View and manage words; configure threshold; show page stats |
| Content Script | `content.js` | Highlight matched words on web pages; track per-page word counts |
| Storage | Chrome Storage API (`chrome.storage.local`) | Persist word list across sessions |
| Manifest | `manifest.json` | Extension configuration (Manifest V3) |

## Data Model

Words are stored as an array in `chrome.storage.local` with a `status` field:

```json
{
  "words": [
    { "word": "algorithm", "status": "learning" },
    { "word": "run", "status": "familiar" }
  ],
  "commonWordThreshold": 3000
}
```

Words without a `status` field default to `"familiar"` (backward compatible).

`commonWordThreshold` controls how many top-frequency words are treated as "common" (default: 3000, max: ~9,894). The common words source (`common-words.js`) is a frequency-ranked array; the content script slices the top N at runtime to build a Set.

Three in-memory Sets provide O(1) lookup:
- `baseWordSet` — familiar words
- `learningWordSet` — learning words
- `COMMON_WORDS` — top N common words (built from `COMMON_WORDS_RANKED`)

Three additional Sets accumulate unique lemmas during highlighting for page statistics:
- `pageUnfamiliarLemmas`, `pageLearningLemmas`, `pageFamiliarLemmas`

## Highlighting Flow

```
Page Load
    │
    ▼
Load word list from storage
    │
    ▼
Build familiar + learning Sets
    │
    ▼
Walk all text nodes in DOM ──────────────────┐
    │                                        │
    ▼                                        │
For each word in text:                       │
  lemmatize (cached) → check Sets            │
    │                                        │
    ├─ in familiar Set → <span> (no style)   │
    ├─ in learning Set → <span> (amber bg)   │
    ├─ not in common words → <span> (lavender)│
    └─ common word → plain text              │
                                             │
  Process in chunks (50 nodes/frame)         │
  to avoid blocking the main thread          │
                                             │
MutationObserver ────────────────────────────┘
  (handles dynamically added content)

Storage onChanged
    │
    ├─ words changed → Rebuild word Sets → re-highlight
    └─ threshold changed → Rebuild COMMON_WORDS Set → re-highlight

Popup opens → sendMessage("getPageStats") → Content Script responds with Set sizes
```

## Performance

### Lemmatization Cache
A `Map<string, string>` caches `word → lemma` results. Most pages repeat words — each unique word only needs one compromise.js NLP call. The cache is never cleared (bounded by page vocabulary size, typically < 5000 entries).

### Chunked Processing
`highlightWords` processes text nodes in batches of 50 per animation frame using `requestAnimationFrame`. This prevents UI freezes on long pages while keeping total processing time similar.

### Targeted Updates
Click interactions use optimistic UI updates (swap CSS class/styles on existing spans) — no full-page re-highlight needed. Adding a common word as learning uses a targeted DOM walk to find and wrap just that word's text nodes, avoiding a full refresh.

### Page Statistics
Unique word counts per category are tracked by adding lemmas to Sets during `processTextNode` — zero overhead since `Set.add()` is O(1) and piggybacks on the existing classification. The popup retrieves counts via message passing (`chrome.runtime.onMessage`) only when opened.

## Styling

Three visual states for words on the page:

| State | CSS Class | Background | Text Color | Cursor |
|---|---|---|---|---|
| Unfamiliar | `vocab-builder-unknown` | `#f0e6ff` (lavender) | `#5e35b1` (purple) | `pointer` |
| Learning | `vocab-builder-learning` | `#fff3e0` (amber) | `#e65100` (orange) | `pointer` |
| Familiar | `vocab-builder-word` | none | inherited | default |
