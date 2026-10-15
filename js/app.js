// app.js — Gestione dell'applicazione: stato, interfaccia, selezione,
// anteprima, cronologia, undo/redo, modalità, esercizi, editor.

import { parseEquation, ParseError } from './parser.js';
import {
  clone, toPretty, toLatex, unwrap, collectVars, equivalentEq, Eq,
} from './ast.js';
import { reciprocalEquation } from './reciprocals.js';
import { KEYPAD_OPERATIONS, equationKeypadTokens, parseOperand, applyKeypadOperation } from './operations.js';
import { crossCancel } from './cross.js';
import {
  isGoalReached, findElement, availableActions, globalActions,
  performAction, suggestNextStep, mergeConditions,
} from './algebra.js';
import {
  filterFormulas, getFormulaById, randomExercise, TOPICS,
} from './formulas.js';
import { getExplanation } from './explanations.js';
import { renderEquation, prettyVar } from './render.js';
import { RULES } from './rules.js';
import { setupEquationDragAndDrop, highlightDropzones, clearDropzonesHighlight, applyDragMove, initDragArrow, updateDragArrow, hideDragArrow } from './dragdrop.js';
import { runAllTests, formatTestResults } from './tests.js';
import {
  latexToSyntax, LatexError,
  saveUserFormula, getUserFormulas, deleteUserFormula,
  clearUserFormulas, exportUserFormulasJSON, importUserFormulasJSON,
} from './formula-db.js';

// ---------------------------------------------------------------------------
// Stato
// ---------------------------------------------------------------------------
const state = {
  baseFormula: null,
  startEq: null,
  currentEq: null,
  targetVar: null,
  conditions: [],
  history: [],
  historyIndex: -1,
  mode: 'free',
  selectedId: null,
  pendingMove: null,
  goalReached: false,
  showImplicitDen: false,
  keypadOp: null,
  crossMode: false,
  crossPicked: [],
  clickDragToken: null,
};

// ---------------------------------------------------------------------------
// Riferimenti DOM
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const dom = {
  libraryList: $('#library-list'),
  librarySearch: $('#library-search'),
  libraryTopic: $('#library-topic'),
  libraryDifficulty: $('#library-difficulty'),
  libraryCountBadge: $('#library-count-badge'),
  btnRandom: $('#btn-random'),
  objectiveText: $('#objective-text'),
  objectiveStatus: $('#objective-status'),
  objectiveBox: $('#objective-box'),
  btnCopyFormula: $('#btn-copy-formula'),
  btnCopyLatex: $('#btn-copy-latex'),
  btnMirror: $('#btn-mirror'),
  btnReciprocal: $('#btn-reciprocal'),
  btnCross: $('#btn-cross'),
  crossLayer: $('#cross-layer'),
  crossHandle: $('#cross-handle'),
  crossDissolveLayer: $('#cross-dissolve-layer'),
  btnToggleImplicitDen: $('#btn-toggle-implicit-den'),
  equationDisplay: $('#equation-display'),
  keypadOps: $('#keypad-ops'),
  keypadOperands: $('#keypad-operands'),
  keypadHint: $('#keypad-hint'),
  latexLiveCode: $('#latex-live-code'),
  btnCopyLatexInline: $('#btn-copy-latex-inline'),
  objectiveTargetPicker: $('#objective-target-picker'),
  targetChips: $('#target-chips'),
  pickTargetBackdrop: $('#pick-target-backdrop'),
  pickTargetFormulaName: $('#pick-target-formula-name'),
  pickTargetFormulaPreview: $('#pick-target-formula-preview'),
  pickTargetButtons: $('#pick-target-buttons'),
  conditionsBox: $('#conditions-box'),
  conditionsList: $('#conditions-list'),
  previewBox: $('#preview-box'),
  previewText: $('#preview-text'),
  btnConfirm: $('#btn-confirm'),
  btnCancel: $('#btn-cancel'),
  messageBox: $('#message-box'),
  actionHint: $('#action-hint'),
  actionButtons: $('#action-buttons'),
  btnQuickHint: $('#btn-quick-hint'),
  rulePanel: $('#rule-panel'),
  historyList: $('#history-list'),
  btnUndo: $('#btn-undo'),
  btnRedo: $('#btn-redo'),
  btnReset: $('#btn-reset'),
  btnCopySteps: $('#btn-copy-steps'),
  btnCopyStepsLatex: $('#btn-copy-steps-latex'),
  customFormula: $('#custom-formula'),
  customTarget: $('#custom-target'),
  btnLoadCustom: $('#btn-load-custom'),
  customError: $('#custom-error'),
  modalBackdrop: $('#modal-backdrop'),
  modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'),
  modalActions: $('#modal-actions'),
  testsBackdrop: $('#tests-backdrop'),
  testsSummary: $('#tests-summary'),
  testsBody: $('#tests-body'),
  btnRunTests: $('#btn-run-tests'),
  btnHelp: $('#btn-help'),
  btnContrast: $('#btn-contrast'),
  btnTheme: $('#btn-theme'),
  // --- Import LaTeX ---
  latexInput: $('#latex-input'),
  latexName: $('#latex-name'),
  latexTarget: $('#latex-target'),
  btnLatexPreview: $('#btn-latex-preview'),
  btnLatexSave: $('#btn-latex-save'),
  latexPreview: $('#latex-preview'),
  latexError: $('#latex-error'),
  // --- Archivio personale ---
  myFormulasList: $('#my-formulas-list'),
  myFormulasCount: $('#my-formulas-count'),
  btnExportFormulas: $('#btn-export-formulas'),
  btnImportFormulas: $('#btn-import-formulas'),
  btnClearFormulas: $('#btn-clear-formulas'),
  jsonArea: $('#json-area'),
  storageError: $('#storage-error'),
};

// ---------------------------------------------------------------------------
// Inizializzazione
// ---------------------------------------------------------------------------
function init() {
  initTheme();
  populateTopics();
  renderLibrary();
  bindLibraryEvents();
  bindWorkAreaEvents();
  bindHistoryEvents();
  bindEditorEvents();
  bindModeEvents();
  bindGlobalEvents();
  bindLatexEvents();
  bindStorageEvents();
  renderMyFormulas();
  if (dom.crossLayer) dom.crossLayer.hidden = true; // mantenuto per compatibilità ma non mostrato
  initDragArrow();
  loadFormula(getFormulaById('v-st'), 't');
}

function populateTopics() {
  for (const t of TOPICS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    dom.libraryTopic.appendChild(opt);
  }
}

// ---------------------------------------------------------------------------
// A. Libreria
// ---------------------------------------------------------------------------
const parsedFormulaCache = new Map();
function parseFormulaCached(formulaStr) {
  if (!parsedFormulaCache.has(formulaStr)) {
    parsedFormulaCache.set(formulaStr, parseEquation(formulaStr));
  }
  return parsedFormulaCache.get(formulaStr);
}

