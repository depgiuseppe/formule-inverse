// app.js — Gestione dell'applicazione: stato, interfaccia, selezione,
// anteprima, cronologia, undo/redo, modalità, esercizi, editor.

import { parseEquation, ParseError } from './parser.js';
import {
  clone, toPretty, toLatex, unwrap, collectVars, equivalentEq, Eq,
  isVar, evalWithEnv, substituteVarsInAst, stripNeutrals, structurallyEqual,
} from './ast.js';
import { reciprocalEquation } from './reciprocals.js';
import { KEYPAD_OPERATIONS, equationKeypadTokens, parseOperand, applyKeypadOperation } from './operations.js';
import { crossCancel, analyseElementId } from './cross.js';
import {
  isGoalReached, findElement, availableActions, globalActions,
  performAction, suggestNextStep, mergeConditions, whichSideHas, hasDistributableSum,
  isolatedSide, ensureTargetOnFirstMember,
} from './algebra.js';
import { hasCompoundFraction, getCompoundFractionSteps } from './compound-fraction.js';
import { reduceEquationToCommonDenominator, canReduceToSingleFraction } from './common-denom.js';
import {
  filterFormulas, getFormulaById, randomExercise, TOPICS,
} from './formulas.js';
import { getExplanation, diagnoseStudentMisconception, getMisconception } from './explanations.js';
import { renderEquation, renderNode, prettyVar } from './render.js';
import { RULES, applyRule, negateExpr, findCommonFactor, hasTrigConflict, canDistribute } from './rules.js';
import { setupEquationDragAndDrop, highlightDropzones, clearDropzonesHighlight, applyDragMove, initDragArrow, updateDragArrow, hideDragArrow, cleanupTouchDrag, wasRecentTouchDrag } from './dragdrop.js';
import { getQuantityInfo, formatResultNumber } from './physics-units.js';
import {
  latexToSyntax, LatexError, GREEK_MAP,
  saveUserFormula, getUserFormulas, deleteUserFormula,
  clearUserFormulas, exportUserFormulasJSON, importUserFormulasJSON,
} from './formula-db.js';
import { initWorksheetExporter, openWorksheetModal } from './worksheet-export.js';
import {
  verbalizeEquation, verbalizeAst, verbalizeVar,
  announceMathLive, speakMath, stopSpeaking,
} from './a11y.js';
import { initQuizManager } from './quiz.js';

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
  quizManager: null,
  selectedId: null,
  pendingMove: null,
  goalReached: false,
  showImplicitDen: false,
  keypadOp: null,
  crossMode: false,
  crossPicked: [],
  clickDragToken: null,
  isAnimatingCompoundFraction: false,
  compoundAnimTimers: [],
};

// ---------------------------------------------------------------------------
// Riferimenti DOM
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const dom = {
  btnInstallPwa: $('#btn-install-pwa'),
  libraryList: $('#library-list'),
  librarySearch: $('#library-search'),
  libraryTopic: $('#library-topic'),
  libraryDifficulty: $('#library-difficulty'),
  libraryCountBadge: $('#library-count-badge'),
  btnRandom: $('#btn-random'),
  objectiveText: $('#objective-text'),
  objectiveStatus: $('#objective-status'),
  objectiveBox: $('#objective-box'),
  btnRetryExercise: $('#btn-retry-exercise'),
  completionBanner: $('#completion-banner'),
  completionTitle: $('#completion-title'),
  completionSubtitle: $('#completion-subtitle'),
  btnCompletionRetry: $('#btn-completion-retry'),
  btnCompletionNext: $('#btn-completion-next'),
  btnMirror: $('#btn-mirror'),
  btnReciprocal: $('#btn-reciprocal'),
  btnDistribute: $('#btn-distribute'),
  btnFactorCommon: $('#btn-factor-common'),
  btnCommonDenom: $('#btn-common-denom'),
  btnChangeSign: $('#btn-change-sign'),
  btnCross: $('#btn-cross'),
  btnExportWorksheet: $('#btn-export-worksheet'),
  compoundFractionBanner: $('#compound-fraction-banner'),
  compoundFractionTitle: $('#compound-fraction-title'),
  compoundFractionStepBadge: $('#compound-fraction-step-badge'),
  compoundFractionMsg: $('#compound-fraction-msg'),
  crossLayer: $('#cross-layer'),
  crossHandle: $('#cross-handle'),
  crossDissolveLayer: $('#cross-dissolve-layer'),
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
  btnHelp: $('#btn-help'),
  btnContrast: $('#btn-contrast'),
  btnTheme: $('#btn-theme'),
  btnLimMode: $('#btn-lim-mode'),
  btnSpeakEquation: $('#btn-speak-equation'),
  mathLiveVerbalizer: $('#math-live-verbalizer'),
  mathLiveAlert: $('#math-live-alert'),
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
  // --- Didactic Bubble (Fumetto Diagnosi) ---
  didacticBubbleAnchor: $('#didactic-bubble-anchor'),
  didacticBubble: $('#didactic-bubble'),
  bubbleBadge: $('#bubble-badge'),
  bubbleMessage: $('#bubble-message'),
  bubbleHintBox: $('#bubble-hint-box'),
  bubbleHintText: $('#bubble-hint-text'),
  bubbleFooterRule: $('#bubble-footer-rule'),
  btnCloseBubble: $('#btn-close-bubble'),
  btnBubbleOk: $('#btn-bubble-ok'),
  // --- Calcolo numerico con Unità SI ---
  numericalCalcCard: $('#numerical-calc-card'),
  btnCalcSample: $('#btn-calc-sample'),
  btnCalcReset: $('#btn-calc-reset'),
  calcInputsGrid: $('#calc-inputs-grid'),
  calcResultBox: $('#calc-result-box'),
  calcStepFormula: $('#calc-step-formula'),
  calcTargetVar: $('#calc-target-var'),
  calcFinalNumber: $('#calc-final-number'),
  calcFinalUnit: $('#calc-final-unit'),
  btnCopyCalcResult: $('#btn-copy-calc-result'),
  calcErrorNotice: $('#calc-error-notice'),
  mobileNavBar: $('#mobile-nav-bar'),
  // --- Esportatore Schede Didattiche e Verifiche Docenti ---
  worksheetModalBackdrop: $('#worksheet-modal-backdrop'),
  worksheetModalTitle: $('#worksheet-modal-title'),
  btnCloseWorksheetModal: $('#btn-close-worksheet-modal'),
  worksheetDocType: $('#worksheet-doc-type'),
  worksheetTitleInput: $('#worksheet-title-input'),
  worksheetSchoolInput: $('#worksheet-school-input'),
  worksheetSubjectInput: $('#worksheet-subject-input'),
  worksheetClassInput: $('#worksheet-class-input'),
  worksheetTeacherInput: $('#worksheet-teacher-input'),
  worksheetSourceSelect: $('#worksheet-source-select'),
  worksheetTopicGroup: $('#worksheet-topic-group'),
  worksheetTopicSelect: $('#worksheet-topic-select'),
  worksheetCountInput: $('#worksheet-count-input'),
  worksheetDifficultySelect: $('#worksheet-difficulty-select'),
  worksheetPointsInput: $('#worksheet-points-input'),
  worksheetRandomizeTargets: $('#worksheet-randomize-targets'),
  worksheetReqConditions: $('#worksheet-req-conditions'),
  worksheetSpaceType: $('#worksheet-space-type'),
  worksheetSolutionsSelect: $('#worksheet-solutions-select'),
  worksheetSummaryCount: $('#worksheet-summary-count'),
  worksheetSummaryPoints: $('#worksheet-summary-points'),
  worksheetSelectedList: $('#worksheet-selected-list'),
  btnTabPreviewHtml: $('#btn-tab-preview-html'),
  btnTabPreviewLatex: $('#btn-tab-preview-latex'),
  worksheetHtmlPreview: $('#worksheet-html-preview'),
  worksheetLatexCode: $('#worksheet-latex-code'),
  btnPrintWorksheet: $('#btn-print-worksheet'),
  btnDownloadLatex: $('#btn-download-latex'),
  btnCopyLatex: $('#btn-copy-latex'),
  btnDownloadHtml: $('#btn-download-html'),
  btnCloseWorksheet: $('#btn-close-worksheet'),
  // --- Modalità Eserciziario / Quiz Interattivo & Badge ---
  btnModeQuiz: $('#btn-mode-quiz'),
  btnQuizDashboard: $('#btn-quiz-dashboard'),
  quizHud: $('#quiz-hud'),
  quizCurrentLevel: $('#quiz-current-level'),
  quizTimer: $('#quiz-timer'),
  quizBtnNew: $('#quiz-btn-new'),
  quizBtnDashboard: $('#quiz-btn-dashboard'),
  quizLevelEasy: $('#quiz-level-easy'),
  quizLevelMedium: $('#quiz-level-medium'),
  quizLevelHard: $('#quiz-level-hard'),
  quizLevelAll: $('#quiz-level-all'),
  quizTopicSelect: $('#quiz-topic-select'),
  quizMovesCount: $('#quiz-moves-count'),
  quizOptimalCount: $('#quiz-optimal-count'),
  quizEfficiencyBadge: $('#quiz-efficiency-badge'),
  quizCompletionModalBackdrop: $('#quiz-completion-modal-backdrop'),
  quizCompletionModal: $('#quiz-completion-modal'),
  quizCompletionIcon: $('#quiz-completion-icon'),
  quizCompletionStars: $('#quiz-completion-stars'),
  quizCompletionTitle: $('#quiz-completion-title'),
  quizCompletionMsg: $('#quiz-completion-msg'),
  quizCompletionStats: $('#quiz-completion-stats'),
  quizCompletionBadges: $('#quiz-completion-badges'),
  quizBtnRetryExercise: $('#quiz-btn-retry-exercise'),
  quizBtnViewStats: $('#quiz-btn-view-stats'),
  quizBtnNextExercise: $('#quiz-btn-next-exercise'),
  quizBtnCloseCompletion: $('#quiz-btn-close-completion'),
  quizDashboardBackdrop: $('#quiz-dashboard-backdrop'),
  quizDashboardModal: $('#quiz-dashboard-modal'),
  quizDashboardTitle: $('#quiz-dashboard-title'),
  quizBtnCloseDashboard: $('#quiz-btn-close-dashboard'),
  quizRankAvatar: $('#quiz-rank-avatar'),
  quizRankTitle: $('#quiz-rank-title'),
  quizRankLevel: $('#quiz-rank-level'),
  quizXpText: $('#quiz-xp-text'),
  quizXpBar: $('#quiz-xp-bar'),
  quizStatTotal: $('#quiz-stat-total'),
  quizStatEasy: $('#quiz-stat-easy'),
  quizStatMedium: $('#quiz-stat-medium'),
  quizStatHard: $('#quiz-stat-hard'),
  quizStatEfficiency: $('#quiz-stat-efficiency'),
  quizStatStreak: $('#quiz-stat-streak'),
  quizBadgesCountBadge: $('#quiz-badges-count-badge'),
  quizBadgesGrid: $('#quiz-badges-grid'),
  quizHistoryList: $('#quiz-history-list'),
  quizBtnResetProgress: $('#quiz-btn-reset-progress'),
  quizBtnCloseDashboardBottom: $('#quiz-btn-close-dashboard-bottom'),
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
  initPwa();
  initMobileNav();
  initWorksheetExporter(dom, state);
  state.quizManager = initQuizManager(dom, state, { loadFormula });
  loadFormula(getFormulaById('v-st'), 't');
}

