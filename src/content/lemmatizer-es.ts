// ============================================================
// Spanish lemmatization — rule-based with irregular verb table
// ============================================================

const lemmaCacheEs = new Map<string, string>();

/**
 * Common irregular Spanish verbs: conjugated form → infinitive.
 * Covers the most frequent irregular verbs (ser, estar, haber, tener, ir, hacer, etc.)
 */
const ES_IRREGULAR = new Map<string, string>([
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
export function lemmatizeEs(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lemmaCacheEs.has(lower)) return lemmaCacheEs.get(lower)!;

  let result = lower;

  // 1. Irregular verb lookup
  if (ES_IRREGULAR.has(lower)) {
    result = ES_IRREGULAR.get(lower)!;
    lemmaCacheEs.set(lower, result);
    return result;
  }

  // 2. Verb conjugation rules — try to recover infinitive

  // Gerunds: -ando → -ar, -iendo → -er/-ir (try -er first since it's more common in CEFR lists)
  if (/^.{2,}ando$/.test(lower)) {
    result = lower.replace(/ando$/, 'ar');
  } else if (/^.{2,}iendo$/.test(lower)) {
    result = lower.replace(/iendo$/, 'er');
  }
  // Past participles: -ado → -ar, -ido → -er/-ir
  else if (/^.{2,}ado$/.test(lower)) {
    result = lower.replace(/ado$/, 'ar');
  } else if (/^.{2,}ados$/.test(lower)) {
    result = lower.replace(/ados$/, 'ar');
  } else if (/^.{2,}ada$/.test(lower)) {
    result = lower.replace(/ada$/, 'ar');
  } else if (/^.{2,}adas$/.test(lower)) {
    result = lower.replace(/adas$/, 'ar');
  } else if (/^.{2,}ido$/.test(lower)) {
    result = lower.replace(/ido$/, 'er');
  } else if (/^.{2,}idos$/.test(lower)) {
    result = lower.replace(/idos$/, 'er');
  } else if (/^.{2,}ida$/.test(lower)) {
    result = lower.replace(/ida$/, 'er');
  } else if (/^.{2,}idas$/.test(lower)) {
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
  } else if (/^.{3,}áis$/.test(lower)) {
    result = lower.replace(/áis$/, 'ar');
  }
  // Present -er: -emos/-éis
  else if (/^.{3,}emos$/.test(lower)) {
    result = lower.replace(/emos$/, 'er');
  } else if (/^.{3,}éis$/.test(lower)) {
    result = lower.replace(/éis$/, 'er');
  }
  // Present -ir: -imos/-ís
  else if (/^.{3,}imos$/.test(lower)) {
    result = lower.replace(/imos$/, 'ir');
  }
  // 3rd person plural present: -an → -ar, -en → -er
  else if (/^.{3,}an$/.test(lower) && !lower.endsWith('ían')) {
    result = lower.replace(/an$/, 'ar');
  } else if (/^.{3,}en$/.test(lower) && !lower.endsWith('ien')) {
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
