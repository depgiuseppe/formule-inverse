// js/ui-modals.js — Gestione modali: Guida rapida, Editor formule personalizzate,
// Import LaTeX, Archivio personale ("Le mie formule") e Didactic Bubble (Fumetto Diagnosi).

import { parseEquation, ParseError } from './parser.js';
import { collectVars, unwrap, toLatex } from './ast.js';
import { renderEquation, prettyVar } from './render.js';
import {
  latexToSyntax, LatexError, GREEK_MAP,
  saveUserFormula, getUserFormulas, deleteUserFormula,
  clearUserFormulas, exportUserFormulasJSON, importUserFormulasJSON,
} from './formula-db.js';
import { diagnoseStudentMisconception } from './explanations.js';

let dom = null;
let state = null;
let ctx = null;

let bubbleTimeout = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function triviallyIsolated(formulaStr, v) {
  const parts = formulaStr.split('=');
  if (parts.length !== 2) return false;
  return parts[0].trim() === v;
}

export function initModals(domRefs, appState, appCtx) {
  dom = domRefs;
  state = appState;
  ctx = appCtx;

  bindEditorEvents();
  bindLatexEvents();
  bindStorageEvents();
  bindBubbleEvents();
  renderMyFormulas();
}

function bindBubbleEvents() {
  if (dom.btnCloseBubble) dom.btnCloseBubble.addEventListener('click', dismissDidacticBubble);
  if (dom.btnBubbleOk) {
    dom.btnBubbleOk.addEventListener('click', () => {
      if (ctx && ctx.playSoundClick) ctx.playSoundClick();
      dismissDidacticBubble();
    });
  }
}

// ---------------------------------------------------------------------------
// Didactic Bubble (Fumetto Diagnosi Misconception)
// ---------------------------------------------------------------------------
export function showDidacticBubble({ error, hint, action }) {
  if (!dom || !dom.didacticBubbleAnchor) return;
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

export function dismissDidacticBubble() {
  if (!dom || !dom.didacticBubbleAnchor || dom.didacticBubbleAnchor.hidden) return;
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

// ---------------------------------------------------------------------------
// Guida rapida & Copia LaTeX formula
// ---------------------------------------------------------------------------
export function showHelp() {
  if (!dom || !dom.modalTitle) return;
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

export function copyLatexFormula() {
  if (!state || !state.currentEq) return;
  const latexStr = toLatex(state.currentEq);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(latexStr).then(() => {
      if (ctx && ctx.showMessage) ctx.showMessage(`Formula LaTeX copiata negli appunti: "${latexStr}"`, 'success');
    }).catch(() => {
      prompt('Copia il codice LaTeX:', latexStr);
    });
  } else {
    prompt('Copia il codice LaTeX:', latexStr);
  }
}

// ---------------------------------------------------------------------------
// Editor formule personalizzate
// ---------------------------------------------------------------------------
export function bindEditorEvents() {
  if (dom.btnLoadCustom) dom.btnLoadCustom.addEventListener('click', loadCustomFormula);
  if (dom.customFormula) {
    dom.customFormula.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCustomFormula(); });
  }
}

export function loadCustomFormula() {
  if (!dom.customFormula || !dom.customTarget) return;
  const text = dom.customFormula.value.trim();
  const target = dom.customTarget.value.trim();
  if (dom.customError) dom.customError.hidden = true;

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

  if (ctx && ctx.loadFormula) {
    ctx.loadFormula({
      id: 'custom-' + Date.now(),
      topic: 'formula personalizzata',
      name: 'formula personalizzata',
      formula: text,
      isolate: [...vars],
      conditions: [],
      difficulty: 3,
      notes: 'Formula inserita manualmente.',
    }, t);
  }
  if (multipleSpecified) {
    if (ctx && ctx.showMessage) {
      ctx.showMessage(`È possibile isolare una sola grandezza alla volta: impostato obiettivo su "${prettyVar(t)}". Puoi cambiare grandezza da isolare in qualsiasi momento dall'interfaccia!`, 'info');
    }
  } else {
    if (ctx && ctx.showMessage) {
      ctx.showMessage(`Formula personalizzata caricata. Obiettivo: isolare ${prettyVar(t)}.`, 'success');
    }
  }
}

