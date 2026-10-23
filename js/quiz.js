// js/quiz.js — Modulo per la Modalità Eserciziario / Quiz Interattivo.
//
// Gestisce livelli di difficoltà (Base, Intermedio, Avanzato), tracciamento
// dell'efficienza dei passaggi (mosse ottimali vs eseguite), persistenza
// locale in localStorage e badge di maestria didattica.
//
// Funziona al 100% lato client ed è interamente testabile in ambiente Node.js.

import { FORMULAS, TOPICS } from './formulas.js';
import { solveFormulaSteps } from './worksheet-export.js';
import { prettyVar, renderEquation } from './render.js';
import { clone, toPretty } from './ast.js';
import { parseEquation } from './parser.js';
import { isGoalReached } from './algebra.js';

// ---------------------------------------------------------------------------
// 1. Costanti e Livelli di Difficoltà
// ---------------------------------------------------------------------------

export const QUIZ_STORAGE_KEY = 'formuleInverse.quizProgress';

export const DIFFICULTY_LEVELS = {
  easy: {
    id: 'easy',
    name: 'Base',
    label: '🟢 Base (1-3 passaggi)',
    description: 'Equazioni lineari e prodotti/frazioni dirette risolvibili con principi di equivalenza base.',
    minSteps: 1,
    maxSteps: 3,
    baseXp: 15,
    color: '#10b981',
  },
  medium: {
    id: 'medium',
    name: 'Intermedio',
    label: '🟡 Intermedio (4-5 passaggi)',
    description: 'Frazioni composte, somme algebriche e binomi con isolamento articolato.',
    minSteps: 4,
    maxSteps: 5,
    baseXp: 30,
    color: '#f59e0b',
  },
  hard: {
    id: 'hard',
    name: 'Avanzato',
    label: '🔴 Avanzato (6+ passaggi)',
    description: 'Formule avanzate con radici, potenze, m.c.m. o raccoglimenti a fattor comune.',
    minSteps: 6,
    maxSteps: 99,
    baseXp: 50,
    color: '#ef4444',
  },
};

// ---------------------------------------------------------------------------
// 2. Classificazione della Difficoltà ed Estrazione Esercizi
// ---------------------------------------------------------------------------

/**
 * Classifica la difficoltà di un esercizio per isolare targetVar nella formula.
 * Utilizza solveFormulaSteps per calcolare la traiettoria algebrica ottimale.
 *
 * @param {string|object} formulaInput - Stringa formula o oggetto formula
 * @param {string} targetVar - Grandezza da isolare
 * @returns {object} { level, steps, solvable, solution }
 */
export function classifyFormulaDifficulty(formulaInput, targetVar) {
  const formulaStr = typeof formulaInput === 'string' ? formulaInput : formulaInput.formula;
  const sol = solveFormulaSteps(formulaStr, targetVar);

  if (!sol || !sol.success) {
    return {
      level: 'hard',
      steps: 99,
      solvable: false,
      solution: null,
    };
  }

  const steps = sol.steps ? sol.steps.length : 0;
  let level = 'easy';
  if (steps >= 6) {
    level = 'hard';
  } else if (steps >= 4) {
    level = 'medium';
  } else {
    level = 'easy';
  }

  return {
    level,
    steps,
    solvable: true,
    solution: sol,
  };
}

/**
 * Ottiene la lista degli esercizi candidati per il quiz filtrati per livello e/o argomento.
 * Esclude le grandezze già banalmente isolate a primo membro (es. in v = s/t, isolare v ha 0 passaggi).
 *
 * @param {string} [level='all'] - 'easy' | 'medium' | 'hard' | 'all'
 * @param {string|null} [topic=null] - Argomento (es. 'cinematica') o null
 * @returns {Array<object>} Lista di { formulaEntry, targetVar, optimalSteps, level }
 */
export function getQuizFormulas(level = 'all', topic = null) {
  const candidates = [];

  for (const f of FORMULAS) {
    if (topic && f.topic !== topic) continue;
    if (!f.isolate || f.isolate.length === 0) continue;

    let eq;
    try {
      eq = parseEquation(f.formula);
    } catch {
      continue;
    }

    for (const t of f.isolate) {
      // Salta se la grandezza è già isolata nella formula di partenza (a sinistra o a destra)
      if (isGoalReached(eq, t)) {
        continue;
      }

      const diff = classifyFormulaDifficulty(f.formula, t);
      if (!diff.solvable || diff.steps === 0) continue;

      if (level === 'all' || diff.level === level) {
        candidates.push({
          formulaEntry: f,
          targetVar: t,
          optimalSteps: diff.steps,
          level: diff.level,
        });
      }
    }
  }

  return candidates;
}