function renderLibrary() {
  const topic = dom.libraryTopic ? dom.libraryTopic.value : '';
  const search = dom.librarySearch ? dom.librarySearch.value.trim() : '';
  const difficulty = dom.libraryDifficulty ? dom.libraryDifficulty.value : '';
  const list = filterFormulas({ topic, search, difficulty });

  if (dom.libraryCountBadge) {
    dom.libraryCountBadge.textContent = list.length + (list.length === 1 ? ' formula' : ' formule');
  }

  dom.libraryList.innerHTML = '';
  if (list.length === 0) {
    dom.libraryList.innerHTML = '<p class="placeholder">Nessuna formula trovata per i filtri selezionati.</p>';
    return;
  }
  for (const f of list) {
    const card = document.createElement('div');
    card.className = 'formula-card';
    card.dataset.id = f.id;
    card.setAttribute('role', 'option');
    card.tabIndex = 0;
    const dif = '★'.repeat(f.difficulty) + '☆'.repeat(5 - f.difficulty);
    let mathHtml = '';
    try {
      mathHtml = renderEquation(parseFormulaCached(f.formula), {});
    } catch (e) {
      mathHtml = escapeHtml(f.formula);
    }
    card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml(f.topic)}</span>
        <span class="formula-diff" title="Difficoltà ${f.difficulty}/5">${dif}</span>
      </div>
      <div class="formula-name">${escapeHtml(f.name)}</div>
      <div class="formula-math">${mathHtml}</div>
      <div class="formula-isolate">
        <span class="isolate-label">Scegli cosa ricavare:</span>
        <div class="isolate-chips">
          ${f.isolate.map((v) => `<button type="button" class="isolate-chip" data-var="${v}" title="Ricava ${prettyVar(v)}">${prettyVar(v)}</button>`).join('')}
        </div>
      </div>
    `;

    // Click diretto sul chip della grandezza
    card.querySelectorAll('.isolate-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelection();
        clearPreview();
        loadFormula(f, chip.dataset.var);
      });
    });

    const select = () => {
      clearSelection();
      clearPreview();
      if (f.isolate.length > 1) {
        openPickTargetModal(f);
      } else {
        loadFormula(f, f.isolate[0]);
      }
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
    dom.libraryList.appendChild(card);
  }
}

function openPickTargetModal(formulaEntry) {
  if (!dom.pickTargetBackdrop) {
    loadFormula(formulaEntry, formulaEntry.isolate[0]);
    return;
  }
  dom.pickTargetFormulaName.textContent = formulaEntry.name;
  try {
    dom.pickTargetFormulaPreview.innerHTML = renderEquation(parseFormulaCached(formulaEntry.formula), {});
  } catch {
    dom.pickTargetFormulaPreview.textContent = formulaEntry.formula;
  }
  dom.pickTargetButtons.innerHTML = '';
  formulaEntry.isolate.forEach((v) => {
    const btn = document.createElement('button');
    btn.className = 'pick-target-btn';
    btn.type = 'button';
    btn.innerHTML = `<span>${escapeHtml(prettyVar(v))}</span><small>ricava ${escapeHtml(prettyVar(v))}</small>`;
    btn.addEventListener('click', () => {
      dom.pickTargetBackdrop.hidden = true;
      loadFormula(formulaEntry, v);
    });
    dom.pickTargetButtons.appendChild(btn);
  });
  dom.pickTargetBackdrop.hidden = false;
}

function triviallyIsolated(formulaStr, v) {
  const parts = formulaStr.split('=');
  if (parts.length !== 2) return false;
  return parts[0].trim() === v;
}

function bindLibraryEvents() {
  if (dom.librarySearch) dom.librarySearch.addEventListener('input', renderLibrary);
  if (dom.libraryTopic) dom.libraryTopic.addEventListener('change', renderLibrary);
  if (dom.libraryDifficulty) dom.libraryDifficulty.addEventListener('change', renderLibrary);
  if (dom.btnRandom) {
    dom.btnRandom.addEventListener('click', () => {
      const { id, target } = randomExercise();
      loadFormula(getFormulaById(id), target);
    });
  }
}

// ---------------------------------------------------------------------------
// Caricamento di una formula
// ---------------------------------------------------------------------------
function loadFormula(formulaEntry, targetVar) {
  let eq;
  try {
    eq = parseEquation(formulaEntry.formula);
  } catch (e) {
    showMessage('Errore nel caricamento della formula: ' + e.message, 'error');
    return;
  }

  const vars = collectVars(eq);
  if (!vars.has(targetVar)) {
    const alt = [...vars].find((v) => v.toLowerCase() === targetVar.toLowerCase());
    if (alt) targetVar = alt;
    else { showMessage(`La grandezza "${targetVar}" non compare nella formula.`, 'error'); return; }
  }

  state.baseFormula = formulaEntry;
  state.startEq = clone(eq);
  state.currentEq = clone(eq);
  state.targetVar = targetVar;
  state.conditions = (formulaEntry.conditions || []).slice();
  state.history = [];
  state.historyIndex = -1;
  state.selectedId = null;
  state.pendingMove = null;
  state.goalReached = false;
  state.keypadOp = null;
  state.crossMode = false;
  state.crossPicked = [];
  if (dom.btnCross) {
    dom.btnCross.classList.remove('active');
    dom.btnCross.setAttribute('aria-pressed', 'false');
  }

  pushHistory({
    equation: clone(eq),
    ruleName: 'Formula di partenza',
    rulePrinciple: formulaEntry.formula,
    steps: [],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: formulaEntry.hypotheses || null,
    verified: true,
  }, true);

  updateObjective();
  renderEquationView();
  updateRulePanelInitial(formulaEntry);
  clearMessage();
  clearPreview();
  clearSelection();
}

// ---------------------------------------------------------------------------
// B. Area di lavoro
// ---------------------------------------------------------------------------
function renderEquationView() {
  if (!state.currentEq) {
    dom.equationDisplay.innerHTML = '<p class="placeholder">Nessuna equazione caricata.</p>';
    if (dom.latexLiveCode) dom.latexLiveCode.textContent = '';
    renderKeypad();
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
  renderConditions();
  renderKeypad();
}

// ---------------------------------------------------------------------------
// Tastierino: operazioni applicate a entrambi i membri
// ---------------------------------------------------------------------------
function renderKeypad() {
  if (!dom.keypadOps || !dom.keypadOperands) return;

  dom.keypadOps.innerHTML = '';
  for (const op of KEYPAD_OPERATIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-op' + (state.keypadOp === op.id ? ' active' : '');
    btn.dataset.op = op.id;
    btn.textContent = op.label;
    btn.title = op.title;
    btn.setAttribute('aria-label', op.title);
    btn.setAttribute('aria-pressed', state.keypadOp === op.id ? 'true' : 'false');
    btn.disabled = !state.currentEq;
    btn.addEventListener('click', () => handleKeypadOpClick(op));
    dom.keypadOps.appendChild(btn);
  }

  // Pulsante semplificazione incrociata (nel tastierino, non flottante)
  const crossKbdBtn = document.createElement('button');
  crossKbdBtn.type = 'button';
  crossKbdBtn.className = 'keypad-op keypad-cross-btn' + (state.crossMode ? ' active' : '');
  crossKbdBtn.textContent = '✕/';
  crossKbdBtn.title = 'Semplifica: fattori uguali num./den., termini opposti, o stessa grandezza su entrambi i membri';
  crossKbdBtn.setAttribute('aria-label', crossKbdBtn.title);
  crossKbdBtn.setAttribute('aria-pressed', state.crossMode ? 'true' : 'false');
  crossKbdBtn.disabled = !state.currentEq;
  crossKbdBtn.addEventListener('click', () => toggleCrossMode());
  dom.keypadOps.appendChild(crossKbdBtn);

  dom.keypadOperands.innerHTML = '';
  if (!state.currentEq) {
    dom.keypadOperands.innerHTML = '<p class="placeholder small">Carica una formula per usare il tastierino.</p>';
    updateKeypadHint();
    return;
  }

  const { letters, numbers } = equationKeypadTokens(state.currentEq);
  for (const name of letters) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-operand keypad-letter';
    btn.textContent = prettyVar(name);
    btn.title = `Usa ${name}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(name));
    dom.keypadOperands.appendChild(btn);
  }
  for (const value of numbers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-operand keypad-number';
    btn.textContent = String(value);
    btn.title = `Usa ${value}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(String(value)));
    dom.keypadOperands.appendChild(btn);
  }

  // Campo libero: serve a moltiplicare per un numero non presente nell'equazione.
  const custom = document.createElement('span');
  custom.className = 'keypad-custom';
  custom.innerHTML =
    '<input class="keypad-custom-value" type="text" inputmode="numeric" placeholder="n" aria-label="Altro numero o grandezza" size="3">' +
    '<button type="button" class="btn-mini keypad-custom-apply">usa</button>';
  dom.keypadOperands.appendChild(custom);
  const input = custom.querySelector('.keypad-custom-value');
  const applyBtn = custom.querySelector('.keypad-custom-apply');
  const submit = () => {
    const value = (input.value || '').trim();
    if (!value) return;
    handleKeypadOperandClick(value);
    input.value = '';
  };
  applyBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  updateKeypadHint();
}

function updateKeypadHint() {
  if (!dom.keypadHint) return;
  if (!state.currentEq) {
    dom.keypadHint.textContent = 'Carica una formula per usare il tastierino.';
    return;
  }
  if (!state.keypadOp) {
    dom.keypadHint.textContent = 'Scegli un\'operazione: verrà applicata a entrambi i membri.';
    return;
  }
  const op = KEYPAD_OPERATIONS.find((o) => o.id === state.keypadOp);
  dom.keypadHint.textContent = op && !op.needsOperand
    ? 'Premi di nuovo per applicare la radice quadrata a entrambi i membri.'
    : `Operazione ${op ? op.label : ''} scelta: ora tocca una grandezza o un numero.`;
}

function handleKeypadOpClick(op) {
  if (!state.currentEq) return;
  if (state.keypadOp === op.id) {
    // Secondo clic sulla stessa operazione senza operando: la annulla,
    // tranne per le operazioni che non richiedono un operando (radice).
    if (op.needsOperand) {
      state.keypadOp = null;
      renderKeypad();
      return;
    }
    applyKeypadMove(op.id, null, null);
    return;
  }
  state.keypadOp = op.id;
  renderKeypad();
  if (!op.needsOperand) applyKeypadMove(op.id, null, null);
}

function handleKeypadOperandClick(text) {
  if (!state.currentEq) return;
  if (!state.keypadOp) {
    showMessage('Prima scegli un\'operazione nel tastierino (+ − × ÷ ^ √), poi la grandezza o il numero.', 'info');
    return;
  }
  applyKeypadMove(state.keypadOp, parseOperand(text), text);
}

function applyKeypadMove(opId, operandNode, operandText) {
  const op = KEYPAD_OPERATIONS.find((o) => o.id === opId);
  const label = op ? op.label : opId;
  const before = state.currentEq;

  const res = applyKeypadOperation(before, opId, operandNode, operandText, state.targetVar);
  if (!res.ok) {
    state.keypadOp = null;
    renderKeypad();
    clearPreview();
    animateOperationBadge(label, operandText);
    showInvalidMove(res.error, res.hint, { label: `Applica ${label} a entrambi i membri` });
    return;
  }

  const newEq = res.equation;
  if (equivalentEq(newEq, before)) {
    state.keypadOp = null;
    renderKeypad();
    showMessage('Questa operazione non cambia l\'equazione: prova un\'altra trasformazione.', 'info');
    return;
  }

  state.currentEq = newEq;
  state.conditions = mergeConditions(state.conditions, res.conditions || []);
  state.selectedId = null;
  state.keypadOp = null;
  clearPreview();

  const ruleName = `Applica ${label}${operandText ? ' ' + prettyVar(operandText) : ''} a entrambi i membri`;
  pushHistory({
    equation: clone(newEq),
    ruleName,
    rulePrinciple: res.note || '',
    ruleId: 'keypad-' + opId,
    steps: res.steps || [],
    conditions: (res.conditions || []).slice(),
    explanationKey: null,
    note: res.note || null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(
    { name: ruleName, principle: res.steps && res.steps.length ? res.steps.join(' ') : '', explanation: null },
    { steps: res.steps || [], conditions: res.conditions || [], note: res.note || null },
    newEq
  );
  clearMessage();
  animateOperationBadge(label, operandText);
  showMessage(`✓ ${ruleName}.`, 'success');
  if (res.note) showMessage(res.note, 'info');

  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'guided') {
    showGuidedSuggestion();
  } else if (state.mode === 'multi') {
    showMultiMode();
  }
}

// Piccola animazione: l'equazione pulsa e un badge mostra l'operazione applicata.
function animateOperationBadge(label, operandText) {
  if (!dom.equationDisplay) return;
  const card = dom.equationDisplay.closest('.equation-display-card') || dom.equationDisplay;
  card.classList.remove('op-animating');
  // Forza il riavvio dell'animazione.
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

function enterClickDragMode(tokenEl) {
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
  showMessage(`"${prettyVar(varName)}" selezionato — clicca la destinazione (denominatore o membro opposto) per applicare il trasporto. Riclicca per annullare.`, 'info');
}

function exitClickDragMode() {
  state.clickDragToken = null;
  dom.equationDisplay.classList.remove('is-dragging-equation', 'is-click-drag-mode');
  dom.equationDisplay.querySelectorAll('.token-in-flight').forEach((el) => el.classList.remove('token-in-flight'));
  clearDropzonesHighlight(dom.equationDisplay);
  hideDragArrow();
}

function applyClickDragToDropzone(dz) {
  if (!state.clickDragToken) return;
  const drag = state.clickDragToken;
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
  }
  applyDragResult(result);
}

function attachEquationHandlers() {
  dom.equationDisplay.querySelectorAll('.math-node').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
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

      selectElement(el.dataset.id);
    });
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Elemento: ' + (el.textContent || '').trim());
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state.crossMode) crossPickToken(el.dataset.id, el);
        else selectElement(el.dataset.id);
      }
    });
  });
}

function attachDropzoneClickHandlers() {
  dom.equationDisplay.querySelectorAll('.dropzone').forEach((dz) => {
    dz.addEventListener('click', (e) => {
      if (!state.clickDragToken) return;
      if (dz.dataset.side === state.clickDragToken.fromSide) return;
      e.stopPropagation();
      applyClickDragToDropzone(dz);
    });

    // Freccia dinamica durante click-drag: aggiorna a seconda di dove si vola
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
// Croce di semplificazione (due fattori uguali, numeratore e denominatore)
// ---------------------------------------------------------------------------
function toggleCrossMode(force) {
  state.crossMode = typeof force === 'boolean' ? force : !state.crossMode;
  state.crossPicked = [];
  if (dom.btnCross) {
    dom.btnCross.classList.toggle('active', state.crossMode);
    dom.btnCross.setAttribute('aria-pressed', state.crossMode ? 'true' : 'false');
  }
  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (card) card.classList.toggle('cross-mode', state.crossMode);
  clearCrossMarks();
  if (state.crossMode) {
    showMessage('✕/ Semplificazione attiva — clicca due elementi da eliminare (fattori num./den., termini opposti o stessa grandezza su entrambi i membri), poi premi Conferma.', 'info');
  }
}

function clearCrossMarks() {
  dom.equationDisplay.querySelectorAll('.cross-marked').forEach((el) => el.classList.remove('cross-marked'));
}

function crossPickToken(id, element) {
  if (!state.currentEq || !id) return;
  const already = state.crossPicked.indexOf(id);
  if (already >= 0) {
    state.crossPicked.splice(already, 1);
    if (element) element.classList.remove('cross-marked');
    if (state.crossPicked.length === 0) clearPreview();
    return;
  }
  state.crossPicked.push(id);
  if (element) element.classList.add('cross-marked');
  if (state.crossPicked.length < 2) {
    showMessage('Primo elemento selezionato — ora scegli il secondo da semplificare.', 'info');
    return;
  }
  // Due elementi selezionati: verifica e mostra anteprima
  const [idA, idB] = state.crossPicked;
  const res = crossCancel(state.currentEq, idA, idB);
  if (!res.ok) {
    state.crossPicked = [];
    clearCrossMarks();
    flashCrossError();
    showInvalidMove(res.error, res.hint, { label: 'Semplificazione' });
    return;
  }
  // Mostra anteprima e attendi conferma (Invio o tasto Conferma)
  state.pendingMove = { kind: 'cross', idA, idB, result: res };
  dom.previewBox.hidden = false;
  dom.previewText.innerHTML =
    `Semplifica <strong>"${escapeHtml(res.cancelled)}"</strong> → ` +
    `<span class="preview-eq">${escapeHtml(toPretty(res.newEq, 0))}</span>`;
  dom.btnConfirm.focus();
  showMessage(`"${res.cancelled}" pronto per la semplificazione — premi Conferma o Invio.`, 'info');
}

function dissolveThenApplyCross(idA, idB, res) {
  clearCrossMarks();
  clearPreview();

  // Anima in dissolvi gli elementi selezionati
  const elA = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idA)}"]`);
  const elB = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idB)}"]`);
  [elA, elB].forEach((el) => {
    if (el) el.classList.add('cross-dissolving');
  });

  setTimeout(() => {
    state.currentEq = res.newEq;
    state.conditions = mergeConditions(state.conditions, res.conditions || []);
    state.selectedId = null;
    state.crossPicked = [];

    pushHistory({
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

    updateObjective();
    renderEquationView();
    showRulePanel(
      { name: res.ruleName, principle: res.rulePrinciple, explanation: null },
      { steps: [`Elimino ${res.cancelled}.`], conditions: res.conditions || [] },
      res.newEq
    );
    clearMessage();
    showMessage(`✓ ${res.ruleName}.`, 'success');
    toggleCrossMode(false);

    if (state.goalReached) {
      playSuccessChime();
      showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
    } else if (state.mode === 'guided') {
      showGuidedSuggestion();
    } else if (state.mode === 'multi') {
      showMultiMode();
    }
  }, 460);
}

function applyCrossCancel(idA, idB) {
  const res = crossCancel(state.currentEq, idA, idB);
  if (!res.ok) {
    clearCrossMarks();
    flashCrossError();
    showInvalidMove(res.error, res.hint, { label: 'Semplificazione' });
    toggleCrossMode(false);
    return;
  }
  dissolveThenApplyCross(idA, idB, res);
}

function flashCrossError() {
  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (!card) return;
  card.classList.remove('cross-error');
  void card.offsetWidth;
  card.classList.add('cross-error');
  setTimeout(() => card.classList.remove('cross-error'), 500);
}

// Copia i due elementi in un livello sovrapposto e li fa dissolvere.
function dissolveElements(ids) {
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

// Trascinamento della croce con il puntatore (mouse, penna o dito).
function bindCrossDrag() {
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
    // Riporta la croce nella sua posizione di riposo.
    handle.style.left = '';
    handle.style.top = '';
  };

  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', () => {
    dragging = false;
    handle.classList.remove('dragging');
    highlight(null);
    handle.style.left = '';
    handle.style.top = '';
  });

  // Accessibilità da tastiera: Invio/Spazio attiva la modalità e i fattori
  // si scelgono con Tab + Invio (gestito in attachEquationHandlers).
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showMessage('Usa Tab per raggiungere un fattore e Invio per sceglierlo.', 'info');
    }
  });
}

