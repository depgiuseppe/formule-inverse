// cross.js — Semplificazione di due fattori uguali con la "croce rossa".
//
// L'allievo trascina la croce su due elementi uguali (lettere o numeri): uno
// al numeratore e uno al denominatore. Se sono davvero uguali si semplificano
// e scompaiono; altrimenti l'operazione viene rifiutata con una spiegazione.
//
// Gli elementi sono individuati con gli stessi id usati dal rendering
// (es. "right/num/Mul1" oppure "left/Mul0/den"), così la croce lavora
// esattamente sugli elementi che l'allievo vede.

import {
  Eq, Num, Add, Sub, Neg, Mul, Div, Pow, Group,
  unwrap, canonical, equivalentExpr, toPretty,
} from './ast.js';
import { additiveTerms, rebuildSum, cancelFractionFactor } from './rules.js';

// ---------------------------------------------------------------------------
// Navigazione per percorso
// ---------------------------------------------------------------------------

const INDEXED = /^(Add|Sub|Mul)(\d+)$/;

function childAt(node, segment) {
  const u = unwrap(node);
  const m = INDEXED.exec(segment);
  if (m) return u.args ? u.args[Number(m[2])] : undefined;
  switch (segment) {
    case 'num': return u.num;
    case 'den': return u.den;
    case 'base': return u.base;
    case 'exp': return u.exp;
    case 'arg': return u.arg;
    case 'g': return u.arg;
    default: return undefined;
  }
}

function replaceChild(node, segment, replacement) {
  const u = unwrap(node);
  const m = INDEXED.exec(segment);
  if (m) {
    const i = Number(m[2]);
    if (!u.args) return node;
    return { ...u, args: u.args.map((a, k) => (k === i ? replacement : a)) };
  }
  switch (segment) {
    case 'num': return Div(replacement, u.den);
    case 'den': return Div(u.num, replacement);
    case 'base': return Pow(replacement, u.exp);
    case 'exp': return Pow(u.base, replacement);
    case 'arg': return { ...u, arg: replacement };
    case 'g': return Group(replacement);
    default: return node;
  }
}

function nodeAtSegments(node, segments) {
  let cur = unwrap(node);
  for (const seg of segments) {
    const next = childAt(cur, seg);
    if (next === undefined) return undefined;
    cur = unwrap(next);
  }
  return cur;
}

// Ricostruisce l'albero sostituendo con `newValue` il nodo al percorso indicato.
function rebuildAlongPath(root, pathSegments, newValue) {
  if (pathSegments.length === 0) return newValue;
  const [head, ...rest] = pathSegments;
  const child = childAt(root, head);
  if (child === undefined) return root;
  const newChild = rest.length === 0 ? newValue : rebuildAlongPath(child, rest, newValue);
  return replaceChild(root, head, newChild);
}

// Valore che sostituisce il genitore quando il figlio `segment` viene eliminato.
// Ritorna null se quell'elemento non è eliminabile con una semplificazione.
function removeFromParent(parent, segment) {
  const u = unwrap(parent);
  const m = INDEXED.exec(segment);
  if (m) {
    // Solo i fattori di un prodotto si possono semplificare: togliere un
    // addendo da una somma cambierebbe il significato dell'espressione.
    if (u.type !== 'Mul' || !u.args) return null;
    const rest = u.args.filter((_, k) => k !== Number(m[2]));
    if (rest.length === 0) return Num(1);
    if (rest.length === 1) return rest[0];
    return Mul(...rest);
  }
  if (u.type === 'Div') {
    if (segment === 'num') return Div(Num(1), u.den);
    if (segment === 'den') return u.num;
  }
  // v² / v = v: togliere la base di una potenza equivale a dividere per essa.
  if (u.type === 'Pow' && segment === 'base' && u.exp && u.exp.type === 'Num') {
    const n = u.exp.value - 1;
    if (n === 0) return Num(1);
    if (n === 1) return u.base;
    return Pow(u.base, Num(n));
  }
  return null;
}

