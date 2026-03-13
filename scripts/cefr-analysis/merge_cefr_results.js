const fs = require('fs');

const ANALYSIS_FILE = 'scripts/cefr-analysis/data/10K_cefr_analysis.json';
const RESULTS_FILE = 'scripts/cefr-analysis/data/offlist_cefr_results_v2.json';

const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

// Log before counts
console.log('Before:');
for (const level of Object.keys(data)) {
  console.log(`  ${level}: ${data[level].length}`);
}

// Move words from Off-List to their CEFR level
let moved = 0;
const newOffList = [];

for (const word of data['Off-List']) {
  const result = results[word];
  if (result && result.level) {
    data[result.level].push(word);
    moved++;
  } else {
    newOffList.push(word);
  }
}

data['Off-List'] = newOffList;

// Sort each level array alphabetically
for (const level of Object.keys(data)) {
  data[level].sort();
}

fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(data, null, 2));

// Log after counts
console.log(`\nMoved ${moved} words from Off-List.\n`);
console.log('After:');
for (const level of Object.keys(data)) {
  console.log(`  ${level}: ${data[level].length}`);
}