// Callback per il drag and drop: valuta e applica immediatamente al rilascio (senza tasto di conferma)
function applyDragResult(result) {
  if (!result) return;

  // Se la mossa non è valida: mostra subito l'errore spiegandone il motivo matematico
  if (!result.ok) {
    clearPreview();
    // Anima il flash di errore sull'equazione
    const card = dom.equationDisplay.closest('.equation-display-card') || dom.equationDisplay;
    card.classList.remove('cross-error');
    void card.offsetWidth;
    card.classList.add('cross-error');
    setTimeout(() => card.classList.remove('cross-error'), 500);
    showInvalidMove(result.error, 'Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.', { label: result.ruleName || 'Trasporto' });
    return;
  }

  // Mossa valida: applica immediatamente l'equazione trasformata
  clearPreview();
  state.currentEq = result.newEq;
  state.conditions = mergeConditions(state.conditions, result.conditions || []);
  state.selectedId = null;

  const pseudoRule = {
    name: result.ruleName,
    principle: result.rulePrinciple,
    explanation: null,
  };
  const pseudoResult = {
    equation: result.newEq,
    rule: pseudoRule,
    steps: result.steps || [],
    conditions: result.conditions || [],
  };

  pushHistory({
    equation: clone(result.newEq),
    ruleName: result.ruleName,
    rulePrinciple: result.rulePrinciple,
    ruleId: null,
    steps: result.steps || [],
    conditions: (result.conditions || []).slice(),
    explanationKey: null,
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(pseudoRule, pseudoResult, result.newEq);
  clearMessage();
  showMessage(`✓ ${result.ruleName}!`, 'success');

  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
  } else if (state.mode === 'guided') {
    showGuidedSuggestion();
  } else if (state.mode === 'multi') {
    showMultiMode();
  }
}

// ---------------------------------------------------------------------------
// Regola dei reciproci (inversione di entrambi i membri)
// ---------------------------------------------------------------------------
// La matematica dell'operazione è in reciprocals.js, testabile da Node.
function applyReciprocalRule() {
  if (!state.currentEq) return;
  const eq = state.currentEq;
  const res = reciprocalEquation(eq);

  if (!res.ok) {
    clearPreview();
    renderEquationView();
    showInvalidMove(res.error, res.hint, { label: 'Regola dei reciproci' });
    return;
  }

  const newEq = res.newEq;
  if (equivalentEq(newEq, eq)) {
    showMessage('Questa operazione non cambia l\'equazione: prova un\'altra trasformazione.', 'info');
    return;
  }

  state.currentEq = newEq;
  state.selectedId = null;
  clearPreview();

  const rule = {
    id: 'reciprocal',
    name: 'Regola dei reciproci (inversione dei membri)',
    principle: 'Proprietà dell\'inversione: se A = B allora 1/A = 1/B; in una proporzione A/B = C/D si ottiene B/A = D/C.',
    explanation: null,
  };
  pushHistory({
    equation: clone(newEq),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'reciprocal',
    steps: [`Calcolo il reciproco di entrambi i membri: ${toPretty(eq, 0)} → ${toPretty(newEq, 0)}.`],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
  clearMessage();
  showMessage('🔁 Regola dei reciproci applicata a entrambi i membri!', 'success');
  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'guided') {
    showGuidedSuggestion();
  } else if (state.mode === 'multi') {
    showMultiMode();
  }
}

function renderConditions() {
  if (!state.conditions || state.conditions.length === 0) {
    dom.conditionsBox.hidden = true;
    return;
  }
  dom.conditionsBox.hidden = false;
  dom.conditionsList.innerHTML = state.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Selezione + azioni
// ---------------------------------------------------------------------------
function selectElement(id) {
  if (!state.currentEq) return;
  state.selectedId = id;
  clearPreview();
  renderEquationView();
  const element = findElement(state.currentEq, id);
  if (!element) {
    dom.actionHint.textContent = 'Elemento non trovato.';
    dom.actionButtons.innerHTML = '';
    return;
  }
  const actions = availableActions(state.currentEq, element, state.targetVar);
  renderActions(element, actions);
}

function renderActions(element, specificActions) {
  dom.actionButtons.innerHTML = '';
  const el = findElement(state.currentEq, state.selectedId);
  dom.actionHint.textContent = `Selezionato: "${el ? el.pretty : ''}" (${roleLabel(el ? el.role : '')}). Operazioni disponibili:`;

  const all = [...specificActions];
  for (const g of globalActions(state.currentEq, state.targetVar)) {
    if (!all.find((a) => a.id === g.id)) all.push(g);
  }
  addValueOps(all, element);

  if (all.length === 0) {
    dom.actionButtons.innerHTML = '<p class="placeholder small">Nessuna operazione diretta su questo elemento. Prova a selezionare un fattore, un termine o un denominatore.</p>';
    return;
  }

  for (const action of all) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.type = 'button';
    btn.innerHTML = `<span class="action-label">${escapeHtml(action.label)}</span>
      <span class="action-desc">${escapeHtml(action.description || '')}</span>`;
    btn.addEventListener('click', () => previewAction(action));
    dom.actionButtons.appendChild(btn);
  }
}

function addValueOps(actions, element) {
  const node = unwrap(element.node);
  const text = toPretty(node, 0);
  if (node.type === 'Var' || node.type === 'Div' || node.type === 'Mul') {
    actions.push({
      id: 'mul-both', label: `Moltiplica entrambi i membri per "${text}"`,
      description: 'Secondo principio di equivalenza.', ruleKey: 'mulBoth',
      build: () => ({ value: node, valueText: text }),
    });
    actions.push({
      id: 'div-both', label: `Dividi entrambi i membri per "${text}" (richiede ≠ 0)`,
      description: 'Secondo principio di equivalenza; serve la condizione ≠ 0.', ruleKey: 'divBoth',
      build: () => ({ value: node, valueText: text }),
    });
  }
}

function roleLabel(role) {
  const map = {
    membro: 'intero membro', termine: 'termine additivo', fattore: 'fattore moltiplicativo',
    numeratore: 'numeratore', denominatore: 'denominatore', base: 'base della potenza',
    esponente: 'esponente', radicando: 'radicando (sotto radice)', argomento: 'argomento',
    gruppo: 'espressione tra parentesi',
  };
  return map[role] || role;
}

// ---------------------------------------------------------------------------
// Anteprima / applicazione
// ---------------------------------------------------------------------------
function previewAction(action) {
  const res = performAction(state.currentEq, action);
  if (!res.ok) { showInvalidMove(res.error, res.hint, action); return; }
  if (equivalentEq(res.equation, state.currentEq)) {
    showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", 'info');
    return;
  }
  state.pendingMove = { action, result: res };
  showPreview(action, res);
}

function showPreview(action, res) {
  dom.previewBox.hidden = false;
  dom.previewText.innerHTML =
    `Anteprima: <span class="preview-eq">${escapeHtml(toPretty(res.equation, 0))}</span> — regola: <em>${escapeHtml(action.label)}</em>`;
  dom.btnConfirm.focus();
}

function clearPreview() {
  state.pendingMove = null;
  dom.previewBox.hidden = true;
  dom.previewText.innerHTML = '';
}

function confirmMove() {
  if (!state.pendingMove) return;

  // CASO 0: Conferma semplificazione con croce
  if (state.pendingMove.kind === 'cross') {
    const { idA, idB, result } = state.pendingMove;
    state.pendingMove = null;
    dissolveThenApplyCross(idA, idB, result);
    return;
  }

  // CASO 1: Drag and drop
  if (state.pendingMove.kind === 'drag') {
    const res = state.pendingMove.result;
    if (!res.ok) {
      clearPreview();
      showInvalidMove(res.error, 'Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.', { label: res.ruleName || 'Trasporto' });
      return;
    }
    state.currentEq = res.newEq;
    state.conditions = mergeConditions(state.conditions, res.conditions || []);
    state.selectedId = null;
    const pseudoRule = {
      name: res.ruleName,
      principle: res.rulePrinciple,
      explanation: null,
    };
    const pseudoResult = {
      equation: res.newEq,
      rule: pseudoRule,
      steps: res.steps || [],
      conditions: res.conditions || [],
    };
    pushHistory({
      equation: clone(res.newEq),
      ruleName: res.ruleName,
      rulePrinciple: res.rulePrinciple,
      ruleId: null,
      steps: res.steps || [],
      conditions: (res.conditions || []).slice(),
      explanationKey: null,
      note: null,
      verified: true,
    }, false);
    clearPreview();
    updateObjective();
    renderEquationView();
    showRulePanel(pseudoRule, pseudoResult, res.newEq);
    clearMessage();
    if (state.goalReached) {
      playSuccessChime();
      showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
    }
    return;
  }

  // CASO 2: Azione da barra comandi
  const { action, result } = state.pendingMove;

  state.currentEq = result.equation;
  state.conditions = mergeConditions(state.conditions, result.conditions || []);
  state.selectedId = null;

  const rule = result.rule;
  pushHistory({
    equation: clone(result.equation),
    ruleName: rule ? rule.name : action.label,
    rulePrinciple: rule ? rule.principle : '',
    ruleId: rule ? rule.id : action.id,
    steps: result.steps || [],
    conditions: (result.conditions || []).slice(),
    explanationKey: rule ? rule.explanation : null,
    note: result.note || null,
    verified: true,
  }, false);

  clearPreview();
  updateObjective();
  renderEquationView();
  showRulePanel(rule, result, state.currentEq);
  clearMessage();
  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
  } else if (state.mode === 'guided') {
    showGuidedSuggestion();
  } else if (state.mode === 'multi') {
    showMultiMode();
  }
}

function cancelPreview() {
  clearPreview();
  clearCrossMarks();
  state.crossPicked = [];
  renderEquationView();
}

function flashTokenRejected(varName, side) {
  if (!varName || !dom.equationDisplay) return;
  const el = dom.equationDisplay.querySelector(`[data-var-name="${CSS.escape(varName)}"][data-side="${side}"]`);
  if (!el) return;
  el.classList.remove('token-rejected');
  void el.offsetWidth;
  el.classList.add('token-rejected');
  setTimeout(() => el.classList.remove('token-rejected'), 600);
}

function showInvalidMove(error, hint, action) {
  const parts = [];
  parts.push('Mossa non valida: ' + error);
  if (hint) parts.push('Suggerimento: ' + hint);
  if (action) parts.push('Regola tentata: ' + action.label);
  showMessage(parts.join(' '), 'error');
  pushHistory({
    equation: clone(state.currentEq),
    ruleName: 'Tentativo non valido',
    rulePrinciple: '',
    steps: [action ? action.label : ''],
    conditions: [],
    explanationKey: null,
    note: error,
    verified: false,
  }, false, true);
}

// ---------------------------------------------------------------------------
// C. Pannello regole
// ---------------------------------------------------------------------------
function showRulePanel(rule, result, afterEq) {
  const ex = rule ? getExplanation(rule.explanation) : null;
  let html = `<div class="rule-name">${escapeHtml(rule ? rule.name : 'Trasformazione')}</div>`;

  if (ex) {
    html += `<div class="rule-section"><strong>Spiegazione intuitiva</strong><p>${escapeHtml(ex.intuitiva)}</p></div>`;
    html += `<div class="rule-section"><strong>Principio di equivalenza</strong><p>${escapeHtml(ex.principio)}</p></div>`;
    html += `<div class="rule-section"><strong>Perché è corretta</strong><p>${escapeHtml(ex.perche)}</p></div>`;
  } else if (rule && rule.principle) {
    html += `<div class="rule-section"><strong>Principio</strong><p>${escapeHtml(rule.principle)}</p></div>`;
  }

  if (result.steps && result.steps.length) {
    html += `<div class="rule-section"><strong>Operazione svolta</strong><ul class="steps-list">${result.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
  }

  html += `<div class="rule-section rule-eq"><strong>Equazione dopo</strong><div class="rule-math">${renderEquation(afterEq, {})}</div></div>`;

  if (result.conditions && result.conditions.length) {
    html += `<div class="rule-section conditions"><strong>Condizioni di validità richieste</strong><ul>${result.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
  }
  if (ex && ex.attenzione && ex.attenzione.length) {
    html += `<div class="rule-section warning"><strong>Attenzione</strong><ul>${ex.attenzione.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
  }
  if (result.note) {
    html += `<div class="rule-section warning"><p>${escapeHtml(result.note)}</p></div>`;
  }
  dom.rulePanel.innerHTML = html;
}

function updateRulePanelInitial(formulaEntry) {
  dom.rulePanel.innerHTML = `
    <div class="rule-name">Formula di partenza</div>
    <div class="rule-section"><strong>${escapeHtml(formulaEntry.name)}</strong>
      <div class="rule-math">${renderEquation(state.startEq, {})}</div></div>
    ${formulaEntry.notes ? `<div class="rule-section"><p>${escapeHtml(formulaEntry.notes)}</p></div>` : ''}
    ${formulaEntry.hypotheses ? `<div class="rule-section"><strong>Ipotesi</strong><p>${escapeHtml(formulaEntry.hypotheses)}</p></div>` : ''}
    <div class="rule-section"><p>Seleziona un elemento nell'area di lavoro per iniziare a ricavare la formula inversa.</p></div>
  `;
}

// ---------------------------------------------------------------------------
// E. Obiettivo
// ---------------------------------------------------------------------------
function updateObjective() {
  const f = state.baseFormula;
  const t = prettyVar(state.targetVar);
  dom.objectiveText.textContent = f ? `ricavare ${t} — ${f.name} (${f.formula})` : `ricavare ${t}`;
  state.goalReached = isGoalReached(state.currentEq, state.targetVar);
  dom.objectiveStatus.hidden = false;
  dom.objectiveStatus.textContent = state.goalReached ? '✓ Raggiunto' : '● In corso';
  dom.objectiveStatus.className = 'status-badge ' + (state.goalReached ? 'status-success' : 'status-progress');
  dom.objectiveBox.classList.toggle('objective-done', state.goalReached);

  // Popola i chips per cambiare obiettivo in qualsiasi momento
  if (dom.objectiveTargetPicker && f && f.isolate) {
    dom.objectiveTargetPicker.hidden = false;
    dom.targetChips.innerHTML = '';
    f.isolate.forEach((v) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'target-chip' + (v === state.targetVar ? ' active' : '');
      chip.textContent = prettyVar(v);
      chip.title = `Imposta come obiettivo: isola ${prettyVar(v)}`;
      chip.addEventListener('click', () => setTargetVar(v));
      dom.targetChips.appendChild(chip);
    });
  } else if (dom.objectiveTargetPicker) {
    dom.objectiveTargetPicker.hidden = true;
  }
}

function setTargetVar(v) {
  state.targetVar = v;
  updateObjective();
  renderEquationView();
  clearMessage();
  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(v)} è già isolata!`, 'success');
  } else {
    showMessage(`🎯 Nuovo obiettivo impostato: isolare ${prettyVar(v)}.`, 'info');
  }
}

// ---------------------------------------------------------------------------
// D. Cronologia
// ---------------------------------------------------------------------------
function pushHistory(entry, isInitial = false, isFailed = false) {
  if (!isInitial && state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }
  entry.timestamp = Date.now();
  entry.failed = !!isFailed;
  state.history.push(entry);
  state.historyIndex = state.history.length - 1;
  renderHistory();
  updateHistoryButtons();
}

function renderHistory() {
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

function goToHistory(i) {
  if (i < 0 || i >= state.history.length) return;
  if (state.history[i].failed) {
    showMessage("Questo è un tentativo non valido: l'equazione non è cambiata.", 'info');
    return;
  }
  state.historyIndex = i;
  state.currentEq = clone(state.history[i].equation);
  state.conditions = collectConditionsUpTo(i);
  state.selectedId = null;
  clearPreview();
  updateObjective();
  renderEquationView();
  renderHistory();
  updateHistoryButtons();
  if (i > 0) {
    const h = state.history[i];
    const rule = h.ruleId ? Object.values(RULES).find((r) => r.id === h.ruleId) : null;
    showRulePanel(rule || { name: h.ruleName, principle: h.rulePrinciple }, { steps: h.steps, conditions: h.conditions, note: h.note }, state.currentEq);
  } else {
    updateRulePanelInitial(state.baseFormula);
  }
}

function collectConditionsUpTo(i) {
  const set = new Set(state.baseFormula && state.baseFormula.conditions ? state.baseFormula.conditions : []);
  for (let k = 0; k <= i; k++) {
    if (state.history[k].failed) continue;
    for (const c of (state.history[k].conditions || [])) set.add(c);
  }
  return Array.from(set);
}

function bindHistoryEvents() {
  dom.btnUndo.addEventListener('click', undo);
  dom.btnRedo.addEventListener('click', redo);
  dom.btnReset.addEventListener('click', resetExercise);
  if (dom.btnCopySteps) dom.btnCopySteps.addEventListener('click', copyStepsText);
  if (dom.btnCopyStepsLatex) dom.btnCopyStepsLatex.addEventListener('click', copyStepsLatex);
}

function undo() {
  let i = state.historyIndex - 1;
  while (i >= 0 && state.history[i].failed) i--;
  if (i < 0) { showMessage('Non ci sono trasformazioni da annullare.', 'info'); return; }
  goToHistory(i);
}

function redo() {
  let i = state.historyIndex + 1;
  while (i < state.history.length && state.history[i].failed) i++;
  if (i >= state.history.length) { showMessage('Non ci sono trasformazioni da ripristinare.', 'info'); return; }
  goToHistory(i);
}

function resetExercise() {
  if (!state.startEq) return;
  state.history = [];
  state.historyIndex = -1;
  state.currentEq = clone(state.startEq);
  state.conditions = (state.baseFormula.conditions || []).slice();
  state.selectedId = null;
  clearPreview();
  pushHistory({
    equation: clone(state.startEq),
    ruleName: 'Formula di partenza',
    rulePrinciple: state.baseFormula.formula,
    steps: [],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: state.baseFormula.hypotheses || null,
    verified: true,
  }, true);
  updateObjective();
  renderEquationView();
  updateRulePanelInitial(state.baseFormula);
  clearMessage();
  showMessage("Esercizio ricominciato dall'inizio.", 'info');
}

function updateHistoryButtons() {
  let prev = state.historyIndex - 1;
  while (prev >= 0 && state.history[prev].failed) prev--;
  let next = state.historyIndex + 1;
  while (next < state.history.length && state.history[next].failed) next++;
  dom.btnUndo.disabled = prev < 0;
  dom.btnRedo.disabled = next >= state.history.length;
}

// ---------------------------------------------------------------------------
// Messaggi e selezione
// ---------------------------------------------------------------------------
function showMessage(text, kind) {
  dom.messageBox.hidden = false;
  dom.messageBox.textContent = text;
  dom.messageBox.className = 'message-box message-' + (kind || 'info');
}
function clearMessage() {
  dom.messageBox.hidden = true;
  dom.messageBox.textContent = '';
  dom.messageBox.className = 'message-box';
}

function clearSelection() {
  state.selectedId = null;
  if (dom.actionButtons && state.mode === 'free') dom.actionButtons.innerHTML = '';
  if (dom.actionHint && state.mode === 'free') {
    dom.actionHint.textContent = "Seleziona un elemento dell'equazione per vedere le operazioni disponibili.";
  }
}

function bindWorkAreaEvents() {
  dom.equationDisplay.addEventListener('click', (e) => {
    if (e.target === dom.equationDisplay) clearSelection();
  });
  dom.btnConfirm.addEventListener('click', confirmMove);
  dom.btnCancel.addEventListener('click', cancelPreview);
  if (dom.btnMirror) dom.btnMirror.addEventListener('click', applyMirrorRule);
  if (dom.btnReciprocal) dom.btnReciprocal.addEventListener('click', applyReciprocalRule);
  if (dom.btnCopyFormula) dom.btnCopyFormula.addEventListener('click', copyFormulaText);
  if (dom.btnCross) dom.btnCross.addEventListener('click', () => toggleCrossMode());
  bindCrossDrag();
  if (dom.btnCopyLatex) dom.btnCopyLatex.addEventListener('click', copyLatexFormula);
  if (dom.btnCopyLatexInline) dom.btnCopyLatexInline.addEventListener('click', copyLatexFormula);
  if (dom.btnQuickHint) dom.btnQuickHint.addEventListener('click', triggerQuickHint);
  if (dom.btnToggleImplicitDen) {
    dom.btnToggleImplicitDen.addEventListener('click', () => {
      state.showImplicitDen = !state.showImplicitDen;
      dom.btnToggleImplicitDen.classList.toggle('active', state.showImplicitDen);
      dom.btnToggleImplicitDen.title = state.showImplicitDen
        ? 'Nascondi denominatori sottintesi'
        : 'Mostra denominatori sottintesi (/1)';
      renderEquationView();
    });
  }
}

function applyMirrorRule() {
  if (!state.currentEq) return;
  const newEq = Eq(clone(state.currentEq.right), clone(state.currentEq.left));
  state.currentEq = newEq;
  state.selectedId = null;
  clearPreview();
  const rule = {
    id: 'swapSides',
    name: 'Regola dello specchio (scambio membri)',
    principle: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
    explanation: 'scambioMembri',
  };
  pushHistory({
    equation: clone(newEq),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'swapSides',
    steps: ['Scambio i due membri dell\'equazione (proprietà simmetrica: A = B ↔ B = A).'],
    conditions: state.conditions.slice(),
    explanationKey: 'scambioMembri',
    note: null,
    verified: true,
  }, false);
  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: ['Scambio i due membri per la proprietà simmetrica.'], conditions: [] }, newEq);
  showMessage('🪞 Regola dello specchio applicata: se A = B allora B = A!', 'success');
  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  }
}