// Rimuove il nodo al percorso indicato, ricostruendo l'albero.
function removeAt(node, segments) {
  if (segments.length === 0) {
    return { ok: false, error: 'Indica un fattore dentro la frazione, non l\'intero membro.' };
  }
  const parentSegments = segments.slice(0, -1);
  const last = segments[segments.length - 1];
  const parent = parentSegments.length === 0 ? unwrap(node) : nodeAtSegments(node, parentSegments);
  if (!parent) return { ok: false, error: 'Percorso non valido in questa equazione.' };

  const replacement = removeFromParent(parent, last);
  if (replacement === null) {
    return {
      ok: false,
      error: 'Non si può eliminare questo elemento: la semplificazione riguarda solo i fattori di prodotti e frazioni.',
    };
  }
  if (parentSegments.length === 0) return { ok: true, node: replacement };
  return { ok: true, node: rebuildAlongPath(node, parentSegments, replacement) };
}

// ---------------------------------------------------------------------------
// Analisi dei percorsi degli elementi
// ---------------------------------------------------------------------------

// Analizza il percorso di un elemento individuato dal suo id.
// Ritorna { side, segments, slot } oppure null se l'elemento non è un fattore
// al numeratore o al denominatore di una frazione.
//
// Struttura degli id prodotti dal rendering:
//   left/num              numeratore del membro
//   left/num/Mul1         secondo fattore di quel numeratore
//   left/Mul0/den         denominatore di una frazione dentro un prodotto
//   left/Add0/num         numeratore della frazione che è termine di una somma
export function analyseElementId(id) {
  const parts = String(id || '').split('/');
  const side = parts[0];
  if ((side !== 'left' && side !== 'right') || parts.length < 2) return null;
  const segments = parts.slice(1);

  // Il primo 'num'/'den' individua la posizione nella frazione.
  let k = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === 'num' || segments[i] === 'den') { k = i; break; }
  }
  if (k === -1) {
    // Se non c'è num/den esplicito ma sono fattori di un prodotto o potenze:
    // allora l'elemento è un fattore al NUMERATORE (denominatore sottinteso = 1)
    if (segments.every((s) => /^Mul\d+$/.test(s) || s === 'base')) {
      return { side, segments, slot: 'num' };
    }
    return null;
  }

  const prefix = segments.slice(0, k);
  const suffix = segments.slice(k + 1);

  // Nel prefisso si può solo scendere dentro prodotti e addendi.
  if (prefix.some((s) => !(/^Mul\d+$/.test(s) || /^Add\d+$/.test(s)))) return null;
  // Nel numeratore/denominatore si può solo scendere dentro prodotti, con
  // l'ultimo passo che può essere la base di una potenza (v²/v = v).
  for (let i = 0; i < suffix.length - 1; i++) {
    if (!/^Mul\d+$/.test(suffix[i])) return null;
  }
  const last = suffix[suffix.length - 1];
  if (suffix.length > 0 && last !== 'base' && !/^Mul\d+$/.test(last)) return null;

  return { side, segments, slot: segments[k] };
}

// Posizione dell'elemento: 'num', 'den' oppure null.
function slotOfId(id) {
  const info = analyseElementId(id);
  return info ? info.slot : null;
}

// ---------------------------------------------------------------------------
// Semplificazione
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Semplificazione additiva: termini opposti (±a) e stessa grandezza ambo i membri
// ---------------------------------------------------------------------------

// Analizza un id come percorso additivo (tutti i segmenti devono essere Add/Sub indicizzati).
// Ritorna { side, segs, sign } o null.  sign = +1 / -1 accumulato lungo il percorso.
function analyseAdditiveId(id) {
  const parts = String(id || '').split('/');
  const side = parts[0];
  if (side !== 'left' && side !== 'right') return null;
  const segs = parts.slice(1);
  if (segs.length === 0) return { side, segs: [], sign: 1 };
  let sign = 1;
  for (const seg of segs) {
    const m = /^(Add|Sub)(\d+)$/.exec(seg);
    if (!m) return null;
    if (m[1] === 'Sub' && Number(m[2]) > 0) sign = -sign;
  }
  return { side, segs, sign };
}