// ---------------------------------------------------------------------------
// PWA (Progressive Web App): Service Worker & Install Prompt per Android
// ---------------------------------------------------------------------------
let deferredInstallPrompt = null;

function initPwa() {
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol === 'file:')) {
    if (window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showMessage('Nuova versione disponibile! Ricarica la pagina per aggiornare.', 'info');
              }
            };
          }
        };
      }).catch((err) => {
        console.debug('Service Worker non registrato:', err);
      });
    }
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (dom.btnInstallPwa && !isStandalone) {
      dom.btnInstallPwa.style.display = 'inline-flex';
    }
  });

  if (dom.btnInstallPwa) {
    dom.btnInstallPwa.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      dom.btnInstallPwa.style.display = 'none';
      deferredInstallPrompt.prompt();
      try {
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showMessage('🎉 Installazione avviata! Troverai l\'app sulla schermata Home.', 'success');
        }
      } catch (_) {}
      deferredInstallPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (dom.btnInstallPwa) dom.btnInstallPwa.style.display = 'none';
    deferredInstallPrompt = null;
    showMessage('🎉 "Formule Inverse" è ora installata sul tuo dispositivo!', 'success');
  });
}

// ---------------------------------------------------------------------------
// Mobile Navigation Bar (Quick Jump & Scroll Spy)
// ---------------------------------------------------------------------------
function initMobileNav() {
  if (!dom.mobileNavBar) return;
  const items = dom.mobileNavBar.querySelectorAll('.mobile-nav-item');
  if (!items.length) return;

  function setActive(targetId) {
    items.forEach((btn) => {
      if (btn.dataset.jump === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  items.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.jump;
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(targetId);
      }
    });
  });

  const targetIds = ['workarea', 'library-panel', 'history-panel', 'numerical-calc-card'];
  const targets = targetIds.map((id) => document.getElementById(id)).filter(Boolean);

  if ('IntersectionObserver' in window && targets.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          setActive(entry.target.id);
        }
      }
    }, {
      root: null,
      rootMargin: '-10% 0px -40% 0px',
      threshold: [0.2, 0.5]
    });

    targets.forEach((el) => observer.observe(el));
  }
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

  // Se la ricerca per testo ha fatto fallback globale, sincronizza il selettore
  if (topic && search && list.length > 0 && list.some((f) => f.topic !== topic)) {
    if (dom.libraryTopic) dom.libraryTopic.value = '';
  }

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
  if (dom.librarySearch) {
    dom.librarySearch.addEventListener('input', renderLibrary);
    dom.librarySearch.addEventListener('search', renderLibrary);
  }
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
  cancelCompoundFractionAnimation();
  cancelActiveSwapAnimations();
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
  state.clickDragToken = null;
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
  dismissDidacticBubble();
  if (state.goalReached && checkAndAnimateCompoundFraction()) {
    return;
  }
  if (state.mode === 'auto') {
    showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// B. Area di lavoro
// ---------------------------------------------------------------------------
function renderEquationView() {
  state.clickDragToken = null;
  if (dom.equationDisplay) {
    dom.equationDisplay.classList.remove('is-dragging-equation', 'is-click-drag-mode');
  }
  hideDragArrow();
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

let _neutralCleanupTimer = null;
function scheduleNeutralCleanup() {
  if (_neutralCleanupTimer) clearTimeout(_neutralCleanupTimer);
  _neutralCleanupTimer = setTimeout(() => {
    if (!state.currentEq) return;
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
    btn.title = `Applica ${name}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(name));
    dom.keypadOperands.appendChild(btn);
  }
  for (const value of numbers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-operand keypad-number';
    btn.textContent = String(value);
    btn.title = `Applica ${value}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(String(value)));
    dom.keypadOperands.appendChild(btn);
  }

  // Campo libero: serve a moltiplicare per un numero non presente nell'equazione.
  const custom = document.createElement('span');
  custom.className = 'keypad-custom';
  custom.innerHTML =
    '<input class="keypad-custom-value" type="text" inputmode="numeric" placeholder="n" aria-label="Altro numero o grandezza" size="3">' +
    '<button type="button" class="btn-mini keypad-custom-apply" title="Applica all\'equazione">Applica</button>';
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
    ? `Premi di nuovo per applicare ${op.label} a entrambi i membri.`
    : `Operazione ${op ? op.label : ''} scelta: ora tocca una grandezza o un numero.`;
}

function handleKeypadOpClick(op) {
  if (!state.currentEq) return;
  if (state.keypadOp === op.id) {
    // Secondo clic sulla stessa operazione senza operando: la annulla,
    // tranne per le operazioni che non richiedono un operando (radice, inverse trigonometriche).
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
    showMessage('Prima scegli un\'operazione nel tastierino, poi la grandezza o il numero.', 'info');
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

  // Suono in base all'operazione
  if (opId === 'add' || opId === 'sub') playSoundTransport();
  else playSoundFraction();

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
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
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

let _isMirrorSwapping = false;
let _currentMirrorAnims = [];

function cancelActiveSwapAnimations() {
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

/**
 * Anima lo scambio dei membri (Regola dello specchio) facendo viaggiare
 * fluidamente il membro sinistro verso destra e il membro destro verso sinistra.
 */
function animateMirrorSwap(fromEq, toEq, onComplete) {
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
  playSoundTransport();

  const rectL = memberL.getBoundingClientRect();
  const rectR = memberR.getBoundingClientRect();
  const deltaX = rectR.left - rectL.left;

  if (eqSign) {
    eqSign.classList.remove('eq-sign-mirror-active');
    void eqSign.offsetWidth;
    eqSign.classList.add('eq-sign-mirror-active');
  }

  // Il membro sinistro viaggia verso destra descrivendo un arco superiore
  const animL = memberL.animate([
    { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
    { transform: `translate(${deltaX * 0.5}px, -20px) scale(1.04)`, opacity: 0.94, offset: 0.5 },
    { transform: `translate(${deltaX}px, 0px) scale(1)`, opacity: 1 }
  ], {
    duration: 260,
    easing: 'cubic-bezier(0.25, 1, 0.4, 1)',
    fill: 'forwards'
  });

  // Il membro destro viaggia verso sinistra descrivendo un arco inferiore
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

/**
 * Anima il volo di una lettera / termine da sourceRect a targetRect lungo un arco sopra l'uguale.
 */
function animateTokenTravel(sourceRect, targetRect, tokenText, onComplete) {
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

/**
 * Fa pulsare i termini evidenziando che i segni sono stati invertiti (+ <-> -).
 */
function flashSignChanged() {
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

/**
 * Aggiunge un rimbalzo morbido al token appena atterrato nella nuova equazione.
 */
function highlightLandedToken(varName, side) {
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
  showMessage(`"${prettyVar(varName)}" selezionato — clicca la destinazione (denominatore o membro opposto) per applicare il trasporto, oppure scegli un'operazione in basso. Riclicca per annullare.`, 'info');
  const foundEl = findElement(state.currentEq, tokenEl.dataset.id);
  if (foundEl) {
    state.selectedId = tokenEl.dataset.id;
    const actions = availableActions(state.currentEq, foundEl, state.targetVar);
    renderActions(foundEl, actions);
  }
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
  const tokenEl = dom.equationDisplay.querySelector('.token-in-flight');
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

function attachEquationHandlers() {
  dom.equationDisplay.querySelectorAll('.math-node').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wasRecentTouchDrag()) return;
      if (state.mode === 'auto') {
        executeNextAutoStep();
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

      selectElement(el.dataset.id);
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
          executeNextAutoStep();
          return;
        }
        if (state.crossMode) crossPickToken(el.dataset.id, el);
        else selectElement(el.dataset.id);
      }
    });
  });
}

function attachDropzoneClickHandlers() {
  dom.equationDisplay.querySelectorAll('.dropzone').forEach((dz) => {
    dz.addEventListener('click', (e) => {
      if (state.mode === 'auto') {
        executeNextAutoStep();
        return;
      }
      if (!state.clickDragToken) return;
      if (dz.dataset.side === state.clickDragToken.fromSide) {
        if (state.clickDragToken.fromSlot === 'num' && dz.dataset.slot === 'den') {
          const oppMember = state.clickDragToken.fromSide === 'right' ? 'primo membro (sotto la linea di frazione a sinistra)' : 'secondo membro (sotto la linea di frazione a destra)';
          showMessage(`Non puoi spostare "${prettyVar(state.clickDragToken.varName)}" al denominatore dello stesso membro! Per il 2° principio di equivalenza, se dividi per esso va al denominatore del membro OPPOSTO (${oppMember}).`, 'warning');
        } else {
          showMessage(`Trascina o clicca sul membro opposto per applicare la regola del trasporto!`, 'info');
        }
        flashTokenRejected(state.clickDragToken.varName, state.clickDragToken.fromSide);
        return;
      }
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
  if (dom.crossLayer) {
    dom.crossLayer.hidden = !state.crossMode;
  }
  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (card) card.classList.toggle('cross-mode', state.crossMode);
  clearCrossMarks();
  if (state.crossMode) {
    showMessage('✕/ Semplificazione attiva — clicca due elementi da eliminare (fattori num./den., termini opposti o stessa grandezza su entrambi i membri).', 'info');
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
  // Due elementi selezionati: verifica ed esegui la semplificazione
  const [idA, idB] = state.crossPicked;
  const res = crossCancel(state.currentEq, idA, idB);
  if (!res.ok) {
    state.crossPicked = [];
    clearCrossMarks();
    flashCrossError();
    showInvalidMove(res.error, res.hint, { label: 'Semplificazione' });
    return;
  }
  dissolveThenApplyCross(idA, idB, res);
}

// Genera una spettacolare onda d'urto ad anello e particelle di scintille
function spawnVariableExplosion(el, colorScheme = 'neon') {
  const layer = dom.crossDissolveLayer;
  if (!el || !layer) return;
  const layerRect = layer.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const cx = rect.left + rect.width / 2 - layerRect.left;
  const cy = rect.top + rect.height / 2 - layerRect.top;

  // 1. Onda d'urto ad anello
  const shockwave = document.createElement('div');
  shockwave.className = 'explosion-shockwave';
  shockwave.style.left = `${cx}px`;
  shockwave.style.top = `${cy}px`;
  layer.appendChild(shockwave);

  // 2. Particelle ed esplosione di scintille
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

// Coriandoli e scintille celebrative al raggiungimento dell'obiettivo
function spawnVictoryConfetti() {
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

// Cerca nel DOM i fattori numeratore/denominatore che stanno per essere cancellati
function findCancellableDomElements(action) {
  if (!dom.equationDisplay || !action) return [];
  if (action.ruleKey !== 'cancelFactor' && action.id !== 'cancel-factor') return [];
  let denText = '';
  try {
    const ctx = action.build ? action.build({}) : {};
    denText = (ctx.denText || '').trim();
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

function dissolveThenApplyCross(idA, idB, res) {
  clearCrossMarks(); clearPreview(); playSoundExplosion();

  // Anima in dissolvi gli elementi selezionati con esplosione particellare
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
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
    } else if (state.mode === 'auto') {
      showAutoMode();
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
  const cancelCrossDrag = () => {
    dragging = false;
    handle.classList.remove('dragging');
    highlight(null);
    handle.style.left = '';
    handle.style.top = '';
  };
  handle.addEventListener('pointercancel', cancelCrossDrag);
  handle.addEventListener('lostpointercapture', cancelCrossDrag);

  // Accessibilità da tastiera: Invio/Spazio attiva la modalità e i fattori
  // si scelgono con Tab + Invio (gestito in attachEquationHandlers).
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showMessage('Usa Tab per raggiungere un fattore e Invio per sceglierlo.', 'info');
    }
  });
}

// Callback per il drag and drop: valuta e applica con animazione di viaggio della lettera
function applyDragResult(result, meta = {}) {
  if (!result || state.isAnimatingCompoundFraction) return;

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

  // Se sono disponibili coordinate per l'animazione di volo, fai viaggiare la lettera!
  if (meta.sourceRect && meta.targetRect && meta.tokenText) {
    animateTokenTravel(meta.sourceRect, meta.targetRect, meta.tokenText, () => {
      finalizeDragResult(result, meta);
    });
  } else {
    finalizeDragResult(result, meta);
  }
}

function finalizeDragResult(result, meta = {}) {
  // Mossa valida: suono + applica
  if (result.principle === 'first') playSoundTransport();
  else playSoundFraction();
  dismissDidacticBubble();

  clearPreview();
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

  // Controlla se la mossa ha isolato il target sul secondo membro (membro destro)
  const isTargetIsolatedOnRight = isolatedSide(nextEq.right, state.targetVar);

  if (isTargetIsolatedOnRight) {
    // 1. Mostra la lettera appena atterrata a destra
    state.currentEq = nextEq;
    renderEquationView();
    highlightLandedToken(meta.varName, meta.targetSide);
    showRulePanel(pseudoRule, pseudoResult, nextEq);
    showMessage(`✓ ${result.ruleName}!`, 'success');

    // 2. Dopo 420ms avvia l'animazione specchio fluida per portarla al primo membro
    setTimeout(() => {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      if (flipped !== state.currentEq) {
        animateMirrorSwap(state.currentEq, flipped, () => {
          state.currentEq = flipped;
          state.goalReached = true;
          pushHistory({
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
          updateObjective();
          renderEquationView();
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
        });
      }
    }, 450);
    return;
  }

  // Flusso normale (target non isolato sul secondo membro)
  state.currentEq = nextEq;
  pushHistory({
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

  updateObjective();
  renderEquationView();
  highlightLandedToken(meta.varName, meta.targetSide);
  showRulePanel(pseudoRule, pseudoResult, result.newEq);
  clearMessage();
  showMessage(`✓ ${result.ruleName}!`, 'success');

  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola dei reciproci (inversione di entrambi i membri)
// ---------------------------------------------------------------------------
// La matematica dell'operazione è in reciprocals.js, testabile da Node.
function applyReciprocalRule() {
  if (!state.currentEq) return;
  playSoundFraction();
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
    explanation: 'reciprocal-both',
  };
  pushHistory({
    equation: clone(newEq),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'reciprocal',
    steps: [`Calcolo il reciproco di entrambi i membri: ${toPretty(eq, 0)} → ${toPretty(newEq, 0)}.`],
    conditions: state.conditions.slice(),
    explanationKey: 'reciprocal-both',
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
  clearMessage();
  showMessage('🔁 Regola dei reciproci applicata a entrambi i membri!', 'success');
  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola della proprietà distributiva (sviluppa le parentesi)
// ---------------------------------------------------------------------------
function applyDistributeRule() {
  if (!state.currentEq) return;
  const eq = state.currentEq;

  const leftDist = canDistribute(eq.left);
  const rightDist = canDistribute(eq.right);

  if (!leftDist && !rightDist) {
    showMessage('Non ci sono prodotti con parentesi (somme o differenze) da sviluppare.', 'info');
    return;
  }

  let chosenSide = null;
  if (state.selectedId) {
    const selInfo = analyseElementId(state.selectedId);
    if (selInfo && selInfo.side) {
      if (selInfo.side === 'left' && leftDist) chosenSide = 'left';
      if (selInfo.side === 'right' && rightDist) chosenSide = 'right';
    }
  }

  if (!chosenSide) {
    const targetLeft = hasDistributableSum(eq.left, state.targetVar);
    const targetRight = hasDistributableSum(eq.right, state.targetVar);
    if (targetRight && !targetLeft && rightDist) chosenSide = 'right';
    else if (targetLeft && !targetRight && leftDist) chosenSide = 'left';
    else if (rightDist && !leftDist) chosenSide = 'right';
    else if (leftDist && !rightDist) chosenSide = 'left';
    else chosenSide = 'right';
  }

  playSoundTransport();
  const res = applyRule(RULES.distribute, eq, { side: chosenSide });
  if (!res.ok) {
    showInvalidMove(res.error, res.hint);
    return;
  }

  state.currentEq = res.equation;
  state.selectedId = null;
  clearPreview();

  const rule = RULES.distribute;
  pushHistory({
    equation: clone(res.equation),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'distribute',
    steps: [`Sviluppo le parentesi con la proprietà distributiva al ${chosenSide === 'left' ? 'primo' : 'secondo'} membro: ${toPretty(eq, 0)} → ${toPretty(res.equation, 0)}.`],
    conditions: state.conditions.slice(),
    explanationKey: 'distribute',
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: ['Sviluppate le parentesi con la proprietà distributiva'], conditions: [] }, res.equation);
  clearMessage();
  showMessage('📦 Proprietà distributiva applicata: parentesi sviluppate!', 'success');
  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola del raccoglimento a fattor comune
// ---------------------------------------------------------------------------
function applyFactorCommonRule() {
  if (!state.currentEq) return;
  const eq = state.currentEq;

  const targetSide = whichSideHas(eq, state.targetVar) || 'right';
  const sidesToCheck = targetSide === 'both' ? ['right', 'left'] : [targetSide, targetSide === 'left' ? 'right' : 'left'];

  let foundSide = null;
  let commonNode = null;

  for (const s of sidesToCheck) {
    const member = s === 'left' ? eq.left : eq.right;
    const common = findCommonFactor(member, state.targetVar);
    if (common) {
      foundSide = s;
      commonNode = common;
      break;
    }
  }

  if (!commonNode) {
    for (const s of sidesToCheck) {
      const member = s === 'left' ? eq.left : eq.right;
      const common = findCommonFactor(member, null);
      if (common) {
        foundSide = s;
        commonNode = common;
        break;
      }
    }
  }

  if (!commonNode) {
    const member = targetSide === 'left' ? eq.left : eq.right;
    if (hasTrigConflict(member, state.targetVar)) {
      showMessage(`⚠️ Non è possibile raccogliere ${prettyVar(state.targetVar)} a fattor comune: ${prettyVar(state.targetVar)} è l'argomento di funzioni trigonometriche distinte (sin e cos), non un fattore moltiplicativo.`, 'warning');
      return;
    }
    showMessage('Nessun fattore comune trovato da raccogliere tra tutti i termini del membro.', 'info');
    return;
  }

  playSoundTransport();
  const commonText = toPretty(commonNode, 0);
  const res = applyRule(RULES.factorCommon, eq, { side: foundSide, common: commonNode, commonText });
  if (!res.ok) {
    showInvalidMove(res.error, res.hint);
    return;
  }

  state.currentEq = res.equation;
  state.selectedId = null;
  clearPreview();

  const rule = RULES.factorCommon;
  pushHistory({
    equation: clone(res.equation),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'factorCommon',
    steps: [`Raccolgo ${commonText} a fattor comune al ${foundSide === 'left' ? 'primo' : 'secondo'} membro: ${toPretty(eq, 0)} → ${toPretty(res.equation, 0)}.`],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: [`Raccolto ${commonText} a fattor comune`], conditions: [] }, res.equation);
  clearMessage();
  showMessage(`🧩 Raccoglimento a fattor comune applicato: ${commonText} messo in evidenza!`, 'success');
  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola del minimo comune multiplo (m.c.m.) e denominatore comune
// ---------------------------------------------------------------------------
function applyCommonDenominatorRule() {
  if (!state.currentEq) return;
  const eq = state.currentEq;

  let chosenSide = null;
  if (state.selectedId) {
    if (state.selectedId.startsWith('left')) chosenSide = 'left';
    else if (state.selectedId.startsWith('right')) chosenSide = 'right';
  }

  const res = reduceEquationToCommonDenominator(eq, chosenSide);
  if (!res.ok) {
    showInvalidMove(res.error, res.hint, { label: 'Minimo comune multiplo (m.c.m.)' });
    return;
  }

  const newEq = res.newEq;
  if (equivalentEq(newEq, eq)) {
    showMessage('L\'equazione è già espressa a denominatore comune.', 'info');
    return;
  }

  playSoundFraction();

  // Visual pulse animato sulla math-eq
  if (dom.equationDisplay) {
    dom.equationDisplay.classList.add('sign-flip-pulse');
    setTimeout(() => {
      if (dom.equationDisplay) dom.equationDisplay.classList.remove('sign-flip-pulse');
    }, 450);
  }

  state.currentEq = newEq;
  state.selectedId = null;
  clearPreview();

  const rule = RULES.commonDenom;
  pushHistory({
    equation: clone(newEq),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'common-denom',
    steps: res.steps,
    conditions: state.conditions.slice(),
    explanationKey: 'common-denom',
    note: null,
    verified: true,
  }, false);

  updateObjective();
  renderEquationView();
  showRulePanel(rule, { steps: res.steps, conditions: [] }, newEq);
  clearMessage();
  showMessage('🧮 Frazioni ridotte a denominatore comune (m.c.m.) in un\'unica frazione!', 'success');

  // Se la variabile cercata è isolata al secondo membro, animiamo il viaggio speculare
  if (state.targetVar && isolatedSide(newEq.right, state.targetVar) && !collectVars(newEq.left).has(state.targetVar)) {
    const swapped = Eq(newEq.right, newEq.left);
    setTimeout(() => {
      animateMirrorSwap(newEq, swapped, () => {
        state.currentEq = swapped;
        renderEquationView();
        updateObjective();
      });
    }, 200);
  }

  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
  }
}


// ---------------------------------------------------------------------------
// Regola del cambio di segno (moltiplicazione per -1 di entrambi i membri)
// ---------------------------------------------------------------------------
function applyChangeSignRule() {
  if (!state.currentEq) return;
  playSoundTransport();
  const eq = state.currentEq;
  const newEq = Eq(negateExpr(eq.left), negateExpr(eq.right));

  state.currentEq = newEq;
  state.selectedId = null;
  clearPreview();

  const rule = {
    id: 'changeSign',
    name: 'Regola del cambio di segno',
    principle: 'Secondo principio di equivalenza: moltiplicando entrambi i membri per −1, tutti i segni si invertono (+ ↔ −).',
    explanation: null,
  };
  pushHistory({
    equation: clone(newEq),
    ruleName: rule.name,
    rulePrinciple: rule.principle,
    ruleId: 'changeSign',
    steps: [`Moltiplico entrambi i membri per −1: ${toPretty(eq, 0)} → ${toPretty(newEq, 0)}.`],
    conditions: state.conditions.slice(),
    explanationKey: null,
    note: null,
    verified: true,
  }, false);

  // Verifichiamo se la grandezza obiettivo è ora isolata sul secondo membro
  const isTargetIsolatedOnRight = isolatedSide(newEq.right, state.targetVar);

  if (isTargetIsolatedOnRight) {
    // 1. Mostra subito l'equazione con i segni invertiti (-v0 è diventato +v0) e fai pulsare i segni
    renderEquationView();
    flashSignChanged();
    showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    clearMessage();
    showMessage(`± Cambio segno applicato: ${prettyVar(state.targetVar)} è ora positivo!`, 'info');

    // 2. Dopo 420ms avvia l'animazione fluida di scambio membri (specchio)
    setTimeout(() => {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      if (flipped !== state.currentEq) {
        animateMirrorSwap(state.currentEq, flipped, () => {
          state.currentEq = flipped;
          state.goalReached = true;
          pushHistory({
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
          updateObjective();
          renderEquationView();
          showRulePanel({
            id: 'swapSides',
            name: 'Regola dello specchio (scambio membri)',
            principle: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
          }, { steps: ['Scambio i due membri dell\'equazione per la proprietà simmetrica.'], conditions: [] }, flipped);
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
        });
      } else {
        updateObjective();
        renderEquationView();
      }
    }, 450);
    return;
  }

  updateObjective();
  renderEquationView();
  flashSignChanged();
  showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
  clearMessage();
  showMessage('± Regola del cambio di segno applicata: tutti i segni invertiti!', 'success');
  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
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
  if (node.type === 'Var' || node.type === 'Div' || node.type === 'Mul' || node.type === 'Add' || node.type === 'Sub' || node.type === 'Group') {
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
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
    }
    return;
  }

  // CASO 2: Azione da barra comandi
  const { action, result } = state.pendingMove;

  playSoundForRule(action.ruleKey);

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
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
  } else if (state.mode === 'auto') {
    showAutoMode();
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

let bubbleTimeout = null;

function showDidacticBubble({ error, hint, action }) {
  if (!dom.didacticBubbleAnchor) return;
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }

  const diag = diagnoseStudentMisconception(error, hint, action);
  const badgeText = diag.badge || 'Principio di Equivalenza';
  const ruleReminder = diag.ruleReminder || 'Ricorda di applicare correttamente i principi di equivalenza delle equazioni.';
  const explanationText = diag.explanation || error || 'Operazione non consentita.';
  const adviceText = diag.advice || hint || '';

  if (dom.bubbleBadge) dom.bubbleBadge.textContent = badgeText;
  if (dom.bubbleMessage) dom.bubbleMessage.textContent = explanationText;

  if (dom.bubbleHintBox && dom.bubbleHintText) {
    if (adviceText) {
      dom.bubbleHintText.textContent = adviceText;
      dom.bubbleHintBox.hidden = false;
    } else {
      dom.bubbleHintBox.hidden = true;
    }
  }

  if (dom.bubbleFooterRule) dom.bubbleFooterRule.textContent = ruleReminder;

  dom.didacticBubbleAnchor.hidden = false;
  if (dom.didacticBubble) dom.didacticBubble.classList.remove('bubble-closing');

  bubbleTimeout = setTimeout(() => {
    dismissDidacticBubble();
  }, 9000);
}

function dismissDidacticBubble() {
  if (!dom.didacticBubbleAnchor || dom.didacticBubbleAnchor.hidden) return;
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }
  if (dom.didacticBubble) {
    dom.didacticBubble.classList.add('bubble-closing');
    setTimeout(() => {
      if (dom.didacticBubbleAnchor) dom.didacticBubbleAnchor.hidden = true;
      if (dom.didacticBubble) dom.didacticBubble.classList.remove('bubble-closing');
    }, 220);
  } else {
    dom.didacticBubbleAnchor.hidden = true;
  }
}

function showInvalidMove(error, hint, action) {
  playSoundInvalid();
  const diag = diagnoseStudentMisconception(error, hint, action);
  const parts = [];
  parts.push('Mossa non valida: ' + error);
  if (diag.advice || hint) parts.push('Suggerimento: ' + (diag.advice || hint));
  if (action) parts.push('Regola tentata: ' + action.label);
  showMessage(parts.join(' '), 'error');
  showDidacticBubble({ error, hint: diag.advice || hint, action });
  pushHistory({
    equation: clone(state.currentEq),
    ruleName: 'Tentativo non valido: ' + (diag.badge || 'Errore'),
    rulePrinciple: diag.ruleReminder || '',
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
  let html = `<div class="rule-name">📜 ${escapeHtml(rule ? rule.name : 'Trasformazione')}</div>`;

  if (ex) {
    html += `<div class="rule-section"><strong>💡 Spiegazione intuitiva</strong><p>${escapeHtml(ex.intuitiva)}</p></div>`;
    html += `<div class="rule-section"><strong>⚖️ Principio di equivalenza</strong><p>${escapeHtml(ex.principio)}</p></div>`;
    html += `<div class="rule-section"><strong>🎯 Perché è corretta</strong><p>${escapeHtml(ex.perche)}</p></div>`;
  } else if (rule && rule.principle) {
    html += `<div class="rule-section"><strong>⚖️ Principio matematico</strong><p>${escapeHtml(rule.principle)}</p></div>`;
  }

  if (result.steps && result.steps.length) {
    html += `<div class="rule-section"><strong>⚙️ Operazione svolta</strong><ul class="steps-list">${result.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
  }

  html += `<div class="rule-section rule-eq"><strong>📐 Equazione dopo</strong><div class="rule-math">${renderEquation(afterEq, {})}</div></div>`;

  if (result.conditions && result.conditions.length) {
    html += `<div class="rule-section conditions"><strong>🔍 Condizioni di validità richieste</strong><ul>${result.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
  }
  if (ex && ex.attenzione && ex.attenzione.length) {
    html += `<div class="rule-section warning"><strong>⚠️ Attenzione</strong><ul>${ex.attenzione.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
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
// Animazione Didattica Frazioni di Frazione
// ---------------------------------------------------------------------------
function cancelCompoundFractionAnimation() {
  if (state.compoundAnimTimers && state.compoundAnimTimers.length) {
    for (const t of state.compoundAnimTimers) clearTimeout(t);
    state.compoundAnimTimers = [];
  }
  state.isAnimatingCompoundFraction = false;
  if (dom.equationDisplay) {
    dom.equationDisplay.classList.remove('compound-anim-step1', 'compound-anim-step2', 'compound-anim-step3');
  }
  if (dom.compoundFractionBanner) {
    dom.compoundFractionBanner.hidden = true;
  }
}

function checkAndAnimateCompoundFraction(onComplete) {
  if (state.isAnimatingCompoundFraction) return false;
  if (!state.currentEq || !state.targetVar) return false;
  if (!isGoalReached(state.currentEq, state.targetVar)) return false;

  const steps = getCompoundFractionSteps(state.currentEq, state.targetVar);
  if (!steps) return false;

  startCompoundFractionAnimation(steps, onComplete);
  return true;
}

function startCompoundFractionAnimation(steps, onComplete) {
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
  updateObjective();

  // Timer 1: Passaggio 2 - Inversione e moltiplicazione per la reciproca (dopo 2.2s di osservazione)
  const t1 = setTimeout(() => {
    if (!state.isAnimatingCompoundFraction) return;

    playSoundFraction();
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

    // Timer 2: Passaggio 3 - Semplificazione in frazione normale canonica (dopo altri 2.5s)
    const t2 = setTimeout(() => {
      if (!state.isAnimatingCompoundFraction) return;

      playSuccessChime();
      spawnVictoryConfetti();
      state.currentEq = steps.step3Eq;
      state.isAnimatingCompoundFraction = false;
      renderEquationView();

      const rule = {
        name: 'Semplificazione frazione di frazione',
        principle: 'Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa): a / (b/c) = (a · c) / b.',
        explanation: null,
      };

      pushHistory({
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

      updateObjective();
      showMessage(`🎉 Frazione di frazione semplificata! Formula inversa finale ricavata con successo.`, 'success');

      // Timer 3: Dissolve del banner dopo 3.2s
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

// ---------------------------------------------------------------------------
// E. Obiettivo & Laboratorio di Calcolo Numerico
// ---------------------------------------------------------------------------
let _lastAnnouncedSolvedEq = false;
function updateObjective() {
  const f = state.baseFormula;
  const t = prettyVar(state.targetVar);
  dom.objectiveText.textContent = f ? `ricavare ${t} — ${f.name} (${f.formula})` : `ricavare ${t}`;
  state.goalReached = isGoalReached(state.currentEq, state.targetVar);

  if (!_isMirrorSwapping && state.goalReached && state.currentEq && state.currentEq.type === 'Eq') {
    const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
    if (flipped !== state.currentEq) {
      state.currentEq = flipped;
      if (dom.equationDisplay) {
        dom.equationDisplay.innerHTML = renderEquation(state.currentEq, {
          selectedId: state.selectedId,
          targetVar: state.targetVar,
          interactive: true,
          showImplicitDen: state.showImplicitDen,
        });
        if (dom.latexLiveCode) dom.latexLiveCode.textContent = toLatex(state.currentEq);
      }
    }
  }

  const resSide = state.currentEq && state.currentEq.type === 'Eq'
    ? (isolatedSide(state.currentEq.left, state.targetVar) ? state.currentEq.right : (isolatedSide(state.currentEq.right, state.targetVar) ? state.currentEq.left : null))
    : null;
  const hasCompound = hasCompoundFraction(resSide);
  const isFullySolved = state.goalReached && !hasCompound && !state.isAnimatingCompoundFraction;

  if (isFullySolved && !_lastAnnouncedSolvedEq) {
    _lastAnnouncedSolvedEq = true;
    const verbal = verbalizeEquation(state.currentEq);
    announceMathLive(`Obiettivo raggiunto! La grandezza ${verbalizeVar(state.targetVar)} è isolata: ${verbal}`, true);
  } else if (!isFullySolved) {
    _lastAnnouncedSolvedEq = false;
  }

  dom.objectiveStatus.hidden = false;
  if (state.isAnimatingCompoundFraction) {
    dom.objectiveStatus.textContent = '⚡ Semplificazione...';
    dom.objectiveStatus.className = 'status-badge status-progress';
    dom.objectiveBox.classList.remove('objective-done');
  } else {
    dom.objectiveStatus.textContent = isFullySolved ? '✓ Raggiunto' : '● In corso';
    dom.objectiveStatus.className = 'status-badge ' + (isFullySolved ? 'status-success' : 'status-progress');
    dom.objectiveBox.classList.toggle('objective-done', isFullySolved);
  }

  // Visibilità tasto ricomincia (sempre attivo quando c'è una formula caricata) e banner di completamento
  if (dom.btnRetryExercise) dom.btnRetryExercise.hidden = !state.startEq;
  if (dom.completionBanner) {
    dom.completionBanner.hidden = !isFullySolved;
    if (isFullySolved) {
      if (dom.completionTitle) dom.completionTitle.textContent = `🏆 Ottimo lavoro! Hai isolato ${t}`;
      if (dom.completionSubtitle) {
        dom.completionSubtitle.textContent = `Formula inversa ricavata con successo: ${toPretty(state.currentEq, 0)}.`;
      }
      if (state.mode === 'quiz' && state.quizManager) {
        state.quizManager.onGoalReached();
      }
    }
  }

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

  updateNumericalCalculator();
}

function setTargetVar(v) {
  state.targetVar = v;
  dismissDidacticBubble();
  updateObjective();
  renderEquationView();
  clearMessage();
  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(v)} è già isolata!`, 'success');
  } else {
    showMessage(`🎯 Nuovo obiettivo impostato: isolare ${prettyVar(v)}.`, 'info');
  }
}

// ---------------------------------------------------------------------------
// Laboratorio di Calcolo Numerico con Unità SI
// ---------------------------------------------------------------------------
function getSolvedExpression() {
  if (!state.currentEq || !state.targetVar) return null;
  const leftRaw = unwrap(state.currentEq.left);
  const rightRaw = unwrap(state.currentEq.right);

  if (isVar(leftRaw) && leftRaw.name === state.targetVar) {
    return rightRaw;
  }
  if (isVar(rightRaw) && rightRaw.name === state.targetVar) {
    return leftRaw;
  }
  return null;
}

function updateNumericalCalculator() {
  if (!dom.numericalCalcCard) return;

  if (!state.goalReached) {
    dom.numericalCalcCard.hidden = true;
    return;
  }

  const solvedExpr = getSolvedExpression();
  if (!solvedExpr) {
    dom.numericalCalcCard.hidden = true;
    return;
  }

  dom.numericalCalcCard.hidden = false;

  const targetInfo = getQuantityInfo(state.targetVar, state.baseFormula);
  if (dom.calcTargetVar) dom.calcTargetVar.textContent = prettyVar(state.targetVar);
  if (dom.calcFinalUnit) dom.calcFinalUnit.textContent = targetInfo.unit;

  const freeVars = Array.from(collectVars(solvedExpr)).filter(
    (v) => v !== state.targetVar && v !== 'pi' && v !== 'π' && v !== 'e' && v !== '±'
  );

  renderCalculatorInputs(freeVars, solvedExpr);
}

function hasPmSign(node) {
  node = unwrap(node);
  if (!node) return false;
  if (node.type === 'Add' && node.args.length === 2) {
    const first = unwrap(node.args[0]);
    if (first.type === 'Var' && first.name === '±') return true;
  }
  return false;
}

function renderCalculatorInputs(freeVars, solvedExpr) {
  if (!dom.calcInputsGrid) return;
  dom.calcInputsGrid.innerHTML = '';

  if (freeVars.length === 0) {
    const evalRes = evalWithEnv(solvedExpr, {});
    const formatted = evalRes.ok ? formatResultNumber(evalRes.value) : '—';
    const withPm = hasPmSign(solvedExpr);
    const displayVal = (evalRes.ok && withPm) ? `± ${formatted}` : formatted;
    if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = displayVal;
    if (dom.calcStepFormula) dom.calcStepFormula.textContent = `${prettyVar(state.targetVar)} = ${displayVal}`;
    return;
  }

  freeVars.forEach((v) => {
    const qInfo = getQuantityInfo(v, state.baseFormula);
    const item = document.createElement('div');
    item.className = 'calc-input-item';
    item.innerHTML = `
      <div class="calc-input-meta">
        <span class="calc-input-symbol">${prettyVar(v)}</span>
        <span class="calc-input-label" title="${escapeHtml(qInfo.name)}">${escapeHtml(qInfo.name)}</span>
      </div>
      <div class="calc-input-row">
        <input type="number" step="any" class="calc-num-input" data-var="${escapeHtml(v)}" placeholder="0" />
        <span class="calc-unit-badge">${escapeHtml(qInfo.unit)}</span>
      </div>
    `;

    const input = item.querySelector('.calc-num-input');
    input.addEventListener('input', () => runNumericalCalculation(solvedExpr));
    dom.calcInputsGrid.appendChild(item);
  });

  populateCalculatorSamples(freeVars, solvedExpr);
}

function populateCalculatorSamples(freeVars, solvedExpr) {
  if (!dom.calcInputsGrid) return;
  const inputs = dom.calcInputsGrid.querySelectorAll('.calc-num-input');
  inputs.forEach((input) => {
    const v = input.dataset.var;
    const qInfo = getQuantityInfo(v, state.baseFormula);
    input.value = qInfo.sample !== undefined ? qInfo.sample : 1;
  });
  runNumericalCalculation(solvedExpr);
}

function resetCalculatorInputs(solvedExpr) {
  if (!dom.calcInputsGrid) return;
  const inputs = dom.calcInputsGrid.querySelectorAll('.calc-num-input');
  inputs.forEach((input) => {
    input.value = '';
  });
  runNumericalCalculation(solvedExpr);
}

function runNumericalCalculation(solvedExpr) {
  if (!dom.calcInputsGrid) return;
  const inputs = dom.calcInputsGrid.querySelectorAll('.calc-num-input');
  const env = {};
  let anyEmpty = false;

  inputs.forEach((input) => {
    const v = input.dataset.var;
    const val = input.value.trim();
    if (val === '') {
      anyEmpty = true;
    } else {
      env[v] = parseFloat(val);
    }
  });

  const targetInfo = getQuantityInfo(state.targetVar, state.baseFormula);

  if (anyEmpty) {
    if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = '—';
    if (dom.calcStepFormula) dom.calcStepFormula.textContent = 'Inserisci tutte le grandezze per visualizzare il calcolo numerico.';
    if (dom.calcErrorNotice) dom.calcErrorNotice.hidden = true;
    return;
  }

  const evalRes = evalWithEnv(solvedExpr, env);
  if (evalRes.ok) {
    const formatted = formatResultNumber(evalRes.value);
    const withPm = hasPmSign(solvedExpr);
    const displayVal = withPm ? `± ${formatted}` : formatted;
    if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = displayVal;
    if (dom.calcErrorNotice) dom.calcErrorNotice.hidden = true;

    try {
      const substitutedAst = substituteVarsInAst(solvedExpr, env);
      const substitutedHtml = renderNode(substitutedAst, 'calc-step', { interactive: false });
      if (dom.calcStepFormula) {
        dom.calcStepFormula.innerHTML = `
          <span class="calc-step-var">${prettyVar(state.targetVar)}</span>
          <span class="calc-step-eq">=</span>
          <span class="calc-step-expr">${substitutedHtml}</span>
          <span class="calc-step-eq">=</span>
          <strong>${displayVal}</strong>
          <span class="calc-step-unit">${targetInfo.unit}</span>
        `;
      }
    } catch {
      if (dom.calcStepFormula) {
        dom.calcStepFormula.textContent = `${prettyVar(state.targetVar)} = ${displayVal} ${targetInfo.unit}`;
      }
    }
  } else {
    if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = 'Non calcolabile';
    if (dom.calcErrorNotice) {
      dom.calcErrorNotice.textContent = `⚠️ Impossibile completare il calcolo: ${evalRes.error || 'Errore nei valori numerici'}`;
      dom.calcErrorNotice.hidden = false;
    }
    if (dom.calcStepFormula) dom.calcStepFormula.textContent = 'Verifica i valori inseriti.';
  }
}

function copyCalculatorResult() {
  const val = dom.calcFinalNumber ? dom.calcFinalNumber.textContent.trim() : '';
  const unit = dom.calcFinalUnit ? dom.calcFinalUnit.textContent.trim() : '';
  const target = prettyVar(state.targetVar);
  if (!val || val === '—' || val === 'Non calcolabile') {
    showMessage('Nessun valore valido da copiare.', 'warning');
    return;
  }
  const text = `${target} = ${val} ${unit}`;
  navigator.clipboard.writeText(text).then(() => {
    const oldText = dom.btnCopyCalcResult.textContent;
    dom.btnCopyCalcResult.textContent = '✓ Copiato!';
    setTimeout(() => { if (dom.btnCopyCalcResult) dom.btnCopyCalcResult.textContent = oldText; }, 1800);
    showMessage(`Copiato negli appunti: ${text}`, 'success');
  }).catch(() => {
    showMessage(`Risultato: ${text}`, 'info');
  });
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
  if (!isInitial && state.quizManager) {
    state.quizManager.onMoveExecuted(!isFailed);
  }
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
  cancelCompoundFractionAnimation();
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
  cancelCompoundFractionAnimation();
  if (!state.startEq) return;
  playSoundClick();
  dismissDidacticBubble();
  clearSelection();
  clearPreview();
  if (state.baseFormula && state.targetVar) {
    loadFormula(state.baseFormula, state.targetVar);
    showMessage("Esercizio ricominciato dall'inizio.", 'info');
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
  updateObjective();
  renderEquationView();
  if (state.baseFormula) updateRulePanelInitial(state.baseFormula);
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
  if (state.clickDragToken) exitClickDragMode();
  if (dom.actionButtons && state.mode === 'free') dom.actionButtons.innerHTML = '';
  if (dom.actionHint && state.mode === 'free') {
    dom.actionHint.textContent = "Seleziona un elemento dell'equazione per vedere le operazioni disponibili.";
  }
}

function retryCurrentExercise() {
  cancelCompoundFractionAnimation();
  playSoundClick();
  dismissDidacticBubble();
  clearSelection();
  clearPreview();
  if (state.baseFormula && state.targetVar) {
    loadFormula(state.baseFormula, state.targetVar);
    showMessage(`🔄 Esercizio riavviato! Riprova a ricavare ${prettyVar(state.targetVar)}.`, 'info');
  } else if (state.startEq && state.targetVar) {
    loadFormula({
      id: 'custom-' + Date.now(),
      topic: 'formula personalizzata',
      name: 'formula personalizzata',
      formula: toPretty(state.startEq, 0),
      isolate: [state.targetVar],
      conditions: state.conditions ? state.conditions.slice() : [],
      difficulty: 3,
    }, state.targetVar);
    showMessage(`🔄 Esercizio riavviato! Riprova a ricavare ${prettyVar(state.targetVar)}.`, 'info');
  } else if (state.startEq) {
    resetExercise();
  }
}

function bindWorkAreaEvents() {
  const eqCard = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (eqCard) {
    eqCard.addEventListener('click', (e) => {
      if (state.mode !== 'auto') return;
      if (e.target.closest('.cross-layer, .didactic-bubble-anchor, .btn-mini, .close-btn, button')) return;
      executeNextAutoStep();
    });
  }
  dom.equationDisplay.addEventListener('click', (e) => {
    if (state.mode === 'auto') {
      executeNextAutoStep();
      return;
    }
    if (e.target === dom.equationDisplay) clearSelection();
  });
  dom.btnConfirm.addEventListener('click', confirmMove);
  dom.btnCancel.addEventListener('click', cancelPreview);
  if (dom.btnMirror) dom.btnMirror.addEventListener('click', applyMirrorRule);
  if (dom.btnReciprocal) dom.btnReciprocal.addEventListener('click', applyReciprocalRule);
  if (dom.btnDistribute) dom.btnDistribute.addEventListener('click', applyDistributeRule);
  if (dom.btnFactorCommon) dom.btnFactorCommon.addEventListener('click', applyFactorCommonRule);
  if (dom.btnCommonDenom) dom.btnCommonDenom.addEventListener('click', applyCommonDenominatorRule);
  if (dom.btnChangeSign) dom.btnChangeSign.addEventListener('click', applyChangeSignRule);
  if (dom.btnCross) dom.btnCross.addEventListener('click', () => toggleCrossMode());
  bindCrossDrag();
  if (dom.btnCopyLatexInline) dom.btnCopyLatexInline.addEventListener('click', copyLatexFormula);
  if (dom.btnQuickHint) dom.btnQuickHint.addEventListener('click', triggerQuickHint);
  if (dom.btnRetryExercise) dom.btnRetryExercise.addEventListener('click', retryCurrentExercise);
  if (dom.btnCompletionRetry) dom.btnCompletionRetry.addEventListener('click', retryCurrentExercise);
  if (dom.btnCompletionNext) {
    dom.btnCompletionNext.addEventListener('click', () => {
      playSoundClick();
      const { id, target } = randomExercise();
      loadFormula(getFormulaById(id), target);
    });
  }
  // Eventi per Didactic Bubble (Fumetto)
  if (dom.btnCloseBubble) dom.btnCloseBubble.addEventListener('click', dismissDidacticBubble);
  if (dom.btnBubbleOk) {
    dom.btnBubbleOk.addEventListener('click', () => {
      playSoundClick();
      dismissDidacticBubble();
    });
  }
  // Eventi per Laboratorio di Calcolo Numerico
  if (dom.btnCalcSample) {
    dom.btnCalcSample.addEventListener('click', () => {
      playSoundClick();
      const solvedExpr = getSolvedExpression();
      if (!solvedExpr) return;
      const freeVars = Array.from(collectVars(solvedExpr)).filter(
        (v) => v !== state.targetVar && v !== 'pi' && v !== 'π' && v !== 'e' && v !== '±'
      );
      populateCalculatorSamples(freeVars, solvedExpr);
    });
  }
  if (dom.btnCalcReset) {
    dom.btnCalcReset.addEventListener('click', () => {
      playSoundClick();
      const solvedExpr = getSolvedExpression();
      if (!solvedExpr) return;
      resetCalculatorInputs(solvedExpr);
    });
  }
  if (dom.btnCopyCalcResult) {
    dom.btnCopyCalcResult.addEventListener('click', copyCalculatorResult);
  }
}

function applyMirrorRule() {
  if (!state.currentEq) return;
  const newEq = Eq(clone(state.currentEq.right), clone(state.currentEq.left));
  animateMirrorSwap(state.currentEq, newEq, () => {
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
      spawnVictoryConfetti();
      showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
    }
  });
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

      if (dom.btnModeQuiz) {
        dom.btnModeQuiz.classList.remove('active');
        dom.btnModeQuiz.setAttribute('aria-pressed', 'false');
      }
      if (state.quizManager) {
        state.quizManager.setQuizModeActive(false);
      }

      const modeDesc = {
        free: '🔓 Modalità Libera: interagisci liberamente trascinando variabili e applicando operazioni.',
        auto: '⚡ Modalità Automatica: a ogni clic del mouse il programma esegue una operazione giustificando la regola.',
      };
      showMessage(modeDesc[state.mode] || '', 'info');
      const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
      if (card) card.classList.toggle('is-auto-mode', state.mode === 'auto');

      if (state.mode === 'auto') {
        showAutoMode();
      } else {
        const hintBadge = document.querySelector('.drag-hint-badge');
        const hintText = document.querySelector('.drag-hint-text');
        if (hintBadge && hintText) {
          hintBadge.textContent = '✨ Modalità Libera';
          hintText.innerHTML = 'Trascina una variabile dall\'altra parte dell\'uguale: rilasciala <strong>sotto la linea di frazione</strong> per dividere, o al numeratore per moltiplicare!';
        }
        renderEquationView();
        clearSelection();
      }
    });
  });

  if (dom.btnModeQuiz) {
    dom.btnModeQuiz.addEventListener('click', () => {
      const isCurrentlyQuiz = state.mode === 'quiz';
      if (isCurrentlyQuiz) {
        // Disattiva e torna a Libera
        state.mode = 'free';
        dom.btnModeQuiz.classList.remove('active');
        dom.btnModeQuiz.setAttribute('aria-pressed', 'false');
        document.querySelectorAll('.mode-btn').forEach((b) => {
          const isFree = b.dataset.mode === 'free';
          b.classList.toggle('active', isFree);
          b.setAttribute('aria-pressed', isFree ? 'true' : 'false');
        });
        if (state.quizManager) state.quizManager.setQuizModeActive(false);
        const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
        if (card) card.classList.remove('is-auto-mode');
        const hintBadge = document.querySelector('.drag-hint-badge');
        const hintText = document.querySelector('.drag-hint-text');
        if (hintBadge && hintText) {
          hintBadge.textContent = '✨ Modalità Libera';
          hintText.innerHTML = 'Trascina una variabile dall\'altra parte dell\'uguale: rilasciala <strong>sotto la linea di frazione</strong> per dividere, o al numeratore per moltiplicare!';
        }
        renderEquationView();
        clearSelection();
        showMessage('Modalità Quiz disattivata. Tornato in Modalità Libera.', 'info');
      } else {
        // Attiva Quiz Mode
        state.mode = 'quiz';
        dom.btnModeQuiz.classList.add('active');
        dom.btnModeQuiz.setAttribute('aria-pressed', 'true');
        document.querySelectorAll('.mode-btn').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        if (state.quizManager) state.quizManager.setQuizModeActive(true);
        const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
        if (card) card.classList.remove('is-auto-mode');
        const hintBadge = document.querySelector('.drag-hint-badge');
        const hintText = document.querySelector('.drag-hint-text');
        if (hintBadge && hintText) {
          hintBadge.textContent = '🎯 Modalità Quiz';
          hintText.innerHTML = 'Risolvi l\'esercizio nel <strong>minor numero di passaggi possibile</strong>. Trascina variabili o usa le operazioni!';
        }
        renderEquationView();
        clearSelection();
        showMessage('🎯 Modalità Eserciziario / Quiz attivata! Risolvi le formule con la massima efficienza algebrica.', 'info');
      }
    });
  }
}

let _isAutoStepping = false;

function executeNextAutoStep() {
  if (_isAutoStepping) return;
  _isAutoStepping = true;
  setTimeout(() => { _isAutoStepping = false; }, 250);

  if (!state.currentEq) {
    showMessage('Seleziona prima una formula dalla libreria per iniziare.', 'info');
    return;
  }
  if (state.goalReached) {
    playSuccessChime();
    showMessage(`🎉 Obiettivo già raggiunto! La grandezza ${prettyVar(state.targetVar)} è isolata.`, 'success');
    return;
  }

  const sug = suggestNextStep(state.currentEq, state.targetVar);
  if (!sug.found) {
    showMessage(sug.message || 'Nessun ulteriore passaggio automatico trovato.', 'info');
    return;
  }

  const res = performAction(state.currentEq, sug.action, { target: state.targetVar });
  if (!res.ok) {
    showInvalidMove(res.error, res.hint, { label: sug.action.label });
    return;
  }

  // Se l'operazione cancella fattori, mostra l'esplosione animata prima di applicarla
  const cancellables = findCancellableDomElements(sug.action);
  if (cancellables.length > 0) {
    playSoundExplosion();
    cancellables.forEach((el) => {
      el.classList.add('var-exploding', 'cross-dissolving');
      spawnVariableExplosion(el);
    });
    setTimeout(() => {
      applyAutoStepState(sug, res);
    }, 420);
    return;
  }

  applyAutoStepState(sug, res);
}

function applyAutoStepState(sug, res) {
  playSoundForRule(sug.action.ruleKey);

  const nextEq = res.equation;
  state.conditions = mergeConditions(state.conditions, res.conditions || []);
  state.selectedId = null;
  clearPreview();

  const rule = res.rule || {
    id: sug.action.ruleKey || sug.action.id,
    name: res.ruleName || sug.action.label,
    principle: res.rulePrinciple || sug.reason || 'Principio di equivalenza delle equazioni.',
    explanation: res.explanationKey || null,
  };

  pushHistory({
    equation: clone(nextEq),
    ruleName: rule.name || sug.action.label,
    rulePrinciple: rule.principle || res.rulePrinciple || '',
    ruleId: rule.id || sug.action.id,
    steps: res.steps || (sug.reason ? [sug.reason] : []),
    conditions: (res.conditions || []).slice(),
    explanationKey: rule.explanation || null,
    note: res.note || sug.reason || null,
    verified: true,
  }, false);

  const isTargetOnRight = isolatedSide(nextEq.right, state.targetVar);
  if (isTargetOnRight) {
    state.currentEq = nextEq;
    renderEquationView();
    showRulePanel(rule, res, state.currentEq);
    animateOperationBadge(sug.action.label, sug.action.operandText);
    clearMessage();

    setTimeout(() => {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      animateMirrorSwap(state.currentEq, flipped, () => {
        state.currentEq = flipped;
        state.goalReached = true;
        pushHistory({
          equation: clone(flipped),
          ruleName: 'Regola dello specchio (scambio membri)',
          rulePrinciple: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
          ruleId: 'swapSides',
          steps: ['Scambio i due membri per la proprietà simmetrica.'],
          conditions: state.conditions.slice(),
          explanationKey: 'scambioMembri',
          note: null,
          verified: true,
        }, false);
        updateObjective();
        renderEquationView();
        if (checkAndAnimateCompoundFraction()) return;
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata con successo!`, 'success');
        showAutoMode();
      });
    }, 450);
    return;
  }

  if (sug.action.ruleKey === 'swapSides') {
    animateMirrorSwap(state.currentEq, nextEq, () => {
      state.currentEq = nextEq;
      state.goalReached = isGoalReached(state.currentEq, state.targetVar);
      updateObjective();
      renderEquationView();
      showRulePanel(rule, res, state.currentEq);
      animateOperationBadge(sug.action.label, sug.action.operandText);
      clearMessage();
      if (state.goalReached) {
        if (checkAndAnimateCompoundFraction()) return;
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata con successo! Regola: ${rule.name}`, 'success');
      } else {
        showMessage(`✓ ${sug.action.label}: ${sug.reason || rule.principle}`, 'success');
      }
      showAutoMode();
    });
    return;
  }

  state.currentEq = nextEq;
  state.goalReached = isGoalReached(state.currentEq, state.targetVar);
  updateObjective();
  renderEquationView();
  showRulePanel(rule, res, state.currentEq);
  animateOperationBadge(sug.action.label, sug.action.operandText);
  clearMessage();

  if (state.goalReached) {
    if (checkAndAnimateCompoundFraction()) return;
    playSuccessChime();
    spawnVictoryConfetti();
    showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata con successo! Regola: ${rule.name}`, 'success');
  } else {
    showMessage(`✓ ${sug.action.label}: ${sug.reason || rule.principle}`, 'success');
  }

  showAutoMode();
}

function showAutoMode() {
  if (!state.currentEq) return;

  const card = dom.equationDisplay ? dom.equationDisplay.closest('.equation-display-card') : null;
  if (card) card.classList.add('is-auto-mode');

  const hintBadge = document.querySelector('.drag-hint-badge');
  const hintText = document.querySelector('.drag-hint-text');
  if (hintBadge && hintText) {
    hintBadge.textContent = '⚡ Modalità Automatica';
    hintText.innerHTML = '<strong>Fai clic ovunque con il mouse</strong> (sull\'equazione o sul pulsante in basso) per eseguire il passaggio successivo!';
  }

  if (state.goalReached) {
    if (dom.actionHint) dom.actionHint.textContent = 'Modalità Automatica:';
    if (dom.actionButtons) {
      dom.actionButtons.innerHTML = `
        <div class="auto-mode-finished">
          <div class="auto-success-header">🎉 Formula isolata con successo!</div>
          <p>La grandezza <strong>${prettyVar(state.targetVar)}</strong> è stata completamente isolata. Puoi cambiare la grandezza da isolare in alto o selezionare un'altra formula dalla libreria.</p>
        </div>
      `;
    }
    return;
  }

  const sug = suggestNextStep(state.currentEq, state.targetVar);
  const roadmap = computeRoadmap(state.currentEq, state.targetVar);

  if (dom.actionHint) {
    dom.actionHint.textContent = `Modalità Automatica — A ogni clic del mouse il programma esegue un'operazione (${roadmap.length} passaggi stimati):`;
  }

  if (!dom.actionButtons) return;
  dom.actionButtons.innerHTML = '';

  if (!sug.found) {
    dom.actionButtons.innerHTML = `<p class="placeholder small">${escapeHtml(sug.message || 'Nessuna sequenza automatica diretta trovata per questa formula.')}</p>`;
    return;
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'action-btn auto-step-btn';
  nextBtn.type = 'button';
  nextBtn.innerHTML = `
    <span class="action-label">🖱️ Fai clic per eseguire: ${escapeHtml(sug.action.label)}</span>
    <span class="action-desc"><strong>Giustificazione della regola:</strong> ${escapeHtml(sug.reason || sug.action.description || '')}</span>
  `;
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    executeNextAutoStep();
  });
  dom.actionButtons.appendChild(nextBtn);

  if (roadmap.length > 0) {
    const roadmapCard = document.createElement('div');
    roadmapCard.className = 'roadmap-card';
    roadmapCard.innerHTML = `
      <div class="roadmap-header">Piano di risoluzione (passaggi rimanenti):</div>
      <ol class="roadmap-list">
        ${roadmap.map((s, idx) => `
          <li class="roadmap-item ${idx === 0 ? 'roadmap-current' : ''}">
            <span class="roadmap-step-num">${idx + 1}</span>
            <div class="roadmap-step-content">
              <strong>${escapeHtml(s.action.label)}</strong>
              <p>${escapeHtml(s.reason || s.action.description || '')}</p>
            </div>
          </li>
        `).join('')}
      </ol>
    `;
    dom.actionButtons.appendChild(roadmapCard);
  }
}

function computeRoadmap(startEquation, target) {
  let curr = clone(startEquation);
  const steps = [];
  let iter = 0;
  while (iter < 12 && !isGoalReached(curr, target)) {
    const sug = suggestNextStep(curr, target);
    if (!sug.found) break;
    steps.push(sug);
    const res = performAction(curr, sug.action, { target });
    if (!res.ok) break;
    curr = res.equation;
    iter++;
  }
  return steps;
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
  let multipleSpecified = false;
  if (t && (t.includes(',') || t.includes(';'))) {
    const parts = t.split(/[,;\s]+/).filter(Boolean);
    const validParts = parts.filter((p) => vars.has(p) || [...vars].some((v) => v.toLowerCase() === p.toLowerCase()));
    if (validParts.length > 0) {
      t = [...vars].find((v) => v.toLowerCase() === validParts[0].toLowerCase()) || validParts[0];
      multipleSpecified = true;
    } else {
      showCustomError(`Inserisci una sola grandezza da isolare alla volta (es. "${[...vars][0]}"). Grandezze presenti: ${[...vars].join(', ')}.`);
      return;
    }
  }

  if (!t) {
    const L = unwrap(eq.left);
    if (L.type === 'Var') t = L.name;
    else { showCustomError('Specifica la grandezza da isolare (una sola lettera, es. ' + [...vars][0] + ').'); return; }
  }
  if (!vars.has(t)) {
    const alt = [...vars].find((v) => v.toLowerCase() === t.toLowerCase());
    if (alt) t = alt;
    else { showCustomError(`La grandezza "${t}" non compare nella formula. Inserisci una sola grandezza presente: ${[...vars].join(', ')}.`); return; }
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
  if (multipleSpecified) {
    showMessage(`È possibile isolare una sola grandezza alla volta: impostato obiettivo su "${prettyVar(t)}". Puoi cambiare grandezza da isolare in qualsiasi momento dall'interfaccia!`, 'info');
  } else {
    showMessage(`Formula personalizzata caricata. Obiettivo: isolare ${prettyVar(t)}.`, 'success');
  }
}

function showCustomError(msg) {
  dom.customError.hidden = false;
  dom.customError.textContent = msg;
}

function bindGlobalEvents() {
  dom.btnHelp.addEventListener('click', showHelp);
  dom.btnContrast.addEventListener('click', toggleContrast);
  if (dom.btnTheme) dom.btnTheme.addEventListener('click', toggleTheme);

  if (dom.btnLimMode) {
    dom.btnLimMode.addEventListener('click', () => {
      const isLim = document.body.classList.toggle('lim-mode');
      if (dom.equationDisplay) dom.equationDisplay.classList.toggle('lim-mode', isLim);
      dom.btnLimMode.setAttribute('aria-pressed', isLim ? 'true' : 'false');
      dom.btnLimMode.classList.toggle('active', isLim);
      announceMathLive(isLim ? 'Modalità Lavagna Interattiva LIM attivata: calibrazione stilo e zone di tocco estese abilitate' : 'Modalità LIM disattivata');
    });
  }

  if (dom.btnSpeakEquation) {
    dom.btnSpeakEquation.addEventListener('click', () => {
      if (!state.currentEq) {
        announceMathLive('Nessuna equazione caricata da leggere');
        return;
      }
      const text = verbalizeEquation(state.currentEq);
      announceMathLive(`Lettura formula: ${text}`);
      dom.btnSpeakEquation.setAttribute('aria-pressed', 'true');
      speakMath(text, () => {
        if (dom.btnSpeakEquation) dom.btnSpeakEquation.setAttribute('aria-pressed', 'false');
      });
    });
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { document.getElementById(btn.dataset.close).hidden = true; });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.quizCompletionModalBackdrop && !dom.quizCompletionModalBackdrop.hidden) {
        dom.quizCompletionModalBackdrop.hidden = true;
        return;
      }
      if (dom.quizDashboardBackdrop && !dom.quizDashboardBackdrop.hidden) {
        dom.quizDashboardBackdrop.hidden = true;
        return;
      }
      if (dom.worksheetModalBackdrop && !dom.worksheetModalBackdrop.hidden) {
        dom.worksheetModalBackdrop.hidden = true;
        return;
      }
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
  if (on) {
    document.documentElement.setAttribute('data-contrast', 'high');
    announceMathLive('Modalità Alto Contrasto WCAG AAA attivata');
  } else {
    document.documentElement.removeAttribute('data-contrast');
    announceMathLive('Modalità Alto Contrasto disattivata');
  }
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

// ---------------------------------------------------------------------------
// Suoni di interazione
// ---------------------------------------------------------------------------
function _audioCtx() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    return C ? new C() : null;
  } catch { return null; }
}

// 1° principio: whoosh ascendente (la variabile scavalca il segno =)
function playSoundTransport() {
  try {
    const ctx = _audioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// 2° principio: snap bitonale (moltiplicazione/divisione/semplificazione)
function playSoundFraction() {
  try {
    const ctx = _audioCtx(); if (!ctx) return;
    [[440, 0, 0.15], [880, 0.02, 0.12]].forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.14, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur);
    });
  } catch {}
}

// Mossa non valida: buzz discendente
function playSoundInvalid() {
  try {
    const ctx = _audioCtx(); if (!ctx) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35);
    osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(213, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(64, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
    [osc1, osc2].forEach(o => { o.connect(gain); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4); });
    gain.connect(ctx.destination);
  } catch {}
}

function playSoundClick() {
  try {
    const ctx = _audioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// Semplificazione con croce: esplosione (noise burst + boom)
function playSoundExplosion() {
  try {
    const ctx = _audioCtx(); if (!ctx) return;
    const sr = ctx.sampleRate;
    const dur = 0.55;

    // Rumore bianco filtrato (esplosione)
    const buf = ctx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200, ctx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    noise.connect(filt); filt.connect(noiseGain); noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);

    // Boom basso
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140, ctx.currentTime);
    boom.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.4);
    boomGain.gain.setValueAtTime(0.55, ctx.currentTime);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
    boom.connect(boomGain); boomGain.connect(ctx.destination);
    boom.start(ctx.currentTime); boom.stop(ctx.currentTime + 0.45);

    // Crepitio iniziale (click attack)
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square'; click.frequency.value = 80;
    clickGain.gain.setValueAtTime(0.4, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    click.connect(clickGain); clickGain.connect(ctx.destination);
    click.start(ctx.currentTime); click.stop(ctx.currentTime + 0.05);
  } catch {}
}

// Quali ruleKey corrispondono al 1° principio
const _FIRST_PRINCIPLE = new Set(['moveTerm', 'addBoth', 'subBoth', 'swapSides']);
function playSoundForRule(ruleKey) {
  if (_FIRST_PRINCIPLE.has(ruleKey)) playSoundTransport();
  else playSoundFraction();
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
      '<div class="latex-math-preview">' + mathHtml + '</div>';
  }
  return syntax;
}

function argsEmpty(t) { return !t; }

function resolveVar(token, vars) {
  if (vars.has(token)) return token;
  const clean = token.replace(/^\\/, '');
  if (vars.has(clean)) return clean;
  const lower = clean.toLowerCase();
  const greek = GREEK_MAP && GREEK_MAP[lower];
  if (greek && vars.has(greek)) return greek;
  const alt = [...vars].find((v) => v.toLowerCase() === lower);
  if (alt) return alt;
  return null;
}

function saveLatex() {
  const syntax = previewLatex();
  if (!syntax) return;

  const name = (dom.latexName.value || '').trim() || 'formula da LaTeX';
  const targetRaw = (dom.latexTarget.value || '').trim();

  let eq;
  try { eq = parseEquation(syntax); }
  catch (e) { showLatexError('Errore di sintassi: ' + e.message); return; }

  const vars = collectVars(eq);
  let isolateList = [...vars];

  if (targetRaw) {
    const parts = targetRaw.split(/[,;\s]+/).filter(Boolean);
    const resolved = [];
    for (const p of parts) {
      const match = resolveVar(p, vars);
      if (match) {
        if (!resolved.includes(match)) resolved.push(match);
      } else {
        showLatexError(`La grandezza "${p}" non compare nella formula. Presenti: ${[...vars].join(', ')}.`);
        return;
      }
    }
    if (resolved.length > 0) {
      isolateList = resolved;
    }
  }

  try {
    saveUserFormula({
      name,
      formula: syntax,
      latex: (dom.latexInput.value || '').trim(),
      topic: 'Le mie formule',
      isolate: isolateList,
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
