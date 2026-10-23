// common-denom.js — Calcolo del minimo comune multiplo (m.c.m.) per somme di frazioni
// e risoluzione delle frazioni composte (doppie frazioni) in un'unica frazione canonica.
//
// Regole algebriche supportate:
//  1) Somma di frazioni a denominatore comune (m.c.m.):
//     A/B + C/D = (A·D + B·C) / (B·D)
//     1/R1 + 1/R2 = (R1 + R2) / (R1·R2)
//  2) Somma o differenza tra frazioni e numeri/termini interi:
//     A/B + C = (A + B·C) / B
//     A - B/C = (A·C − B) / C
//  3) Frazioni con frazione al denominatore o numeratore (doppie frazioni):
//     A / (B/C) = (A·C) / B
//     (A/B) / C = A / (B·C)
//     (A/B) / (C/D) = (A·D) / (B·C)
//  4) Frazioni con somma di frazioni al denominatore:
//     1 / (1/R1 + 1/R2) = 1 / ((R1 + R2)/(R1·R2)) = (R1·R2) / (R1 + R2)
//
// Obiettivo: garantire sempre la riduzione ricorsiva a un'UNICA frazione canonica.

import {
  Num, Var, Add, Sub, Mul, Div, Pow, Sqrt, Neg, Group, Eq,
  unwrap, canonical, toPretty, clone,
} from './ast.js';
import { memberAsFraction } from './reciprocals.js';

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

const isOne = (node) => {
  const u = unwrap(node);
  return u.type === 'Num' && u.value === 1;
};

// Estrae numeratore, denominatore e segno di un termine
export function termAsFraction(node) {
  let sign = 1;
  let curr = unwrap(node);
  while (curr.type === 'Neg') {
    sign = -sign;
    curr = unwrap(curr.arg);
  }
  if (curr.type === 'Num' && curr.value < 0) {
    sign = -sign;
    curr = Num(-curr.value);
  }

  const frac = memberAsFraction(curr);
  return {
    sign,
    num: frac.num,
    den: frac.den,
    hasDen: !isOne(frac.den),
  };
}

// Scompone un denominatore in coefficiente numerico intero e fattori simbolici con relative potenze
export function decomposeDenominator(node) {
  let curr = unwrap(node);
  while (curr.type === 'Group') curr = unwrap(curr.arg);

  let coeff = 1;
  const factors = new Map(); // key -> { node, power }

  function addFactor(factorNode, power = 1) {
    const u = unwrap(factorNode);
    if (u.type === 'Num') {
      if (Number.isInteger(u.value) && u.value > 0) {
        coeff *= u.value;
      }
      return;
    }
    if (u.type === 'Pow' && u.exp.type === 'Num' && Number.isInteger(u.exp.value) && u.exp.value > 0) {
      addFactor(u.base, power * u.exp.value);
      return;
    }
    const key = toPretty(u, 0);
    const existing = factors.get(key);
    if (existing) {
      existing.power += power;
    } else {
      factors.set(key, { node: clone(u), power });
    }
  }

  if (curr.type === 'Num') {
    if (Number.isInteger(curr.value) && curr.value > 0) coeff = curr.value;
  } else if (curr.type === 'Mul') {
    for (const arg of curr.args) {
      addFactor(arg);
    }
  } else {
    addFactor(curr);
  }

  return { coeff, factors };
}

// Calcola il minimo comune multiplo di una lista di denominatori scomposti
export function computeLcmDenominator(decomposedList) {
  let totalCoeff = 1;
  const maxPowers = new Map(); // key -> { node, power }

  for (const dec of decomposedList) {
    totalCoeff = lcm(totalCoeff, dec.coeff);
    for (const [key, item] of dec.factors.entries()) {
      const existing = maxPowers.get(key);
      if (!existing || existing.power < item.power) {
        maxPowers.set(key, { node: clone(item.node), power: item.power });
      }
    }
  }

  const factors = [];
  if (totalCoeff > 1) {
    factors.push(Num(totalCoeff));
  }
  for (const item of maxPowers.values()) {
    if (item.power === 1) {
      factors.push(item.node);
    } else {
      factors.push(Pow(item.node, Num(item.power)));
    }
  }

  const lcmNode = factors.length === 0
    ? Num(1)
    : (factors.length === 1 ? factors[0] : Mul(...factors));

  return { totalCoeff, maxPowers, lcmNode };
}

