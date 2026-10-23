// js/worksheet-export.js — Esportatore di Schede Didattiche e Verifiche per Docenti.
//
// Genera documenti LaTeX compilabili e schede di verifica / esercitazione
// pronte per la stampa e salvataggio in PDF/HTML, con passaggi algebrici
// risolutivi e chiavi di correzione complete.
//
// Funziona al 100% lato client, compatibile sia in ambiente browser (inclusa
// apertura da file://) che in ambiente headless / test Node.js.

import { clone, toPretty, toLatex, collectVars } from './ast.js';
import { parseEquation } from './parser.js';
import { isGoalReached, suggestNextStep, performAction, ensureTargetOnFirstMember } from './algebra.js';
import { renderEquation, prettyVar } from './render.js';
import { FORMULAS } from './formulas.js';
import { getUserFormulas } from './formula-db.js';

// ---------------------------------------------------------------------------
// 1) Helper di escaping e formattazione
// ---------------------------------------------------------------------------

/**
 * Esegue l'escape dei caratteri speciali LaTeX per testi ordinari (titoli, note, nomi).
 */
export function escapeLatexText(str) {
  if (typeof str !== 'string') return '';
  let s = str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([%&$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

  // Rimpiazzi per simboli matematici/greci che potrebbero non essere definiti in T1/inputenc standard
  s = s.replace(/≠/g, '$\\neq$');
  s = s.replace(/≥/g, '$\\ge$');
  s = s.replace(/≤/g, '$\\le$');
  s = s.replace(/↔/g, '$\\leftrightarrow$');
  s = s.replace(/→/g, '$\\rightarrow$');
  s = s.replace(/±/g, '$\\pm$');
  s = s.replace(/·/g, '$\\cdot$');
  s = s.replace(/²/g, '$^2$');
  s = s.replace(/³/g, '$^3$');
  s = s.replace(/°/g, '$^\\circ$');
  s = s.replace(/θ/g, '$\\theta$');
  s = s.replace(/ω/g, '$\\omega$');
  s = s.replace(/λ/g, '$\\lambda$');
  s = s.replace(/ρ/g, '$\\rho$');
  s = s.replace(/π/g, '$\\pi$');
  s = s.replace(/Δ/g, '$\\Delta$');
  return s;
}

/**
 * Esegue l'escape per attributi o testo HTML.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// 2) Risolutore algebrico automatico per le soluzioni docente
// ---------------------------------------------------------------------------

/**
 * Risolve un'equazione passo per passo per isolare targetVar, accumulando
 * le spiegazioni didattiche, la regola applicata e il codice LaTeX di ogni passaggio.
 *
 * @param {string|object} formulaInput - Formula in formato stringa o AST Eq
 * @param {string} targetVar - Grandezza da isolare
 * @returns {object} Oggetto con esito, formula finale, passaggi e condizioni
 */
export function solveFormulaSteps(formulaInput, targetVar) {
  let curr;
  try {
    curr = typeof formulaInput === 'string' ? parseEquation(formulaInput) : clone(formulaInput);
  } catch (err) {
    return {
      success: false,
      error: 'Impossibile analizzare la formula: ' + (err.message || String(err)),
      steps: [],
      finalEquation: null,
      finalLatex: '',
      conditions: []
    };
  }

  if (!targetVar) {
    const vars = collectVars(curr);
    targetVar = vars[0] || 'x';
  }

  const steps = [];
  const conditions = new Set();
  const maxIterations = 25;
  let iterations = 0;

  while (!isGoalReached(curr, targetVar) && iterations < maxIterations) {
    iterations++;
    const sug = suggestNextStep(curr, targetVar);
    if (!sug || !sug.found || !sug.action) {
      break;
    }
    const beforeEq = clone(curr);
    const res = performAction(curr, sug.action);
    if (!res || !res.ok) {
      break;
    }
    curr = res.equation;
    if (res.condition) {
      conditions.add(res.condition);
    }
    steps.push({
      stepNum: iterations,
      label: (sug.action && sug.action.label) || sug.message || `Passaggio ${iterations}`,
      description: (sug.action && sug.action.description) || '',
      ruleKey: (sug.action && sug.action.ruleKey) || '',
      beforeEq,
      afterEq: clone(curr),
      latexBefore: toLatex(beforeEq),
      latexAfter: toLatex(curr),
      prettyAfter: toPretty(curr)
    });
  }

  // Se l'obiettivo è raggiunto ma la grandezza si trova al secondo membro (destra),
  // applichiamo la regola dello specchio per mostrarla al primo membro (A = B ↔ B = A).
  if (isGoalReached(curr, targetVar)) {
    try {
      const adjusted = ensureTargetOnFirstMember(curr, targetVar);
      if (toPretty(adjusted) !== toPretty(curr)) {
        const beforeEq = clone(curr);
        curr = adjusted;
        steps.push({
          stepNum: steps.length + 1,
          label: 'Regola dello specchio',
          description: 'Porta la grandezza incognita al primo membro (A = B ↔ B = A).',
          ruleKey: 'swapMembers',
          beforeEq,
          afterEq: clone(curr),
          latexBefore: toLatex(beforeEq),
          latexAfter: toLatex(curr),
          prettyAfter: toPretty(curr)
        });
      }
    } catch (e) {
      // ignora se non necessario
    }
  }

  const success = isGoalReached(curr, targetVar);

  return {
    success,
    initialEquation: typeof formulaInput === 'string' ? parseEquation(formulaInput) : formulaInput,
    finalEquation: curr,
    finalLatex: toLatex(curr),
    finalPretty: toPretty(curr),
    targetVar,
    targetVarPretty: prettyVar(targetVar),
    steps,
    conditions: Array.from(conditions)
  };
}

// ---------------------------------------------------------------------------
// 3) Costruzione del set di esercizi per la scheda
// ---------------------------------------------------------------------------

/**
 * Costruisce l'elenco degli esercizi selezionati e risolti in base ai criteri.
 */
export function buildWorksheetExercises(options = {}) {
  const {
    source = 'topic', // 'topic' | 'current' | 'user' | 'all'
    topic = 'all',
    difficulty = 'all',
    count = 5,
    pointsPerExercise = 2,
    randomizeTargets = true,
    requireConditions = true,
    currentFormula = null,
    currentTarget = null
  } = options;

  let pool = [];

  if (source === 'current') {
    if (currentFormula) {
      pool = [currentFormula];
    } else {
      pool = FORMULAS.slice(0, 1);
    }
  } else if (source === 'user') {
    const userForms = getUserFormulas();
    pool = userForms.length > 0 ? userForms : FORMULAS.slice(0, 5);
  } else if (source === 'all') {
    pool = [...FORMULAS, ...getUserFormulas()];
  } else {
    // 'topic'
    if (topic === 'all') {
      pool = FORMULAS.slice();
    } else {
      pool = FORMULAS.filter((f) => f.topic === topic);
      if (pool.length === 0) pool = FORMULAS.slice();
    }
  }

  // Filtro per difficoltà
  if (difficulty !== 'all' && source !== 'current') {
    if (difficulty === '4-5') {
      const filtered = pool.filter((f) => (f.difficulty || 2) >= 4);
      if (filtered.length > 0) pool = filtered;
    } else {
      const diffNum = Number(difficulty);
      const filtered = pool.filter((f) => (f.difficulty || 2) === diffNum);
      if (filtered.length > 0) pool = filtered;
    }
  }

  // Mescola il pool per varietà
  const shuffled = pool.slice();
  if (source !== 'current') {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }

  const selectedCount = Math.min(Math.max(1, count), shuffled.length);
  const selectedEntries = shuffled.slice(0, selectedCount);

  return selectedEntries.map((entry, idx) => {
    let parsedEq;
    try {
      parsedEq = parseEquation(entry.formula);
    } catch (e) {
      parsedEq = parseEquation('v = s/t');
    }

    const isolable = Array.isArray(entry.isolate) && entry.isolate.length > 0
      ? entry.isolate
      : collectVars(parsedEq);

    let targetVar;
    if (source === 'current' && currentTarget) {
      targetVar = currentTarget;
    } else if (randomizeTargets && isolable.length > 1) {
      // Escludi preferibilmente la variabile che è già isolata a sinistra
      const leftVar = parsedEq.left && parsedEq.left.type === 'Var' ? parsedEq.left.name : null;
      const candidates = leftVar && isolable.length > 1
        ? isolable.filter((v) => v !== leftVar)
        : isolable;
      targetVar = candidates[Math.floor(Math.random() * candidates.length)] || isolable[0];
    } else {
      targetVar = isolable[0] || 'x';
    }

    const solution = solveFormulaSteps(entry.formula, targetVar);

    return {
      index: idx + 1,
      id: entry.id || `es-${idx + 1}`,
      name: entry.name || `Formula ${idx + 1}`,
      topic: entry.topic || 'Fisica',
      difficulty: entry.difficulty || 2,
      formulaStr: entry.formula,
      parsedEquation: parsedEq,
      latexFormula: toLatex(parsedEq),
      targetVar,
      targetVarPretty: prettyVar(targetVar),
      latexTarget: prettyVar(targetVar),
      conditions: requireConditions && Array.isArray(entry.conditions) ? entry.conditions : [],
      points: Number(pointsPerExercise) || 2,
      solution
    };
  });
}

// ---------------------------------------------------------------------------
// 4) Generatore LaTeX compilabile (.tex)
// ---------------------------------------------------------------------------

/**
 * Genera un sorgente LaTeX pulito e compilabile per pdflatex, xelatex, lualatex e Overleaf.
 *
 * @param {Array} exercises - Elenco esercizi da buildWorksheetExercises
 * @param {object} options - Opzioni di impaginazione e intestazione
 * @returns {string} Codice LaTeX completo del documento
 */
export function generateLatexDocument(exercises, options = {}) {
  const {
    docType = 'test', // 'test' | 'worksheet' | 'recovery'
    title = 'Verifica di Fisica: Formule Inverse',
    school = "Istituto d'Istruzione Superiore",
    subject = 'Fisica',
    className = '',
    teacher = '',
    date = '',
    spaceType = 'grid', // 'grid' | 'lines' | 'blank' | 'compact'
    spaceHeight = 4.0,
    solutions = 'appendix', // 'appendix' | 'result_only' | 'none'
    reqConditions = true
  } = options;

  const totalPoints = exercises.reduce((sum, ex) => sum + (ex.points || 2), 0);

  // Preambolo LaTeX compatto e standardizzato
  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[italian]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{a4paper, top=2cm, bottom=2cm, left=2cm, right=2cm}
\\usepackage{fancyhdr}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{tikz}

\\pagestyle{fancy}
\\fancyhf{}
`;

  if (docType === 'test') {
    tex += `\\lhead{\\textbf{Materia:} ${escapeLatexText(subject)} \\quad \\textbf{Classe:} ${escapeLatexText(className) || '\\rule{2cm}{0.4pt}'}}
\\rhead{\\textbf{Data:} ${escapeLatexText(date) || '\\rule{2.5cm}{0.4pt}'} \\quad \\textbf{Docente:} ${escapeLatexText(teacher) || '\\rule{2.5cm}{0.4pt}'}}
\\cfoot{Pagina \\thepage}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${escapeLatexText(title)}}} \\\\[4pt]
{\\large ${escapeLatexText(school)}} \\\\[8pt]
\\begin{tabular}{|p{7.5cm}|p{4cm}|p{4.5cm}|}
\\hline
\\textbf{Cognome e Nome:} & \\textbf{Data:} & \\textbf{Punteggio / Valutazione:} \\\\
\\rule{0pt}{1.8em} & & \\hfill / ${totalPoints} pt \\\\
\\hline
\\end{tabular}
\\end{center}
\\vspace{0.3cm}

\\noindent\\textbf{Istruzioni:} Per ciascuna delle seguenti formule, isola la grandezza indicata applicando rigorosamente i principi di equivalenza delle equazioni. Mostra tutti i passaggi intermedi ed esplicita eventuali condizioni di validità (denominatori $\\neq 0$, radicandi $\\ge 0$).
\\vspace{0.4cm}
`;
  } else {
    // Worksheet / Scheda di lavoro
    tex += `\\lhead{\\textbf{${escapeLatexText(subject)}} \\quad \\textbf{Classe:} ${escapeLatexText(className) || '\\rule{2cm}{0.4pt}'}}
\\rhead{\\textbf{Data:} ${escapeLatexText(date) || '\\rule{2.5cm}{0.4pt}'}}
\\cfoot{Pagina \\thepage}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${escapeLatexText(title)}}} \\\\[4pt]
{\\large ${escapeLatexText(school)}}
\\end{center}
\\vspace{0.3cm}

