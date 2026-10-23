// js/ui-canvas.js — Area di lavoro: visualizzazione dell'equazione, token interattivi,
// click-drag / touch drag, modalità croce di semplificazione e animazioni particellari / frazioni composte.

import { renderEquation, prettyVar } from './render.js';
import {
  clone, toPretty, toLatex, unwrap, stripNeutrals,
  structurallyEqual, equivalentEq, Eq,
} from './ast.js';
import { crossCancel, analyseElementId } from './cross.js';
import {
  setupEquationDragAndDrop, highlightDropzones, clearDropzonesHighlight,
  applyDragMove, initDragArrow, updateDragArrow, hideDragArrow,
  cleanupTouchDrag, wasRecentTouchDrag,
} from './dragdrop.js';
import { verbalizeEquation, verbalizeVar, announceMathLive } from './a11y.js';
import {
  findElement, availableActions, mergeConditions,
  isolatedSide, ensureTargetOnFirstMember, isGoalReached,
} from './algebra.js';
import { hasCompoundFraction, getCompoundFractionSteps } from './compound-fraction.js';

let dom = null;
let state = null;
let ctx = null;

let _neutralCleanupTimer = null;
let _isMirrorSwapping = false;
let _currentMirrorAnims = [];

export function initCanvas(domRefs, appState, appCtx) {
  dom = domRefs;
  state = appState;
  ctx = appCtx;

  if (dom.btnCross) dom.btnCross.addEventListener('click', () => toggleCrossMode());
  bindCrossDrag();
  initDragArrow();
}

// ---------------------------------------------------------------------------
// Rendering Area di Lavoro
// ---------------------------------------------------------------------------
export function renderEquationView() {
  if (!state || !dom || !dom.equationDisplay) return;
  state.clickDragToken = null;
  dom.equationDisplay.classList.remove('is-dragging-equation', 'is-click-drag-mode');
  hideDragArrow();

  if (!state.currentEq) {
    dom.equationDisplay.innerHTML = '<p class="placeholder">Nessuna equazione caricata.</p>';
    if (dom.latexLiveCode) dom.latexLiveCode.textContent = '';
    if (ctx && ctx.renderKeypad) ctx.renderKeypad();
    return;
  }

  dom.equationDisplay.innerHTML = renderEquation(state.currentEq, {
    selectedId: state.selectedId,
    targetVar: state.targetVar,
    interactive: true,
    showImplicitDen: state.showImplicitDen,
  });

  if (dom.latexLiveCode) {
    dom.latexLiveCode.textContent = toLatex(state.currentEq);
  }

  attachEquationHandlers();
  setupEquationDragAndDrop(dom.equationDisplay, {
    getCurrentEquation: () => state.currentEq,
    onApplyMove: applyDragResult,
  });
  attachDropzoneClickHandlers();

  if (ctx && ctx.renderConditions) ctx.renderConditions();
  if (ctx && ctx.renderKeypad) ctx.renderKeypad();

  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (card) card.classList.toggle('is-auto-mode', state.mode === 'auto');

  if (state.mode === 'auto') {
    const hintBadge = document.querySelector('.drag-hint-badge');
    const hintText = document.querySelector('.drag-hint-text');
    if (hintBadge && hintText) {
      hintBadge.textContent = '⚡ Modalità Automatica';
      hintText.innerHTML = '<strong>Fai clic ovunque con il mouse</strong> (sull\'equazione o sul pulsante) per eseguire il passaggio con la giustificazione della regola!';
    }
  }

  if (state.currentEq) {
    announceMathLive(`Equazione attiva: ${verbalizeEquation(state.currentEq)}`);
  }

  scheduleNeutralCleanup();
}

export function scheduleNeutralCleanup() {
  if (_neutralCleanupTimer) clearTimeout(_neutralCleanupTimer);
  _neutralCleanupTimer = setTimeout(() => {
    if (!state || !state.currentEq) return;
    const cleaned = stripNeutrals(state.currentEq);
    if (!structurallyEqual(cleaned, state.currentEq)) {
      const wraps = dom.equationDisplay ? dom.equationDisplay.querySelectorAll('.neutral-fade-wrap') : [];
      if (wraps.length > 0) {
        wraps.forEach((w) => {
          w.classList.add('var-exploding');
          spawnVariableExplosion(w, 'gold');
        });
        setTimeout(() => {
          state.currentEq = cleaned;
          renderEquationView();
        }, 400);
      } else {
        state.currentEq = cleaned;
        renderEquationView();
      }
    }
  }, 1600);
}

