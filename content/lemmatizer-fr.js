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
  ['suis', 'être'], ['es', 'être'], ['est', 'être'], ['sommes', 'être'],
  ['êtes', 'être'], ['sont', 'être'], ['étais', 'être'], ['était', 'être'],
  ['étions', 'être'], ['étiez', 'être'], ['étaient', 'être'],
  ['fus', 'être'], ['fut', 'être'], ['fûmes', 'être'], ['fûtes', 'être'],
  ['furent', 'être'], ['serai', 'être'], ['seras', 'être'], ['sera', 'être'],
  ['serons', 'être'], ['serez', 'être'], ['seront', 'être'],
  ['serais', 'être'], ['serait', 'être'], ['serions', 'être'],
  ['seriez', 'être'], ['seraient', 'être'],
  ['sois', 'être'], ['soit', 'être'], ['soyons', 'être'],
  ['soyez', 'être'], ['soient', 'être'], ['été', 'être'],
  // avoir
  ['ai', 'avoir'], ['as', 'avoir'], ['avons', 'avoir'], ['avez', 'avoir'],
  ['ont', 'avoir'], ['avais', 'avoir'], ['avait', 'avoir'],
  ['avions', 'avoir'], ['aviez', 'avoir'], ['avaient', 'avoir'],
  ['eus', 'avoir'], ['eut', 'avoir'], ['eûmes', 'avoir'],
  ['eûtes', 'avoir'], ['eurent', 'avoir'], ['aurai', 'avoir'],
  ['auras', 'avoir'], ['aura', 'avoir'], ['aurons', 'avoir'],
  ['aurez', 'avoir'], ['auront', 'avoir'], ['aurais', 'avoir'],
  ['aurait', 'avoir'], ['aurions', 'avoir'], ['auriez', 'avoir'],
  ['auraient', 'avoir'], ['aie', 'avoir'], ['ait', 'avoir'],
  ['ayons', 'avoir'], ['ayez', 'avoir'], ['aient', 'avoir'], ['eu', 'avoir'],
  // aller
  ['vais', 'aller'], ['vas', 'aller'], ['va', 'aller'], ['allons', 'aller'],
  ['allez', 'aller'], ['vont', 'aller'], ['allais', 'aller'],
  ['allait', 'aller'], ['allions', 'aller'], ['alliez', 'aller'],
  ['allaient', 'aller'], ['irai', 'aller'], ['iras', 'aller'],
  ['ira', 'aller'], ['irons', 'aller'], ['irez', 'aller'],
  ['iront', 'aller'], ['irais', 'aller'], ['irait', 'aller'],
  ['irions', 'aller'], ['iriez', 'aller'], ['iraient', 'aller'],
  ['aille', 'aller'], ['ailles', 'aller'], ['aillent', 'aller'],
  ['allé', 'aller'], ['allée', 'aller'], ['allés', 'aller'], ['allées', 'aller'],
  // faire
  ['fais', 'faire'], ['fait', 'faire'], ['faisons', 'faire'],
  ['faites', 'faire'], ['font', 'faire'], ['faisais', 'faire'],
  ['faisait', 'faire'], ['faisions', 'faire'], ['faisiez', 'faire'],
  ['faisaient', 'faire'], ['fis', 'faire'], ['fit', 'faire'],
  ['fîmes', 'faire'], ['fîtes', 'faire'], ['firent', 'faire'],
  ['ferai', 'faire'], ['feras', 'faire'], ['fera', 'faire'],
  ['ferons', 'faire'], ['ferez', 'faire'], ['feront', 'faire'],
  ['ferais', 'faire'], ['ferait', 'faire'], ['ferions', 'faire'],
  ['feriez', 'faire'], ['feraient', 'faire'],
  ['fasse', 'faire'], ['fasses', 'faire'], ['fassions', 'faire'],
  ['fassiez', 'faire'], ['fassent', 'faire'], ['faite', 'faire'],
  ['faits', 'faire'], ['faites', 'faire'],
  // pouvoir
  ['peux', 'pouvoir'], ['peut', 'pouvoir'], ['pouvons', 'pouvoir'],
  ['pouvez', 'pouvoir'], ['peuvent', 'pouvoir'], ['pouvais', 'pouvoir'],
  ['pouvait', 'pouvoir'], ['pouvions', 'pouvoir'], ['pouviez', 'pouvoir'],
  ['pouvaient', 'pouvoir'], ['pus', 'pouvoir'], ['put', 'pouvoir'],
  ['pourrai', 'pouvoir'], ['pourras', 'pouvoir'], ['pourra', 'pouvoir'],
  ['pourrons', 'pouvoir'], ['pourrez', 'pouvoir'], ['pourront', 'pouvoir'],
  ['pourrais', 'pouvoir'], ['pourrait', 'pouvoir'], ['pourrions', 'pouvoir'],
  ['pourriez', 'pouvoir'], ['pourraient', 'pouvoir'],
  ['puisse', 'pouvoir'], ['puisses', 'pouvoir'], ['puissions', 'pouvoir'],
  ['puissiez', 'pouvoir'], ['puissent', 'pouvoir'], ['pu', 'pouvoir'],
  // vouloir
  ['veux', 'vouloir'], ['veut', 'vouloir'], ['voulons', 'vouloir'],
  ['voulez', 'vouloir'], ['veulent', 'vouloir'], ['voulais', 'vouloir'],
  ['voulait', 'vouloir'], ['voulions', 'vouloir'], ['vouliez', 'vouloir'],
  ['voulaient', 'vouloir'], ['voulus', 'vouloir'], ['voulut', 'vouloir'],
  ['voudrai', 'vouloir'], ['voudras', 'vouloir'], ['voudra', 'vouloir'],
  ['voudrons', 'vouloir'], ['voudrez', 'vouloir'], ['voudront', 'vouloir'],
  ['voudrais', 'vouloir'], ['voudrait', 'vouloir'], ['voudrions', 'vouloir'],
  ['voudriez', 'vouloir'], ['voudraient', 'vouloir'],
  ['veuille', 'vouloir'], ['veuilles', 'vouloir'], ['veuillent', 'vouloir'],
  ['voulu', 'vouloir'],
  // savoir
  ['sais', 'savoir'], ['sait', 'savoir'], ['savons', 'savoir'],
  ['savez', 'savoir'], ['savent', 'savoir'], ['savais', 'savoir'],
  ['savait', 'savoir'], ['savions', 'savoir'], ['saviez', 'savoir'],
  ['savaient', 'savoir'], ['sus', 'savoir'], ['sut', 'savoir'],
  ['saurai', 'savoir'], ['sauras', 'savoir'], ['saura', 'savoir'],
  ['saurons', 'savoir'], ['saurez', 'savoir'], ['sauront', 'savoir'],
  ['saurais', 'savoir'], ['saurait', 'savoir'], ['saurions', 'savoir'],
  ['sauriez', 'savoir'], ['sauraient', 'savoir'],
  ['sache', 'savoir'], ['saches', 'savoir'], ['sachions', 'savoir'],
  ['sachiez', 'savoir'], ['sachent', 'savoir'], ['su', 'savoir'],
  // voir
  ['vois', 'voir'], ['voit', 'voir'], ['voyons', 'voir'],
  ['voyez', 'voir'], ['voient', 'voir'], ['voyais', 'voir'],
  ['voyait', 'voir'], ['voyions', 'voir'], ['voyiez', 'voir'],
  ['voyaient', 'voir'], ['vis', 'voir'], ['vit', 'voir'],
  ['verrai', 'voir'], ['verras', 'voir'], ['verra', 'voir'],
  ['verrons', 'voir'], ['verrez', 'voir'], ['verront', 'voir'],
  ['verrais', 'voir'], ['verrait', 'voir'], ['verrions', 'voir'],
  ['verriez', 'voir'], ['verraient', 'voir'],
  ['voie', 'voir'], ['voies', 'voir'], ['voient', 'voir'], ['vu', 'voir'],
  // venir
  ['viens', 'venir'], ['vient', 'venir'], ['venons', 'venir'],
  ['venez', 'venir'], ['viennent', 'venir'], ['venais', 'venir'],
  ['venait', 'venir'], ['venions', 'venir'], ['veniez', 'venir'],
  ['venaient', 'venir'], ['vins', 'venir'], ['vint', 'venir'],
  ['viendrai', 'venir'], ['viendras', 'venir'], ['viendra', 'venir'],
  ['viendrons', 'venir'], ['viendrez', 'venir'], ['viendront', 'venir'],
  ['viendrais', 'venir'], ['viendrait', 'venir'], ['viendrions', 'venir'],
  ['viendriez', 'venir'], ['viendraient', 'venir'],
  ['vienne', 'venir'], ['viennes', 'venir'], ['viennent', 'venir'],
  ['venu', 'venir'], ['venue', 'venir'], ['venus', 'venir'], ['venues', 'venir'],
  // devoir
  ['dois', 'devoir'], ['doit', 'devoir'], ['devons', 'devoir'],
  ['devez', 'devoir'], ['doivent', 'devoir'], ['devais', 'devoir'],
  ['devait', 'devoir'], ['devions', 'devoir'], ['deviez', 'devoir'],
  ['devaient', 'devoir'], ['dus', 'devoir'], ['dut', 'devoir'],
  ['devrai', 'devoir'], ['devras', 'devoir'], ['devra', 'devoir'],
  ['devrons', 'devoir'], ['devrez', 'devoir'], ['devront', 'devoir'],
  ['devrais', 'devoir'], ['devrait', 'devoir'], ['devrions', 'devoir'],
  ['devriez', 'devoir'], ['devraient', 'devoir'],
  ['doive', 'devoir'], ['doives', 'devoir'], ['doivent', 'devoir'],
  ['dû', 'devoir'], ['due', 'devoir'], ['dus', 'devoir'], ['dues', 'devoir'],
  // dire
  ['dis', 'dire'], ['dit', 'dire'], ['disons', 'dire'],
  ['dites', 'dire'], ['disent', 'dire'], ['disais', 'dire'],
  ['disait', 'dire'], ['disions', 'dire'], ['disiez', 'dire'],
  ['disaient', 'dire'], ['dirai', 'dire'], ['diras', 'dire'],
  ['dira', 'dire'], ['dirons', 'dire'], ['direz', 'dire'],
  ['diront', 'dire'], ['dirais', 'dire'], ['dirait', 'dire'],
  ['dirions', 'dire'], ['diriez', 'dire'], ['diraient', 'dire'],
  ['dise', 'dire'], ['dises', 'dire'], ['disions', 'dire'],
  ['disiez', 'dire'], ['disent', 'dire'], ['dite', 'dire'],
  ['dits', 'dire'], ['dites', 'dire'],
  // prendre
  ['prends', 'prendre'], ['prend', 'prendre'], ['prenons', 'prendre'],
  ['prenez', 'prendre'], ['prennent', 'prendre'], ['prenais', 'prendre'],
  ['prenait', 'prendre'], ['prenions', 'prendre'], ['preniez', 'prendre'],
  ['prenaient', 'prendre'], ['pris', 'prendre'], ['prit', 'prendre'],
  ['prendrai', 'prendre'], ['prendras', 'prendre'], ['prendra', 'prendre'],
  ['prendrons', 'prendre'], ['prendrez', 'prendre'], ['prendront', 'prendre'],
  ['prendrais', 'prendre'], ['prendrait', 'prendre'],
  ['prenne', 'prendre'], ['prennes', 'prendre'], ['prennent', 'prendre'],
  ['prise', 'prendre'], ['prises', 'prendre'],
  // mettre
  ['mets', 'mettre'], ['met', 'mettre'], ['mettons', 'mettre'],
  ['mettez', 'mettre'], ['mettent', 'mettre'], ['mettais', 'mettre'],
  ['mettait', 'mettre'], ['mettions', 'mettre'], ['mettiez', 'mettre'],
  ['mettaient', 'mettre'], ['mis', 'mettre'], ['mit', 'mettre'],
  ['mettrai', 'mettre'], ['mettras', 'mettre'], ['mettra', 'mettre'],
  ['mettrons', 'mettre'], ['mettrez', 'mettre'], ['mettront', 'mettre'],
  ['mettrais', 'mettre'], ['mettrait', 'mettre'],
  ['mette', 'mettre'], ['mettes', 'mettre'], ['mettent', 'mettre'],
  ['mise', 'mettre'], ['mises', 'mettre'],
  // donner (regular but very common, included for completeness)
  ['donne', 'donner'], ['donnes', 'donner'], ['donnons', 'donner'],
  ['donnez', 'donner'], ['donnent', 'donner'], ['donnais', 'donner'],
  ['donnait', 'donner'], ['donnions', 'donner'], ['donniez', 'donner'],
  ['donnaient', 'donner'], ['donnai', 'donner'], ['donna', 'donner'],
  ['donné', 'donner'], ['donnée', 'donner'], ['donnés', 'donner'], ['données', 'donner'],
  // tenir
  ['tiens', 'tenir'], ['tient', 'tenir'], ['tenons', 'tenir'],
  ['tenez', 'tenir'], ['tiennent', 'tenir'], ['tenais', 'tenir'],
  ['tenait', 'tenir'], ['tenions', 'tenir'], ['teniez', 'tenir'],
  ['tenaient', 'tenir'], ['tins', 'tenir'], ['tint', 'tenir'],
  ['tiendrai', 'tenir'], ['tiendras', 'tenir'], ['tiendra', 'tenir'],
  ['tiendrons', 'tenir'], ['tiendrez', 'tenir'], ['tiendront', 'tenir'],
  ['tiendrais', 'tenir'], ['tiendrait', 'tenir'],
  ['tienne', 'tenir'], ['tiennes', 'tenir'], ['tiennent', 'tenir'],
  ['tenu', 'tenir'], ['tenue', 'tenir'], ['tenus', 'tenir'], ['tenues', 'tenir'],
  // connaître
  ['connais', 'connaître'], ['connaît', 'connaître'], ['connaissons', 'connaître'],
  ['connaissez', 'connaître'], ['connaissent', 'connaître'],
  ['connaissais', 'connaître'], ['connaissait', 'connaître'],
  ['connaissions', 'connaître'], ['connaissiez', 'connaître'],
  ['connaissaient', 'connaître'], ['connus', 'connaître'], ['connut', 'connaître'],
  ['connaîtrai', 'connaître'], ['connaîtras', 'connaître'], ['connaîtra', 'connaître'],
  ['connu', 'connaître'], ['connue', 'connaître'],
  // croire
  ['crois', 'croire'], ['croit', 'croire'], ['croyons', 'croire'],
  ['croyez', 'croire'], ['croient', 'croire'], ['croyais', 'croire'],
  ['croyait', 'croire'], ['croyions', 'croire'], ['croyiez', 'croire'],
  ['croyaient', 'croire'], ['crus', 'croire'], ['crut', 'croire'],
  ['croirai', 'croire'], ['croiras', 'croire'], ['croira', 'croire'],
  ['croie', 'croire'], ['croies', 'croire'], ['croient', 'croire'],
  ['cru', 'croire'], ['crue', 'croire'],
  // écrire
  ['écris', 'écrire'], ['écrit', 'écrire'], ['écrivons', 'écrire'],
  ['écrivez', 'écrire'], ['écrivent', 'écrire'], ['écrivais', 'écrire'],
  ['écrivait', 'écrire'], ['écrirai', 'écrire'], ['écriras', 'écrire'],
  ['écrira', 'écrire'], ['écrive', 'écrire'], ['écrivent', 'écrire'],
  ['écrite', 'écrire'], ['écrits', 'écrire'], ['écrites', 'écrire'],
  // lire
  ['lis', 'lire'], ['lit', 'lire'], ['lisons', 'lire'],
  ['lisez', 'lire'], ['lisent', 'lire'], ['lisais', 'lire'],
  ['lisait', 'lire'], ['lirai', 'lire'], ['liras', 'lire'],
  ['lira', 'lire'], ['lise', 'lire'], ['lisent', 'lire'],
  ['lu', 'lire'], ['lue', 'lire'], ['lus', 'lire'], ['lues', 'lire'],
  // partir
  ['pars', 'partir'], ['part', 'partir'], ['partons', 'partir'],
  ['partez', 'partir'], ['partent', 'partir'], ['partais', 'partir'],
  ['partait', 'partir'], ['partirai', 'partir'], ['partiras', 'partir'],
  ['partira', 'partir'], ['parti', 'partir'], ['partie', 'partir'],
  ['partis', 'partir'], ['parties', 'partir'],
  // sortir
  ['sors', 'sortir'], ['sort', 'sortir'], ['sortons', 'sortir'],
  ['sortez', 'sortir'], ['sortent', 'sortir'], ['sortais', 'sortir'],
  ['sortait', 'sortir'], ['sorti', 'sortir'], ['sortie', 'sortir'],
  // vivre
  ['vis', 'vivre'], ['vit', 'vivre'], ['vivons', 'vivre'],
  ['vivez', 'vivre'], ['vivent', 'vivre'], ['vivais', 'vivre'],
  ['vivait', 'vivre'], ['vivrai', 'vivre'], ['vivras', 'vivre'],
  ['vivra', 'vivre'], ['vécu', 'vivre'], ['vécue', 'vivre'],
  // mourir
  ['meurs', 'mourir'], ['meurt', 'mourir'], ['mourons', 'mourir'],
  ['mourez', 'mourir'], ['meurent', 'mourir'], ['mourais', 'mourir'],
  ['mourrai', 'mourir'], ['mourras', 'mourir'], ['mourra', 'mourir'],
  ['mort', 'mourir'], ['morte', 'mourir'], ['morts', 'mourir'], ['mortes', 'mourir'],
  // naître
  ['nais', 'naître'], ['naît', 'naître'], ['naissons', 'naître'],
  ['naissez', 'naître'], ['naissent', 'naître'],
  ['né', 'naître'], ['née', 'naître'], ['nés', 'naître'], ['nées', 'naître'],
  // ouvrir
  ['ouvre', 'ouvrir'], ['ouvres', 'ouvrir'], ['ouvrons', 'ouvrir'],
  ['ouvrez', 'ouvrir'], ['ouvrent', 'ouvrir'],
  ['ouvert', 'ouvrir'], ['ouverte', 'ouvrir'], ['ouverts', 'ouvrir'], ['ouvertes', 'ouvrir'],
  // suivre
  ['suis', 'suivre'], ['suit', 'suivre'], ['suivons', 'suivre'],
  ['suivez', 'suivre'], ['suivent', 'suivre'],
  ['suivi', 'suivre'], ['suivie', 'suivre'], ['suivis', 'suivre'],
  // recevoir
  ['reçois', 'recevoir'], ['reçoit', 'recevoir'], ['recevons', 'recevoir'],
  ['recevez', 'recevoir'], ['reçoivent', 'recevoir'],
  ['recevais', 'recevoir'], ['recevait', 'recevoir'],
  ['recevrai', 'recevoir'], ['recevras', 'recevoir'], ['recevra', 'recevoir'],
  ['reçu', 'recevoir'], ['reçue', 'recevoir'], ['reçus', 'recevoir'],
  // boire
  ['bois', 'boire'], ['boit', 'boire'], ['buvons', 'boire'],
  ['buvez', 'boire'], ['boivent', 'boire'],
  ['buvais', 'boire'], ['buvait', 'boire'],
  ['bu', 'boire'], ['bue', 'boire'], ['bus', 'boire'],
  // conduire
  ['conduis', 'conduire'], ['conduit', 'conduire'], ['conduisons', 'conduire'],
  ['conduisez', 'conduire'], ['conduisent', 'conduire'],
  ['conduisais', 'conduire'], ['conduisait', 'conduire'],
  ['conduite', 'conduire'], ['conduits', 'conduire'],
  // plaire
  ['plais', 'plaire'], ['plaît', 'plaire'], ['plaisons', 'plaire'],
  ['plaisez', 'plaire'], ['plaisent', 'plaire'], ['plu', 'plaire'],
]);