\\noindent\\textbf{Obiettivo didattico:} Ricava la grandezza richiesta per ciascuna equazione giustificando i passaggi con il primo o il secondo principio di equivalenza.
\\vspace{0.4cm}
`;
  }

  // Generazione degli esercizi
  exercises.forEach((ex) => {
    tex += `\\subsection*{Esercizio ${ex.index}: ${escapeLatexText(ex.name)} \\hfill \\textnormal{[Punti: ${ex.points}]}}
\\noindent Dalla formula:
\\begin{equation*}
${ex.latexFormula}
\\end{equation*}
ricava la grandezza incognita: $\\mathbf{${ex.latexTarget}}$.
`;

    if (reqConditions && ex.conditions && ex.conditions.length > 0) {
      tex += `\\par\\noindent\\textit{Condizioni di validità iniziali:} $${ex.conditions.join(', ')}$
`;
    }

    tex += `\\par\\noindent\\textbf{Svolgimento:}\\par
`;

    // Spazio per lo svolgimento
    if (spaceType === 'grid') {
      tex += `\\begin{center}
\\begin{tikzpicture}
\\draw[step=0.5cm,gray!35,very thin] (0,0) grid (\\textwidth, ${spaceHeight});
\\end{tikzpicture}
\\end{center}
`;
    } else if (spaceType === 'lines') {
      tex += `\\vspace{0.2cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}
