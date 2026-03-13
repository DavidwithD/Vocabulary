const fetchCefr = require('./fetch_cefr');
const parseResponse = require('./parse_response');
const lookupOfflist = require('./lookup_offlist');
const mergeOfflist = require('./merge_offlist');
const updateCefrWords = require('./update_cefr_words');

async function runAll() {
  console.log('=== Step 1/5: Fetch CEFR data from API ===');
  await fetchCefr();

  console.log('\n=== Step 2/5: Parse API response ===');
  parseResponse();

  console.log('\n=== Step 3/5: Lookup off-list words ===');
  await lookupOfflist();

  console.log('\n=== Step 4/5: Merge off-list results ===');
  mergeOfflist();

  console.log('\n=== Step 5/5: Update cefr_words_en.json ===');
  updateCefrWords();

  console.log('\n=== All done ===');
}

runAll();
