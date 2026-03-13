# CEFR Analysis Scripts

Scripts to assign CEFR levels (A1-C2) to the ~10K common word list used by the Vocabulary extension.

## Pipeline

Run all scripts from the **project root**.

### 1. Fetch raw CEFR data

```bash
node scripts/cefr-analysis/fetch_cefr_raw.js
```

Sends words from `sources/common-words-raw.txt` to the [VocabKitchen profiler API](https://vocabkitchen.com/profiler) in batches and saves the raw response. Supports resume — safe to interrupt and re-run.

**Input:** `sources/common-words-raw.txt`
**Output:** `data/10K_cefr_analysis_raw.json`

### 2. Reformat raw response

```bash
node scripts/cefr-analysis/json_format_change.js
```

Extracts words from the raw API response (strips HTML from `tableResult`) and groups them by CEFR level.

**Input:** `data/10K_cefr_analysis_raw.json`
**Output:** `data/10K_cefr_analysis.json`

### 3. Look up Off-List words

```bash
node scripts/cefr-analysis/cefr_offlist_lookup.js [limit]
```

Words the profiler couldn't classify end up as "Off-List". This script looks them up individually via [cefrlookup.com](https://cefrlookup.com/) using consensus from trusted sources (Cambridge, Oxford, British Council). Supports resume.

Optional `limit` argument restricts how many Off-List words to process.

**Input:** `data/10K_cefr_analysis.json`
**Output:** `data/offlist_cefr_results_v2.json`

### 4. Merge results

```bash
node scripts/cefr-analysis/merge_cefr_results.js
```

Moves Off-List words that got a CEFR level in step 3 into their proper level group in the main analysis file.

**Input:** `data/10K_cefr_analysis.json` + `data/offlist_cefr_results_v2.json`
**Output:** `data/10K_cefr_analysis.json` (updated in place)

## Data Files

| File | Description |
|------|-------------|
| `10K_cefr_analysis_raw.json` | Raw API response from VocabKitchen |
| `10K_cefr_analysis.json` | Clean `{ "A1": [...], "A2": [...], ..., "Off-List": [...] }` mapping |
| `offlist_cefr_results_v2.json` | Per-word lookup results from cefrlookup.com with source details |
