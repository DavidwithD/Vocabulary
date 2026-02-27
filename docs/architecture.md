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
| Popup UI | `popup.html`, `popup.js`, `styles.css` | View and manage words; configure language, level, toggle; show page stats |
| Content Script | `content/state.js`, `content/lemmatizer.js`, `content/lemmatizer-fr.js`, `content/highlighter.js`, `content/interactions.js` | Highlight matched words on web pages; track per-page word counts |
| Word Lists | `cefr-words.js` (English), `cefr-words-fr.js` (French) | CEFR-graded vocabulary lists per language |
| NLP | `compromise.min.js` (English), `content/lemmatizer-fr.js` (French) | Lemmatization: map inflected forms to base forms |
| Storage | Chrome Storage API (`chrome.storage.local`) | Persist word lists (per language), settings |
| Manifest | `manifest.json` | Extension configuration (Manifest V3) |

## Data Model

Words are stored per language in `chrome.storage.local`:

```json
{
  "language": "en",
  "cefrLevel": "B2",
  "highlightEnabled": true,
  "words_en": [
    { "word": "algorithm", "status": "learning" },
    { "word": "run", "status": "familiar" }
  ],
  "words_fr": [
    { "word": "manger", "status": "learning" }
  ]
}
```

| Key | Type | Default | Description |
|---|---|---|---|
| `language` | `'en'` \| `'fr'` | `'en'` | Active language |
| `cefrLevel` | `'A1'`–`'C2'` | `'B2'` | CEFR level (shared across languages) |
| `highlightEnabled` | boolean | `true` | Highlighting on/off |
| `words_en` | array | `[]` | English word list (`{ word, status }`) |
| `words_fr` | array | `[]` | French word list (`{ word, status }`) |

Words without a `status` field default to `"familiar"` (backward compatible). Legacy `words` key is auto-migrated to `words_en`.

### CEFR Word Lists

Each language has a CEFR-graded word list organized by level:
- **English**: `cefr-words.js` (`CEFR_WORDS`) — built from EFLLex + Octanove data
- **French**: `cefr-words-fr.js` (`CEFR_WORDS_FR`) — built from FLELex data

`buildCommonWordsSet(cefrLevel)` selects the correct list based on `currentLanguage` and builds a Set of all words at or below the given level.

### In-Memory Sets

Three in-memory Sets provide O(1) lookup:
- `baseWordSet` — familiar words (for current language)
- `learningWordSet` — learning words (for current language)
- `COMMON_WORDS` — CEFR common words (for current language and level)

Three additional Sets accumulate unique lemmas during highlighting for page statistics:
- `pageUnfamiliarLemmas`, `pageLearningLemmas`, `pageFamiliarLemmas`

## Highlighting Flow

```
Page Load
    │
    ▼
Load language + word list from storage
    │
    ▼
Build COMMON_WORDS Set (from CEFR_WORDS or CEFR_WORDS_FR)
Build familiar + learning Sets (from words_en or words_fr)
    │
    ▼
Walk all text nodes in DOM ──────────────────┐
    │                                        │
    ▼                                        │
For each word in text:                       │
  lemmatize (EN: compromise.js,              │
             FR: rule-based) → check Sets    │
    │                                        │
    ├─ in familiar Set → <span> (no style)   │
    ├─ in learning Set → <span> (amber bg)   │
    ├─ not in common words → <span> (lavender)│
    └─ common word → plain text              │
                                             │
  Unicode-aware word splitting (\p{L})       │
  Process in chunks (50 nodes/frame)         │
                                             │
MutationObserver ────────────────────────────┘
  (handles dynamically added content)

Storage onChanged
    │
    ├─ language changed → Switch CEFR list + word list → re-highlight
    ├─ words_xx changed → Rebuild word Sets → re-highlight
    └─ cefrLevel changed → Rebuild COMMON_WORDS Set → re-highlight

Popup opens → sendMessage("getPageStats") → Content Script responds with Set sizes
```

## Performance

### Lemmatization Cache
A `Map<string, string>` caches `word → lemma` results per language (`lemmaCache` for English, `lemmaCacheFr` for French). Most pages repeat words — each unique word only needs one NLP/rule call. Caches are never cleared (bounded by page vocabulary size, typically < 5000 entries).

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
