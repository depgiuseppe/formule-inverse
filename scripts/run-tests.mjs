// scripts/run-tests.mjs — Esecuzione dei self-test dell'app da Node.
// Importa la suite interna (js/tests.js) e stampa un riepilogo leggibile.
//
// Uso:  node scripts/run-tests.mjs
//
// Nota: js/formula-db.js usa window.localStorage; importiamo solo i moduli puri
// (ast, parser, rules, algebra, tests) che non toccano il DOM.

import { runAllTests } from '../js/tests.js';

const results = runAllTests();
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;

for (const r of results) {
  const icon = r.ok ? '✓' : '✗';
  console.log(`${icon} ${r.name}${r.detail ? '  → ' + r.detail : ''}`);
}
console.log(`\n${passed}/${results.length} test superati` + (failed ? `, ${failed} FALLITI` : ''));
process.exit(failed ? 1 : 0);
