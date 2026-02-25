# F-07: Page Statistics

## Problem

When reading a page, there's no way to know how many unfamiliar, learning, or familiar words it contains. This makes it hard to gauge reading difficulty or track vocabulary progress per page.

## Solution

Count unique words by category during the existing highlighting pass (zero overhead) and display the counts in the extension popup. The popup queries the active tab's content script via message passing when opened.

## Details

### Counting

Words are counted by unique lemma during `processTextNode()` — the same function that already classifies and wraps each word. Three `Set` objects accumulate lemmas as processing runs:

- `pageUnfamiliarLemmas` — unknown uncommon words
- `pageLearningLemmas` — words in learning state
- `pageFamiliarLemmas` — words in familiar state

Sets are cleared on full re-highlight (`removeHighlights`) and accumulate for dynamically added content.

### Popup Display

When the popup opens, it sends a `getPageStats` message to the active tab. The content script responds with the current Set sizes. The popup shows a compact stats row above the tabs:

```
● 12 unfamiliar   ● 5 learning   ● 3 familiar
```

Color-coded to match the existing highlight theme (purple / orange / green).

### Performance

- Zero overhead: just `Set.add()` calls alongside existing classification logic
- No DOM queries, no storage writes for stats
- Message passing only happens when the popup is opened

## Dependencies

- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — word classification provides the data
- [F-04: Learning State](F-04-learning-state.md) — three-state lifecycle defines the categories