/**
 * Seleziona un esercizio casuale per la modalità Quiz.
 *
 * @param {string} [level='all'] - 'easy' | 'medium' | 'hard' | 'all'
 * @param {string|null} [topic=null] - Argomento opzionale
 * @returns {object} { formulaEntry, targetVar, optimalSteps, level }
 */
export function getRandomQuizExercise(level = 'all', topic = null) {
  let list = getQuizFormulas(level, topic);
  if (list.length === 0 && topic) {
    // Fallback senza filtro argomento
    list = getQuizFormulas(level, null);
  }
  if (list.length === 0) {
    // Fallback globale su qualsiasi livello
    list = getQuizFormulas('all', null);
  }
  if (list.length === 0) {
    // Fallback di sicurezza estremo
    const fallbackFormula = FORMULAS[0];
    return {
      formulaEntry: fallbackFormula,
      targetVar: fallbackFormula.isolate[1] || 't',
      optimalSteps: 2,
      level: 'easy',
    };
  }

  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// ---------------------------------------------------------------------------
// 3. Efficienza delle Mosse & Calcolo Stelle
// ---------------------------------------------------------------------------

/**
 * Calcola l'efficienza dei passaggi confrontando le mosse ottimali con quelle eseguite.
 *
 * @param {number} optimalSteps - Mosse minime calcolate dal risolutore
 * @param {number} performedSteps - Mosse algebriche valide eseguite dallo studente
 * @returns {object} { efficiency, stars, isOptimal, optimalSteps, performedSteps, label }
 */
export function calculateStepEfficiency(optimalSteps, performedSteps) {
  const opt = Math.max(1, Number(optimalSteps) || 1);
  const perf = Math.max(0, Number(performedSteps) || 0);

  // Efficienza percentuale (10%..100%)
  const efficiency = Math.max(
    10,
    Math.min(100, Math.round((opt / Math.max(opt, perf)) * 100))
  );

  let stars = 1;
  let isOptimal = false;
  let label = '⭐ Risolto con passaggi aggiuntivi';

  if (perf <= opt) {
    stars = 3;
    isOptimal = true;
    label = '⭐⭐⭐ Perfetto! Mosse ottimali';
  } else if (perf <= opt + 2) {
    stars = 2;
    label = '⭐⭐ Molto buono! Percorso efficiente';
  } else {
    stars = 1;
    label = '⭐ Completato';
  }

  return {
    efficiency,
    stars,
    isOptimal,
    optimalSteps: opt,
    performedSteps: perf,
    label,
  };
}

/**
 * Calcola i punti esperienza (XP) guadagnati per un esercizio.
 */
export function calculateExerciseXp(level, stars, mistakesCount = 0, elapsedSeconds = 0) {
  const lvlConfig = DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS.easy;
  let xp = lvlConfig.baseXp;

  if (stars === 3) xp += 15;
  else if (stars === 2) xp += 5;

  if (mistakesCount === 0) xp += 5; // Bonus accuratezza
  if (elapsedSeconds > 0 && elapsedSeconds <= 45) xp += 5; // Bonus velocità

  return xp;
}

/**
 * Calcola il livello e il titolo di maestria dello studente in base ai punti totali.
 */
export function getPlayerRank(totalXp = 0) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const ranks = [
    { title: 'Apprendista dei Principi', level: 1, minXp: 0, nextXp: 50, avatar: '🥉' },
    { title: 'Praticante Algebrico', level: 2, minXp: 50, nextXp: 150, avatar: '🥈' },
    { title: 'Esperto delle Formule', level: 3, minXp: 150, nextXp: 300, avatar: '🥇' },
    { title: 'Maestro dell\'Equivalenza', level: 4, minXp: 300, nextXp: 500, avatar: '💎' },
    { title: 'Gran Maestro STEM', level: 5, minXp: 500, nextXp: 1000, avatar: '👑' },
  ];

  let current = ranks[0];
  for (const r of ranks) {
    if (xp >= r.minXp) current = r;
  }

  const range = current.nextXp - current.minXp;
  const currentInLevel = Math.max(0, xp - current.minXp);
  const progressPercent = Math.min(100, Math.round((currentInLevel / range) * 100));

  return {
    title: current.title,
    level: current.level,
    avatar: current.avatar,
    currentXp: xp,
    minXp: current.minXp,
    nextXp: current.nextXp,
    progressPercent,
  };
}