// ---------------------------------------------------------------------------
// Modalità
// ---------------------------------------------------------------------------
function bindModeEvents() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.mode = btn.dataset.mode;
      const modeDesc = {
        free: '🔓 Modalità Libera: clicca un elemento dell\'equazione per vedere le operazioni disponibili, oppure trascina variabili e fattori.',
        guided: '💡 Modalità Guidata: il sistema ti suggerisce ogni passaggio. Segui i consigli o esplora tu stesso.',
        multi: '⚡ Modalità Multi-operazione: vedi il piano completo di risoluzione e scegli se eseguire un passo alla volta o tutto in automatico.',
      };
      showMessage(modeDesc[state.mode] || '', 'info');
      if (state.mode === 'guided') showGuidedSuggestion();
      else if (state.mode === 'multi') showMultiMode();
      else { renderEquationView(); clearSelection(); }
    });
  });
}

function showGuidedSuggestion() {
  if (!state.currentEq) return;
  if (state.goalReached) { showMessage('Obiettivo raggiunto! Non ci sono altri passi necessari.', 'success'); return; }
  const sug = suggestNextStep(state.currentEq, state.targetVar);
  if (!sug.found) { showMessage(sug.message, 'info'); return; }

  dom.actionHint.textContent = 'Modalità guidata — passo consigliato:';
  dom.actionButtons.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'action-btn guided';
  btn.type = 'button';
  btn.innerHTML = `<span class="action-label">${escapeHtml(sug.action.label)}</span>
    <span class="action-desc">${escapeHtml(sug.reason)}</span>`;
  btn.addEventListener('click', () => previewAction(sug.action));
  dom.actionButtons.appendChild(btn);
  showMessage('Suggerimento: ' + sug.reason, 'info');
}

