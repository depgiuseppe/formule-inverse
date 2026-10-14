// formula-db.js — Database personale di formule, con importazione da LaTeX.
//
// Questo modulo:
//   1) converte un'equazione scritta in LaTeX nella sintassi dell'editor
//      dell'app ( + - * / ^ ( ) );
//   2) salva/legge/elimina le formule dell'utente in modo PERSISTENTE
//      (localStorage), cosi' restano disponibili alla prossima apertura;
//   3) fornisce le voci pronte per essere mostrate nella Libreria.
//
// L'uso di localStorage e' sicuro: se non e' disponibile (o e' pieno /
// disabilitato) il modulo degrada a un archivio in memoria, senza far
// crashare l'app.

const STORAGE_KEY = 'formuleInverse.userFormulas.v1';

// ---------------------------------------------------------------------------
// 1) Conversione LaTeX -> sintassi dell'editor
// ---------------------------------------------------------------------------
// Non e' un parser LaTeX completo: copre i costrutti tipici delle formule
// fisiche/matematiche scolastiche. La strategia e' ricorsiva:
//   - \frac{A}{B}    -> (A)/(B)
//   - \sqrt{A}       -> sqrt(A)
//   - A^{B} / A^B    -> A^(B)
//   - A_{B}          -> A_B (sottoindice -> nome variabile)
//   - \cdot, \times  -> *
//   - \left \right   -> rimossi
//   - comandi greci  -> lettere (pi, rho, ...)
//   - \, \; \! \quad -> rimossi (spazi tipografici)

const GREEK_MAP = {
  alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta',
  epsilon: 'eps', varepsilon: 'eps', zeta: 'zeta', eta: 'eta',
  theta: 'theta', vartheta: 'theta', iota: 'iota', kappa: 'kappa',
  lambda: 'lam', mu: 'mu', nu: 'nu', xi: 'xi', pi: 'pi', varpi: 'pi',
  rho: 'rho', varrho: 'rho', sigma: 'sigma', varsigma: 'sigma',
  tau: 'tau', upsilon: 'upsilon', phi: 'phi', varphi: 'phi',
  chi: 'chi', psi: 'psi', omega: 'omega',
  Gamma: 'Gamma', Theta: 'Theta', Lambda: 'Lambda',
  Xi: 'Xi', Pi: 'Pi', Sigma: 'Sigma', Upsilon: 'Upsilon', Phi: 'Phi',
  Psi: 'Psi', Omega: 'Omega', Delta: 'd',
};

// Comandi che diventano un semplice operatore/simbolo.
const SIMPLE_COMMANDS = {
  cdot: '*', times: '*', '\\cdot': '*',
  div: '/', pm: '+', mp: '-',
  leq: '<=', le: '<=', geq: '>=', ge: '>=',
  neq: '!=', ne: '!=', approx: '~',
};

export class LatexError extends Error {}

/**
 * Converte una stringa LaTeX in sintassi dell'editor.
 * Lancia LatexError se la conversione non produce un'equazione valida.
 */
