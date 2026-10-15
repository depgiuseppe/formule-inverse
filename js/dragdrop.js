// dragdrop.js — Implementazione del Drag and Drop interattivo delle variabili
// tra membri dell'equazione (regola del trasporto, denominatori sottintesi, frazioni dinamiche).

import {
  unwrap, canonical, Num, Var, Mul, Div, Add, Sub, Neg, Eq,
  toPretty, structurallyEqual,
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
    const s1 = u.args.map((x) => toPretty(unwrap(x), 0)).join('*');
    const s2 = u.args.map((x) => toPretty(unwrap(x), 0)).join('·');
    if (s1 === targetVarName || s2 === targetVarName) return true;
  }
  if (u.type === 'Pow') {
    const p1 = toPretty(u, 0);
    const p2 = `${toPretty(u.base, 0)}^${toPretty(u.exp, 0)}`;
    if (p1 === targetVarName || p2 === targetVarName) return true;
  }
  try {
    const parsed = parseExpression(targetVarName);
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
  if (expr.type === 'Mul') {
    const idx = expr.args.findIndex((a) => isMatch(a, targetVarName));
    if (idx !== -1) {
      const remaining = expr.args.filter((_, i) => i !== idx);
      if (remaining.length === 0) return Num(1);
      if (remaining.length === 1) return remaining[0];
      return Mul(...remaining);
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
  if (expr.type === 'Div') {
    const den = unwrap(expr.den);
    if (isMatch(den, targetVarName)) {
      return expr.num;
    }
    if (den.type === 'Mul') {
      const idx = den.args.findIndex((a) => isMatch(a, targetVarName));
      if (idx !== -1) {
        const remaining = den.args.filter((_, i) => i !== idx);
        const newDen = remaining.length === 1 ? remaining[0] : Mul(...remaining);
        return Div(expr.num, newDen);
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
  const newTo = matched.sign === '-'
    ? Add(toExpr, movedNode)
    : Sub(toExpr, movedNode);

  return { newFrom: canonical(newFrom), newTo, sign: matched.sign };
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
    return {
      ok: false,
      error: 'Trascina la variabile dall\'altra parte dell\'uguale per applicare la regola del trasporto!',
    };
  }

  let factorNode;
  if (nodeType === 'Num') {
    factorNode = Num(Number(varName));
  } else if (nodeType === 'Pow' || nodeType === 'Mul') {
    try {
      factorNode = parseExpression(varName);
    } catch {
      factorNode = Var(varName);
    }
  } else {
    factorNode = Var(varName);
  }
  const prettyName = prettyVar(varName);
  let leftExpr = currentEq.left;
  let rightExpr = currentEq.right;

  // CASO A: Da Denominatore a Numeratore dell'altro membro (es. t in v = s/t)
  if (fromSlot === 'den' && targetSlot === 'num') {
    if (fromSide === 'right') {
      rightExpr = removeFactorFromDenominator(rightExpr, varName);
      leftExpr = addFactorToNumerator(leftExpr, factorNode);
    } else {
      leftExpr = removeFactorFromDenominator(leftExpr, varName);
      rightExpr = addFactorToNumerator(rightExpr, factorNode);
    }

    const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
    return {
      ok: true,
      newEq,
      ruleName: `Trasporto di ${prettyName} a moltiplicare`,
      rulePrinciple: `Secondo principio di equivalenza: moltiplicando entrambi i membri per ${prettyName}, ${prettyName} si semplifica al denominatore e compare al numeratore dall'altro membro.`,
      steps: [
        `Trascino ${prettyName} dal denominatore al numeratore dell'altro membro (moltiplico entrambi i membri per ${prettyName}).`,
      ],
      conditions: [`${varName} ≠ 0`],
    };
  }

  // CASO B: Da Numeratore a Denominatore dell'altro membro (divisione)
  if (fromSlot === 'num' && targetSlot === 'den') {
    const fromExpr = fromSide === 'left' ? leftExpr : rightExpr;
    const uFrom = unwrap(fromExpr);
    // Se l'espressione ha una somma e l'elemento non è l'intera espressione
    if ((uFrom.type === 'Add' || uFrom.type === 'Sub') && !isMatch(uFrom, varName)) {
      return {
        ok: false,
        error: `Non puoi dividere per "${prettyName}" finché fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno.`,
      };
    }

    if (fromSide === 'left') {
      leftExpr = removeFactorFromExpr(leftExpr, varName);
      rightExpr = addFactorToDenominator(rightExpr, factorNode);
    } else {
      rightExpr = removeFactorFromExpr(rightExpr, varName);
      leftExpr = addFactorToDenominator(leftExpr, factorNode);
    }

    const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
    return {
      ok: true,
      newEq,
      ruleName: `Trasporto di ${prettyName} al denominatore`,
      rulePrinciple: `Secondo principio di equivalenza: dividendo entrambi i membri per ${prettyName}, compare la linea di frazione e ${prettyName} va al denominatore (${varName} ≠ 0).`,
      steps: [
        `Trascino ${prettyName} dal numeratore al denominatore dell'altro membro: compare la linea di frazione e divido entrambi i membri per ${prettyName}.`,
      ],
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
        ok: true,
        newEq,
        ruleName: `Trasporto del termine ${prettyName} (cambio segno)`,
        rulePrinciple: `Primo principio di equivalenza: spostando un termine additivo all'altro membro, esso cambia di segno (${opText} a entrambi i membri).`,
        steps: [`Trascino ${prettyName} all'altro membro con cambiamento di segno.`],
        conditions: [],
      };
    }

    // Se non era un termine additivo valido, ma un fattore moltiplicativo:
    return {
      ok: false,
      error: `"${prettyName}" è un fattore moltiplicativo, non un termine additivo! Per dividerlo rilascialo sotto la linea di frazione (nello slot denominatore).`,
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

let _arrowContainer = null;
let _arrowPath = null;
let _arrowHideTimer = null;

export function initDragArrow(cardEl) {
  if (!cardEl) return;
  // Rimuovi un eventuale SVG precedente (senza querySelector per id)
  if (_arrowSvg && _arrowSvg.parentNode) _arrowSvg.parentNode.removeChild(_arrowSvg);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'drag-arrow-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:90';

  const defs = document.createElementNS(NS, 'defs');
  const marker = document.createElementNS(NS, 'marker');
  marker.setAttribute('id', 'drag-arrowhead');
  marker.setAttribute('markerWidth', '9');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '8');
  marker.setAttribute('refY', '3.5');
  marker.setAttribute('orient', 'auto');
  const tip = document.createElementNS(NS, 'polygon');
  tip.setAttribute('points', '0 0, 9 3.5, 0 7');
  tip.setAttribute('fill', '#ef4444');
  marker.appendChild(tip);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#ef4444');
  path.setAttribute('stroke-width', '2.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('marker-end', 'url(#drag-arrowhead)');
  path.style.visibility = 'hidden';
  path.style.opacity = '0';
  svg.appendChild(path);

  // posizione relative richiede position:relative sul contenitore
  if (getComputedStyle(cardEl).position === 'static') cardEl.style.position = 'relative';
  cardEl.appendChild(svg);
  _arrowContainer = cardEl;
  _arrowPath = path;
}

export function updateDragArrow(sourceEl, targetEl, crossesMember) {
  if (!_arrowPath || !_arrowContainer || !sourceEl || !targetEl) return;
  if (_arrowHideTimer) { clearTimeout(_arrowHideTimer); _arrowHideTimer = null; }

  const cR = _arrowContainer.getBoundingClientRect();
  const sR = sourceEl.getBoundingClientRect();
  const tR = targetEl.getBoundingClientRect();

  const x1 = sR.left + sR.width / 2 - cR.left;
  const y1 = sR.top + sR.height / 2 - cR.top;
  const x2 = tR.left + tR.width / 2 - cR.left;
  const y2 = tR.top + tR.height / 2 - cR.top;

  // Accorcia leggermente la freccia per non sovrapporre la punta al centro del target
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
  const shorten = Math.min(12, len * 0.15);
  const ex = x2 - (x2 - x1) / len * shorten;
  const ey = y2 - (y2 - y1) / len * shorten;

  let d;
  if (!crossesMember) {
    // 2° principio — freccia diritta (punti di controllo sulla retta)
    const dx = (ex - x1) / 3;
    const dy = (ey - y1) / 3;
    d = `M ${x1} ${y1} C ${x1 + dx} ${y1 + dy} ${x1 + 2 * dx} ${y1 + 2 * dy} ${ex} ${ey}`;
  } else {
    // 1° principio — arco sopra il segno =
    const midX = (x1 + ex) / 2;
    const arcH = 64;
    const topY = Math.min(y1, ey) - arcH;
    d = `M ${x1} ${y1} C ${midX} ${topY} ${midX} ${topY} ${ex} ${ey}`;
  }

  // Imposta la proprietà CSS `d` (supporta transition); fallback su setAttribute
  try { _arrowPath.style.d = `path("${d}")`; } catch (_) {}
  _arrowPath.setAttribute('d', d);
  _arrowPath.style.visibility = 'visible';
  _arrowPath.style.opacity = '0.88';
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
let touchDragClone = null;

export function setupEquationDragAndDrop(container, { onApplyMove, getCurrentEquation }) {
  if (!container) return;

  let activeDragSourceEl = null;

  // Gestione HTML5 Drag and Drop nativo
  container.querySelectorAll('.draggable-token').forEach((token) => {
    token.setAttribute('draggable', 'true');

    token.addEventListener('dragstart', (e) => {
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
        onApplyMove(result);
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
 * Pointer events per touch screens (iPad / mobile / laptop touch).
 */
function setupTouchDragFallback(container, { onApplyMove, getCurrentEquation }) {
  let touchStartPos = null;
  let draggedElem = null;

  container.querySelectorAll('.draggable-token').forEach((token) => {
    token.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return; // mouse usa drag/drop nativo HTML5
      draggedElem = token;
      touchStartPos = { x: e.clientX, y: e.clientY };

      const varName = token.dataset.varName;
      const fromSide = token.dataset.side;
      const fromSlot = token.dataset.slot || 'num';
      const nodeType = token.dataset.nodeType || 'Var';
      activeDragData = { varName, fromSide, fromSlot, nodeType };

      // Crea badge visivo che segue il dito
      touchDragClone = document.createElement('div');
      touchDragClone.className = 'touch-drag-badge';
      touchDragClone.textContent = token.textContent.trim();
      touchDragClone.style.left = `${e.clientX}px`;
      touchDragClone.style.top = `${e.clientY}px`;
      document.body.appendChild(touchDragClone);

      container.classList.add('is-dragging-equation');
      highlightDropzones(container, activeDragData);
      token.setPointerCapture(e.pointerId);
    });

    token.addEventListener('pointermove', (e) => {
      if (!touchDragClone || draggedElem !== token) return;
      touchDragClone.style.left = `${e.clientX}px`;
      touchDragClone.style.top = `${e.clientY}px`;

      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const dropzone = elemBelow ? elemBelow.closest('.dropzone') : null;

      container.querySelectorAll('.dropzone').forEach((dz) => {
        dz.classList.remove('dropzone-hover');
        const slot = dz.querySelector('.drop-slot');
        if (slot) slot.classList.remove('drop-slot-hover');
      });
      if (dropzone) {
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
      if (!draggedElem || draggedElem !== token) return;

      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const dropzone = elemBelow ? elemBelow.closest('.dropzone') : null;

      if (touchDragClone && touchDragClone.parentNode) {
        touchDragClone.parentNode.removeChild(touchDragClone);
      }
      touchDragClone = null;
      container.classList.remove('is-dragging-equation');
      hideDragArrow();

      if (dropzone && activeDragData) {
        const targetSide = dropzone.dataset.side;
        const targetSlot = dropzone.dataset.slot;
        const currentEq = getCurrentEquation();

        const result = applyDragMove({
          currentEq,
          varName: activeDragData.varName,
          nodeType: activeDragData.nodeType,
          fromSide: activeDragData.fromSide,
          fromSlot: activeDragData.fromSlot,
          targetSide,
          targetSlot,
        });

        clearDropzonesHighlight(container);
        activeDragData = null;
        draggedElem = null;

        if (onApplyMove) onApplyMove(result);
      } else {
        clearDropzonesHighlight(container);
        activeDragData = null;
        draggedElem = null;
      }
    });

    token.addEventListener('pointercancel', () => {
      if (touchDragClone && touchDragClone.parentNode) {
        touchDragClone.parentNode.removeChild(touchDragClone);
      }
      touchDragClone = null;
      container.classList.remove('is-dragging-equation');
      clearDropzonesHighlight(container);
      hideDragArrow();
      activeDragData = null;
      draggedElem = null;
    });
  });
}
