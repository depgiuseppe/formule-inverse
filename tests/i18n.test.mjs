// tests/i18n.test.mjs — Test unitari per il modulo di internazionalizzazione (i18n)
import {
  t,
  getLanguage,
  setLanguage,
  onLanguageChange,
  translateTopic,
  DICTIONARY,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '../js/i18n.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`✗ FALLITO: ${message}`);
  } else {
    passed++;
    console.log(`✓ ${message}`);
  }
}

console.log('--- Inizio test unitari per js/i18n.js ---');

// 1. Lingua predefinita e supporto lingue
console.log('\n1. Verifica lingua predefinita e lingue supportate...');
assert(DEFAULT_LANGUAGE === 'it', 'DEFAULT_LANGUAGE deve essere "it"');
assert(SUPPORTED_LANGUAGES.includes('it') && SUPPORTED_LANGUAGES.includes('en'), 'Supporta sia IT che EN');
setLanguage('it');
assert(getLanguage() === 'it', 'Lingua iniziale impostata su "it"');

// 2. Traduzioni e interpolazione parametri
console.log('\n2. Traduzioni di base e interpolazione parametri...');
assert(t('app.title') === 'Laboratorio di Formule Inverse', 'Titolo app in italiano');
assert(t('library.heading') === 'A. Libreria delle formule', 'Intestazione libreria in italiano');

const isolatedIt = t('objective.isolate', { var: 'v' });
assert(isolatedIt === 'Isola v applicando i principi di equivalenza.', 'Interpolazione parametro in italiano: ' + isolatedIt);

const countIt = t('library.count_plural', { n: 188 });
assert(countIt === '188 formule', 'Interpolazione conteggio formule in italiano: ' + countIt);

// 3. Cambio lingua in 'en' e reattività
console.log('\n3. Cambio lingua dinamico e listener onLanguageChange...');
let listenerNotified = null;
const unsubscribe = onLanguageChange((lang) => {
  listenerNotified = lang;
});

setLanguage('en');
assert(getLanguage() === 'en', 'Lingua aggiornata a "en"');
assert(listenerNotified === 'en', 'Listener notificato con il valore "en"');
assert(t('app.title') === 'Inverse Formula Lab', 'Titolo app in inglese');
assert(t('library.heading') === 'A. Formula Library', 'Intestazione libreria in inglese');

const isolatedEn = t('objective.isolate', { var: 't' });
assert(isolatedEn === 'Isolate t by applying equivalence principles.', 'Interpolazione parametro in inglese: ' + isolatedEn);

const countEn = t('library.count_plural', { n: 42 });
assert(countEn === '42 formulas', 'Interpolazione conteggio formule in inglese: ' + countEn);

// Disiscrizione listener
unsubscribe();
setLanguage('it');
assert(getLanguage() === 'it', 'Ripristino lingua su "it"');
assert(listenerNotified === 'en', 'Listener disiscritto non riceve più notifiche');

// 4. Parità di chiavi tra IT ed EN
console.log('\n4. Verifica parità e completezza chiavi tra IT ed EN...');
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const itKeys = getAllKeys(DICTIONARY.it);
const enKeys = getAllKeys(DICTIONARY.en);

assert(itKeys.length > 50, `Dizionario IT contiene un numero cospicuo di chiavi (${itKeys.length})`);
assert(enKeys.length > 50, `Dizionario EN contiene un numero cospicuo di chiavi (${enKeys.length})`);

const missingInEn = itKeys.filter((k) => !enKeys.includes(k));
assert(missingInEn.length === 0, `Nessuna chiave mancante in EN rispetto a IT (mancanti: ${missingInEn.join(', ')})`);

const missingInIt = enKeys.filter((k) => !itKeys.includes(k));
assert(missingInIt.length === 0, `Nessuna chiave mancante in IT rispetto a EN (mancanti: ${missingInIt.join(', ')})`);

// 5. Fallback per chiavi sconosciute o mancanti
console.log('\n5. Verifica meccanismi di fallback...');
const fallbackUnknown = t('non.existent.key.test');
assert(fallbackUnknown === 'non.existent.key.test', 'Chiave inesistente restituisce la chiave stessa');

// 6. Traduzione categorie e argomenti didattici
console.log('\n6. Verifica traduzione argomenti / categorie didattiche...');
assert(translateTopic('cinematica', 'it') === 'Cinematica', 'Topic IT: cinematica');
assert(translateTopic('cinematica', 'en') === 'Kinematics', 'Topic EN: cinematica -> Kinematics');
assert(translateTopic('dinamica', 'en') === 'Dynamics', 'Topic EN: dinamica -> Dynamics');
assert(translateTopic('termodinamica', 'en') === 'Thermodynamics', 'Topic EN: termodinamica -> Thermodynamics');
assert(translateTopic('elettromagnetismo', 'en') === 'Electromagnetism', 'Topic EN: elettromagnetismo -> Electromagnetism');
assert(translateTopic('onde e acustica', 'en') === 'Waves & Acoustics', 'Topic EN: onde e acustica -> Waves & Acoustics');

// Ripristino lingua 'it' per purezza test
setLanguage('it');

console.log('\n========================================');
console.log(`Totale asserzioni: ${passed + failed}`);
console.log(`Superate: ${passed}`);
if (failed > 0) {
  console.error(`Fallite: ${failed}`);
  process.exit(1);
} else {
  console.log('Tutti i test del modulo i18n sono SUPERATI con successo!');
  process.exit(0);
}
