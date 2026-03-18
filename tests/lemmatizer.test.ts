import { describe, it, expect } from 'vitest';
import { lemmatizeEn } from '../src/content/lemmatizer';

function expectLemma(input: string, word: string, expectedLemma: string) {
  const result = lemmatizeEn(input);
  const entry = result.find((r) => r.text.toLowerCase() === word.toLowerCase());
  expect(entry, `"${word}" not found in result of "${input}"`).toBeDefined();
  expect(entry!.lemma).toBe(expectedLemma);
}

function expectLemmas(input: string, wordLemmaPairs: { word: string; lemma: string }[]) {
  const result = lemmatizeEn(input);
  for (const { word, lemma } of wordLemmaPairs) {
    const entry = result.find((r) => r.text.toLowerCase() === word.toLowerCase());
    expect(entry, `"${word}" not found in result of "${input}"`).toBeDefined();
    expect(entry!.lemma).toBe(lemma);
  }
}

describe('lemmatizeEn', () => {
  describe('basic verb lemmatization', () => {
    it('walks -> walk', () => expectLemma('She walks to school', 'walks', 'walk'));
    it('walked -> walk', () => expectLemma('He walked yesterday', 'walked', 'walk'));
    it('running -> run', () => expectLemma('They are running', 'running', 'run'));
  });

  describe('basic noun lemmatization', () => {
    it('cats -> cat', () => expectLemma('The cats sleep', 'cats', 'cat'));
    it('boxes -> box', () => expectLemma('The boxes are heavy', 'boxes', 'box'));
  });

  describe('return structure', () => {
    it('returns correct number of tokens', () => {
      const result = lemmatizeEn('Hello world');
      expect(result.length).toBe(2);
    });

    it('each token has required properties', () => {
      const result = lemmatizeEn('Hello world');
      expect(typeof result[0].text).toBe('string');
      expect(typeof result[0].lemma).toBe('string');
      expect(typeof result[0].pre).toBe('string');
      expect(typeof result[0].post).toBe('string');
    });
  });

  describe('punctuation handling', () => {
    it('lemmatizes with trailing comma', () => expectLemma('The cats, dogs, and birds', 'cats', 'cat'));
    it('lemmatizes with exclamation', () => expectLemma('She walks!', 'walks', 'walk'));
    it('lemmatizes with question mark', () => expectLemma('They are running?', 'running', 'run'));
    it('lemmatizes with period', () => expectLemma('The boxes are here.', 'boxes', 'box'));

    it('filters out punctuation from results', () => {
      const result = lemmatizeEn('Hello, world!');
      const hasNoPunctuation = result.every((r) => !/[.,!?;:]/.test(r.text));
      expect(hasNoPunctuation).toBe(true);
    });

    it('lemmatizes gerund with comma', () => expectLemma('Running, walking, talking?', 'walking', 'walk'));
  });

  describe('passive and multi-verb constructions', () => {
    it('was seen leaving -> be, see, leave', () => {
      const result = lemmatizeEn('He was seen leaving');
      const lemmas = result.map((r) => r.lemma);
      expect(lemmas).toEqual(['he', 'be', 'see', 'leave']);
    });

    it('has been running -> have, be, run', () => {
      const result = lemmatizeEn('She has been running');
      const lemmas = result.map((r) => r.lemma);
      expect(lemmas).toEqual(['she', 'have', 'be', 'run']);
    });

    it('was seen running -> be, see, run', () => {
      const result = lemmatizeEn('He was seen running');
      const lemmas = result.map((r) => r.lemma);
      expect(lemmas).toEqual(['he', 'be', 'see', 'run']);
    });
  });

  describe('I live', () => {
    const p1 = 'I live in a house near the mountains.';
    it('I -> i', () => expectLemma(p1, 'I', 'i'));
    it('live -> live', () => expectLemma(p1, 'live', 'live'));
    it('house -> house', () => expectLemma(p1, 'house', 'house'));
    it('mountains -> mountain', () => expectLemma(p1, 'mountains', 'mountain'));
  });

  describe('family paragraph', () => {
    const p1 = 'I live in a house near the mountains.';
    const p2 = 'I have two brothers and one sister, and I was born last.';
    const p3 = 'My father teaches mathematics, and my mother is a nurse at a big hospital.';
    const p4 = 'My brothers are very smart and work hard in school.';
    const p5 = 'My sister is a nervous girl, but she is very kind.';
    const p6 = 'My grandmother also lives with us.';
    const p7 = 'She came from Italy when I was two years old.';
    const p8 = 'She has grown old, but she is still very strong.';
    const p9 = 'She cooks the best food!';

    it('mountains -> mountain', () => expectLemma(p1, 'mountains', 'mountain'));
    it('brothers -> brother', () => expectLemma(p2, 'brothers', 'brother'));
    it('teaches -> teach', () => expectLemma(p3, 'teaches', 'teach'));
    it('brothers -> brother (p4)', () => expectLemma(p4, 'brothers', 'brother'));
    it('lives -> live', () => expectLemma(p6, 'lives', 'live'));
    it('came -> come', () => expectLemma(p7, 'came', 'come'));
    it('years -> year', () => expectLemma(p7, 'years', 'year'));
    it('grown -> grow', () => expectLemma(p8, 'grown', 'grow'));
    it('cooks -> cook', () => expectLemma(p9, 'cooks', 'cook'));
  });

  describe('multi-sentence', () => {
    const paragraph =
      'I live in a house near the mountains. ' +
      'I have two brothers and one sister, and I was born last. ' +
      'My father teaches mathematics, and my mother is a nurse at a big hospital. ' +
      'My brothers are very smart and work hard in school. ' +
      'My sister is a nervous girl, but she is very kind. ' +
      'My grandmother also lives with us. ' +
      'She came from Italy when I was two years old. ' +
      'She has grown old, but she is still very strong. ' +
      'She cooks the best food!';

    it('all', () => expectLemmas(paragraph, [
      { word: 'I', lemma: 'i' },
      { word: 'live', lemma: 'live' },
      { word: 'in', lemma: 'in' },
      { word: 'a', lemma: 'a' },
      { word: 'house', lemma: 'house' },
      { word: 'near', lemma: 'near' },
      { word: 'the', lemma: 'the' },
      { word: 'mountains', lemma: 'mountain' },
      { word: 'have', lemma: 'have' },
      { word: 'two', lemma: 'two' },
      { word: 'brothers', lemma: 'brother' },
      { word: 'and', lemma: 'and' },
      { word: 'one', lemma: 'one' },
      { word: 'sister', lemma: 'sister' },
      { word: 'was', lemma: 'be' },
      { word: 'born', lemma: 'born' },
      { word: 'last', lemma: 'last' },
      { word: 'father', lemma: 'father' },
      { word: 'teaches', lemma: 'teach' },
      { word: 'mathematics', lemma: 'mathematics' },
      { word: 'mother', lemma: 'mother' },
      { word: 'is', lemma: 'be' },
      { word: 'nurse', lemma: 'nurse' },
      { word: 'at', lemma: 'at' },
      { word: 'big', lemma: 'big' },
      { word: 'hospital', lemma: 'hospital' },
      { word: 'brothers', lemma: 'brother' },
      { word: 'are', lemma: 'be' },
      { word: 'very', lemma: 'very' },
      { word: 'smart', lemma: 'smart' },
      { word: 'work', lemma: 'work' },
      { word: 'hard', lemma: 'hard' },
      { word: 'in', lemma: 'in' },
      { word: 'school', lemma: 'school' },
      { word: 'sister', lemma: 'sister' },
      { word: 'is', lemma: 'be' },
      { word: 'nervous', lemma: 'nervous' },
      { word: 'girl', lemma: 'girl' },
      { word: 'but', lemma: 'but' },
      { word: 'she', lemma: 'she' },
      { word: 'is', lemma: 'be' },
      { word: 'very', lemma: 'very' },
      { word: 'kind', lemma: 'kind' },
      { word: 'grandmother', lemma: 'grandmother' },
      { word: 'also', lemma: 'also' },
      { word: 'lives', lemma: 'live' },
      { word: 'with', lemma: 'with' },
      { word: 'us', lemma: 'us' },
      { word: 'came', lemma: 'come' },
      { word: 'from', lemma: 'from' },
      { word: 'Italy', lemma: 'italy' },
      { word: 'when', lemma: 'when' },
      { word: 'I', lemma: 'i' },
      { word: 'was', lemma: 'be' },
      { word: 'two', lemma: 'two' },
      { word: 'years', lemma: 'year' },
      { word: 'old', lemma: 'old' },
      { word: 'has', lemma: 'have' },
      { word: 'grown', lemma: 'grow' },
      { word: 'old', lemma: 'old' },
      { word: 'but', lemma: 'but' },
      { word: 'she', lemma: 'she' },
      { word: 'is', lemma: 'be' },
      { word: 'still', lemma: 'still' },
      { word: 'very', lemma: 'very' },
      { word: 'strong', lemma: 'strong' },
      { word: 'cooks', lemma: 'cook' },
      { word: 'best', lemma: 'best' },
      { word: 'food', lemma: 'food' }
    ]));
  });

  describe('irregular verbs', () => {
    it('went -> go',       () => expectLemma('He went home',           'went',    'go'));
    it('bought -> buy',    () => expectLemma('She bought milk',        'bought',  'buy'));
    it('thought -> think', () => expectLemma('They thought about it',  'thought', 'think'));
    it('spoke -> speak',   () => expectLemma('He spoke clearly',       'spoke',   'speak'));
    it('ate -> eat',       () => expectLemma('She ate the food',       'ate',     'eat'));
    it('ran -> run',       () => expectLemma('He ran fast',            'ran',     'run'));
    it('flew -> fly',      () => expectLemma('She flew away',          'flew',    'fly'));
    it('wrote -> write',   () => expectLemma('He wrote a letter',      'wrote',   'write'));
    it('swam -> swim',     () => expectLemma('She swam across',        'swam',    'swim'));
    it('sang -> sing',     () => expectLemma('They sang a song',       'sang',    'sing'));
    it('broke -> break',   () => expectLemma('He broke the glass',     'broke',   'break'));
    it('drove -> drive',   () => expectLemma('She drove home',         'drove',   'drive'));
    it('knew -> know',     () => expectLemma('He knew the answer',     'knew',    'know'));
    it('saw -> see',       () => expectLemma('She saw the dog',        'saw',     'see'));
    it('took -> take',     () => expectLemma('He took the bus',        'took',    'take'));
    it('gave -> give',     () => expectLemma('She gave a gift',        'gave',    'give'));
    it('fell -> fall',     () => expectLemma('He fell down',           'fell',    'fall'));
    it('held -> hold',     () => expectLemma('She held the bag',       'held',    'hold'));
    it('kept -> keep',     () => expectLemma('They kept quiet',        'kept',    'keep'));
    it('slept -> sleep',   () => expectLemma('He slept well',          'slept',   'sleep'));
    it('chose -> choose',  () => expectLemma('She chose carefully',    'chose',   'choose'));
    it('fought -> fight',  () => expectLemma('He fought hard',         'fought',  'fight'));
    it('caught -> catch',  () => expectLemma('She caught the ball',    'caught',  'catch'));
    it('taught -> teach',  () => expectLemma('He taught the class',    'taught',  'teach'));
    it('brought -> bring', () => expectLemma('She brought food',       'brought', 'bring'));
    it('found -> find',    () => expectLemma('He found the key',       'found',   'find'));
    it('lost -> lose',     () => expectLemma('She lost the race',      'lost',    'lose'));
    it('left -> leave',    () => expectLemma('He left early',          'left',    'leave'));
    it('felt -> feel',     () => expectLemma('She felt happy',         'felt',    'feel'));
    it('meant -> mean',    () => expectLemma('He meant it',            'meant',   'mean'));
  });

  describe('irregular nouns', () => {
    it('children -> child', () => expectLemma('The children played', 'children', 'child'));
    it('feet -> foot',      () => expectLemma('His feet hurt',       'feet',     'foot'));
    it('mice -> mouse',     () => expectLemma('The mice ran',        'mice',     'mouse'));
    it('teeth -> tooth',    () => expectLemma('Her teeth shine',     'teeth',    'tooth'));
    it('men -> man',        () => expectLemma('The men worked',      'men',      'man'));
    it('women -> woman',    () => expectLemma('The women laughed',   'women',    'woman'));
    it('geese -> goose',    () => expectLemma('The geese flew',      'geese',    'goose'));
    it('oxen -> ox',        () => expectLemma('The oxen pulled',     'oxen',     'ox'));
    it('sheep -> sheep',    () => expectLemma('The sheep grazed',    'sheep',    'sheep'));
    it('fish -> fish',      () => expectLemma('The fish swam',       'fish',     'fish'));
  });

  describe('possessives', () => {
    it("father's strips possessive", () => expectLemma("my father's house", "father's", 'father'));
  });

  describe('contractions', () => {
    it("doesn't -> do",  () => expectLemma("She doesn't walk", "doesn't", 'do'));
    it("can't -> can",   () => expectLemma("can't stop",       "can't",   'can'));
    it("won't -> will",  () => expectLemma("won't go",         "won't",   'will'));
  });

  describe('ambiguous POS', () => {
    it('cook (noun) -> cook', () => expectLemma('She is a good cook', 'cook',  'cook'));
    it('cooks (verb) -> cook', () => expectLemma('She cooks daily',   'cooks', 'cook'));
  });

  describe('numbers and proper nouns', () => {
    it('number passes through unchanged', () => expectLemma('Paris has 42 museums', '42',      '42'));
    it('proper noun lowercased',          () => expectLemma('Paris has 42 museums', 'Paris',   'paris'));
    it('museums -> museum',               () => expectLemma('Paris has 42 museums', 'museums', 'museum'));
  });

  describe('mixed case', () => {
    it('RUNNING -> run',      () => expectLemma('RUNNING quickly', 'RUNNING',   'run'));
    it('Mountains -> mountain', () => expectLemma('Mountains are high', 'Mountains', 'mountain'));
  });

  describe('pre/post preservation', () => {
    it('comma goes into post of preceding token', () => {
      const result = lemmatizeEn('Hello, world!');
      const hello = result.find((r) => r.text === 'Hello');
      expect(hello?.post).toBe(', ');
    });

    it('exclamation goes into post of preceding token', () => {
      const result = lemmatizeEn('Hello, world!');
      const world = result.find((r) => r.text === 'world');
      expect(world?.post).toBe('!');
    });
  });

  describe('edge cases', () => {
    it('empty string returns empty array', () => {
      expect(lemmatizeEn('').length).toBe(0);
    });

    it('whitespace-only returns empty array', () => {
      expect(lemmatizeEn('   ').length).toBe(0);
    });
  });
});