// Calcola il quoziente moltiplicatore (LCM / denominatore del termine)
export function computeQuotient(totalCoeff, maxPowers, dec) {
  const mult = [];
  const numQuotient = totalCoeff / dec.coeff;
  if (numQuotient > 1) {
    mult.push(Num(numQuotient));
  }
  for (const [key, item] of maxPowers.entries()) {
    const present = dec.factors.get(key);
    const presentPower = present ? present.power : 0;
    const diff = item.power - presentPower;
    if (diff > 0) {
      if (diff === 1) {
        mult.push(clone(item.node));
      } else {
        mult.push(Pow(clone(item.node), Num(diff)));
      }
    }
  }
  if (mult.length === 0) return Num(1);
  if (mult.length === 1) return mult[0];
  return Mul(...mult);
}

// Moltiplica un numeratore per il rispettivo quoziente
function multiplyNumerator(num, quotient) {
  if (isOne(quotient)) return clone(num);
  if (isOne(num)) return clone(quotient);
  const uNum = unwrap(num);
  const uQ = unwrap(quotient);
  if (uNum.type === 'Mul' && uQ.type === 'Mul') {
    return Mul(...uNum.args, ...uQ.args);
  }
  if (uNum.type === 'Mul') {
    return Mul(...uNum.args, quotient);
  }
  if (uQ.type === 'Mul') {
    return Mul(num, ...uQ.args);
  }
  return Mul(num, quotient);
}

// Estrae i termini additivi di un'espressione sommati o sottratti
export function getAdditiveTerms(node) {
  const u = unwrap(node);
  if (u.type === 'Add') {
    const res = [];
    for (const a of u.args) {
      res.push(...getAdditiveTerms(a));
    }
    return res;
  }
  if (u.type === 'Sub') {
    const res = [];
    const firstTerms = getAdditiveTerms(u.args[0]);
    res.push(...firstTerms);
    for (let i = 1; i < u.args.length; i++) {
      const subTerms = getAdditiveTerms(u.args[i]);
      for (const t of subTerms) {
        res.push({ sign: -t.sign, node: t.node });
      }
    }
    return res;
  }
  if (u.type === 'Neg') {
    const inner = getAdditiveTerms(u.arg);
    return inner.map(t => ({ sign: -t.sign, node: t.node }));
  }
  return [{ sign: 1, node: u }];
}

// Riduce una somma/differenza di frazioni e termini a una sola frazione con m.c.m.
export function reduceAdditiveTermsToCommonDenominator(node) {
  const rawTerms = getAdditiveTerms(node);
  if (rawTerms.length === 0) return node;

  // Prima riduci ciascun termine ricorsivamente
  const terms = rawTerms.map(t => {
    const reducedNode = reduceToSingleFraction(t.node);
    const frac = termAsFraction(reducedNode);
    return {
      sign: t.sign * frac.sign,
      num: frac.num,
      den: frac.den,
      hasDen: frac.hasDen,
    };
  });

  // Se nessun termine ha un denominatore diverso da 1, non c'è somma di frazioni da fare
  const anyFraction = terms.some(t => t.hasDen);
  if (!anyFraction) {
    if (terms.length === 1) {
      const single = terms[0];
      return single.sign < 0 ? canonical(Neg(single.num)) : canonical(single.num);
    }
    const pos = terms.filter(t => t.sign > 0).map(t => t.num);
    const neg = terms.filter(t => t.sign < 0).map(t => t.num);
    if (neg.length === 0) return canonical(Add(...pos));
    if (pos.length === 0) return canonical(Neg(neg.length === 1 ? neg[0] : Add(...neg)));
    const pNode = pos.length === 1 ? pos[0] : Add(...pos);
    const nNode = neg.length === 1 ? neg[0] : Add(...neg);
    return canonical(Sub(pNode, nNode));
  }

  // Scomponi tutti i denominatori
  const decList = terms.map(t => decomposeDenominator(t.den));
  const { totalCoeff, maxPowers, lcmNode } = computeLcmDenominator(decList);

  // Calcola i nuovi numeratori moltiplicati per i quozienti
  const posTerms = [];
  const negTerms = [];

  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    const dec = decList[i];
    const q = computeQuotient(totalCoeff, maxPowers, dec);
    const newNum = canonical(multiplyNumerator(t.num, q));
    if (t.sign > 0) {
      posTerms.push(newNum);
    } else {
      negTerms.push(newNum);
    }
  }

  let totalNumNode;
  if (negTerms.length === 0) {
    totalNumNode = posTerms.length === 1 ? posTerms[0] : Add(...posTerms);
  } else if (posTerms.length === 0) {
    const negInner = negTerms.length === 1 ? negTerms[0] : Add(...negTerms);
    totalNumNode = Neg(negInner);
  } else {
    const pNode = posTerms.length === 1 ? posTerms[0] : Add(...posTerms);
    const nNode = negTerms.length === 1 ? negTerms[0] : Add(...negTerms);
    totalNumNode = Sub(pNode, nNode);
  }

  const resFrac = Div(totalNumNode, lcmNode);
  return canonical(resFrac);
}

