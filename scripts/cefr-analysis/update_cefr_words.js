const fs = require('fs');

const ANALYSIS_FILE = 'scripts/cefr-analysis/data/cefr_analysis.json';
const CEFR_WORDS_FILE = 'scripts/cefr-analysis/data/cefr_words_en.json';
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function main() {
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
  const cefrWords = JSON.parse(fs.readFileSync(CEFR_WORDS_FILE, 'utf8'));

  let totalAdded = 0;
  for (const level of CEFR_LEVELS) {
    const existing = new Set(cefrWords[level] || []);
    const toAdd = (analysis[level] || []).filter((w) => !existing.has(w));
    if (toAdd.length > 0) {
      cefrWords[level] = [...existing, ...toAdd].sort();
      console.log(`  ${level}: +${toAdd.length} (${toAdd.join(', ')})`);
      totalAdded += toAdd.length;
    } else {
      console.log(`  ${level}: no new words`);
    }
  }

  fs.writeFileSync(CEFR_WORDS_FILE, JSON.stringify(cefrWords, null, 2));
  console.log(`\nDone. Added ${totalAdded} words to ${CEFR_WORDS_FILE}`);
}

module.exports = main;

if (require.main === module) main();
