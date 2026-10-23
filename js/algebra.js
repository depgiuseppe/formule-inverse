// algebra.js — Motore di analisi e trasformazione simbolica.
//
// Responsabilità:
//  - determinare se la variabile obiettivo è isolata;
//  - elencare i sotto-elementi selezionabili di un'equazione (con il loro ruolo);
//  - calcolare le operazioni lecite su un elemento selezionato;
//  - verificare l'equivalenza tra equazioni e gestire le condizioni;
//  - produrre i suggerimenti per la modalità guidata.

import {
  Num, Var, Add, Sub, Mul, Div, Pow, Sqrt, Neg, Group, Eq,
  Sin, Cos, Tan, Ln, Asin, Acos, Atan, Exp,
  unwrap, unwrapNeutrals, canonical, isNum, equivalentExpr, equivalentEq, collectVars, toPretty,
  isIdenticallyZero, clone, FUNC_INFO,
} from './ast.js';
import { RULES, applyRule, additiveTerms, cancelFractionFactor, findCommonFactorInFraction, hasTrigConflict, canDistribute, findCommonFactor } from './rules.js';
import { canReduceToSingleFraction } from './common-denom.js';

// ---------------------------------------------------------------------------
// Stato/contesto di lavoro
// ---------------------------------------------------------------------------
// Un "contesto" raccoglie: equazione corrente, variabile obiettivo, condizioni
// accumulate. È mantenuto in app.js, ma le funzioni qui sono pure.

// ---------------------------------------------------------------------------
// 1) Obiettivo raggiunto?
// ---------------------------------------------------------------------------
// La variabile `target` è isolata se e solo se compare da sola su un membro
// e NON compare affatto nell'altro membro. Se compare in entrambi i membri,
// non è mai considerata isolata.
export function isGoalReached(eq, target) {
  if (!eq || eq.type !== 'Eq' || !target) return false;
  const inL = collectVars(eq.left).has(target);
  const inR = collectVars(eq.right).has(target);
  if (inL && inR) return false;

  const leftIso = isolatedSide(eq.left, target);
  const rightIso = isolatedSide(eq.right, target);

  return (leftIso && !inR) || (rightIso && !inL);
}

// Assicura che la grandezza isolata si trovi al primo membro (membro sinistro).
// Se la grandezza è isolata al secondo membro e assente dal primo, inverte
// simmetricamente i due membri (A = B <=> B = A).
export function ensureTargetOnFirstMember(eq, target) {
  if (!eq || eq.type !== 'Eq' || !target) return eq;
  const inL = collectVars(eq.left).has(target);
  const inR = collectVars(eq.right).has(target);
  if (inL && inR) return eq;
  if (isolatedSide(eq.right, target) && !inL) {
    return Eq(eq.right, eq.left);
  }
  return eq;
}

export function isolatedSide(node, target) {
  node = unwrapNeutrals(node);
  if (node.type === 'Var' && node.name === target) return true;
  if (node.type === 'Mul' && node.args.length === 2) {
    // forma 1 * target
    const [a, b] = node.args;
    const aC = isNum(unwrap(a)) ? unwrap(a).value : null;
    const bC = isNum(unwrap(b)) ? unwrap(b).value : null;
    if (aC === 1) return isolatedSide(b, target);
    if (bC === 1) return isolatedSide(a, target);
  }
  return false;
}

// Ritorna il membro che contiene la variabile obiettivo, 'left'|'right'|'both'|null
export function whichSideHas(eq, target) {
  const inL = collectVars(eq.left).has(target);
  const inR = collectVars(eq.right).has(target);
  if (inL && inR) return 'both';
  if (inL) return 'left';
  if (inR) return 'right';
  return null;
}

// ---------------------------------------------------------------------------
// 2) Elementi selezionabili
// ---------------------------------------------------------------------------
// Produciamo una lista piatta di tutti i sotto-nodi dell'equazione, ciascuno
// con un identificatore di percorso stabile e il suo RUOLO sintattico
// (termine additivo, fattore, numeratore, denominatore, base, esponente, ecc.).
export function enumerateElements(eq) {
  const out = [];
  walk(eq.left, 'left', out, 'left', { role: 'membro' });
  walk(eq.right, 'right', out, 'right', { role: 'membro' });
  return out;
}

