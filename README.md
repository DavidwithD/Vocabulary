# Vocabulary Builder

A Chrome extension that helps users build vocabulary in **English**, **French**, and **Spanish** by highlighting unfamiliar words on any web page.

- 🟣 **Lavender** — unfamiliar words (click to add to learning list)
- 🟠 **Amber** — learning words (click to mark as familiar)
- Words below your CEFR level are treated as "common" and not highlighted

## Quick Start

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build      # Build once
npm run watch      # Build in watch mode
npm run typecheck  # Type check without emitting
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this project folder
4. Click the extension icon to configure language and CEFR level

## Project Structure

```
src/                    # TypeScript source
  content/              # Content script modules
    main.ts             # Entry point
    state.ts            # Global state and constants
    highlighter.ts      # DOM highlighting logic
    interactions.ts     # Click handlers, storage, initialization
    lemmatizer.ts       # Lemmatization dispatcher
    lemmatizer-fr.ts    # French lemmatizer
    lemmatizer-es.ts    # Spanish lemmatizer
  popup/
    popup.ts            # Popup UI logic
  types.ts              # Shared type definitions
  vendor.d.ts           # Type declarations for external libs

dist/                   # Built bundles (git-ignored)
data/                   # CEFR word lists (auto-generated)
vendor/                 # Third-party libs (compromise.js)
popup/                  # Popup HTML and CSS
scripts/                # Node.js build scripts for CEFR data
docs/                   # Documentation
```

## Documentation

See [docs/README.md](docs/README.md) for:

- [Architecture](docs/architecture.md)
- [Feature specs](docs/features/README.md)
- [Decision records](docs/decisions/README.md)

## Tech Stack

- **TypeScript** — type-safe JavaScript
- **Rollup** — ES module bundler
- **Chrome Extension Manifest V3**
- **compromise.js** — English NLP/lemmatization