// ---------------------------------------------------------------------------
// 4. Distintivi di Maestria (Mastery Badges)
// ---------------------------------------------------------------------------

export const MASTERY_BADGES = [
  {
    id: 'first_win',
    title: 'Primo Traguardo',
    icon: '🎯',
    description: 'Completa con successo il tuo primo esercizio in modalità Quiz.',
    category: 'milestone',
    check: (stats) => stats.totalSolved >= 1,
  },
  {
    id: 'optimal_sniper',
    title: 'Cecchino Algebrico',
    icon: '⚡',
    description: 'Risolvi un esercizio con efficienza 100% (mosse ottimali).',
    category: 'skill',
    check: (stats, res) => !!(res && res.stars === 3 && res.performedSteps <= res.optimalSteps),
  },
  {
    id: 'flawless',
    title: 'Mente Rigorosa',
    icon: '🛡️',
    description: 'Risolvi un esercizio senza commettere nessun errore di principio.',
    category: 'skill',
    check: (stats, res) => !!(res && res.mistakesCount === 0),
  },
  {
    id: 'easy_trio',
    title: 'Basi d\'Acciaio',
    icon: '🟢',
    description: 'Completa 3 esercizi di livello Base.',
    category: 'difficulty',
    check: (stats) => (stats.solvedByLevel && stats.solvedByLevel.easy >= 3),
  },
  {
    id: 'medium_trio',
    title: 'Architetto delle Formule',
    icon: '🟡',
    description: 'Completa 3 esercizi di livello Intermedio.',
    category: 'difficulty',
    check: (stats) => (stats.solvedByLevel && stats.solvedByLevel.medium >= 3),
  },
  {
    id: 'hard_master',
    title: 'Campione delle Inverse',
    icon: '🔴',
    description: 'Completa 2 esercizi di livello Avanzato.',
    category: 'difficulty',
    check: (stats) => (stats.solvedByLevel && stats.solvedByLevel.hard >= 2),
  },
  {
    id: 'triple_three_stars',
    title: 'Caccia alle Tre Stelle',
    icon: '⭐',
    description: 'Ottieni 3 stelle (punteggio perfetto) in almeno 3 esercizi.',
    category: 'mastery',
    check: (stats) => stats.perfectSolves >= 3,
  },
  {
    id: 'streak_3',
    title: 'Inarrestabile (x3)',
    icon: '🔥',
    description: 'Raggiungi una serie di 3 esercizi completati consecutivamente.',
    category: 'streak',
    check: (stats) => stats.bestStreak >= 3,
  },
  {
    id: 'streak_5',
    title: 'Dominio Totale (x5)',
    icon: '🌋',
    description: 'Raggiungi una serie di 5 esercizi completati consecutivamente.',
    category: 'streak',
    check: (stats) => stats.bestStreak >= 5,
  },
  {
    id: 'speed_demon',
    title: 'Risolutore Rapido',
    icon: '⏱️',
    description: 'Risolvi un esercizio in meno di 45 secondi.',
    category: 'speed',
    check: (stats, res) => !!(res && res.elapsedSeconds > 0 && res.elapsedSeconds <= 45),
  },
  {
    id: 'stem_explorer',
    title: 'Esploratore STEM',
    icon: '🌐',
    description: 'Completa esercizi in almeno 3 argomenti fisici o matematici diversi.',
    category: 'exploration',
    check: (stats) => Array.isArray(stats.topicsExplored) && stats.topicsExplored.length >= 3,
  },
  {
    id: 'xp_centurion',
    title: 'Club dei 100 XP',
    icon: '💯',
    description: 'Accumula almeno 100 Punti Esperienza nel Quiz.',
    category: 'points',
    check: (stats) => stats.points >= 100,
  },
];

/**
 * Valuta quali badge devono essere sbloccati dato lo stato attuale e l'ultimo risultato.
 *
 * @param {object} stats - Oggetto statistiche studente
 * @param {object|null} [latestResult=null] - Dettagli dell'ultimo esercizio completato
 * @returns {Array<string>} Array degli ID dei badge appena sbloccati
 */
