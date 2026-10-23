// js/ui-history.js — Gestione della cronologia, passaggi, undo/redo e copia appunti.

import { clone, toPretty, toLatex } from './ast.js';
import { renderEquation, prettyVar } from './render.js';
import { RULES } from './rules.js';

let dom = null;
let state = null;
let ctx = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function escapeLatexComment(s) {
  return (s || '').replace(/([&%$#_{}~^\\])/g, '\\$1');
}

export function initHistory(domRefs, appState, appCtx) {
  dom = domRefs;
  state = appState;
  ctx = appCtx;
  bindHistoryEvents();
}

export function bindHistoryEvents() {
  if (dom.btnUndo) dom.btnUndo.addEventListener('click', undo);
  if (dom.btnRedo) dom.btnRedo.addEventListener('click', redo);
  if (dom.btnReset) dom.btnReset.addEventListener('click', resetExercise);
  if (dom.btnCopySteps) dom.btnCopySteps.addEventListener('click', copyStepsText);
  if (dom.btnCopyStepsLatex) dom.btnCopyStepsLatex.addEventListener('click', copyStepsLatex);
}

export function pushHistory(entry, isInitial = false, isFailed = false) {
  if (!state) return;
  if (!isInitial && state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }
  entry.timestamp = Date.now();
  entry.failed = !!isFailed;
  state.history.push(entry);
  state.historyIndex = state.history.length - 1;
  renderHistory();
  updateHistoryButtons();
  if (!isInitial && state.quizManager) {
    state.quizManager.onMoveExecuted(!isFailed);
  }
}

export function renderHistory() {
  if (!dom || !dom.historyList || !state) return;
  if (state.history.length === 0) {
    dom.historyList.innerHTML = '<li class="history-empty">Nessun passaggio registrato.</li>';
    return;
  }
  dom.historyList.innerHTML = '';
  state.history.forEach((h, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    if (i === state.historyIndex) li.classList.add('current');
    if (h.failed) li.classList.add('failed');
    if (i > state.historyIndex) li.classList.add('future');
    li.innerHTML = `
      <div class="history-head">
        <span class="history-step">${h.failed ? '✗' : (i === 0 ? '0' : i)}</span> <span class="history-rule">${escapeHtml(h.ruleName)}</span>
      </div>
      <div class="history-eq">${renderEquation(h.equation, {})}</div>
      ${h.conditions && h.conditions.length ? `<div class="history-cond">Condizioni: ${h.conditions.map(escapeHtml).join('; ')}</div>` : ''}
      ${h.note ? `<div class="history-note">${escapeHtml(h.note)}</div>` : ''}
      <div class="history-status">${h.verified ? '✓ controllo matematico superato' : '✗ mossa rifiutata'}</div>
    `;
    li.addEventListener('click', () => goToHistory(i));
    li.tabIndex = 0;
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToHistory(i); });
    dom.historyList.appendChild(li);
  });
  const cur = dom.historyList.querySelector('.current');
  if (cur && dom.historyList) {
    // Scorriamo unicamente la lista interna della cronologia senza muovere la pagina principale
    const top = cur.offsetTop - dom.historyList.offsetTop;
    dom.historyList.scrollTop = Math.max(0, top);
  }
}

export function goToHistory(i) {
  if (ctx && ctx.cancelCompoundFractionAnimation) ctx.cancelCompoundFractionAnimation();
  if (i < 0 || i >= state.history.length) return;
  if (state.history[i].failed) {
    if (ctx && ctx.showMessage) ctx.showMessage("Questo è un tentativo non valido: l'equazione non è cambiata.", 'info');
    return;
  }
  state.historyIndex = i;
  state.currentEq = clone(state.history[i].equation);
  state.conditions = collectConditionsUpTo(i);
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();
  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  renderHistory();
  updateHistoryButtons();
  if (i > 0) {
    const h = state.history[i];
    const rule = h.ruleId ? Object.values(RULES).find((r) => r.id === h.ruleId) : null;
    if (ctx && ctx.showRulePanel) {
      ctx.showRulePanel(rule || { name: h.ruleName, principle: h.rulePrinciple }, { steps: h.steps, conditions: h.conditions, note: h.note }, state.currentEq);
    }
  } else {
    if (ctx && ctx.updateRulePanelInitial) ctx.updateRulePanelInitial(state.baseFormula);
  }
}

export function collectConditionsUpTo(i) {
  const set = new Set(state.baseFormula && state.baseFormula.conditions ? state.baseFormula.conditions : []);
  for (let k = 0; k <= i; k++) {
    if (state.history[k].failed) continue;
    for (const c of (state.history[k].conditions || [])) set.add(c);
  }
  return Array.from(set);
}

export function undo() {
  if (!state) return;
  let i = state.historyIndex - 1;
  while (i >= 0 && state.history[i].failed) i--;
  if (i < 0) {
    if (ctx && ctx.showMessage) ctx.showMessage('Non ci sono trasformazioni da annullare.', 'info');
    return;
  }
  goToHistory(i);
}

export function redo() {
  if (!state) return;
  let i = state.historyIndex + 1;
  while (i < state.history.length && state.history[i].failed) i++;
  if (i >= state.history.length) {
    if (ctx && ctx.showMessage) ctx.showMessage('Non ci sono trasformazioni da ripristinare.', 'info');
    return;
  }
  goToHistory(i);
}

export function resetExercise() {
  if (ctx && ctx.cancelCompoundFractionAnimation) ctx.cancelCompoundFractionAnimation();
  if (!state || !state.startEq) return;
  if (ctx && ctx.playSoundClick) ctx.playSoundClick();
  if (ctx && ctx.dismissDidacticBubble) ctx.dismissDidacticBubble();
  if (ctx && ctx.clearSelection) ctx.clearSelection();
  if (ctx && ctx.clearPreview) ctx.clearPreview();
  if (state.baseFormula && state.targetVar && ctx && ctx.loadFormula) {
    ctx.loadFormula(state.baseFormula, state.targetVar);
    if (ctx.showMessage) ctx.showMessage("Esercizio ricominciato dall'inizio.", 'info');
    return;
  }
  state.history = [];
  state.historyIndex = -1;
  state.currentEq = clone(state.startEq);
  state.conditions = (state.baseFormula && state.baseFormula.conditions ? state.baseFormula.conditions : state.conditions || []).slice();
  state.selectedId = null;
  pushHistory({
    equation: clone(state.startEq),
    ruleName: 'Formula di partenza',
    rulePrinciple: state.baseFormula ? state.baseFormula.formula : toPretty(state.startEq, 0),
    steps: [],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: (state.baseFormula && state.baseFormula.hypotheses) || null,
    verified: true,
  }, true);
  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (state.baseFormula && ctx && ctx.updateRulePanelInitial) ctx.updateRulePanelInitial(state.baseFormula);
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage("Esercizio ricominciato dall'inizio.", 'info');
}

export function updateHistoryButtons() {
  if (!dom || !dom.btnUndo || !dom.btnRedo || !state) return;
  let prev = state.historyIndex - 1;
  while (prev >= 0 && state.history[prev].failed) prev--;
  let next = state.historyIndex + 1;
  while (next < state.history.length && state.history[next].failed) next++;
  dom.btnUndo.disabled = prev < 0;
  dom.btnRedo.disabled = next >= state.history.length;
}

export function copyStepsText() {
  if (!state || state.history.length === 0) return;
  const lines = state.history
    .filter((h) => !h.failed)
    .map((h, i) => `${i === 0 ? 'Partenza' : 'Passo ' + i}: ${toPretty(h.equation, 0)} (${h.ruleName})`);
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (ctx && ctx.showMessage) ctx.showMessage(`${lines.length} passaggi copiati negli appunti!`, 'success');
    }).catch(() => {
      prompt('Copia i passaggi:', text);
    });
  } else {
    prompt('Copia i passaggi:', text);
  }
}

export function copyStepsLatex() {
  if (!state || state.history.length === 0) return;
  const validSteps = state.history.filter((h) => !h.failed);
  const lines = validSteps.map((h, i) => {
    const ltx = toLatex(h.equation);
    const aligned = ltx.includes('=') ? ltx.replace('=', '&=') : ltx + ' &=';
    const label = escapeLatexComment(h.ruleName || (i === 0 ? 'Formula di partenza' : 'Passo ' + i));
    return `  ${aligned} && \\text{(${label})}`;
  });
  const block = `\\begin{align*}\n${lines.join(' \\\\\n')}\n\\end{align*}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(block).then(() => {
      if (ctx && ctx.showMessage) ctx.showMessage(`Svolgimento LaTeX (align*) copiato negli appunti!`, 'success');
    }).catch(() => {
      prompt('Copia lo svolgimento LaTeX:', block);
    });
  } else {
    prompt('Copia lo svolgimento LaTeX:', block);
  }
}