\\vspace{0.2cm}
`;
    } else if (spaceType === 'blank') {
      tex += `\\vspace{${spaceHeight}cm}
`;
    } else {
      // compact
      tex += `\\vspace{1cm}
`;
    }
  });

  // Soluzioni e correzione
  if (solutions === 'appendix') {
    tex += `\\newpage
\\fancyhead[L]{\\textbf{SOLUZIONARIO E GUIDA DOCENTE}}
\\fancyhead[R]{\\textbf{${escapeLatexText(subject)}}}
\\section*{Soluzioni e Svolgimenti Dettagliati}
\\noindent\\textit{Guida per il docente con tutti i passaggi algebrici risolutivi e le condizioni di validità.}
\\bigskip

`;
    exercises.forEach((ex) => {
      tex += `\\subsection*{Soluzione Esercizio ${ex.index}: ${escapeLatexText(ex.name)}}
\\noindent Formula di partenza: $${ex.latexFormula}$ \\quad $\\rightarrow$ \\quad Isolare: $\\mathbf{${ex.latexTarget}}$
\\par\\vspace{0.2cm}
\\noindent\\textbf{Formula finale ricavata:}
\\begin{equation*}
\\mathbf{${ex.solution.finalLatex || ex.latexFormula}}
\\end{equation*}
`;

      if (ex.solution.steps && ex.solution.steps.length > 0) {
        tex += `\\noindent\\textbf{Passaggi di risoluzione:}