// Riduce qualsiasi espressione o sottoalbero a una singola frazione (o forma semplificata)
export function reduceToSingleFraction(node) {
  if (!node) return node;
  const u = unwrap(node);

  if (u.type === 'Add' || u.type === 'Sub') {
    return reduceAdditiveTermsToCommonDenominator(u);
  }

  if (u.type === 'Neg') {
    const red = reduceToSingleFraction(u.arg);
    return canonical(Neg(red));
  }

  if (u.type === 'Group') {
    const red = reduceToSingleFraction(u.arg);
    return Group(red);
  }

  if (u.type === 'Div') {
    // Riduci ricorsivamente numeratore e denominatore
    const numRed = reduceToSingleFraction(u.num);
    const denRed = reduceToSingleFraction(u.den);

    // Estrai le componenti frazionarie di numeratore e denominatore
    const fNum = termAsFraction(numRed);
    const fDen = termAsFraction(denRed);

    // Risoluzione didattica della frazione di frazione:
    // (N1 / D1) / (N2 / D2) = (N1 * D2) / (D1 * N2)
    const totalSign = fNum.sign * fDen.sign;
    const finalNum = canonical(multiplyNumerator(fNum.num, fDen.den));
    const finalDen = canonical(multiplyNumerator(fNum.den, fDen.num));

    if (isOne(finalDen)) {
      return totalSign < 0 ? canonical(Neg(finalNum)) : finalNum;
    }

    const frac = Div(finalNum, finalDen);
    return totalSign < 0 ? canonical(Neg(frac)) : canonical(frac);
  }

  if (u.type === 'Mul') {
    const redArgs = u.args.map(reduceToSingleFraction);
    const nums = [];
    const dens = [];
    let sign = 1;
    for (const a of redArgs) {
      const f = termAsFraction(a);
      sign *= f.sign;
      if (!isOne(f.num)) nums.push(f.num);
      if (!isOne(f.den)) dens.push(f.den);
    }
    const numNode = nums.length === 0 ? Num(1) : (nums.length === 1 ? nums[0] : Mul(...nums));
    const denNode = dens.length === 0 ? Num(1) : (dens.length === 1 ? dens[0] : Mul(...dens));
    if (isOne(denNode)) {
      return sign < 0 ? canonical(Neg(numNode)) : canonical(numNode);
    }
    const frac = Div(numNode, denNode);
    return sign < 0 ? canonical(Neg(frac)) : canonical(frac);
  }

  if (u.type === 'Pow') {
    return canonical(Pow(reduceToSingleFraction(u.base), reduceToSingleFraction(u.exp)));
  }

  if (u.type === 'Sqrt') {
    return canonical(Sqrt(reduceToSingleFraction(u.arg)));
  }

  return node;
}

