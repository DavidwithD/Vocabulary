# F-14: Unknown Word List

## Problem

The popup only showed persistent lists (learning, familiar) with no way to see which unfamiliar words appear on the current page. Users had to read the page and click words one-by-one with no overview of what they were encountering.

## Solution

Add a third "Unknown" tab in the popup showing all unfamiliar words on the current page. Unlike the learning and familiar lists this list is **temporary** — it reflects the live page state and is not persisted to storage. It resets on every page load and refreshes automatically when the tab is activated.

## Details

### Popup UI

The Unknown tab is placed first (leftmost) and is the default view when the popup opens:

```
[ Unknown 12 ]  [ Learning 5 ]  [ Familiar 3 ]
```

- Purple active indicator (`#5e35b1`) to match the existing lavender highlight colour
- Word count shows "X words on this page" (vs "X words total" on learning/familiar tabs)
- Each word has a "+" button to add it to learning
- Toolbar shows a refresh button (↻) to re-fetch from the content script; copy and download buttons are also available when the list is non-empty
- List max-height is 500px (vs 300px for the persistent lists)

### Data Flow

1. Popup opens → calls `loadUnknownWords()`
2. Sends `{ type: 'getUnknownWords' }` to the active tab's content script
3. Content script responds with `Array.from(pageUnfamiliarLemmas.keys()).sort()`
4. Popup renders the sorted word list

The content script already maintains `pageUnfamiliarLemmas` (a `Map<lemma, Set<spans>>`) during the normal highlighting pass — no new tracking logic required.

### Adding a Word to Learning

Clicking "+" on an unknown word:
1. Saves the word to `words_${lang}` storage with `status: 'learning'`
2. The content script's `storage.onChanged` listener fires and moves the word's page spans from `pageUnfamiliarLemmas` to `pageLearningLemmas` (instant visual update on the page)
3. The word is **optimistically removed** from the unknown list immediately, without a round-trip re-fetch
4. The learning tab badge count updates

### Refresh Button

Always visible when the Unknown tab is active. Re-fetches the full word list from the content script. Useful when:
- The page is still being processed (chunked `requestAnimationFrame` highlighting)
- Words were clicked directly on the page while the popup was open

### Copy & Download

Work the same as on the other tabs. Use the cached `unknownWords` array (no additional message needed). Download filename: `unknown-words-{lang}.txt`.

### Files Modified

- `src/types.ts` — Added `UnknownWordsRequest` / `UnknownWordsResponse` interfaces
- `src/content/interactions.ts` — Extended `onMessage` listener to handle `getUnknownWords`
- `popup/popup.html` — Added Unknown tab (first), `#unknownList`, `#unknownCount`, `#refreshBtn`
- `src/popup/popup.ts` — `activeTab` widened to `WordStatus | 'unknown'`; `loadUnknownWords()`, `renderUnknownWords()`, `createUnknownWordLi()`; unknown list click handler; refresh button handler; `getActiveWords()` handles unknown tab; `renderWords()` skips toolbar updates when on unknown tab
- `popup/styles.css` — `#unknownList` max-height, `.tab[data-tab="unknown"].active` purple colour, `.add-learning-btn` styles

## Dependencies

- [F-07: Page Statistics](F-07-page-stats.md) — `pageUnfamiliarLemmas` map already maintained during highlighting; this feature reuses it
- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — word classification defines what counts as "unknown"
- [F-04: Learning State](F-04-learning-state.md) — "add to learning" action follows the existing state lifecycle
- [F-09: Copy & Download](F-09-copy-download.md) — copy/download extended to work on the unknown tab