// Valore effettivo di un termine { node, sign } proveniente da additiveTerms.
function termEff(t) {
  return t.sign === '+' ? canonical(t.node) : canonical(Neg(t.node));
}

// Cerca e toglie dalla lista il primo termine che corrisponde al valore effettivo dato.
function removeByEff(terms, eff) {
  const idx = terms.findIndex((t) => equivalentExpr(termEff(t), eff));
  if (idx < 0) return null;
  return terms.filter((_, k) => k !== idx);
}

// Rimuove l'elemento al percorso `segs` dalla struttura additiva del membro.
// Ritorna il nuovo nodo canonico, o null se il percorso non è valido.
function removeAdditiveDeep(member, segs) {
  if (segs.length === 0) return Num(0);
  const parentSegs = segs.slice(0, -1);
  const last = segs[segs.length - 1];
  const m = /^(Add|Sub)(\d+)$/.exec(last);
  if (!m) return null;
  const idx = Number(m[2]);
  const parent = parentSegs.length === 0 ? unwrap(member) : nodeAtSegments(member, parentSegs);
  if (!parent || !parent.args || parent.type !== m[1]) return null;
  const keep = parent.args.filter((_, k) => k !== idx);
  let newParent;
  if (keep.length === 0) {
    newParent = Num(0);
  } else if (keep.length === 1 && parent.type === 'Add') {
    newParent = keep[0];
  } else if (parent.type === 'Sub' && idx === 0) {
    newParent = keep.length === 1 ? Neg(keep[0]) : Sub(Num(0), ...keep);
  } else if (keep.length === 1) {
    newParent = keep[0];
  } else {
    newParent = { ...parent, args: keep };
  }
  if (parentSegs.length === 0) return canonical(newParent);
  return canonical(rebuildAlongPath(member, parentSegs, newParent));
}

// Tenta la semplificazione additiva:
//   stesso membro  → termini opposti (±a) si cancellano nella somma
//   membri diversi → stessa grandezza su entrambi i lati si elimina
function crossCancelAdditive(eq, idA, idB) {
  const a = analyseAdditiveId(idA);
  const b = analyseAdditiveId(idB);
  if (!a || !b) return null;

  const memberA = a.side === 'left' ? eq.left : eq.right;
  const memberB = b.side === 'left' ? eq.left : eq.right;
  const nodeA = a.segs.length === 0 ? unwrap(memberA) : nodeAtSegments(memberA, a.segs);
  const nodeB = b.segs.length === 0 ? unwrap(memberB) : nodeAtSegments(memberB, b.segs);
  if (!nodeA || !nodeB) return null;

  const effA = a.sign > 0 ? canonical(nodeA) : canonical(Neg(nodeA));
  const effB = b.sign > 0 ? canonical(nodeB) : canonical(Neg(nodeB));

  if (a.side === b.side) {
    // Stesso membro: i termini devono essere opposti (effA + effB = 0 ↔ effA = −effB)
    if (!equivalentExpr(effA, canonical(Neg(effB)))) {
      if (equivalentExpr(effA, effB)) {
        const termName = toPretty(effA, 0);
        return {
          ok: false,
          error: `Due termini con lo stesso segno nella stessa somma non si annullano, ma si sommano: ${termName} + ${termName} = 2·${termName}! Si annullano solo termini opposti (con segno contrario, come +${termName} e −${termName}).`,
          hint: `Puoi cancellare due termini nella stessa somma solo se uno ha segno + e l'altro ha segno −.`,
        };
      }
      return null;
    }

    // Usa la lista piatta canonicizzata per evitare problemi di shift degli indici
    const flatTerms = additiveTerms(canonical(memberA));
    const after1 = removeByEff(flatTerms, effA);
    if (!after1) return null;
    const after2 = removeByEff(after1, effB);
    if (!after2) return null;

    const newMember = after2.length === 0 ? Num(0) : canonical(rebuildSum(after2));
    const newEq = canonical(a.side === 'left' ? Eq(newMember, eq.right) : Eq(eq.left, newMember));
    const pos = effA.type === 'Neg' ? canonical(Neg(effA)) : effA;
    const c = toPretty(pos, 0);
    return {
      ok: true, newEq, cancelled: c,
      ruleName: `Eliminazione dei termini opposti ±${c}`,
      rulePrinciple: `${c} − ${c} = 0: termini opposti si cancellano (primo principio).`,
      conditions: [],
    };
  }

  // Membri diversi: i termini devono essere uguali (effA = effB)
  if (!equivalentExpr(effA, effB)) return null;

  const newA = removeAdditiveDeep(memberA, a.segs);
  const newB = removeAdditiveDeep(memberB, b.segs);
  if (!newA || !newB) return null;

  const newLeft = a.side === 'left' ? newA : newB;
  const newRight = a.side === 'left' ? newB : newA;
  const newEq = canonical(Eq(newLeft, newRight));
  const c = toPretty(effA, 0);
  return {
    ok: true, newEq, cancelled: c,
    ruleName: `Eliminazione di ${c} da entrambi i membri`,
    rulePrinciple: `Sottraendo ${c} da entrambi i membri si elimina il termine comune (primo principio).`,
    conditions: [],
  };
}

