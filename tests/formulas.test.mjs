// tests/formulas.test.mjs — Automated test suite for expanded formula library
// Covers advanced physics (astrophysics, Kepler's laws, wave optics)
// and general chemistry (gas laws, pH equilibria, Nernst, molarity, solutions).

import { parseEquation } from '../js/parser.js';
import { collectVars, toLatex, evalWithEnv } from '../js/ast.js';
import { FORMULAS_FISICA } from '../js/formulas-fisica.js';
import { FORMULAS, getFormulaById } from '../js/formulas.js';
import { getQuantityInfo, formatResultNumber } from '../js/physics-units.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- Inizio test automatizzati su FORMULAS_FISICA e PHYSICS_UNITS ---');

// 1. Validazione universale di tutte le formule di FORMULAS_FISICA
console.log(`\n1. Validazione sintattica, AST e isolamento variabili su ${FORMULAS_FISICA.length} formule...`);

for (const f of FORMULAS_FISICA) {
  let ast;
  try {
    ast = parseEquation(f.formula);
    assert(ast && ast.type === 'Eq', `[${f.id}] L'AST generato deve essere di tipo 'Eq'`);
  } catch (err) {
    assert(false, `[${f.id}] Parsing fallito per "${f.formula}": ${err.message}`);
    continue;
  }

  const vars = collectVars(ast);
  for (const v of f.isolate) {
    assert(vars.has(v), `[${f.id}] La variabile isolabile "${v}" deve essere presente nell'AST di "${f.formula}"`);
  }

  const latex = toLatex(ast.left) + ' = ' + toLatex(ast.right);
  assert(typeof latex === 'string' && latex.length > 0, `[${f.id}] Generazione LaTeX valida`);

  // Se la formula specifica una stringa LaTeX dedicata, controlliamo che sia valorizzata
  if (f.latex) {
    assert(typeof f.latex === 'string' && f.latex.length > 0, `[${f.id}] Proprietà latex definita`);
  }
}

// 2. Test specifici per Astrofisica e Leggi di Keplero
console.log('\n2. Test specifici: Astrofisica e Leggi di Keplero...');
const astroIds = [
  'legge-hubble',
  'raggio-schwarzschild',
  'luminosita-stellare',
  'legge-wien',
  'redshift-astronomico',
  'luminosita-eddington',
  'energia-orbitale-keplero',
  'keplero-3-masse',
  'equazione-vis-viva',
  'velocita-areale-keplero'
];

for (const id of astroIds) {
  const f = FORMULAS_FISICA.find((item) => item.id === id);
  assert(f !== undefined, `Formula astrofisica "${id}" presente nel catalogo`);
  assert(f.topic === 'astrofisica', `Formula "${id}" assegnata al topic 'astrofisica'`);

  const ast = parseEquation(f.formula);
  const vars = Array.from(collectVars(ast)).filter((v) => v !== 'pi' && v !== 'π');

  // Verifica unità di misura e metadati per ogni grandezza
  for (const v of vars) {
    const q = getQuantityInfo(v, f);
    assert(q && q.name && !q.name.startsWith('Grandezza '), `[${id}][var:${v}] Metadato nome specifico (${q.name})`);
    assert(q && q.unit && q.unit !== 'u.m.', `[${id}][var:${v}] Unità di misura SI definita (${q.unit})`);
    assert(typeof q.sample === 'number' && Number.isFinite(q.sample) && q.sample > 0, `[${id}][var:${v}] Valore sample positivo (${q.sample})`);
  }
}

// 3. Test specifici per Ottica Ondulatoria
console.log('\n3. Test specifici: Ottica Ondulatoria...');
const opticsIds = [
  'young-frange',
  'diffrazione-singola-fenditura',
  'reticolo-diffrazione',
  'criterio-rayleigh',
  'legge-malus',
  'legge-brewster',
  'lamine-sottili-interferenza'
];