export function checkBadgesToUnlock(stats, latestResult = null) {
  const newlyUnlocked = [];
  const currentBadges = stats.badges || {};

  for (const badge of MASTERY_BADGES) {
    if (currentBadges[badge.id] && currentBadges[badge.id].unlocked) {
      continue;
    }
    try {
      if (badge.check(stats, latestResult)) {
        newlyUnlocked.push(badge.id);
      }
    } catch (e) {
      // Ignora errori di verifica badge
    }
  }

  return newlyUnlocked;
}

// ---------------------------------------------------------------------------
// 5. Persistenza Locale (localStorage)
// ---------------------------------------------------------------------------

/**
 * Restituisce la struttura iniziale vuota per i progressi del quiz.
 */
export function getDefaultProgress() {
  return {
    totalSolved: 0,
    solvedByLevel: {
      easy: 0,
      medium: 0,
      hard: 0,
    },
    perfectSolves: 0,
    totalOptimalSteps: 0,
    totalPerformedSteps: 0,
    averageEfficiency: 100,
    streak: 0,
    bestStreak: 0,
    points: 0,
    topicsExplored: [],
    badges: {},
    recentHistory: [],
  };
}

function getSafeStorage(customStorage) {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Carica i dati dei progressi da storage o restituisce il default.
 */
export function loadQuizProgress(customStorage = null) {
  const store = getSafeStorage(customStorage);
  if (!store) return getDefaultProgress();

  try {
    const raw = store.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const data = JSON.parse(raw);
    const def = getDefaultProgress();
    return {
      ...def,
      ...data,
      solvedByLevel: { ...def.solvedByLevel, ...(data.solvedByLevel || {}) },
      badges: { ...(data.badges || {}) },
      topicsExplored: Array.isArray(data.topicsExplored) ? data.topicsExplored : [],
      recentHistory: Array.isArray(data.recentHistory) ? data.recentHistory : [],
    };
  } catch (err) {
    return getDefaultProgress();
  }
}

/**
 * Salva i dati dei progressi in storage.
 */
export function saveQuizProgress(progress, customStorage = null) {
  const store = getSafeStorage(customStorage);
  if (!store) return false;
  try {
    store.setItem(QUIZ_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Azzera tutti i progressi e i badge del quiz.
 */
export function resetQuizProgress(customStorage = null) {
  const store = getSafeStorage(customStorage);
  if (store) {
    try {
      store.removeItem(QUIZ_STORAGE_KEY);
    } catch (e) {}
  }
  return getDefaultProgress();
}

/**
 * Registra il completamento di un esercizio nel quiz, aggiornando statistiche, XP e badge.
 *
 * @param {object} progress - Stato progressi corrente
 * @param {object} exerciseDetails - Dati dell'esercizio completato
 * @param {object|null} [customStorage=null] - Storage opzionale
 * @returns {object} { updatedProgress, newlyUnlockedBadges, xpEarned, stars, efficiency }
 */
export function recordQuizResult(progress, exerciseDetails, customStorage = null) {
  const p = progress ? JSON.parse(JSON.stringify(progress)) : getDefaultProgress();
  const d = exerciseDetails || {};

  const level = d.level || 'easy';
  const optSteps = Math.max(1, Number(d.optimalSteps) || 1);
  const perfSteps = Math.max(0, Number(d.performedSteps) || 0);
  const mistakes = Math.max(0, Number(d.mistakesCount) || 0);
  const elapsed = Math.max(0, Number(d.elapsedSeconds) || 0);
  const topic = d.topic || 'fisica';

  const effResult = calculateStepEfficiency(optSteps, perfSteps);
  const xpEarned = calculateExerciseXp(level, effResult.stars, mistakes, elapsed);

  // Aggiornamento contatori
  p.totalSolved = (p.totalSolved || 0) + 1;
  p.solvedByLevel = p.solvedByLevel || { easy: 0, medium: 0, hard: 0 };
  p.solvedByLevel[level] = (p.solvedByLevel[level] || 0) + 1;

  if (effResult.stars === 3) {
    p.perfectSolves = (p.perfectSolves || 0) + 1;
  }

  p.totalOptimalSteps = (p.totalOptimalSteps || 0) + optSteps;
  p.totalPerformedSteps = (p.totalPerformedSteps || 0) + perfSteps;
  p.averageEfficiency = Math.round(
    (p.totalOptimalSteps / Math.max(p.totalOptimalSteps, p.totalPerformedSteps)) * 100
  );

  // Streak
  p.streak = (p.streak || 0) + 1;
  p.bestStreak = Math.max(p.bestStreak || 0, p.streak);

  // XP
  p.points = (p.points || 0) + xpEarned;

  // Topic esplorati
  p.topicsExplored = Array.isArray(p.topicsExplored) ? p.topicsExplored : [];
  if (topic && !p.topicsExplored.includes(topic)) {
    p.topicsExplored.push(topic);
  }

  // Risultato arricchito per la verifica dei badge
  const resultForBadges = {
    ...d,
    level,
    optimalSteps: optSteps,
    performedSteps: perfSteps,
    mistakesCount: mistakes,
    elapsedSeconds: elapsed,
    stars: effResult.stars,
    efficiency: effResult.efficiency,
    isOptimal: effResult.isOptimal,
    xpEarned,
  };

  // Sblocco badge
  const newlyUnlocked = checkBadgesToUnlock(p, resultForBadges);
  p.badges = p.badges || {};
  const nowIso = new Date().toISOString();
  for (const bId of newlyUnlocked) {
    p.badges[bId] = {
      unlocked: true,
      unlockedAt: nowIso,
    };
  }

  // Storico recente (massimo 20)
  p.recentHistory = Array.isArray(p.recentHistory) ? p.recentHistory : [];
  p.recentHistory.unshift({
    timestamp: nowIso,
    formulaId: d.formulaId || '',
    formulaName: d.formulaName || '',
    formulaStr: d.formulaStr || '',
    targetVar: d.targetVar || '',
    level,
    optimalSteps: optSteps,
    performedSteps: perfSteps,
    stars: effResult.stars,
    efficiency: effResult.efficiency,
    xpEarned,
  });
  if (p.recentHistory.length > 20) {
    p.recentHistory = p.recentHistory.slice(0, 20);
  }

  saveQuizProgress(p, customStorage);

  return {
    updatedProgress: p,
    newlyUnlockedBadges: newlyUnlocked,
    xpEarned,
    stars: effResult.stars,
    efficiency: effResult.efficiency,
    isOptimal: effResult.isOptimal,
  };
}

// ---------------------------------------------------------------------------
// 6. Controller Interattivo per l'UI (Integrazione con App)
// ---------------------------------------------------------------------------

/**
 * Inizializza il gestore Quiz collegandolo con il DOM dell'applicazione e lo stato globale.
 *
 * @param {object} dom - Riferimenti agli elementi DOM dell'app
 * @param {object} state - Stato globale dell'app
 * @param {object} handlers - Funzioni di callback dell'app (loadFormula, etc.)
 */
export function initQuizManager(dom, state, handlers = {}) {
  let activeQuizExercise = null;
  let quizStartTime = null;
  let quizTimerInterval = null;
  let performedMoves = 0;
  let mistakesCount = 0;
  let selectedLevel = 'easy';
  let selectedTopic = '';

  // Popola la select degli argomenti del quiz
  if (dom.quizTopicSelect) {
    dom.quizTopicSelect.innerHTML = '<option value="">Tutti gli argomenti</option>';
    TOPICS.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      dom.quizTopicSelect.appendChild(opt);
    });
    dom.quizTopicSelect.addEventListener('change', () => {
      selectedTopic = dom.quizTopicSelect.value;
      startNewQuizExercise();
    });
  }

  // Eventi per i pulsanti di selezione del livello
  const levelBtns = [
    { btn: dom.quizLevelEasy, level: 'easy' },
    { btn: dom.quizLevelMedium, level: 'medium' },
    { btn: dom.quizLevelHard, level: 'hard' },
    { btn: dom.quizLevelAll, level: 'all' },
  ];

  levelBtns.forEach(({ btn, level }) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      levelBtns.forEach((b) => b.btn && b.btn.classList.remove('active'));
      btn.classList.add('active');
      selectedLevel = level;
      startNewQuizExercise();
    });
  });

  // Tasti Nuovo Esercizio e Dashboard
  if (dom.quizBtnNew) {
    dom.quizBtnNew.addEventListener('click', () => startNewQuizExercise());
  }
  if (dom.quizBtnDashboard) {
    dom.quizBtnDashboard.addEventListener('click', () => openDashboardModal());
  }
  if (dom.btnQuizDashboard) {
    dom.btnQuizDashboard.addEventListener('click', () => openDashboardModal());
  }

  // Modal completamento
  if (dom.quizBtnNextExercise) {
    dom.quizBtnNextExercise.addEventListener('click', () => {
      closeCompletionModal();
      startNewQuizExercise();
    });
  }
  if (dom.quizBtnRetryExercise) {
    dom.quizBtnRetryExercise.addEventListener('click', () => {
      closeCompletionModal();
      retryCurrentQuizExercise();
    });
  }
  if (dom.quizBtnViewStats) {
    dom.quizBtnViewStats.addEventListener('click', () => {
      closeCompletionModal();
      openDashboardModal();
    });
  }
  if (dom.quizBtnViewBoard) {
    dom.quizBtnViewBoard.addEventListener('click', () => closeCompletionModal());
  }
  if (dom.quizBtnCloseCompletion) {
    dom.quizBtnCloseCompletion.addEventListener('click', () => closeCompletionModal());
  }

  // Modal Dashboard
  if (dom.quizBtnCloseDashboard) {
    dom.quizBtnCloseDashboard.addEventListener('click', () => closeDashboardModal());
  }
  if (dom.quizBtnCloseDashboardBottom) {
    dom.quizBtnCloseDashboardBottom.addEventListener('click', () => closeDashboardModal());
  }
  if (dom.quizBtnResetProgress) {
    dom.quizBtnResetProgress.addEventListener('click', () => {
      if (confirm('Sei sicuro di voler azzerare tutti i progressi e i badge del Quiz? Questa azione non può essere annullata.')) {
        resetQuizProgress();
        renderDashboardModal();
      }
    });
  }

  // Chiudi cliccando sui backdrop
  if (dom.quizCompletionModalBackdrop) {
    dom.quizCompletionModalBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.quizCompletionModalBackdrop) closeCompletionModal();
    });
  }
  if (dom.quizDashboardBackdrop) {
    dom.quizDashboardBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.quizDashboardBackdrop) closeDashboardModal();
    });
  }

  function startTimer() {
    stopTimer();
    quizStartTime = Date.now();
    updateTimerDisplay();
    quizTimerInterval = setInterval(updateTimerDisplay, 1000);
  }

  function stopTimer() {
    if (quizTimerInterval) {
      clearInterval(quizTimerInterval);
      quizTimerInterval = null;
    }
  }

  function updateTimerDisplay() {
    if (!dom.quizTimer || !quizStartTime) return;
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    dom.quizTimer.textContent = `⏱️ ${mins}:${secs}`;
  }

  function updateQuizHud() {
    if (!dom.quizHud) return;
    const isQuizMode = state.mode === 'quiz';
    dom.quizHud.hidden = !isQuizMode;
    if (!isQuizMode) return;

    if (activeQuizExercise) {
      const lvlConfig = DIFFICULTY_LEVELS[activeQuizExercise.level] || DIFFICULTY_LEVELS.easy;
      if (dom.quizCurrentLevel) {
        dom.quizCurrentLevel.textContent = `Livello: ${lvlConfig.name}`;
        dom.quizCurrentLevel.style.borderColor = lvlConfig.color;
      }
      if (dom.quizMovesCount) dom.quizMovesCount.textContent = String(performedMoves);
      if (dom.quizOptimalCount) dom.quizOptimalCount.textContent = String(activeQuizExercise.optimalSteps);

      const eff = calculateStepEfficiency(activeQuizExercise.optimalSteps, performedMoves);
      if (dom.quizEfficiencyBadge) {
        dom.quizEfficiencyBadge.textContent = `${eff.efficiency}% ${'⭐'.repeat(eff.stars)}`;
      }
    }
  }

  function startNewQuizExercise() {
    const exercise = getRandomQuizExercise(selectedLevel, selectedTopic || null);
    activeQuizExercise = exercise;
    performedMoves = 0;
    mistakesCount = 0;

    startTimer();
    updateQuizHud();

    if (handlers.loadFormula) {
      handlers.loadFormula(exercise.formulaEntry, exercise.targetVar);
    }
  }

  function retryCurrentQuizExercise() {
    if (!activeQuizExercise) {
      startNewQuizExercise();
      return;
    }
    performedMoves = 0;
    mistakesCount = 0;
    startTimer();
    updateQuizHud();
    if (handlers.loadFormula) {
      handlers.loadFormula(activeQuizExercise.formulaEntry, activeQuizExercise.targetVar);
    }
  }

  function onMoveExecuted(isValid) {
    if (state.mode !== 'quiz') return;
    if (isValid) {
      performedMoves++;
    } else {
      mistakesCount++;
    }
    updateQuizHud();
  }

  function onGoalReached() {
    if (state.mode !== 'quiz' || !activeQuizExercise) return;
    if (performedMoves === 0) return;
    stopTimer();

    const elapsed = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
    const currentProgress = loadQuizProgress();

    const exerciseDetails = {
      formulaId: activeQuizExercise.formulaEntry.id,
      formulaName: activeQuizExercise.formulaEntry.name,
      formulaStr: activeQuizExercise.formulaEntry.formula,
      targetVar: activeQuizExercise.targetVar,
      level: activeQuizExercise.level,
      topic: activeQuizExercise.formulaEntry.topic,
      optimalSteps: activeQuizExercise.optimalSteps,
      performedSteps: performedMoves,
      mistakesCount,
      elapsedSeconds: elapsed,
      finalEq: state && state.currentEq ? clone(state.currentEq) : null,
    };

    const res = recordQuizResult(currentProgress, exerciseDetails);
    showCompletionModal(res, exerciseDetails);
  }

  function showCompletionModal(result, details) {
    if (!dom.quizCompletionModalBackdrop) return;

    if (dom.quizCompletionStars) {
      dom.quizCompletionStars.textContent = '⭐'.repeat(result.stars);
    }
    if (dom.quizCompletionTitle) {
      dom.quizCompletionTitle.textContent =
        result.stars === 3
          ? '🏆 Risoluzione Perfetta!'
          : result.stars === 2
          ? '🎉 Ottimo Lavoro!'
          : '✓ Esercizio Completato!';
    }
    if (dom.quizCompletionMsg) {
      const varP = prettyVar(details.targetVar);
      dom.quizCompletionMsg.textContent = `Hai isolato ${varP} in ${details.formulaName}.`;
    }

    if (dom.quizCompletionFormula) {
      const eqToRender = details.finalEq || (state && state.currentEq);
      if (eqToRender) {
        dom.quizCompletionFormula.innerHTML = renderEquation(eqToRender, {
          interactive: false,
          targetVar: details.targetVar,
        });
        dom.quizCompletionFormula.setAttribute('aria-label', `Formula finale ricavata: ${toPretty(eqToRender, 0)}`);
      }
    }

    if (dom.quizCompletionStats) {
      dom.quizCompletionStats.innerHTML = `
        <div class="completion-stat-row">
          <span>Mosse eseguite:</span>
          <strong>${details.performedSteps} (su ${details.optimalSteps} ottimali)</strong>
        </div>
        <div class="completion-stat-row">
          <span>Efficienza algebrica:</span>
          <strong class="${result.stars === 3 ? 'text-success' : ''}">${result.efficiency}%</strong>
        </div>
        <div class="completion-stat-row">
          <span>Tempo impiegato:</span>
          <strong>${details.elapsedSeconds}s</strong>
        </div>
        <div class="completion-stat-row">
          <span>Punti Guadagnati:</span>
          <strong class="text-primary">+${result.xpEarned} XP</strong>
        </div>
      `;
    }

    // Mostra i badge appena sbloccati
    if (dom.quizCompletionBadges) {
      if (result.newlyUnlockedBadges && result.newlyUnlockedBadges.length > 0) {
        dom.quizCompletionBadges.hidden = false;
        const badgesHtml = result.newlyUnlockedBadges.map((bId) => {
          const badgeObj = MASTERY_BADGES.find((b) => b.id === bId);
          if (!badgeObj) return '';
          return `
            <div class="unlocked-badge-celebration">
              <span class="unlocked-badge-icon">${badgeObj.icon}</span>
              <div class="unlocked-badge-info">
                <strong>Nuovo Badge Sbloccato: ${badgeObj.title}!</strong>
                <p>${badgeObj.description}</p>
              </div>
            </div>
          `;
        }).join('');
        dom.quizCompletionBadges.innerHTML = `
          <div class="unlocked-badges-banner">
            ${badgesHtml}
          </div>
        `;
      } else {
        dom.quizCompletionBadges.hidden = true;
        dom.quizCompletionBadges.innerHTML = '';
      }
    }

    dom.quizCompletionModalBackdrop.hidden = false;
  }

  function closeCompletionModal() {
    if (dom.quizCompletionModalBackdrop) {
      dom.quizCompletionModalBackdrop.hidden = true;
    }
  }

  function openDashboardModal() {
    renderDashboardModal();
    if (dom.quizDashboardBackdrop) {
      dom.quizDashboardBackdrop.hidden = false;
    }
  }

  function closeDashboardModal() {
    if (dom.quizDashboardBackdrop) {
      dom.quizDashboardBackdrop.hidden = true;
    }
  }

  function renderDashboardModal() {
    const progress = loadQuizProgress();
    const rank = getPlayerRank(progress.points);

    if (dom.quizRankTitle) dom.quizRankTitle.textContent = rank.title;
    if (dom.quizRankLevel) dom.quizRankLevel.textContent = `Livello ${rank.level}`;
    if (dom.quizRankAvatar) dom.quizRankAvatar.textContent = rank.avatar;
    if (dom.quizXpText) dom.quizXpText.textContent = `${rank.currentXp} XP`;
    if (dom.quizXpBar) dom.quizXpBar.style.width = `${rank.progressPercent}%`;

    if (dom.quizStatTotal) dom.quizStatTotal.textContent = String(progress.totalSolved || 0);
    if (dom.quizStatEasy) dom.quizStatEasy.textContent = String((progress.solvedByLevel && progress.solvedByLevel.easy) || 0);
    if (dom.quizStatMedium) dom.quizStatMedium.textContent = String((progress.solvedByLevel && progress.solvedByLevel.medium) || 0);
    if (dom.quizStatHard) dom.quizStatHard.textContent = String((progress.solvedByLevel && progress.solvedByLevel.hard) || 0);
    if (dom.quizStatEfficiency) dom.quizStatEfficiency.textContent = `${progress.averageEfficiency || 100}%`;
    if (dom.quizStatStreak) dom.quizStatStreak.textContent = `${progress.bestStreak || 0} 🔥`;

    // Griglia Badge
    if (dom.quizBadgesGrid) {
      const unlockedCount = Object.values(progress.badges || {}).filter((b) => b && b.unlocked).length;
      if (dom.quizBadgesCountBadge) {
        dom.quizBadgesCountBadge.textContent = `${unlockedCount} / ${MASTERY_BADGES.length} Sbloccati`;
      }

      dom.quizBadgesGrid.innerHTML = MASTERY_BADGES.map((b) => {
        const isUnlocked = progress.badges && progress.badges[b.id] && progress.badges[b.id].unlocked;
        const cls = isUnlocked ? 'quiz-badge-card unlocked' : 'quiz-badge-card locked';
        const dateStr = isUnlocked && progress.badges[b.id].unlockedAt
          ? new Date(progress.badges[b.id].unlockedAt).toLocaleDateString('it-IT')
          : 'Bloccato';
        return `
          <div class="${cls}">
            <div class="badge-icon-box">${b.icon}</div>
            <div class="badge-content-box">
              <strong class="badge-title">${b.title}</strong>
              <p class="badge-desc">${b.description}</p>
              <span class="badge-status-tag">${isUnlocked ? '✓ Sbloccato (' + dateStr + ')' : '🔒 Da sbloccare'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Storico Recente
    if (dom.quizHistoryList) {
      if (!progress.recentHistory || progress.recentHistory.length === 0) {
        dom.quizHistoryList.innerHTML = '<li class="history-empty">Nessun esercizio completato finora.</li>';
      } else {
        dom.quizHistoryList.innerHTML = progress.recentHistory.map((h) => {
          const starsStr = '⭐'.repeat(h.stars);
          return `
            <li class="quiz-history-item">
              <div class="quiz-history-head">
                <span class="history-formula-name"><strong>${h.formulaName || h.formulaStr}</strong> (Isola ${prettyVar(h.targetVar)})</span>
                <span class="history-stars">${starsStr}</span>
              </div>
              <div class="quiz-history-details">
                <span>Livello: <em>${h.level}</em></span>
                <span>Mosse: <strong>${h.performedSteps}/${h.optimalSteps}</strong></span>
                <span>Efficienza: <strong>${h.efficiency}%</strong></span>
                <span class="text-primary">+${h.xpEarned} XP</span>
              </div>
            </li>
          `;
        }).join('');
      }
    }
  }

  function setQuizModeActive(active) {
    if (active) {
      if (!activeQuizExercise) {
        startNewQuizExercise();
      } else {
        startTimer();
        updateQuizHud();
      }
    } else {
      stopTimer();
      updateQuizHud();
      closeCompletionModal();
      closeDashboardModal();
    }
  }

  return {
    startNewQuizExercise,
    retryCurrentQuizExercise,
    onMoveExecuted,
    onGoalReached,
    setQuizModeActive,
    openDashboardModal,
    closeDashboardModal,
    closeCompletionModal,
    getActiveExercise: () => activeQuizExercise,
  };
}
