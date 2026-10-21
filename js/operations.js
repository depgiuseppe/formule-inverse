// operations.js — Operazioni del tastierino applicate a ENTRAMBI i membri.
//
// L'idea didattica: l'allievo preme un'operazione e poi una grandezza (o un
// numero) presente nell'equazione, e la stessa operazione viene applicata a
// entrambi i membri (primo e secondo principio di equivalenza).
//
// La matematica è delegata alle regole già esistenti in rules.js, così le
// condizioni (÷ per una quantità ≠ 0, radice con radicando ≥ 0, …) restano
// coerenti con il resto dell'applicazione.

import { Sqrt, Eq, unwrap, unwrapNeutrals, canonical, isNum, collectVars, evalConst } from './ast.js';
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
  { id: 'asin', label: 'arcsin', title: "Applica l'arcoseno (sin⁻¹) a entrambi i membri per liberare l'argomento del seno", needsOperand: false },
  { id: 'acos', label: 'arccos', title: "Applica l'arcocoseno (cos⁻¹) a entrambi i membri per liberare l'argomento del coseno", needsOperand: false },
  { id: 'atan', label: 'arctan', title: "Applica l'arcotangente (tan⁻¹) a entrambi i membri per liberare l'argomento della tangente", needsOperand: false },
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

  // Se un membro è una costante strettamente negativa, la radice quadrata reale non esiste
  for (const member of [eq.left, eq.right]) {
    const constM = evalConst(member);
    if (constM.ok && constM.value < 0) {
      return {
        ok: false,
        error: 'Non si può estrarre una radice di indice pari da un radicando strettamente negativo nel campo reale.',
        hint: 'L\'equazione non ammette soluzioni reali.',
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

// Verifica se un tipo di nodo compare in un sottoalbero AST.
function nodeContainsType(node, type) {
  if (!node) return false;
  const u = unwrap(node);
  if (u.type === type) return true;
  switch (u.type) {
    case 'Add': case 'Sub': case 'Mul':
      return u.args.some((arg) => nodeContainsType(arg, type));
    case 'Div':
      return nodeContainsType(u.num, type) || nodeContainsType(u.den, type);
    case 'Pow':
      return nodeContainsType(u.base, type) || nodeContainsType(u.exp, type);
    case 'Eq':
      return nodeContainsType(u.left, type) || nodeContainsType(u.right, type);
    default:
      return u.arg ? nodeContainsType(u.arg, type) : false;
  }
}

const TRIG_OPS = {
  asin: {
    trigType: 'Sin',
    fnName: 'seno (sin)',
    invName: 'arcoseno (arcsin)',
    notation: 'sin(...)',
  },
  acos: {
    trigType: 'Cos',
    fnName: 'coseno (cos)',
    invName: 'arcocoseno (arccos)',
    notation: 'cos(...)',
  },
  atan: {
    trigType: 'Tan',
    fnName: 'tangente (tan)',
    invName: 'arcotangente (arctan)',
    notation: 'tan(...)',
  },
};

// Funzione inversa goniometrica (arcsin, arccos, arctan) applicata a entrambi i membri.
function applyInverseTrigBothSides(eq, opId, targetVar) {
  const info = TRIG_OPS[opId];
  if (!info) return { ok: false, error: `Operazione trigonometrica sconosciuta: ${opId}.` };

  const leftU = unwrapNeutrals(eq.left);
  const rightU = unwrapNeutrals(eq.right);

  const leftIsTrig = leftU.type === info.trigType;
  const rightIsTrig = rightU.type === info.trigType;

  let side = null;
  let fnNode = null;

  if (leftIsTrig && rightIsTrig) {
    const sideHas = targetVar ? whichSideHas(eq, targetVar) : null;
    side = sideHas === 'right' ? 'right' : 'left';
    fnNode = side === 'left' ? leftU : rightU;
  } else if (leftIsTrig) {
    side = 'left';
    fnNode = leftU;
  } else if (rightIsTrig) {
    side = 'right';
    fnNode = rightU;
  }

  if (side && fnNode) {
    const res = applyRule(RULES.invertFunction, eq, { side, fnNode });
    if (!res.ok) {
      return { ok: false, error: res.error, hint: res.hint };
    }
    let newEq = res.equation;
    if (targetVar && whichSideHas(newEq, targetVar) === 'right') {
      newEq = Eq(newEq.right, newEq.left);
    }
    return {
      ok: true,
      equation: newEq,
      conditions: res.conditions || [],
      steps: res.steps || [],
      note: res.note || null,
    };
  }

  // Se la funzione trigonometrica è presente nell'equazione ma non è isolata:
  const containsInEq = nodeContainsType(eq.left, info.trigType) || nodeContainsType(eq.right, info.trigType);
  if (containsInEq) {
    return {
      ok: false,
      error: `Per applicare l'${info.invName} devi prima isolare la funzione ${info.fnName} su uno dei due membri!`,
      hint: `Sposta o dividi prima per i coefficienti o termini che la moltiplicano o la sommano fino ad avere ${info.notation} = ...`,
    };
  }

  return {
    ok: false,
    error: `Nessuna funzione ${info.fnName} presente nell'equazione da invertire.`,
    hint: `L'operazione ${info.invName} si applica per liberare l'argomento quando un membro è costituito da ${info.notation}.`,
  };
}

// Applica l'operazione scelta dal tastierino.
// Ritorna { ok:true, equation, conditions, steps, note } oppure { ok:false, error, hint }.
export function applyKeypadOperation(eq, opId, operandNode, operandText, targetVar) {
  if (!eq || eq.type !== 'Eq') {
    return { ok: false, error: 'Nessuna equazione su cui operare.' };
  }
  if (opId === 'sqrt') return applySqrtBothSides(eq, targetVar);
  if (opId === 'asin' || opId === 'acos' || opId === 'atan') {
    return applyInverseTrigBothSides(eq, opId, targetVar);
  }

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
