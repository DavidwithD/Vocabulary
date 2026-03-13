const fs = require('fs');
const https = require('https');

const WORDS_FILE = 'sources/new_words.txt';
const OUTPUT_FILE = 'scripts/cefr-analysis/data/api_response.json';
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
            reject(
              new Error(`Failed to parse response: ${body.slice(0, 200)}`),
            );
          }
        });
      },
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

  console.log(`Total words: ${words.length}`);

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const inputText = batch.join('\n');

    try {
      const resp = await postJSON({
        ProfilerType: 'cefr',
        InputText: inputText,
      });

      // Save the raw API response directly (json_format_change.js handles parsing)
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(resp, null, 2));

      const done = Math.min(i + BATCH_SIZE, words.length);
      console.log(
        `[${done}/${words.length}] Fetched batch (${batch.length} words)`,
      );
    } catch (err) {
      console.error(`Error at batch ${i}: ${err.message}`);
    }

    if (i + BATCH_SIZE < words.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('Done. Raw results saved to', OUTPUT_FILE);
}

module.exports = main;

if (require.main === module) main();
