// operations.js — Operazioni del tastierino applicate a ENTRAMBI i membri.
//
// L'idea didattica: l'allievo preme un'operazione e poi una grandezza (o un
// numero) presente nell'equazione, e la stessa operazione viene applicata a
// entrambi i membri (primo e secondo principio di equivalenza).
//
// La matematica è delegata alle regole già esistenti in rules.js, così le
// condizioni (÷ per una quantità ≠ 0, radice con radicando ≥ 0, …) restano
// coerenti con il resto dell'applicazione.

import { Sqrt, Eq, unwrap, canonical, isNum, collectVars } from './ast.js';
import { parseExpression } from './parser.js';
import { RULES, applyRule, conditionText } from './rules.js';
import { whichSideHas } from './algebra.js';

// I pulsanti mostrati nel tastierino.
export const KEYPAD_OPERATIONS = [
  { id: 'add', label: '+', title: 'Somma la stessa grandezza o numero a entrambi i membri', needsOperand: true },
  { id: 'sub', label: '−', title: 'Sottrai la stessa grandezza o numero a entrambi i membri', needsOperand: true },
  { id: 'mul', label: '×', title: 'Moltiplica entrambi i membri per la stessa grandezza o numero', needsOperand: true },
  { id: 'div', label: '÷', title: 'Dividi entrambi i membri per la stessa grandezza o numero (≠ 0)', needsOperand: true },
  { id: 'pow', label: '^', title: 'Eleva entrambi i membri alla stessa potenza', needsOperand: true },
  { id: 'sqrt', label: '√', title: 'Estrai la radice quadrata di entrambi i membri', needsOperand: false },
];

const RULE_BY_OP = {
  add: 'addBoth',
  sub: 'subBoth',
  mul: 'mulBoth',
  div: 'divBoth',
  pow: 'powBoth',
};

// Grandezze e numeri presenti nell'equazione: servono a costruire la tastiera.
export function equationKeypadTokens(eq) {
  const letters = [...collectVars(eq)].sort();
  const numbers = new Set();
  const walk = (node) => {
    if (!node) return;
    const u = unwrap(node);
    if (u.type === 'Num' && Number.isFinite(u.value)) numbers.add(u.value);
    switch (u.type) {
      case 'Eq':
        walk(u.left); walk(u.right); break;
      case 'Add': case 'Sub': case 'Mul':
        u.args.forEach(walk); break;
      case 'Div':
        walk(u.num); walk(u.den); break;
      case 'Pow':
        walk(u.base); walk(u.exp); break;
      default:
        if (u.arg) walk(u.arg);
    }
  };
  walk(eq);
  return {
    letters,
    numbers: [...numbers].sort((a, b) => a - b),
  };
}

// Interpreta il testo di una grandezza o di un numero scritto dall'utente.
export function parseOperand(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  try {
    return parseExpression(t);
  } catch {
    return null;
  }
}

// True se il membro è una potenza con esponente intero pari (x², x⁴, …).
function evenPowerOf(node) {
  const u = unwrap(node);
  if (u.type === 'Pow' && isNum(u.exp) && Number.isInteger(u.exp.value) && u.exp.value % 2 === 0 && u.exp.value > 0) {
    return u.exp.value;
  }
  return null;
}

// Radice quadrata di entrambi i membri.
function applySqrtBothSides(eq, targetVar) {
  // Caso migliore: un membro è una potenza pari della grandezza obiettivo.
  // La regola dedicata gestisce radicando ≥ 0 e introduce il segno ±.
  const side = targetVar ? whichSideHas(eq, targetVar) : null;
  if (side === 'left' || side === 'right') {
    const res = applyRule(RULES.sqrtBoth, eq, { side, insideVar: targetVar });
    if (res.ok) {
      return {
        ok: true,
        equation: res.equation,
        conditions: res.conditions || [],
        steps: res.steps || [],
        note: res.note || null,
      };
    }
  }

  // Se un membro è una potenza pari, la radice va fatta con la regola dedicata:
  // √(x²) = |x|, quindi non possiamo semplificarla via senza perdere il ±.
  for (const member of [eq.left, eq.right]) {
    if (evenPowerOf(member) !== null) {
      return {
        ok: false,
        error: 'Un membro è una potenza a esponente pari: la radice va presa con la regola dedicata, che introduce il segno ±, perché √(x²) = |x|.',
        hint: 'Seleziona prima la potenza nell\'area di lavoro e usa l\'azione "Estrai la radice", oppure isola la potenza su un membro.',
      };
    }
  }

  const newEq = canonical(Eq(Sqrt(eq.left), Sqrt(eq.right)));
  return {
    ok: true,
    equation: newEq,
    conditions: [conditionText(eq.left, '≥ 0'), conditionText(eq.right, '≥ 0')],
    steps: ['Estraggo la radice quadrata di entrambi i membri.'],
    note: 'La radice di un quadrato è un valore assoluto: √(x²) = |x|. Perché la radice di entrambi i membri abbia senso, entrambi devono essere ≥ 0.',
  };
}

// Applica l'operazione scelta dal tastierino.
// Ritorna { ok:true, equation, conditions, steps, note } oppure { ok:false, error, hint }.
export function applyKeypadOperation(eq, opId, operandNode, operandText, targetVar) {
  if (!eq || eq.type !== 'Eq') {
    return { ok: false, error: 'Nessuna equazione su cui operare.' };
  }
  if (opId === 'sqrt') return applySqrtBothSides(eq, targetVar);

  const ruleKey = RULE_BY_OP[opId];
  if (!ruleKey) return { ok: false, error: `Operazione sconosciuta: ${opId}.` };
  if (!operandNode) return { ok: false, error: 'Scegli prima una grandezza o un numero.' };

  const res = applyRule(RULES[ruleKey], eq, { value: operandNode, valueText: operandText });
  if (!res.ok) return { ok: false, error: res.error, hint: res.hint };
  return {
    ok: true,
    equation: res.equation,
    conditions: res.conditions || [],
    steps: res.steps || [],
    note: res.note || null,
  };
}