function walk(node, side, out, id, ctx) {
  node = unwrap(node);
  const item = {
    id,
    side,
    node,
    role: ctx.role,
    parentRole: ctx.parentRole || null,
    pretty: toPretty(node, 0),
  };
  out.push(item);

  const childCtx = (role) => ({ role, parentRole: ctx.role });

  switch (node.type) {
    case 'Add':
    case 'Sub': {
      node.args.forEach((a, i) => walk(a, side, out, id + '/' + node.type + i, childCtx('termine')));
      break;
    }
    case 'Mul': {
      node.args.forEach((a, i) => walk(a, side, out, id + '/Mul' + i, childCtx('fattore')));
      break;
    }
    case 'Div': {
      walk(node.num, side, out, id + '/num', childCtx('numeratore'));
      walk(node.den, side, out, id + '/den', childCtx('denominatore'));
      break;
    }
    case 'Pow': {
      walk(node.base, side, out, id + '/base', childCtx('base'));
      walk(node.exp, side, out, id + '/exp', childCtx('esponente'));
      break;
    }
    case 'Sqrt': {
      walk(node.arg, side, out, id + '/arg', childCtx('radicando'));
      break;
    }
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp': {
      walk(node.arg, side, out, id + '/arg', childCtx('argomento-funzione'));
      break;
    }
    case 'Neg': {
      const innerRole = (ctx.role === 'fattore' || ctx.role === 'termine') ? ctx.role : 'argomento';
      walk(node.arg, side, out, id + '/arg', childCtx(innerRole));
      break;
    }
    case 'Group': {
      walk(node.arg, side, out, id + '/g', childCtx('gruppo'));
      break;
    }
  }
}

// Dato un id, ritorna l'elemento corrispondente.
export function findElement(eq, id) {
  if (id === 'left' || id === 'right') {
    const node = unwrap(id === 'left' ? eq.left : eq.right);
    return { id, side: id, node, role: 'membro', pretty: toPretty(node, 0) };
  }
  return enumerateElements(eq).find((e) => e.id === id) || null;
}

