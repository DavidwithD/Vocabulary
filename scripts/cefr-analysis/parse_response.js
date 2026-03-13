const fs = require('fs');

function main() {
  const data = JSON.parse(
    fs.readFileSync(
      'scripts/cefr-analysis/data/api_response.json',
      'utf8',
    ),
  );

  const result = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: [],
    'Off-List': [],
  };

  for (const level in data.tableResult) {
    for (const row of data.tableResult[level].rows) {
      const word = row.rowHtml.replace(/<[^>]+>/g, '');
      result[level].push(word);
    }
  }

  fs.writeFileSync(
    'scripts/cefr-analysis/data/cefr_analysis.json',
    JSON.stringify(result, null, 2),
  );
  console.log('Formatted raw CEFR data → cefr_analysis.json');
}

module.exports = main;

if (require.main === module) main();
