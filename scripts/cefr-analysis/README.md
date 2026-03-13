# CEFR Analysis Scripts

Scripts to assign CEFR levels (A1-C2) to the ~10K common word list used by the Vocabulary extension.

## Quick Start

Run the full pipeline from the **project root**:

```bash
node scripts/cefr-analysis/run_all.js
```

## Pipeline

Each script can also be run individually from the **project root**.

### 1. Fetch CEFR data from API

```bash
node scripts/cefr-analysis/fetch_cefr.js
```

Sends words from `data/common_adj_words.txt` to the [VocabKitchen profiler API](https://vocabkitchen.com/profiler) in batches and saves the raw response.

**Input:** `data/common_adj_words.txt`
**Output:** `data/api_response.json`

### 2. Parse API response

```bash
node scripts/cefr-analysis/parse_response.js
```

Extracts words from the raw API response (strips HTML from `tableResult`) and groups them by CEFR level.

**Input:** `data/api_response.json`
**Output:** `data/cefr_analysis.json`

### 3. Look up Off-List words

```bash
node scripts/cefr-analysis/lookup_offlist.js [limit]
```

Words the profiler couldn't classify end up as "Off-List". This script looks them up individually via [cefrlookup.com](https://cefrlookup.com/) using consensus from trusted sources (Cambridge, Oxford, British Council). Supports resume.

Optional `limit` argument restricts how many Off-List words to process.

**Input:** `data/cefr_analysis.json`
**Output:** `data/offlist_results.json`

### 4. Merge off-list results

```bash
node scripts/cefr-analysis/merge_offlist.js
```

Moves Off-List words that got a CEFR level in step 3 into their proper level group in the main analysis file.

**Input:** `data/cefr_analysis.json` + `data/offlist_results.json`
**Output:** `data/cefr_analysis.json` (updated in place)

### 5. Update master word list

```bash
node scripts/cefr-analysis/update_cefr_words.js
```

Merges new words from the analysis into the master CEFR word list, skipping duplicates.

**Input:** `data/cefr_analysis.json` + `data/cefr_words_en.json`
**Output:** `data/cefr_words_en.json` (updated in place)

## Data Files

All data files are in `scripts/cefr-analysis/data/` (git-ignored).

| File | Description |
|------|-------------|
| `api_response.json` | Raw API response from VocabKitchen |
| `cefr_analysis.json` | Clean `{ "A1": [...], "A2": [...], ..., "Off-List": [...] }` mapping |
| `offlist_results.json` | Per-word lookup results from cefrlookup.com with source details |
| `cefr_words_en.json` | Master CEFR word list for the extension |