// ---------------------------------------------------------------------------
// Click-to-drag & Dropzone interactions
// ---------------------------------------------------------------------------
export function enterClickDragMode(tokenEl) {
  const varName = tokenEl.dataset.varName;
  if (!varName || !state.currentEq) return;
  state.clickDragToken = {
    varName,
    fromSide: tokenEl.dataset.side,
    fromSlot: tokenEl.dataset.slot || 'num',
    nodeType: tokenEl.dataset.nodeType || 'Var',
  };
  tokenEl.classList.add('token-in-flight');
  dom.equationDisplay.classList.add('is-dragging-equation', 'is-click-drag-mode');
  highlightDropzones(dom.equationDisplay, state.clickDragToken);
  if (ctx && ctx.showMessage) {
    ctx.showMessage(`"${prettyVar(varName)}" selezionato — clicca la destinazione (denominatore o membro opposto) per applicare il trasporto, oppure scegli un'operazione in basso. Riclicca per annullare.`, 'info');
  }
  const foundEl = findElement(state.currentEq, tokenEl.dataset.id);
  if (foundEl) {
    state.selectedId = tokenEl.dataset.id;
    const actions = availableActions(state.currentEq, foundEl, state.targetVar);
    if (ctx && ctx.renderActions) ctx.renderActions(foundEl, actions);
  }
}

export function exitClickDragMode() {
  state.clickDragToken = null;
  if (dom.equationDisplay) {
    dom.equationDisplay.classList.remove('is-dragging-equation', 'is-click-drag-mode');
    dom.equationDisplay.querySelectorAll('.token-in-flight').forEach((el) => el.classList.remove('token-in-flight'));
    clearDropzonesHighlight(dom.equationDisplay);
  }
  hideDragArrow();
}

export function applyClickDragToDropzone(dz) {
  if (!state.clickDragToken) return;
  const drag = state.clickDragToken;
  const tokenEl = dom.equationDisplay ? dom.equationDisplay.querySelector('.token-in-flight') : null;
  const sourceRect = tokenEl ? tokenEl.getBoundingClientRect() : null;
  const targetRect = dz.getBoundingClientRect();
  const tokenText = drag.varName;

  exitClickDragMode();
  const result = applyDragMove({
    currentEq: state.currentEq,
    varName: drag.varName,
    nodeType: drag.nodeType,
    fromSide: drag.fromSide,
    fromSlot: drag.fromSlot,
    targetSide: dz.dataset.side,
    targetSlot: dz.dataset.slot,
  });
  if (!result.ok) {
    flashTokenRejected(drag.varName, drag.fromSide);
    applyDragResult(result);
    return;
  }
  applyDragResult(result, { sourceRect, targetRect, tokenText, targetSide: dz.dataset.side, varName: drag.varName });
}

export function attachEquationHandlers() {
  if (!dom.equationDisplay) return;
  dom.equationDisplay.querySelectorAll('.math-node').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wasRecentTouchDrag()) return;
      if (state.mode === 'auto') {
        if (ctx && ctx.executeNextAutoStep) ctx.executeNextAutoStep();
        return;
      }
      if (state.crossMode) { crossPickToken(el.dataset.id, el); return; }

      // Click-drag: se l'elemento è un token draggable
      if (el.classList.contains('draggable-token') && el.dataset.varName) {
        if (state.clickDragToken) {
          if (el.classList.contains('token-in-flight')) {
            exitClickDragMode(); return;
          }
          if (el.dataset.side === state.clickDragToken.fromSide) {
            exitClickDragMode(); enterClickDragMode(el); return;
          }
          const dz = el.closest('.dropzone');
          if (dz && dz.dataset.side && dz.dataset.slot) {
            applyClickDragToDropzone(dz); return;
          }
          exitClickDragMode(); return;
        }
        enterClickDragMode(el); return;
      }

      // In click-drag: click su elemento non-draggable cerca il dropzone padre
      if (state.clickDragToken) {
        const dz = el.closest('.dropzone');
        if (dz && dz.dataset.side && dz.dataset.side !== state.clickDragToken.fromSide) {
          applyClickDragToDropzone(dz); return;
        }
        exitClickDragMode(); return;
      }

      if (ctx && ctx.selectElement) ctx.selectElement(el.dataset.id);
    });
    const rawVal = el.dataset.varName || (el.textContent || '').trim();
    const verbal = verbalizeVar(rawVal) || rawVal;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Elemento: ' + verbal);
    if (el.classList.contains('draggable-token')) {
      el.setAttribute('aria-roledescription', 'termine matematico trascinabile');
    }
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state.mode === 'auto') {
          if (ctx && ctx.executeNextAutoStep) ctx.executeNextAutoStep();
          return;
        }
        if (state.crossMode) crossPickToken(el.dataset.id, el);
        else if (ctx && ctx.selectElement) ctx.selectElement(el.dataset.id);
      }
    });
  });
}

