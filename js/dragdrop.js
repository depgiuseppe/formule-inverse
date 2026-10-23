// dragdrop.js — Implementazione del Drag and Drop interattivo delle variabili
// tra membri dell'equazione (regola del trasporto, denominatori sottintesi, frazioni dinamiche).

import {
  unwrap, canonical, Num, Var, Mul, Div, Add, Sub, Neg, Eq,
  toPretty, structurallyEqual, isNum,
} from './ast.js';
import { parseExpression } from './parser.js';
import { prettyVar } from './render.js';
import { additiveTerms, rebuildSum } from './rules.js';

function isMatch(node, targetVarName) {
  const u = unwrap(node);
  if (u.type === 'Var' && u.name === targetVarName) return true;
  if (u.type === 'Num' && String(u.value) === String(targetVarName)) return true;
  if (toPretty(u, 0) === targetVarName) return true;
  if (u.type === 'Mul') {
    const mapArg = (x) => {
      const ux = unwrap(x);
      if (ux.type === 'Add' || ux.type === 'Sub') return `(${toPretty(ux, 0)})`;
      return toPretty(ux, 0);
    };
    const s1 = u.args.map(mapArg).join('*');
    const s2 = u.args.map(mapArg).join('·');
    if (s1 === targetVarName || s2 === targetVarName) return true;
  }
  if (u.type === 'Pow') {
    const p1 = toPretty(u, 0);
    const p2 = `${toPretty(u.base, 0)}^${toPretty(u.exp, 0)}`;
    if (p1 === targetVarName || p2 === targetVarName) return true;
  }
  try {
    const normalized = targetVarName
      .replace(/[₀-₉]/g, (c) => ({ '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }[c] || c))
      .replace(/·/g, '*')
      .replace(/θ/g, 'theta')
      .replace(/−/g, '-');
    const parsed = parseExpression(normalized);
    if (parsed && structurallyEqual(u, parsed)) return true;
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// 1. Operazioni algebriche sui membri
// ---------------------------------------------------------------------------

/**
 * Rimuove un fattore moltiplicativo dall'espressione di un membro.
 * Se l'espressione è un numeratore di frazione, rimuove il fattore dal numeratore.
 */
export function removeFactorFromExpr(expr, targetVarName) {
  expr = unwrap(expr);
  if (isMatch(expr, targetVarName)) {
    return Num(1);
  }
  if (expr.type === 'Neg') {
    // Forma canonica: Neg(Mul(2,a,s)) quando l'utente trascina '2', oppure Neg(A) quando trascina 'A'
    const inner = removeFactorFromExpr(expr.arg, targetVarName);
    if (structurallyEqual(inner, expr.arg)) return expr;
    if (inner.type === 'Num' && inner.value === 1) return Num(-1);
    return { type: 'Neg', arg: inner };
  }
  if (expr.type === 'Mul') {
    // 1. Ricerca diretta del fattore
    let idx = expr.args.findIndex((a) => isMatch(a, targetVarName));
    if (idx !== -1) {
      const remaining = expr.args.filter((_, i) => i !== idx);
      if (remaining.length === 0) return Num(1);
      if (remaining.length === 1) return remaining[0];
      return Mul(...remaining);
    }
    // 2. Ricerca di un fattore con segno meno (es. Neg(A) dove targetVarName è 'A', o Neg(Mul(A, ...)))
    const negIdx = expr.args.findIndex((a) => {
      const u = unwrap(a);
      if (u.type !== 'Neg') return false;
      const inner = removeFactorFromExpr(u.arg, targetVarName);
      return !structurallyEqual(inner, u.arg);
    });
    if (negIdx !== -1) {
      const u = unwrap(expr.args[negIdx]);
      const newInner = removeFactorFromExpr(u.arg, targetVarName);
      const newArg = (newInner.type === 'Num' && newInner.value === 1) ? Num(-1) : { type: 'Neg', arg: newInner };
      const newArgs = expr.args.map((a, i) => i === negIdx ? newArg : a);
      return Mul(...newArgs);
    }
    // 3. Caso Num(-x): il costruttore Neg(Num(x)) crea Num(-x) direttamente.
    // L'utente trascina il '2' visivo da Num(-2) → cerchiamo Num con valore negativo
    // il cui modulo corrisponde a targetVarName. Es. Num(-2) con varName='2'.
    // Dividendo per 2 il coefficiente diventa -1: Mul(Num(-1), a, s) → canonical → -a·s
    idx = expr.args.findIndex((a) => {
      const u = unwrap(a);
      return u.type === 'Num' && u.value < 0 && String(-u.value) === String(targetVarName);
    });
    if (idx !== -1) {
      const newArgs = expr.args.map((a, i) => i === idx ? Num(-1) : a);
      if (newArgs.length === 1) return newArgs[0];
      return Mul(...newArgs);
    }
    // 4. Ricerca di un fattore frazionario Div il cui numeratore contiene targetVarName (es. (3/2)*x -> trascino 3 -> (1/2)*x)
    const divIdx = expr.args.findIndex((a) => {
      const u = unwrap(a);
      if (u.type !== 'Div') return false;
      const res = removeFactorFromExpr(u.num, targetVarName);
      return !structurallyEqual(res, u.num);
    });
    if (divIdx !== -1) {
      const u = unwrap(expr.args[divIdx]);
      const newNum = removeFactorFromExpr(u.num, targetVarName);
      const newDiv = Div(newNum, u.den);
      const newArgs = expr.args.map((a, i) => i === divIdx ? newDiv : a);
      return Mul(...newArgs);
    }
  }
  if (expr.type === 'Div') {
    const newNum = removeFactorFromExpr(expr.num, targetVarName);
    return Div(newNum, expr.den);
  }
  return expr;
}

/**
 * Aggiunge un fattore al denominatore di un membro.
 * Se il membro è già una frazione, moltiplica il denominatore esistente.
 * Se il membro NON è una frazione, compare la linea di frazione (espressione / fattore).
 */
export function addFactorToDenominator(expr, factorNode) {
  expr = unwrap(expr);
  if (expr.type === 'Neg') {
    return { type: 'Neg', arg: addFactorToDenominator(expr.arg, factorNode) };
  }
  if (expr.type === 'Div') {
    const curDen = unwrap(expr.den);
    let newDen;
    if (curDen.type === 'Mul') {
      newDen = Mul(...curDen.args, factorNode);
    } else {
      newDen = Mul(curDen, factorNode);
    }
    return Div(expr.num, newDen);
  }
  return Div(expr, factorNode);
}

/**
 * Rimuove un fattore dal denominatore di una frazione (o da un fattore frazionario in un prodotto).
 * Se il denominatore conteneva solo questo fattore, la linea di frazione scompare
 * e rimane solo il numeratore!
 */
export function removeFactorFromDenominator(expr, targetVarName) {
  expr = unwrap(expr);
  if (expr.type === 'Neg') {
    const inner = removeFactorFromDenominator(expr.arg, targetVarName);
    return structurallyEqual(inner, expr.arg) ? expr : { type: 'Neg', arg: inner };
  }
  if (expr.type === 'Div') {
    const den = unwrap(expr.den);
    if (isMatch(den, targetVarName)) {
      return expr.num;
    }
    if (den.type === 'Neg') {
      const inner = removeFactorFromExpr(den.arg, targetVarName);
      if (!structurallyEqual(inner, den.arg)) {
        if (inner.type === 'Num' && inner.value === 1) {
          return { type: 'Neg', arg: expr.num };
        }
        return Div(expr.num, { type: 'Neg', arg: inner });
      }
    }
    if (den.type === 'Mul') {
      const idx = den.args.findIndex((a) => isMatch(a, targetVarName));
      if (idx !== -1) {
        const remaining = den.args.filter((_, i) => i !== idx);
        const newDen = remaining.length === 1 ? remaining[0] : Mul(...remaining);
        return Div(expr.num, newDen);
      }
      const negIdx = den.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== 'Neg') return false;
        const inner = removeFactorFromExpr(u.arg, targetVarName);
        return !structurallyEqual(inner, u.arg);
      });
      if (negIdx !== -1) {
        const u = unwrap(den.args[negIdx]);
        const newInner = removeFactorFromExpr(u.arg, targetVarName);
        const newArg = (newInner.type === 'Num' && newInner.value === 1) ? Num(-1) : { type: 'Neg', arg: newInner };
        const newArgs = den.args.map((a, i) => (i === negIdx ? newArg : a));
        return Div(expr.num, Mul(...newArgs));
      }
    }
  }
  if (expr.type === 'Mul') {
    const idx = expr.args.findIndex((a) => {
      const u = unwrap(a);
      if (u.type !== 'Div') return false;
      const den = unwrap(u.den);
      if (isMatch(den, targetVarName)) return true;
      if (den.type === 'Mul') {
        return den.args.some((d) => isMatch(d, targetVarName));
      }
      return false;
    });
    if (idx !== -1) {
      const updatedFactor = removeFactorFromDenominator(expr.args[idx], targetVarName);
      const uFact = unwrap(updatedFactor);
      let newArgs;
      // Se il fattore Div è diventato Num(1) (es. 1/2 con 2 rimosso -> 1), possiamo ometterlo dal prodotto se ci sono altri fattori!
      if (uFact.type === 'Num' && uFact.value === 1) {
        newArgs = expr.args.filter((_, i) => i !== idx);
        if (newArgs.length === 0) return Num(1);
        if (newArgs.length === 1) return newArgs[0];
        return Mul(...newArgs);
      } else {
        newArgs = expr.args.map((arg, i) => (i === idx ? updatedFactor : arg));
        return Mul(...newArgs);
      }
    }
  }
  return expr;
}

/**
 * Aggiunge un fattore al numeratore di un membro (moltiplicazione).
 */
export function addFactorToNumerator(expr, factorNode) {
  expr = unwrap(expr);
  if (expr.type === 'Neg') {
    return { type: 'Neg', arg: addFactorToNumerator(expr.arg, factorNode) };
  }
  if (expr.type === 'Num' && expr.value === 1) {
    return factorNode;
  }
  if (expr.type === 'Div') {
    const curNum = unwrap(expr.num);
    let newNum;
    if (curNum.type === 'Num' && curNum.value === 1) {
      newNum = factorNode;
    } else if (curNum.type === 'Mul') {
      newNum = Mul(...curNum.args, factorNode);
    } else {
      newNum = Mul(curNum, factorNode);
    }
    return Div(newNum, expr.den);
  }
  if (expr.type === 'Mul') {
    return Mul(...expr.args, factorNode);
  }
  return Mul(expr, factorNode);
}

/**
 * Trasporta un termine additivo con cambiamento di segno.
 */
export function moveAdditiveTermByDrag(fromExpr, toExpr, targetVarName) {
  const terms = additiveTerms(fromExpr);
  const idx = terms.findIndex((t) => isMatch(t.node, targetVarName));
  if (idx < 0) return null;

  const matched = terms[idx];
  const remaining = terms.filter((_, i) => i !== idx);
  const newFrom = remaining.length === 0 ? Num(0) : rebuildSum(remaining);

  // Cambio di segno: se era '-', diventa '+'; se era '+', diventa '-'
  const movedNode = matched.node;
  let newTo;
  const isToZero = isNum(unwrap(toExpr)) && unwrap(toExpr).value === 0;
  if (isToZero) {
    newTo = matched.sign === '-' ? movedNode : Neg(movedNode);
  } else {
    newTo = matched.sign === '-'
      ? Add(toExpr, movedNode)
      : Sub(toExpr, movedNode);
  }

  return { newFrom: canonical(newFrom), newTo: canonical(newTo), sign: matched.sign };
}

// ---------------------------------------------------------------------------
// Diagnostica avanzata degli errori di trasporto (1° e 2° principio)
// ---------------------------------------------------------------------------

function treeContainsTarget(node, targetVarName) {
  if (!node) return false;
  const u = unwrap(node);
  if (isMatch(u, targetVarName)) return true;
  if (u.type === 'Var' && u.name === targetVarName) return true;
  if (u.type === 'Num' && String(u.value) === String(targetVarName)) return true;
  if (toPretty(u, 0) === targetVarName) return true;
  if (u.args) return u.args.some((a) => treeContainsTarget(a, targetVarName));
  if (u.arg) return treeContainsTarget(u.arg, targetVarName);
  if (u.num && treeContainsTarget(u.num, targetVarName)) return true;
  if (u.den && treeContainsTarget(u.den, targetVarName)) return true;
  if (u.base && treeContainsTarget(u.base, targetVarName)) return true;
  if (u.exp && treeContainsTarget(u.exp, targetVarName)) return true;
  return false;
}

function findMulSum(node, varName, prettyName) {
  const un = unwrap(node);
  if (!un) return null;
  if (un.type === 'Mul') {
    for (let i = 0; i < un.args.length; i++) {
      const a = unwrap(un.args[i]);
      if ((a.type === 'Add' || a.type === 'Sub') && treeContainsTarget(a, varName)) {
        const others = un.args.filter((_, idx) => idx !== i);
        const multText = others.map((f) => prettyVar(toPretty(f, 0))).join(' · ') || 'un altro fattore';
        const sumText = prettyVar(toPretty(a, 0));
        return {
          error: `Non puoi spostare "${prettyName}" con la regola del trasporto perché si trova all'interno della parentesi (${sumText}) moltiplicata per ${multText}! Devi prima dividere entrambi i membri per ${multText} per liberare la parentesi, oppure puoi trascinare l'intero blocco (${sumText}) al denominatore dell'altro membro.`,
          hint: `Trascina prima ${multText} al denominatore dell'altro membro per dividere per ${multText}, oppure trascina l'intera parentesi (${sumText}) al denominatore!`,
        };
      }
    }
  }
  if (un.args) {
    for (const a of un.args) {
      const r = findMulSum(a, varName, prettyName);
      if (r) return r;
    }
  }
  if (un.arg) return findMulSum(un.arg, varName, prettyName);
  if (un.num) return findMulSum(un.num, varName, prettyName);
  if (un.den) return findMulSum(un.den, varName, prettyName);
  return null;
}

function findDivSum(node, varName, prettyName) {
  const un = unwrap(node);
  if (!un) return null;
  if (un.type === 'Div') {
    const num = unwrap(un.num);
    if ((num.type === 'Add' || num.type === 'Sub') && treeContainsTarget(num, varName)) {
      const denText = prettyVar(toPretty(un.den, 0));
      return {
        error: `Non puoi trasportare "${prettyName}" con cambio di segno finché si trova al numeratore della frazione con denominatore ${denText}! Devi prima moltiplicare entrambi i membri per ${denText} per eliminare la frazione.`,
        hint: `Trascina prima ${denText} al numeratore dell'altro membro per moltiplicare per ${denText}.`,
      };
    }
  }
  if (un.args) {
    for (const a of un.args) {
      const r = findDivSum(a, varName, prettyName);
      if (r) return r;
    }
  }
  if (un.arg) return findDivSum(un.arg, varName, prettyName);
  if (un.num) return findDivSum(un.num, varName, prettyName);
  if (un.den) return findDivSum(un.den, varName, prettyName);
  return null;
}

function findFunctionArg(node, varName, prettyName) {
  const un = unwrap(node);
  if (!un) return null;
  if (['Sin', 'Cos', 'Tan', 'Ln', 'Exp', 'Asin', 'Acos', 'Atan', 'Sqrt'].includes(un.type)) {
    if (treeContainsTarget(un.arg, varName)) {
      const fnName = un.type === 'Sqrt' ? 'radice quadrata' : `funzione ${un.type.toLowerCase()}`;
      return {
        error: `"${prettyName}" si trova all'interno dell'argomento di una ${fnName}! Non puoi trasportarlo con il 1° principio finché non applichi l'operazione inversa per liberare l'argomento.`,
        hint: `Isola prima la ${fnName} ed applica l'operazione inversa dal tastierino.`,
      };
    }
  }
  if (un.args) {
    for (const a of un.args) {
      const r = findFunctionArg(a, varName, prettyName);
      if (r) return r;
    }
  }
  if (un.arg) return findFunctionArg(un.arg, varName, prettyName);
  if (un.num) return findFunctionArg(un.num, varName, prettyName);
  if (un.den) return findFunctionArg(un.den, varName, prettyName);
  return null;
}

function findPow(node, varName, prettyName) {
  const un = unwrap(node);
  if (!un) return null;
  if (un.type === 'Pow') {
    if (treeContainsTarget(un.base, varName) || treeContainsTarget(un.exp, varName)) {
      const powText = prettyVar(toPretty(un, 0));
      return {
        error: `"${prettyName}" fa parte della potenza ${powText}! Non puoi trasportarlo singolarmente con il 1° principio.`,
        hint: `Trascina l'intera potenza oppure isolala ed estrai la radice.`,
      };
    }
  }
  if (un.args) {
    for (const a of un.args) {
      const r = findPow(a, varName, prettyName);
      if (r) return r;
    }
  }
  if (un.arg) return findPow(un.arg, varName, prettyName);
  if (un.num) return findPow(un.num, varName, prettyName);
  if (un.den) return findPow(un.den, varName, prettyName);
  return null;
}

function diagnoseInvalidAdditiveMove(fromExpr, varName, prettyName) {
  const u = unwrap(fromExpr);

  const mulSumRes = findMulSum(u, varName, prettyName);
  if (mulSumRes) return mulSumRes;

  const divSumRes = findDivSum(u, varName, prettyName);
  if (divSumRes) return divSumRes;

  const fnRes = findFunctionArg(u, varName, prettyName);
  if (fnRes) return fnRes;

  const powRes = findPow(u, varName, prettyName);
  if (powRes) return powRes;

  if (u.type === 'Add' || u.type === 'Sub') {
    for (const term of u.args) {
      const uTerm = unwrap(term);
      if (uTerm.type === 'Mul' && treeContainsTarget(uTerm, varName)) {
        const termText = prettyVar(toPretty(uTerm, 0));
        return {
          error: `Non puoi trasportare solo "${prettyName}": fa parte del termine moltiplicativo composto "${termText}". Trascina l'intero blocco del termine per trasportarlo con cambio di segno!`,
          hint: `Trascina l'intero termine "${termText}" oppure isolalo prima dagli altri addendi.`,
        };
      }
    }
  }

  const testFactor = removeFactorFromExpr(fromExpr, varName);
  if (!structurallyEqual(testFactor, fromExpr)) {
    return {
      error: `"${prettyName}" è un fattore che moltiplica l'intero membro, non un termine additivo! Per il 2° principio di equivalenza (divisione), per trasportarlo rilascialo sotto la linea di frazione (nello slot denominatore).`,
      hint: `Trascina "${prettyName}" sotto la linea di frazione del membro opposto per dividere.`,
    };
  }

  return {
    error: `Operazione non valida: "${prettyName}" non può essere spostato con il 1° principio di equivalenza perché non è un addendo isolato dell'intero membro.`,
    hint: `Verifica le precedenze delle operazioni: parentesi, moltiplicazioni o frazioni bloccano il trasporto diretto dell'addendo.`,
  };
}

function diagnoseInvalidDivision(fromExpr, varName, prettyName) {
  const u = unwrap(fromExpr);

  const mulSumRes = findMulSum(u, varName, prettyName);
  if (mulSumRes) return mulSumRes;

  const divSumRes = findDivSum(u, varName, prettyName);
  if (divSumRes) return divSumRes;

  const fnRes = findFunctionArg(u, varName, prettyName);
  if (fnRes) return fnRes;

  const powRes = findPow(u, varName, prettyName);
  if (powRes) return powRes;

  if (u.type === 'Add' || u.type === 'Sub') {
    return {
      error: `Non puoi dividere per "${prettyName}" finché fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno (1° principio).`,
      hint: `Trascina "${prettyName}" nello slot ± accanto al membro opposto per trasportarlo.`,
    };
  }

  return {
    error: `"${prettyName}" non è un fattore moltiplicativo dell'intero membro: non puoi dividere per esso.`,
    hint: `Puoi dividere solo per fattori che moltiplicano l'intero membro o l'intero numeratore.`,
  };
}

// ---------------------------------------------------------------------------
// 2. Applicazione della mossa di Drag & Drop
// ---------------------------------------------------------------------------

export function applyDragMove({ currentEq, varName, nodeType, fromSide, fromSlot, targetSide, targetSlot }) {
  if (!currentEq || !varName) {
    return { ok: false, error: 'Dati trascinamento non validi.' };
  }

  // Non consentiamo lo spostamento all'interno dello stesso membro se non cambia nulla
  if (fromSide === targetSide) {
    if (fromSlot === 'num' && targetSlot === 'den') {
      const oppMember = fromSide === 'right' ? 'primo membro (sotto la linea di frazione a sinistra)' : 'secondo membro (sotto la linea di frazione a destra)';
      return {
        ok: false,
        error: `Non puoi spostare ${prettyVar(varName)} al denominatore dello stesso membro! Per il 2° principio di equivalenza, se dividi per ${prettyVar(varName)}, esso va al denominatore del membro OPPOSTO (${oppMember}).`,
        hint: `Trascina ${prettyVar(varName)} sotto la linea di frazione del membro opposto!`,
      };
    }
    return {
      ok: false,
      error: 'Trascina la variabile dall\'altra parte dell\'uguale per applicare la regola del trasporto!',
    };
  }

  let factorNode;
  if (nodeType === 'Num') {
    factorNode = Num(Number(varName));
  } else {
    try {
      const cleanVar = varName
        .replace(/[₀-₉]/g, (c) => ({ '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }[c] || c))
        .replace(/−/g, '-')
        .replace(/·/g, '*');
      factorNode = parseExpression(cleanVar);
    } catch {
      factorNode = Var(varName);
    }
  }
  const prettyName = prettyVar(varName);
  let leftExpr = currentEq.left;
  let rightExpr = currentEq.right;

  // CASO A: Da Denominatore a Numeratore dell'altro membro (es. t in v = s/t)
  if (fromSlot === 'den' && targetSlot === 'num') {
    const fromExpr = fromSide === 'left' ? leftExpr : rightExpr;
    const updatedFrom = removeFactorFromDenominator(fromExpr, varName);
    if (structurallyEqual(updatedFrom, fromExpr)) {
      return {
        ok: false,
        error: `"${prettyName}" non è un fattore dell'intero denominatore: non puoi moltiplicare per esso finché fa parte di una somma.`,
      };
    }
    if (fromSide === 'right') {
      rightExpr = updatedFrom;
      leftExpr = addFactorToNumerator(leftExpr, factorNode);
    } else {
      leftExpr = updatedFrom;
      rightExpr = addFactorToNumerator(rightExpr, factorNode);
    }

    const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
    return {
      ok: true, principle: 'second',
      newEq,
      ruleName: `Trasporto di ${prettyName} a moltiplicare`,
      rulePrinciple: `Secondo principio di equivalenza: moltiplicando entrambi i membri per ${prettyName}, ${prettyName} si semplifica al denominatore e compare al numeratore dall'altro membro.`,
      steps: [`Trascino ${prettyName} dal denominatore al numeratore dell'altro membro (moltiplico entrambi i membri per ${prettyName}).`],
      conditions: [`${varName} ≠ 0`],
    };
  }

  // CASO B: Da Numeratore a Denominatore dell'altro membro (divisione)
  if (fromSlot === 'num' && targetSlot === 'den') {
    const fromExpr = fromSide === 'left' ? leftExpr : rightExpr;
    const uFrom = unwrap(fromExpr);
    const rawFrom = uFrom.type === 'Neg' ? unwrap(uFrom.arg) : uFrom;

    // Se l'espressione ha una somma e l'elemento non è un fattore consentito
    if (rawFrom.type === 'Add' || rawFrom.type === 'Sub') {
      return {
        ok: false,
        error: `Non puoi dividere per "${prettyName}" finché fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno.`,
        hint: `Trascina "${prettyName}" nello slot ± accanto al membro opposto per applicare il 1° principio di equivalenza (trasporto con cambio di segno).`,
      };
    }

    const updatedFrom = removeFactorFromExpr(fromExpr, varName);
    if (structurallyEqual(updatedFrom, fromExpr)) {
      const diag = diagnoseInvalidDivision(fromExpr, varName, prettyName);
      return {
        ok: false,
        error: diag.error,
        hint: diag.hint,
      };
    }

    if (fromSide === 'left') {
      leftExpr = updatedFrom;
      rightExpr = addFactorToDenominator(rightExpr, factorNode);
    } else {
      rightExpr = updatedFrom;
      leftExpr = addFactorToDenominator(leftExpr, factorNode);
    }

    const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
    return {
      ok: true, principle: 'second',
      newEq,
      ruleName: `Trasporto di ${prettyName} al denominatore`,
      rulePrinciple: `Secondo principio di equivalenza: dividendo entrambi i membri per ${prettyName}, compare la linea di frazione e ${prettyName} va al denominatore (${varName} ≠ 0).`,
      steps: [`Trascino ${prettyName} dal numeratore al denominatore dell'altro membro: compare la linea di frazione e divido entrambi i membri per ${prettyName}.`],
      conditions: [`${varName} ≠ 0`],
    };
  }

  // CASO C: Rilascio nello slot additivo "add" o da Numeratore a Numeratore (Termine Additivo con cambio di segno)
  if (targetSlot === 'add' || (fromSlot === 'num' && targetSlot === 'num')) {
    const fromExpr = fromSide === 'left' ? leftExpr : rightExpr;
    const toExpr = fromSide === 'left' ? rightExpr : leftExpr;

    const additiveRes = moveAdditiveTermByDrag(fromExpr, toExpr, varName);
    if (additiveRes) {
      const newL = fromSide === 'left' ? additiveRes.newFrom : additiveRes.newTo;
      const newR = fromSide === 'left' ? additiveRes.newTo : additiveRes.newFrom;
      const newEq = Eq(unwrap(newL), unwrap(newR));
      const opText = additiveRes.sign === '-' ? `sommo ${prettyName}` : `sottraggo ${prettyName}`;
      return {
        ok: true, principle: 'first',
        newEq,
        ruleName: `Trasporto del termine ${prettyName} (cambio segno)`,
        rulePrinciple: `Primo principio di equivalenza: spostando un termine additivo all'altro membro, esso cambia di segno (${opText} a entrambi i membri).`,
        steps: [`Trascino ${prettyName} all'altro membro con cambiamento di segno.`],
        conditions: [],
      };
    }

    // Se l'utente ha rilasciato sul membro opposto ma il token è un fattore moltiplicativo dell'intero membro,
    // applichiamo la divisione (2° principio) invece di bloccare il passaggio con un errore!
    if (targetSlot === 'num') {
      const updatedFrom = removeFactorFromExpr(fromExpr, varName);
      if (!structurallyEqual(updatedFrom, fromExpr)) {
        if (fromSide === 'left') {
          leftExpr = updatedFrom;
          rightExpr = addFactorToDenominator(rightExpr, factorNode);
        } else {
          rightExpr = updatedFrom;
          leftExpr = addFactorToDenominator(leftExpr, factorNode);
        }

          const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
          return {
            ok: true, principle: 'second',
            newEq,
            ruleName: `Trasporto di ${prettyName} al denominatore`,
            rulePrinciple: `Secondo principio di equivalenza: dividendo entrambi i membri per ${prettyName}, compare la linea di frazione e ${prettyName} va al denominatore (${varName} ≠ 0).`,
            steps: [`Trascino ${prettyName} all'altro membro: compare la linea di frazione e divido entrambi i membri per ${prettyName}.`],
            conditions: [`${varName} ≠ 0`],
          };
        }
      }

    // Se non era un termine additivo valido né un fattore dell'intero membro:
    const diag = diagnoseInvalidAdditiveMove(fromExpr, varName, prettyName);
    return {
      ok: false,
      error: diag.error,
      hint: diag.hint,
    };
  }

  return {
    ok: false,
    error: `Mossa non valida per ${prettyName}. Rilascia sul denominatore per dividere o nello slot accanto per trasportare il termine.`,
  };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 3. Freccia dinamica durante il drag
// ---------------------------------------------------------------------------
// La freccia è un <path> SVG cubico: il formato è sempre identico
// (M x1 y1 C cx1 cy1 cx2 cy2 x2 y2) così la proprietà CSS `d` può
// transitare fluidamente tra forma dritta (2° principio) e arco (1° principio).

let _arrowSvg = null;
let _arrowContainer = null;
let _arrowPath = null;
let _arrowHideTimer = null;

// SVG fixed su document.body: coordinate viewport, nessun problema di stacking o overflow.
export function initDragArrow() {
  if (_arrowSvg && _arrowSvg.parentNode) _arrowSvg.parentNode.removeChild(_arrowSvg);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'drag-arrow-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;overflow:visible;z-index:9998';

  const defs = document.createElementNS(NS, 'defs');
  const marker = document.createElementNS(NS, 'marker');
  marker.setAttribute('id', 'drag-arrowhead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '4');
  marker.setAttribute('orient', 'auto');
  const tip = document.createElementNS(NS, 'polygon');
  tip.setAttribute('points', '0 0, 10 4, 0 8');
  tip.setAttribute('fill', '#ef4444');
  marker.appendChild(tip);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#ef4444');
  path.setAttribute('stroke-width', '2.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('marker-end', 'url(#drag-arrowhead)');
  path.style.visibility = 'hidden';
  path.style.opacity = '0';
  svg.appendChild(path);

  document.body.appendChild(svg);
  _arrowSvg = svg;
  _arrowPath = path;
  _arrowContainer = null;
}

export function updateDragArrow(sourceEl, targetEl, crossesMember) {
  if (!_arrowPath || !sourceEl || !targetEl) return;
  if (_arrowHideTimer) { clearTimeout(_arrowHideTimer); _arrowHideTimer = null; }

  // Coordinate viewport dirette: SVG è position:fixed su body
  const sR = sourceEl.getBoundingClientRect();
  const tR = targetEl.getBoundingClientRect();

  const x1 = sR.left + sR.width / 2;
  const y1 = sR.top + sR.height / 2;
  const x2 = tR.left + tR.width / 2;
  const y2 = tR.top + tR.height / 2;

  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
  const shorten = Math.min(14, len * 0.12);
  const ex = x2 - (x2 - x1) / len * shorten;
  const ey = y2 - (y2 - y1) / len * shorten;

  const slot = targetEl.dataset.slot || (targetEl.closest('[data-slot]') && targetEl.closest('[data-slot]').dataset.slot);
  const isTransport = slot === 'add' || targetEl.classList.contains('dropzone-adjacent') || !!targetEl.closest('.dropzone-adjacent');

  let d;
  if (isTransport) {
    // 1° principio (regola del trasporto con cambio di segno) — arco sopra il segno =
    const midX = (x1 + ex) / 2;
    const topY = Math.min(y1, ey) - 72;
    d = `M ${x1} ${y1} C ${midX} ${topY} ${midX} ${topY} ${ex} ${ey}`;
  } else {
    // 2° principio (verso il denominatore per dividere o numeratore per moltiplicare) — linea dritta
    d = `M ${x1} ${y1} L ${ex} ${ey}`;
  }

  try { _arrowPath.style.d = `path("${d}")`; } catch (_) {}
  _arrowPath.setAttribute('d', d);
  _arrowPath.style.visibility = 'visible';
  _arrowPath.style.opacity = '0.92';
}

export function hideDragArrow() {
  if (!_arrowPath) return;
  if (_arrowHideTimer) clearTimeout(_arrowHideTimer);
  _arrowPath.style.opacity = '0';
  _arrowHideTimer = setTimeout(() => {
    if (_arrowPath) _arrowPath.style.visibility = 'hidden';
    _arrowHideTimer = null;
  }, 320);
}

// ---------------------------------------------------------------------------
// 3b. Controller Drag & Drop per la vista HTML
// ---------------------------------------------------------------------------

let activeDragData = null;
let touchDraggedElem = null;
let touchStartPos = null;
let activePointerId = null;
let touchHasMoved = false;
let lastPointerType = 'mouse';
let lastTouchDragEndAt = 0;
let globalTouchListenersBound = false;

export function wasRecentTouchDrag() {
  return Date.now() - lastTouchDragEndAt < 350;
}

export function cleanupTouchDrag(container) {
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.touch-drag-badge').forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    document.querySelectorAll('.is-being-dragged').forEach((el) => {
      el.classList.remove('is-being-dragged');
    });
  }

  if (touchDraggedElem && activePointerId !== null) {
    try {
      if (touchDraggedElem.hasPointerCapture && touchDraggedElem.hasPointerCapture(activePointerId)) {
        touchDraggedElem.releasePointerCapture(activePointerId);
      }
    } catch (_) {}
  }

  const targetContainer = container || (typeof document !== 'undefined' ? document.getElementById('equation-display') : null);
  if (targetContainer) {
    targetContainer.classList.remove('is-dragging-equation', 'lim-stylus-mode', 'lim-stylus-active');
    clearDropzonesHighlight(targetContainer);
  }

  hideDragArrow();
  activeDragData = null;
  touchDraggedElem = null;
  touchStartPos = null;
  activePointerId = null;
  touchHasMoved = false;
}

function bindGlobalTouchSafetyListeners() {
  if (globalTouchListenersBound || typeof window === 'undefined') return;
  globalTouchListenersBound = true;

  const safeClean = () => {
    if (touchDraggedElem || activeDragData) {
      cleanupTouchDrag();
    }
  };

  window.addEventListener('blur', safeClean);
  window.addEventListener('pagehide', safeClean);
  window.addEventListener('contextmenu', () => {
    if (lastPointerType !== 'mouse') safeClean();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) safeClean();
  });
  document.addEventListener('pointercancel', safeClean, true);
}

export function setupEquationDragAndDrop(container, { onApplyMove, getCurrentEquation }) {
  if (!container) return;

  cleanupTouchDrag(container);
  bindGlobalTouchSafetyListeners();

  let activeDragSourceEl = null;

  // Gestione HTML5 Drag and Drop nativo
  container.querySelectorAll('.draggable-token').forEach((token) => {
    token.setAttribute('draggable', 'true');

    token.addEventListener('dragstart', (e) => {
      if (lastPointerType !== 'mouse' || touchDraggedElem) {
        // Su touch/pen usiamo Pointer Events; blocca il drag HTML5 nativo concorrente
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.stopPropagation(); // Evita che il drag di una lettera si propaghi al gruppo genitore
      const varName = token.dataset.varName;
      const fromSide = token.dataset.side;
      const fromSlot = token.dataset.slot || 'num';
      const nodeType = token.dataset.nodeType || 'Var';

      activeDragData = { varName, fromSide, fromSlot, nodeType };
      activeDragSourceEl = token;
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', JSON.stringify(activeDragData));
        e.dataTransfer.effectAllowed = 'move';
      }

      token.classList.add('is-being-dragged');
      container.classList.add('is-dragging-equation');
      highlightDropzones(container, activeDragData);
    });

    token.addEventListener('dragend', () => {
      token.classList.remove('is-being-dragged');
      container.classList.remove('is-dragging-equation');
      clearDropzonesHighlight(container);
      hideDragArrow();
      activeDragData = null;
      activeDragSourceEl = null;
    });
  });

  // Aggiorna la freccia mentre il cursore si sposta sopra il container
  container.addEventListener('dragover', (e) => {
    if (!activeDragData || !activeDragSourceEl) return;
    const dz = e.target.closest('.dropzone[data-side][data-slot]');
    if (dz && !dz.contains(activeDragSourceEl)) {
      const crossesMember = dz.dataset.side !== activeDragData.fromSide;
      updateDragArrow(activeDragSourceEl, dz, crossesMember);
    } else {
      hideDragArrow();
    }
  });

  // Gestione zone di rilascio (dropzones)
  container.querySelectorAll('.dropzone').forEach((dropzone) => {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      dropzone.classList.add('dropzone-hover');
      const slot = dropzone.querySelector('.drop-slot');
      if (slot) slot.classList.add('drop-slot-hover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dropzone-hover');
      const slot = dropzone.querySelector('.drop-slot');
      if (slot) slot.classList.remove('drop-slot-hover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone-hover');
      const slot = dropzone.querySelector('.drop-slot');
      if (slot) slot.classList.remove('drop-slot-hover');
      container.classList.remove('is-dragging-equation');

      let dragData = activeDragData;
      if (!dragData && e.dataTransfer) {
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) dragData = JSON.parse(raw);
        } catch {
          // ignora
        }
      }

      if (!dragData) return;

      const targetSide = dropzone.dataset.side;
      const targetSlot = dropzone.dataset.slot;

      const sourceRect = activeDragSourceEl ? activeDragSourceEl.getBoundingClientRect() : null;
      const targetRect = dropzone.getBoundingClientRect();
      const tokenText = dragData ? (dragData.varName || '') : '';

      const currentEq = getCurrentEquation();
      const result = applyDragMove({
        currentEq,
        varName: dragData.varName,
        nodeType: dragData.nodeType,
        fromSide: dragData.fromSide,
        fromSlot: dragData.fromSlot,
        targetSide,
        targetSlot,
      });

      clearDropzonesHighlight(container);
      activeDragData = null;

      if (onApplyMove) {
        onApplyMove(result, { sourceRect, targetRect, tokenText, targetSide, targetSlot, varName: dragData?.varName });
      }
    });
  });

  // Supporto Pointer / Touch per dispositivi touch (iPad, mobile o trackpad click-drag)
  setupTouchDragFallback(container, { onApplyMove, getCurrentEquation });
}

export function highlightDropzones(container, dragData) {
  const oppositeSide = dragData.fromSide === 'left' ? 'right' : 'left';
  container.querySelectorAll(`.dropzone[data-side="${oppositeSide}"]`).forEach((dz) => {
    dz.classList.add('dropzone-active-target');
  });

  // Mostra gli spazi di inserimento accanto alle quantità già presenti,
  // rispettando la posizione (numeratore o denominatore).
  container.querySelectorAll(`.drop-slot[data-side="${oppositeSide}"]`).forEach((slot) => {
    slot.classList.add('drop-slot-visible');
  });

  // Mostra lo slot additivo e la linea di frazione dinamica dell'altro membro
  container.querySelectorAll(`.dynamic-fraction-wrapper[data-side="${oppositeSide}"]`).forEach((wrap) => {
    wrap.classList.add('wrapper-expanded');
  });
  container.querySelectorAll(`.dropzone-adjacent[data-side="${oppositeSide}"]`).forEach((adj) => {
    adj.classList.add('adjacent-active');
  });
}

export function clearDropzonesHighlight(container) {
  container.querySelectorAll('.dropzone').forEach((dz) => {
    dz.classList.remove('dropzone-active-target', 'dropzone-hover');
  });
  container.querySelectorAll('.drop-slot').forEach((slot) => {
    slot.classList.remove('drop-slot-visible', 'drop-slot-hover');
  });
  container.querySelectorAll('.dynamic-fraction-wrapper').forEach((wrap) => {
    wrap.classList.remove('wrapper-expanded');
  });
  container.querySelectorAll('.dropzone-adjacent').forEach((adj) => {
    adj.classList.remove('adjacent-active');
  });
}

/**
 * Calibrazione precisa del tocco e dello stilo LIM (Lavagna Interattiva Multimediale).
 * Cerca prima il contatto diretto via elementFromPoint; se assente o impreciso (dovuto
 * alla parallasse del vetro spesso o a tratti veloci della penna), ricerca geometricamente
 * la dropzone di destinazione più vicina entro la soglia di tolleranza calibrata.
 */
export function findCalibratedDropzone(container, clientX, clientY, pointerType = 'touch', activeDragData = null) {
  if (!container || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

  // 1. Risoluzione diretta del punto
  if (typeof document !== 'undefined') {
    const elemBelow = document.elementFromPoint(clientX, clientY);
    const directDz = elemBelow ? elemBelow.closest('.dropzone') : null;
    if (directDz) {
      if (activeDragData &&
          directDz.dataset.side === activeDragData.fromSide &&
          directDz.dataset.slot === activeDragData.fromSlot) {
        return null;
      }
      return directDz;
    }
  }

  // 2. Calibrazione di prossimità per stilo LIM e tocco
  const isPen = pointerType === 'pen';
  const isLimMode = container.classList.contains('lim-mode') ||
    (typeof document !== 'undefined' && (document.body.classList.contains('lim-mode') || document.body.classList.contains('lim-stylus-mode')));

  // Tolleranza estesa per penna LIM (fino a 52px, 68px in LIM-mode)
  const maxDistance = isPen ? (isLimMode ? 68 : 52) : (isLimMode ? 46 : 32);

  const candidates = Array.from(container.querySelectorAll('.dropzone'));
  let bestDz = null;
  let bestDist = Infinity;

  for (const dz of candidates) {
    if (activeDragData &&
        dz.dataset.side === activeDragData.fromSide &&
        dz.dataset.slot === activeDragData.fromSlot) {
      continue;
    }
    const rect = dz.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Distanza euclidea dal punto alle coordinate rettangolari della dropzone
    const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
    const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
    const dist = Math.hypot(dx, dy);

    if (dist <= maxDistance && dist < bestDist) {
      bestDist = dist;
      bestDz = dz;
    }
  }

  return bestDz;
}

/**
 * Pointer events per touch screens (iPad / mobile / laptop touch) e stilo LIM.
 */
function setupTouchDragFallback(container, { onApplyMove, getCurrentEquation }) {
  container.querySelectorAll('.draggable-token').forEach((token) => {
    token.addEventListener('pointerdown', (e) => {
      lastPointerType = e.pointerType || 'touch';
      if (e.pointerType === 'mouse') return; // mouse usa drag/drop nativo HTML5

      // Rilevamento avanzato penna LIM / Apple Pencil / stylus
      if (e.pointerType === 'pen') {
        container.classList.add('lim-stylus-mode');
        if (typeof document !== 'undefined') document.body.classList.add('stylus-detected');
      }

      // Impedisce che il touch su una singola variabile si propaghi al gruppo genitore (.math-term-group)
      e.stopPropagation();

      if (e.isPrimary === false) {
        cleanupTouchDrag(container);
        return;
      }

      // Pulisce sempre eventuali stati di drag precedenti prima di iniziarne uno nuovo
      cleanupTouchDrag(container);

      touchDraggedElem = token;
      activePointerId = e.pointerId;
      touchStartPos = { x: e.clientX, y: e.clientY };
      touchHasMoved = false;

      const varName = token.dataset.varName;
      const fromSide = token.dataset.side;
      const fromSlot = token.dataset.slot || 'num';
      const nodeType = token.dataset.nodeType || 'Var';
      activeDragData = { varName, fromSide, fromSlot, nodeType };

      // Nessun clone/badge fluttuante (.touch-drag-badge) viene iniettato nel DOM:
      // l'interazione touch evidenzia esclusivamente il token e le dropzone di destinazione.
      token.classList.add('is-being-dragged');
      container.classList.add('is-dragging-equation');
      highlightDropzones(container, activeDragData);
      try {
        token.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    token.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return;
      if (touchDraggedElem !== token || !activeDragData) return;
      e.stopPropagation();

      if (touchStartPos && Math.hypot(e.clientX - touchStartPos.x, e.clientY - touchStartPos.y) > 6) {
        touchHasMoved = true;
      }

      // Risoluzione calibrata della dropzone
      const dropzone = findCalibratedDropzone(container, e.clientX, e.clientY, e.pointerType, activeDragData);

      container.querySelectorAll('.dropzone').forEach((dz) => {
        dz.classList.remove('dropzone-hover');
        const slot = dz.querySelector('.drop-slot');
        if (slot) slot.classList.remove('drop-slot-hover');
      });

      const isSameOriginSlot = dropzone && activeDragData &&
        dropzone.dataset.side === activeDragData.fromSide &&
        dropzone.dataset.slot === activeDragData.fromSlot;

      if (dropzone && !isSameOriginSlot) {
        dropzone.classList.add('dropzone-hover');
        const slot = dropzone.querySelector('.drop-slot');
        if (slot) slot.classList.add('drop-slot-hover');
        const crossesMember = dropzone.dataset.side !== activeDragData?.fromSide;
        updateDragArrow(token, dropzone, crossesMember);
      } else {
        hideDragArrow();
      }
    });

    token.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();

      const isCurrentToken = touchDraggedElem === token;
      const dragData = activeDragData ? { ...activeDragData } : null;
      const hadMoved = touchHasMoved;

      // Risoluzione calibrata al rilascio dello stilo/dito
      const dropzone = findCalibratedDropzone(container, e.clientX, e.clientY, e.pointerType, dragData);

      // Ripristina sempre lo stato visivo e rimuove gli highlight delle dropzone
      cleanupTouchDrag(container);

      if (!isCurrentToken || !dragData) return;

      if (hadMoved) {
        lastTouchDragEndAt = Date.now();
      }

      if (!dropzone) return;

      const targetSide = dropzone.dataset.side;
      const targetSlot = dropzone.dataset.slot;

      // Se l'utente ha solo toccato il token sul posto o lo ha rilasciato nello stesso slot di partenza,
      // non eseguire una mossa invalida (lascia che il tap selezioni l'elemento).
      if (targetSide === dragData.fromSide && targetSlot === dragData.fromSlot) {
        return;
      }

      lastTouchDragEndAt = Date.now();
      const tokenText = prettyVar(dragData.varName || '');
      const currentEq = getCurrentEquation();

      const result = applyDragMove({
        currentEq,
        varName: dragData.varName,
        nodeType: dragData.nodeType,
        fromSide: dragData.fromSide,
        fromSlot: dragData.fromSlot,
        targetSide,
        targetSlot,
      });

      if (onApplyMove) {
        onApplyMove(result, { sourceRect: null, targetRect: null, tokenText, targetSide, targetSlot, varName: dragData.varName });
      }
    });

    const handleCancelOrLostCapture = (e) => {
      if (e && e.pointerType === 'mouse') return;
      cleanupTouchDrag(container);
    };

    token.addEventListener('pointercancel', handleCancelOrLostCapture);
    token.addEventListener('lostpointercapture', handleCancelOrLostCapture);
  });
}
