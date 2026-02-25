# F-01: Word Form Highlighting

## Problem

Users save base words like "run" or "apple". On web pages, these words appear in many forms: *runs, ran, running, apples*. The extension should highlight all forms, not just the exact base word.

## Solution

Use [compromise.js](https://github.com/spencermountain/compromise) to **lemmatize** each word on the page back to its base form, then check the base form against a `Set` of the user's saved words.

```
page word "running" → lemmatize → "run" → found in Set → highlight
```

This is the reverse of generating all forms (which doesn't scale). See [ADR-001](../decisions/001-compromise-js.md).

## Details

- Walk DOM text nodes using `TreeWalker`
- Split text into words, lemmatize each, check against Set
- Wrap matches in `<span class="vocab-builder-highlight">` with bold red styling
- Handle dynamic content via `MutationObserver`
- Re-highlight on storage change (word added/removed)

### Performance

- Set lookup is O(1) per word — scales to 10k–50k words
- compromise.js lemmatization is fast at runtime
- Only process text nodes, skip `<script>`, `<style>`, `<noscript>`

## Dependencies

- [ADR-001: Use compromise.js](../decisions/001-compromise-js.md)