export function attachDropzoneClickHandlers() {
  if (!dom.equationDisplay) return;
  dom.equationDisplay.querySelectorAll('.dropzone').forEach((dz) => {
    dz.addEventListener('click', (e) => {
      if (state.mode === 'auto') {
        if (ctx && ctx.executeNextAutoStep) ctx.executeNextAutoStep();
        return;
      }
      if (!state.clickDragToken) return;
      if (dz.dataset.side === state.clickDragToken.fromSide) {
        if (state.clickDragToken.fromSlot === 'num' && dz.dataset.slot === 'den') {
          const oppMember = state.clickDragToken.fromSide === 'right' ? 'primo membro (sotto la linea di frazione a sinistra)' : 'secondo membro (sotto la linea di frazione a destra)';
          if (ctx && ctx.showMessage) {
            ctx.showMessage(`Non puoi spostare "${prettyVar(state.clickDragToken.varName)}" al denominatore dello stesso membro! Per il 2° principio di equivalenza, se dividi per esso va al denominatore del membro OPPOSTO (${oppMember}).`, 'warning');
          }
        } else {
          if (ctx && ctx.showMessage) {
            ctx.showMessage(`Trascina o clicca sul membro opposto per applicare la regola del trasporto!`, 'info');
          }
        }
        flashTokenRejected(state.clickDragToken.varName, state.clickDragToken.fromSide);
        return;
      }
      e.stopPropagation();
      applyClickDragToDropzone(dz);
    });

    dz.addEventListener('mouseenter', () => {
      if (!state.clickDragToken) return;
      const tokenEl = dom.equationDisplay.querySelector('.token-in-flight');
      if (!tokenEl) return;
      const crossesMember = dz.dataset.side !== state.clickDragToken.fromSide;
      updateDragArrow(tokenEl, dz, crossesMember);
    });
    dz.addEventListener('mouseleave', () => {
      if (state.clickDragToken) hideDragArrow();
    });
  });
}

// ---------------------------------------------------------------------------
// Animazioni ed effetti visivi
// ---------------------------------------------------------------------------
export function flashTokenRejected(varName, side) {
  if (!varName || !dom.equationDisplay) return;
  const el = dom.equationDisplay.querySelector(`[data-var-name="${CSS.escape(varName)}"][data-side="${side}"]`);
  if (!el) return;
  el.classList.remove('token-rejected');
  void el.offsetWidth;
  el.classList.add('token-rejected');
  setTimeout(() => el.classList.remove('token-rejected'), 600);
}

export function highlightLandedToken(varName, side) {
  if (!dom.equationDisplay || !varName) return;
  const tokens = dom.equationDisplay.querySelectorAll(`.draggable-token[data-side="${side}"]`);
  for (const t of tokens) {
    if (t.dataset.varName === varName || t.textContent.trim() === varName) {
      t.classList.add('token-landing-glow');
      setTimeout(() => t.classList.remove('token-landing-glow'), 600);
      break;
    }
  }
}

export function flashSignChanged() {
  if (!dom.equationDisplay) return;
  dom.equationDisplay.querySelectorAll('.draggable-token, .node-target, .op').forEach((el) => {
    el.classList.add('sign-flip-pulse');
  });
  setTimeout(() => {
    if (dom.equationDisplay) {
      dom.equationDisplay.querySelectorAll('.sign-flip-pulse').forEach((el) => el.classList.remove('sign-flip-pulse'));
    }
  }, 700);
}

export function animateOperationBadge(label, operandText) {
  if (!dom.equationDisplay) return;
  const card = dom.equationDisplay.closest('.equation-display-card') || dom.equationDisplay;
  card.classList.remove('op-animating');
  void card.offsetWidth;
  card.classList.add('op-animating');

  const badge = document.createElement('span');
  badge.className = 'op-anim-badge';
  badge.textContent = operandText ? `${label}${prettyVar(operandText)}` : label;
  badge.setAttribute('aria-hidden', 'true');
  card.appendChild(badge);

  const cleanup = () => {
    card.classList.remove('op-animating');
    if (badge.parentNode) badge.parentNode.removeChild(badge);
  };
  badge.addEventListener('animationend', cleanup);
  setTimeout(cleanup, 1200);
}