// ---------------------------------------------------------------------------
// 3) Operazioni lecite su un elemento selezionato
// ---------------------------------------------------------------------------
// Ritorna un array di "azioni": { id, label, description, ruleKey, build(ctx) }.
// build(ctx) restituisce il ctx per applyRule. La validità finale è comunque
// verificata da applyRule + controlli di equivalenza.
export function availableActions(eq, element, target) {
  if (!element) return [];
  const actions = [];
  const node = unwrap(element.node);
  const side = element.side;
  const otherSide = side === 'left' ? 'right' : 'left';

  const nodeText = toPretty(node, 0);

  // --- Se è un termine additivo: trasporto con cambio di segno ---
  if (element.role === 'termine' || element.role === 'membro') {
    const terms = additiveTerms(side === 'left' ? eq.left : eq.right);
    const isAdditive = terms.length > 1;
    if (isAdditive) {
      // trasporto di questo termine dall'altro lato
      actions.push({
        id: 'move-term',
        label: `Trasporta "${nodeText}" dall'altro membro (cambio di segno)`,
        description: 'Somma l\'opposto del termine a entrambi i membri (primo principio).',
        ruleKey: 'moveTerm',
        build: () => ({ term: node, side, termText: nodeText }),
      });
    }
  }

  // --- Se è un fattore moltiplicativo: trasporto come divisore ---
  if (element.role === 'fattore' || element.role === 'membro' || element.role === 'numeratore') {
    const member = side === 'left' ? eq.left : eq.right;
    const memberU = unwrap(member);
    if (memberU.type === 'Mul' && memberU.args.length >= 2) {
      const isSubFactor = memberU.args.some((f) => {
        if (equivalentExpr(f, node)) return true;
        const u = unwrap(f);
        return u.type === 'Neg' && equivalentExpr(u.arg, node);
      });
      const isWhole = equivalentExpr(memberU, node);
      if (isSubFactor || isWhole) {
        actions.push({
          id: 'move-factor',
          label: `Trasporta "${nodeText}" al denominatore opposto (divisione in croce)`,
          description: 'Dividi entrambi i membri per ' + nodeText + ' (secondo principio, richiede ' + nodeText + ' ≠ 0).',
          ruleKey: 'moveFactor',
          build: () => ({ factor: node, side, factorText: nodeText }),
        });
      }
    }
  }

  // --- Se è un denominatore: moltiplica entrambi i membri per esso ---
  if (element.role === 'denominatore' || (node.type === 'Div')) {
    const den = node.type === 'Div' ? node.den : (element.role === 'denominatore' ? node : null);
    if (den) {
      const denText = toPretty(den, 0);
      actions.push({
        id: 'mul-by-den',
        label: `Moltiplica entrambi i membri per "${denText}" (elimina il denominatore)`,
        description: 'Moltiplica entrambi i membri per il denominatore (secondo principio).',
        ruleKey: 'mulBoth',
        build: () => ({ value: den, valueText: denText }),
      });
    }
  }

  // --- Se è un radicale: eleva entrambi i membri al quadrato ---
  if (node.type === 'Sqrt' || element.role === 'radicando') {
    actions.push({
      id: 'square-both',
      label: 'Eleva entrambi i membri al quadrato (elimina la radice)',
      description: 'Eleva entrambi i membri alla seconda potenza per liberare il radicando.',
      ruleKey: 'powBoth',
      build: () => ({ value: Num(2), valueText: '2' }),
    });
  }

  // --- Se è una potenza: estrai la radice (pari o dispari) ---
  const exp = powExpValue(node);
  if (exp != null && Number.isInteger(exp) && exp > 1) {
    if (exp % 2 === 0) {
      // radice di indice PARI: radicando ≥ 0 e segno ±
      actions.push({
        id: 'sqrt-both',
        label: `Estrai la radice ${exp === 2 ? 'quadrata' : exp + '-esima'} di entrambi i membri (indice pari, introduce ±)`,
        description: 'Radice di indice pari di entrambi i membri: richiede radicando ≥ 0 e introduce il segno ±.',
        ruleKey: 'sqrtBoth',
        build: () => ({ side, insideVar: target }),
      });
    } else {
      // radice di indice DISPARI: definita su tutto ℝ, nessuna condizione, nessun ±
      actions.push({
        id: 'root-odd-both',
        label: `Estrai la radice ${exp}-esima di entrambi i membri (indice dispari, nessun ±)`,
        description: 'Radice di indice dispari di entrambi i membri: definita per ogni radicando, unica, senza segno ±.',
        ruleKey: 'rootOddBoth',
        build: () => ({ side, insideVar: target }),
      });
    }
    actions.push({
      id: 'pow-both',
      label: `Eleva entrambi i membri a un esponente`,
      description: 'Eleva entrambi i membri allo stesso esponente.',
      ruleKey: 'powBoth',
      build: () => ({ value: Num(1 / exp), valueText: '1/' + exp }),
    });
  }

  // --- Se è una funzione trascendente selezionata (o il suo argomento): inverti ---
  const fnNode = funcNodeOf(element, side, eq);
  if (fnNode) {
    const key = fnNode.type.toLowerCase();
    const info = FUNC_INFO[key];
    const fnText = toPretty(fnNode, 0);
    if (info && info.inverse) {
      actions.push({
        id: 'invert-function',
        label: `Scomponi applicando la funzione inversa ${info.inverse}: libera l'argomento di ${fnText}`,
        description: `Applica ${info.inverse} a entrambi i membri per isolare l'argomento della funzione. Richiede che l'altro membro sia nel dominio (es. [−1, 1] per sin/cos).`,
        ruleKey: 'invertFunction',
        build: () => ({ side, fnNode }),
      });
    }
  }

  // --- Se è un denominatore o membro con fattore cancellabile: cancellazione ---
  const member = side === 'left' ? eq.left : eq.right;
  const denCandidate = node.type === 'Div' ? node.den : (element.role === 'denominatore' ? node : null);
  if (denCandidate && hasCancellableFactor(member, denCandidate)) {
    const denText = toPretty(denCandidate, 0);
    actions.push({
      id: 'cancel-factor',
      label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
      description: `Semplifica ${denText} tra numeratore e denominatore: serve ${denText} ≠ 0.`,
      ruleKey: 'cancelFactor',
      build: () => ({ den: denCandidate, side, denText }),
    });
  } else {
    const autoDen = findCancellableFactor(member);
    if (autoDen) {
      const denText = toPretty(autoDen, 0);
      actions.push({
        id: 'cancel-factor',
        label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
        description: `Semplifica ${denText} tra numeratore e denominatore: serve ${denText} ≠ 0.`,
        ruleKey: 'cancelFactor',
        build: () => ({ den: autoDen, side, denText }),
      });
    }
  }

  // --- Se il membro corrente ha prodotti da sviluppare (proprietà distributiva) ---
  if (canDistribute(member)) {
    actions.push({
      id: 'distribute',
      label: `Sviluppa le parentesi al ${side === 'left' ? 'primo' : 'secondo'} membro (proprietà distributiva)`,
      description: 'Moltiplica il fattore per ciascun termine nella parentesi: a(b ± c) = ab ± ac.',
      ruleKey: 'distribute',
      build: () => ({ side }),
    });
  }

  // --- Se il membro corrente ha un fattore comune da raccogliere ---
  const memberCommon = findCommonFactor(member, target) || findCommonFactor(member, null);
  if (memberCommon) {
    const cText = toPretty(memberCommon, 0);
    actions.push({
      id: 'factor-common',
      label: `Raccogli "${cText}" a fattor comune al ${side === 'left' ? 'primo' : 'secondo'} membro`,
      description: `Mette in evidenza il fattore comune ${cText}: ax + ab = a(x + b).`,
      ruleKey: 'factorCommon',
      build: () => ({ side, common: memberCommon, commonText: cText }),
    });
  }

  return actions;
}