/**
 * Rule-based French lemmatizer.
 * Tries irregular lookup first, then applies suffix rules.
 * Results are cached for performance.
 */
function lemmatizeFr(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lemmaCacheFr.has(lower)) return lemmaCacheFr.get(lower);

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
  } else if (/^.{2,}(ons|ez)$/.test(lower) && lower.endsWith('ons')) {
    // -ons ending: could be 1st group (mangeons→manger) — heuristic
    result = lower.replace(/eons$/, 'er').replace(/ons$/, 'er');
  } else if (/^.{2,}(ent)$/.test(lower) && !lower.endsWith('ment')) {
    // -ent ending: 3rd person plural (mangent→manger, finissent→finir)
    if (lower.endsWith('issent')) {
      result = lower.replace(/issent$/, 'ir');
    } else {
      result = lower.replace(/ent$/, 'er');
    }
  } else if (/^.{2,}(ais|ait|aient)$/.test(lower)) {
    // Imperfect: -ais, -ait, -aient → try -er
    if (lower.endsWith('issais') || lower.endsWith('issait') || lower.endsWith('issaient')) {
      result = lower.replace(/iss(ais|ait|aient)$/, 'ir');
    } else {
      result = lower.replace(/(ais|ait|aient)$/, 'er');
    }
  } else if (/^.{2,}(ions|iez)$/.test(lower)) {
    // -ions, -iez (imperfect/subjunctive)
    if (lower.endsWith('issions') || lower.endsWith('issiez')) {
      result = lower.replace(/iss(ions|iez)$/, 'ir');
    } else {
      result = lower.replace(/(ions|iez)$/, 'er');
    }
  }
  // Past participles
  else if (/^.{2,}ée$/.test(lower)) {
    result = lower.replace(/ée$/, 'er');
  } else if (/^.{2,}és$/.test(lower)) {
    result = lower.replace(/és$/, 'er');
  } else if (/^.{2,}ées$/.test(lower)) {
    result = lower.replace(/ées$/, 'er');
  }
  // -ir verbs (2nd group): present tense -is, -it, -issons, -issez
  else if (/^.{2,}issons$/.test(lower)) {
    result = lower.replace(/issons$/, 'ir');
  } else if (/^.{2,}issez$/.test(lower)) {
    result = lower.replace(/issez$/, 'ir');
  }
  // Noun/adjective rules
  else if (/^.{2,}aux$/.test(lower)) {
    // -aux → -al (journaux→journal, animaux→animal)
    result = lower.replace(/aux$/, 'al');
  } else if (/^.{2,}eaux$/.test(lower)) {
    // -eaux → -eau (châteaux→château)
    result = lower.replace(/eaux$/, 'eau');
  } else if (/^.{3,}euse$/.test(lower)) {
    // -euse → -eur (chanteuse→chanteur)
    result = lower.replace(/euse$/, 'eur');
  } else if (/^.{3,}euses$/.test(lower)) {
    result = lower.replace(/euses$/, 'eur');
  } else if (/^.{3,}trice$/.test(lower)) {
    // -trice → -teur (actrice→acteur)
    result = lower.replace(/trice$/, 'teur');
  } else if (/^.{3,}trices$/.test(lower)) {
    result = lower.replace(/trices$/, 'teur');
  } else if (/^.{3,}ive$/.test(lower)) {
    // -ive → -if (sportive→sportif)
    result = lower.replace(/ive$/, 'if');
  } else if (/^.{3,}ives$/.test(lower)) {
    result = lower.replace(/ives$/, 'if');
  }
  // Generic plural: -s (most common)
  else if (/^.{2,}s$/.test(lower) && !lower.endsWith('ss')) {
    result = lower.replace(/s$/, '');
  }

  lemmaCacheFr.set(lower, result);
  return result;
}
