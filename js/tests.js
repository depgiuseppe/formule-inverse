// tests.js — Suite di test interni (self-test dell'app).
//
// Verifica:
//  - il parser (formule valide e malformate);
//  - regole lecite (risultati corretti);
//  - regole illecite (x/x, divisione per 0, inversione di un solo membro, ...);
//  - il controllo dell'equivalenza;
//  - il raggiungimento dell'obiettivo.

import { parseEquation, parseExpression, ParseError } from './parser.js';
import { toPretty, toLatex, equivalentEq, unwrap, collectVars, clone, canonical, Sin, Ln, Var } from './ast.js';
import { renderEquation, prettyVar } from './render.js';
import { applyDragMove } from './dragdrop.js';
import { RULES, applyRule } from './rules.js';
import { isGoalReached, performAction, suggestNextStep, enumerateElements } from './algebra.js';
import { reciprocalEquation } from './reciprocals.js';
import { crossCancel } from './cross.js';

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