// ---------------------------------------------------------------------------
// Modalità Multi-operazione (Risoluzione guidata passo-passo)
// ---------------------------------------------------------------------------
function showMultiMode() {
  if (!state.currentEq) return;
  if (state.goalReached) {
    showMessage('Obiettivo già raggiunto! La grandezza ' + prettyVar(state.targetVar) + ' è isolata.', 'success');
    if (dom.actionButtons) dom.actionButtons.innerHTML = '';
    return;
  }

  const roadmap = computeRoadmap(state.currentEq, state.targetVar);
  dom.actionHint.textContent = `Modalità Multi-operazione (${roadmap.length} passaggi stimati per isolare ${prettyVar(state.targetVar)}):`;
  dom.actionButtons.innerHTML = '';

  if (roadmap.length === 0) {
    dom.actionButtons.innerHTML = '<p class="placeholder small">Nessuna sequenza automatica diretta trovata per questa formula. Prova a selezionare un elemento in modalità Libera.</p>';
    return;
  }

  const topControls = document.createElement('div');
  topControls.className = 'multi-controls';

  const btnNext = document.createElement('button');
  btnNext.className = 'action-btn guided';
  btnNext.type = 'button';
  btnNext.innerHTML = `<span class="action-label">▶ Esegui prossimo passo: ${escapeHtml(roadmap[0].action.label)}</span>
    <span class="action-desc">${escapeHtml(roadmap[0].reason)}</span>`;
  btnNext.addEventListener('click', () => {
    previewAction(roadmap[0].action);
  });
  topControls.appendChild(btnNext);

  const btnAuto = document.createElement('button');
  btnAuto.className = 'action-btn auto-solve';
  btnAuto.type = 'button';
  btnAuto.innerHTML = `<span class="action-label">⚡ Risolvi tutto automaticamente</span>
    <span class="action-desc">Applica tutti i passaggi matematici in sequenza animata.</span>`;
  btnAuto.addEventListener('click', () => autoSolveRoadmap());
  topControls.appendChild(btnAuto);

  dom.actionButtons.appendChild(topControls);

  const roadmapCard = document.createElement('div');
  roadmapCard.className = 'roadmap-card';
  roadmapCard.innerHTML = `
    <div class="roadmap-header">Piano di risoluzione simbolica:</div>
    <ol class="roadmap-list">
      ${roadmap.map((s, idx) => `
        <li class="roadmap-item ${idx === 0 ? 'roadmap-current' : ''}">
          <span class="roadmap-step-num">${idx + 1}</span>
          <div class="roadmap-step-content">
            <strong>${escapeHtml(s.action.label)}</strong>
            <p>${escapeHtml(s.reason)}</p>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
  dom.actionButtons.appendChild(roadmapCard);
}

