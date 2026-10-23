// app.js — Gestione dell'applicazione: stato globale, interfaccia, libreria formule,
// selezione, anteprima, modalità di risoluzione e calcolo numerico.
// I componenti specializzati sono modularizzati in ui-canvas.js, ui-numpad.js,
// ui-history.js, ui-modals.js, worksheet-export.js, quiz.js e a11y.js.

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

// Moduli UI specializzati estratti dall'architettura modulare
import {
  initHistory, pushHistory, renderHistory, undo, redo,
  resetExercise, copyStepsText, copyStepsLatex,
} from './ui-history.js';
import {
  initModals, showHelp, copyLatexFormula, bindEditorEvents,
  loadCustomFormula, bindLatexEvents, bindStorageEvents,
  renderMyFormulas, showDidacticBubble, dismissDidacticBubble,
  triviallyIsolated,
} from './ui-modals.js';
import {
  initNumpad, renderKeypad, updateKeypadHint, handleKeypadOpClick,
  handleKeypadOperandClick, applyKeypadMove, applyMirrorRule,
  applyReciprocalRule, applyDistributeRule, applyFactorCommonRule,
  applyCommonDenominatorRule, applyChangeSignRule,
} from './ui-numpad.js';
import {
  initCanvas, renderEquationView, scheduleNeutralCleanup,
  enterClickDragMode, exitClickDragMode, applyClickDragToDropzone,
  flashTokenRejected, highlightLandedToken, flashSignChanged,
  animateOperationBadge, animateMirrorSwap, cancelActiveSwapAnimations,
  toggleCrossMode, clearCrossMarks, crossPickToken,
  dissolveThenApplyCross, applyCrossCancel, flashCrossError,
  dissolveElements, bindCrossDrag, applyDragResult, finalizeDragResult,
  cancelCompoundFractionAnimation, checkAndAnimateCompoundFraction,
  startCompoundFractionAnimation, spawnVariableExplosion, spawnVictoryConfetti,
  findCancellableDomElements,
} from './ui-canvas.js';

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
// Contesto dell'applicazione (condiviso con i sottomoduli UI)
// ---------------------------------------------------------------------------
const appContext = {
  loadFormula,
  updateObjective,
  updateRulePanelInitial,
  showRulePanel,
  showAutoMode,
  executeNextAutoStep,
  clearPreview,
  clearSelection,
  selectElement,
  renderActions,
  renderConditions,
  renderEquationView,
  renderKeypad,
  pushHistory,
  renderHistory,
  undo,
  redo,
  resetExercise,
  showMessage,
  clearMessage,
  showInvalidMove,
  showDidacticBubble,
  dismissDidacticBubble,
  playSoundClick,
  playSoundTransport,
  playSoundFraction,
  playSoundExplosion,
  playSoundInvalid,
  playSuccessChime,
  animateOperationBadge,
  animateMirrorSwap,
  flashSignChanged,
  spawnVictoryConfetti,
  checkAndAnimateCompoundFraction,
  cancelCompoundFractionAnimation,
  cancelActiveSwapAnimations,
};

// ---------------------------------------------------------------------------
// Inizializzazione
// ---------------------------------------------------------------------------
function init() {
  initTheme();
  populateTopics();
  renderLibrary();
  bindLibraryEvents();

  // Inizializzazione moduli UI estratti
  initCanvas(dom, state, appContext);
  initNumpad(dom, state, appContext);
  initHistory(dom, state, appContext);
  initModals(dom, state, appContext);

  bindWorkAreaEvents();
  bindModeEvents();
  bindGlobalEvents();

  if (dom.crossLayer) dom.crossLayer.hidden = true;
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
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.jump;
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        setActive(targetId);
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const sectionIds = ['library-panel', 'equation-display-card', 'history-panel', 'numerical-calc-card'];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      let mostVisible = null;
      let maxRatio = 0;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisible = entry.target;
        }
      });
      if (mostVisible) {
        setActive(mostVisible.id);
      }
    }, {
      root: null,
      threshold: [0.1, 0.3, 0.6],
      rootMargin: '-50px 0px -100px 0px'
    });

    sections.forEach((s) => observer.observe(s));
  }
}

// ---------------------------------------------------------------------------
// A. Libreria Formule
// ---------------------------------------------------------------------------
const parsedFormulaCache = new Map();
function parseFormulaCached(formulaStr) {
  if (!parsedFormulaCache.has(formulaStr)) {
    parsedFormulaCache.set(formulaStr, parseEquation(formulaStr));
  }
  return parsedFormulaCache.get(formulaStr);
}