export function cancelActiveSwapAnimations() {
  _isMirrorSwapping = false;
  if (_currentMirrorAnims.length > 0) {
    _currentMirrorAnims.forEach((a) => { try { a.cancel(); } catch (_) {} });
    _currentMirrorAnims = [];
  }
  cleanupTouchDrag(dom.equationDisplay);
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.flying-math-token, .op-anim-badge').forEach((el) => el.remove());
  }
  if (dom.crossDissolveLayer) {
    dom.crossDissolveLayer.innerHTML = '';
  }
}

export function animateMirrorSwap(fromEq, toEq, onComplete) {
  if (_isMirrorSwapping) {
    if (onComplete) onComplete();
    return;
  }
  const memberL = dom.equationDisplay ? dom.equationDisplay.querySelector('.math-member-left') : null;
  const memberR = dom.equationDisplay ? dom.equationDisplay.querySelector('.math-member-right') : null;
  const eqSign = dom.equationDisplay ? dom.equationDisplay.querySelector('.eq-sign') : null;

  if (!memberL || !memberR) {
    if (onComplete) onComplete();
    return;
  }

  _isMirrorSwapping = true;
  if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();

  const rectL = memberL.getBoundingClientRect();
  const rectR = memberR.getBoundingClientRect();
  const deltaX = rectR.left - rectL.left;

  if (eqSign) {
    eqSign.classList.remove('eq-sign-mirror-active');
    void eqSign.offsetWidth;
    eqSign.classList.add('eq-sign-mirror-active');
  }

  const animL = memberL.animate([
    { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
    { transform: `translate(${deltaX * 0.5}px, -20px) scale(1.04)`, opacity: 0.94, offset: 0.5 },
    { transform: `translate(${deltaX}px, 0px) scale(1)`, opacity: 1 }
  ], {
    duration: 260,
    easing: 'cubic-bezier(0.25, 1, 0.4, 1)',
    fill: 'forwards'
  });

  const animR = memberR.animate([
    { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
    { transform: `translate(${-deltaX * 0.5}px, 20px) scale(1.04)`, opacity: 0.94, offset: 0.5 },
    { transform: `translate(${-deltaX}px, 0px) scale(1)`, opacity: 1 }
  ], {
    duration: 260,
    easing: 'cubic-bezier(0.25, 1, 0.4, 1)',
    fill: 'forwards'
  });

  _currentMirrorAnims = [animL, animR];

  animL.onfinish = () => {
    _isMirrorSwapping = false;
    _currentMirrorAnims = [];
    if (eqSign) eqSign.classList.remove('eq-sign-mirror-active');
    if (onComplete) onComplete();
  };
}

export function animateTokenTravel(sourceRect, targetRect, tokenText, onComplete) {
  if (!sourceRect || !targetRect) {
    if (onComplete) onComplete();
    return;
  }

  document.querySelectorAll('.flying-math-token').forEach((el) => el.remove());

  const flyer = document.createElement('div');
  flyer.className = 'flying-math-token';
  flyer.textContent = tokenText || '';
  flyer.style.left = `${sourceRect.left}px`;
  flyer.style.top = `${sourceRect.top}px`;
  flyer.style.width = `${Math.max(30, sourceRect.width)}px`;
  flyer.style.height = `${Math.max(28, sourceRect.height)}px`;
  document.body.appendChild(flyer);

  const dx = (targetRect.left + targetRect.width / 2) - (sourceRect.left + sourceRect.width / 2);
  const dy = (targetRect.top + targetRect.height / 2) - (sourceRect.top + sourceRect.height / 2);
  const midX = dx * 0.5;
  const arcY = dy * 0.5 - Math.max(38, Math.min(85, Math.abs(dx) * 0.28));

  let finished = false;
  let fallbackTimer = null;
  const done = () => {
    if (finished) return;
    finished = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
    if (onComplete) onComplete();
  };

  fallbackTimer = setTimeout(done, 520);

  if (typeof flyer.animate === 'function') {
    const anim = flyer.animate([
      { transform: 'translate(0px, 0px) scale(1)', opacity: 0.95 },
      { transform: `translate(${midX}px, ${arcY}px) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0.95 }
    ], {
      duration: 440,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });
    anim.onfinish = done;
    anim.oncancel = done;
  } else {
    done();
  }
}

// ---------------------------------------------------------------------------
// Croce di semplificazione
// ---------------------------------------------------------------------------
export function toggleCrossMode(force) {
  state.crossMode = typeof force === 'boolean' ? force : !state.crossMode;
  state.crossPicked = [];
  if (dom.btnCross) {
    dom.btnCross.classList.toggle('active', state.crossMode);
    dom.btnCross.setAttribute('aria-pressed', state.crossMode ? 'true' : 'false');
  }
  if (dom.crossLayer) {
    dom.crossLayer.hidden = !state.crossMode;
  }
  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (card) card.classList.toggle('cross-mode', state.crossMode);
  clearCrossMarks();
  if (state.crossMode) {
    if (ctx && ctx.showMessage) {
      ctx.showMessage('✕/ Semplificazione attiva — clicca due elementi da eliminare (fattori num./den., termini opposti o stessa grandezza su entrambi i membri).', 'info');
    }
  }
}

export function clearCrossMarks() {
  if (!dom.equationDisplay) return;
  dom.equationDisplay.querySelectorAll('.cross-marked').forEach((el) => el.classList.remove('cross-marked'));
}

export function crossPickToken(id, element) {
  if (!state.currentEq || !id) return;
  const already = state.crossPicked.indexOf(id);
  if (already >= 0) {
    state.crossPicked.splice(already, 1);
    if (element) element.classList.remove('cross-marked');
    if (state.crossPicked.length === 0 && ctx && ctx.clearPreview) ctx.clearPreview();
    return;
  }
  state.crossPicked.push(id);
  if (element) element.classList.add('cross-marked');
  if (state.crossPicked.length < 2) {
    if (ctx && ctx.showMessage) ctx.showMessage('Primo elemento selezionato — ora scegli il secondo da semplificare.', 'info');
    return;
  }

  const [idA, idB] = state.crossPicked;
  const res = crossCancel(state.currentEq, idA, idB);
  if (!res.ok) {
    state.crossPicked = [];
    clearCrossMarks();
    flashCrossError();
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint, { label: 'Semplificazione' });
    return;
  }
  dissolveThenApplyCross(idA, idB, res);
}

export function spawnVariableExplosion(el, colorScheme = 'neon') {
  const layer = dom.crossDissolveLayer;
  if (!el || !layer) return;
  const layerRect = layer.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const cx = rect.left + rect.width / 2 - layerRect.left;
  const cy = rect.top + rect.height / 2 - layerRect.top;

  const shockwave = document.createElement('div');
  shockwave.className = 'explosion-shockwave';
  shockwave.style.left = `${cx}px`;
  shockwave.style.top = `${cy}px`;
  layer.appendChild(shockwave);

  const palette = colorScheme === 'gold'
    ? ['#fbbf24', '#f59e0b', '#fb7185', '#38bdf8', '#ffffff']
    : ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e', '#34d399', '#fbbf24'];
  const symbols = ['✦', '★', '●', '✦', '▲', '◆', '✨'];

  const count = 12;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'explosion-particle';
    const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
    const distance = 28 + Math.random() * 42;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const color = palette[i % palette.length];
    const size = 11 + Math.random() * 9;

    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.color = color;
    p.style.fontSize = `${size}px`;
    p.style.setProperty('--dx', `${dx}px`);
    p.style.setProperty('--dy', `${dy}px`);
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    layer.appendChild(p);
  }

  setTimeout(() => {
    shockwave.remove();
    layer.querySelectorAll('.explosion-particle').forEach((p) => p.remove());
  }, 750);
}

export function findCancellableDomElements(action) {
  if (!dom || !dom.equationDisplay || !action) return [];
  if (action.ruleKey !== 'cancelFactor' && action.id !== 'cancel-factor') return [];
  let denText = '';
  try {
    const actCtx = action.build ? action.build({}) : {};
    denText = (actCtx.denText || '').trim();
  } catch {}
  if (!denText) return [];

  const found = [];
  dom.equationDisplay.querySelectorAll('.math-node').forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (txt === denText || el.dataset.varName === denText) {
      found.push(el);
    }
  });
  return found;
}

export function spawnVictoryConfetti() {
  const layer = dom.crossDissolveLayer;
  if (!layer) return;
  const layerRect = layer.getBoundingClientRect();
  const width = layerRect.width || 600;
  const height = layerRect.height || 200;

  const colors = ['#38bdf8', '#ec4899', '#a855f7', '#fbbf24', '#10b981', '#6366f1'];
  const symbols = ['★', '✦', '🎉', '✨', '◆', '●'];

  for (let i = 0; i < 26; i++) {
    const p = document.createElement('div');
    p.className = 'explosion-particle victory-particle';
    const startX = Math.random() * width;
    const startY = height * 0.2 + Math.random() * (height * 0.6);
    const angle = (Math.random() * Math.PI) - (Math.PI / 2);
    const distance = 40 + Math.random() * 85;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    p.style.color = color;
    p.style.fontSize = `${12 + Math.random() * 12}px`;
    p.style.setProperty('--dx', `${dx}px`);
    p.style.setProperty('--dy', `${dy}px`);
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    layer.appendChild(p);
  }

  setTimeout(() => {
    layer.querySelectorAll('.victory-particle').forEach((p) => p.remove());
  }, 950);
}

export function dissolveThenApplyCross(idA, idB, res) {
  clearCrossMarks();
  if (ctx && ctx.clearPreview) ctx.clearPreview();
  if (ctx && ctx.playSoundExplosion) ctx.playSoundExplosion();

  const elA = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idA)}"]`);
  const elB = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idB)}"]`);
  [elA, elB].forEach((el) => {
    if (el) {
      el.classList.add('cross-dissolving', 'var-exploding');
      spawnVariableExplosion(el);
    }
  });

  setTimeout(() => {
    state.currentEq = res.newEq;
    state.conditions = mergeConditions(state.conditions, res.conditions || []);
    state.selectedId = null;
    state.crossPicked = [];

    if (ctx && ctx.pushHistory) {
      ctx.pushHistory({
        equation: clone(res.newEq),
        ruleName: res.ruleName,
        rulePrinciple: res.rulePrinciple,
        ruleId: 'cross-cancel',
        steps: [`Elimino "${res.cancelled}" (semplificazione).`],
        conditions: (res.conditions || []).slice(),
        explanationKey: null,
        note: null,
        verified: true,
      }, false);
    }

    if (ctx && ctx.updateObjective) ctx.updateObjective();
    renderEquationView();
    if (ctx && ctx.showRulePanel) {
      ctx.showRulePanel(
        { name: res.ruleName, principle: res.rulePrinciple, explanation: null },
        { steps: [`Elimino ${res.cancelled}.`], conditions: res.conditions || [] },
        res.newEq
      );
    }
    if (ctx && ctx.clearMessage) ctx.clearMessage();
    if (ctx && ctx.showMessage) ctx.showMessage(`✓ ${res.ruleName}.`, 'success');
    toggleCrossMode(false);

    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
      spawnVictoryConfetti();
      if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
    } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
      ctx.showAutoMode();
    }
  }, 460);
}

export function applyCrossCancel(idA, idB) {
  const res = crossCancel(state.currentEq, idA, idB);
  if (!res.ok) {
    clearCrossMarks();
    flashCrossError();
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint, { label: 'Semplificazione' });
    toggleCrossMode(false);
    return;
  }
  dissolveThenApplyCross(idA, idB, res);
}