// Prova a semplificare due elementi individuati dai loro id.
// Ritorna { ok:true, newEq, cancelled, ruleName, rulePrinciple, conditions }
// oppure { ok:false, error, hint }.
export function crossCancel(eq, idA, idB) {
  if (!eq || eq.type !== 'Eq') {
    return { ok: false, error: 'Nessuna equazione su cui semplificare.' };
  }
  if (idA === idB) {
    return { ok: false, error: 'Hai indicato due volte lo stesso elemento.' };
  }
  const a = analyseElementId(idA);
  const b = analyseElementId(idB);

  // Prova prima la semplificazione additiva (termini opposti o stessa grandezza ambo i membri)
  if (!a || !b) {
    const addResult = crossCancelAdditive(eq, idA, idB);
    if (addResult) return addResult;

    // Diagnosi didattica specifica per cancellazione illecita su somme in frazioni
    const partsA = String(idA || '').split('/');
    const partsB = String(idB || '').split('/');
    if (partsA[0] === partsB[0] && (partsA[0] === 'left' || partsA[0] === 'right')) {
      const sideKey = partsA[0];
      const member = eq[sideKey];
      const hasSumA = partsA.some((s) => /^(Add|Sub)\d+$/.test(s));
      const hasSumB = partsB.some((s) => /^(Add|Sub)\d+$/.test(s));
      const hasNumA = partsA.includes('num');
      const hasNumB = partsB.includes('num');
      const hasDenA = partsA.includes('den');
      const hasDenB = partsB.includes('den');

      if ((hasSumA || hasSumB) && ((hasNumA && hasDenB) || (hasDenA && hasNumB))) {
        const nodeA = nodeAtSegments(member, partsA.slice(1));
        const nodeB = nodeAtSegments(member, partsB.slice(1));
        const txtA = nodeA ? toPretty(nodeA, 0) : 'questo termine';
        const txtB = nodeB ? toPretty(nodeB, 0) : 'il denominatore';
        return {
          ok: false,
          error: `Cancellazione illecita su una somma: non puoi semplificare un addendo con il denominatore! In una frazione puoi semplificare solo fattori che moltiplicano l'INTERO numeratore e denominatore, MAI singoli termini di una somma. Semplificare "${txtA}" con "${txtB}" violerebbe la proprietà distributiva della divisione.`,
          hint: `Per semplificare una frazione, raccogli prima un fattore comune a tutti i termini se possibile (es. a·(1 + b/a)), oppure separa la frazione nella somma di due frazioni distinte.`,
        };
      }
    }

    return {
      ok: false,
      error: 'Seleziona: ①  un fattore al numeratore e uno uguale al denominatore della stessa frazione, oppure ② due termini opposti (es. a e −a) della stessa somma, oppure ③ la stessa grandezza su entrambi i membri.',
      hint: 'Trascina la croce su fattori uguali (num./den.), su termini opposti, o sulla stessa grandezza a entrambi i lati.',
    };
  }
  if (a.side !== b.side) {
    const addResult = crossCancelAdditive(eq, idA, idB);
    if (addResult) return addResult;
    return {
      ok: false,
      error: 'I due fattori di una frazione devono stare nello stesso membro. Per cancellare la stessa grandezza su entrambi i lati, selezionala come termine additivo.',
      hint: 'Semplifica un fattore al numeratore e uno al denominatore dello stesso membro.',
    };
  }

  const member = a.side === 'left' ? eq.left : eq.right;
  const nodeA = nodeAtSegments(member, a.segments);
  const nodeB = nodeAtSegments(member, b.segments);
  if (!nodeA || !nodeB) {
    return { ok: false, error: 'Elemento non trovato nell\'equazione.' };
  }

  if (!equivalentExpr(nodeA, nodeB)) {
    return {
      ok: false,
      error: `I due elementi non sono uguali, quindi non si semplificano: ${toPretty(nodeA, 0)} ≠ ${toPretty(nodeB, 0)}.`,
      hint: 'Si semplificano solo fattori identici, per esempio la stessa lettera o lo stesso numero.',
    };
  }

  const slotA = a.slot;
  const slotB = b.slot;
  if (slotA === slotB) {
    return {
      ok: false,
      error: 'Servono un elemento al numeratore e uno al denominatore: due fattori nella stessa posizione non si eliminano.',
      hint: 'La semplificazione vale tra numeratore e denominatore (a/a = 1, con a ≠ 0).',
    };
  }

  // Prima il numeratore: così il percorso del denominatore resta valido.
  const numEntry = slotA === 'num' ? a : b;
  const denEntry = slotA === 'den' ? a : b;

  let simplifiedNode = null;
  const afterNum = removeAt(member, numEntry.segments);
  if (afterNum.ok) {
    const afterBoth = removeAt(afterNum.node, denEntry.segments);
    if (afterBoth.ok) simplifiedNode = afterBoth.node;
  }
  if (!simplifiedNode) {
    const afterDen = removeAt(member, denEntry.segments);
    if (afterDen.ok) {
      const afterBoth2 = removeAt(afterDen.node, numEntry.segments);
      if (afterBoth2.ok) simplifiedNode = afterBoth2.node;
    }
  }
  if (!simplifiedNode) {
    const viaFraction = cancelFractionFactor(member, nodeA);
    if (viaFraction) simplifiedNode = viaFraction;
  }
  if (!simplifiedNode) {
    if ((afterNum && !afterNum.ok && afterNum.error && afterNum.error.includes('solo i fattori')) ||
        (afterDen && !afterDen.ok && afterDen.error && afterDen.error.includes('solo i fattori'))) {
      return {
        ok: false,
        error: 'Cancellazione illecita su una somma: non si può semplificare un addendo con il denominatore! In algebra la semplificazione riguarda solo i fattori di prodotti e frazioni.',
        hint: 'Raccogli prima a fattor comune se possibile, oppure riscrivi come somma di frazioni distinte.',
      };
    }
    return { ok: false, error: 'Impossibile completare la semplificazione di questi elementi.' };
  }

  const simplified = canonical(simplifiedNode);
  const newEq = canonical(a.side === 'left'
    ? Eq(simplified, eq.right)
    : Eq(eq.left, simplified));

  const cancelled = toPretty(nodeA, 0);
  return {
    ok: true,
    newEq,
    cancelled,
    ruleName: `Semplificazione di ${cancelled} tra numeratore e denominatore`,
    rulePrinciple: `${cancelled}/${cancelled} = 1, purché ${cancelled} ≠ 0: un fattore uguale al numeratore e al denominatore si può eliminare.`,
    conditions: [`${cancelled} ≠ 0`],
  };
}