\\begin{enumerate}[label=\\textbf{Passaggio \\arabic*:}]
`;
        ex.solution.steps.forEach((st) => {
          tex += `  \\item \\textbf{${escapeLatexText(st.label)}}${st.description ? ` \\\\ \\textit{${escapeLatexText(st.description)}}` : ''}
  \\begin{equation*}
  ${st.latexAfter}
  \\end{equation*}
`;
        });
        tex += `\\end{enumerate}
`;
      }

      if (ex.solution.conditions && ex.solution.conditions.length > 0) {
        tex += `\\noindent\\textbf{Condizioni di validità maturate:} $${ex.solution.conditions.join(', ')}$
`;
      }
      tex += `\\bigskip
`;
    });
  } else if (solutions === 'result_only') {
    tex += `\\newpage
\\section*{Griglia Sintetica delle Soluzioni}
\\begin{center}
\\begin{tabular}{|c|p{4.5cm}|c|p{5.5cm}|c|}
\\hline
\\textbf{N.} & \\textbf{Formula di partenza} & \\textbf{Incognita} & \\textbf{Formula finale ricavata} & \\textbf{Punti} \\\\
\\hline
`;
    exercises.forEach((ex) => {
      tex += `${ex.index} & $${ex.latexFormula}$ & $${ex.latexTarget}$ & $\\mathbf{${ex.solution.finalLatex || ex.latexFormula}}$ & ${ex.points} pt \\\\ \\hline
`;
    });
    tex += `\\end{tabular}