function populateTopics() {
  if (!dom.libraryTopic) return;
  dom.libraryTopic.innerHTML = '<option value="">Tutti gli argomenti</option>';
  for (const t of TOPICS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    dom.libraryTopic.appendChild(opt);
  }
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

function loadFormula(formulaEntry, targetVar) {
  cancelCompoundFractionAnimation();
  cancelActiveSwapAnimations();
  dismissDidacticBubble();
  state.baseFormula = formulaEntry;
  let eq;
  try {
    eq = parseEquation(formulaEntry.formula);
  } catch (e) {
    showMessage('Impossibile caricare la formula: ' + e.message, 'error');
    return;
  }
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
  toggleCrossMode(false);
  clearPreview();

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
  showMessage(`Formula "${formulaEntry.name}" caricata. Obiettivo: isolare ${prettyVar(targetVar)}.`, 'info');
  renderLibrary();

  if (state.mode === 'auto') {
    showAutoMode();
  }
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
// Selezione ed Esecuzione Azioni Algebriche
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

  if (state.pendingMove.kind === 'cross') {
    const { idA, idB, result } = state.pendingMove;
    state.pendingMove = null;
    dissolveThenApplyCross(idA, idB, result);
    return;
  }

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

function clearSelection() {
  state.selectedId = null;
  if (state.clickDragToken) exitClickDragMode();
  if (dom.actionButtons && state.mode === 'free') dom.actionButtons.innerHTML = '';
  if (dom.actionHint && state.mode === 'free') {
    dom.actionHint.textContent = "Seleziona un elemento dell'equazione per vedere le operazioni disponibili.";
  }
}

// ---------------------------------------------------------------------------
// C. Pannello Regole & Spiegazioni
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
// E. Obiettivo & Laboratorio di Calcolo Numerico
// ---------------------------------------------------------------------------
let _lastAnnouncedSolvedEq = false;
function updateObjective() {
  const f = state.baseFormula;
  const t = prettyVar(state.targetVar);
  dom.objectiveText.textContent = f ? `ricavare ${t} — ${f.name} (${f.formula})` : `ricavare ${t}`;
  state.goalReached = isGoalReached(state.currentEq, state.targetVar);

  if (state.goalReached && state.currentEq && state.currentEq.type === 'Eq') {
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

function renderConditions() {
  if (state.conditions.length === 0) {
    dom.conditionsBox.hidden = true;
    return;
  }
  dom.conditionsBox.hidden = false;
  dom.conditionsList.innerHTML = state.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
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
// Messaggi e Notifiche
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

// ---------------------------------------------------------------------------
// Modalità (Libera, Automatica, Quiz)
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
// Suoni di Interazione
// ---------------------------------------------------------------------------
function _audioCtx() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    return C ? new C() : null;
  } catch { return null; }
}

function playSoundTransport() {
  try {
    const actx = _audioCtx(); if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(580, actx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.0001, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, actx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.32);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(actx.currentTime); osc.stop(actx.currentTime + 0.35);
  } catch {}
}

function playSoundFraction() {
  try {
    const actx = _audioCtx(); if (!actx) return;
    [[440, 0, 0.15], [880, 0.02, 0.12]].forEach(([freq, delay, dur]) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.14, actx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + delay + dur);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(actx.currentTime + delay); osc.stop(actx.currentTime + delay + dur);
    });
  } catch {}
}

function playSoundInvalid() {
  try {
    const actx = _audioCtx(); if (!actx) return;
    const osc1 = actx.createOscillator();
    const osc2 = actx.createOscillator();
    const gain = actx.createGain();
    osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(200, actx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.35);
    osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(213, actx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(64, actx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.18, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.38);
    [osc1, osc2].forEach(o => { o.connect(gain); o.start(actx.currentTime); o.stop(actx.currentTime + 0.4); });
    gain.connect(actx.destination);
  } catch {}
}

function playSoundClick() {
  try {
    const actx = _audioCtx(); if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.08);
  } catch {}
}

function playSoundExplosion() {
  try {
    const actx = _audioCtx(); if (!actx) return;
    const sr = actx.sampleRate;
    const dur = 0.55;

    const buf = actx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource();
    noise.buffer = buf;
    const filt = actx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200, actx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.45);
    const noiseGain = actx.createGain();
    noiseGain.gain.setValueAtTime(0.55, actx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.5);
    noise.connect(filt); filt.connect(noiseGain); noiseGain.connect(actx.destination);
    noise.start(actx.currentTime); noise.stop(actx.currentTime + dur);

    const sub = actx.createOscillator();
    const subGain = actx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, actx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(32, actx.currentTime + 0.4);
    subGain.gain.setValueAtTime(0.5, actx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.45);
    sub.connect(subGain); subGain.connect(actx.destination);
    sub.start(actx.currentTime); sub.stop(actx.currentTime + 0.48);

    const click = actx.createOscillator();
    const clickGain = actx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1800, actx.currentTime);
    click.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.035);
    clickGain.gain.setValueAtTime(0.4, actx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.04);
    click.connect(clickGain); clickGain.connect(actx.destination);
    click.start(actx.currentTime); click.stop(actx.currentTime + 0.05);
  } catch {}
}

const _FIRST_PRINCIPLE = new Set(['moveTerm', 'addBoth', 'subBoth', 'swapSides']);
function playSoundForRule(ruleKey) {
  if (_FIRST_PRINCIPLE.has(ruleKey)) playSoundTransport();
  else playSoundFraction();
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const actx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, actx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(actx.currentTime + idx * 0.1);
      osc.stop(actx.currentTime + idx * 0.1 + 0.35);
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// Eventi Area di Lavoro e Globali
// ---------------------------------------------------------------------------
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
  if (dom.btnCopyLatexInline) dom.btnCopyLatexInline.addEventListener('click', copyLatexFormula);
  if (dom.btnQuickHint) dom.btnQuickHint.addEventListener('click', triggerQuickHint);
  if (dom.btnRetryExercise) dom.btnRetryExercise.addEventListener('click', retryCurrentExercise);
  if (dom.completionRetry) dom.btnCompletionRetry.addEventListener('click', retryCurrentExercise);
  if (dom.btnCompletionNext) {
    dom.btnCompletionNext.addEventListener('click', () => {
      playSoundClick();
      const { id, target } = randomExercise();
      loadFormula(getFormulaById(id), target);
    });
  }
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
