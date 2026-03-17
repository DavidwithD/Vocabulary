import nlp from 'compromise';

// ============================================================
// Lemmatization — dispatches to English (compromise.js) or French/Spanish (rule-based)
// ============================================================
/**
 * Map fine-grained compromise.js tags to coarse POS categories.
 */
function toCoarsePOS(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return 'Other';
    }
    if (tags.some((t) => t === 'Verb' ||
        t.includes('Tense') ||
        t === 'Gerund' ||
        t === 'Infinitive' ||
        t === 'PastParticiple' ||
        t === 'PresentParticiple')) {
        return 'Verb';
    }
    if (tags.some((t) => t === 'Adjective' || t === 'Comparable')) {
        return 'Adjective';
    }
    if (tags.some((t) => t === 'Adverb')) {
        return 'Adverb';
    }
    if (tags.some((t) => t === 'Noun' || t === 'Singular' || t === 'Plural' || t === 'Pronoun')) {
        return 'Noun';
    }
    return 'Other';
}
function lemmaMatrix(text) {
    const doc = nlp(text);
    const verbLemmas = new Map();
    doc.verbs().json().forEach((group) => {
        const verb = group.verb;
        if (!verb)
            return;
        for (const term of group.terms) {
            const idx = term.index[1];
            if (term.tags.includes('Negative') || term.tags.includes('Adverb')) {
                continue;
            }
            else if (term.tags.includes('Auxiliary') || term.tags.includes('Copula')) {
                const conj = nlp(term.normal).verbs().conjugate()[0];
                verbLemmas.set(idx, conj?.Infinitive || term.normal);
            }
            else {
                verbLemmas.set(idx, verb.infinitive || term.normal);
            }
        }
    });
    const nounLemmas = new Map();
    const nounDoc = doc.clone();
    nounDoc.nouns().toSingular();
    const nounTerms = nounDoc.json().flatMap((s) => s.terms);
    const origTerms = doc.json().flatMap((s) => s.terms);
    for (let i = 0; i < origTerms.length; i++) {
        if (origTerms[i].normal !== nounTerms[i]?.normal && origTerms[i].tags.includes('Plural')) {
            nounLemmas.set(origTerms[i].index[1], nounTerms[i].normal);
        }
    }
    const json = doc.json();
    const result = [];
    for (const sentence of json) {
        for (const term of sentence.terms) {
            if (term.tags.includes('Punctuation'))
                continue;
            const idx = term.index[1];
            let lemma;
            if (verbLemmas.has(idx)) {
                lemma = verbLemmas.get(idx);
            }
            else if (nounLemmas.has(idx)) {
                lemma = nounLemmas.get(idx);
            }
            else {
                lemma = term.normal || term.text.toLowerCase();
            }
            result.push({ text: term.text, lemma, pre: term.pre, post: term.post });
        }
    }
    return result;
}
/**
 * Lemmatize a sentence/text with full context (English).
 * Uses compute('root') to get root forms while preserving alignment.
 *
 * Strategy:
 * 1. Parse sentence with nlp()
 * 2. Call compute('root') to add root property to each term
 * 3. Extract root and POS from json() output
 */
function lemmatizeSentenceEn(text) {
    if (!text?.trim())
        return [];
    // Split by word boundaries to preserve whitespace/punctuation
    const tokens = text.match(/\p{L}+|[^\p{L}]+/gu) || [];
    if (typeof nlp !== 'function') {
        // Fallback: no NLP available
        return tokens.map((t) => ({
            text: t,
            lemma: t.toLowerCase(),
            pos: 'Other',
            isWord: /\p{L}/u.test(t),
        }));
    }
    const doc = nlp(text);
    doc.compute('root');
    // Get all terms with root and tags from json()
    const json = doc.json();
    const rootMap = new Map();
    const posMap = new Map();
    for (const sentence of json) {
        const terms = sentence.terms || [];
        for (const term of terms) {
            if (!term.text)
                continue;
            const lower = term.text.toLowerCase();
            const root = term.root || term.normal || lower;
            const pos = toCoarsePOS(term.tags);
            if (!rootMap.has(lower)) {
                rootMap.set(lower, []);
            }
            rootMap.get(lower).push(root);
            if (!posMap.has(lower)) {
                posMap.set(lower, []);
            }
            posMap.get(lower).push(pos);
        }
    }
    // Track consumption indices for duplicate words
    const rootIndexMap = new Map();
    const posIndexMap = new Map();
    // Process tokens, looking up roots and POS
    return tokens.map((t) => {
        const isWord = /\p{L}/u.test(t);
        if (!isWord) {
            return {
                text: t,
                lemma: t,
                pos: 'Other',
                isWord: false,
            };
        }
        const lower = t.toLowerCase();
        // Get root (handle duplicates)
        const rootList = rootMap.get(lower);
        let lemma = lower;
        if (rootList && rootList.length > 0) {
            const idx = rootIndexMap.get(lower) || 0;
            lemma = rootList[idx] || rootList[0];
            rootIndexMap.set(lower, idx + 1);
        }
        // Get POS (handle duplicates)
        const posList = posMap.get(lower);
        let pos = 'Other';
        if (posList && posList.length > 0) {
            const idx = posIndexMap.get(lower) || 0;
            pos = posList[idx] || posList[0];
            posIndexMap.set(lower, idx + 1);
        }
        return {
            text: t,
            lemma,
            pos,
            isWord: true,
        };
    });
}
/**
 * Lemmatize a sentence dispatching to the correct language handler.
 * For English, uses lemmaMatrix (better accuracy with pre/post preservation).
 * For French/Spanish, falls back to word-by-word processing (no POS context).
 *
 * Note: Return type varies by language:
 * - English: { text, lemma, pre, post }[]
 * - French/Spanish: { text, lemma, pos, isWord }[]
 */
function lemmatizeSentence(text) {
    {
        return lemmaMatrix(text);
    }
}
/**
 * Single-word lemmatize function for one-off lookups.
 * Uses sentence-level processing for accuracy even on single words.
 */
function lemmatizeEn(word) {
    if (!word)
        return '';
    const result = lemmatizeSentenceEn(word);
    const wordResult = result.find((r) => r.isWord);
    return wordResult?.lemma || word.toLowerCase();
}
/**
 * Dispatch lemmatization to the correct language handler.
 */
function lemmatize(word) {
    return lemmatizeEn(word);
}

export { lemmaMatrix, lemmatize, lemmatizeSentence, lemmatizeSentenceEn };
//# sourceMappingURL=lemmatizer.test.js.map
