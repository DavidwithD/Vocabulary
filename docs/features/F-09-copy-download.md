# F-09: Copy & Download Word Lists

## Problem

Users had no way to export their word lists. Copying words for use in flashcard apps (e.g. Anki), sharing with others, or keeping a backup required manually selecting text from the popup.

## Solution

Add icon-only Copy and Download buttons in the popup toolbar, next to the word count. They operate on whichever tab is active (learning or familiar), exporting words as plain text with one word per line.

## Details

### Popup UI

Two small icon buttons sit to the right of the word count in a single-line toolbar:

```
12 words total                  ❐  ⬇
```

- ❐ (copy) — copies all words in the active tab to clipboard
- ⬇ (download) — downloads a `.txt` file with all words in the active tab

Buttons are hidden when the active list is empty.

### Copy

- Uses `navigator.clipboard.writeText()` with words joined by newline
- Shows a brief ✓ checkmark for 1.5s as confirmation, then restores the icon

### Download

- Creates a `Blob` with `text/plain` MIME type
- Triggers a download via a temporary `<a>` element with `URL.createObjectURL`
- Filename: `learning-words.txt` or `familiar-words.txt` based on the active tab

### Files Modified

- `popup.html` — `.list-toolbar` wrapper with `#wordCount`, `#copyBtn`, `#downloadBtn`
- `styles.css` — `.list-toolbar`, `.list-actions`, `.action-btn` styles
- `src/popup/popup.ts` — `getActiveWords()` helper, click handlers for copy and download, visibility toggle in `renderWords()`

## Dependencies

- [F-04: Learning State](F-04-learning-state.md) — the learning/familiar word lists being exported
