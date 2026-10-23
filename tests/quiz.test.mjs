// tests/quiz.test.mjs — Test unitari per il modulo Interactive Practice / Quiz Mode (js/quiz.js)

import {
  DIFFICULTY_LEVELS,
  classifyFormulaDifficulty,
  getQuizFormulas,
  getRandomQuizExercise,
  calculateStepEfficiency,
  calculateExerciseXp,
  getPlayerRank,
  MASTERY_BADGES,
  checkBadgesToUnlock,
  getDefaultProgress,
  loadQuizProgress,
  saveQuizProgress,
  resetQuizProgress,
  recordQuizResult,
} from '../js/quiz.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- Inizio test unitari per js/quiz.js (Modalità Eserciziario / Quiz) ---');

// Mock localStorage per i test
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// 1. Validazione Costanti e Livelli di Difficoltà
console.log('\n1. Verifica costanti e livelli di difficoltà...');
assert(DIFFICULTY_LEVELS.easy && DIFFICULTY_LEVELS.easy.id === 'easy', 'Livello easy configurato');
assert(DIFFICULTY_LEVELS.medium && DIFFICULTY_LEVELS.medium.id === 'medium', 'Livello medium configurato');
assert(DIFFICULTY_LEVELS.hard && DIFFICULTY_LEVELS.hard.id === 'hard', 'Livello hard configurato');
assert(DIFFICULTY_LEVELS.easy.maxSteps <= 3, 'Livello easy ammette al massimo 3 passaggi');
assert(DIFFICULTY_LEVELS.medium.minSteps === 4 && DIFFICULTY_LEVELS.medium.maxSteps === 5, 'Livello medium ammette 4-5 passaggi');
assert(DIFFICULTY_LEVELS.hard.minSteps >= 6, 'Livello hard richiede 6 o più passaggi');

// 2. Classificazione della Difficoltà
console.log('\n2. Classificazione della difficoltà tramite risolutore algebrico...');
const diffVst_s = classifyFormulaDifficulty('v = s/t', 's');
assert(diffVst_s.solvable, 'v = s/t per isolare s deve essere risolvibile');
assert(diffVst_s.steps === 3, `v = s/t per s richiede 3 passaggi (trovati: ${diffVst_s.steps})`);
assert(diffVst_s.level === 'easy', 'v = s/t -> s deve essere classificata come easy');

const diffFma_m = classifyFormulaDifficulty('F = m*a', 'm');
assert(diffFma_m.solvable && diffFma_m.level === 'easy', 'F = m*a -> m deve essere di livello easy');

const diffSvt_v = classifyFormulaDifficulty('s = s0 + v*t', 'v');
assert(diffSvt_v.solvable, 's = s0 + v*t per isolare v deve essere risolvibile');
assert(diffSvt_v.level === 'medium' || diffSvt_v.level === 'hard', `s = s0 + v*t -> v deve essere medium o hard (passaggi: ${diffSvt_v.steps})`);

// 3. Selezione Esercizi Quiz (Filtro e Casualità)
console.log('\n3. Generazione e filtraggio candidati quiz...');
const easyFormulas = getQuizFormulas('easy');
assert(easyFormulas.length > 0, `Devono esistere formule per il livello easy (trovate: ${easyFormulas.length})`);
for (const cand of easyFormulas.slice(0, 10)) {
  assert(cand.optimalSteps <= 3, `La formula ${cand.formulaEntry.id} -> ${cand.targetVar} deve avere <= 3 passaggi (ha ${cand.optimalSteps})`);
  assert(!cand.formulaEntry.formula.startsWith(cand.targetVar + ' ='), `Il target ${cand.targetVar} non deve essere banalmente isolato all'inizio`);
}

const mediumFormulas = getQuizFormulas('medium');
assert(mediumFormulas.length > 0, `Devono esistere formule per il livello medium (trovate: ${mediumFormulas.length})`);
for (const cand of mediumFormulas.slice(0, 10)) {
  assert(cand.optimalSteps === 4 || cand.optimalSteps === 5, `La formula ${cand.formulaEntry.id} deve avere 4 o 5 passaggi (ha ${cand.optimalSteps})`);
}

const hardFormulas = getQuizFormulas('hard');
assert(hardFormulas.length > 0, `Devono esistere formule per il livello hard (trovate: ${hardFormulas.length})`);
for (const cand of hardFormulas.slice(0, 10)) {
  assert(cand.optimalSteps >= 6, `La formula ${cand.formulaEntry.id} deve avere >= 6 passaggi (ha ${cand.optimalSteps})`);
}

const randomEx = getRandomQuizExercise('easy');
assert(randomEx && randomEx.formulaEntry && randomEx.targetVar, 'getRandomQuizExercise restituisce un esercizio valido');
assert(randomEx.optimalSteps <= 3, 'getRandomQuizExercise per easy ha mosse ottimali corrette');

// 4. Calcolo Efficienza delle Mosse (Step-Efficiency)
console.log('\n4. Calcolo efficienza delle mosse (Step-Efficiency) e stelle...');
const effPerfect = calculateStepEfficiency(2, 2);
assert(effPerfect.efficiency === 100, 'Mosse ottimali uguali a quelle eseguite = 100% efficienza');
assert(effPerfect.stars === 3, 'Efficienza 100% dà 3 stelle');
assert(effPerfect.isOptimal === true, 'isOptimal deve essere true');

