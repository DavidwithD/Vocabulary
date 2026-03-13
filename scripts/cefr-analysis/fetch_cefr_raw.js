const fs = require('fs');
const https = require('https');

const WORDS_FILE = 'sources/common-words-raw.txt';
const OUTPUT_FILE = 'scripts/cefr-analysis/data/10K_cefr_analysis_raw.json';
const BATCH_SIZE = 10000; // words per API call
const BATCH_DELAY_MS = 500;

function postJSON(body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'vocabkitchen.com',
        path: '/profiler',
        method: 'POST',
        headers: {
          Accept: 'application.json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${body.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const words = fs
    .readFileSync(WORDS_FILE, 'utf8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);

  // Load existing results for resume support
  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  // Figure out which words still need lookup
  const pending = words.filter((w) => results[w] === undefined);
  console.log(`Total words: ${words.length}, cached: ${words.length - pending.length}, pending: ${pending.length}`);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const inputText = batch.join('\n');

    try {
      const resp = await postJSON({ ProfilerType: 'cefr', InputText: inputText });

      // Store each word's result from the response
      if (resp && typeof resp === 'object') {
        for (const [level, wordList] of Object.entries(resp)) {
          if (Array.isArray(wordList)) {
            for (const word of wordList) {
              results[word] = level;
            }
          }
        }
      }

      // Mark words with no result as null
      for (const word of batch) {
        if (results[word] === undefined) {
          results[word] = null;
        }
      }

      const done = Math.min(i + BATCH_SIZE, pending.length);
      console.log(`[${done}/${pending.length}] Processed batch (${batch.length} words)`);
    } catch (err) {
      console.error(`Error at batch ${i}: ${err.message}`);
      // Mark failed batch words so they can be retried by deleting from output
      for (const word of batch) {
        if (results[word] === undefined) {
          results[word] = null;
        }
      }
    }

    // Save after each batch for resume support
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    if (i + BATCH_SIZE < pending.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Summary
  const levels = {};
  for (const [word, level] of Object.entries(results)) {
    const key = level || 'unknown';
    levels[key] = (levels[key] || 0) + 1;
  }
  console.log('\nDone. Breakdown:');
  for (const [level, count] of Object.entries(levels).sort()) {
    console.log(`  ${level}: ${count}`);
  }
}

main();
