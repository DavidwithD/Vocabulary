# F-06: Configurable Common Words Threshold

## Problem

The common words filter was hardcoded to the top 3,000 most frequent English words. Users with different proficiency levels need different thresholds — beginners benefit from a larger filter (fewer highlights), while advanced learners want a smaller filter to surface more words.

## Solution

Make the common words threshold configurable from the popup, with a dropdown offering preset values from 1,000 to 10,000. The source list (`common-words-raw.txt`) contains ~9,894 words ranked by frequency.

## Details

### Data Changes

`common-words.js` now exports a frequency-ranked array instead of a flat Set:

Before:
```js
const COMMON_WORDS = new Set(['the', 'of', ...]);  // 3,000 words
```

After:
```js
const COMMON_WORDS_RANKED = ['the', 'of', ...];  // ~9,894 words, most frequent first
```

The content script builds the `COMMON_WORDS` Set at runtime by slicing the top N words from the array.

### Storage

New key in `chrome.storage.local`:

```json
{ "commonWordThreshold": 3000 }
```

Default is `3000` (preserves existing behavior).

### Popup UI

A dropdown between the title and tabs:

```
Common words:  [3,000 ▾]
```

Options: 1,000 / 2,000 / 3,000 / 5,000 / 7,000 / 10,000

Changing the value saves to storage immediately. The content script listens for `commonWordThreshold` changes via `storage.onChanged` and re-highlights the page.

### Files Changed

| File | Change |
|---|---|
| `common-words.js` | `Set` → frequency-ranked array (~9,894 words) |
| `content.js` | Dynamic Set building from threshold; storage listener for threshold changes |
| `popup.html` | Settings row with `<select>` dropdown |
| `popup.js` | Load/save threshold setting |
| `styles.css` | `.settings-row` styles |

## Dependencies

- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — common word detection uses the dynamically built Set
