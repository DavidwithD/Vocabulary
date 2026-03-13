const fs = require('fs');
const https = require('https');

const DATA_FILE = 'scripts/cefr-analysis/data/cefr_analysis.json';
const OUTPUT_FILE = 'scripts/cefr-analysis/data/offlist_results.json';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TRUSTED_SOURCES = [
  'Cambridge Dictionary',
  "Oxford Learner's",
  'British Council',
];

function parseSourceLevels(html) {
  const sources = {};
  // Split into individual source cards, then parse each one
  const cards = html.split('<div class="col-md-6 col-lg-4">');
  for (const card of cards) {
    const nameMatch = card.match(/<strong>(.*?)<\/strong>/);
    if (!nameMatch) continue;
    const sourceName = nameMatch[1].trim();
    if (!TRUSTED_SOURCES.includes(sourceName)) continue;
    // Only match level within this card (not crossing into next card)
    const levelMatch = card.match(
      /<div class="display-6 fw-bold mb-2">\s*<span[^>]*>(\w+)<\/span>/,
    );
    if (levelMatch && CEFR_LEVELS.includes(levelMatch[1])) {
      sources[sourceName] = levelMatch[1];
    }
  }
  return sources;
}

function computeConsensus(sources) {
  const levels = Object.values(sources);
  if (levels.length === 0) return null;

  // Count votes for each level
  const votes = {};
  for (const level of levels) {
    votes[level] = (votes[level] || 0) + 1;
  }

  // Sort by vote count desc, then by level order asc (lower = easier)
  const sorted = Object.entries(votes).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // more votes first
    return CEFR_LEVELS.indexOf(a[0]) - CEFR_LEVELS.indexOf(b[0]); // lower level wins tie
  });

  return sorted[0][0];
}

function lookupWord(word) {
  return new Promise((resolve) => {
    const postData = `word=${encodeURIComponent(word)}`;
    const options = {
      hostname: 'cefrlookup.com',
      path: '/lookup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        Referer: 'https://cefrlookup.com/',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const sources = parseSourceLevels(body);
        const level = computeConsensus(sources);
        resolve({ word, level, sources });
      });
    });

    req.on('error', (err) =>
      resolve({ word, level: null, sources: {}, error: err.message }),
    );
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const offList = data['Off-List'];

  // Load existing results for resume support
  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  // Filter out already-looked-up words
  const LIMIT = parseInt(process.argv[2]) || offList.length;
  const words = offList.slice(0, LIMIT).filter((w) => results[w] === undefined);

  const total = words.length;
  console.log(
    `Looking up ${total} words (${Object.keys(results).length} cached, batch: ${BATCH_SIZE}, trusted sources: ${TRUSTED_SOURCES.join(', ')})...`,
  );

  let done = 0;
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(lookupWord));

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { word, level, sources, error } = result.value;
        results[word] = { level, sources };
        done++;
        const srcInfo = Object.entries(sources)
          .map(([s, l]) => `${s}:${l}`)
          .join(', ');
        if (error) {
          console.log(`  [${done}/${total}] ${word} — ERROR: ${error}`);
        } else {
          console.log(
            `  [${done}/${total}] ${word} → ${level || 'Off-List'} (${srcInfo || 'no sources'})`,
          );
        }
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    if (i + BATCH_SIZE < words.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Summary
  const all = Object.values(results);
  const found = all.filter((v) => v.level !== null);
  console.log(
    `\nDone. ${found.length} words with CEFR levels out of ${all.length} total.`,
  );
  console.log('Breakdown:');
  const counts = {};
  for (const { level } of found) {
    counts[level] = (counts[level] || 0) + 1;
  }
  for (const [level, count] of Object.entries(counts).sort()) {
    console.log(`  ${level}: ${count}`);
  }
}

module.exports = main;

if (require.main === module) main();