// Azioni sempre disponibili a livello di equazione (non legate a un elemento).
export function globalActions(eq, target) {
  const actions = [];

  // Scambio dei membri
  actions.push({
    id: 'swap',
    label: 'Scambia i membri (proprietà simmetrica)',
    description: 'Se A = B allora B = A.',
    ruleKey: 'swapSides',
    build: () => ({}),
  });

  // Moltiplicazione incrociata (se entrambi i membri sono frazioni)
  const L = unwrap(eq.left).type === 'Div';
  const R = unwrap(eq.right).type === 'Div';
  if (L && R) {
    actions.push({
      id: 'cross',
      label: 'Moltiplica in croce (proporzione)',
      description: 'Da a/b = c/d ottieni a·d = b·c (denominatori ≠ 0).',
      ruleKey: 'crossMultiply',
      build: () => ({}),
    });
    actions.push({
      id: 'invert',
      label: 'Inverti entrambi i rapporti',
      description: 'Da a/b = c/d ottieni b/a = d/c (tutti ≠ 0).',
      ruleKey: 'invertProportion',
      build: () => ({}),
    });
  }

  // Reciproco di entrambi i membri
  actions.push({
    id: 'reciprocal',
    label: 'Prendi il reciproco di entrambi i membri',
    description: 'Se A = B e A,B ≠ 0 allora 1/A = 1/B.',
    ruleKey: 'reciprocalBoth',
    build: () => ({}),
  });

  // Proprietà distributiva (se una parte contiene prodotti con parentesi)
  const distSide = canDistribute(eq.right) ? 'right' : (canDistribute(eq.left) ? 'left' : null);
  if (distSide) {
    actions.push({
      id: 'distribute',
      label: `Sviluppa le parentesi al ${distSide === 'left' ? 'primo' : 'secondo'} membro`,
      description: 'Applica la proprietà distributiva a(b ± c) = ab ± ac.',
      ruleKey: 'distribute',
      build: () => ({ side: distSide }),
    });
  }

  // Raccoglimento a fattor comune
  const commonFactorLeft = findCommonFactor(eq.left, target) || findCommonFactor(eq.left, null);
  const commonFactorRight = findCommonFactor(eq.right, target) || findCommonFactor(eq.right, null);
  const factorSide = commonFactorLeft ? 'left' : (commonFactorRight ? 'right' : null);
  const commonNode = commonFactorLeft || commonFactorRight;
  if (factorSide && commonNode) {
    const commonText = toPretty(commonNode, 0);
    actions.push({
      id: 'factor-common',
      label: `Raccogli "${commonText}" a fattor comune al ${factorSide === 'left' ? 'primo' : 'secondo'} membro`,
      description: `Mette in evidenza il fattore comune: ax + ab = a(x + b).`,
      ruleKey: 'factorCommon',
      build: () => ({ side: factorSide, common: commonNode, commonText }),
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// 4) Applicazione e verifica di una trasformazione
// ---------------------------------------------------------------------------
// Tenta di applicare un'azione. Ritorna:
// { ok, equation, conditions, steps, note, rule, verified } oppure
// { ok:false, error, hint }
export function performAction(eq, action, extraCtx = {}) {
  const rule = RULES[action.ruleKey];
  if (!rule) return { ok: false, error: `Regola sconosciuta: ${action.ruleKey}` };
  const ctx = { ...action.build(extraCtx), ...extraCtx };
  const res = applyRule(rule, eq, ctx);
  if (!res.ok) return res;

  // Controllo di sicurezza: la nuova equazione deve essere ben formata
  // (nessun denominatore identicamente nullo).
  if (hasZeroDenominator(res.equation)) {
    return {
      ok: false,
      error: 'La trasformazione produrrebbe una divisione per zero: non è ammessa.',
      hint: 'Riformula con una diversa operazione.',
    };
  }
  return { ...res, rule };
}

function hasZeroDenominator(node) {
  node = unwrap(node);
  switch (node.type) {
    case 'Div':
      return isIdenticallyZero(node.den) || hasZeroDenominator(node.num) || hasZeroDenominator(node.den);
    case 'Add': case 'Sub': case 'Mul':
      return node.args.some(hasZeroDenominator);
    case 'Pow':
      return hasZeroDenominator(node.base) || hasZeroDenominator(node.exp);
    case 'Sqrt': case 'Neg':
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
    case 'Group':
      return hasZeroDenominator(node.arg);
    case 'Eq':
      return hasZeroDenominator(node.left) || hasZeroDenominator(node.right);
    default:
      return false;
  }
}

// Determina il nodo-funzione trascendente da invertire a partire dall'elemento
// selezionato. Casi gestiti:
//   - l'elemento È una funzione (sin/cos/tan/ln) la cui argomento contiene target;
//   - l'elemento è l'ARGOMENTO di una funzione, cioè un nodo figlio del membro;
//   - il membro stesso è una funzione.
function funcNodeOf(element, side, eq) {
  const node = unwrap(element.node);
  const isInvertible = (n) => ['Sin', 'Cos', 'Tan', 'Ln'].includes(n.type);

  // 1) l'elemento selezionato è già una funzione invertibile
  if (isInvertible(node)) return node;

  // 2) risali il padre: se l'elemento è l'argomento di una funzione invertibile
  //    (id del figlio termina con '/arg'), ricostruiamo il genitore.
  if (typeof element.id === 'string' && element.id.endsWith('/arg')) {
    const parentId = element.id.slice(0, -4);
    const parent = findElement(eq, parentId);
    if (parent && isInvertible(unwrap(parent.node))) return unwrap(parent.node);
  }

  // 3) il membro intero è una funzione invertibile
  const member = side === 'left' ? eq.left : eq.right;
  if (isInvertible(unwrap(member))) return unwrap(member);

  return null;
}

// Valore dell'esponente se il nodo è una potenza con esponente numerico intero.
function powExpValue(node) {
  node = unwrap(node);
  if (node.type === 'Pow' && isNum(unwrap(node.exp))) return unwrap(node.exp).value;
  return null;
}

// True se `member` contiene una frazione con fattore cancellabile den.
function hasCancellableFactor(member, den) {
  if (!member || !den) return false;
  return cancelFractionFactor(member, den) !== null;
}

// Trova un denominatore o fattore cancellabile in un membro
export function findCancellableFactor(member) {
  if (!member) return null;
  const m = unwrap(member);
  // Il meno davanti a una frazione non impedisce la semplificazione.
  if (m.type === 'Neg') return findCancellableFactor(m.arg);
  if (m.type === 'Mul') {
    const fracIdx = m.args.findIndex((a) => unwrap(a).type === 'Div');
    if (fracIdx >= 0) {
      const frac = unwrap(m.args[fracIdx]);
      const den = frac.den;
      if (m.args.some((f, i) => i !== fracIdx && equivalentExpr(f, den))) {
        return den;
      }
    }
  }
  if (m.type === 'Div') {
    const common = findCommonFactorInFraction(m);
    if (common) return common.cancelled;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5) Verifica dell'equivalenza tra due equazioni (per test e controlli)
// ---------------------------------------------------------------------------
export function equationsEquivalent(eqA, eqB) {
  return equivalentEq(eqA, eqB);
}

// ---------------------------------------------------------------------------
// 6) Modalità guidata: suggerisce il prossimo passo per isolare `target`.
// ---------------------------------------------------------------------------
// Ritorna { found:true, action, reason } oppure { found:false, message }.
// Vero se nel membro c'è un prodotto che contiene una somma in cui compare
// la grandezza cercata: in quel caso conviene applicare la proprietà
// distributiva prima di procedere (i termini con la grandezza si separano).
export function hasDistributableSum(node, target) {
  const u = unwrap(node);
  if (u.type === 'Mul') {
    if (u.args.some((a) => {
      const w = unwrap(a);
      return (w.type === 'Add' || w.type === 'Sub') && collectVars(w).has(target);
    })) return true;
  }
  if (u.type === 'Add' || u.type === 'Sub') {
    return u.args.some((a) => hasDistributableSum(a, target));
  }
  return false;
}

export function suggestNextStep(eq, target) {
  if (isGoalReached(eq, target)) {
    if (isolatedSide(eq.right, target) && !isolatedSide(eq.left, target)) {
      return {
        found: true,
        action: {
          id: 'swap',
          label: 'Scambia i membri per avere ' + target + ' al primo membro',
          description: 'Se A = B allora B = A (proprietà simmetrica dell\'uguaglianza).',
          ruleKey: 'swapSides',
          build: () => ({}),
        },
        reason: `La grandezza ${target} è isolata al secondo membro: scambia i membri per scriverla nella forma standard ${target} = ...`,
      };
    }
    return { found: false, message: 'Obiettivo già raggiunto!' };
  }

  // 1. Controllo prioritario: cancellazione o semplificazione di fattori su entrambi i membri
  const canL = findCancellableFactor(eq.left);
  if (canL) {
    const denText = toPretty(canL, 0);
    return {
      found: true,
      action: {
        id: 'cancel-factor',
        label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
        description: `Semplifica ${denText} (≠ 0) tra numeratore e denominatore.`,
        ruleKey: 'cancelFactor',
        build: () => ({ den: canL, side: 'left', denText }),
      },
      reason: `Al primo membro c'è un fattore comune ${denText} tra numeratore e denominatore: semplificalo prima di procedere.`,
    };
  }
  const canR = findCancellableFactor(eq.right);
  if (canR) {
    const denText = toPretty(canR, 0);
    return {
      found: true,
      action: {
        id: 'cancel-factor',
        label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
        description: `Semplifica ${denText} (≠ 0) tra numeratore e denominatore.`,
        ruleKey: 'cancelFactor',
        build: () => ({ den: canR, side: 'right', denText }),
      },
      reason: `Al secondo membro c'è un fattore comune ${denText} tra numeratore e denominatore: semplificalo prima di procedere.`,
    };
  }

  const side = whichSideHas(eq, target);
  if (side === 'both') {
    // Porta i termini con target a sinistra
    const rightTerms = additiveTerms(eq.right);
    const targetTermOnRight = rightTerms.find((t) => collectVars(t.node).has(target));
    if (targetTermOnRight && rightTerms.length > 1) {
      const tText = toPretty(targetTermOnRight.node, 0);
      return {
        found: true,
        action: {
          id: 'move-term',
          label: `Porta ${tText} al primo membro (cambio di segno)`,
          description: `Sottrai ${tText} da entrambi i membri per raggruppare ${target}.`,
          ruleKey: 'moveTerm',
          build: () => ({ term: targetTermOnRight.node, side: 'right', termText: tText }),
        },
        reason: `La grandezza ${target} compare in entrambi i membri: porta ${tText} a sinistra per raggrupparla.`,
      };
    }
    const leftTerms = additiveTerms(eq.left);
    const strangeOnLeft = leftTerms.find((t) => !collectVars(t.node).has(target));
    if (strangeOnLeft && leftTerms.length > 1) {
      const sText = toPretty(strangeOnLeft.node, 0);
      return {
        found: true,
        action: {
          id: 'move-term',
          label: `Porta ${sText} al secondo membro (cambio di segno)`,
          description: `Sottrai ${sText} da entrambi i membri per isolare i termini con ${target}.`,
          ruleKey: 'moveTerm',
          build: () => ({ term: strangeOnLeft.node, side: 'left', termText: sText }),
        },
        reason: `Il termine ${sText} non contiene ${target}: portalo a destra.`,
      };
    }
    // Se la grandezza è dentro una somma moltiplicata per un fattore, conviene
    // sviluppare il prodotto: R1·R2 = Req·(R1 + R2) → R1·R2 = Req·R1 + Req·R2.
    const isDistributable = (node) => {
      const u = unwrap(node);
      if (u.type !== 'Mul') return false;
      return u.args.some((a) => {
        const w = unwrap(a);
        return (w.type === 'Add' || w.type === 'Sub') && collectVars(w).has(target);
      });
    };
    const distSide = isDistributable(eq.right) ? 'right' : (isDistributable(eq.left) ? 'left' : null);
    if (distSide) {
      return {
        found: true,
        action: {
          id: 'distribute',
          label: `Sviluppa il prodotto al ${distSide === 'left' ? 'primo' : 'secondo'} membro (proprietà distributiva)`,
          description: `Applica la proprietà distributiva per separare i termini che contengono ${target}.`,
          ruleKey: 'distribute',
          build: () => ({ side: distSide }),
        },
        reason: `La grandezza ${target} è in una somma moltiplicata per un fattore: sviluppando il prodotto i termini con ${target} si possono raggruppare.`,
      };
    }

    return {
      found: true,
      action: {
        id: 'swap',
        label: 'Porta tutti i termini con ' + target + ' su un solo membro',
        description: 'Applica i principi di equivalenza per raggruppare la variabile.',
        ruleKey: 'swapSides',
        build: () => ({}),
      },
      reason: `La grandezza ${target} compare in entrambi i membri: occorre raggrupparla prima di isolarla.`,
    };
  }
  if (!side) {
    return { found: false, message: `La grandezza ${target} non compare nell'equazione.` };
  }

  const member = side === 'left' ? eq.left : eq.right;
  const other = side === 'left' ? eq.right : eq.left;
  const mU = unwrap(member);

  // Se la grandezza è intrappolata simultaneamente in sin e cos (es. a = g*(sin(theta) - mu*cos(theta))),
  // non è isolabile con i principi di equivalenza elementari né raccoglibile a fattor comune.
  if (hasTrigConflict(member, target)) {
    return {
      found: false,
      message: `La grandezza ${target} compare sia all'interno di sin(${target}) sia di cos(${target}). Non è possibile raccoglierla a fattor comune perché ${target} è l'argomento delle funzioni trigonometriche (sin(${target}) ≠ sin · ${target}) e l'equazione non è isolabile con i soli principi di equivalenza elementari.`,
    };
  }

  // Caso 0: segno negativo davanti al membro con la grandezza cercata.
  // Si moltiplicano entrambi i membri per −1 per liberare l'espressione.
  if (mU.type === 'Neg' && collectVars(mU.arg).has(target)) {
    const inner = toPretty(mU.arg, 0);
    return {
      found: true,
      action: {
        id: 'mul-by-minus-one',
        label: 'Moltiplica entrambi i membri per −1',
        description: `Cambia il segno di entrambi i membri per liberare ${inner}.`,
        ruleKey: 'mulBoth',
        build: () => ({ value: Num(-1), valueText: '−1' }),
      },
      reason: `Il membro con ${target} è preceduto dal segno meno: moltiplicando entrambi i membri per −1 l'espressione diventa positiva e più semplice da isolare.`,
    };
  }

  // Caso Radicale: Sqrt -> eleva al quadrato
  if (mU.type === 'Sqrt') {
    return {
      found: true,
      action: {
        id: 'square-both',
        label: 'Eleva entrambi i membri al quadrato',
        description: 'Elimina la radice quadrata elevando entrambi i membri alla seconda potenza.',
        ruleKey: 'powBoth',
        build: () => ({ value: Num(2), valueText: '2' }),
      },
      reason: `La grandezza ${target} si trova sotto radice quadrata: elevando entrambi i membri al quadrato la radice viene eliminata.`,
    };
  }

  // Caso 0: funzione trascendente
  if (['Sin', 'Cos', 'Tan', 'Ln'].includes(mU.type)) {
    const key = mU.type.toLowerCase();
    const info = FUNC_INFO[key];
    const argText = toPretty(mU.arg, 0);
    const condText = (key === 'sin' || key === 'cos') ? `, con ${toPretty(other, 0)} ∈ [−1, 1]` : '';
    return {
      found: true,
      action: {
        id: 'invert-function',
        label: `Applica la funzione inversa ${info.inverse} a entrambi i membri`,
        description: `Da ${key}(${argText}) = ${toPretty(other, 0)} si ottiene ${argText} = ${info.inverse}(${toPretty(other, 0)})${condText}.`,
        ruleKey: 'invertFunction',
        build: () => ({ side, fnNode: mU }),
      },
      reason: `La grandezza ${target} è "dentro" la funzione ${key}: per liberarla applica la funzione inversa ${info.inverse} a entrambi i membri${condText}.`,
    };
  }

  // Caso Denominatore comune (m.c.m.): se il membro opposto a target contiene una somma di frazioni
  // o una frazione composta, ridurla a denominatore comune è prioritario per avere un'unica frazione.
  if (canReduceToSingleFraction(other)) {
    const sideName = side === 'left' ? 'secondo' : 'primo';
    return {
      found: true,
      action: {
        id: 'common-denom',
        label: `Calcola il minimo comune multiplo (m.c.m.) al ${sideName} membro`,
        description: 'Somma le frazioni a denominatore comune per ottenere un\'unica frazione canonica.',
        ruleKey: 'commonDenom',
        build: () => ({ side: side === 'left' ? 'right' : 'left' }),
      },
      reason: `Al ${sideName} membro c'è una somma di frazioni: calcola il minimo comune multiplo (m.c.m.) per trasformarla in una singola frazione canonica.`,
    };
  }

  // Se invece il membro CON target contiene frazioni riducibili e NON ci sono addendi estranei da trasportare:
  const memberTerms = additiveTerms(member);
  const hasStrangeTerms = memberTerms.length > 1 && memberTerms.some((t) => !collectVars(t.node).has(target));
  if (!hasStrangeTerms && canReduceToSingleFraction(member)) {
    const sideName = side === 'left' ? 'primo' : 'secondo';
    return {
      found: true,
      action: {
        id: 'common-denom',
        label: `Calcola il minimo comune multiplo (m.c.m.) al ${sideName} membro`,
        description: 'Somma le frazioni a denominatore comune per ottenere un\'unica frazione canonica.',
        ruleKey: 'commonDenom',
        build: () => ({ side }),
      },
      reason: `Al ${sideName} membro c'è una somma di frazioni: calcola il minimo comune multiplo (m.c.m.) per trasformarla in una singola frazione canonica.`,
    };
  }

  // Se la variabile target è al denominatore di una frazione isolata 1/x = A/B,
  // la regola del reciproco (inverti entrambi i membri) è la via più elegante e diretta.
  if (mU.type === 'Div' && unwrap(mU.num).type === 'Num' && unwrap(mU.num).value === 1 && unwrap(mU.den).type === 'Var' && unwrap(mU.den).name === target) {
    const otherU = unwrap(other);
    if (otherU.type === 'Div') {
      return {
        found: true,
        action: {
          id: 'reciprocal',
          label: 'Inverti entrambi i membri (regola del reciproco)',
          description: `Da 1/${target} = A/B si ottiene ${target} = B/A invertendo numeratore e denominatore su entrambi i membri.`,
          ruleKey: 'reciprocalBoth',
          build: () => ({}),
        },
        reason: `L'incognita ${target} si trova al denominatore della frazione 1/${target} e l'altro membro è una frazione: applica la regola del reciproco per portarla subito al numeratore.`,
      };
    }
  }

  // Caso 1: il membro con target è una frazione
  if (mU.type === 'Div') {
    const den = mU.den;
    const denText = toPretty(den, 0);
    return {
      found: true,
      action: {
        id: 'mul-by-den',
        label: `Moltiplica entrambi i membri per ${denText}`,
        description: `Elimina il denominatore moltiplicando entrambi i membri per ${denText}.`,
        ruleKey: 'mulBoth',
        build: () => ({ value: den, valueText: denText }),
      },
      reason: collectVars(den).has(target)
        ? `La variabile ${target} è al denominatore di una frazione: moltiplicando entrambi i membri per ${denText} sale al numeratore.`
        : `Il membro contenente ${target} ha un denominatore ${denText}: moltiplicando entrambi i membri per ${denText} la frazione scompare.`,
    };
  }

  // Caso 2: somma/sottrazione con termini che non contengono target
  const terms = additiveTerms(member);
  if (terms.length > 1) {
    // Se la grandezza compare come fattore in TUTTI i termini, si raccoglie a
    // fattor comune: W = ½·m·v² − ½·m·v0²  →  W = m·(½·v² − ½·v0²).
    const hasBareTarget = (node) => {
      const u = unwrap(node);
      if (u.type === 'Var') return u.name === target;
      if (u.type === 'Neg') return hasBareTarget(u.arg);
      if (u.type === 'Mul') {
        return u.args.some((a) => hasBareTarget(a));
      }
      if (u.type === 'Div') return hasBareTarget(u.num);
      return false;
    };
    const allHaveBareTarget = terms.every((t) => hasBareTarget(t.node));
    if (allHaveBareTarget) {
      const targetNode = Var(target);
      return {
        found: true,
        action: {
          id: 'factor-common',
          label: `Raccogli ${target} a fattor comune`,
          description: `Metti in evidenza ${target}, presente in tutti i termini del membro.`,
          ruleKey: 'factorCommon',
          build: () => ({ common: targetNode, side, commonText: target }),
        },
        reason: `La grandezza ${target} compare in tutti i termini del membro: raccogliendola a fattor comune resterà un unico fattore da eliminare.`,
      };
    }

    const strange = terms.find((t) => !collectVars(t.node).has(target));
    if (strange) {
      const t = toPretty(strange.node, 0);
      return {
        found: true,
        action: {
          id: 'move-term',
          label: `Porta ${t} dall'altro membro (cambio di segno)`,
          description: `Sottrai ${t} da entrambi i membri per isolare ${target}.`,
          ruleKey: 'moveTerm',
          build: () => ({ term: strange.node, side, termText: t }),
        },
        reason: `Il termine ${t} è sommato/sottratto al termine contenente ${target}: trasportandolo dall'altra parte con il segno opposto ci si avvicina all'obiettivo.`,
      };
    }
  }

  // Caso 3: prodotto con fattori estranei a target
  if (mU.type === 'Mul') {
    const strange = mU.args.find((f) => !collectVars(unwrap(f)).has(target));
    if (strange) {
      const t = toPretty(strange, 0);
      return {
        found: true,
        action: {
          id: 'move-factor',
          label: `Dividi entrambi i membri per ${t}`,
          description: `Isola ${target} eliminando il fattore ${t} (richiede ${t} ≠ 0).`,
          ruleKey: 'moveFactor',
          build: () => ({ factor: unwrap(strange), side, factorText: t }),
        },
        reason: `Il fattore ${t} moltiplica la grandezza ${target}: per isolarla dividi entrambi i membri per ${t} (secondo principio).`,
      };
    }
  }

  // Caso 4: potenza
  const exp = powExpValue(mU);
  if (exp != null && Number.isInteger(exp) && exp > 1) {
    if (exp % 2 === 0) {
      return {
        found: true,
        action: {
          id: 'sqrt-both',
          label: `Estrai la radice ${exp === 2 ? 'quadrata' : exp + '-esima'} di entrambi i membri (indice pari)`,
          description: 'Radice di indice pari: introduce il segno ± e richiede radicando ≥ 0.',
          ruleKey: 'sqrtBoth',
          build: () => ({ side, insideVar: target }),
        },
        reason: `${target} è elevata a un esponente pari: estraendo la radice di indice pari compare ± e richiede radicando ≥ 0.`,
      };
    }
    return {
      found: true,
      action: {
        id: 'root-odd-both',
        label: `Estrai la radice ${exp}-esima di entrambi i membri (indice dispari)`,
        description: 'Radice di indice dispari: definita per ogni radicando, unica, senza ±.',
        ruleKey: 'rootOddBoth',
        build: () => ({ side, insideVar: target }),
      },
      reason: `${target} è elevata a un esponente dispari: estraendo la radice di indice dispari si isola senza ± e senza condizioni di segno.`,
    };
  }

  // Ultimo passo automatico: se la grandezza è dentro una somma moltiplicata
  // per un fattore, si sviluppa il prodotto per poterla raggruppare.
  if (hasDistributableSum(member, target)) {
    return {
      found: true,
      action: {
        id: 'distribute',
        label: `Sviluppa il prodotto al ${side === 'left' ? 'primo' : 'secondo'} membro (proprietà distributiva)`,
        description: `Applica la proprietà distributiva per separare i termini che contengono ${target}.`,
        ruleKey: 'distribute',
        build: () => ({ side }),
      },
      reason: `La grandezza ${target} è in una somma moltiplicata per un fattore: sviluppando il prodotto i termini con ${target} si possono raggruppare.`,
    };
  }

  return {
    found: false,
    message: `Non trovo un passo diretto automatico. Prova a selezionare un termine o fattore di ${target}.`,
  };
}

// ---------------------------------------------------------------------------
// 7) Rigenera un elenco di condizioni testuali a partire da un array
// ---------------------------------------------------------------------------
export function mergeConditions(existing, added) {
  const set = new Set(existing);
  for (const c of added) set.add(c);
  return Array.from(set);
}

export { toPretty, unwrap };