function computeRoadmap(startEquation, target) {
  let curr = clone(startEquation);
  const steps = [];
  let iter = 0;
  while (iter < 12 && !isGoalReached(curr, target)) {
    const sug = suggestNextStep(curr, target);
    if (!sug.found) break;
    steps.push(sug);
    const res = performAction(curr, sug.action);
    if (!res.ok) break;
    curr = res.equation;
    iter++;
  }
  return steps;
}

let autoSolveTimer = null;
function autoSolveRoadmap() {
  if (state.goalReached) return;
  const sug = suggestNextStep(state.currentEq, state.targetVar);
  if (!sug.found) {
    showMessage('Risoluzione completata o nessun ulteriore passaggio diretto.', 'info');
    return;
  }
  const res = performAction(state.currentEq, sug.action);
  if (!res.ok) {
    showMessage('Errore nel passaggio: ' + res.error, 'error');
    return;
  }
  state.pendingMove = { action: sug.action, result: res };
  confirmMove();

  if (!state.goalReached && state.mode === 'multi') {
    if (autoSolveTimer) clearTimeout(autoSolveTimer);
    autoSolveTimer = setTimeout(autoSolveRoadmap, 500);
  }
}

function triggerQuickHint() {
  if (!state.currentEq) return;
  if (state.goalReached) {
    showMessage('Obiettivo già raggiunto! La grandezza ' + prettyVar(state.targetVar) + ' è già isolata.', 'success');
    return;
  }
  const sug = suggestNextStep(state.currentEq, state.targetVar);
  if (!sug.found) {
    showMessage(sug.message || 'Nessun suggerimento disponibile per questo stato.', 'info');
    return;
  }
  previewAction(sug.action);
  showMessage('💡 Passo consigliato: ' + sug.reason, 'info');
}