\\end{center}
`;
  }

  tex += `\\end{document}\n`;
  return tex;
}

// ---------------------------------------------------------------------------
// 5) Generatore Scheda HTML / Print-ready PDF
// ---------------------------------------------------------------------------

/**
 * Genera il documento HTML pronto per la stampa (window.print()) o per salvataggio offline.
 * Include foglio di stile ottimizzato per A4 (@media print).
 *
 * @param {Array} exercises - Elenco esercizi da buildWorksheetExercises
 * @param {object} options - Opzioni documento
 * @param {boolean} standalone - Se true include doctype, html, head e toolbar di stampa
 * @returns {string} Codice HTML completo
 */
export function generateHtmlWorksheet(exercises, options = {}, standalone = true) {
  const {
    docType = 'test',
    title = 'Verifica di Fisica: Formule Inverse',
    school = "Istituto d'Istruzione Superiore",
    subject = 'Fisica',
    className = '',
    teacher = '',
    date = '',
    spaceType = 'grid',
    spaceHeight = 4.0,
    solutions = 'appendix',
    reqConditions = true
  } = options;

  const totalPoints = exercises.reduce((sum, ex) => sum + (ex.points || 2), 0);

  // Calcolo altezza in mm per quadretti o righe
  const heightMm = Math.round((spaceHeight || 4.0) * 10);

  let html = '';
  if (standalone) {
    html += `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --text: #0f172a;
    --text-muted: #475569;
    --border: #cbd5e1;
    --bg-page: #f8fafc;
    --card: #ffffff;
    --primary: #2563eb;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-math: 'STIX Two Text', 'Cambria Math', Georgia, serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-sans);
    color: var(--text);
    background: var(--bg-page);
    line-height: 1.5;
    padding: 2rem 1rem;
  }
  .print-page {
    max-width: 210mm;
    margin: 0 auto 2rem;
    background: var(--card);
    padding: 20mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border-radius: 8px;
  }
  .no-print-toolbar {
    position: sticky;
    top: 1rem;
    z-index: 100;
    max-width: 210mm;
    margin: 0 auto 1.5rem;
    background: #1e293b;
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .toolbar-brand { font-weight: 600; font-size: 0.95rem; }
  .toolbar-actions { display: flex; gap: 0.5rem; }
  .tb-btn {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 6px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tb-btn-primary { background: #3b82f6; color: white; }
  .tb-btn-primary:hover { background: #2563eb; }
  .tb-btn-secondary { background: #334155; color: white; }
  .tb-btn-secondary:hover { background: #475569; }

  /* Intestazione scheda */
  .sheet-header {
    border-bottom: 2px solid var(--text);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  .sheet-title-group { text-align: center; margin-bottom: 1rem; }
  .sheet-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .sheet-school { font-size: 1rem; color: var(--text-muted); font-weight: 500; }
  
  /* Tabella dati studente */
  .student-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.8rem;
  }
  .student-table td {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  .student-table .fill-line {
    display: inline-block;
    border-bottom: 1px dotted var(--text-muted);
    min-width: 120px;
  }

  /* Istruzioni */
  .instructions-box {
    background: #f1f5f9;
    border-left: 4px solid var(--primary);
    padding: 0.75rem 1rem;
    font-size: 0.88rem;
    margin-bottom: 1.5rem;
    border-radius: 0 4px 4px 0;
  }

  /* Esercizi */
  .exercise-item {
    margin-bottom: 1.8rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .exercise-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.4rem;
  }
  .exercise-num { font-weight: 700; font-size: 1.05rem; }
  .exercise-points {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    background: #e2e8f0;
    padding: 2px 8px;
    border-radius: 12px;
  }
  .exercise-prompt {
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
  }
  .target-badge {
    display: inline-block;
    font-family: var(--font-math);
    font-weight: 700;
    font-size: 1.15rem;
    color: #1e40af;
    background: #dbeafe;
    padding: 0 8px;
    border-radius: 4px;
    border: 1px solid #bfdbfe;
  }
  .exercise-eq-box {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.6rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    margin-bottom: 0.6rem;
    font-size: 1.3rem;
    font-family: var(--font-math);
  }
  .exercise-conditions {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 0.4rem;
  }

  /* Spazio di svolgimento */
  .workspace-box {
    width: 100%;
    margin-top: 0.4rem;
    border-radius: 4px;
    position: relative;
  }
  .workspace-box.workspace-grid {
    height: ${heightMm}mm;
    border: 1px solid #cbd5e1;
    background-size: 5mm 5mm;
    background-image: 
      linear-gradient(to right, #e2e8f0 1px, transparent 1px),
      linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
  }
  .workspace-box.workspace-lines {
    height: ${heightMm}mm;
    background-image: repeating-linear-gradient(transparent, transparent 7.5mm, #cbd5e1 7.5mm, #cbd5e1 8mm);
    border-bottom: 1px solid #cbd5e1;
  }
  .workspace-box.workspace-blank {
    height: ${heightMm}mm;
    border: 1px dashed #cbd5e1;
  }
  .workspace-box.workspace-compact {
    height: 15mm;
    border-bottom: 1px solid #e2e8f0;
  }

  /* Sezione Soluzioni */
  .solutions-page {
    page-break-before: always;
    break-before: page;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px dashed #94a3b8;
  }
  .solutions-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .solutions-title { font-size: 1.35rem; font-weight: 800; color: #047857; }
  .solution-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1.25rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .solution-card-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #065f46;
  }
  .solution-final-box {
    background: #ffffff;
    border: 2px solid #10b981;
    border-radius: 6px;
    padding: 0.6rem;
    text-align: center;
    font-family: var(--font-math);
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0.5rem 0;
  }
  .solution-steps-list {
    margin: 0.5rem 0 0.5rem 1.2rem;
    font-size: 0.88rem;
  }
  .solution-step-item {
    margin-bottom: 0.5rem;
  }
  .step-label { font-weight: 600; color: #1e293b; }
  .step-desc { font-style: italic; color: #475569; }
  .step-eq {
    display: inline-block;
    background: #ffffff;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    margin-top: 2px;
    font-family: var(--font-math);
  }

  /* Stili matematici dedicati (compatibili con render.js) */
  .math-eq { display: inline-flex; align-items: center; font-family: var(--font-math); }
  .frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 .25rem; }
  .frac-num, .frac-den { padding: .1rem .35rem; }
  .frac-bar { width: 100%; height: 2px; background: currentColor; margin: 2px 0; }
  .node-pow { display: inline-flex; align-items: baseline; }
  .pow-exp { font-size: .75em; vertical-align: super; line-height: 0; }
  .sub { font-size: .75em; vertical-align: sub; line-height: 0; }
  .radical { display: inline-flex; align-items: stretch; margin: 0 2px; }
  .radical-sign { font-size: 1.3em; margin-right: 1px; }
  .radicand { border-top: 2px solid currentColor; padding: 2px 4px 0 2px; }
  .op-plus, .op-minus, .op-times, .op-div, .eq-sign { margin: 0 .25rem; }

  /* Regole di stampa ottimizzate per foglio A4 */
  @media print {
    body { background: #ffffff !important; padding: 0 !important; }
    .print-page {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 10mm !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .no-print, .no-print-toolbar { display: none !important; }
    .exercise-item { page-break-inside: avoid !important; break-inside: avoid !important; }
    .solutions-page { page-break-before: always !important; break-before: page !important; }
    .workspace-box.workspace-grid {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
</head>
<body>
<div class="no-print-toolbar no-print">
  <div class="toolbar-brand">📄 Scheda Didattica Formule Inverse</div>
  <div class="toolbar-actions">
    <button class="tb-btn tb-btn-primary" onclick="window.print()">🖨️ Stampa / Salva in PDF</button>
    <button class="tb-btn tb-btn-secondary" id="btn-tb-dl-latex">📄 Scarica LaTeX</button>
    <button class="tb-btn tb-btn-secondary" id="btn-tb-copy-latex">📋 Copia LaTeX</button>
    <button class="tb-btn tb-btn-secondary" onclick="window.close()">✕ Chiudi</button>
  </div>
</div>
`;
  }

  html += `<div class="print-page">
  <header class="sheet-header">
    <div class="sheet-title-group">
      <h1 class="sheet-title">${escapeHtml(title)}</h1>
      <p class="sheet-school">${escapeHtml(school)} — ${escapeHtml(subject)}</p>
    </div>
`;

  if (docType === 'test') {
    html += `    <table class="student-table" aria-label="Dati dello studente">
      <tr>
        <td style="width: 50%;"><strong>Cognome e Nome:</strong> <span class="fill-line"></span></td>
        <td style="width: 25%;"><strong>Classe:</strong> ${escapeHtml(className) || '<span class="fill-line" style="min-width:60px;"></span>'}</td>
        <td style="width: 25%;"><strong>Data:</strong> ${escapeHtml(date) || '<span class="fill-line" style="min-width:70px;"></span>'}</td>
      </tr>
      <tr>
        <td><strong>Docente:</strong> ${escapeHtml(teacher) || '<span class="fill-line"></span>'}</td>
        <td colspan="2"><strong>Punteggio:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / <strong>${totalPoints} pt</strong> &nbsp;&nbsp;&nbsp; <strong>Voto:</strong></td>
      </tr>
    </table>
`;
  } else {
    html += `    <table class="student-table" aria-label="Intestazione">
      <tr>
        <td style="width: 60%;"><strong>Studente:</strong> <span class="fill-line"></span></td>
        <td style="width: 20%;"><strong>Classe:</strong> ${escapeHtml(className) || '<span class="fill-line" style="min-width:50px;"></span>'}</td>
        <td style="width: 20%;"><strong>Data:</strong> ${escapeHtml(date) || '<span class="fill-line" style="min-width:70px;"></span>'}</td>
      </tr>
    </table>
`;
  }

  html += `  </header>

  <div class="instructions-box">
    <strong>Istruzioni:</strong> Per ciascuna delle seguenti formule ricava la grandezza indicata applicando i principi di equivalenza. Mostra chiaramente ogni passaggio algebrico intermedio ed esplicita le condizioni di esistenza/validità (denominatori $\\neq 0$, radicandi $\\ge 0$).
  </div>

  <main class="exercises-container">
`;

  exercises.forEach((ex) => {
    // Render HTML equation
    const renderedHtml = renderEquation(ex.parsedEquation, { interactive: false });

    html += `    <article class="exercise-item">
      <div class="exercise-header">
        <span class="exercise-num">Esercizio ${ex.index}: ${escapeHtml(ex.name)}</span>
        <span class="exercise-points">${ex.points} pt</span>
      </div>
      <p class="exercise-prompt">
        Dalla formula sotto riportata, isola la grandezza: <strong class="target-badge">${escapeHtml(ex.targetVarPretty)}</strong>
      </p>
      <div class="exercise-eq-box" aria-label="Formula">${renderedHtml}</div>
`;

    if (reqConditions && ex.conditions && ex.conditions.length > 0) {
      html += `      <div class="exercise-conditions">Condizioni di validità iniziali: ${escapeHtml(ex.conditions.join(', '))}</div>\n`;
    }

    html += `      <div class="workspace-box workspace-${spaceType}" title="Spazio per lo svolgimento"></div>
    </article>
`;
  });

  html += `  </main>
`;

  // Soluzioni
  if (solutions === 'appendix') {
    html += `  <section class="solutions-page">
    <div class="solutions-header">
      <h2 class="solutions-title">Soluzioni e Guida alla Correzione (Docente)</h2>
      <p style="font-size: 0.9rem; color: #475569;">Svolgimenti passaggio per passaggio con principi di equivalenza</p>
    </div>
`;

    exercises.forEach((ex) => {
      const renderedFinal = ex.solution.finalEquation
        ? renderEquation(ex.solution.finalEquation, { interactive: false })
        : `<code>${escapeHtml(ex.solution.finalPretty || '')}</code>`;

      html += `    <div class="solution-card">
      <div class="solution-card-header">
        <span>Soluzione Esercizio ${ex.index}: ${escapeHtml(ex.name)}</span>
        <span>${ex.points} pt</span>
      </div>
      <div class="solution-final-box">
        <strong>Formula ricavata:</strong> ${renderedFinal}
      </div>
`;

      if (ex.solution.steps && ex.solution.steps.length > 0) {
        html += `      <ol class="solution-steps-list">
`;
        ex.solution.steps.forEach((st) => {
          const renderedStep = st.afterEq
            ? renderEquation(st.afterEq, { interactive: false })
            : escapeHtml(st.prettyAfter || '');

          html += `        <li class="solution-step-item">
          <span class="step-label">${escapeHtml(st.label)}:</span>
          ${st.description ? `<span class="step-desc">${escapeHtml(st.description)}</span><br>` : ''}
          <div class="step-eq">${renderedStep}</div>
        </li>
`;
        });
        html += `      </ol>
`;
      }

      if (ex.solution.conditions && ex.solution.conditions.length > 0) {
        html += `      <div style="font-size: 0.84rem; color: #065f46; font-style: italic;">
        Condizioni di validità maturate: ${escapeHtml(ex.solution.conditions.join(', '))}
      </div>
`;
      }

      html += `    </div>\n`;
    });

    html += `  </section>\n`;
  }

  html += `</div>\n`;

  if (standalone) {
    html += `</body>
</html>`;
  }

  return html;
}

// ---------------------------------------------------------------------------
// 6) Download e interazione client-side
// ---------------------------------------------------------------------------

/**
 * Avvia il download nel browser di una stringa di testo salvandola come file.
 */
export function downloadWorksheetFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  if (typeof window === 'undefined' || !window.document) return false;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  return true;
}

// ---------------------------------------------------------------------------
// 7) Controller dell'interfaccia utente (UI Controller)
// ---------------------------------------------------------------------------

let activeWorksheetData = [];
let activeLatexContent = '';
let activeHtmlContent = '';

/**
 * Legge i parametri dal form del modal e rigenera l'anteprima.
 */
export function refreshWorksheetPreview(dom, state) {
  if (!dom || !dom.worksheetModalBackdrop) return;

  const docType = dom.worksheetDocType ? dom.worksheetDocType.value : 'test';
  const title = dom.worksheetTitleInput ? dom.worksheetTitleInput.value.trim() : 'Verifica di Fisica: Formule Inverse';
  const school = dom.worksheetSchoolInput ? dom.worksheetSchoolInput.value.trim() : "Istituto d'Istruzione Superiore";
  const subject = dom.worksheetSubjectInput ? dom.worksheetSubjectInput.value.trim() : 'Fisica';
  const className = dom.worksheetClassInput ? dom.worksheetClassInput.value.trim() : '';
  const teacher = dom.worksheetTeacherInput ? dom.worksheetTeacherInput.value.trim() : '';
  const source = dom.worksheetSourceSelect ? dom.worksheetSourceSelect.value : 'topic';
  const topic = dom.worksheetTopicSelect ? dom.worksheetTopicSelect.value : 'all';
  const count = dom.worksheetCountInput ? parseInt(dom.worksheetCountInput.value, 10) || 5 : 5;
  const difficulty = dom.worksheetDifficultySelect ? dom.worksheetDifficultySelect.value : 'all';
  const points = dom.worksheetPointsInput ? parseFloat(dom.worksheetPointsInput.value) || 2 : 2;
  const spaceType = dom.worksheetSpaceType ? dom.worksheetSpaceType.value : 'grid';
  const solutions = dom.worksheetSolutionsSelect ? dom.worksheetSolutionsSelect.value : 'appendix';
  const randomizeTargets = dom.worksheetRandomizeTargets ? dom.worksheetRandomizeTargets.checked : true;
  const reqConditions = dom.worksheetReqConditions ? dom.worksheetReqConditions.checked : true;

  const currentFormula = state && state.currentFormula ? state.currentFormula : null;
  const currentTarget = state && state.targetVar ? state.targetVar : null;

  const exercises = buildWorksheetExercises({
    source,
    topic,
    difficulty,
    count,
    pointsPerExercise: points,
    randomizeTargets,
    requireConditions: reqConditions,
    currentFormula,
    currentTarget
  });

  activeWorksheetData = exercises;

  const options = {
    docType,
    title,
    school,
    subject,
    className,
    teacher,
    date: new Date().toLocaleDateString('it-IT'),
    spaceType,
    spaceHeight: 4.0,
    solutions,
    reqConditions
  };

  activeLatexContent = generateLatexDocument(exercises, options);
  activeHtmlContent = generateHtmlWorksheet(exercises, options, true);

  // Aggiorna riepilogo nel modal
  if (dom.worksheetSummaryCount) {
    dom.worksheetSummaryCount.textContent = `${exercises.length} esercizi generati`;
  }
  if (dom.worksheetSummaryPoints) {
    const totalPts = exercises.reduce((sum, ex) => sum + ex.points, 0);
    dom.worksheetSummaryPoints.textContent = `Totale: ${totalPts} pt`;
  }

  // Lista compatta degli esercizi selezionati
  if (dom.worksheetSelectedList) {
    dom.worksheetSelectedList.innerHTML = exercises.map((ex) => `
      <div class="worksheet-summary-item">
        <span class="summary-item-num">#${ex.index}</span>
        <div class="summary-item-info">
          <strong class="summary-item-name">${escapeHtml(ex.name)}</strong>
          <span class="summary-item-eq"><code>${escapeHtml(ex.formulaStr)}</code> &rarr; isola <strong>${escapeHtml(ex.targetVarPretty)}</strong></span>
        </div>
        <span class="summary-item-pts">${ex.points} pt</span>
      </div>
    `).join('');
  }

  // Anteprima HTML
  if (dom.worksheetHtmlPreview) {
    dom.worksheetHtmlPreview.innerHTML = generateHtmlWorksheet(exercises, options, false);
  }

  // Codice LaTeX
  if (dom.worksheetLatexCode) {
    dom.worksheetLatexCode.value = activeLatexContent;
  }
}

/**
 * Apre la finestra modale dell'esportatore schede didattiche.
 */
export function openWorksheetModal(dom, state) {
  if (!dom || !dom.worksheetModalBackdrop) return;
  dom.worksheetModalBackdrop.hidden = false;
  refreshWorksheetPreview(dom, state);
}

/**
 * Chiude la finestra modale dell'esportatore schede didattiche.
 */
export function closeWorksheetModal(dom) {
  if (!dom || !dom.worksheetModalBackdrop) return;
  dom.worksheetModalBackdrop.hidden = true;
}

/**
 * Inizializza i gestori eventi e i selettori per il modulo di esportazione.
 */
export function initWorksheetExporter(dom, state) {
  if (!dom) return;

  // Popola la tendina degli argomenti
  if (dom.worksheetTopicSelect) {
    const existing = new Set();
    FORMULAS.forEach((f) => {
      if (f.topic && !existing.has(f.topic)) {
        existing.add(f.topic);
        const opt = document.createElement('option');
        opt.value = f.topic;
        opt.textContent = f.topic.charAt(0).toUpperCase() + f.topic.slice(1);
        dom.worksheetTopicSelect.appendChild(opt);
      }
    });
  }

  // Apri modal da toolbar
  if (dom.btnExportWorksheet) {
    dom.btnExportWorksheet.addEventListener('click', () => {
      openWorksheetModal(dom, state);
    });
  }

  // Chiudi modal
  if (dom.btnCloseWorksheetModal) {
    dom.btnCloseWorksheetModal.addEventListener('click', () => closeWorksheetModal(dom));
  }
  if (dom.btnCloseWorksheet) {
    dom.btnCloseWorksheet.addEventListener('click', () => closeWorksheetModal(dom));
  }
  if (dom.worksheetModalBackdrop) {
    dom.worksheetModalBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.worksheetModalBackdrop) closeWorksheetModal(dom);
    });
  }

  // Cambiamento di qualsiasi parametro di configurazione
  const inputsToWatch = [
    dom.worksheetDocType,
    dom.worksheetTitleInput,
    dom.worksheetSchoolInput,
    dom.worksheetSubjectInput,
    dom.worksheetClassInput,
    dom.worksheetTeacherInput,
    dom.worksheetSourceSelect,
    dom.worksheetTopicSelect,
    dom.worksheetCountInput,
    dom.worksheetDifficultySelect,
    dom.worksheetPointsInput,
    dom.worksheetSpaceType,
    dom.worksheetSolutionsSelect,
    dom.worksheetRandomizeTargets,
    dom.worksheetReqConditions
  ];

  inputsToWatch.forEach((elem) => {
    if (elem) {
      elem.addEventListener('change', () => refreshWorksheetPreview(dom, state));
      if (elem.tagName === 'INPUT' && elem.type === 'text') {
        elem.addEventListener('input', () => refreshWorksheetPreview(dom, state));
      }
    }
  });

  // Tab di anteprima (HTML vs LaTeX)
  if (dom.btnTabPreviewHtml && dom.btnTabPreviewLatex) {
    dom.btnTabPreviewHtml.addEventListener('click', () => {
      dom.btnTabPreviewHtml.classList.add('active');
      dom.btnTabPreviewLatex.classList.remove('active');
      if (dom.worksheetHtmlPreview) dom.worksheetHtmlPreview.hidden = false;
      if (dom.worksheetLatexCode) dom.worksheetLatexCode.hidden = true;
    });

    dom.btnTabPreviewLatex.addEventListener('click', () => {
      dom.btnTabPreviewLatex.classList.add('active');
      dom.btnTabPreviewHtml.classList.remove('active');
      if (dom.worksheetHtmlPreview) dom.worksheetHtmlPreview.hidden = true;
      if (dom.worksheetLatexCode) dom.worksheetLatexCode.hidden = false;
    });
  }

  // Stampa / Salva in PDF
  if (dom.btnPrintWorksheet) {
    dom.btnPrintWorksheet.addEventListener('click', () => {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(activeHtmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 350);
      } else {
        alert('Consenti i popup nel browser per aprire l\'anteprima di stampa PDF.');
      }
    });
  }

  // Scarica LaTeX (.tex)
  if (dom.btnDownloadLatex) {
    dom.btnDownloadLatex.addEventListener('click', () => {
      const filename = `scheda-formule-inverse-${Date.now()}.tex`;
      downloadWorksheetFile(filename, activeLatexContent, 'text/x-tex;charset=utf-8');
    });
  }

  // Copia LaTeX
  if (dom.btnCopyLatex) {
    dom.btnCopyLatex.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(activeLatexContent).then(() => {
          const orig = dom.btnCopyLatex.textContent;
          dom.btnCopyLatex.textContent = '✓ Codice LaTeX Copiato!';
          setTimeout(() => { dom.btnCopyLatex.textContent = orig; }, 2000);
        });
      }
    });
  }

  // Scarica HTML
  if (dom.btnDownloadHtml) {
    dom.btnDownloadHtml.addEventListener('click', () => {
      const filename = `scheda-formule-inverse-${Date.now()}.html`;
      downloadWorksheetFile(filename, activeHtmlContent, 'text/html;charset=utf-8');
    });
  }
}