export function latexToSyntax(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new LatexError('Nessuna formula fornita.');
  }
  let s = input.trim();

  // Rimuove delimitatori matematici comuni.
  s = s.replace(/^\s*\$\$?/, '').replace(/\$\$?\s*$/, '');
  s = s.replace(/\\\[/g, '').replace(/\\\]/g, '');
  s = s.replace(/\\\(/g, '').replace(/\\\)/g, '');

  // \frac{A}{B}: risolto ricorsivamente con un ciclo (gestisce annidamenti).
  s = expandCommand(s, 'frac', (args) => `(${args[0]})/(${args[1]})`, 2);

  // \dfrac, \tfrac -> stesso trattamento di \frac
  s = expandCommand(s, 'dfrac', (args) => `(${args[0]})/(${args[1]})`, 2);
  s = expandCommand(s, 'tfrac', (args) => `(${args[0]})/(${args[1]})`, 2);

  // \sqrt[n]{A} -> (A)^(1/n) ; \sqrt{A} -> sqrt(A)
  s = expandSqrt(s);

  // \left / \right / \big ecc. -> rimossi
  s = s.replace(/\\(left|right|big|Big|bigg|Bigg|middle)\.?/g, '');

  // \text{...} / \mathrm{...} / \operatorname{...} -> contenuto o ignorato
  s = s.replace(/\\(text|mathrm|mathsf|mathbf|operatorname)\{([^{}]*)\}/g, '$2');

  // Comandi greci e simboli semplici -> lettere/operatori
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => {
    if (Object.prototype.hasOwnProperty.call(GREEK_MAP, name)) return GREEK_MAP[name];
    if (Object.prototype.hasOwnProperty.call(SIMPLE_COMMANDS, name)) return SIMPLE_COMMANDS[name];
    // Comando sconosciuto: se e' una lettera singola utile lo teniamo, altrimenti
    // lo rimuoviamo (es. \displaystyle, \mathrm gia' gestiti sopra).
    return '';
  });

  // Spazi tipografici LaTeX
  s = s.replace(/\\[,;:!]/g, '');
  s = s.replace(/\\quad|\\qquad/g, ' ');
  s = s.replace(/\\!/g, '');

  // Parentesi graffe rimaste: le convertiamo in tonde (grafici di gruppo).
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');

  // Esponenti: X^{...} e gia' diventati X^(...); X^Y con pedice semplice.
  // Sottoindici A_{B} -> A_B (nome variabile unico).
  s = s.replace(/([A-Za-z0-9]+)_\{([A-Za-z0-9]+)\}/g, '$1_$2');
  s = s.replace(/([A-Za-z0-9]+)_([A-Za-z0-9])/g, '$1$2');

  // Giustapposizione implicita. In LaTeX "2 \\pi r" = "2*pi*r".
  // Il parser riconosce gia' "2x", "ab" come prodotti, ma NON "a b".
  // Inseriamo quindi un '*' esplicito dove c'era uno spazio tra due token
  // alfanumerici, TRANNE quando lo spazio segue un 'd' isolato che indica
  // una variazione (\\Delta l -> "d l" -> lo uniamo in "dl").
  s = s.replace(/(^|[^A-Za-z0-9])d\s+([A-Za-z])(?![A-Za-z0-9])/g, '$1d$2');
  // Poi unisce le lettere singole consecutive (a b -> ab) e le cifre,
  // mantenendo un '*' tra identificatori piu' lunghi.
  // Ripetuto finche' non restano spazi tra token alfanumerici.
  let prev;
  do {
    prev = s;
    s = s.replace(/([A-Za-z0-9]+)\s+([A-Za-z0-9]+)/g, (m, a, b) => {
      if (a.length === 1 && b.length === 1) return a + b; // a b -> ab
      return a + '*' + b;                                 // rho g -> rho*g
    });
  } while (s !== prev);

  // Normalizza spazi rimasti
  s = s.replace(/\s+/g, ' ').trim();

  if (!s || !s.includes('=')) {
    throw new LatexError('La conversione non ha prodotto un\'equazione con "=".');
  }
  return s;
}

// Espande iterativamente un comando a N argomenti tra graffe: \frac{A}{B}.
function expandCommand(src, cmd, build, argc, depth = 0) {
  const marker = '\\' + cmd;
  let result = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(marker, i)) {
      let j = i + marker.length;
      const args = [];
      let ok = true;
      for (let k = 0; k < argc; k++) {
        while (src[j] === ' ') j++;
        if (src[j] !== '{') { ok = false; break; }
        const close = matchBrace(src, j);
        if (close < 0) { ok = false; break; }
        args.push(src.slice(j + 1, close));
        j = close + 1;
      }
      if (!ok) { result += src[i]; i++; continue; }
      // Ricorsione sugli argomenti per gestire comandi annidati.
      const expandedArgs = args.map((a) => expandCommand(a, cmd, build, argc, depth + 1));
      result += build(expandedArgs);
      i = j;
    } else {
      result += src[i];
      i++;
    }
  }
  return result;
}

