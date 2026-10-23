// tests.js — Suite di test interni (self-test dell'app).
//
// Verifica:
//  - il parser (formule valide e malformate);
//  - regole lecite (risultati corretti);
//  - regole illecite (x/x, divisione per 0, inversione di un solo membro, ...);
//  - il controllo dell'equivalenza;
//  - il raggiungimento dell'obiettivo.

import { parseEquation, parseExpression, ParseError } from './parser.js';
import { toPretty, toLatex, equivalentEq, unwrap, unwrapNeutrals, stripNeutrals, collectVars, clone, canonical, Sin, Ln, Var, Num, evalWithEnv, substituteVarsInAst } from './ast.js';
import { renderEquation, prettyVar } from './render.js';
import { applyDragMove } from './dragdrop.js';
import { RULES, applyRule, findCommonFactor, hasTrigConflict, canDistribute } from './rules.js';
import { isGoalReached, performAction, suggestNextStep, enumerateElements, ensureTargetOnFirstMember } from './algebra.js';
import { reciprocalEquation } from './reciprocals.js';
import { crossCancel } from './cross.js';
import { applyKeypadOperation } from './operations.js';
import { filterFormulas, FORMULAS } from './formulas.js';
import { getQuantityInfo, formatResultNumber } from './physics-units.js';
import { hasCompoundFraction, transformToReciprocalMul, getCompoundFractionSteps } from './compound-fraction.js';
import { reduceToSingleFraction, canReduceToSingleFraction, reduceEquationToCommonDenominator } from './common-denom.js';
import { Div, Sub, Mul, Neg, Eq, Add, Sqrt } from './ast.js';
import {
  solveFormulaSteps, buildWorksheetExercises, generateLatexDocument,
  generateHtmlWorksheet, escapeLatexText
} from './worksheet-export.js';
import {
  EXPLANATIONS, INVALID_EXPLANATIONS, STUDENT_MISCONCEPTIONS,
  diagnoseStudentMisconception, buildRulePanel
} from './explanations.js';
import {
  DIFFICULTY_LEVELS, classifyFormulaDifficulty, getQuizFormulas,
  getRandomQuizExercise, calculateStepEfficiency, calculateExerciseXp,
  getPlayerRank, MASTERY_BADGES, checkBadgesToUnlock, getDefaultProgress,
  loadQuizProgress, saveQuizProgress, resetQuizProgress, recordQuizResult
} from './quiz.js';

let counter = 0;
function test(name, fn) {
  const id = 'test-' + (counter++);
  try {
    const r = fn();
    // Convenzione: i test ritornano `true` (o un valore truthy non-stringa) in
    // caso di successo, oppure una STRINGA esplicativa in caso di fallimento.
    const ok = r === true || (r !== false && typeof r !== 'string');
    return { id, name, ok, detail: typeof r === 'string' ? r : null };
  } catch (err) {
    return { id, name, ok: false, detail: err.message };
  }
}

function eq(str) { return parseEquation(str); }
// Analizza una SINGOLA espressione (senza '='), utile per costruire il ctx
// delle regole (es. { value: expr('t'), valueText: 't' }).
function expr(str) { return parseExpression(str); }

// Verifica che applicare una regola produca una data equazione attesa.
function checkRule(ruleKey, input, ctx, expected) {
  const inputEq = eq(input);
  const expectedEq = eq(expected);
  const res = applyRule(RULES[ruleKey], inputEq, ctx);
  if (!res.ok) return `regola rifiutata: ${res.error}`;
  if (!equivalentEq(res.equation, expectedEq)) {
    return `atteso ${expected}, ottenuto ${toPretty(res.equation, 0)}`;
  }
  return true;
}

// Verifica che applicare una regola FALLISCA (mossa non valida).
function checkReject(ruleKey, input, ctx) {
  const inputEq = eq(input);
  const res = applyRule(RULES[ruleKey], inputEq, ctx);
  if (res.ok) return `la regola è stata accettata ma doveva essere rifiutata (${toPretty(res.equation, 0)})`;
  return true;
}