// ---------------------------------------------------------------------------
// Editor formule personalizzate
// ---------------------------------------------------------------------------
function bindEditorEvents() {
  dom.btnLoadCustom.addEventListener('click', loadCustomFormula);
  dom.customFormula.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCustomFormula(); });
}

function loadCustomFormula() {
  const text = dom.customFormula.value.trim();
  const target = dom.customTarget.value.trim();
  dom.customError.hidden = true;

  if (!text) { showCustomError('Inserisci una formula.'); return; }
  let eq;
  try {
    eq = parseEquation(text);
  } catch (e) {
    showCustomError('Errore di sintassi: ' + e.message);
    return;
  }

  const vars = collectVars(eq);
  let t = target;
  if (!t) {
    const L = unwrap(eq.left);
    if (L.type === 'Var') t = L.name;
    else { showCustomError('Specifica la grandezza da isolare.'); return; }
  }
  if (!vars.has(t)) {
    const alt = [...vars].find((v) => v.toLowerCase() === t.toLowerCase());
    if (alt) t = alt;
    else { showCustomError(`La grandezza "${t}" non compare nella formula. Grandezze presenti: ${[...vars].join(', ')}.`); return; }
  }

  loadFormula({
    id: 'custom-' + Date.now(),
    topic: 'formula personalizzata',
    name: 'formula personalizzata',
    formula: text,
    isolate: [...vars],
    conditions: [],
    difficulty: 3,
    notes: 'Formula inserita manualmente.',
  }, t);
  showMessage(`Formula personalizzata caricata. Obiettivo: isolare ${prettyVar(t)}.`, 'success');
}

function showCustomError(msg) {
  dom.customError.hidden = false;
  dom.customError.textContent = msg;
}

function bindGlobalEvents() {
  dom.btnHelp.addEventListener('click', showHelp);
  dom.btnContrast.addEventListener('click', toggleContrast);
  if (dom.btnTheme) dom.btnTheme.addEventListener('click', toggleTheme);
  dom.btnRunTests.addEventListener('click', runTests);

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { document.getElementById(btn.dataset.close).hidden = true; });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!dom.testsBackdrop.hidden) { dom.testsBackdrop.hidden = true; return; }
      if (!dom.modalBackdrop.hidden) { dom.modalBackdrop.hidden = true; return; }
      if (state.pendingMove) cancelPreview();
      else if (state.clickDragToken) exitClickDragMode();
      else clearSelection();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
  });
}

function toggleContrast() {
  const on = document.body.classList.toggle('high-contrast');
  dom.btnContrast.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  try { localStorage.setItem('formuleInverse.theme', isDark ? 'dark' : 'light'); } catch (e) {}
  if (dom.btnTheme) {
    dom.btnTheme.textContent = isDark ? '☀️ Modalità chiara' : '🌙 Modalità scura';
  }
}

function initTheme() {
  try {
    const saved = localStorage.getItem('formuleInverse.theme');
    if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-theme');
      if (dom.btnTheme) dom.btnTheme.textContent = '☀️ Modalità chiara';
    }
  } catch (e) {}
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
    });
  } catch (e) {}
}

function copyFormulaText() {
  if (!state.currentEq) return;
  const pretty = toPretty(state.currentEq, 0);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pretty).then(() => {
      showMessage(`Formula copiata negli appunti: "${pretty}"`, 'success');
    }).catch(() => {
      prompt('Copia la formula:', pretty);
    });
  } else {
    prompt('Copia la formula:', pretty);
  }
}

function copyStepsText() {
  if (state.history.length === 0) return;
  const lines = state.history
    .filter((h) => !h.failed)
    .map((h, i) => `${i === 0 ? 'Partenza' : 'Passo ' + i}: ${toPretty(h.equation, 0)} (${h.ruleName})`);
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showMessage(`${lines.length} passaggi copiati negli appunti!`, 'success');
    }).catch(() => {
      prompt('Copia i passaggi:', text);
    });
  } else {
    prompt('Copia i passaggi:', text);
  }
}

function copyLatexFormula() {
  if (!state.currentEq) return;
  const latexStr = toLatex(state.currentEq);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(latexStr).then(() => {
      showMessage(`Formula LaTeX copiata negli appunti: "${latexStr}"`, 'success');
    }).catch(() => {
      prompt('Copia il codice LaTeX:', latexStr);
    });
  } else {
    prompt('Copia il codice LaTeX:', latexStr);
  }
}

function copyStepsLatex() {
  if (state.history.length === 0) return;
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
      showMessage(`Svolgimento LaTeX (align*) copiato negli appunti!`, 'success');
    }).catch(() => {
      prompt('Copia lo svolgimento LaTeX:', block);
    });
  } else {
    prompt('Copia lo svolgimento LaTeX:', block);
  }
}

function escapeLatexComment(s) {
  return (s || '').replace(/([&%$#_{}~^\\])/g, '\\$1');
}

function showHelp() {
  dom.modalTitle.textContent = 'Guida rapida';
  dom.modalBody.innerHTML = `
    <h4>Come si usa l'app</h4>
    <ol>
      <li><strong>A. Libreria</strong>: scegli una formula, oppure scrivine una nell'editor.</li>
      <li><strong>E. Obiettivo</strong>: in alto compare la grandezza da isolare.</li>
      <li><strong>B. Area di lavoro</strong>: <em>clicca</em> una lettera, un termine, un fattore o un denominatore. Appaiono le operazioni lecite.</li>
      <li>Scegli un'operazione: vedrai un'<strong>anteprima</strong>. Conferma o annulla.</li>
      <li><strong>C. Regola</strong>: leggi la spiegazione intuitiva e il principio di equivalenza.</li>
      <li><strong>D. Cronologia</strong>: ripercorri i passaggi; usa <em>Annulla</em>/<em>Ripristina</em>. Puoi cliccare un passaggio per tornarci.</li>
    </ol>
    <h4>Concetti chiave</h4>
    <ul>
      <li><strong>Trasporto di un termine</strong>: non è uno "spostamento", ma sommare l'opposto a entrambi i membri (primo principio). Vale solo per i termini additivi.</li>
      <li><strong>Trasporto di un fattore</strong>: si divide entrambi i membri per il fattore, che deve essere ≠ 0 (secondo principio). Vale solo per fattori che moltiplicano tutto il membro.</li>
      <li><strong>Segno ±</strong>: risolvendo x² = a si ottiene x = ±√a: il segno non va eliminato.</li>
      <li><strong>Condizioni di validità</strong>: i denominatori devono essere ≠ 0 e i radicandi ≥ 0; l'app le registra e le mostra.</li>
    </ul>
    <h4>Scorciatoie</h4>
    <p>Ctrl/Cmd+Z annulla, Ctrl/Cmd+Y ripristina, Esc annulla l'anteprima o la selezione.</p>
  `;
  dom.modalActions.innerHTML = '<button class="btn btn-secondary" type="button" data-close-help>Chiudi</button>';
  dom.modalActions.querySelector('[data-close-help]').addEventListener('click', () => { dom.modalBackdrop.hidden = true; });
  dom.modalBackdrop.hidden = false;
}

function runTests() {
  const results = runAllTests();
  const { passed, failed, total, html } = formatTestResults(results);
  dom.testsSummary.innerHTML = `<span class="test-pass">${passed}</span> / <span class="test-total">${total}</span> superati` +
    (failed ? ` — <span class="test-fail">${failed} falliti</span>` : ' — <span class="test-pass">tutti superati</span>');
  dom.testsBody.innerHTML = html;
  dom.testsBackdrop.hidden = false;
}

// ---------------------------------------------------------------------------
// Import da LaTeX
// ---------------------------------------------------------------------------
function bindLatexEvents() {
  dom.btnLatexPreview.addEventListener('click', previewLatex);
  dom.btnLatexSave.addEventListener('click', saveLatex);
  dom.latexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); previewLatex(); }
  });
}