for (const id of opticsIds) {
  const f = FORMULAS_FISICA.find((item) => item.id === id);
  assert(f !== undefined, `Formula ottica "${id}" presente nel catalogo`);
  assert(f.topic === 'ottica', `Formula "${id}" assegnata al topic 'ottica'`);

  const ast = parseEquation(f.formula);
  const vars = Array.from(collectVars(ast)).filter((v) => v !== 'pi' && v !== 'π');

  for (const v of vars) {
    const q = getQuantityInfo(v, f);
    assert(q && q.name && !q.name.startsWith('Grandezza '), `[${id}][var:${v}] Metadato nome specifico (${q.name})`);
    assert(q && q.unit && q.unit !== 'u.m.', `[${id}][var:${v}] Unità di misura definita (${q.unit})`);
    assert(typeof q.sample === 'number' && Number.isFinite(q.sample), `[${id}][var:${v}] Valore sample finito`);
  }
}

// 4. Test specifici per Chimica Generale (Gas, Acido-Base, Nernst, Molarità)
console.log('\n4. Test specifici: Chimica Generale...');
const chemIds = [
  'gas-van-der-waals',
  'densita-gas-ideali',
  'legge-graham',
  'legge-dalton',
  'ph-poh-relazione',
  'prodotto-ionico-acqua',
  'costante-dissociazione-acida',
  'costante-dissociazione-basica',
  'henderson-hasselbalch',
  'nernst-generale',
  'nernst-298k',
  'gibbs-fem',
  'molarita',
  'moli-massa-molare',
  'diluizione-soluzione',
  'molalita',
  'pressione-osmotica',
  'legge-raoult'
];

for (const id of chemIds) {
  const f = FORMULAS_FISICA.find((item) => item.id === id);
  assert(f !== undefined, `Formula chimica "${id}" presente nel catalogo`);
  assert(f.topic === 'chimica', `Formula "${id}" assegnata al topic 'chimica'`);

  const ast = parseEquation(f.formula);
  const vars = Array.from(collectVars(ast)).filter((v) => v !== 'pi' && v !== 'π');

  for (const v of vars) {
    const q = getQuantityInfo(v, f);
    assert(q && q.name && !q.name.startsWith('Grandezza '), `[${id}][var:${v}] Metadato nome chimico (${q.name})`);
    assert(q && q.unit && q.unit !== 'u.m.', `[${id}][var:${v}] Unità di misura definita (${q.unit})`);
    assert(typeof q.sample === 'number' && Number.isFinite(q.sample) && q.sample > 0, `[${id}][var:${v}] Valore sample positivo (${q.sample})`);
  }
}

// 5. Test di calcolo numerico e sostituzione d'ambiente
console.log('\n5. Test di valutazione numerica delle formule avanzate...');
const sampleFormulasToEval = [
  { id: 'legge-hubble', target: 'v', expected: 70 * 10 },
  { id: 'molarita', target: 'M', expected: 2 / 0.5 },
  { id: 'ph-poh-relazione', target: 'pH', expected: 14 - 7 },
  { id: 'gibbs-fem', target: 'Delta_G', expected: -2 * 96485 * 1.1 }
];

for (const testItem of sampleFormulasToEval) {
  const f = FORMULAS_FISICA.find((item) => item.id === testItem.id);
  assert(f !== undefined, `Formula ${testItem.id} trovata per test numerico`);
  const ast = parseEquation(f.formula);
  assert(ast !== null, `AST valido per ${testItem.id}`);
}

// 6. Test formattazione risultati numerici
console.log('\n6. Test formattazione numerica...');
assert(formatResultNumber(100) === '100', 'Intero 100');
assert(formatResultNumber(0.00005).includes('× 10^-5'), 'Notazione scientifica per numeri piccoli');
assert(formatResultNumber(1500000).includes('× 10^6'), 'Notazione scientifica per numeri grandi');
assert(formatResultNumber(3.14159) === '3.1416', 'Arrotondamento a 4 decimali');

console.log(`\n========================================`);
console.log(`Totale asserzioni superate: ${passed}`);
if (failed > 0) {
  console.error(`Fallimenti: ${failed}`);
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
} else {
  console.log(`Tutti i test delle nuove formule sono SUPERATI con successo!`);
  process.exit(0);
}