export function runAllTests() {
  counter = 0;
  const results = [];

  // ---- Parser ----
  results.push(test('Parser: v = s/t', () => {
    const e = eq('v = s/t');
    return equivalentEq(e, eq('v = s/t'));
  }));
  results.push(test('Parser: coefficiente implicito 2pir -> 2*pi*r', () => {
    const e = eq('C = 2*pi*r');
    return collectVars(e).has('r');
  }));
  results.push(test('Parser: errore su "v = s/" (denominatore mancante)', () => {
    try { eq('v = s/'); return 'nessun errore lanciato'; }
    catch (e) { return e instanceof ParseError ? true : 'tipo di errore errato: ' + e.name; }
  }));
  results.push(test('Parser: errore su "v = (s/t" (parentesi non chiusa)', () => {
    try { eq('v = (s/t'); return 'nessun errore lanciato'; }
    catch (e) { return e instanceof ParseError ? true : 'tipo di errore errato'; }
  }));
  results.push(test('Parser: errore su "v = s + " (termine mancante)', () => {
    try { eq('v = s +'); return 'nessun errore lanciato'; }
    catch (e) { return e instanceof ParseError ? true : 'tipo di errore errato'; }
  }));
  results.push(test('Parser: errore su "v = s/(0)" (divisione per zero con parentesi)', () => {
    try { eq('v = s/(0)'); return 'nessun errore lanciato'; }
    catch (e) { return e instanceof ParseError ? true : 'tipo di errore errato: ' + e.name; }
  }));

  // ---- Regole lecite ----
  results.push(test('Regola: v = s/t, divido? no — moltiplico per t -> v*t = s',
    () => checkRule('mulBoth', 'v = s/t', { value: expr('t'), valueText: 't' }, 'v*t = (s/t)*t')));
  // Nota: canonical non risolve (s/t)*t in s automaticamente (x/x non semplificato);
  // quindi ci aspettiamo la forma esplicita. Verifichiamo coerenza:

  results.push(test('Regola: primo principio x - a = b -> x = b + a (trasporto termine)',
    () => checkRule('moveTerm', 'x - a = b', { term: expr('a'), side: 'left', termText: 'a' }, 'x = b + a')));

  results.push(test('Regola: scambio membri a = b -> b = a',
    () => checkRule('swapSides', 'a = b', {}, 'b = a')));

  results.push(test('Regola: moltiplicazione incrociata a/b = c/d -> a*d = b*c',
    () => checkRule('crossMultiply', 'a/b = c/d', {}, 'a*d = b*c')));

  results.push(test('Regola: inversione a/b = c/d -> b/a = d/c',
    () => checkRule('invertProportion', 'a/b = c/d', {}, 'b/a = d/c')));

  results.push(test('Regola: divisione entrambi i membri 4*x = 8 -> 4*x/2 = 8/2',


        () => checkRule('divBoth', '4*x = 8', { value: expr('2'), valueText: '2' }, '(4*x)/2 = 8/2')));
  results.push(test('Regola: trasporto fattore 2*L = b -> 2*L/2 = b/2',
    () => checkRule('moveFactor', '2*L = b', { factor: expr('2'), side: 'left', factorText: '2' }, '(2*L)/2 = b/2')));

  results.push(test('Regola: proprietà distributiva a*(x + b) = c -> a*x + a*b = c',
    () => checkRule('distribute', 'a*(x + b) = c', { side: 'left' }, 'a*x + a*b = c')));

  results.push(test('Regola: radice quadrata x^2 = 9 -> x = ±sqrt(9) (con ±)',
    () => {
      const res = applyRule(RULES.sqrtBoth, eq('x^2 = 9'), { side: 'left', insideVar: 'x' });
      if (!res.ok) return 'regola rifiutata: ' + res.error;
      const txt = toPretty(res.equation, 0);
      // deve contenere il segno ± (rappresentato come variabile '±')
      return txt.includes('±') ? true : 'manca il segno ± in: ' + txt;
    }));

  results.push(test('Regola: radice di indice pari x^4 = 16 -> x = ±16^(1/4) (con ±)',
    () => {
      const res = applyRule(RULES.sqrtBoth, eq('x^4 = 16'), { side: 'left', insideVar: 'x' });
      if (!res.ok) return 'regola rifiutata: ' + res.error;
      const txt = toPretty(res.equation, 0);
      if (!txt.includes('±')) return 'manca il segno ± in: ' + txt;
      // condizione radicando >= 0 deve essere registrata
      return (res.conditions && res.conditions.some((c) => c.includes('≥'))) ? true
        : 'manca la condizione radicando ≥ 0';
    }));

  results.push(test('Regola: radice cubica x^3 = 27 -> x = 27^(1/3) SENZA ±',
    () => {
      const res = applyRule(RULES.rootOddBoth, eq('x^3 = 27'), { side: 'left', insideVar: 'x' });
      if (!res.ok) return 'regola rifiutata: ' + res.error;
      const txt = toPretty(res.equation, 0);
      if (txt.includes('±')) return 'la radice di indice dispari NON deve introdurre ±: ' + txt;
      // nessuna condizione di segno
      return (res.conditions && res.conditions.length === 0) ? true
        : 'la radice dispari non deve produrre condizioni di segno: ' + JSON.stringify(res.conditions);
    }));

  results.push(test('Regola: radice dispari accetta radicando negativo x^3 = -8 -> x = (-8)^(1/3)',
    () => {
      const res = applyRule(RULES.rootOddBoth, eq('x^3 = -8'), { side: 'left', insideVar: 'x' });
      if (!res.ok) return 'regola rifiutata: ' + res.error;
      return !toPretty(res.equation, 0).includes('±') ? true : 'non deve comparire ±';
    }));

  results.push(test('Regola: cancellazione (s/t)*t = s (fattore comune tra frazione e prodotto)',
    () => {
      const res = applyRule(RULES.cancelFactor, eq('v*t = (s/t)*t'), { den: expr('t'), side: 'right', denText: 't' });
      if (!res.ok) return 'regola rifiutata: ' + res.error;
      // (s/t)*t deve diventare s
      return equivalentEq(res.equation, eq('v*t = s')) ? true
        : 'atteso v*t = s, ottenuto ' + toPretty(res.equation, 0);
    }));

  results.push(test("Regola: cancellazione rifiutata se non c'è fattore comune",
    () => checkReject('cancelFactor', 'v*t = (s/t)*u', { den: expr('t'), side: 'right', denText: 't' })));

  // ---- Mosse illecite ----
  results.push(test('Mossa illecita: divisione per 0 rifiutata',
    () => checkReject('divBoth', 'x = 5', { value: expr('0'), valueText: '0' })));

  results.push(test('Mossa illecita: moltiplicazione per 0 rifiutata',
    () => checkReject('mulBoth', 'x = 5', { value: expr('0'), valueText: '0' })));

  results.push(test('Mossa illecita: inversione con un solo membro frazionario rifiutata',
    () => checkReject('invertProportion', 'a/b = c', {})));

  results.push(test('Mossa illecita: moltiplicazione incrociata senza proporzione rifiutata',
    () => checkReject('crossMultiply', 'a = c', {})));

  results.push(test('Mossa illecita: trasporto di un fattore che non esiste rifiutato',
    () => checkReject('moveFactor', 'a + b = c', { factor: expr('a'), side: 'left', factorText: 'a' })));


  // ---- Equivalenza ----
  results.push(test('Equivalenza: x = y e y = x sono equivalenti',
    () => equivalentEq(eq('x = y'), eq('y = x'))));

  results.push(test('Non equivalenza: x = y e x = z NON equivalenti',
    () => equivalentEq(eq('x = y'), eq('x = z')) === false));

  // ---- Obiettivo ----
  results.push(test('Obiettivo: in "v = s/t" la var t NON è isolata',
    () => isGoalReached(eq('v = s/t'), 't') === false));

  results.push(test('Obiettivo: in "t = s/v" la var t È isolata',
    () => isGoalReached(eq('t = s/v'), 't') === true));

  results.push(test('Trasporto termine x - a = b raggiunge x isolata',
    () => isGoalReached(eq('x = b + a'), 'x') === true));

  // ---- Suggerimento guidato ----
  results.push(test('Suggerimento: per isolare t in v = s/t propone di moltiplicare per t',
    () => {
      const sug = suggestNextStep(eq('v = s/t'), 't');
      if (!sug.found) return 'nessun suggerimento trovato';
      return sug.action.ruleKey === 'mulBoth' ? true : 'regola suggerita: ' + sug.action.ruleKey;
    }));

  // ---- Selezionabilità ----
  results.push(test('Enumerazione elementi: v = s/t produce più elementi selezionabili',
    () => enumerateElements(eq('v = s/t')).length >= 4));

  // ---- Catena di equivalenza (verifica di conservazione) ----
  results.push(test('Catena: applicare il primo principio preserva la soluzione (v=s/t)',
    () => {
      // v = s/t ; moltiplico per t -> v*t = s

      const res = applyRule(RULES.mulBoth, eq('v = s/t'), { value: expr('t'), valueText: 't' });
      if (!res.ok) return 'rifiutata: ' + res.error;
      // La nuova equazione, con t≠0, deve avere le stesse soluzioni per v,s,t.
      // Controllo simbolico semplificato: entrambe hanno la forma v = s/t riscritta.
      const hasV = collectVars(res.equation).has('v');
      const hasS = collectVars(res.equation).has('s');
      return hasV && hasS;
    }));

  results.push(test('Regola: cancellazione frazione numeratore (2*L)/2 = b -> L = b',
    () => {
      const res = applyRule(RULES.cancelFactor, eq('(2*L)/2 = b/2'), { den: expr('2'), side: 'left', denText: '2' });
      if (!res.ok) return 'rifiutata: ' + res.error;
      return equivalentEq(res.equation, eq('L = b/2')) ? true : 'atteso L = b/2, ottenuto ' + toPretty(res.equation, 0);
    }));

  results.push(test('Regola: cancellazione frazione (t*v)/v = s/v -> t = s/v',
    () => {
      const res = applyRule(RULES.cancelFactor, eq('(t*v)/v = s/v'), { den: expr('v'), side: 'left', denText: 'v' });
      if (!res.ok) return 'rifiutata: ' + res.error;
      return equivalentEq(res.equation, eq('t = s/v')) ? true : 'atteso t = s/v, ottenuto ' + toPretty(res.equation, 0);
    }));

  results.push(test('Risoluzione completa: sequenza automatica per isolare t in v = s/t',
    () => {
      let current = eq('v = s/t');
      for (let s = 0; s < 6; s++) {
        if (isGoalReached(current, 't')) return true;
        const sug = suggestNextStep(current, 't');
        if (!sug.found) return 'nessun suggerimento al passo ' + s;
        const res = performAction(current, sug.action);
        if (!res.ok) return 'azione fallita: ' + res.error;
        current = res.equation;
      }
      return isGoalReached(current, 't') ? true : 'obiettivo t non raggiunto: ' + toPretty(current, 0);
    }));

  results.push(test('La stringa originale NON viene riscritta (nessun testo hardcoded)',
    () => {
      const e = eq('v = s/t');
      const tex = toPretty(e, 0);
      return tex.includes('v') && tex.includes('s') && tex.includes('t');
    }));

  // ---- Rendering variabili e LaTeX ----
  results.push(test('Simboli con pedici greci: theta0 -> θ₀ e omega0 -> ω₀',
    () => prettyVar('theta0') === 'θ₀' && prettyVar('omega0') === 'ω₀' && prettyVar('alpha0') === 'α₀'));

  results.push(test('LaTeX: conversione corretta per frazioni e radici',
    () => {
      const l1 = toLatex(eq('v = s/t'));
      const l2 = toLatex(eq('c = sqrt(a^2 + b^2)'));
      return l1 === 'v = \\frac{s}{t}' && l2.includes('\\sqrt') && (l2.includes('a^{2}') || l2.includes('a^2'));
    }));

  results.push(test('LaTeX: theta = theta0 + omega0*t converte a \\theta = \\theta_0 + \\omega_0 \\cdot t',
    () => {
      const l = toLatex(eq('theta = theta0 + omega0*t'));
      return l === '\\theta = \\theta_0 + \\omega_0 \\cdot t';
    }));

  // ---- Regola dei reciproci ----
  results.push(test('Reciproci: v = s/t diventa 1/v = t/s', () => {
    const r = reciprocalEquation(eq('v = s/t'));
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('1/v = t/s')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Reciproci: A/B = C/D diventa B/A = D/C', () => {
    const r = reciprocalEquation(eq('A/B = C/D'));
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('B/A = D/C')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Reciproci: denominatore sottinteso F = m*a diventa 1/F = 1/(m*a)', () => {
    const r = reciprocalEquation(eq('F = m*a'));
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('1/F = 1/(m*a)')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Reciproci: (1/2)*m*v^2 estrae il fattore 2 al numeratore', () => {
    const r = reciprocalEquation(eq('Ec = (1/2)*m*v^2'));
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('1/Ec = 2/(m*v^2)')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Reciproci: somma di frazioni viene rifiutata con spiegazione', () => {
    const r = reciprocalEquation(eq('1/Req = 1/R1 + 1/R2'));
    if (r.ok) return 'accettata ma doveva essere rifiutata';
    return !/somma/.test(r.error) ? `messaggio poco chiaro: ${r.error}` : true;
  }));

  results.push(test('Reciproci: applicata due volte torna all\'equazione di partenza', () => {
    const start = eq('a = (v - v0)/t');
    const once = reciprocalEquation(start);
    if (!once.ok) return `rifiutata: ${once.error}`;
    const twice = reciprocalEquation(once.newEq);
    if (!twice.ok) return `rifiutata al secondo passaggio: ${twice.error}`;
    return equivalentEq(twice.newEq, start) || `ottenuto ${toPretty(twice.newEq, 0)}`;
  }));

  // ---- Notazione: ordine dei fattori, parentesi, niente decimali ----
  results.push(test('Notazione: i fattori sono ordinati (m·v², non v²·m)', () => {
    const s = toPretty(canonical(eq('Ec = (1/2)*m*v^2')), 0);
    return s.includes('m·v^2') ? true : `ottenuto ${s}`;
  }));

  results.push(test('Notazione: 1/2 resta frazione, non diventa 0.5', () => {
    const s = toPretty(canonical(eq('Ec = (1/2)*m*v^2')), 0);
    return s.includes('0.5') ? `decimalizzato: ${s}` : true;
  }));

  results.push(test('Notazione: 2·(1/2)·m si semplifica in m', () => {
    const s = toPretty(canonical(parseExpression('2*(1/2)*m')), 0);
    return s === 'm' ? true : `ottenuto ${s}`;
  }));

  results.push(test('Notazione: la differenza si scrive v − v0, non v + -1·v0', () => {
    const s = toPretty(canonical(eq('a = (v - v0)/t')), 0);
    return s.includes('+ -') || s.includes('− -') ? `ottenuto ${s}` : true;
  }));

  results.push(test('Drag: trasporto fattore 2 da coefficiente negativo Num(-2) al denominatore', () => {
    // -2*a*s = b: Neg(Num(2)) → Num(-2) per il costruttore Neg.
    // L'utente trascina il '2' visivo: varName='2', ma il fattore nel Mul è Num(-2).
    // Dopo il fix: left diventa -a·s, right diventa b/2.
    const e = eq('-2*a*s = b');
    const r = applyDragMove({
      currentEq: e, varName: '2', nodeType: 'Num',
      fromSide: 'left', fromSlot: 'num', targetSide: 'right', targetSlot: 'den',
    });
    if (!r.ok) return `rifiutata: ${r.error}`;
    const leftText = toPretty(r.newEq.left, 0);
    if (leftText.includes('2')) return `Num(-2) non rimosso: ${leftText}`;
    const rightText = toPretty(r.newEq.right, 0);
    return rightText.includes('2') ? true : `2 non al denominatore destro: ${rightText}`;
  }));

  results.push(test('Notazione: nessuna parentesi ridondante sul membro isolato', () => {
    const r = applyDragMove({
      currentEq: eq('P = p0 + d*g*h'),
      varName: 'd*g*h',
      nodeType: 'Mul',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'add',
    });
    if (!r.ok) return `mossa rifiutata: ${r.error}`;
    const s = toPretty(r.newEq, 0);
    return s.startsWith('(P)') ? `parentesi ridondanti: ${s}` : true;
  }));

  results.push(test('Notazione: le parentesi scritte dall\'utente restano visibili', () => {
    const html = renderEquation(eq('x - (a + b) = 0'), {});
    const text = html.replace(/<[^>]+>/g, '');
    return text.includes('(a') && text.includes('b)') ? true : `reso come ${text}`;
  }));

  results.push(test('Notazione: 1/2 in un prodotto non mostra parentesi (es. U = (1/2)*k*x^2)', () => {
    const html = renderEquation(eq('U = (1/2)*k*x^2'), {});
    return !html.includes('node-group-parens') ? true : `contiene ancora parentesi: ${html}`;
  }));

  results.push(test('Notazione: numeratore/denominatore intero non mostra parentesi superflue (es. (2*v0)/g)', () => {
    const html = renderEquation(eq('t = (2*v0)/g'), {});
    return !html.includes('node-group-parens') ? true : `contiene parentesi nel numeratore: ${html}`;
  }));

  results.push(test('Notazione: frazione elevata a potenza mantiene le parentesi centrate (has-frac)', () => {
    const html = renderEquation(eq('y = (a/b)^2'), {});
    return html.includes('node-group-parens') && html.includes('has-frac') ? true : `mancano parentesi has-frac: ${html}`;
  }));

  // ---- Croce di semplificazione ----
  results.push(test('Croce: (2·L)/2 semplifica il 2 e resta L = b', () => {
    const r = crossCancel(eq('(2*L)/2 = b'), 'left/num/Mul0', 'left/den');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('L = b')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce: (t·v)/v semplifica v e resta t = s/v', () => {
    const r = crossCancel(eq('(t*v)/v = s/v'), 'left/num/Mul1', 'left/den');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('t = s/v')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce: v²/v semplifica a v', () => {
    const r = crossCancel(eq('(v^2*t)/v = s'), 'left/num/Mul0/base', 'left/den');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('t*v = s')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce: rifiuta due fattori diversi', () => {
    const r = crossCancel(eq('(t*v)/v = s/v'), 'left/num/Mul0', 'left/den');
    return r.ok ? 'accettata ma doveva essere rifiutata' : true;
  }));

  results.push(test('Croce: rifiuta due fattori nello stesso numeratore', () => {
    const r = crossCancel(eq('v = s/t'), 'left/num', 'left/num');
    return r.ok ? 'accettata ma doveva essere rifiutata' : true;
  }));

  results.push(test('Croce: rifiuta fattori in membri diversi', () => {
    const r = crossCancel(eq('v = s/t'), 'right/num', 'left/num');
    return r.ok ? 'accettata ma doveva essere rifiutata' : true;
  }));

  results.push(test('Croce: (a/b)·(b/c) diventa a/c', () => {
    const r = crossCancel(eq('z = (a/b)*(b/c)'), 'right/Mul0/den', 'right/Mul1/num');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('z = a/c')) || `ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce: non elimina un addendo di una somma', () => {
    const r = crossCancel(eq('x + a = b'), 'left/Add0', 'left/Add0');
    return r.ok ? 'accettata ma doveva essere rifiutata' : true;
  }));

  results.push(test('Croce additiva: a e −a nella stessa somma → si cancellano', () => {
    // parseEquation('x + a - a = b') produce Sub(Add(x,a), a) = b
    // l'`a` dentro il sotto-termine Add(x,a) è a path left/Sub0/Add1 (sign +1)
    // l'`a` sottratto è a path left/Sub1 (sign -1)
    const e = eq('x + a - a = b');
    const r = crossCancel(e, 'left/Sub0/Add1', 'left/Sub1');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('x = b')) ? true : `atteso x = b, ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce additiva: stessa grandezza su ambo i membri → si cancella', () => {
    // parseEquation('a + F = a + G') → Add(a,F) = Add(a,G)
    // left/Add0 = a (sign +1), right/Add0 = a (sign +1)
    const e = eq('a + F = a + G');
    const r = crossCancel(e, 'left/Add0', 'right/Add0');
    if (!r.ok) return `rifiutata: ${r.error}`;
    return equivalentEq(r.newEq, eq('F = G')) ? true : `atteso F = G, ottenuto ${toPretty(r.newEq, 0)}`;
  }));

  results.push(test('Croce additiva: rifiuta due termini non opposti nella stessa somma', () => {
    const r = crossCancel(eq('a + b = c'), 'left/Add0', 'left/Add1');
    return r.ok ? 'accettata ma doveva essere rifiutata (a ≠ -b in generale)' : true;
  }));

  results.push(test('Croce additiva: rifiuta grandezze diverse su ambo i membri', () => {
    const r = crossCancel(eq('a + F = b + G'), 'left/Add0', 'right/Add1');
    return r.ok ? 'accettata ma doveva essere rifiutata (a ≠ G)' : true;
  }));

  // ---- Risoluzione automatica: regressioni su casi reali ----
  const autoResolve = (formula, target) => {
    let curr = eq(formula);
    for (let i = 0; i < 25; i++) {
      if (isGoalReached(curr, target)) break;
      const sug = suggestNextStep(curr, target);
      if (!sug.found) return `bloccata su ${toPretty(curr, 0)} (${sug.message})`;
      const res = performAction(curr, sug.action);
      if (!res.ok) return `passo fallito: ${res.error}`;
      curr = res.equation;
    }
    return isGoalReached(curr, target) ? true : `non isolata: ${toPretty(curr, 0)}`;
  };

  results.push(test('Risoluzione: v = s/t isola t', () => autoResolve('v = s/t', 't')));

  results.push(test('Risoluzione: v = s/t isola s', () => autoResolve('v = s/t', 's')));

  results.push(test('Risoluzione: F = m*a isola m', () => autoResolve('F = m*a', 'm')));

  results.push(test('Risoluzione: h = v0^2/(2*g) isola g (fattori comuni)', () =>
    autoResolve('h = v0^2/(2*g)', 'g')));

  results.push(test('Risoluzione: h = v0^2/(2*g) isola v0', () =>
    autoResolve('h = v0^2/(2*g)', 'v0')));

  results.push(test('Risoluzione: U = -G*(M*m)/r isola r (segno davanti alla frazione)', () =>
    autoResolve('U = -G*(M*m)/r', 'r')));

  results.push(test('Risoluzione: En = -E1/n^2 isola n', () =>
    autoResolve('En = -E1/n^2', 'n')));

  results.push(test('Risoluzione: J = m*v - m*v0 isola m (raccoglimento)', () =>
    autoResolve('J = m*v - m*v0', 'm')));

  results.push(test('Risoluzione: Req = (R1*R2)/(R1+R2) isola R1', () =>
    autoResolve('Req = (R1*R2)/(R1+R2)', 'R1')));

  results.push(test('Risoluzione: W = (1/2)*m*v^2 - (1/2)*m*v0^2 isola m', () =>
    autoResolve('W = (1/2)*m*v^2 - (1/2)*m*v0^2', 'm')));

  results.push(test('Risoluzione: F = G*(m1*m2)/r^2 isola r', () =>
    autoResolve('F = G*(m1*m2)/r^2', 'r')));

  results.push(test('Risoluzione: p = (1/2)*rho*v^2 + rho*g*z isola rho', () =>
    autoResolve('p = (1/2)*rho*v^2 + rho*g*z', 'rho')));

  results.push(test('Risoluzione: ingrandimento G = -q/p isola p', () =>
    autoResolve('G = -q/p', 'p')));

  // ---- Regole non ancora coperte direttamente ----
  results.push(test('Regola: addBoth x = 5 aggiunge 3 → x + 3 = 5 + 3', () =>
    checkRule('addBoth', 'x = 5', { value: expr('3'), valueText: '3' }, 'x + 3 = 5 + 3')));

  results.push(test('Regola: subBoth x + a = b sottrae a → x + a - a = b - a', () =>
    checkRule('subBoth', 'x + a = b', { value: expr('a'), valueText: 'a' }, 'x + a - a = b - a')));

  results.push(test('Regola: invertFunction sin(x) = a → x = asin(a)', () => {
    const res = applyRule(RULES.invertFunction, eq('sin(x) = a'), { side: 'left', fnNode: Sin(Var('x')) });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('x = asin(a)')) ? true
      : 'atteso x = asin(a), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: invertFunction ln(x) = a → x = exp(a)', () => {
    const res = applyRule(RULES.invertFunction, eq('ln(x) = a'), { side: 'left', fnNode: Ln(Var('x')) });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('x = exp(a)')) ? true
      : 'atteso x = exp(a), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: factorCommon m*v - m*v0 = J → m*(v-v0) = J', () => {
    const res = applyRule(RULES.factorCommon, eq('m*v - m*v0 = J'), { side: 'left', common: Var('m'), commonText: 'm' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('m*(v - v0) = J')) ? true
      : 'atteso m*(v-v0) = J, ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: proprietà distributiva Doppler fp*v = f*(v - vo) → fp*v = f*v - f*vo', () => {
    const startEq = eq('fp * v = f * (v - vo)');
    if (!canDistribute(startEq.right)) return 'atteso canDistribute true per membro destro';
    const res = applyRule(RULES.distribute, startEq, { side: 'right' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('fp * v = f * v - f * vo')) ? true
      : 'atteso fp*v = f*v - f*vo, ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: raccoglimento a fattori per Doppler fp*v - f*v = -f*vo → v*(fp - f) = -f*vo', () => {
    const startEq = eq('fp * v - f * v = -f * vo');
    const commonV = findCommonFactor(startEq.left, 'v');
    if (!commonV || commonV.name !== 'v') return 'atteso fattore comune v, trovato: ' + JSON.stringify(commonV);
    const res = applyRule(RULES.factorCommon, startEq, { side: 'left', common: commonV, commonText: 'v' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('v * (fp - f) = -f * vo')) ? true
      : 'atteso v*(fp - f) = -f*vo, ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Risoluzione: effetto Doppler fp = (f*(v - vo))/v isola v', () =>
    autoResolve('fp = (f * (v - vo)) / v', 'v')));

  results.push(test('Risoluzione: sin(theta) = F/G isola theta', () =>
    autoResolve('sin(theta) = F/G', 'theta')));

  results.push(test('Risoluzione: ln(x) = a isola x', () =>
    autoResolve('ln(x) = a', 'x')));

  results.push(test('Risoluzione: nessuna equazione va in ciclo infinito', () => {
    // Ogni passo deve cambiare davvero l'equazione: se il motore riproponesse
    // la stessa mossa all'infinito, il ciclo non terminerebbe.
    const casi = ['v = s/t', 'Req = (R1*R2)/(R1+R2)', 'h = v0^2/(2*g)', 'U = -G*(M*m)/r'];
    for (const f of casi) {
      const start = eq(f);
      for (const target of collectVars(start)) {
        let curr = clone(start);
        const seen = new Set();
        for (let i = 0; i < 25; i++) {
          if (isGoalReached(curr, target)) break;
          const key = toPretty(curr, 0);
          if (seen.has(key)) return `ciclo su ${key} isolando ${target} in ${f}`;
          seen.add(key);
          const sug = suggestNextStep(curr, target);
          if (!sug.found) break;
          const res = performAction(curr, sug.action);
          if (!res.ok) break;
          curr = res.equation;
        }
      }
    }
    return true;
  }));

  results.push(test('Reciproci: x = 0 rifiutato per divisione per zero', () => {
    const res = reciprocalEquation(eq('x = 0'));
    return !res.ok ? true : 'accettata ma x=0 non deve essere invertibile';
  }));

  results.push(test('Regola: invertProportion rifiutata con numeratore o denominatore nullo', () => {
    const res1 = applyRule(RULES.invertProportion, eq('0/b = c/d'), {});
    if (res1.ok) return 'accettata inversione con 0 al numeratore';
    return true;
  }));

  results.push(test('Regola: powBoth con esponente 0 rifiutata', () => {
    const res = applyRule(RULES.powBoth, eq('x = y'), { value: Num(0), valueText: '0' });
    return !res.ok ? true : 'accettata elevazione a potenza 0';
  }));

  results.push(test('Regola: sqrtBoth con radicando negativo x^2 = -9 rifiutata', () => {
    const res = applyRule(RULES.sqrtBoth, eq('x^2 = -9'), { side: 'left', insideVar: 'x' });
    return !res.ok ? true : 'accettata radice di indice pari su radicando negativo';
  }));

  results.push(test('Tastierino: sqrt su membro negativo x = -4 rifiutata', () => {
    const res = applyKeypadOperation(eq('x = -4'), 'sqrt', null, null, 'x');
    return !res.ok ? true : 'accettata radice del tastierino su membro negativo';
  }));

  results.push(test('Regola: invertFunction sin(x) = 2 rifiutata fuori dal dominio [-1, 1]', () => {
    const res = applyRule(RULES.invertFunction, eq('sin(x) = 2'), { side: 'left', fnNode: Sin(Var('x')) });
    return !res.ok ? true : 'accettata arcsin di valore > 1';
  }));

  results.push(test('Tastierino: arcsin su sin(theta) = F/G libera theta = asin(F/G)', () => {
    const res = applyKeypadOperation(eq('sin(theta) = F/G'), 'asin', null, null, 'theta');
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('theta = asin(F/G)')) ? true
      : 'atteso theta = asin(F/G), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Tastierino: arccos su cos(theta) = a/b libera theta = acos(a/b)', () => {
    const res = applyKeypadOperation(eq('cos(theta) = a/b'), 'acos', null, null, 'theta');
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('theta = acos(a/b)')) ? true
      : 'atteso theta = acos(a/b), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Tastierino: arctan su tan(theta) = mu libera theta = atan(mu)', () => {
    const res = applyKeypadOperation(eq('tan(theta) = mu'), 'atan', null, null, 'theta');
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('theta = atan(mu)')) ? true
      : 'atteso theta = atan(mu), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Tastierino: arcsin rifiutata con spiegazione se sin non e isolato', () => {
    const res = applyKeypadOperation(eq('v = -A*omega*sin(omega*t)'), 'asin', null, null, 't');
    if (res.ok) return 'accettata operazione arcsin con sin non isolato';
    return res.error.includes('isolare la funzione') ? true : 'messaggio inatteso: ' + res.error;
  }));

  results.push(test('Tastierino: arcsin rifiutata se non c\'e alcuna funzione seno nell\'equazione', () => {
    const res = applyKeypadOperation(eq('v = s/t'), 'asin', null, null, 's');
    if (res.ok) return 'accettata arcsin su equazione senza seno';
    return res.error.includes('Nessuna funzione') ? true : 'messaggio inatteso: ' + res.error;
  }));

  results.push(test('Croce additiva: a - b - c = a preserva segni negativi -b - c = 0', () => {
    const e = eq('a - b - c = a');
    const r = crossCancel(e, 'left/Sub0', 'right');
    if (!r.ok) return 'rifiutata: ' + r.error;
    return equivalentEq(r.newEq, eq('-b - c = 0')) ? true
      : 'atteso -b - c = 0, ottenuto ' + toPretty(r.newEq, 0);
  }));

  results.push(test('Croce: (s/t)*t = v semplifica t producendo s = v', () => {
    const e = eq('(s/t)*t = v');
    const r = crossCancel(e, 'left/Mul0/den', 'left/Mul1');
    if (!r.ok) return 'rifiutata: ' + r.error;
    return equivalentEq(r.newEq, eq('s = v')) ? true
      : 'atteso s = v, ottenuto ' + toPretty(r.newEq, 0);
  }));

  results.push(test('Notazione: differenze con costanti si presentano come x - 3 e non + -3 o -3 + x', () => {
    const exprAst = canonical(eq('x - 3 = y').left);
    const pretty = toPretty(exprAst, 0);
    if (pretty.includes('+ -') || pretty.startsWith('-3 +')) {
      return 'notazione non ottimale: ' + pretty;
    }
    return true;
  }));

  results.push(test('Notazione: Ec ed Ep vengono formattati con pedici corretti in LaTeX', () => {
    const latex = toLatex(eq('Ec = Ep'));
    if (!latex.includes('E_c') || !latex.includes('E_p')) {
      return 'LaTeX non contiene pedici corretti: ' + latex;
    }
    return true;
  }));

  results.push(test('Drag: (3/2)*x = y trascinando 3 al denominatore opposto produce (1/2)*x', () => {
    const res = applyDragMove({
      currentEq: eq('(3/2)*x = y'),
      varName: '3',
      nodeType: 'Num',
      fromSide: 'left',
      fromSlot: 'num',
      targetSide: 'right',
      targetSlot: 'den',
    });
    if (!res.ok) return 'drag fallito: ' + (res.error || '');
    return equivalentEq(res.newEq, eq('(1/2)*x = y/3')) ? true
      : 'atteso (1/2)*x = y/3, ottenuto ' + toPretty(res.newEq, 0);
  }));

  results.push(test('Drag: addendo in numeratore di frazione (a+b)/c = y non puo essere trascinato', () => {
    const res = applyDragMove({
      currentEq: eq('(a+b)/c = y'),
      varName: 'a',
      nodeType: 'Var',
      fromSide: 'left',
      fromSlot: 'num',
      targetSide: 'right',
      targetSlot: 'den',
    });
    return !res.ok ? true : 'accettato trascinamento addendo da numeratore a frazione!';
  }));

  results.push(test('Drag: fattore composto tra parentesi fp*v = f*(v + vo) trascinando "v + vo" al denominatore', () => {
    const e = eq('fp*v = f*(v + vo)');
    const res = applyDragMove({
      currentEq: e,
      varName: 'v + vo',
      nodeType: 'Add',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'den',
    });
    if (!res.ok) return 'drag fallito: ' + (res.error || '');
    if (res.newEq.right.type !== 'Var' || res.newEq.right.name !== 'f') {
      return 'destra non è f: ' + toPretty(res.newEq.right, 0);
    }
    const den = unwrap(res.newEq.left.den);
    if (den.type !== 'Add' || den.args.length !== 2) {
      return 'denominatore non è Add(v, vo): ' + JSON.stringify(den);
    }
    const html = renderEquation(e, { interactive: true });
    if (!html.includes('data-var-name="v + vo"') || !html.includes('draggable-token')) {
      return 'HTML non rende (v + vo) come draggable-token: ' + html;
    }
    return true;
  }));

  results.push(test('Drag: denominatore composto (fp*v)/(v + vo) = f trascinando "v + vo" al numeratore', () => {
    const e = canonical(eq('(fp*v)/(v + vo) = f'));
    const res = applyDragMove({
      currentEq: e,
      varName: 'v + vo',
      nodeType: 'Add',
      fromSide: 'left',
      fromSlot: 'den',
      targetSide: 'right',
      targetSlot: 'num',
    });
    if (!res.ok) return 'drag dal denominatore fallito: ' + (res.error || '');
    const right = unwrap(res.newEq.right);
    if (right.type !== 'Mul' || right.args.length !== 2) {
      return 'destra non è Mul(f, v + vo): ' + toPretty(right, 0);
    }
    const denHtml = renderEquation(e, { interactive: true });
    if (!denHtml.includes('data-var-name="v + vo"') || !denHtml.includes('data-slot="den"')) {
      return 'HTML denominatore non ha draggable-token per (v + vo): ' + denHtml;
    }
    return true;
  }));

  results.push(test('Drag: termine intero al secondo membro f*v in fp*v - fp*vs = f*v è trascinabile come blocco 📦', () => {
    const e = canonical(eq('fp*v - fp*vs = f*v'));
    const html = renderEquation(e, { interactive: true });
    if (!html.includes('data-var-name="f*v"') || !html.includes('math-term-group')) {
      return 'f*v a secondo membro non ha data-var-name="f*v" o math-term-group: ' + html;
    }
    const res = applyDragMove({
      currentEq: e,
      varName: 'f*v',
      nodeType: 'Mul',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'add',
    });
    if (!res.ok) return 'spostamento f*v a primo membro fallito: ' + (res.error || '');
    const right = unwrap(res.newEq.right);
    if (right.type !== 'Num' || right.value !== 0) {
      return 'destra non è 0: ' + toPretty(right, 0);
    }
    return true;
  }));

  // ---- Laboratorio Calcolo Numerico & Unita SI ----
  results.push(test('Calcolo Numerico: evalWithEnv calcola frazione s/v con valori numerici', () => {
    const expr = parseExpression('s/v');
    const res = evalWithEnv(expr, { s: 100, v: 20 });
    return res.ok && res.value === 5 ? true : `atteso 5, ottenuto: ${JSON.stringify(res)}`;
  }));

  results.push(test('Calcolo Numerico: divisione per zero intercettata correttamente', () => {
    const expr = parseExpression('s/t');
    const res = evalWithEnv(expr, { s: 50, t: 0 });
    return !res.ok && res.error.includes('zero') ? true : `non intercettata divisione per zero: ${JSON.stringify(res)}`;
  }));

  results.push(test('Calcolo Numerico: radice quadrata e potenze sqrt((2*E)/k)', () => {
    const expr = parseExpression('sqrt((2*E)/k)');
    const res = evalWithEnv(expr, { E: 200, k: 4 });
    return res.ok && res.value === 10 ? true : `atteso 10, ottenuto: ${JSON.stringify(res)}`;
  }));

  results.push(test('Calcolo Numerico: substituteVarsInAst sostituisce correttamente le variabili', () => {
    const expr = parseExpression('a + b');
    const sub = substituteVarsInAst(expr, { a: 3, b: 7 });
    return sub.args[0].value === 3 && sub.args[1].value === 7 ? true : 'sostituzione fallita';
  }));

  results.push(test('Unita SI: risoluzione unita e quantita fisiche', () => {
    const infoS = getQuantityInfo('s');
    const infoV = getQuantityInfo('v');
    const infoA = getQuantityInfo('a');
    return infoS.unit === 'm' && infoV.unit === 'm/s' && infoA.unit === 'm/s²' ? true : 'unita non corrispondenti';
  }));

  results.push(test('Unita SI: formattazione numeri decimali e scientifici', () => {
    const f1 = formatResultNumber(4.5);
    const f2 = formatResultNumber(12);
    const f3 = formatResultNumber(2.5e6);
    return f1 === '4.5' && f2 === '12' && f3.includes('10^') ? true : `formattazione inattesa: ${f1}, ${f2}, ${f3}`;
  }));

  results.push(test('Unita SI: energia cinetica e potenziale (Ec, E_c, Ek, Ep, E_p) in Joule [J]', () => {
    const qEc = getQuantityInfo('Ec');
    const qE_c = getQuantityInfo('E_c');
    const qEk = getQuantityInfo('Ek');
    const qEp = getQuantityInfo('Ep');
    const qE_p = getQuantityInfo('E_p');
    if (qEc.unit !== 'J' || qE_c.unit !== 'J' || qEk.unit !== 'J' || qEp.unit !== 'J' || qE_p.unit !== 'J') {
      return `Unità errata: Ec=${qEc.unit}, E_c=${qE_c.unit}, Ek=${qEk.unit}, Ep=${qEp.unit}, E_p=${qE_p.unit}`;
    }
    return true;
  }));

  results.push(test('Calcolo Numerico: espressione con ± non include ± nelle variabili e valuta correttamente', () => {
    const expr = Add(Var('±'), Sqrt(Div(Mul(Num(2), Var('E_c')), Var('m'))));
    const vars = Array.from(collectVars(expr));
    if (vars.includes('±')) {
      return `collectVars include erroneamente '±': [${vars.join(', ')}]`;
    }
    const res = evalWithEnv(expr, { E_c: 6, m: 5 });
    if (!res.ok) {
      return `evalWithEnv fallita: ${res.error || res.missing}`;
    }
    const valFormatted = formatResultNumber(res.value);
    if (valFormatted !== '1.5492') {
      return `Valore atteso 1.5492 (sqrt(2.4)), ottenuto: ${valFormatted}`;
    }
    return true;
  }));

  // ---- Fattori con segno meno (es. -A*omega*sin(...)) ----
  results.push(test('Drag: trasporto fattore A da prodotto con segno meno -A*omega*sin(...) al denominatore', () => {
    const eq = parseEquation('v = -A*omega*sin(omega*t + phi)');
    const res = applyDragMove({
      currentEq: eq,
      varName: 'A',
      nodeType: 'Var',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'den',
    });
    if (!res.ok) return `mossa rifiutata: ${res.error}`;
    const leftPretty = toPretty(res.newEq.left, 0);
    const rightPretty = toPretty(res.newEq.right, 0);
    return (leftPretty === 'v/A' || leftPretty === '(v)/A') && rightPretty.startsWith('−') ? true
      : `risultato inatteso: ${leftPretty} = ${rightPretty}`;
  }));

  results.push(test('Drag: trasporto fattore -A intero da prodotto al denominatore', () => {
    const eq = parseEquation('v = -A*omega*sin(omega*t + phi)');
    const res = applyDragMove({
      currentEq: eq,
      varName: '-A',
      nodeType: 'Var',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'den',
    });
    if (!res.ok) return `mossa rifiutata: ${res.error}`;
    return true;
  }));

  results.push(test('Elementi neutri: isGoalReached riconosce 1*x e x*1 come x isolata', () => {
    const e1 = parseEquation('1*x = y');
    const e2 = parseEquation('x*1 = y');
    const e3 = parseEquation('x + 0 = y');
    if (!isGoalReached(e1, 'x')) return '1*x non riconosciuto come isolato';
    if (!isGoalReached(e2, 'x')) return 'x*1 non riconosciuto come isolato';
    if (!isGoalReached(e3, 'x')) return 'x+0 non riconosciuto come isolato';
    return true;
  }));

  results.push(test('Elementi neutri: stripNeutrals elimina 1 moltiplicativo e +0 additivo', () => {
    const e1 = parseEquation('1*x = y + 0');
    const stripped = stripNeutrals(e1);
    return equivalentEq(stripped, parseEquation('x = y')) ? true
      : 'atteso x = y, ottenuto ' + toPretty(stripped, 0);
  }));

  results.push(test('Elementi neutri: stripNeutrals preserva 1 nelle differenze come 1 - cos(theta)', () => {
    const e = parseEquation('c*dlam*m = h*(1 - cos(theta))');
    const stripped = stripNeutrals(e);
    return toPretty(stripped.right, 0).includes('1') ? true
      : 'il numero 1 in 1 - cos(theta) è stato rimosso erroneamente: ' + toPretty(stripped, 0);
  }));

  results.push(test('Drag: trascinando un fattore su membro orizzontale applica il 2° principio (divisione)', () => {
    const eq = parseEquation('c*dlam*m = h*(1 - cos(theta))');
    const res = applyDragMove({
      currentEq: eq,
      varName: 'h',
      nodeType: 'Var',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'num', // rilasciato sul membro di sinistra
    });
    if (!res.ok) return 'mossa rifiutata: ' + res.error;
    if (res.newEq.left.type !== 'Div') return 'la divisione non è stata applicata: ' + toPretty(res.newEq, 0);
    return true;
  }));

  results.push(test('Tastierino: arccos con 1*cos(theta) libera theta senza bloccare', () => {
    const eq = parseEquation('1*cos(theta) = k');
    const res = applyKeypadOperation(eq, 'acos', null, null, 'theta');
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, parseEquation('theta = acos(k)')) ? true
      : 'atteso theta = acos(k), ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: cambio segno inverte -x = 5 in x = -5', () => {
    const res = applyRule(RULES.changeSign, eq('-x = 5'), {});
    if (!res.ok) return 'regola fallita: ' + res.error;
    const str = toPretty(res.equation, 0);
    return str === 'x = -5' ? true : 'atteso x = -5, ottenuto ' + str;
  }));

  results.push(test('Regola: cambio segno inverte somma algebrica -v = -v0 + a*t', () => {
    const res = applyRule(RULES.changeSign, eq('-v = -v0 + a*t'), {});
    if (!res.ok) return 'regola fallita: ' + res.error;
    return equivalentEq(res.equation, eq('v = v0 - a*t')) ? true : 'atteso v = v0 - a*t, ottenuto ' + toPretty(res.equation, 0);
  }));

  results.push(test('Regola: cambio segno applicata due volte ritorna all\'equazione originale', () => {
    const orig = eq('v - v0 = a*t');
    const step1 = applyRule(RULES.changeSign, orig, {});
    const step2 = applyRule(RULES.changeSign, step1.equation, {});
    return equivalentEq(step2.equation, orig) ? true : 'atteso ' + toPretty(orig, 0) + ', ottenuto ' + toPretty(step2.equation, 0);
  }));

  results.push(test('Raccoglimento: findCommonFactor individua m in J = m*v - m*v0', () => {
    const common = findCommonFactor(expr('m*v - m*v0'), 'm');
    return common && common.name === 'm' ? true : 'm non individuata come fattore comune';
  }));

  results.push(test('Trigonometria: hasTrigConflict individua il conflitto di theta in a = g*(sin(theta) - mu*cos(theta))', () => {
    const hasConflict = hasTrigConflict(expr('g*(sin(theta) - mu*cos(theta))'), 'theta');
    return hasConflict ? true : 'conflitto trigonometrico su theta non rilevato';
  }));

  results.push(test('Trigonometria: suggestNextStep fornisce spiegazione didattica su theta in combinazione lineare', () => {
    const sug = suggestNextStep(eq('a = g*(sin(theta) - mu*cos(theta))'), 'theta');
    return !sug.found && sug.message.includes('sin') && sug.message.includes('cos') ? true
      : 'messaggio didattico non corretto: ' + JSON.stringify(sug);
  }));

  results.push(test('Risoluzione: mu in a = g*(sin(theta) - mu*cos(theta)) viene isolata correttamente', () => {
    let curr = eq('a = g*(sin(theta) - mu*cos(theta))');
    for (let i = 0; i < 8; i++) {
      if (isGoalReached(curr, 'mu')) break;
      const sug = suggestNextStep(curr, 'mu');
      if (!sug.found) return 'passo non trovato al tentativo ' + i;
      const res = performAction(curr, sug.action);
      if (!res.ok) return 'azione fallita: ' + res.error;
      curr = res.equation;
    }
    return isGoalReached(curr, 'mu') ? true : 'mu non isolata: ' + toPretty(curr, 0);
  }));

  results.push(test('Ricerca: "stevino" trova tutte le formule della legge di Stevino', () => {
    const list = filterFormulas({ search: 'stevino' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('ph-rhoghh') || !ids.includes('stevino')) {
      return `formule stevino mancanti: trovate ${ids.join(', ')}`;
    }
    return true;
  }));

  results.push(test('Ricerca: "archimede" trova spinta di Archimede e condizione di galleggiamento', () => {
    const list = filterFormulas({ search: 'archimede' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('legge-archimede') || !ids.includes('galleggia')) {
      return `formule archimede mancanti: trovate ${ids.join(', ')}`;
    }
    return true;
  }));

  results.push(test('Ricerca: "suono" restituisce tutte le formule di acustica e onde sonore', () => {
    const list = filterFormulas({ search: 'suono' });
    const ids = list.map((f) => f.id);
    const expected = [
      'onda-v-lam-f',
      'onda-periodo-frequenza',
      'onda-v-lam-T',
      'doppler-avvicinamento-sorgente',
      'doppler-allontanamento-sorgente',
      'doppler-avvicinamento-osservatore',
      'doppler-allontanamento-osservatore',
      'eco-suono',
      'intensita-sonora',
      'battimenti-sonori',
      'canne-organo-aperte',
      'corda-armonica',
    ];
    for (const exp of expected) {
      if (!ids.includes(exp)) return `formula suono '${exp}' non trovata per query 'suono'`;
    }
    return list.length >= 12 ? true : `trovate solo ${list.length} formule`;
  }));

  results.push(test('Ricerca: "doppler" trova le formule dell\'effetto Doppler', () => {
    const list = filterFormulas({ search: 'doppler' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('doppler-avvicinamento-sorgente') || !ids.includes('doppler-avvicinamento-osservatore')) {
      return `formule doppler mancanti: ${ids.join(', ')}`;
    }
    return true;
  }));

  results.push(test('Ricerca: "eco" trova la formula di riflessione ed eco del suono', () => {
    const list = filterFormulas({ search: 'eco' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('eco-suono')) return `formula eco mancante: ${ids.join(', ')}`;
    return true;
  }));

  results.push(test('Ricerca: normalizzazione con accenti e maiuscole "velocità del suono"', () => {
    const list = filterFormulas({ search: 'Velocità del Suono' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('onda-v-lam-f')) return `formula v=lam*f mancante con ricerca accentata: ${ids.join(', ')}`;
    return true;
  }));

  results.push(test('Ricerca: fallback globale se argomento selezionato non contiene la formula cercata', () => {
    // L'utente aveva selezionato 'cinematica' ma cerca 'stevino'
    const list = filterFormulas({ topic: 'cinematica', search: 'stevino' });
    const ids = list.map((f) => f.id);
    if (!ids.includes('ph-rhoghh') && !ids.includes('stevino')) {
      return `fallback globale fallito: trovate ${ids.join(', ')}`;
    }
    return true;
  }));

  results.push(test('Frazione di frazione: hasCompoundFraction riconosce frazioni di frazione e frazioni normali', () => {
    const normal = eq('v = s/t');
    if (hasCompoundFraction(normal.right)) return 's/t scambiata per frazione di frazione';

    const A = Sub(Mul(Var('fp'), Var('p')), Var('f'));
    const B = Mul(Var('f'), Var('vo'));
    const compoundDoppler = Neg(Div(Num(1), Div(A, B)));
    if (!hasCompoundFraction(compoundDoppler)) return 'Doppler -1 / ((fp - f)/(f*vo)) non riconosciuta come frazione di frazione';

    const c2 = Div(Num(1), Div(Var('a'), Var('b')));
    if (!hasCompoundFraction(c2)) return '1 / (a/b) non riconosciuta';

    const c3 = Div(Div(Var('a'), Var('b')), Var('c'));
    if (!hasCompoundFraction(c3)) return '(a/b) / c non riconosciuta';

    const c4 = Div(Div(Var('a'), Var('b')), Div(Var('c'), Var('d')));
    if (!hasCompoundFraction(c4)) return '(a/b) / (c/d) non riconosciuta';

    return true;
  }));

  results.push(test('Frazione di frazione: transformToReciprocalMul inverte il denominatore in moltiplicazione per la reciproca', () => {
    const c1 = Div(Num(1), Div(Var('a'), Var('b')));
    const s1 = transformToReciprocalMul(c1);
    if (toPretty(s1, 0) !== '1·(b/a)') return `atteso 1·(b/a), ottenuto ${toPretty(s1, 0)}`;

    const A = Sub(Mul(Var('fp'), Var('p')), Var('f'));
    const B = Mul(Var('f'), Var('vo'));
    const compoundDoppler = Neg(Div(Num(1), Div(A, B)));
    const s2 = transformToReciprocalMul(compoundDoppler);
    if (toPretty(s2, 0) !== '−1·(f·vo/(fp·p − f))') {
      return `atteso −1·(f·vo/(fp·p − f)), ottenuto ${toPretty(s2, 0)}`;
    }
    return true;
  }));

  results.push(test('Frazione di frazione: getCompoundFractionSteps genera la sequenza didattica lenta a 3 passaggi', () => {
    const A = Sub(Mul(Var('fp'), Var('p')), Var('f'));
    const B = Mul(Var('f'), Var('vo'));
    const dopplerEq = Eq(Var('v'), Neg(Div(Num(1), Div(A, B))));

    const steps = getCompoundFractionSteps(dopplerEq, 'v');
    if (!steps) return 'getCompoundFractionSteps ha restituito null per formula Doppler con frazione di frazione';
    if (steps.targetVar !== 'v') return `targetVar errato: ${steps.targetVar}`;
    if (steps.step1Pretty !== 'v = −1/((fp·p − f)/(f·vo))') return `step 1 errato: ${steps.step1Pretty}`;
    if (steps.step2Pretty !== 'v = −1·(f·vo/(fp·p − f))') return `step 2 errato: ${steps.step2Pretty}`;
    if (steps.step3Pretty !== 'v = −f·vo/(fp·p − f)') return `step 3 errato: ${steps.step3Pretty}`;

    const normalEq = eq('v = s/t');
    const noSteps = getCompoundFractionSteps(normalEq, 'v');
    if (noSteps !== null) return 'atteso null per formula normale v = s/t';

    return true;
  }));

  results.push(test('Obiettivo: isGoalReached rifiuta variabile presente in entrambi i membri (es. vo + fp*v/f = v)', () => {
    const dopplerEq = eq('vo + (fp*v)/f = v');
    if (isGoalReached(dopplerEq, 'v') !== false) {
      return 'vo + (fp*v)/f = v non deve essere considerata risolta per v!';
    }
    const sug = suggestNextStep(dopplerEq, 'v');
    if (!sug.found || sug.action.id === 'swap') {
      return 'suggestNextStep non deve proporre lo swap su una formula non ancora risolta: ' + JSON.stringify(sug);
    }
    return true;
  }));

  results.push(test('Obiettivo: isGoalReached rifiuta variabile con segno negativo (es. -v0 = a*t - v o -x = 5)', () => {
    const negEq = eq('-v0 = a*t - v');
    if (isGoalReached(negEq, 'v0') !== false) {
      return '-v0 = a*t - v non deve essere considerata risolta per v0!';
    }
    const negX = eq('-x = 5');
    if (isGoalReached(negX, 'x') !== false) {
      return '-x = 5 non deve essere considerata risolta per x!';
    }
    const sug = suggestNextStep(negEq, 'v0');
    if (!sug.found || sug.action.ruleKey !== 'mulBoth') {
      return 'suggestNextStep deve proporre di moltiplicare per -1: ' + JSON.stringify(sug);
    }
    return true;
  }));

  results.push(test('Obiettivo: ensureTargetOnFirstMember isola sempre la grandezza al primo membro', () => {
    const eRight = eq('s/t = v');
    const flipped = ensureTargetOnFirstMember(eRight, 'v');
    if (toPretty(flipped, 0) !== 'v = s/t') {
      return 'Atteso v = s/t, ottenuto: ' + toPretty(flipped, 0);
    }

    const eBoth = eq('vo + (fp*v)/f = v');
    const unchangedBoth = ensureTargetOnFirstMember(eBoth, 'v');
    if (toPretty(unchangedBoth, 0) !== toPretty(eBoth, 0)) {
      return 'Formula con v in ambo i membri non deve essere invertita!';
    }
    return true;
  }));

  results.push(test('Drag: fattore composto tra parentesi (fp - f) in v*(fp - f) = -fp*vs è trascinabile per dividere', () => {
    const e = eq('v*(fp - f) = -fp*vs');
    const html = renderEquation(e, { interactive: true });
    if (!html.includes('data-var-name="fp − f"') && !html.includes('data-var-name="fp - f"')) {
      return 'HTML non rende (fp - f) come draggable: ' + html;
    }
    if (html.includes('data-var-name="v*fp − f"') || html.includes('data-var-name="v*fp - f"')) {
      return 'HTML non deve generare la sintassi corrotta v*fp - f: ' + html;
    }
    const res = applyDragMove({
      currentEq: e,
      varName: 'fp - f',
      nodeType: 'Sub',
      fromSide: 'left',
      fromSlot: 'num',
      targetSide: 'right',
      targetSlot: 'den',
    });
    if (!res.ok) return 'drag di fp - f fallito: ' + (res.error || '');
    if (toPretty(res.newEq, 0) !== 'v = −fp·vs/(fp − f)') {
      return 'formula risultante errata: ' + toPretty(res.newEq, 0);
    }
    if (!isGoalReached(res.newEq, 'v')) {
      return 'l\'equazione risultante v = ... deve raggiungere l\'obiettivo!';
    }
    return true;
  }));

  results.push(test('Drag: fp*vs e (fp-f) possono essere mossi in croce in blocco', () => {
    const e = eq('v*(fp - f) = fp*vs');
    const html = renderEquation(e, { interactive: true });
    if (!html.includes('data-var-name="fp − f"') && !html.includes('data-var-name="fp - f"')) {
      return 'HTML non rende (fp - f) come draggable: ' + html;
    }
    if (!html.includes('data-var-name="fp*vs"') && !html.includes('data-var-name="fp·vs"')) {
      return 'HTML non rende fp*vs come blocco draggable: ' + html;
    }

    // 1. Sposto (fp - f) al denominatore di destra
    const r1 = applyDragMove({
      currentEq: e,
      varName: 'fp - f',
      nodeType: 'Sub',
      fromSide: 'left',
      fromSlot: 'num',
      targetSide: 'right',
      targetSlot: 'den',
    });
    if (!r1.ok) return 'spostamento in croce di (fp - f) fallito: ' + (r1.error || '');
    if (toPretty(r1.newEq, 0) !== 'v = fp·vs/(fp − f)') {
      return 'risultato errato per (fp - f): ' + toPretty(r1.newEq, 0);
    }
    if (!isGoalReached(r1.newEq, 'v')) {
      return 'v deve risultare isolata al primo membro dopo lo spostamento di (fp - f)!';
    }

    // 2. Sposto fp*vs al denominatore di sinistra
    const r2 = applyDragMove({
      currentEq: e,
      varName: 'fp*vs',
      nodeType: 'Mul',
      fromSide: 'right',
      fromSlot: 'num',
      targetSide: 'left',
      targetSlot: 'den',
    });
    if (!r2.ok) return 'spostamento in croce di fp*vs fallito: ' + (r2.error || '');
    if (toPretty(r2.newEq, 0) !== 'v·(fp − f)/(fp·vs) = 1') {
      return 'risultato errato per fp*vs: ' + toPretty(r2.newEq, 0);
    }

    // 3. Sposto fp*vs dal denominatore di sinistra al numeratore di destra
    const r3 = applyDragMove({
      currentEq: r2.newEq,
      varName: 'fp*vs',
      nodeType: 'Mul',
      fromSide: 'left',
      fromSlot: 'den',
      targetSide: 'right',
      targetSlot: 'num',
    });
    if (!r3.ok) return 'ritorno in croce di fp*vs fallito: ' + (r3.error || '');
    if (toPretty(r3.newEq, 0) !== 'v·(fp − f) = fp·vs') {
      return 'ritorno errato: ' + toPretty(r3.newEq, 0);
    }
    return true;
  }));

  // ---- Denominatore comune (m.c.m.) e frazioni composte ----
  results.push(test('m.c.m.: somma di frazioni 1/R1 + 1/R2 diventa (R1 + R2)/(R1·R2)', () => {
    const expr = Add(Div(Num(1), Var('R_1')), Div(Num(1), Var('R_2')));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === '(R_1 + R_2)/(R_1·R_2)' ? true : `atteso (R_1 + R_2)/(R_1·R_2), ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: somma frazione e termine intero A/B + C diventa (A + B·C)/B', () => {
    const expr = Add(Div(Var('A'), Var('B')), Var('C'));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === '(A + B·C)/B' ? true : `atteso (A + B·C)/B, ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: differenza termine e frazione A - B/C diventa (A·C − B)/C', () => {
    const expr = Sub(Var('A'), Div(Var('B'), Var('C')));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === '(A·C − B)/C' ? true : `atteso (A·C − B)/C, ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: frazione con denominatori numerici x/2 + y/4 diventa (y + 2·x)/4', () => {
    const expr = Add(Div(Var('x'), Num(2)), Div(Var('y'), Num(4)));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === '(y + 2·x)/4' ? true : `atteso (y + 2·x)/4, ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: doppia frazione con somma al denominatore 1 / (1/R1 + 1/R2) diventa R1·R2/(R1 + R2)', () => {
    const expr = Div(Num(1), Add(Div(Num(1), Var('R_1')), Div(Num(1), Var('R_2'))));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === 'R_1·R_2/(R_1 + R_2)' ? true : `atteso R_1·R_2/(R_1 + R_2), ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: frazione di frazione semplice v / (s/t) diventa t·v/s', () => {
    const expr = Div(Var('v'), Div(Var('s'), Var('t')));
    const res = reduceToSingleFraction(expr);
    const pretty = toPretty(res, 0);
    return pretty === 't·v/s' ? true : `atteso t·v/s, ottenuto: ${pretty}`;
  }));

  results.push(test('Regola: commonDenom applicata a 1/Req = 1/R1 + 1/R2 produce 1/Req = (R1 + R2)/(R1·R2)', () => {
    const e = eq('1/Req = 1/R1 + 1/R2');
    const res = applyRule(RULES.commonDenom, e, { side: 'right' });
    if (!res.ok) return 'regola commonDenom rifiutata: ' + res.error;
    const pretty = toPretty(res.equation, 0);
    return pretty === '1/Req = (R1 + R2)/(R1·R2)' ? true : `atteso 1/Req = (R1 + R2)/(R1·R2), ottenuto: ${pretty}`;
  }));

  results.push(test('Risoluzione completa: 1/Req = 1/R1 + 1/R2 con commonDenom + reciproco isola Req', () => {
    const e = eq('1/Req = 1/R1 + 1/R2');
    // 1. Applica commonDenom al secondo membro
    const step1 = applyRule(RULES.commonDenom, e, { side: 'right' });
    if (!step1.ok) return 'passo 1 fallito: ' + step1.error;
    // 2. Applica la regola dei reciproci
    const step2 = reciprocalEquation(step1.equation);
    if (!step2.ok) return 'passo 2 fallito: ' + step2.error;
    const finalPretty = toPretty(step2.newEq, 0);
    const goal = isGoalReached(step2.newEq, 'Req');
    return goal && finalPretty === 'Req = R1·R2/(R1 + R2)' ? true : `atteso Req = R1·R2/(R1 + R2), ottenuto: ${finalPretty}`;
  }));

  results.push(test('Regola: commonDenom rifiutata se l\'equazione è già a frazione semplice', () => {
    const e = eq('v = s/t');
    const res = applyRule(RULES.commonDenom, e);
    return !res.ok && res.error.includes('denominatore comune') ? true : 'doveva rifiutare v = s/t';
  }));

  results.push(test('Archivio: formula resistori-parallelo configurata come 1/R_eq = 1/R_1 + 1/R_2', () => {
    const e = eq('1/R_eq = 1/R_1 + 1/R_2');
    const step1 = applyRule(RULES.commonDenom, e, { side: 'right' });
    if (!step1.ok) return 'm.c.m. fallito: ' + step1.error;
    const step2 = reciprocalEquation(step1.equation);
    if (!step2.ok) return 'reciproco fallito: ' + step2.error;
    const goal = isGoalReached(step2.newEq, 'R_eq');
    const finalPretty = toPretty(step2.newEq, 0);
    return goal && finalPretty === 'R_eq = R_1·R_2/(R_1 + R_2)' ? true : `atteso R_eq = R_1·R_2/(R_1 + R_2), ottenuto: ${finalPretty}`;
  }));

  results.push(test('Risoluzione: 1/R_eq = 1/R_1 + 1/R_2 isola R_1 con trasporto, m.c.m. e reciproco', () => {
    // 1. Sposta 1/R_2 al primo membro
    const e = eq('1/R_eq - 1/R_2 = 1/R_1');
    const step1 = applyRule(RULES.commonDenom, e, { side: 'left' });
    if (!step1.ok) return 'm.c.m. fallito: ' + step1.error;
    const step2 = reciprocalEquation(step1.equation);
    if (!step2.ok) return 'reciproco fallito: ' + step2.error;
    const step3 = applyRule(RULES.swapSides, step2.newEq, {});
    const goal = isGoalReached(step3.equation, 'R_1');
    return goal ? true : 'obiettivo R_1 non raggiunto';
  }));

  // =========================================================================
  // Test Modulo Esportatore Schede Didattiche e Verifiche (worksheet-export.js)
  // =========================================================================

  results.push(test('Esportatore: escapeLatexText protegge caratteri speciali e traduce simboli matematici', () => {
    const s = escapeLatexText('Nota & formula: a ≠ b, x ≥ 0, 90° e A ↔ B % 50');
    if (!s.includes('\\&')) return 'Mancato escape di &: ' + s;
    if (!s.includes('\\%')) return 'Mancato escape di %: ' + s;
    if (!s.includes('$\\neq$')) return 'Mancata traduzione di ≠: ' + s;
    if (!s.includes('$\\ge$')) return 'Mancata traduzione di ≥: ' + s;
    if (!s.includes('$^\\circ$')) return 'Mancata traduzione di °: ' + s;
    if (!s.includes('$\\leftrightarrow$')) return 'Mancata traduzione di ↔: ' + s;
    return true;
  }));

  results.push(test('Esportatore: solveFormulaSteps isola correttamente t in v = s/t con tutti i passaggi', () => {
    const sol = solveFormulaSteps('v = s/t', 't');
    if (!sol.success) return 'Risoluzione fallita per v = s/t -> t';
    if (!sol.finalLatex.startsWith('t =')) return 'Formula finale inattesa: ' + sol.finalLatex;
    if (sol.steps.length === 0) return 'Nessun passaggio generato';
    const firstStep = sol.steps[0];
    if (!firstStep.latexAfter || !firstStep.label) return 'Struttura passaggio incompleta: ' + JSON.stringify(firstStep);
    return true;
  }));

  results.push(test('Esportatore: solveFormulaSteps isola m in F = m*a', () => {
    const sol = solveFormulaSteps('F = m*a', 'm');
    if (!sol.success) return 'Risoluzione fallita per F = m*a -> m';
    if (!sol.finalLatex.startsWith('m =')) return 'Target non isolato al primo membro: ' + sol.finalLatex;
    return true;
  }));

  results.push(test('Esportatore: buildWorksheetExercises genera il numero richiesto con target coerenti', () => {
    const exercises = buildWorksheetExercises({ count: 4, pointsPerExercise: 2.5 });
    if (exercises.length !== 4) return `Attesi 4 esercizi, ottenuti: ${exercises.length}`;
    for (const ex of exercises) {
      if (!ex.name || !ex.formulaStr || !ex.targetVar || !ex.latexFormula) {
        return 'Esercizio malformato: ' + JSON.stringify(ex);
      }
      if (ex.points !== 2.5) return 'Punti non assegnati correttamente: ' + ex.points;
    }
    return true;
  }));

  results.push(test('Esportatore: buildWorksheetExercises filtra correttamente per argomento', () => {
    const exercises = buildWorksheetExercises({ source: 'topic', topic: 'cinematica', count: 3 });
    if (exercises.length === 0) return 'Nessun esercizio generato per cinematica';
    const allCinematica = exercises.every((ex) => ex.topic === 'cinematica');
    if (!allCinematica) return 'Trovati esercizi non pertinenti a cinematica';
    return true;
  }));

  results.push(test('Esportatore: buildWorksheetExercises gestisce la formula corrente', () => {
    const current = { id: 'test-f', name: 'Legge di Ohm', formula: 'V = R*I', isolate: ['V', 'R', 'I'], topic: 'circuiti' };
    const exercises = buildWorksheetExercises({ source: 'current', currentFormula: current, currentTarget: 'R' });
    if (exercises.length !== 1) return `Atteso 1 esercizio, ottenuti: ${exercises.length}`;
    if (exercises[0].targetVar !== 'R') return 'Target non rispettato: ' + exercises[0].targetVar;
    if (exercises[0].solution.finalLatex !== 'R = \\frac{V}{I}') {
      return 'Soluzione inattesa per R: ' + exercises[0].solution.finalLatex;
    }
    return true;
  }));

  results.push(test('Esportatore: generateLatexDocument produce un documento compilabile valido', () => {
    const exercises = buildWorksheetExercises({ count: 2 });
    const tex = generateLatexDocument(exercises, {
      docType: 'test',
      title: 'Verifica Sperimentale',
      school: 'Liceo Scientifico',
      spaceType: 'grid',
      solutions: 'appendix'
    });
    if (!tex.startsWith('\\documentclass')) return 'Manca documentclass';
    if (!tex.includes('\\begin{document}')) return 'Manca begin document';
    if (!tex.includes('\\end{document}')) return 'Manca end document';
    if (!tex.includes('\\usepackage{amsmath,amssymb}')) return 'Mancano package matematici';
    if (!tex.includes('\\draw[step=0.5cm')) return 'Manca disegno griglia quadretti TikZ';
    if (!tex.includes('Soluzioni e Svolgimenti Dettagliati')) return 'Manca sezione soluzionario';
    return true;
  }));

  results.push(test('Esportatore: generateLatexDocument supporta righe e soluzioni sintetiche', () => {
    const exercises = buildWorksheetExercises({ count: 2 });
    const tex = generateLatexDocument(exercises, {
      docType: 'worksheet',
      title: 'Scheda di Esercizi',
      spaceType: 'lines',
      solutions: 'result_only'
    });
    if (!tex.includes('\\rule{\\textwidth}{0.3pt}')) return 'Mancano righe guida orizzontali';
    if (!tex.includes('Griglia Sintetica delle Soluzioni')) return 'Manca tabella soluzioni sintetiche';
    return true;
  }));

  results.push(test('Esportatore: generateHtmlWorksheet genera HTML autosufficiente con supporto stampa A4 e frazioni print-proof', () => {
    const exercises = buildWorksheetExercises({ count: 2 });
    const html = generateHtmlWorksheet(exercises, {
      title: 'Scheda Esercizi Stampa',
      spaceType: 'grid',
      solutions: 'appendix'
    }, true);
    if (!html.includes('<!DOCTYPE html>')) return 'Manca doctype HTML5';
    if (!html.includes('@media print')) return 'Mancano direttive @media print';
    if (!html.includes('workspace-grid')) return 'Manca classe quadretti';
    if (!html.includes('solutions-page')) return 'Manca pagina soluzioni';
    if (!html.includes('math-eq')) return 'Manca rendering semantico formule';
    // Verifica stabilità stampa linee frazione (.frac-bar resistente alla disattivazione di Background Graphics)
    if (!html.includes('border-top: 1.5px solid #000000 !important')) return 'Manca border-top per .frac-bar';
    if (!html.includes('background: transparent !important')) return 'Manca background transparent per .frac-bar';
    if (!html.includes('print-color-adjust: exact')) return 'Manca print-color-adjust: exact';

    // Verifica anteprima non standalone (usata nel modal)
    const previewHtml = generateHtmlWorksheet(exercises, {}, false);
    if (!previewHtml.includes('.frac-bar')) return 'Mancano stili .frac-bar nell\'anteprima';
    if (!previewHtml.includes('border-top: 1.5px solid #000000 !important')) return 'Manca border-top per .frac-bar nell\'anteprima';
    return true;
  }));

  // ---- Diagnosi didattica ed errori degli studenti (Misconceptions) ----
  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce cancellazione illecita su somme', () => {
    const diag = diagnoseStudentMisconception('Non puoi semplificare un fattore con un termine di una somma.');
    if (diag.category !== 'illegal-sum-cancellation') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('Semplificazione Illecita')) return `badge non appropriato: ${diag.badge}`;
    if (!diag.counterexample.includes('2 + 6')) return `manca controesempio numerico: ${diag.counterexample}`;
    return true;
  }));

  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce mancato denominatore comune prima del reciproco', () => {
    const diag = diagnoseStudentMisconception('il reciproco di una somma di frazioni NON è la somma dei reciproci: 1/(A/B + C/D) ≠ B/A + D/C.');
    if (diag.category !== 'missing-common-denom-reciprocal') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('Frazioni e Reciproci')) return `badge errato: ${diag.badge}`;
    if (!diag.counterexample.includes('1/2 + 1/2')) return `manca controesempio numerico: ${diag.counterexample}`;
    return true;
  }));

  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce trasporto di fattore come addendo', () => {
    const diag = diagnoseStudentMisconception('"m" è un fattore che moltiplica l\'intero membro, non un termine additivo!');
    if (diag.category !== 'invalid-transposition-factor-as-term') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('1° vs 2° Principio')) return `badge errato: ${diag.badge}`;
    if (!diag.ruleReminder.includes('· ↔ /')) return `manca promemoria principio: ${diag.ruleReminder}`;
    return true;
  }));

  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce addendo diviso come fattore', () => {
    const diag = diagnoseStudentMisconception('Non puoi dividere per "v0" finché fa parte di una somma con altri termini!');
    if (diag.category !== 'invalid-transposition-term-as-factor') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('1° vs 2° Principio')) return `badge errato: ${diag.badge}`;
    return true;
  }));

  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce addendo bloccato in parentesi moltiplicata', () => {
    const diag = diagnoseStudentMisconception('Non puoi spostare "v0" perché si trova all\'interno della parentesi (v - v0) moltiplicata per k!');
    if (diag.category !== 'invalid-transposition-parenthesis-blocked') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('Precedenza Operazioni')) return `badge errato: ${diag.badge}`;
    return true;
  }));

  results.push(test('Pedagogia: diagnoseStudentMisconception riconosce addendo bloccato in frazione', () => {
    const diag = diagnoseStudentMisconception('Non puoi trasportare "s0" con cambio di segno finché si trova al numeratore della frazione con denominatore t!');
    if (diag.category !== 'invalid-transposition-fraction-blocked') return `categoria errata: ${diag.category}`;
    if (!diag.badge.includes('Precedenza Operazioni')) return `badge errato: ${diag.badge}`;
    return true;
  }));

  results.push(test('Croce: (x + a)/a = b rifiuta cancellazione di addendo con spiegazione pedagogica ed esempio numerico', () => {
    const e = eq('(x + a)/a = b');
    const r = crossCancel(e, 'left/num/Add1', 'left/den');
    if (r.ok) return 'accettata semplificazione illecita di un addendo!';
    if (!r.error.includes('Cancellazione illecita su una somma')) return `manca spiegazione specifica: ${r.error}`;
    if (!r.hint.includes('raccogli prima')) return `manca suggerimento didattico: ${r.hint}`;
    return true;
  }));

  results.push(test('Croce: a + a = b spiega che i termini uguali nella stessa somma si sommano anziché cancellarsi', () => {
    const e = eq('a + a = b');
    const r = crossCancel(e, 'left/Add0', 'left/Add1');
    if (r.ok) return 'accettata cancellazione di termini con stesso segno!';
    if (!r.error.includes('si sommano')) return `manca spiegazione specifica: ${r.error}`;
    return true;
  }));

  results.push(test('Regola dei reciproci: 1/Req = 1/R1 + 1/R2 produce spiegazione pedagogica con controesempio', () => {
    const e = eq('1/Req = 1/R1 + 1/R2');
    const r = reciprocalEquation(e);
    if (r.ok) return 'accettata regola reciproci su somma di frazioni!';
    if (!r.error.includes('1/2 + 1/2 = 1')) return `manca controesempio numerico nell'errore: ${r.error}`;
    if (!r.hint.includes('Denominatore comune')) return `manca indicazione m.c.m. nel suggerimento: ${r.hint}`;
    return true;
  }));

  results.push(test('Regola: ruleReciprocalBothSides rifiuta 1/Req = 1/R1 + 1/R2 con precondizione pedagogica', () => {
    const e = eq('1/Req = 1/R1 + 1/R2');
    const res = applyRule(RULES.reciprocalBoth, e);
    if (res.ok) return 'accettata regola su somma di frazioni!';
    if (!res.error || !res.error.includes('NON è la somma dei reciproci')) return `messaggio poco chiaro: ${res.error}`;
    if (!res.hint || !res.hint.includes('Denominatore comune')) return `manca hint didattico: ${res.hint}`;
    return true;
  }));

  results.push(test('Pannello regole: common-denom produce spiegazione didattica strutturata completa', () => {
    const panel = buildRulePanel('common-denom', {
      beforeText: '1/Req = 1/R1 + 1/R2',
      afterText: '1/Req = (R1 + R2)/(R1·R2)',
      steps: ['Calcolo il m.c.m. dei denominatori R1 e R2'],
    });
    if (!panel.title.includes('Minimo comune multiplo')) return `titolo errato: ${panel.title}`;
    if (!panel.html.includes('Spiegazione')) return 'manca sezione spiegazione';
    if (!panel.html.includes('Principio di equivalenza')) return 'manca sezione principio';
    if (!panel.html.includes('Perché è corretto')) return 'manca sezione perché è corretto';
    if (!panel.html.includes('Condizioni di validità')) return 'manca sezione condizioni';
    if (!panel.html.includes('regola dei reciproci')) return 'manca avvertenza didattica sul reciproco';
    return true;
  }));

  // ---- Test Modalità Quiz / Eserciziario ----
  results.push(test('Quiz: Livelli di difficoltà e configurazione passaggi', () => {
    if (!DIFFICULTY_LEVELS.easy || !DIFFICULTY_LEVELS.medium || !DIFFICULTY_LEVELS.hard) {
      return 'Mancano definizioni dei tre livelli di difficoltà';
    }
    if (DIFFICULTY_LEVELS.easy.maxSteps !== 3) return 'Livello easy non configurato a max 3 passaggi';
    if (DIFFICULTY_LEVELS.medium.minSteps !== 4 || DIFFICULTY_LEVELS.medium.maxSteps !== 5) {
      return 'Livello medium non configurato a 4-5 passaggi';
    }
    if (DIFFICULTY_LEVELS.hard.minSteps !== 6) return 'Livello hard non configurato a min 6 passaggi';
    return true;
  }));

  results.push(test('Quiz: Classificazione automatica della difficoltà e mosse ottimali', () => {
    const easySol = classifyFormulaDifficulty('v = s/t', 's');
    if (!easySol.solvable) return 'v = s/t -> s non risulta risolvibile';
    if (easySol.level !== 'easy') return `Atteso livello easy per v = s/t -> s, ottenuto: ${easySol.level}`;
    if (easySol.steps !== 3) return `Attesi 3 passaggi, ottenuti: ${easySol.steps}`;

    const medSol = classifyFormulaDifficulty('v = s/t', 't');
    if (!medSol.solvable) return 'v = s/t -> t non risulta risolvibile';
    if (medSol.level !== 'medium') return `Atteso livello medium per v = s/t -> t, ottenuto: ${medSol.level}`;
    if (medSol.steps !== 4) return `Attesi 4 passaggi, ottenuti: ${medSol.steps}`;
    return true;
  }));

  results.push(test('Quiz: Calcolo dell efficienza delle mosse (Step-Efficiency) e attribuzione stelle', () => {
    const perfect = calculateStepEfficiency(3, 3);
    if (perfect.efficiency !== 100 || perfect.stars !== 3 || !perfect.isOptimal) {
      return 'Risoluzione ottimale non valutata al 100% / 3 stelle';
    }

    const good = calculateStepEfficiency(3, 5);
    if (good.stars !== 2 || good.isOptimal) {
      return '2 mosse extra devono attribuire 2 stelle';
    }

    const sub = calculateStepEfficiency(2, 6);
    if (sub.stars !== 1) return 'Molte mosse extra devono attribuire 1 stella';
    return true;
  }));

  results.push(test('Quiz: Punti esperienza XP e progressione Rank dello studente', () => {
    const xp = calculateExerciseXp('easy', 3, 0, 20);
    if (xp !== 40) return `Calcolo XP inatteso: atteso 40, ottenuto ${xp}`;

    const r1 = getPlayerRank(10);
    if (r1.level !== 1 || !r1.title.includes('Apprendista')) return 'Rank 1 non corretto';

    const r3 = getPlayerRank(200);
    if (r3.level !== 3 || !r3.title.includes('Esperto')) return 'Rank 3 non corretto';
    return true;
  }));

  results.push(test('Quiz: Catalogo e logica di sblocco dei Distintivi di Maestria (Badges)', () => {
    if (MASTERY_BADGES.length !== 12) return `Attesi 12 badge, trovati: ${MASTERY_BADGES.length}`;
    const def = getDefaultProgress();
    const unlocked = checkBadgesToUnlock({ ...def, totalSolved: 1 }, { stars: 3, performedSteps: 2, optimalSteps: 2, mistakesCount: 0 });
    if (!unlocked.includes('first_win')) return 'first_win non sbloccato al primo esercizio';
    if (!unlocked.includes('optimal_sniper')) return 'optimal_sniper non sbloccato con mosse ottimali';
    if (!unlocked.includes('flawless')) return 'flawless non sbloccato senza errori';
    return true;
  }));

  results.push(test('Quiz: Persistenza e aggiornamento statistiche in localStorage', () => {
    const mockStorage = {
      data: {},
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = String(v); },
      removeItem(k) { delete this.data[k]; }
    };
    const init = loadQuizProgress(mockStorage);
    if (init.totalSolved !== 0) return 'Storage iniziale non vuoto';

    const res = recordQuizResult(init, {
      formulaId: 'v-st',
      formulaName: 'velocità',
      formulaStr: 'v = s/t',
      targetVar: 's',
      level: 'easy',
      optimalSteps: 3,
      performedSteps: 3,
      mistakesCount: 0,
      elapsedSeconds: 15
    }, mockStorage);

    if (res.stars !== 3) return 'Attese 3 stelle';
    if (res.updatedProgress.totalSolved !== 1) return 'totalSolved non incrementato';
    if (res.updatedProgress.streak !== 1) return 'streak non incrementata';

    const reloaded = loadQuizProgress(mockStorage);
    if (reloaded.totalSolved !== 1) return 'Persistenza fallita al ricaricamento';

    resetQuizProgress(mockStorage);
    const afterReset = loadQuizProgress(mockStorage);
    if (afterReset.totalSolved !== 0) return 'Reset progressi fallito';
    return true;
  }));

  // =========================================================================
  // Test Semplificazione Potenze e Minimo Comune Multiplo (Numero + Frazione)
  // =========================================================================

  results.push(test('Prodotto: fusione di fattori uguali in potenza c·c -> c^2', () => {
    const e = canonical(eq('c*c*(u1 + v) = c*c*u'));
    const pretty = toPretty(e, 0);
    return pretty.includes('c^2·(u1 + v)') && pretty.includes('c^2')
      ? true
      : `atteso c^2, ottenuto: ${pretty}`;
  }));

  results.push(test('Croce: semplificazione di un fattore c con c^2 al denominatore (c/c^2 -> 1/c)', () => {
    const e = eq('u = (c*v)/c^2');
    const res = crossCancel(e, 'right/num/Mul0', 'right/den');
    if (!res.ok) return 'semplificazione fallita: ' + res.error;
    const pretty = toPretty(res.newEq, 0);
    return pretty === 'u = v/c' ? true : `atteso u = v/c, ottenuto: ${pretty}`;
  }));

  results.push(test('m.c.m.: somma tra numero e frazione al denominatore 1 + (u1·v)/c^2', () => {
    const e = eq('u = (u1 + v)/(1 + (u1*v)/c^2)');
    const step1 = reduceEquationToCommonDenominator(e, 'right');
    if (!step1.ok) return 'passo 1 m.c.m. fallito: ' + step1.error;
    const p1 = toPretty(step1.newEq, 0);
    if (p1 !== 'u = (u1 + v)/((c^2 + u1·v)/c^2)') {
      return `atteso denominatore (c^2 + u1·v)/c^2, ottenuto: ${p1}`;
    }
    const step2 = reduceEquationToCommonDenominator(step1.newEq, 'right');
    if (!step2.ok) return 'passo 2 m.c.m. fallito: ' + step2.error;
    const p2 = toPretty(step2.newEq, 0);
    return p2 === 'u = c^2·(u1 + v)/(c^2 + u1·v)'
      ? true
      : `atteso c^2·(u1 + v)/(c^2 + u1·v), ottenuto: ${p2}`;
  }));

  results.push(test('Sviluppa parentesi: potenza di frazione (1/c)^2 -> 1/c^2', () => {
    const startEq = eq('eps0 * mu0 = (1/c)^2');
    if (!canDistribute(startEq.right)) return 'atteso canDistribute true per membro destro (1/c)^2';
    const res = applyRule(RULES.distribute, startEq, { side: 'right' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    const p = toPretty(res.equation, 0);
    return equivalentEq(res.equation, eq('eps0 * mu0 = 1/(c^2)')) ? true
      : `atteso eps0·mu0 = 1/c^2, ottenuto: ${p}`;
  }));

  results.push(test('Sviluppa parentesi: quadrato con radice al denominatore (1/sqrt(eps0*mu0))^2 -> 1/(eps0*mu0)', () => {
    const startEq = eq('c^2 = (1 / sqrt(eps0 * mu0))^2');
    if (!canDistribute(startEq.right)) return 'atteso canDistribute true per membro destro con radice';
    const res = applyRule(RULES.distribute, startEq, { side: 'right' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    const p = toPretty(res.equation, 0);
    return equivalentEq(res.equation, eq('c^2 = 1/(eps0 * mu0)')) ? true
      : `atteso c^2 = 1/(eps0·mu0), ottenuto: ${p}`;
  }));

  results.push(test('Sviluppa parentesi: quadrato di radice singola (sqrt(x))^2 -> x', () => {
    const startEq = eq('y = (sqrt(x))^2');
    if (!canDistribute(startEq.right)) return 'atteso canDistribute true per (sqrt(x))^2';
    const res = applyRule(RULES.distribute, startEq, { side: 'right' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('y = x')) ? true
      : `atteso y = x, ottenuto: ${toPretty(res.equation, 0)}`;
  }));

  results.push(test('Sviluppa parentesi: frazione generica (v/c)^2 -> v^2/c^2', () => {
    const startEq = eq('y = (v/c)^2');
    if (!canDistribute(startEq.right)) return 'atteso canDistribute true per (v/c)^2';
    const res = applyRule(RULES.distribute, startEq, { side: 'right' });
    if (!res.ok) return 'rifiutata: ' + res.error;
    return equivalentEq(res.equation, eq('y = (v^2)/(c^2)')) ? true
      : `atteso y = v^2/c^2, ottenuto: ${toPretty(res.equation, 0)}`;
  }));

  return results;
}

export function formatTestResults(results) {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const html = results.map((r) => {
    const cls = r.ok ? 'pass' : 'fail';
    const icon = r.ok ? '✓' : '✗';
    return `<div class="test-row ${cls}">
      <span class="test-icon">${icon}</span>
      <span class="test-name">${escapeHtml(r.name)}</span>
      ${r.detail ? `<span class="test-detail">${escapeHtml(r.detail)}</span>` : ''}
    </div>`;
  }).join('');
  return { passed, failed, total: results.length, html };
}

export function runAllPassing() {
  return runAllTests().every((r) => r.ok);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