function clearLatexError() {
  if (dom.latexError) { dom.latexError.hidden = true; dom.latexError.textContent = ''; }
}

function showLatexError(msg) {
  if (dom.latexError) { dom.latexError.hidden = false; dom.latexError.textContent = msg; }
}

// Converte e mostra l'anteprima. Ritorna la stringa convertita o null se errore.
function previewLatex() {
  clearLatexError();
  const raw = (dom.latexInput.value || '').trim();
  if (argsEmpty(raw)) { showLatexError('Incolla un\'equazione LaTeX.'); return null; }
  let syntax;
  try {
    syntax = latexToSyntax(raw);
    parseEquation(syntax); // verifica che sia interpretabile
  } catch (e) {
    const msg = (e instanceof LatexError || e instanceof ParseError)
      ? e.message
      : 'Conversione non riuscita: ' + e.message;
    showLatexError(msg);
    if (dom.latexPreview) dom.latexPreview.hidden = true;
    return null;
  }
  if (dom.latexPreview) {
    dom.latexPreview.hidden = false;
    let mathHtml = '';
    try { mathHtml = renderEquation(parseEquation(syntax), {}); }
    catch (e) { mathHtml = escapeHtml(syntax); }
    dom.latexPreview.innerHTML =
      '<span class="conv-label">Sintassi per l\'editor</span>' +
      '<div class="conv-code">' + escapeHtml(syntax) + '</div>' +
      '<span class="conv-label" style="margin-top:.5rem">Anteprima</span>' +
      '<div class="math-eq">' + mathHtml + '</div>';
  }
  return syntax;
}

function argsEmpty(t) { return !t; }

function saveLatex() {
  const syntax = previewLatex();
  if (!syntax) return;

  const name = (dom.latexName.value || '').trim() || 'formula da LaTeX';
  let target = (dom.latexTarget.value || '').trim();

  let eq;
  try { eq = parseEquation(syntax); }
  catch (e) { showLatexError('Errore di sintassi: ' + e.message); return; }

  const vars = collectVars(eq);
  if (target && !vars.has(target)) {
    const alt = [...vars].find((v) => v.toLowerCase() === target.toLowerCase());
    if (alt) target = alt;
    else { showLatexError(`La grandezza "${target}" non compare nella formula. Presenti: ${[...vars].join(', ')}.`); return; }
  }

  try {
    saveUserFormula({
      name,
      formula: syntax,
      latex: (dom.latexInput.value || '').trim(),
      topic: 'Le mie formule',
      isolate: target ? [target] : [...vars],
      conditions: [],
      difficulty: 3,
      notes: 'Importata da LaTeX.',
    });
  } catch (e) {
    showLatexError(e.message);
    return;
  }

  renderMyFormulas();
  clearLatexError();
  dom.latexInput.value = '';
  dom.latexName.value = '';
  dom.latexTarget.value = '';
  if (dom.latexPreview) dom.latexPreview.hidden = true;
  showMessage(`Formula "${name}" salvata nell'archivio.`, 'success');
}

// ---------------------------------------------------------------------------
// Archivio personale ("Le mie formule")
// ---------------------------------------------------------------------------
function bindStorageEvents() {
  dom.btnExportFormulas.addEventListener('click', exportFormulas);
  dom.btnImportFormulas.addEventListener('click', importFormulas);
  dom.btnClearFormulas.addEventListener('click', clearFormulas);
}

function clearStorageError() {
  if (dom.storageError) { dom.storageError.hidden = true; dom.storageError.textContent = ''; }
}
function showStorageError(msg) {
  if (dom.storageError) { dom.storageError.hidden = false; dom.storageError.textContent = msg; }
}

function renderMyFormulas() {
  const list = getUserFormulas();
  if (dom.myFormulasCount) {
    dom.myFormulasCount.textContent = list.length === 0
      ? 'Nessuna formula salvata. Importa da LaTeX o salva una formula personalizzata.'
      : `${list.length} formula/e nell'archivio (persistente su questo dispositivo).`;
  }
  if (!dom.myFormulasList) return;
  dom.myFormulasList.innerHTML = '';
  if (list.length === 0) {
    dom.myFormulasList.innerHTML = '<p class="placeholder">Archivio vuoto.</p>';
    return;
  }
  for (const f of list) {
    const card = document.createElement('div');
    card.className = 'formula-card';
    card.setAttribute('role', 'option');
    card.tabIndex = 0;
    let mathHtml = '';
    try { mathHtml = renderEquation(parseEquation(f.formula), {}); }
    catch (e) { mathHtml = escapeHtml(f.formula); }
    card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml(f.topic || 'Le mie formule')}</span>
        <button class="icon-btn" type="button" title="Elimina" aria-label="Elimina formula">✕</button>
      </div>
      <div class="formula-name">${escapeHtml(f.name)}</div>
      <div class="formula-math">${mathHtml}</div>
      ${f.isolate && f.isolate.length ? `<div class="formula-isolate">Isola: ${f.isolate.map((v) => prettyVar(v)).join(', ')}</div>` : ''}
    `;
    const load = () => {
      const cands = (f.isolate || []).filter((v) => !triviallyIsolated(f.formula, v));
      const tgt = (cands.length ? cands : (f.isolate || []))[0];
      const vars = [...collectVars(parseEquation(f.formula))];
      const target = tgt || vars[0];
      loadFormula({
        id: f.id,
        topic: f.topic,
        name: f.name,
        formula: f.formula,
        isolate: f.isolate && f.isolate.length ? f.isolate : vars,
        conditions: f.conditions || [],
        difficulty: f.difficulty || 3,
        notes: f.notes || '',
      }, target);
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      load();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(); }
    });
    card.querySelector('.icon-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.confirm(`Eliminare la formula "${f.name}"?`)) {
        deleteUserFormula(f.id);
        renderMyFormulas();
        showMessage('Formula eliminata dall\'archivio.', 'info');
      }
    });
    dom.myFormulasList.appendChild(card);
  }
}

function exportFormulas() {
  clearStorageError();
  const json = exportUserFormulasJSON();
  if (dom.jsonArea) {
    dom.jsonArea.hidden = false;
    dom.jsonArea.value = json;
    dom.jsonArea.focus();
    dom.jsonArea.select();
  }
  // Prova anche il download del file.
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formule-inverse.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* il testo resta comunque nell'area */ }
  showMessage('Archivio esportato (JSON nell\'area e file scaricato).', 'success');
}

function importFormulas() {
  clearStorageError();
  if (!dom.jsonArea) return;
  if (dom.jsonArea.hidden) {
    dom.jsonArea.hidden = false;
    dom.jsonArea.focus();
    showMessage('Incolla il JSON nell\'area e premi di nuovo "Importa JSON".', 'info');
    return;
  }
  const json = dom.jsonArea.value.trim();
  if (!json) { showStorageError('Incolla prima un JSON da importare.'); return; }
  try {
    const added = importUserFormulasJSON(json);
    renderMyFormulas();
    showMessage(`${added} formula/e importate nell'archivio.`, 'success');
  } catch (e) {
    showStorageError(e.message);
  }
}

function clearFormulas() {
  clearStorageError();
  if (!window.confirm('Svuotare l\'archivio delle formule salvate? Operazione non annullabile.')) return;
  clearUserFormulas();
  renderMyFormulas();
  showMessage('Archivio svuotato.', 'info');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