export function flashCrossError() {
  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (!card) return;
  card.classList.remove('cross-error');
  void card.offsetWidth;
  card.classList.add('cross-error');
  setTimeout(() => card.classList.remove('cross-error'), 500);
}

export function dissolveElements(ids) {
  const layer = dom.crossDissolveLayer;
  if (!layer || !dom.equationDisplay) return;
  layer.innerHTML = '';
  const hostRect = dom.equationDisplay.getBoundingClientRect();
  let count = 0;

  for (const id of ids) {
    const el = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const ghost = document.createElement('span');
    ghost.className = 'cross-ghost';
    ghost.innerHTML = el.innerHTML;
    ghost.style.left = `${rect.left - hostRect.left}px`;
    ghost.style.top = `${rect.top - hostRect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    layer.appendChild(ghost);
    count++;
  }
  if (count === 0) return;
  requestAnimationFrame(() => {
    layer.querySelectorAll('.cross-ghost').forEach((g) => g.classList.add('dissolving'));
  });
  setTimeout(() => { layer.innerHTML = ''; }, 700);
}

export function bindCrossDrag() {
  const handle = dom.crossHandle;
  if (!handle) return;
  let dragging = false;

  const tokenUnder = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const node = el.closest('.math-node');
    if (!node || !dom.equationDisplay.contains(node)) return null;
    return node;
  };

  const moveHandle = (x, y) => {
    const card = handle.closest('.cross-layer');
    const host = card || handle.parentElement;
    const rect = host.getBoundingClientRect();
    handle.style.left = `${x - rect.left}px`;
    handle.style.top = `${y - rect.top}px`;
  };

  const highlight = (node) => {
    dom.equationDisplay.querySelectorAll('.cross-hover').forEach((el) => el.classList.remove('cross-hover'));
    if (node && !node.classList.contains('cross-marked')) node.classList.add('cross-hover');
  };

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    handle.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
    moveHandle(e.clientX, e.clientY);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moveHandle(e.clientX, e.clientY);
    highlight(tokenUnder(e.clientX, e.clientY));
  });

  const finish = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    highlight(null);
    const node = tokenUnder(e.clientX, e.clientY);
    if (node) crossPickToken(node.dataset.id, node);
    handle.style.left = '';
    handle.style.top = '';
  };

  handle.addEventListener('pointerup', finish);
  const cancelCrossDrag = () => {
    dragging = false;
    handle.classList.remove('dragging');
    highlight(null);
    handle.style.left = '';
    handle.style.top = '';
  };
  handle.addEventListener('pointercancel', cancelCrossDrag);
  handle.addEventListener('lostpointercapture', cancelCrossDrag);

  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (ctx && ctx.showMessage) ctx.showMessage('Usa Tab per raggiungere un fattore e Invio per sceglierlo.', 'info');
    }
  });
}

// ---------------------------------------------------------------------------
// Drag & Drop callbacks
// ---------------------------------------------------------------------------
export function applyDragResult(result, meta = {}) {
  if (!result || state.isAnimatingCompoundFraction) return;

  if (!result.ok) {
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    const card = dom.equationDisplay.closest('.equation-display-card') || dom.equationDisplay;
    card.classList.remove('cross-error');
    void card.offsetWidth;
    card.classList.add('cross-error');
    setTimeout(() => card.classList.remove('cross-error'), 500);
    if (ctx && ctx.showInvalidMove) {
      ctx.showInvalidMove(result.error, 'Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.', { label: result.ruleName || 'Trasporto' });
    }
    return;
  }

  if (meta.sourceRect && meta.targetRect && meta.tokenText) {
    animateTokenTravel(meta.sourceRect, meta.targetRect, meta.tokenText, () => {
      finalizeDragResult(result, meta);
    });
  } else {
    finalizeDragResult(result, meta);
  }
}

export function finalizeDragResult(result, meta = {}) {
  if (result.principle === 'first') {
    if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();
  } else {
    if (ctx && ctx.playSoundFraction) ctx.playSoundFraction();
  }
  if (ctx && ctx.dismissDidacticBubble) ctx.dismissDidacticBubble();
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const nextEq = result.newEq;
  state.conditions = mergeConditions(state.conditions, result.conditions || []);
  state.selectedId = null;

  const pseudoRule = {
    name: result.ruleName,
    principle: result.rulePrinciple,
    explanation: null,
  };
  const pseudoResult = {
    equation: nextEq,
    rule: pseudoRule,
    steps: result.steps || [],
    conditions: result.conditions || [],
  };

  const isTargetIsolatedOnRight = isolatedSide(nextEq.right, state.targetVar);

  if (isTargetIsolatedOnRight) {
    state.currentEq = nextEq;
    renderEquationView();
    highlightLandedToken(meta.varName, meta.targetSide);
    if (ctx && ctx.showRulePanel) ctx.showRulePanel(pseudoRule, pseudoResult, nextEq);
    if (ctx && ctx.showMessage) ctx.showMessage(`✓ ${result.ruleName}!`, 'success');

    setTimeout(() => {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      if (flipped !== state.currentEq) {
        animateMirrorSwap(state.currentEq, flipped, () => {
          state.currentEq = flipped;
          state.goalReached = true;
          if (ctx && ctx.pushHistory) {
            ctx.pushHistory({
              equation: clone(flipped),
              ruleName: 'Regola dello specchio (scambio membri)',
              rulePrinciple: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
              ruleId: 'swapSides',
              steps: ['Scambio i due membri per la proprietà simmetrica: la grandezza cercata è al primo membro.'],
              conditions: state.conditions.slice(),
              explanationKey: 'scambioMembri',
              note: null,
              verified: true,
            }, false);
          }
          if (ctx && ctx.updateObjective) ctx.updateObjective();
          renderEquationView();
          if (checkAndAnimateCompoundFraction()) return;
          if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
          spawnVictoryConfetti();
          if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
        });
      }
    }, 450);
    return;
  }

  state.currentEq = nextEq;
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(nextEq),
      ruleName: result.ruleName,
      rulePrinciple: result.rulePrinciple,
      ruleId: null,
      steps: result.steps || [],
      conditions: (result.conditions || []).slice(),
      explanationKey: null,
      note: null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  renderEquationView();
  highlightLandedToken(meta.varName, meta.targetSide);
  if (ctx && ctx.showRulePanel) ctx.showRulePanel(pseudoRule, pseudoResult, result.newEq);
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage(`✓ ${result.ruleName}!`, 'success');

  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Animazione Didattica Frazioni di Frazione
// ---------------------------------------------------------------------------
export function cancelCompoundFractionAnimation() {
  if (state && state.compoundAnimTimers && state.compoundAnimTimers.length) {
    for (const t of state.compoundAnimTimers) clearTimeout(t);
    state.compoundAnimTimers = [];
  }
  if (state) state.isAnimatingCompoundFraction = false;
  if (dom && dom.equationDisplay) {
    dom.equationDisplay.classList.remove('compound-anim-step1', 'compound-anim-step2', 'compound-anim-step3');
  }
  if (dom && dom.compoundFractionBanner) {
    dom.compoundFractionBanner.hidden = true;
  }
}

export function checkAndAnimateCompoundFraction(onComplete) {
  if (!state || state.isAnimatingCompoundFraction) return false;
  if (!state.currentEq || !state.targetVar) return false;
  if (!isGoalReached(state.currentEq, state.targetVar)) return false;

  const steps = getCompoundFractionSteps(state.currentEq, state.targetVar);
  if (!steps) return false;

  startCompoundFractionAnimation(steps, onComplete);
  return true;
}

export function startCompoundFractionAnimation(steps, onComplete) {
  cancelCompoundFractionAnimation();
  state.isAnimatingCompoundFraction = true;

  if (dom.completionBanner) dom.completionBanner.hidden = true;

  if (dom.compoundFractionBanner) {
    dom.compoundFractionBanner.hidden = false;
    if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = 'Passaggio 1 di 2';
    if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = 'Frazione di frazione rilevata';
    if (dom.compoundFractionMsg) {
      dom.compoundFractionMsg.textContent = 'La formula presenta una frazione al denominatore. Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa).';
    }
  }

  if (dom.equationDisplay) {
    dom.equationDisplay.classList.remove('compound-anim-step2', 'compound-anim-step3');
    dom.equationDisplay.classList.add('compound-anim-step1');
  }

  state.currentEq = steps.step1Eq;
  renderEquationView();
  if (ctx && ctx.updateObjective) ctx.updateObjective();

  const t1 = setTimeout(() => {
    if (!state.isAnimatingCompoundFraction) return;

    if (ctx && ctx.playSoundFraction) ctx.playSoundFraction();
    state.currentEq = steps.step2Eq;
    renderEquationView();

    if (dom.compoundFractionBanner) {
      if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = 'Passaggio 2 di 2';
      if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = 'Inversione del denominatore';
      if (dom.compoundFractionMsg) {
        dom.compoundFractionMsg.textContent = 'Moltiplichiamo il numeratore per la frazione reciproca del denominatore: la frazione si capovolge.';
      }
    }

    if (dom.equationDisplay) {
      dom.equationDisplay.classList.remove('compound-anim-step1');
      dom.equationDisplay.classList.add('compound-anim-step2');
    }

    const t2 = setTimeout(() => {
      if (!state.isAnimatingCompoundFraction) return;

      if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
      spawnVictoryConfetti();
      state.currentEq = steps.step3Eq;
      state.isAnimatingCompoundFraction = false;
      renderEquationView();

      const rule = {
        name: 'Semplificazione frazione di frazione',
        principle: 'Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa): a / (b/c) = (a · c) / b.',
        explanation: null,
      };

      if (ctx && ctx.pushHistory) {
        ctx.pushHistory({
          equation: clone(steps.step3Eq),
          ruleName: rule.name,
          rulePrinciple: rule.principle,
          ruleId: 'compound_frac_simplify',
          steps: [
            `Frazione di frazione rilevata: ${steps.step1Pretty}`,
            `Moltiplicazione per la reciproca: ${steps.step2Pretty}`,
            `Frazione normale semplificata: ${steps.step3Pretty}`,
          ],
          conditions: (state.conditions || []).slice(),
          explanationKey: null,
          note: 'Semplificazione automatica frazione di frazione',
          verified: true,
        }, false);
      }

      if (dom.compoundFractionBanner) {
        if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = 'Completato ✓';
        if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = 'Frazione normale ottenuta!';
        if (dom.compoundFractionMsg) {
          dom.compoundFractionMsg.textContent = `Formula finale semplificata: ${steps.step3Pretty}.`;
        }
      }

      if (dom.equationDisplay) {
        dom.equationDisplay.classList.remove('compound-anim-step2');
        dom.equationDisplay.classList.add('compound-anim-step3');
      }

      if (ctx && ctx.updateObjective) ctx.updateObjective();
      if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Frazione di frazione semplificata! Formula inversa finale ricavata con successo.`, 'success');

      const t3 = setTimeout(() => {
        if (dom.compoundFractionBanner) dom.compoundFractionBanner.hidden = true;
        if (dom.equationDisplay) dom.equationDisplay.classList.remove('compound-anim-step3');
        if (typeof onComplete === 'function') onComplete();
      }, 3200);

      state.compoundAnimTimers.push(t3);
    }, 2500);

    state.compoundAnimTimers.push(t2);
  }, 2200);

  state.compoundAnimTimers.push(t1);
}
