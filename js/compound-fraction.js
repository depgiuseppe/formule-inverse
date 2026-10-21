// js/compound-fraction.js — Rilevamento e risoluzione didattica a passaggi delle frazioni di frazione (compound fractions)
//
// In matematica e fisica didattica, quando il risultato finale presenta una frazione al numeratore
// o al denominatore (es. v = -1 / ((fp - f)/(f·vo))), si applica la regola:
// "Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa)".
//
// Passaggi didattici:
// Passaggio 1: evidenziazione della frazione a doppio piano (stato attuale)
// Passaggio 2: moltiplicazione per la frazione reciproca del denominatore: N · (B / A)
// Passaggio 3: frazione normale canonica semplificata: (N · B) / A

import { Num, Div, Mul, Neg, Eq, Var, unwrap, clone, canonical, toPretty, collectVars } from './ast.js';
import { isolatedSide } from './algebra.js';

// Estrae le componenti frazionarie e il segno complessivo di un nodo
export function getFractionParts(node) {
  let sign = 1;
  let curr = unwrap(node);
  while (curr && curr.type === 'Neg') {
    sign = -sign;
    curr = unwrap(curr.arg);
  }
  if (curr && curr.type === 'Div') {
    return { isDiv: true, sign, num: curr.num, den: curr.den };
  }
  return { isDiv: false, sign, node: curr };
}

// Verifica se un nodo AST contiene una frazione di frazione (a qualsiasi livello)
export function hasCompoundFraction(node) {
  if (!node) return false;
  const u = unwrap(node);
  if (u.type === 'Div') {
    const pNum = getFractionParts(u.num);
    const pDen = getFractionParts(u.den);
    if (pNum.isDiv || pDen.isDiv) return true;
  }
  if (u.args) return u.args.some(hasCompoundFraction);
  if (u.arg) return hasCompoundFraction(u.arg);
  if (u.base && hasCompoundFraction(u.base)) return true;
  if (u.exp && hasCompoundFraction(u.exp)) return true;
  if (u.num && hasCompoundFraction(u.num)) return true;
  if (u.den && hasCompoundFraction(u.den)) return true;
  return false;
}

// Trasforma una frazione di frazione nella moltiplicazione per la reciproca (Passaggio 2)
// Casi gestiti:
// 1) (A / B) / (C / D)  =>  (A / B) · (D / C)
// 2) N / (A / B)        =>  N · (B / A)
// 3) (A / B) / D        =>  (A / B) · (1 / D)
export function transformToReciprocalMul(node) {
  if (!node) return node;
  const u = unwrap(node);
  if (u.type === 'Div') {
    const pNum = getFractionParts(u.num);
    const pDen = getFractionParts(u.den);

    // Caso 1: sia numeratore che denominatore sono frazioni
    if (pNum.isDiv && pDen.isDiv) {
      const totalSign = pNum.sign * pDen.sign;
      const numFrac = Div(pNum.num, pNum.den);
      const denReciprocal = Div(pDen.den, pDen.num);
      const prod = Mul(numFrac, denReciprocal);
      return totalSign < 0 ? Neg(prod) : prod;
    }

    // Caso 2: denominatore è una frazione N / (A / B) => N · (B / A)
    if (pDen.isDiv) {
      const denReciprocal = Div(pDen.den, pDen.num);
      let numNode = u.num;
      if (pDen.sign < 0) {
        numNode = Neg(numNode);
      }
      return Mul(numNode, denReciprocal);
    }

    // Caso 3: numeratore è una frazione (A / B) / D => (A / B) · (1 / D)
    if (pNum.isDiv) {
      let numFrac = Div(pNum.num, pNum.den);
      if (pNum.sign < 0) {
        numFrac = Neg(numFrac);
      }
      const denInv = Div(Num(1), u.den);
      return Mul(numFrac, denInv);
    }

    return Div(transformToReciprocalMul(u.num), transformToReciprocalMul(u.den));
  }
  if (node.type === 'Neg') {
    return Neg(transformToReciprocalMul(node.arg));
  }
  if (node.type === 'Group') {
    return { ...node, arg: transformToReciprocalMul(node.arg) };
  }
  if (node.type === 'Mul') {
    return Mul(...node.args.map(transformToReciprocalMul));
  }
  if (node.type === 'Add') {
    return { ...node, args: node.args.map(transformToReciprocalMul) };
  }
  if (node.type === 'Sub') {
    return { ...node, args: node.args.map(transformToReciprocalMul) };
  }
  if (node.type === 'Pow') {
    return { ...node, base: transformToReciprocalMul(node.base), exp: transformToReciprocalMul(node.exp) };
  }
  if (node.type === 'Sqrt') {
    return { ...node, arg: transformToReciprocalMul(node.arg) };
  }
  return node;
}

// Analizza l'equazione finale e, se contiene una frazione di frazione sul membro del risultato,
// restituisce i dati completi dei 3 passaggi didattici per l'animazione.
export function getCompoundFractionSteps(eq, targetVar) {
  if (!eq || eq.type !== 'Eq' || !targetVar) return null;
  let targetSide = null;
  let resultSide = null;

  const inL = collectVars(eq.left).has(targetVar);
  const inR = collectVars(eq.right).has(targetVar);
  if (inL && inR) return null;

  if (isolatedSide(eq.left, targetVar) && !inR) {
    targetSide = 'left';
    resultSide = 'right';
  } else if (isolatedSide(eq.right, targetVar) && !inL) {
    targetSide = 'right';
    resultSide = 'left';
  } else {
    return null;
  }

  const resNode = eq[resultSide];
  if (!hasCompoundFraction(resNode)) return null;

  const step1Eq = clone(eq);
  const step2ResNode = transformToReciprocalMul(clone(resNode));
  const step2Eq = targetSide === 'left' ? Eq(eq.left, step2ResNode) : Eq(step2ResNode, eq.right);

  let step3ResNode = canonical(clone(step2ResNode));
  while (hasCompoundFraction(step3ResNode)) {
    step3ResNode = canonical(transformToReciprocalMul(step3ResNode));
  }
  // Formula finale sempre con la variabile isolata al primo membro
  const targetNode = targetSide === 'left' ? eq.left : eq.right;
  const step3Eq = Eq(targetNode, step3ResNode);

  return {
    targetSide,
    resultSide,
    targetVar,
    step1Eq,
    step2Eq,
    step3Eq,
    step1Pretty: toPretty(step1Eq, 0),
    step2Pretty: toPretty(step2Eq, 0),
    step3Pretty: toPretty(step3Eq, 0),
  };
}