// Verifica se un'espressione ha somme di frazioni o frazioni composte che possono essere ridotte
export function canReduceToSingleFraction(node) {
  if (!node) return false;
  const u = unwrap(node);
  if (u.type === 'Add' || u.type === 'Sub') {
    const terms = getAdditiveTerms(u);
    if (terms.some(t => termAsFraction(t.node).hasDen)) return true;
    return terms.some(t => canReduceToSingleFraction(t.node));
  }
  if (u.type === 'Div') {
    const fNum = termAsFraction(u.num);
    const fDen = termAsFraction(u.den);
    if (fNum.hasDen || fDen.hasDen) return true;
    if (canReduceToSingleFraction(u.num) || canReduceToSingleFraction(u.den)) return true;
  }
  if (u.type === 'Mul') {
    return u.args.some(canReduceToSingleFraction);
  }
  if (u.type === 'Neg' || u.type === 'Group' || u.type === 'Sqrt') {
    return canReduceToSingleFraction(u.arg);
  }
  if (u.type === 'Pow') {
    return canReduceToSingleFraction(u.base) || canReduceToSingleFraction(u.exp);
  }
  return false;
}

// Riduzione a passaggi didattici: se c'è una somma/differenza di frazioni e numeri
// dentro un numeratore o denominatore, prima risolve quella somma (m.c.m.),
// e solo al passo successivo risolve l'eventuale frazione di frazione.
export function reduceStepDidactic(node) {
  if (!node) return node;
  const u = unwrap(node);

  if (u.type === 'Add' || u.type === 'Sub') {
    return reduceAdditiveTermsToCommonDenominator(u);
  }

  if (u.type === 'Div') {
    const denU = unwrap(u.den);
    const numU = unwrap(u.num);
    const denHasSumFrac = (denU.type === 'Add' || denU.type === 'Sub') && getAdditiveTerms(denU).some(t => termAsFraction(t.node).hasDen);
    const numHasSumFrac = (numU.type === 'Add' || numU.type === 'Sub') && getAdditiveTerms(numU).some(t => termAsFraction(t.node).hasDen);

    if (denHasSumFrac || numHasSumFrac) {
      const newNum = numHasSumFrac ? reduceAdditiveTermsToCommonDenominator(numU) : u.num;
      const newDen = denHasSumFrac ? reduceAdditiveTermsToCommonDenominator(denU) : u.den;
      return Div(newNum, newDen);
    }
  }

  return reduceToSingleFraction(node);
}

// Applica la trasformazione all'intera equazione
export function reduceEquationToCommonDenominator(eq, chosenSide = null) {
  if (!eq || eq.type !== 'Eq') {
    return { ok: false, error: 'Nessuna equazione valida fornita.' };
  }

  const leftCan = canReduceToSingleFraction(eq.left);
  const rightCan = canReduceToSingleFraction(eq.right);

  if (!leftCan && !rightCan) {
    return {
      ok: false,
      error: 'Non ci sono somme di frazioni o frazioni composte da ridurre a denominatore comune.',
      hint: 'La formula è già espressa in frazioni semplici o termini interi.',
    };
  }

  let newLeft = eq.left;
  let newRight = eq.right;
  const steps = [];

  if (chosenSide === 'left' && leftCan) {
    newLeft = reduceStepDidactic(eq.left);
    steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq.left, 0)} → ${toPretty(newLeft, 0)}.`);
  } else if (chosenSide === 'right' && rightCan) {
    newRight = reduceStepDidactic(eq.right);
    steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq.right, 0)} → ${toPretty(newRight, 0)}.`);
  } else {
    // Riduci entrambi i membri che ne hanno bisogno
    if (leftCan) {
      newLeft = reduceStepDidactic(eq.left);
      steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq.left, 0)} → ${toPretty(newLeft, 0)}.`);
    }
    if (rightCan) {
      newRight = reduceStepDidactic(eq.right);
      steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq.right, 0)} → ${toPretty(newRight, 0)}.`);
    }
  }

  const newEq = Eq(newLeft, newRight);
  return {
    ok: true,
    newEq,
    steps,
  };
}
