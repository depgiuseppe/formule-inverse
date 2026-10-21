// reciprocals.js — Regola dei reciproci applicata all'INTERA equazione.
//
// Proprietà dell'inversione: se A = B allora 1/A = 1/B.
// In una proporzione A/B = C/D si ottiene B/A = D/C (scambio dei termini).
//
// Attenzione didattica: il reciproco di una somma NON è la somma dei reciproci,
// quindi 1/(A/B + C/D) ≠ B/A + D/C. In quel caso l'operazione va rifiutata.

import { unwrap, clone, canonical, Div, Eq, Mul, Num, isIdenticallyZero } from './ast.js';

const isOne = (node) => {
  const u = unwrap(node);
  return u.type === 'Num' && u.value === 1;
};

// Vero se nell'albero compare almeno una frazione (nodo Div).
export function treeHasFraction(node) {
  if (!node) return false;
  const u = unwrap(node);
  switch (u.type) {
    case 'Div': return true;
    case 'Eq': return treeHasFraction(u.left) || treeHasFraction(u.right);
    case 'Add': case 'Sub': case 'Mul':
      return u.args.some(treeHasFraction);
    case 'Neg': case 'Group':
      return treeHasFraction(u.arg);
    case 'Pow':
      return treeHasFraction(u.base) || treeHasFraction(u.exp);
    default:
      return false;
  }
}

// Vero se il membro è una somma (o differenza) che contiene frazioni.
export function memberIsFractionSum(node) {
  const u = unwrap(node);
  return (u.type === 'Add' || u.type === 'Sub') && treeHasFraction(u);
}

// Scompone un membro in numeratore/denominatore, anche quando il denominatore è
// sottinteso (1) oppure è distribuito su un prodotto di fattori.
export function memberAsFraction(node) {
  const u = unwrap(node);
  if (u.type === 'Div') {
    return { num: clone(u.num), den: clone(u.den) };
  }
  if (u.type === 'Mul') {
    const nums = [];
    const dens = [];
    for (const arg of u.args) {
      const part = memberAsFraction(arg);
      if (!isOne(part.num)) nums.push(part.num);
      if (!isOne(part.den)) dens.push(part.den);
    }
    return {
      num: nums.length === 0 ? Num(1) : (nums.length === 1 ? nums[0] : Mul(...nums)),
      den: dens.length === 0 ? Num(1) : (dens.length === 1 ? dens[0] : Mul(...dens)),
    };
  }
  return { num: clone(u), den: Num(1) };
}

// Reciproco di un singolo membro: scambia numeratore e denominatore.
export function reciprocalOfMember(node) {
  const { num, den } = memberAsFraction(node);
  return canonical(Div(den, num));
}

// Applica la regola dei reciproci all'equazione.
// Ritorna { ok: true, newEq } oppure { ok: false, error, hint }.
export function reciprocalEquation(eq) {
  if (!eq || eq.type !== 'Eq') {
    return { ok: false, error: 'Nessuna equazione valida da invertire.' };
  }
  if (isIdenticallyZero(eq.left) || isIdenticallyZero(eq.right)) {
    return {
      ok: false,
      error: 'Non si può calcolare il reciproco di un membro identicamente nullo: la divisione per zero non è definita.',
      hint: 'Assicurati che entrambi i membri siano diversi da zero prima di applicare la regola dei reciproci.',
    };
  }
  if (memberIsFractionSum(eq.left) || memberIsFractionSum(eq.right)) {
    return {
      ok: false,
      error: 'il reciproco di una somma di frazioni NON è la somma dei reciproci: 1/(A/B + C/D) ≠ B/A + D/C.',
      hint: 'Riduci prima la somma a denominatore comune: solo allora potrai invertire i due membri.',
    };
  }
  return {
    ok: true,
    newEq: Eq(reciprocalOfMember(eq.left), reciprocalOfMember(eq.right)),
  };
}