export function showCustomError(msg) {
  if (dom.customError) {
    dom.customError.hidden = false;
    dom.customError.textContent = msg;
  }
}

// ---------------------------------------------------------------------------
// Import da LaTeX
// ---------------------------------------------------------------------------
export function bindLatexEvents() {
  if (dom.btnLatexPreview) dom.btnLatexPreview.addEventListener('click', previewLatex);
  if (dom.btnLatexSave) dom.btnLatexSave.addEventListener('click', saveLatex);
  if (dom.latexInput) {
    dom.latexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); previewLatex(); }
    });
  }
}

export function clearLatexError() {
  if (dom.latexError) { dom.latexError.hidden = true; dom.latexError.textContent = ''; }
}

export function showLatexError(msg) {
  if (dom.latexError) { dom.latexError.hidden = false; dom.latexError.textContent = msg; }
}

export function previewLatex() {
  clearLatexError();
  const raw = (dom.latexInput.value || '').trim();
  if (!raw) { showLatexError('Incolla un\'equazione LaTeX.'); return null; }
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

export function saveLatex() {
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
  if (ctx && ctx.showMessage) ctx.showMessage(`Formula "${name}" salvata nell'archivio.`, 'success');
}

// ---------------------------------------------------------------------------
// Archivio personale ("Le mie formule")
// ---------------------------------------------------------------------------
export function bindStorageEvents() {
  if (dom.btnExportFormulas) dom.btnExportFormulas.addEventListener('click', exportFormulas);
  if (dom.btnImportFormulas) dom.btnImportFormulas.addEventListener('click', importFormulas);
  if (dom.btnClearFormulas) dom.btnClearFormulas.addEventListener('click', clearFormulas);
}

export function clearStorageError() {
  if (dom.storageError) { dom.storageError.hidden = true; dom.storageError.textContent = ''; }
}
export function showStorageError(msg) {
  if (dom.storageError) { dom.storageError.hidden = false; dom.storageError.textContent = msg; }
}

export function renderMyFormulas() {
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
      if (ctx && ctx.loadFormula) {
        ctx.loadFormula({
          id: f.id,
          topic: f.topic,
          name: f.name,
          formula: f.formula,
          isolate: f.isolate && f.isolate.length ? f.isolate : vars,
          conditions: f.conditions || [],
          difficulty: f.difficulty || 3,
          notes: f.notes || '',
        }, target);
      }
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
        if (ctx && ctx.showMessage) ctx.showMessage('Formula eliminata dall\'archivio.', 'info');
      }
    });
    dom.myFormulasList.appendChild(card);
  }
}

export function exportFormulas() {
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
  if (ctx && ctx.showMessage) ctx.showMessage('Archivio esportato (JSON nell\'area e file scaricato).', 'success');
}

export function importFormulas() {
  clearStorageError();
  if (!dom.jsonArea) return;
  if (dom.jsonArea.hidden) {
    dom.jsonArea.hidden = false;
    dom.jsonArea.focus();
    if (ctx && ctx.showMessage) ctx.showMessage('Incolla il JSON nell\'area e premi di nuovo "Importa JSON".', 'info');
    return;
  }
  const json = dom.jsonArea.value.trim();
  if (!json) { showStorageError('Incolla prima un JSON da importare.'); return; }
  try {
    const added = importUserFormulasJSON(json);
    renderMyFormulas();
    if (ctx && ctx.showMessage) ctx.showMessage(`${added} formula/e importate nell'archivio.`, 'success');
  } catch (e) {
    showStorageError(e.message);
  }
}

export function clearFormulas() {
  clearStorageError();
  if (!window.confirm('Svuotare l\'archivio delle formule salvate? Operazione non annullabile.')) return;
  clearUserFormulas();
  renderMyFormulas();
  if (ctx && ctx.showMessage) ctx.showMessage('Archivio svuotato.', 'info');
}