// Trova l'indice della graffa di chiusura corrispondente a quella in `open`.
function matchBrace(str, open) {
  let depth = 0;
  for (let k = open; k < str.length; k++) {
    if (str[k] === '{') depth++;
    else if (str[k] === '}') {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

// Gestisce \sqrt{...} e \sqrt[n]{...}
function expandSqrt(src) {
  let result = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('\\sqrt', i)) {
      let j = i + 5;
      let n = null;
      // eventuale indice [n]
      if (src[j] === '[') {
        const end = src.indexOf(']', j);
        if (end > 0) { n = src.slice(j + 1, end); j = end + 1; }
      }
      while (src[j] === ' ') j++;
      if (src[j] === '{') {
        const close = matchBrace(src, j);
        if (close > 0) {
          const inner = expandSqrt(src.slice(j + 1, close));
          if (n && n.trim() && n.trim() !== '2') {
            result += `(${inner})^(1/(${n.trim()}))`;
          } else {
            result += `sqrt(${inner})`;
          }
          i = close + 1;
          continue;
        }
      }
      result += 'sqrt';
      i += 5;
    } else {
      result += src[i];
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2) Archivio persistente (localStorage con fallback in memoria)
// ---------------------------------------------------------------------------
// Ogni voce salvata:
//   { id, name, formula, latex, topic, isolate: [...], conditions: [...],
//     difficulty, notes, createdAt }

let memoryStore = null; // fallback se localStorage non e' disponibile

function storageAvailable() {
  try {
    const k = '__fi_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}

const HAS_LS = typeof window !== 'undefined' && storageAvailable();

function readRaw() {
  if (!HAS_LS) return memoryStore ? memoryStore.slice() : [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeRaw(list) {
  if (!HAS_LS) { memoryStore = list.slice(); return true; }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    memoryStore = list.slice();
    return false;
  }
}

/** Tutte le formule salvate dall'utente (in ordine di inserimento). */
export function getUserFormulas() {
  return readRaw();
}

/** Numero di formule salvate. */
export function userFormulaCount() {
  return readRaw().length;
}

/** Salva (o sostituisce) una formula. Ritorna l'oggetto salvato. */
export function saveUserFormula(entry) {
  if (!entry || !entry.formula) {
    throw new LatexError('Dati insufficienti per salvare la formula.');
  }
  const list = readRaw();
  const saved = {
    id: entry.id || ('usr-' + Date.now() + '-' + Math.floor(Math.random() * 1e4)),
    name: entry.name || 'formula salvata',
    formula: String(entry.formula),
    latex: entry.latex || '',
    topic: entry.topic || 'Le mie formule',
    isolate: Array.isArray(entry.isolate) ? entry.isolate : [],
    conditions: Array.isArray(entry.conditions) ? entry.conditions : [],
    difficulty: entry.difficulty || 3,
    notes: entry.notes || '',
    createdAt: entry.createdAt || Date.now(),
  };
  const idx = list.findIndex((f) => f.id === saved.id);
  if (idx >= 0) list[idx] = saved; else list.push(saved);
  writeRaw(list);
  return saved;
}

/** Elimina la formula con l'id indicato. Ritorna true se rimossa. */
export function deleteUserFormula(id) {
  const list = readRaw();
  const next = list.filter((f) => f.id !== id);
  if (next.length === list.length) return false;
  writeRaw(next);
  return true;
}

/** Elimina TUTTE le formule salvate. */
export function clearUserFormulas() {
  writeRaw([]);
  memoryStore = [];
}

// ---------------------------------------------------------------------------
// 3) Esportazione / importazione dell'intero database (JSON)
// ---------------------------------------------------------------------------

export function exportUserFormulasJSON() {
  return JSON.stringify(readRaw(), null, 2);
}

export function importUserFormulasJSON(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new LatexError("Il testo incollato non e' un JSON valido.");
  }
  if (!Array.isArray(parsed)) {
    throw new LatexError('Il JSON deve contenere un elenco (array) di formule.');
  }
  const list = readRaw();
  let added = 0;
  for (const item of parsed) {
    if (!item || !item.formula) continue;
    if (list.some((f) => f.id === item.id)) continue;
    list.push({
      id: item.id || ('usr-' + Date.now() + '-' + Math.floor(Math.random() * 1e4)),
      name: item.name || 'formula importata',
      formula: String(item.formula),
      latex: item.latex || '',
      topic: item.topic || 'Le mie formule',
      isolate: Array.isArray(item.isolate) ? item.isolate : [],
      conditions: Array.isArray(item.conditions) ? item.conditions : [],
      difficulty: item.difficulty || 3,
      notes: item.notes || '',
      createdAt: item.createdAt || Date.now(),
    });
    added++;
  }
  writeRaw(list);
  return added;
}
