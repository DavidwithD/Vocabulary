(function () {
    'use strict';

    // ============================================================
    // Global state and constants for the vocabulary content script
    // ============================================================
    // CEFR_WORDS, CEFR_LEVELS, CEFR_WORDS_FR, CEFR_WORDS_ES are global variables
    // loaded from data/*.js files before this bundle runs (see manifest.json)
    const VOCAB_CLASS = 'vocab-builder-word'; // Familiar words (not visually highlighted)
    const UNKNOWN_CLASS = 'vocab-builder-unknown'; // Unknown uncommon words (lavender background)
    const LEARNING_CLASS = 'vocab-builder-learning'; // Learning words (amber background)
    const DEFAULT_CEFR_LEVEL = 'B2';
    const DEFAULT_LANGUAGE = 'en';
    let currentLanguage = DEFAULT_LANGUAGE;
    let COMMON_WORDS = new Set();
    let baseWordSet = new Set(); // Familiar words
    let learningWordSet = new Set(); // Learning words
    let lastLocalUpdate = 0; // Timestamp of last local update to skip redundant re-highlights
    let highlightEnabled = true; // Whether highlighting and click interactions are active
    // Page-level unique word counters (accumulated during processTextNode)
    const pageUnfamiliarLemmas = new Set();
    const pageLearningLemmas = new Set();
    const pageFamiliarLemmas = new Set();
    // Setters for mutable state (since we export lets)
    function setCurrentLanguage(lang) {
        currentLanguage = lang;
    }
    function setBaseWordSet(words) {
        baseWordSet = words;
    }
    function setLearningWordSet(words) {
        learningWordSet = words;
    }
    function setLastLocalUpdate(time) {
        lastLocalUpdate = time;
    }
    function setHighlightEnabled(enabled) {
        highlightEnabled = enabled;
    }
    /**
     * Get the storage key for the current language's word list.
     */
    function getWordsKey() {
        return `words_${currentLanguage}`;
    }
    /**
     * Build the common words Set from all words at or below the given CEFR level.
     * Picks the correct word list based on currentLanguage.
     */
    function buildCommonWordsSet(cefrLevel) {
        const source = currentLanguage === 'fr'
            ? CEFR_WORDS_FR
            : currentLanguage === 'es'
                ? CEFR_WORDS_ES
                : CEFR_WORDS;
        if (!source)
            return;
        const idx = CEFR_LEVELS.indexOf(cefrLevel);
        if (idx === -1)
            return;
        const words = [];
        for (let i = 0; i <= idx; i++) {
            const level = CEFR_LEVELS[i];
            words.push(...source[level]);
        }
        COMMON_WORDS = new Set(words);
    }
    /**
     * Convert legacy numeric threshold to approximate CEFR level.
     * Used for one-time migration of existing users.
     */
    function thresholdToCefrLevel(threshold) {
        if (threshold <= 1000)
            return 'A2';
        if (threshold <= 2000)
            return 'B1';
        if (threshold <= 3000)
            return 'B2';
        if (threshold <= 5000)
            return 'C1';
        return 'C2';
    }
    /**
     * Build Sets of familiar and learning words from the user's word list.
     * Enables O(1) lookup regardless of vocabulary size.
     * Words without a status field default to 'familiar' (backward compat).
     */
    function buildWordSets(words) {
        const familiar = new Set();
        const learning = new Set();
        if (!words || words.length === 0)
            return { familiar, learning };
        words.forEach((entry) => {
            const w = entry.word.toLowerCase().trim();
            const status = entry.status || 'familiar';
            if (status === 'learning') {
                learning.add(w);
            }
            else {
                familiar.add(w);
            }
        });
        return { familiar, learning };
    }

    // ============================================================
    // French lemmatization — rule-based with irregular verb table
    // ============================================================
    const lemmaCacheFr = new Map();
    /**
     * Common irregular French verbs: conjugated form → infinitive.
     * Covers the most frequent irregular verbs (être, avoir, aller, faire, etc.)
     */
    const FR_IRREGULAR = new Map([
        // être
        ['suis', 'être'],
        ['es', 'être'],
        ['est', 'être'],
        ['sommes', 'être'],
        ['êtes', 'être'],
        ['sont', 'être'],
        ['étais', 'être'],
        ['était', 'être'],
        ['étions', 'être'],
        ['étiez', 'être'],
        ['étaient', 'être'],
        ['fus', 'être'],
        ['fut', 'être'],
        ['fûmes', 'être'],
        ['fûtes', 'être'],
        ['furent', 'être'],
        ['serai', 'être'],
        ['seras', 'être'],
        ['sera', 'être'],
        ['serons', 'être'],
        ['serez', 'être'],
        ['seront', 'être'],
        ['serais', 'être'],
        ['serait', 'être'],
        ['serions', 'être'],
        ['seriez', 'être'],
        ['seraient', 'être'],
        ['sois', 'être'],
        ['soit', 'être'],
        ['soyons', 'être'],
        ['soyez', 'être'],
        ['soient', 'être'],
        ['été', 'être'],
        // avoir
        ['ai', 'avoir'],
        ['as', 'avoir'],
        ['avons', 'avoir'],
        ['avez', 'avoir'],
        ['ont', 'avoir'],
        ['avais', 'avoir'],
        ['avait', 'avoir'],
        ['avions', 'avoir'],
        ['aviez', 'avoir'],
        ['avaient', 'avoir'],
        ['eus', 'avoir'],
        ['eut', 'avoir'],
        ['eûmes', 'avoir'],
        ['eûtes', 'avoir'],
        ['eurent', 'avoir'],
        ['aurai', 'avoir'],
        ['auras', 'avoir'],
        ['aura', 'avoir'],
        ['aurons', 'avoir'],
        ['aurez', 'avoir'],
        ['auront', 'avoir'],
        ['aurais', 'avoir'],
        ['aurait', 'avoir'],
        ['aurions', 'avoir'],
        ['auriez', 'avoir'],
        ['auraient', 'avoir'],
        ['aie', 'avoir'],
        ['ait', 'avoir'],
        ['ayons', 'avoir'],
        ['ayez', 'avoir'],
        ['aient', 'avoir'],
        ['eu', 'avoir'],
        // aller
        ['vais', 'aller'],
        ['vas', 'aller'],
        ['va', 'aller'],
        ['allons', 'aller'],
        ['allez', 'aller'],
        ['vont', 'aller'],
        ['allais', 'aller'],
        ['allait', 'aller'],
        ['allions', 'aller'],
        ['alliez', 'aller'],
        ['allaient', 'aller'],
        ['irai', 'aller'],
        ['iras', 'aller'],
        ['ira', 'aller'],
        ['irons', 'aller'],
        ['irez', 'aller'],
        ['iront', 'aller'],
        ['irais', 'aller'],
        ['irait', 'aller'],
        ['irions', 'aller'],
        ['iriez', 'aller'],
        ['iraient', 'aller'],
        ['aille', 'aller'],
        ['ailles', 'aller'],
        ['aillent', 'aller'],
        ['allé', 'aller'],
        ['allée', 'aller'],
        ['allés', 'aller'],
        ['allées', 'aller'],
        // faire
        ['fais', 'faire'],
        ['fait', 'faire'],
        ['faisons', 'faire'],
        ['faites', 'faire'],
        ['font', 'faire'],
        ['faisais', 'faire'],
        ['faisait', 'faire'],
        ['faisions', 'faire'],
        ['faisiez', 'faire'],
        ['faisaient', 'faire'],
        ['fis', 'faire'],
        ['fit', 'faire'],
        ['fîmes', 'faire'],
        ['fîtes', 'faire'],
        ['firent', 'faire'],
        ['ferai', 'faire'],
        ['feras', 'faire'],
        ['fera', 'faire'],
        ['ferons', 'faire'],
        ['ferez', 'faire'],
        ['feront', 'faire'],
        ['ferais', 'faire'],
        ['ferait', 'faire'],
        ['ferions', 'faire'],
        ['feriez', 'faire'],
        ['feraient', 'faire'],
        ['fasse', 'faire'],
        ['fasses', 'faire'],
        ['fassions', 'faire'],
        ['fassiez', 'faire'],
        ['fassent', 'faire'],
        ['faite', 'faire'],
        ['faits', 'faire'],
        // pouvoir
        ['peux', 'pouvoir'],
        ['peut', 'pouvoir'],
        ['pouvons', 'pouvoir'],
        ['pouvez', 'pouvoir'],
        ['peuvent', 'pouvoir'],
        ['pouvais', 'pouvoir'],
        ['pouvait', 'pouvoir'],
        ['pouvions', 'pouvoir'],
        ['pouviez', 'pouvoir'],
        ['pouvaient', 'pouvoir'],
        ['pus', 'pouvoir'],
        ['put', 'pouvoir'],
        ['pourrai', 'pouvoir'],
        ['pourras', 'pouvoir'],
        ['pourra', 'pouvoir'],
        ['pourrons', 'pouvoir'],
        ['pourrez', 'pouvoir'],
        ['pourront', 'pouvoir'],
        ['pourrais', 'pouvoir'],
        ['pourrait', 'pouvoir'],
        ['pourrions', 'pouvoir'],
        ['pourriez', 'pouvoir'],
        ['pourraient', 'pouvoir'],
        ['puisse', 'pouvoir'],
        ['puisses', 'pouvoir'],
        ['puissions', 'pouvoir'],
        ['puissiez', 'pouvoir'],
        ['puissent', 'pouvoir'],
        ['pu', 'pouvoir'],
        // vouloir
        ['veux', 'vouloir'],
        ['veut', 'vouloir'],
        ['voulons', 'vouloir'],
        ['voulez', 'vouloir'],
        ['veulent', 'vouloir'],
        ['voulais', 'vouloir'],
        ['voulait', 'vouloir'],
        ['voulions', 'vouloir'],
        ['vouliez', 'vouloir'],
        ['voulaient', 'vouloir'],
        ['voulus', 'vouloir'],
        ['voulut', 'vouloir'],
        ['voudrai', 'vouloir'],
        ['voudras', 'vouloir'],
        ['voudra', 'vouloir'],
        ['voudrons', 'vouloir'],
        ['voudrez', 'vouloir'],
        ['voudront', 'vouloir'],
        ['voudrais', 'vouloir'],
        ['voudrait', 'vouloir'],
        ['voudrions', 'vouloir'],
        ['voudriez', 'vouloir'],
        ['voudraient', 'vouloir'],
        ['veuille', 'vouloir'],
        ['veuilles', 'vouloir'],
        ['veuillent', 'vouloir'],
        ['voulu', 'vouloir'],
        // savoir
        ['sais', 'savoir'],
        ['sait', 'savoir'],
        ['savons', 'savoir'],
        ['savez', 'savoir'],
        ['savent', 'savoir'],
        ['savais', 'savoir'],
        ['savait', 'savoir'],
        ['savions', 'savoir'],
        ['saviez', 'savoir'],
        ['savaient', 'savoir'],
        ['sus', 'savoir'],
        ['sut', 'savoir'],
        ['saurai', 'savoir'],
        ['sauras', 'savoir'],
        ['saura', 'savoir'],
        ['saurons', 'savoir'],
        ['saurez', 'savoir'],
        ['sauront', 'savoir'],
        ['saurais', 'savoir'],
        ['saurait', 'savoir'],
        ['saurions', 'savoir'],
        ['sauriez', 'savoir'],
        ['sauraient', 'savoir'],
        ['sache', 'savoir'],
        ['saches', 'savoir'],
        ['sachions', 'savoir'],
        ['sachiez', 'savoir'],
        ['sachent', 'savoir'],
        ['su', 'savoir'],
        // voir
        ['vois', 'voir'],
        ['voit', 'voir'],
        ['voyons', 'voir'],
        ['voyez', 'voir'],
        ['voient', 'voir'],
        ['voyais', 'voir'],
        ['voyait', 'voir'],
        ['voyions', 'voir'],
        ['voyiez', 'voir'],
        ['voyaient', 'voir'],
        ['vis', 'voir'],
        ['vit', 'voir'],
        ['verrai', 'voir'],
        ['verras', 'voir'],
        ['verra', 'voir'],
        ['verrons', 'voir'],
        ['verrez', 'voir'],
        ['verront', 'voir'],
        ['verrais', 'voir'],
        ['verrait', 'voir'],
        ['verrions', 'voir'],
        ['verriez', 'voir'],
        ['verraient', 'voir'],
        ['voie', 'voir'],
        ['voies', 'voir'],
        ['vu', 'voir'],
        // venir
        ['viens', 'venir'],
        ['vient', 'venir'],
        ['venons', 'venir'],
        ['venez', 'venir'],
        ['viennent', 'venir'],
        ['venais', 'venir'],
        ['venait', 'venir'],
        ['venions', 'venir'],
        ['veniez', 'venir'],
        ['venaient', 'venir'],
        ['vins', 'venir'],
        ['vint', 'venir'],
        ['viendrai', 'venir'],
        ['viendras', 'venir'],
        ['viendra', 'venir'],
        ['viendrons', 'venir'],
        ['viendrez', 'venir'],
        ['viendront', 'venir'],
        ['viendrais', 'venir'],
        ['viendrait', 'venir'],
        ['viendrions', 'venir'],
        ['viendriez', 'venir'],
        ['viendraient', 'venir'],
        ['vienne', 'venir'],
        ['viennes', 'venir'],
        ['venu', 'venir'],
        ['venue', 'venir'],
        ['venus', 'venir'],
        ['venues', 'venir'],
        // devoir
        ['dois', 'devoir'],
        ['doit', 'devoir'],
        ['devons', 'devoir'],
        ['devez', 'devoir'],
        ['doivent', 'devoir'],
        ['devais', 'devoir'],
        ['devait', 'devoir'],
        ['devions', 'devoir'],
        ['deviez', 'devoir'],
        ['devaient', 'devoir'],
        ['dus', 'devoir'],
        ['dut', 'devoir'],
        ['devrai', 'devoir'],
        ['devras', 'devoir'],
        ['devra', 'devoir'],
        ['devrons', 'devoir'],
        ['devrez', 'devoir'],
        ['devront', 'devoir'],
        ['devrais', 'devoir'],
        ['devrait', 'devoir'],
        ['devrions', 'devoir'],
        ['devriez', 'devoir'],
        ['devraient', 'devoir'],
        ['doive', 'devoir'],
        ['doives', 'devoir'],
        ['dû', 'devoir'],
        ['due', 'devoir'],
        ['dues', 'devoir'],
        // dire
        ['dis', 'dire'],
        ['dit', 'dire'],
        ['disons', 'dire'],
        ['dites', 'dire'],
        ['disent', 'dire'],
        ['disais', 'dire'],
        ['disait', 'dire'],
        ['disions', 'dire'],
        ['disiez', 'dire'],
        ['disaient', 'dire'],
        ['dirai', 'dire'],
        ['diras', 'dire'],
        ['dira', 'dire'],
        ['dirons', 'dire'],
        ['direz', 'dire'],
        ['diront', 'dire'],
        ['dirais', 'dire'],
        ['dirait', 'dire'],
        ['dirions', 'dire'],
        ['diriez', 'dire'],
        ['diraient', 'dire'],
        ['dise', 'dire'],
        ['dises', 'dire'],
        ['dite', 'dire'],
        ['dits', 'dire'],
        // prendre
        ['prends', 'prendre'],
        ['prend', 'prendre'],
        ['prenons', 'prendre'],
        ['prenez', 'prendre'],
        ['prennent', 'prendre'],
        ['prenais', 'prendre'],
        ['prenait', 'prendre'],
        ['prenions', 'prendre'],
        ['preniez', 'prendre'],
        ['prenaient', 'prendre'],
        ['pris', 'prendre'],
        ['prit', 'prendre'],
        ['prendrai', 'prendre'],
        ['prendras', 'prendre'],
        ['prendra', 'prendre'],
        ['prendrons', 'prendre'],
        ['prendrez', 'prendre'],
        ['prendront', 'prendre'],
        ['prendrais', 'prendre'],
        ['prendrait', 'prendre'],
        ['prenne', 'prendre'],
        ['prennes', 'prendre'],
        ['prise', 'prendre'],
        ['prises', 'prendre'],
        // mettre
        ['mets', 'mettre'],
        ['met', 'mettre'],
        ['mettons', 'mettre'],
        ['mettez', 'mettre'],
        ['mettent', 'mettre'],
        ['mettais', 'mettre'],
        ['mettait', 'mettre'],
        ['mettions', 'mettre'],
        ['mettiez', 'mettre'],
        ['mettaient', 'mettre'],
        ['mis', 'mettre'],
        ['mit', 'mettre'],
        ['mettrai', 'mettre'],
        ['mettras', 'mettre'],
        ['mettra', 'mettre'],
        ['mettrons', 'mettre'],
        ['mettrez', 'mettre'],
        ['mettront', 'mettre'],
        ['mettrais', 'mettre'],
        ['mettrait', 'mettre'],
        ['mette', 'mettre'],
        ['mettes', 'mettre'],
        ['mise', 'mettre'],
        ['mises', 'mettre'],
        // donner
        ['donne', 'donner'],
        ['donnes', 'donner'],
        ['donnons', 'donner'],
        ['donnez', 'donner'],
        ['donnent', 'donner'],
        ['donnais', 'donner'],
        ['donnait', 'donner'],
        ['donnions', 'donner'],
        ['donniez', 'donner'],
        ['donnaient', 'donner'],
        ['donnai', 'donner'],
        ['donna', 'donner'],
        ['donné', 'donner'],
        ['donnée', 'donner'],
        ['donnés', 'donner'],
        ['données', 'donner'],
        // tenir
        ['tiens', 'tenir'],
        ['tient', 'tenir'],
        ['tenons', 'tenir'],
        ['tenez', 'tenir'],
        ['tiennent', 'tenir'],
        ['tenais', 'tenir'],
        ['tenait', 'tenir'],
        ['tenions', 'tenir'],
        ['teniez', 'tenir'],
        ['tenaient', 'tenir'],
        ['tins', 'tenir'],
        ['tint', 'tenir'],
        ['tiendrai', 'tenir'],
        ['tiendras', 'tenir'],
        ['tiendra', 'tenir'],
        ['tiendrons', 'tenir'],
        ['tiendrez', 'tenir'],
        ['tiendront', 'tenir'],
        ['tiendrais', 'tenir'],
        ['tiendrait', 'tenir'],
        ['tienne', 'tenir'],
        ['tiennes', 'tenir'],
        ['tenu', 'tenir'],
        ['tenue', 'tenir'],
        ['tenus', 'tenir'],
        ['tenues', 'tenir'],
        // connaître
        ['connais', 'connaître'],
        ['connaît', 'connaître'],
        ['connaissons', 'connaître'],
        ['connaissez', 'connaître'],
        ['connaissent', 'connaître'],
        ['connaissais', 'connaître'],
        ['connaissait', 'connaître'],
        ['connaissions', 'connaître'],
        ['connaissiez', 'connaître'],
        ['connaissaient', 'connaître'],
        ['connus', 'connaître'],
        ['connut', 'connaître'],
        ['connaîtrai', 'connaître'],
        ['connaîtras', 'connaître'],
        ['connaîtra', 'connaître'],
        ['connu', 'connaître'],
        ['connue', 'connaître'],
        // croire
        ['crois', 'croire'],
        ['croit', 'croire'],
        ['croyons', 'croire'],
        ['croyez', 'croire'],
        ['croient', 'croire'],
        ['croyais', 'croire'],
        ['croyait', 'croire'],
        ['croyions', 'croire'],
        ['croyiez', 'croire'],
        ['croyaient', 'croire'],
        ['crus', 'croire'],
        ['crut', 'croire'],
        ['croirai', 'croire'],
        ['croiras', 'croire'],
        ['croira', 'croire'],
        ['croie', 'croire'],
        ['croies', 'croire'],
        ['cru', 'croire'],
        ['crue', 'croire'],
        // écrire
        ['écris', 'écrire'],
        ['écrit', 'écrire'],
        ['écrivons', 'écrire'],
        ['écrivez', 'écrire'],
        ['écrivent', 'écrire'],
        ['écrivais', 'écrire'],
        ['écrivait', 'écrire'],
        ['écrirai', 'écrire'],
        ['écriras', 'écrire'],
        ['écrira', 'écrire'],
        ['écrive', 'écrire'],
        ['écrite', 'écrire'],
        ['écrits', 'écrire'],
        ['écrites', 'écrire'],
        // lire
        ['lis', 'lire'],
        ['lit', 'lire'],
        ['lisons', 'lire'],
        ['lisez', 'lire'],
        ['lisent', 'lire'],
        ['lisais', 'lire'],
        ['lisait', 'lire'],
        ['lirai', 'lire'],
        ['liras', 'lire'],
        ['lira', 'lire'],
        ['lise', 'lire'],
        ['lu', 'lire'],
        ['lue', 'lire'],
        ['lus', 'lire'],
        ['lues', 'lire'],
        // partir
        ['pars', 'partir'],
        ['part', 'partir'],
        ['partons', 'partir'],
        ['partez', 'partir'],
        ['partent', 'partir'],
        ['partais', 'partir'],
        ['partait', 'partir'],
        ['partirai', 'partir'],
        ['partiras', 'partir'],
        ['partira', 'partir'],
        ['parti', 'partir'],
        ['partie', 'partir'],
        ['partis', 'partir'],
        ['parties', 'partir'],
        // sortir
        ['sors', 'sortir'],
        ['sort', 'sortir'],
        ['sortons', 'sortir'],
        ['sortez', 'sortir'],
        ['sortent', 'sortir'],
        ['sortais', 'sortir'],
        ['sortait', 'sortir'],
        ['sorti', 'sortir'],
        ['sortie', 'sortir'],
        // vivre
        ['vis', 'vivre'],
        ['vit', 'vivre'],
        ['vivons', 'vivre'],
        ['vivez', 'vivre'],
        ['vivent', 'vivre'],
        ['vivais', 'vivre'],
        ['vivait', 'vivre'],
        ['vivrai', 'vivre'],
        ['vivras', 'vivre'],
        ['vivra', 'vivre'],
        ['vécu', 'vivre'],
        ['vécue', 'vivre'],
        // mourir
        ['meurs', 'mourir'],
        ['meurt', 'mourir'],
        ['mourons', 'mourir'],
        ['mourez', 'mourir'],
        ['meurent', 'mourir'],
        ['mourais', 'mourir'],
        ['mourrai', 'mourir'],
        ['mourras', 'mourir'],
        ['mourra', 'mourir'],
        ['mort', 'mourir'],
        ['morte', 'mourir'],
        ['morts', 'mourir'],
        ['mortes', 'mourir'],
        // naître
        ['nais', 'naître'],
        ['naît', 'naître'],
        ['naissons', 'naître'],
        ['naissez', 'naître'],
        ['naissent', 'naître'],
        ['né', 'naître'],
        ['née', 'naître'],
        ['nés', 'naître'],
        ['nées', 'naître'],
        // ouvrir
        ['ouvre', 'ouvrir'],
        ['ouvres', 'ouvrir'],
        ['ouvrons', 'ouvrir'],
        ['ouvrez', 'ouvrir'],
        ['ouvrent', 'ouvrir'],
        ['ouvert', 'ouvrir'],
        ['ouverte', 'ouvrir'],
        ['ouverts', 'ouvrir'],
        ['ouvertes', 'ouvrir'],
        // suivre
        ['suit', 'suivre'],
        ['suivons', 'suivre'],
        ['suivez', 'suivre'],
        ['suivent', 'suivre'],
        ['suivi', 'suivre'],
        ['suivie', 'suivre'],
        ['suivis', 'suivre'],
        // recevoir
        ['reçois', 'recevoir'],
        ['reçoit', 'recevoir'],
        ['recevons', 'recevoir'],
        ['recevez', 'recevoir'],
        ['reçoivent', 'recevoir'],
        ['recevais', 'recevoir'],
        ['recevait', 'recevoir'],
        ['recevrai', 'recevoir'],
        ['recevras', 'recevoir'],
        ['recevra', 'recevoir'],
        ['reçu', 'recevoir'],
        ['reçue', 'recevoir'],
        ['reçus', 'recevoir'],
        // boire
        ['bois', 'boire'],
        ['boit', 'boire'],
        ['buvons', 'boire'],
        ['buvez', 'boire'],
        ['boivent', 'boire'],
        ['buvais', 'boire'],
        ['buvait', 'boire'],
        ['bu', 'boire'],
        ['bue', 'boire'],
        ['bus', 'boire'],
        // conduire
        ['conduis', 'conduire'],
        ['conduit', 'conduire'],
        ['conduisons', 'conduire'],
        ['conduisez', 'conduire'],
        ['conduisent', 'conduire'],
        ['conduisais', 'conduire'],
        ['conduisait', 'conduire'],
        ['conduite', 'conduire'],
        ['conduits', 'conduire'],
        // plaire
        ['plais', 'plaire'],
        ['plaît', 'plaire'],
        ['plaisons', 'plaire'],
        ['plaisez', 'plaire'],
        ['plaisent', 'plaire'],
        ['plu', 'plaire'],
    ]);
    /**
     * Rule-based French lemmatizer.
     * Tries irregular lookup first, then applies suffix rules.
     * Results are cached for performance.
     */
    function lemmatizeFr(word) {
        if (!word)
            return '';
        const lower = word.toLowerCase();
        if (lemmaCacheFr.has(lower))
            return lemmaCacheFr.get(lower);
        let result = lower;
        // 1. Irregular verb lookup
        if (FR_IRREGULAR.has(lower)) {
            result = FR_IRREGULAR.get(lower);
            lemmaCacheFr.set(lower, result);
            return result;
        }
        // 2. Verb conjugation rules (try to recover infinitive)
        // -er verbs (1st group, ~80% of French verbs)
        if (/^.{3,}(erai|eras|eront|erais|erait|erions|eriez|eraient)$/.test(lower)) {
            result = lower.replace(/(erai|eras|eront|erais|erait|erions|eriez|eraient)$/, 'er');
        }
        else if (/^.{2,}(ons|ez)$/.test(lower) && lower.endsWith('ons')) {
            // -ons ending: could be 1st group (mangeons→manger) — heuristic
            result = lower.replace(/eons$/, 'er').replace(/ons$/, 'er');
        }
        else if (/^.{2,}(ent)$/.test(lower) && !lower.endsWith('ment')) {
            // -ent ending: 3rd person plural (mangent→manger, finissent→finir)
            if (lower.endsWith('issent')) {
                result = lower.replace(/issent$/, 'ir');
            }
            else {
                result = lower.replace(/ent$/, 'er');
            }
        }
        else if (/^.{2,}(ais|ait|aient)$/.test(lower)) {
            // Imperfect: -ais, -ait, -aient → try -er
            if (lower.endsWith('issais') ||
                lower.endsWith('issait') ||
                lower.endsWith('issaient')) {
                result = lower.replace(/iss(ais|ait|aient)$/, 'ir');
            }
            else {
                result = lower.replace(/(ais|ait|aient)$/, 'er');
            }
        }
        else if (/^.{2,}(ions|iez)$/.test(lower)) {
            // -ions, -iez (imperfect/subjunctive)
            if (lower.endsWith('issions') || lower.endsWith('issiez')) {
                result = lower.replace(/iss(ions|iez)$/, 'ir');
            }
            else {
                result = lower.replace(/(ions|iez)$/, 'er');
            }
        }
        // Past participles
        else if (/^.{2,}ée$/.test(lower)) {
            result = lower.replace(/ée$/, 'er');
        }
        else if (/^.{2,}és$/.test(lower)) {
            result = lower.replace(/és$/, 'er');
        }
        else if (/^.{2,}ées$/.test(lower)) {
            result = lower.replace(/ées$/, 'er');
        }
        // -ir verbs (2nd group): present tense -is, -it, -issons, -issez
        else if (/^.{2,}issons$/.test(lower)) {
            result = lower.replace(/issons$/, 'ir');
        }
        else if (/^.{2,}issez$/.test(lower)) {
            result = lower.replace(/issez$/, 'ir');
        }
        // Noun/adjective rules
        else if (/^.{2,}aux$/.test(lower)) {
            // -aux → -al (journaux→journal, animaux→animal)
            result = lower.replace(/aux$/, 'al');
        }
        else if (/^.{2,}eaux$/.test(lower)) {
            // -eaux → -eau (châteaux→château)
            result = lower.replace(/eaux$/, 'eau');
        }
        else if (/^.{3,}euse$/.test(lower)) {
            // -euse → -eur (chanteuse→chanteur)
            result = lower.replace(/euse$/, 'eur');
        }
        else if (/^.{3,}euses$/.test(lower)) {
            result = lower.replace(/euses$/, 'eur');
        }
        else if (/^.{3,}trice$/.test(lower)) {
            // -trice → -teur (actrice→acteur)
            result = lower.replace(/trice$/, 'teur');
        }
        else if (/^.{3,}trices$/.test(lower)) {
            result = lower.replace(/trices$/, 'teur');
        }
        else if (/^.{3,}ive$/.test(lower)) {
            // -ive → -if (sportive→sportif)
            result = lower.replace(/ive$/, 'if');
        }
        else if (/^.{3,}ives$/.test(lower)) {
            result = lower.replace(/ives$/, 'if');
        }
        // Generic plural: -s (most common)
        else if (/^.{2,}s$/.test(lower) && !lower.endsWith('ss')) {
            result = lower.replace(/s$/, '');
        }
        lemmaCacheFr.set(lower, result);
        return result;
    }

    // ============================================================
    // Spanish lemmatization — rule-based with irregular verb table
    // ============================================================
    const lemmaCacheEs = new Map();
    /**
     * Common irregular Spanish verbs: conjugated form → infinitive.
     * Covers the most frequent irregular verbs (ser, estar, haber, tener, ir, hacer, etc.)
     */
    const ES_IRREGULAR = new Map([
        // ser
        ['soy', 'ser'],
        ['eres', 'ser'],
        ['es', 'ser'],
        ['somos', 'ser'],
        ['sois', 'ser'],
        ['son', 'ser'],
        ['era', 'ser'],
        ['eras', 'ser'],
        ['éramos', 'ser'],
        ['erais', 'ser'],
        ['eran', 'ser'],
        ['fui', 'ser'],
        ['fuiste', 'ser'],
        ['fue', 'ser'],
        ['fuimos', 'ser'],
        ['fuisteis', 'ser'],
        ['fueron', 'ser'],
        ['seré', 'ser'],
        ['serás', 'ser'],
        ['será', 'ser'],
        ['seremos', 'ser'],
        ['seréis', 'ser'],
        ['serán', 'ser'],
        ['sería', 'ser'],
        ['serías', 'ser'],
        ['seríamos', 'ser'],
        ['seríais', 'ser'],
        ['serían', 'ser'],
        ['sea', 'ser'],
        ['seas', 'ser'],
        ['seamos', 'ser'],
        ['seáis', 'ser'],
        ['sean', 'ser'],
        ['sido', 'ser'],
        // estar
        ['estoy', 'estar'],
        ['estás', 'estar'],
        ['está', 'estar'],
        ['estamos', 'estar'],
        ['estáis', 'estar'],
        ['están', 'estar'],
        ['estaba', 'estar'],
        ['estabas', 'estar'],
        ['estábamos', 'estar'],
        ['estabais', 'estar'],
        ['estaban', 'estar'],
        ['estuve', 'estar'],
        ['estuviste', 'estar'],
        ['estuvo', 'estar'],
        ['estuvimos', 'estar'],
        ['estuvisteis', 'estar'],
        ['estuvieron', 'estar'],
        ['estaré', 'estar'],
        ['estarás', 'estar'],
        ['estará', 'estar'],
        ['estaremos', 'estar'],
        ['estaréis', 'estar'],
        ['estarán', 'estar'],
        ['estaría', 'estar'],
        ['estarías', 'estar'],
        ['estaríamos', 'estar'],
        ['estarían', 'estar'],
        ['esté', 'estar'],
        ['estés', 'estar'],
        ['estemos', 'estar'],
        ['estén', 'estar'],
        ['estado', 'estar'],
        // haber
        ['he', 'haber'],
        ['has', 'haber'],
        ['ha', 'haber'],
        ['hay', 'haber'],
        ['hemos', 'haber'],
        ['habéis', 'haber'],
        ['han', 'haber'],
        ['había', 'haber'],
        ['habías', 'haber'],
        ['habíamos', 'haber'],
        ['habían', 'haber'],
        ['hube', 'haber'],
        ['hubiste', 'haber'],
        ['hubo', 'haber'],
        ['hubimos', 'haber'],
        ['hubieron', 'haber'],
        ['habré', 'haber'],
        ['habrás', 'haber'],
        ['habrá', 'haber'],
        ['habremos', 'haber'],
        ['habrán', 'haber'],
        ['habría', 'haber'],
        ['habrías', 'haber'],
        ['habríamos', 'haber'],
        ['habrían', 'haber'],
        ['haya', 'haber'],
        ['hayas', 'haber'],
        ['hayamos', 'haber'],
        ['hayan', 'haber'],
        ['habido', 'haber'],
        // tener
        ['tengo', 'tener'],
        ['tienes', 'tener'],
        ['tiene', 'tener'],
        ['tenemos', 'tener'],
        ['tenéis', 'tener'],
        ['tienen', 'tener'],
        ['tenía', 'tener'],
        ['tenías', 'tener'],
        ['teníamos', 'tener'],
        ['tenían', 'tener'],
        ['tuve', 'tener'],
        ['tuviste', 'tener'],
        ['tuvo', 'tener'],
        ['tuvimos', 'tener'],
        ['tuvieron', 'tener'],
        ['tendré', 'tener'],
        ['tendrás', 'tener'],
        ['tendrá', 'tener'],
        ['tendremos', 'tener'],
        ['tendrán', 'tener'],
        ['tendría', 'tener'],
        ['tendrías', 'tener'],
        ['tendríamos', 'tener'],
        ['tendrían', 'tener'],
        ['tenga', 'tener'],
        ['tengas', 'tener'],
        ['tengamos', 'tener'],
        ['tengan', 'tener'],
        ['tenido', 'tener'],
        // ir
        ['voy', 'ir'],
        ['vas', 'ir'],
        ['va', 'ir'],
        ['vamos', 'ir'],
        ['vais', 'ir'],
        ['van', 'ir'],
        ['iba', 'ir'],
        ['ibas', 'ir'],
        ['íbamos', 'ir'],
        ['ibais', 'ir'],
        ['iban', 'ir'],
        ['iré', 'ir'],
        ['irás', 'ir'],
        ['irá', 'ir'],
        ['iremos', 'ir'],
        ['iréis', 'ir'],
        ['irán', 'ir'],
        ['iría', 'ir'],
        ['irías', 'ir'],
        ['iríamos', 'ir'],
        ['irían', 'ir'],
        ['vaya', 'ir'],
        ['vayas', 'ir'],
        ['vayamos', 'ir'],
        ['vayan', 'ir'],
        ['ido', 'ir'],
        ['yendo', 'ir'],
        // hacer
        ['hago', 'hacer'],
        ['haces', 'hacer'],
        ['hace', 'hacer'],
        ['hacemos', 'hacer'],
        ['hacéis', 'hacer'],
        ['hacen', 'hacer'],
        ['hacía', 'hacer'],
        ['hacías', 'hacer'],
        ['hacíamos', 'hacer'],
        ['hacían', 'hacer'],
        ['hice', 'hacer'],
        ['hiciste', 'hacer'],
        ['hizo', 'hacer'],
        ['hicimos', 'hacer'],
        ['hicieron', 'hacer'],
        ['haré', 'hacer'],
        ['harás', 'hacer'],
        ['hará', 'hacer'],
        ['haremos', 'hacer'],
        ['harán', 'hacer'],
        ['haría', 'hacer'],
        ['harías', 'hacer'],
        ['haríamos', 'hacer'],
        ['harían', 'hacer'],
        ['haga', 'hacer'],
        ['hagas', 'hacer'],
        ['hagamos', 'hacer'],
        ['hagan', 'hacer'],
        ['hecho', 'hacer'],
        ['haciendo', 'hacer'],
        // poder
        ['puedo', 'poder'],
        ['puedes', 'poder'],
        ['puede', 'poder'],
        ['podemos', 'poder'],
        ['podéis', 'poder'],
        ['pueden', 'poder'],
        ['podía', 'poder'],
        ['podías', 'poder'],
        ['podíamos', 'poder'],
        ['podían', 'poder'],
        ['pude', 'poder'],
        ['pudiste', 'poder'],
        ['pudo', 'poder'],
        ['pudimos', 'poder'],
        ['pudieron', 'poder'],
        ['podré', 'poder'],
        ['podrás', 'poder'],
        ['podrá', 'poder'],
        ['podremos', 'poder'],
        ['podrán', 'poder'],
        ['podría', 'poder'],
        ['podrías', 'poder'],
        ['podríamos', 'poder'],
        ['podrían', 'poder'],
        ['pueda', 'poder'],
        ['puedas', 'poder'],
        ['podamos', 'poder'],
        ['puedan', 'poder'],
        ['podido', 'poder'],
        ['pudiendo', 'poder'],
        // querer
        ['quiero', 'querer'],
        ['quieres', 'querer'],
        ['quiere', 'querer'],
        ['queremos', 'querer'],
        ['queréis', 'querer'],
        ['quieren', 'querer'],
        ['quería', 'querer'],
        ['querías', 'querer'],
        ['queríamos', 'querer'],
        ['querían', 'querer'],
        ['quise', 'querer'],
        ['quisiste', 'querer'],
        ['quiso', 'querer'],
        ['quisimos', 'querer'],
        ['quisieron', 'querer'],
        ['querré', 'querer'],
        ['querrás', 'querer'],
        ['querrá', 'querer'],
        ['querremos', 'querer'],
        ['querrán', 'querer'],
        ['querría', 'querer'],
        ['querrías', 'querer'],
        ['querríamos', 'querer'],
        ['querrían', 'querer'],
        ['quiera', 'querer'],
        ['quieras', 'querer'],
        ['queramos', 'querer'],
        ['quieran', 'querer'],
        ['querido', 'querer'],
        // decir
        ['digo', 'decir'],
        ['dices', 'decir'],
        ['dice', 'decir'],
        ['decimos', 'decir'],
        ['decís', 'decir'],
        ['dicen', 'decir'],
        ['decía', 'decir'],
        ['decías', 'decir'],
        ['decíamos', 'decir'],
        ['decían', 'decir'],
        ['dije', 'decir'],
        ['dijiste', 'decir'],
        ['dijo', 'decir'],
        ['dijimos', 'decir'],
        ['dijeron', 'decir'],
        ['diré', 'decir'],
        ['dirás', 'decir'],
        ['dirá', 'decir'],
        ['diremos', 'decir'],
        ['dirán', 'decir'],
        ['diría', 'decir'],
        ['dirías', 'decir'],
        ['diríamos', 'decir'],
        ['dirían', 'decir'],
        ['diga', 'decir'],
        ['digas', 'decir'],
        ['digamos', 'decir'],
        ['digan', 'decir'],
        ['dicho', 'decir'],
        ['diciendo', 'decir'],
        // saber
        ['sé', 'saber'],
        ['sabes', 'saber'],
        ['sabe', 'saber'],
        ['sabemos', 'saber'],
        ['sabéis', 'saber'],
        ['saben', 'saber'],
        ['sabía', 'saber'],
        ['sabías', 'saber'],
        ['sabíamos', 'saber'],
        ['sabían', 'saber'],
        ['supe', 'saber'],
        ['supiste', 'saber'],
        ['supo', 'saber'],
        ['supimos', 'saber'],
        ['supieron', 'saber'],
        ['sabré', 'saber'],
        ['sabrás', 'saber'],
        ['sabrá', 'saber'],
        ['sabremos', 'saber'],
        ['sabrán', 'saber'],
        ['sabría', 'saber'],
        ['sabrías', 'saber'],
        ['sabríamos', 'saber'],
        ['sabrían', 'saber'],
        ['sepa', 'saber'],
        ['sepas', 'saber'],
        ['sepamos', 'saber'],
        ['sepan', 'saber'],
        ['sabido', 'saber'],
        // venir
        ['vengo', 'venir'],
        ['vienes', 'venir'],
        ['viene', 'venir'],
        ['venimos', 'venir'],
        ['venís', 'venir'],
        ['vienen', 'venir'],
        ['venía', 'venir'],
        ['venías', 'venir'],
        ['veníamos', 'venir'],
        ['venían', 'venir'],
        ['vine', 'venir'],
        ['viniste', 'venir'],
        ['vino', 'venir'],
        ['vinimos', 'venir'],
        ['vinieron', 'venir'],
        ['vendré', 'venir'],
        ['vendrás', 'venir'],
        ['vendrá', 'venir'],
        ['vendremos', 'venir'],
        ['vendrán', 'venir'],
        ['vendría', 'venir'],
        ['vendrías', 'venir'],
        ['vendríamos', 'venir'],
        ['vendrían', 'venir'],
        ['venga', 'venir'],
        ['vengas', 'venir'],
        ['vengamos', 'venir'],
        ['vengan', 'venir'],
        ['venido', 'venir'],
        ['viniendo', 'venir'],
        // poner
        ['pongo', 'poner'],
        ['pones', 'poner'],
        ['pone', 'poner'],
        ['ponemos', 'poner'],
        ['ponéis', 'poner'],
        ['ponen', 'poner'],
        ['ponía', 'poner'],
        ['ponías', 'poner'],
        ['poníamos', 'poner'],
        ['ponían', 'poner'],
        ['puse', 'poner'],
        ['pusiste', 'poner'],
        ['puso', 'poner'],
        ['pusimos', 'poner'],
        ['pusieron', 'poner'],
        ['pondré', 'poner'],
        ['pondrás', 'poner'],
        ['pondrá', 'poner'],
        ['pondremos', 'poner'],
        ['pondrán', 'poner'],
        ['pondría', 'poner'],
        ['pondrías', 'poner'],
        ['pondríamos', 'poner'],
        ['pondrían', 'poner'],
        ['ponga', 'poner'],
        ['pongas', 'poner'],
        ['pongamos', 'poner'],
        ['pongan', 'poner'],
        ['puesto', 'poner'],
        ['poniendo', 'poner'],
        // salir
        ['salgo', 'salir'],
        ['sales', 'salir'],
        ['sale', 'salir'],
        ['salimos', 'salir'],
        ['salís', 'salir'],
        ['salen', 'salir'],
        ['salía', 'salir'],
        ['salías', 'salir'],
        ['salíamos', 'salir'],
        ['salían', 'salir'],
        ['salí', 'salir'],
        ['saliste', 'salir'],
        ['salió', 'salir'],
        ['salieron', 'salir'],
        ['saldré', 'salir'],
        ['saldrás', 'salir'],
        ['saldrá', 'salir'],
        ['saldremos', 'salir'],
        ['saldrán', 'salir'],
        ['saldría', 'salir'],
        ['saldrías', 'salir'],
        ['saldríamos', 'salir'],
        ['saldrían', 'salir'],
        ['salga', 'salir'],
        ['salgas', 'salir'],
        ['salgamos', 'salir'],
        ['salgan', 'salir'],
        ['salido', 'salir'],
        // dar
        ['doy', 'dar'],
        ['das', 'dar'],
        ['da', 'dar'],
        ['damos', 'dar'],
        ['dais', 'dar'],
        ['dan', 'dar'],
        ['daba', 'dar'],
        ['dabas', 'dar'],
        ['dábamos', 'dar'],
        ['daban', 'dar'],
        ['di', 'dar'],
        ['diste', 'dar'],
        ['dio', 'dar'],
        ['dimos', 'dar'],
        ['dieron', 'dar'],
        ['daré', 'dar'],
        ['darás', 'dar'],
        ['dará', 'dar'],
        ['daremos', 'dar'],
        ['darán', 'dar'],
        ['daría', 'dar'],
        ['darías', 'dar'],
        ['daríamos', 'dar'],
        ['darían', 'dar'],
        ['dé', 'dar'],
        ['des', 'dar'],
        ['demos', 'dar'],
        ['den', 'dar'],
        ['dado', 'dar'],
        ['dando', 'dar'],
        // ver
        ['veo', 'ver'],
        ['ves', 'ver'],
        ['ve', 'ver'],
        ['vemos', 'ver'],
        ['veis', 'ver'],
        ['ven', 'ver'],
        ['veía', 'ver'],
        ['veías', 'ver'],
        ['veíamos', 'ver'],
        ['veían', 'ver'],
        ['vi', 'ver'],
        ['viste', 'ver'],
        ['vio', 'ver'],
        ['vimos', 'ver'],
        ['vieron', 'ver'],
        ['veré', 'ver'],
        ['verás', 'ver'],
        ['verá', 'ver'],
        ['veremos', 'ver'],
        ['verán', 'ver'],
        ['vería', 'ver'],
        ['verías', 'ver'],
        ['veríamos', 'ver'],
        ['verían', 'ver'],
        ['vea', 'ver'],
        ['veas', 'ver'],
        ['veamos', 'ver'],
        ['vean', 'ver'],
        ['visto', 'ver'],
        ['viendo', 'ver'],
        // conocer
        ['conozco', 'conocer'],
        // conducir
        ['conduzco', 'conducir'],
        ['conduje', 'conducir'],
        ['condujo', 'conducir'],
        ['condujimos', 'conducir'],
        ['condujeron', 'conducir'],
        // traer
        ['traigo', 'traer'],
        ['traje', 'traer'],
        ['trajiste', 'traer'],
        ['trajo', 'traer'],
        ['trajimos', 'traer'],
        ['trajeron', 'traer'],
        ['traído', 'traer'],
        ['trayendo', 'traer'],
        // oír
        ['oigo', 'oír'],
        ['oyes', 'oír'],
        ['oye', 'oír'],
        ['oímos', 'oír'],
        ['oyen', 'oír'],
        ['oí', 'oír'],
        ['oyó', 'oír'],
        ['oyeron', 'oír'],
        ['oído', 'oír'],
        ['oyendo', 'oír'],
        // caer
        ['caigo', 'caer'],
        ['caí', 'caer'],
        ['cayó', 'caer'],
        ['cayeron', 'caer'],
        ['caído', 'caer'],
        ['cayendo', 'caer'],
    ]);
    /**
     * Rule-based Spanish lemmatizer.
     * Tries irregular lookup first, then applies suffix rules.
     * Results are cached for performance.
     */
    function lemmatizeEs(word) {
        if (!word)
            return '';
        const lower = word.toLowerCase();
        if (lemmaCacheEs.has(lower))
            return lemmaCacheEs.get(lower);
        let result = lower;
        // 1. Irregular verb lookup
        if (ES_IRREGULAR.has(lower)) {
            result = ES_IRREGULAR.get(lower);
            lemmaCacheEs.set(lower, result);
            return result;
        }
        // 2. Verb conjugation rules — try to recover infinitive
        // Gerunds: -ando → -ar, -iendo → -er/-ir (try -er first since it's more common in CEFR lists)
        if (/^.{2,}ando$/.test(lower)) {
            result = lower.replace(/ando$/, 'ar');
        }
        else if (/^.{2,}iendo$/.test(lower)) {
            result = lower.replace(/iendo$/, 'er');
        }
        // Past participles: -ado → -ar, -ido → -er/-ir
        else if (/^.{2,}ado$/.test(lower)) {
            result = lower.replace(/ado$/, 'ar');
        }
        else if (/^.{2,}ados$/.test(lower)) {
            result = lower.replace(/ados$/, 'ar');
        }
        else if (/^.{2,}ada$/.test(lower)) {
            result = lower.replace(/ada$/, 'ar');
        }
        else if (/^.{2,}adas$/.test(lower)) {
            result = lower.replace(/adas$/, 'ar');
        }
        else if (/^.{2,}ido$/.test(lower)) {
            result = lower.replace(/ido$/, 'er');
        }
        else if (/^.{2,}idos$/.test(lower)) {
            result = lower.replace(/idos$/, 'er');
        }
        else if (/^.{2,}ida$/.test(lower)) {
            result = lower.replace(/ida$/, 'er');
        }
        else if (/^.{2,}idas$/.test(lower)) {
            result = lower.replace(/idas$/, 'er');
        }
        // Future tense: -aré/-arás/-ará/-aremos/-aréis/-arán
        else if (/^.{2,}(aré|arás|ará|aremos|aréis|arán)$/.test(lower)) {
            result = lower.replace(/(aré|arás|ará|aremos|aréis|arán)$/, 'ar');
        }
        // Future: -eré/-erás/-erá/-eremos/-eréis/-erán
        else if (/^.{2,}(eré|erás|erá|eremos|eréis|erán)$/.test(lower)) {
            result = lower.replace(/(eré|erás|erá|eremos|eréis|erán)$/, 'er');
        }
        // Future: -iré/-irás/-irá/-iremos/-iréis/-irán
        else if (/^.{2,}(iré|irás|irá|iremos|iréis|irán)$/.test(lower)) {
            result = lower.replace(/(iré|irás|irá|iremos|iréis|irán)$/, 'ir');
        }
        // Conditional: -aría/-arías/-aríamos/-aríais/-arían
        else if (/^.{2,}(aría|arías|aríamos|aríais|arían)$/.test(lower)) {
            result = lower.replace(/(aría|arías|aríamos|aríais|arían)$/, 'ar');
        }
        // Conditional: -ería/-erías/-eríamos/-eríais/-erían
        else if (/^.{2,}(ería|erías|eríamos|eríais|erían)$/.test(lower)) {
            result = lower.replace(/(ería|erías|eríamos|eríais|erían)$/, 'er');
        }
        // Conditional: -iría/-irías/-iríamos/-iríais/-irían
        else if (/^.{2,}(iría|irías|iríamos|iríais|irían)$/.test(lower)) {
            result = lower.replace(/(iría|irías|iríamos|iríais|irían)$/, 'ir');
        }
        // Imperfect -ar: -aba/-abas/-ábamos/-abais/-aban
        else if (/^.{2,}(aba|abas|ábamos|abais|aban)$/.test(lower)) {
            result = lower.replace(/(aba|abas|ábamos|abais|aban)$/, 'ar');
        }
        // Imperfect -er/-ir: -ía/-ías/-íamos/-íais/-ían
        else if (/^.{2,}(íamos|íais)$/.test(lower)) {
            result = lower.replace(/(íamos|íais)$/, 'er');
        }
        // Present -ar: -amos/-áis/-an (but not words ending in -an that aren't verbs)
        else if (/^.{3,}amos$/.test(lower)) {
            result = lower.replace(/amos$/, 'ar');
        }
        else if (/^.{3,}áis$/.test(lower)) {
            result = lower.replace(/áis$/, 'ar');
        }
        // Present -er: -emos/-éis
        else if (/^.{3,}emos$/.test(lower)) {
            result = lower.replace(/emos$/, 'er');
        }
        else if (/^.{3,}éis$/.test(lower)) {
            result = lower.replace(/éis$/, 'er');
        }
        // Present -ir: -imos/-ís
        else if (/^.{3,}imos$/.test(lower)) {
            result = lower.replace(/imos$/, 'ir');
        }
        // 3rd person plural present: -an → -ar, -en → -er
        else if (/^.{3,}an$/.test(lower) && !lower.endsWith('ían')) {
            result = lower.replace(/an$/, 'ar');
        }
        else if (/^.{3,}en$/.test(lower) && !lower.endsWith('ien')) {
            result = lower.replace(/en$/, 'er');
        }
        // 3. Noun/adjective rules
        // Plural: -ces → -z (lápices → lápiz)
        else if (/^.{3,}ces$/.test(lower)) {
            result = lower.replace(/ces$/, 'z');
        }
        // Plural: -es (after consonant)
        else if (/^.{3,}[^aeiouáéíóú]es$/.test(lower)) {
            result = lower.replace(/es$/, '');
        }
        // Generic plural: -s (most common)
        else if (/^.{3,}s$/.test(lower) && !lower.endsWith('ss')) {
            result = lower.replace(/s$/, '');
        }
        lemmaCacheEs.set(lower, result);
        return result;
    }

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
     * For French/Spanish, falls back to word-by-word processing (no POS context).
     */
    function lemmatizeSentence(text) {
        if (currentLanguage === 'en') {
            return lemmatizeSentenceEn(text);
        }
        // Fallback for French/Spanish: word-by-word with their rule-based lemmatizers
        const tokens = text.match(/\p{L}+|[^\p{L}]+/gu) || [];
        const lemmatizer = currentLanguage === 'fr' ? lemmatizeFr : lemmatizeEs;
        return tokens.map((t) => {
            const isWord = /\p{L}/u.test(t);
            return {
                text: t,
                lemma: isWord ? lemmatizer(t) : t,
                pos: 'Other',
                isWord,
            };
        });
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
        if (currentLanguage === 'fr')
            return lemmatizeFr(word);
        if (currentLanguage === 'es')
            return lemmatizeEs(word);
        return lemmatizeEn(word);
    }

    // ============================================================
    // DOM highlighting — tree walking, node processing, chunked rendering
    // ============================================================
    const CHUNK_SIZE = 50; // Text nodes processed per animation frame
    // Skip numbers, ordinals, single-letter words, and non-applicable scripts per language
    function shouldSkipWord(word) {
        if (/^[\d.,]+$|^\d+(st|nd|rd|th|er|ère|ème|[ºª])$/i.test(word))
            return true;
        if (word.length <= 1)
            return true;
        if (currentLanguage === 'en' && !/^[a-zA-Z]+$/.test(word))
            return true;
        if ((currentLanguage === 'fr' || currentLanguage === 'es') &&
            !/^[a-zA-ZÀ-ÖØ-öø-ÿ]+$/.test(word))
            return true;
        return false;
    }
    /**
     * Remove all previously applied highlights, restoring original text nodes.
     */
    function removeHighlights(root) {
        const vocab = root.querySelectorAll('.' + VOCAB_CLASS);
        const unknown = root.querySelectorAll('.' + UNKNOWN_CLASS);
        const learning = root.querySelectorAll('.' + LEARNING_CLASS);
        [...vocab, ...unknown, ...learning].forEach((span) => {
            const text = document.createTextNode(span.textContent || '');
            span.parentNode?.replaceChild(text, span);
        });
        if (root instanceof Element) {
            root.normalize(); // merge adjacent text nodes
        }
        else {
            root.body?.normalize();
        }
        // Reset page stats for full re-highlight
        pageUnfamiliarLemmas.clear();
        pageLearningLemmas.clear();
        pageFamiliarLemmas.clear();
    }
    // Block-level tags for finding immediate context
    const BLOCK_TAGS = new Set([
        'P',
        'DIV',
        'LI',
        'TD',
        'TH',
        'ARTICLE',
        'SECTION',
        'BLOCKQUOTE',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
    ]);
    /**
     * Find the nearest block-level ancestor (p, div, li, etc.) for immediate processing.
     */
    function findBlockAncestor(node) {
        let current = node.parentElement;
        while (current && current !== document.body) {
            if (BLOCK_TAGS.has(current.tagName)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }
    /**
     * Collect text nodes from `root` that need highlighting.
     */
    function collectTextNodes(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (parent &&
                    (parent.classList.contains(VOCAB_CLASS) ||
                        parent.classList.contains(UNKNOWN_CLASS) ||
                        parent.classList.contains(LEARNING_CLASS))) {
                    return NodeFilter.FILTER_REJECT;
                }
                const tag = parent?.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }
        return textNodes;
    }
    /**
     * Collect text nodes from root, excluding nodes inside a specific element.
     */
    function collectTextNodesExcluding(root, exclude) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                // Skip if inside excluded element
                if (exclude && exclude.contains(node)) {
                    return NodeFilter.FILTER_REJECT;
                }
                const parent = node.parentElement;
                if (parent &&
                    (parent.classList.contains(VOCAB_CLASS) ||
                        parent.classList.contains(UNKNOWN_CLASS) ||
                        parent.classList.contains(LEARNING_CLASS))) {
                    return NodeFilter.FILTER_REJECT;
                }
                const tag = parent?.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }
        return textNodes;
    }
    /**
     * Classify a lemma based on word sets.
     */
    function classifyLemma(lemma) {
        if (baseWordSet.has(lemma))
            return 'familiar';
        if (learningWordSet.has(lemma))
            return 'learning';
        if (COMMON_WORDS.has(lemma))
            return 'common';
        return 'unknown';
    }
    /**
     * Create a highlighted span for a word.
     */
    function createWordSpan(text, lemma, wordClass) {
        const span = document.createElement('span');
        span.textContent = text;
        span.dataset.lemma = lemma;
        switch (wordClass) {
            case 'familiar':
                span.className = VOCAB_CLASS;
                break;
            case 'learning':
                span.className = LEARNING_CLASS;
                span.style.backgroundColor = '#fff3e0';
                span.style.color = '#e65100';
                span.style.cursor = 'pointer';
                break;
            case 'unknown':
                span.className = UNKNOWN_CLASS;
                span.style.backgroundColor = '#f0e6ff';
                span.style.color = '#5e35b1';
                span.style.cursor = 'pointer';
                break;
        }
        return span;
    }
    /**
     * Track a lemma in page statistics.
     */
    function trackLemma(lemma, wordClass) {
        switch (wordClass) {
            case 'familiar':
                pageFamiliarLemmas.add(lemma);
                break;
            case 'learning':
                pageLearningLemmas.add(lemma);
                break;
            case 'unknown':
                pageUnfamiliarLemmas.add(lemma);
                break;
        }
    }
    /**
     * Process a single text node using sentence-level POS tagging.
     * Splits into tokens with context-aware lemmatization, then classifies and wraps in spans.
     */
    function processTextNode(textNode) {
        const text = textNode.textContent;
        if (!text?.trim())
            return;
        const terms = lemmatizeSentence(text);
        const fragment = document.createDocumentFragment();
        for (const term of terms) {
            // Non-word tokens and skipped words → plain text
            if (!term.isWord || shouldSkipWord(term.text)) {
                fragment.appendChild(document.createTextNode(term.text));
                continue;
            }
            const wordClass = classifyLemma(term.lemma);
            // Common words → plain text (no highlight)
            if (wordClass === 'common') {
                fragment.appendChild(document.createTextNode(term.text));
                continue;
            }
            // Familiar, learning, unknown → highlighted span
            const span = createWordSpan(term.text, term.lemma, wordClass);
            fragment.appendChild(span);
            trackLemma(term.lemma, wordClass);
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
    }
    /**
     * Walk all text nodes in `root` and highlight words.
     * Processes in chunks of CHUNK_SIZE nodes per animation frame to avoid blocking.
     */
    function highlightWords(root) {
        const textNodes = collectTextNodes(root);
        if (textNodes.length === 0)
            return;
        let i = 0;
        function processChunk() {
            const end = Math.min(i + CHUNK_SIZE, textNodes.length);
            while (i < end) {
                // Node may have been detached by a previous chunk — skip if so
                if (textNodes[i].parentNode) {
                    processTextNode(textNodes[i]);
                }
                i++;
            }
            if (i < textNodes.length) {
                requestAnimationFrame(processChunk);
            }
        }
        requestAnimationFrame(processChunk);
    }
    /**
     * Remove old highlights, then re-apply with current word sets.
     */
    function refreshHighlighting() {
        removeHighlights(document.body);
        highlightWords(document.body);
    }
    /**
     * Wrap occurrences of a lemma in a single text node as learning spans.
     */
    function wrapLemmaInTextNode(textNode, targetLemma) {
        const text = textNode.textContent;
        if (!text?.trim())
            return;
        const terms = lemmatizeSentence(text);
        // Quick check: does this node contain the target word?
        const hasTarget = terms.some((t) => t.isWord && !shouldSkipWord(t.text) && t.lemma === targetLemma);
        if (!hasTarget)
            return;
        const fragment = document.createDocumentFragment();
        for (const term of terms) {
            if (term.isWord &&
                !shouldSkipWord(term.text) &&
                term.lemma === targetLemma) {
                const span = createWordSpan(term.text, term.lemma, 'learning');
                fragment.appendChild(span);
                trackLemma(term.lemma, 'learning');
            }
            else {
                fragment.appendChild(document.createTextNode(term.text));
            }
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
    }
    /**
     * Process text nodes in background chunks using requestIdleCallback.
     * Falls back to setTimeout for browsers without requestIdleCallback.
     */
    function processNodesInBackground(nodes, targetLemma, chunkSize = 20) {
        let index = 0;
        const scheduleNext = typeof requestIdleCallback !== 'undefined'
            ? (cb) => requestIdleCallback(cb, { timeout: 100 })
            : (cb) => setTimeout(cb, 0);
        function processChunk() {
            const end = Math.min(index + chunkSize, nodes.length);
            while (index < end) {
                const textNode = nodes[index];
                // Node may have been removed or replaced since collection
                if (textNode.parentNode) {
                    wrapLemmaInTextNode(textNode, targetLemma);
                }
                index++;
            }
            if (index < nodes.length) {
                scheduleNext(processChunk);
            }
        }
        if (nodes.length > 0) {
            scheduleNext(processChunk);
        }
    }
    /**
     * Walk text nodes in `root` and wrap occurrences of a specific lemma
     * as learning spans. Prioritizes the local block containing the interaction,
     * then processes the rest of the page in background chunks to avoid freezing.
     */
    function wrapWordInTextNodes(root, targetLemma, immediateContext) {
        // Step 1: Find and immediately process the local block
        const localBlock = immediateContext
            ? findBlockAncestor(immediateContext)
            : null;
        if (localBlock) {
            const localNodes = collectTextNodes(localBlock);
            for (const textNode of localNodes) {
                wrapLemmaInTextNode(textNode, targetLemma);
            }
        }
        // Step 2: Process remaining nodes in background
        const remainingNodes = collectTextNodesExcluding(root, localBlock);
        processNodesInBackground(remainingNodes, targetLemma);
    }

    // ============================================================
    // Click interactions and word state transitions
    // ============================================================
    /**
     * Add an unknown word to the learning list.
     * Provides immediate UI feedback before storage completes.
     */
    function addWordAsLearning(lemma) {
        // Immediate visual feedback
        learningWordSet.add(lemma);
        // Update all instances of this lemma on the page
        const allUnknown = document.querySelectorAll('.' + UNKNOWN_CLASS);
        allUnknown.forEach((span) => {
            if (span.dataset.lemma === lemma) {
                span.className = LEARNING_CLASS;
                span.style.backgroundColor = '#fff3e0';
                span.style.color = '#e65100';
                span.style.cursor = 'pointer';
            }
        });
        setLastLocalUpdate(Date.now());
        const key = getWordsKey();
        chrome.storage.local.get({ [key]: [] }, (data) => {
            const words = data[key];
            const exists = words.some((entry) => entry.word.toLowerCase() === lemma);
            if (exists)
                return;
            const newWord = { word: lemma, status: 'learning' };
            const updatedWords = [newWord, ...words];
            chrome.storage.local.set({ [key]: updatedWords });
        });
    }
    /**
     * Promote a learning word to familiar.
     * Provides immediate UI feedback before storage completes.
     */
    function promoteToFamiliar(lemma) {
        // Immediate visual feedback
        learningWordSet.delete(lemma);
        baseWordSet.add(lemma);
        const allLearning = document.querySelectorAll('.' + LEARNING_CLASS);
        allLearning.forEach((span) => {
            if (span.dataset.lemma === lemma) {
                span.className = VOCAB_CLASS;
                span.style.backgroundColor = '';
                span.style.color = '';
                span.style.cursor = '';
            }
        });
        setLastLocalUpdate(Date.now());
        const key = getWordsKey();
        chrome.storage.local.get({ [key]: [] }, (data) => {
            const updatedWords = data[key].map((entry) => {
                if (entry.word.toLowerCase() === lemma) {
                    return { ...entry, status: 'familiar' };
                }
                return entry;
            });
            chrome.storage.local.set({ [key]: updatedWords });
        });
    }
    /**
     * Demote a familiar word back to learning.
     * Provides immediate UI feedback before storage completes.
     */
    function demoteToLearning(lemma) {
        // Immediate visual feedback
        baseWordSet.delete(lemma);
        learningWordSet.add(lemma);
        const allFamiliar = document.querySelectorAll('.' + VOCAB_CLASS);
        allFamiliar.forEach((span) => {
            if (span.dataset.lemma === lemma) {
                span.className = LEARNING_CLASS;
                span.style.backgroundColor = '#fff3e0';
                span.style.color = '#e65100';
                span.style.cursor = 'pointer';
            }
        });
        setLastLocalUpdate(Date.now());
        const key = getWordsKey();
        chrome.storage.local.get({ [key]: [] }, (data) => {
            const updatedWords = data[key].map((entry) => {
                if (entry.word.toLowerCase() === lemma) {
                    return { ...entry, status: 'learning' };
                }
                return entry;
            });
            chrome.storage.local.set({ [key]: updatedWords });
        });
    }
    /**
     * Add a common word (plain text, no span) to the learning list.
     * Uses a targeted DOM walk to find and wrap only matching text nodes,
     * avoiding a full-page refresh.
     */
    function addCommonWordAsLearning(word, contextNode) {
        const lemma = lemmatize(word);
        learningWordSet.add(lemma);
        setLastLocalUpdate(Date.now());
        const key = getWordsKey();
        chrome.storage.local.get({ [key]: [] }, (data) => {
            const words = data[key];
            const exists = words.some((entry) => entry.word.toLowerCase() === lemma);
            if (exists)
                return;
            const newWord = { word: lemma, status: 'learning' };
            const updatedWords = [newWord, ...words];
            chrome.storage.local.set({ [key]: updatedWords });
        });
        // Targeted update: immediate local block, then background for rest
        wrapWordInTextNodes(document.body, lemma, contextNode);
    }
    // ============================================================
    // Click and double-click event handlers
    // ============================================================
    /**
     * Handle single clicks:
     * - Unknown word → add to learning
     * - Learning word → promote to familiar
     */
    document.addEventListener('click', (e) => {
        if (!highlightEnabled)
            return;
        const target = e.target;
        if (target.classList.contains(UNKNOWN_CLASS)) {
            const lemma = target.dataset.lemma;
            if (lemma)
                addWordAsLearning(lemma);
        }
        else if (target.classList.contains(LEARNING_CLASS)) {
            const lemma = target.dataset.lemma;
            if (lemma)
                promoteToFamiliar(lemma);
        }
    });
    /**
     * Handle double clicks:
     * - Familiar word → demote to learning
     * - Common word (plain text) → add to learning
     */
    document.addEventListener('dblclick', (e) => {
        if (!highlightEnabled)
            return;
        const target = e.target;
        if (target.classList.contains(VOCAB_CLASS)) {
            const lemma = target.dataset.lemma;
            if (lemma)
                demoteToLearning(lemma);
        }
        else if (!target.classList.contains(UNKNOWN_CLASS) &&
            !target.classList.contains(LEARNING_CLASS)) {
            // Possibly a common word (plain text)
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim();
            if (selectedText && /^\p{L}+$/u.test(selectedText)) {
                const lemma = lemmatize(selectedText);
                if (COMMON_WORDS.has(lemma)) {
                    // Pass the target element for context-aware highlighting
                    addCommonWordAsLearning(selectedText, target);
                    selection?.removeAllRanges();
                }
            }
        }
    });
    // ============================================================
    // Initialization and storage listeners
    // ============================================================
    // Highlight dynamically added content (SPAs, infinite scroll, etc.)
    const observer = new MutationObserver((mutations) => {
        if (!highlightEnabled)
            return;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    highlightWords(node);
                }
            });
        });
    });
    // Load words from storage and start highlighting
    chrome.storage.local.get({
        words: null,
        words_en: null,
        words_fr: [],
        words_es: [],
        language: DEFAULT_LANGUAGE,
        cefrLevel: null,
        commonWordThreshold: null,
        highlightEnabled: true,
    }, (data) => {
        const storageData = data;
        // Migration: move old `words` key to `words_en`
        if (storageData.words !== null && storageData.words_en === null) {
            chrome.storage.local.set({ words_en: storageData.words });
            chrome.storage.local.remove('words');
            storageData.words_en = storageData.words;
        }
        // Migration: convert old numeric threshold to CEFR level
        let level = storageData.cefrLevel;
        if (!level && storageData.commonWordThreshold) {
            level = thresholdToCefrLevel(storageData.commonWordThreshold);
            chrome.storage.local.set({ cefrLevel: level });
            chrome.storage.local.remove('commonWordThreshold');
        }
        setCurrentLanguage(storageData.language || DEFAULT_LANGUAGE);
        buildCommonWordsSet(level || DEFAULT_CEFR_LEVEL);
        const wordsKey = getWordsKey();
        const wordList = storageData[wordsKey] || [];
        const { familiar, learning } = buildWordSets(wordList);
        setBaseWordSet(familiar);
        setLearningWordSet(learning);
        setHighlightEnabled(storageData.highlightEnabled ?? true);
        if (highlightEnabled) {
            highlightWords(document.body);
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });
    // Re-highlight when word list or settings change
    chrome.storage.onChanged.addListener((changes, area) => {
        try {
            if (area !== 'local')
                return;
            // Highlight toggle changed from popup
            if (changes.highlightEnabled) {
                setHighlightEnabled(changes.highlightEnabled.newValue);
                if (highlightEnabled) {
                    highlightWords(document.body);
                    observer.observe(document.body, { childList: true, subtree: true });
                }
                else {
                    removeHighlights(document.body);
                    observer.disconnect();
                }
                return;
            }
            // Language changed from popup — switch everything and re-highlight
            if (changes.language) {
                setCurrentLanguage(changes.language.newValue || DEFAULT_LANGUAGE);
                // Rebuild common words for the new language
                chrome.storage.local.get({ cefrLevel: DEFAULT_CEFR_LEVEL }, (data) => {
                    try {
                        buildCommonWordsSet(data.cefrLevel || DEFAULT_CEFR_LEVEL);
                        // Load word list for the new language
                        const wordsKey = getWordsKey();
                        chrome.storage.local.get({ [wordsKey]: [] }, (wordData) => {
                            try {
                                const { familiar, learning } = buildWordSets(wordData[wordsKey]);
                                setBaseWordSet(familiar);
                                setLearningWordSet(learning);
                                if (highlightEnabled)
                                    refreshHighlighting();
                            }
                            catch {
                                // Extension context invalidated
                            }
                        });
                    }
                    catch {
                        // Extension context invalidated
                    }
                });
                return;
            }
            // CEFR level changed from popup — rebuild common words Set and refresh
            if (changes.cefrLevel) {
                buildCommonWordsSet(changes.cefrLevel.newValue || DEFAULT_CEFR_LEVEL);
                if (highlightEnabled)
                    refreshHighlighting();
                return;
            }
            // Word list changed for the current language
            const wordsKey = getWordsKey();
            if (changes[wordsKey]) {
                // If update happened less than 500ms ago, it was from this page - skip refresh
                const now = Date.now();
                if (now - lastLocalUpdate < 500) {
                    return;
                }
                // Update from another source (popup, another tab) - need full refresh
                const { familiar, learning } = buildWordSets(changes[wordsKey].newValue || []);
                setBaseWordSet(familiar);
                setLearningWordSet(learning);
                if (highlightEnabled)
                    refreshHighlighting();
            }
        }
        catch {
            // Extension context invalidated
        }
    });
    // Respond to popup requests for page statistics
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        try {
            if (msg.type === 'getPageStats') {
                sendResponse({
                    unfamiliar: pageUnfamiliarLemmas.size,
                    learning: pageLearningLemmas.size,
                    familiar: pageFamiliarLemmas.size,
                });
            }
        }
        catch {
            // Extension context invalidated
        }
    });

})();
//# sourceMappingURL=content.bundle.js.map
