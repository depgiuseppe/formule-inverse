// scripts/coverage.mjs — Misura la copertura del risolutore automatico.
//
// Per ogni formula della libreria e per ogni grandezza che vi compare, tenta
// la risoluzione automatica usando il motore dell'app (suggestNextStep +
// performAction) e riporta i casi che non arrivano a isolare la grandezza.
//
// Uso:  node scripts/coverage.mjs            report leggibile
//       node scripts/coverage.mjs --json     output JSON (per test automatici)

import { FORMULAS } from '../js/formulas.js';
import { parseEquation } from '../js/parser.js';
import { collectVars, toPretty } from '../js/ast.js';
import { isGoalReached, suggestNextStep, performAction } from '../js/algebra.js';

const MAX_STEPS = 30;

export function resolveTarget(eq, target) {
  let curr = eq;
  const applied = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    if (isGoalReached(curr, target)) return { ok: true, curr, applied };
    const sug = suggestNextStep(curr, target);
    if (!sug || !sug.found) {
      return { ok: false, curr, applied, reason: sug ? sug.message : 'nessun suggerimento' };
    }
    const res = performAction(curr, sug.action);
    if (!res || !res.ok) {
      return { ok: false, curr, applied, reason: res ? res.error : 'azione non eseguibile' };
    }
    curr = res.equation;
    applied.push(sug.action.label);
    // Protezione contro i cicli: se l'equazione non cambia, ci fermiamo.
    if (applied.length > 3 && applied.slice(-3).every((l, _, arr) => l === arr[0])) {
      return { ok: false, curr, applied, reason: 'ciclo rilevato' };
    }
  }
  return { ok: false, curr, applied, reason: 'troppi passaggi' };
}

// Casi che il motore non risolve, con la motivazione matematica.
// Se un caso NUOVO smette di essere risolto, lo script fallisce: così una
// regressione non passa inosservata.
export const KNOWN_UNSUPPORTED = [
  { formula: 's-vt-half-at2', target: 't', reason: 'equazione di secondo grado in t (t compare come t e come t²): serve la formula risolutiva' },
  { formula: 'theta-legge-oraria', target: 't', reason: 'equazione di secondo grado in t (t e t²): serve la formula risolutiva' },
  { formula: 'mas-velocita', target: 'omega', reason: 'la grandezza compare sia fuori sia dentro la funzione sin: non è ricavabile in forma chiusa' },
  { formula: 'invariante-energia-impulso', target: 'c', reason: 'la grandezza compare al quadrato dentro due prodotti: servirebbe un raccoglimento sotto potenza' },
];

function isKnownUnsupported(failure) {
  return KNOWN_UNSUPPORTED.some((k) => k.formula === failure.formula && k.target === failure.target);
}

export function runCoverage() {
  const results = [];
  for (const f of FORMULAS) {
    let eq;
    try {
      eq = parseEquation(f.formula);
    } catch (e) {
      results.push({ formula: f.id, expr: f.formula, target: null, ok: false, reason: 'formula non analizzabile: ' + e.message });
      continue;
    }
    for (const target of collectVars(eq)) {
      const r = resolveTarget(eq, target);
      results.push({
        formula: f.id,
        expr: f.formula,
        target,
        ok: r.ok,
        reason: r.ok ? null : r.reason,
        stuck: r.ok ? null : toPretty(r.curr, 0),
        steps: r.applied.length,
      });
    }
  }
  const ok = results.filter((r) => r.ok).length;
  return { results, ok, total: results.length };
}

const isMain = process.argv[1] && process.argv[1].endsWith('coverage.mjs');
if (isMain) {
  const { results, ok, total } = runCoverage();
  const failed = results.filter((r) => !r.ok);
  const unexpected = failed.filter((f) => !isKnownUnsupported(f));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok, total, failed, unexpected }, null, 2));
  } else {
    console.log(`Formule: ${FORMULAS.length}   Abbinamenti formula/grandezza: ${total}`);
    console.log(`Risolti automaticamente: ${ok}   Non risolti: ${failed.length}   Copertura: ${(ok / total * 100).toFixed(1)}%`);
    console.log(`Casi noti non risolvibili: ${failed.length - unexpected.length}   Regressioni: ${unexpected.length}`);

    if (unexpected.length) {
      console.log('\n✗ Regressioni: questi casi erano risolti e ora non lo sono più:');
      for (const f of unexpected) {
        console.log(`  ${f.formula} — isolare ${f.target}   [${f.reason}]`);
        console.log(`      ${f.expr}   →  ${f.stuck}`);
      }
    } else if (failed.length) {
      console.log('\nCasi non risolti (limiti noti del motore, documentati nel README):');
      for (const f of failed) {
        const k = KNOWN_UNSUPPORTED.find((x) => x.formula === f.formula && x.target === f.target);
        console.log(`  ${f.formula} — isolare ${f.target}`);
        console.log(`      ${k ? k.reason : f.reason}`);
      }
    }
  }
  process.exit(unexpected.length ? 1 : 0);
}
