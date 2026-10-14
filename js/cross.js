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
  Eq, Num, Mul, Div, Pow, Group,
  unwrap, canonical, equivalentExpr, toPretty,
} from './ast.js';

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
  if (k === -1) return null;

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
  if (!a || !b) {
    return {
      ok: false,
      error: 'Solo un fattore al numeratore e uno al denominatore di una frazione si possono semplificare.',
      hint: 'Trascina la croce su un fattore del numeratore e su uno uguale del denominatore.',
    };
  }
  if (a.side !== b.side) {
    return {
      ok: false,
      error: 'I due elementi uguali devono stare nello stesso membro: tra membri diversi non c\'è nessuna frazione da semplificare.',
      hint: 'Semplifica un fattore che compare al numeratore e al denominatore dello stesso membro.',
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

  const afterNum = removeAt(member, numEntry.segments);
  if (!afterNum.ok) return { ok: false, error: afterNum.error };
  const afterBoth = removeAt(afterNum.node, denEntry.segments);
  if (!afterBoth.ok) return { ok: false, error: afterBoth.error };

  const simplified = canonical(afterBoth.node);
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
