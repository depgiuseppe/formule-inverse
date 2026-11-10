// tests/worksheet.test.mjs — Test unitari per il modulo Esportatore Schede e Verifiche (js/worksheet-export.js)

import {
  escapeLatexText,
  escapeHtml,
  solveFormulaSteps,
  buildWorksheetExercises,
  generateLatexDocument,
  generateHtmlWorksheet
} from '../js/worksheet-export.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${message}`);
  }
}

console.log('--- Inizio test unitari per js/worksheet-export.js (Verifiche e Soluzioni Docente) ---');

// 1. Helper di escaping
console.log('\n1. Verifica helper di escaping LaTeX e HTML...');
assert(escapeHtml('<script>alert("x & y")</script>') === '&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;', 'escapeHtml protegge tag e caratteri speciali');
assert(escapeLatexText('Moto 100% accelerato & formule_2 #1') === 'Moto 100\\% accelerato \\& formule\\_2 \\#1', 'escapeLatexText protegge caratteri speciali LaTeX');
assert(escapeLatexText('Δθ / 2 ≠ 0') === '$\\Delta$$\\theta$ / 2 $\\neq$ 0', 'escapeLatexText gestisce simboli greci e matematici');

// 2. Risolutore automatico delle soluzioni (solveFormulaSteps)
console.log('\n2. Risolutore automatico passaggi algebrici docenti...');
const solLinear = solveFormulaSteps('v = s/t', 't');
assert(solLinear.success === true, 'Risoluzione lineare v = s/t per t ha successo');
assert(solLinear.steps.length > 0, 'Genera passaggi intermedi per v = s/t');
assert(solLinear.finalLatex.includes('s') && solLinear.finalLatex.includes('v'), 'Formula finale LaTeX contiene s e v: ' + solLinear.finalLatex);

// Test su equazione quadratica cinematica (risoluzione 2° grado da AFI-11)
const solQuadratic = solveFormulaSteps('s = v0*t + (1/2)*a*t^2', 't');
assert(solQuadratic.success === true, 'Risoluzione quadratica s = v0*t + (1/2)*a*t^2 per t ha successo');
assert(solQuadratic.steps.length >= 2, 'Risoluzione quadratica genera almeno 2 passaggi (forma canonica + formula)');
assert(solQuadratic.finalLatex.includes('\\sqrt') || solQuadratic.finalLatex.includes('v_0'), 'Formula quadratica finale include radice discriminante');

// 3. Generazione e filtraggio esercizi scheda
console.log('\n3. Generazione esercizi (buildWorksheetExercises)...');
const exercises = buildWorksheetExercises({
  source: 'topic',
  topic: 'cinematica',
  difficulty: 'all',
  count: 4,
  pointsPerExercise: 2.5,
  randomizeTargets: true,
  requireConditions: true
});

assert(exercises.length === 4, `Genera esattamente 4 esercizi (generati: ${exercises.length})`);
assert(exercises[0].points === 2.5, 'Assegna punteggio corretto per esercizio');
assert(typeof exercises[0].formula === 'string', 'Ogni esercizio contiene la formula di partenza');
assert(typeof exercises[0].target === 'string', 'Ogni esercizio ha un incognita target assegnata');
assert(exercises[0].solution && typeof exercises[0].solution === 'object', 'Ogni esercizio ha le soluzioni calcolate');

// 4. Generazione documento LaTeX
console.log('\n4. Generazione sorgente LaTeX (generateLatexDocument)...');
const latexDoc = generateLatexDocument(exercises, {
  docType: 'test',
  title: 'Verifica Scritta: Cinematica',
  school: 'Liceo Scientifico Leonardo',
  subject: 'Fisica',
  className: '3A',
  teacher: 'Prof. Rossi',
  date: '10/11/2026',
  spaceType: 'grid',
  solutions: 'appendix'
});

assert(latexDoc.includes('\\documentclass'), 'LaTeX contiene documentclass');
assert(latexDoc.includes('Liceo Scientifico Leonardo'), 'LaTeX include nome istituto personalizzato');
assert(latexDoc.includes('Prof. Rossi'), 'LaTeX include nome docente');
assert(latexDoc.includes('3A'), 'LaTeX include classe');
assert(latexDoc.includes('SOLUZIONARIO') || latexDoc.includes('Soluzioni'), 'LaTeX include appendice soluzioni');
assert(latexDoc.includes('Griglia di Valutazione') || latexDoc.includes('Punteggio Totale'), 'LaTeX include griglia valutazione docente');
assert(latexDoc.includes('\\end{document}'), 'LaTeX si chiude con end{document}');

// 5. Generazione documento HTML stampabile
console.log('\n5. Generazione HTML stampabile con griglia docente (generateHtmlWorksheet)...');
const htmlDoc = generateHtmlWorksheet(exercises, {
  docType: 'test',
  title: 'Verifica di Fisica: Formule Inverse',
  school: 'Istituto Superiore Fermi',
  subject: 'Fisica',
  className: '4B',
  teacher: 'Prof.ssa Bianchi',
  date: '10/11/2026',
  spaceType: 'grid',
  solutions: 'appendix',
  reqConditions: true,
  lang: 'it'
}, true);

assert(htmlDoc.includes('<!DOCTYPE html>'), 'HTML standalone contiene DOCTYPE');
assert(htmlDoc.includes('Istituto Superiore Fermi'), 'HTML include scuola');
assert(htmlDoc.includes('Prof.ssa Bianchi'), 'HTML include docente');
assert(htmlDoc.includes('student-table'), 'HTML include tabella dati studente');
assert(htmlDoc.includes('solutions-page'), 'HTML include pagina soluzioni docente');
assert(htmlDoc.includes('teacher-rubric-card') || htmlDoc.includes('rubric-table'), 'HTML include griglia di valutazione docente');
assert(htmlDoc.includes('solution-steps-list'), 'HTML include passaggi intermedi risolutivi');

// 6. Supporto Internazionalizzazione (i18n in inglese)
console.log('\n6. Verifica bilinguità (i18n EN) nella scheda didattica...');
const htmlDocEn = generateHtmlWorksheet(exercises, {
  docType: 'test',
  title: 'Physics Test: Inverse Formulas',
  school: 'International High School',
  subject: 'Physics',
  className: 'Grade 10',
  teacher: 'Dr. Smith',
  date: '2026-11-10',
  spaceType: 'grid',
  solutions: 'appendix',
  lang: 'en'
}, true);

assert(htmlDocEn.includes('Physics Test: Inverse Formulas'), 'HTML EN include titolo in inglese');
assert(htmlDocEn.includes('Solutions and Teacher Grading Guide') || htmlDocEn.includes('Teacher Grading Rubric'), 'HTML EN include intestazioni soluzioni in inglese');
assert(htmlDocEn.includes('Grade 10'), 'HTML EN include classe');

console.log('\n========================================');
console.log(`Totale asserzioni: ${passed + failed}`);
console.log(`Superate: ${passed}`);
if (failed > 0) {
  console.error(`Fallite: ${failed}`);
  process.exit(1);
} else {
  console.log('Tutti i test di js/worksheet-export.js sono SUPERATI con successo!');
  process.exit(0);
}
