# F-08: Highlight Toggle

## Problem

Sometimes users want to read without distraction but keep their vocabulary data intact. There was no way to temporarily disable highlighting without uninstalling or disabling the extension entirely.

## Solution

Add a toggle switch in the popup that turns highlighting on or off. When off, all highlights are removed from the page and click/double-click word interactions are disabled. The popup word lists remain fully functional for managing vocabulary.

## Details

### Popup UI

A compact iOS-style toggle switch sits between the title and the common words threshold selector:

```
Vocabulary Builder
[Highlight]                    (●)
[Common words:]              [3,000]
```

### Storage

- Key: `highlightEnabled` (boolean, default `true`)
- Stored in `chrome.storage.local` alongside existing keys
- Persists across sessions and syncs across tabs via storage change listener

### Turning Off

When the toggle is switched off:

1. `removeHighlights()` strips all highlight spans from the page, restoring original text nodes
2. `MutationObserver` is disconnected (no processing of dynamically added content)
3. Click and double-click handlers return early (no word interactions)
4. Page stat sets are cleared (highlights gone, counts no longer meaningful)

### Turning On

When the toggle is switched back on:

1. `highlightWords()` re-scans and highlights the full page
2. `MutationObserver` is reconnected for dynamic content
3. Click and double-click handlers resume normal behavior

### What Still Works When Off

- Popup word lists (learning/familiar tabs) — full add/promote/demote/delete
- Threshold changes are stored but don't trigger a re-highlight until toggle is on
- Word changes from other tabs are tracked but not rendered until toggle is on

### Files Modified

- `popup.html` — toggle switch markup
- `styles.css` — `.switch` / `.slider` toggle component styles
- `popup.js` — reads and writes `highlightEnabled` on toggle change
- `content.js` — `highlightEnabled` state variable, guards on init, click handlers, storage listener, and MutationObserver

## Dependencies

- [F-01: Word Form Highlighting](F-01-word-highlighting.md) — the highlighting system being toggled
- [F-03: Smart Word Discovery](F-03-smart-discovery.md) — click interactions being guarded