const effSubOptimal = calculateStepEfficiency(2, 4);
assert(effSubOptimal.stars === 2, '2 mosse extra su 2 ottimali dà 2 stelle');
assert(effSubOptimal.efficiency === 50, '2/4 mosse = 50% efficienza');
assert(effSubOptimal.isOptimal === false, 'isOptimal deve essere false');

const effLow = calculateStepEfficiency(2, 8);
assert(effLow.stars === 1, 'Molti passaggi extra dà 1 stella');
assert(effLow.efficiency === 25, '2/8 mosse = 25% efficienza');

// 5. XP e Ranks di Maestria
console.log('\n5. Calcolo XP e progressione Rank dello studente...');
const xpBase = calculateExerciseXp('easy', 3, 0, 30);
assert(xpBase === 15 + 15 + 5 + 5, `XP perfetti easy: atteso 40, calcolato: ${xpBase}`);

const rankInit = getPlayerRank(0);
assert(rankInit.level === 1 && rankInit.title === 'Apprendista dei Principi', '0 XP = Apprendista dei Principi');
assert(rankInit.progressPercent === 0, '0 XP = 0% progresso');

const rankMed = getPlayerRank(100);
assert(rankMed.level === 2 && rankMed.title === 'Praticante Algebrico', '100 XP = Praticante Algebrico');
assert(rankMed.progressPercent === 50, '100 XP su range 50..150 = 50% progresso');

const rankHigh = getPlayerRank(600);
assert(rankHigh.level === 5 && rankHigh.title === 'Gran Maestro STEM', '600 XP = Gran Maestro STEM');

// 6. Badges di Maestria
console.log('\n6. Verifica catalogo e condizioni dei Distintivi di Maestria (Badges)...');
assert(MASTERY_BADGES.length === 12, `Il catalogo deve contenere esattamente 12 distintivi (trovati: ${MASTERY_BADGES.length})`);

const mockStatsInit = getDefaultProgress();
const unlockedInit = checkBadgesToUnlock(mockStatsInit, null);
assert(unlockedInit.length === 0, 'Nessun badge sbloccato a statistiche vuote');

// Verifica sblocco primo traguardo
const statsAfterFirst = { ...mockStatsInit, totalSolved: 1 };
const unlockedAfterFirst = checkBadgesToUnlock(statsAfterFirst, { stars: 3, performedSteps: 2, optimalSteps: 2, mistakesCount: 0 });
assert(unlockedAfterFirst.includes('first_win'), 'first_win deve essere sbloccato al primo esercizio risolto');
assert(unlockedAfterFirst.includes('optimal_sniper'), 'optimal_sniper deve essere sbloccato con mosse ottimali');
assert(unlockedAfterFirst.includes('flawless'), 'flawless deve essere sbloccato senza errori');

// 7. Persistenza Locale (Mock Storage)
console.log('\n7. Persistenza in Storage (load, save, reset, record)...');
const mockStore = new MockStorage();

const initialLoaded = loadQuizProgress(mockStore);
assert(initialLoaded.totalSolved === 0, 'Storage vuoto restituisce 0 risolti');

// Esegui la registrazione di un esercizio
const result1 = recordQuizResult(initialLoaded, {
  formulaId: 'v-st',
  formulaName: 'velocità',
  formulaStr: 'v = s/t',
  targetVar: 's',
  level: 'easy',
  topic: 'cinematica',
  optimalSteps: 2,
  performedSteps: 2,
  mistakesCount: 0,
  elapsedSeconds: 20,
}, mockStore);

assert(result1.stars === 3, 'Risultato registrato con 3 stelle');
assert(result1.updatedProgress.totalSolved === 1, 'totalSolved incrementato a 1');
assert(result1.updatedProgress.solvedByLevel.easy === 1, 'easy incrementato a 1');
assert(result1.updatedProgress.streak === 1, 'streak incrementata a 1');
assert(result1.newlyUnlockedBadges.length >= 3, 'Devono essere stati sbloccati almeno 3 badge (primo, cecchino, impeccabile)');

// Ricarica da mock storage
const reloaded = loadQuizProgress(mockStore);
assert(reloaded.totalSolved === 1, 'Dati persistiti correttamente in storage');
assert(reloaded.points > 0, 'XP persistiti in storage');
assert(reloaded.badges['first_win'].unlocked === true, 'Badge first_win persistito sbloccato');

// Reset progressi
const resetState = resetQuizProgress(mockStore);
assert(resetState.totalSolved === 0, 'Reset azzera il totale');
const reloadedAfterReset = loadQuizProgress(mockStore);
assert(reloadedAfterReset.totalSolved === 0, 'Storage dopo reset è vuoto');

console.log('\n========================================');
console.log(`Totale asserzioni superate: ${passed}`);
if (failed > 0) {
  console.error(`ERRORI RISCONTRATI: ${failed}`);
  process.exit(1);
} else {
  console.log('Tutti i test unitari di js/quiz.js sono SUPERATI con successo!');
}
