// ast.js — Definizione dei nodi dell'albero sintattico astratto (AST)
// e operazioni fondamentali: costruzione, stampa, uguaglianza strutturale,
// canonicalizzazione, raccolta di variabili.
//
// Ogni nodo è un oggetto JavaScript puro con la proprietà `type`.
// Tipi di nodo:
//   Num  { type:'Num',  value:Number }              numero
//   Var  { type:'Var',  name:String }                variabile o costante simbolica
//   Add  { type:'Add',  args:[Node,...] }            somma (>=2 argomenti)
//   Sub  { type:'Sub',  args:[Node,...] }            sottrazione a catena: a-b-c = ((a-b)-c)
//   Mul  { type:'Mul',  args:[Node,...] }            prodotto (>=2 argomenti)
//   Div  { type:'Div',  num:Node, den:Node }         divisione / frazione
//   Pow  { type:'Pow',  base:Node, exp:Node }        potenza
//   Sqrt { type:'Sqrt', arg:Node }                   radice quadrata
//   Sin  { type:'Sin',  arg:Node }                   seno
//   Cos  { type:'Cos',  arg:Node }                   coseno
//   Tan  { type:'Tan',  arg:Node }                   tangente
//   Ln   { type:'Ln',   arg:Node }                   logaritmo naturale
//   Asin { type:'Asin', arg:Node }                   arcoseno    (inversa di sin)
//   Acos { type:'Acos', arg:Node }                   arcocoseno  (inversa di cos)
//   Atan { type:'Atan', arg:Node }                   arcotangente(inversa di tan)
//   Exp  { type:'Exp',  arg:Node }                   esponenziale(inversa di ln)
//   Neg  { type:'Neg',  arg:Node }                   negazione unaria
//   Group{ type:'Group', arg:Node }                  parentesi esplicita (preservata per il parsing)
//   Eq   { type:'Eq',   left:Node, right:Node }      uguaglianza
//
// `Group` viene conservato per rispettare la struttura scritta dall'utente,
// ma nella canonicalizzazione i gruppi vengono attraversati.
//
// Le funzioni trascendenti (sin, cos, tan, ln) NON sono invertibili su tutto ℝ:
// lo sono soltanto su un opportuno intervallo detto "ramo principale", e il loro
// argomento deve appartenere a un dominio di esistenza. Queste informazioni sono
// raccolte in FUNC_INFO e usate dal parser, dal rendering e dal motore algebrico
// per imporre le condizioni di dominio e per giustificare l'inversione.

// ---------------------------------------------------------------------------
// Informazioni sulle funzioni trascendenti.
//   domain:     vincolo sull'argomento perché la funzione sia definita;
//   branch:     ramo principale (intervallo di invertibilità);
//   range:      codominio della funzione sul ramo principale;
//   inverse:    nome del nodo inverso (per l'inversione simbolica);
//   domainText: descrizione leggibile del dominio (per le condizioni);
//   rangeText:  descrizione leggibile del codominio (per le condizioni).
// ---------------------------------------------------------------------------
export const FUNC_INFO = {
  sin: {
    domain: null, branch: '[−π/2, π/2]', range: '[−1, 1]', inverse: 'asin',
    domainText: null, rangeText: 'l\'argomento di sin è un angolo (nessun vincolo)',
  },
  cos: {
    domain: null, branch: '[0, π]', range: '[−1, 1]', inverse: 'acos',
    domainText: null, rangeText: 'l\'argomento di cos è un angolo (nessun vincolo)',
  },
  tan: {
    domain: 'θ ≠ π/2 + kπ', branch: '(−π/2, π/2)', range: 'ℝ', inverse: 'atan',
    domainText: 'θ ≠ π/2 + kπ (k ∈ ℤ)', rangeText: null,
  },
  ln: {
    domain: 'x > 0', branch: '(0, +∞)', range: 'ℝ', inverse: 'exp',
    domainText: 'x > 0', rangeText: null,
  },
};

// ---------------------------------------------------------------------------
// Costruttori
// ---------------------------------------------------------------------------
export const Num = (value) => ({ type: 'Num', value });
export const Var = (name) => ({ type: 'Var', name });
export const Add = (...args) => flattenAssoc('Add', args);
export const Sub = (...args) => ({ type: 'Sub', args: flattenSubArgs(args) });
export const Mul = (...args) => flattenAssoc('Mul', args);
export const Div = (num, den) => ({ type: 'Div', num, den });
export const Pow = (base, exp) => ({ type: 'Pow', base, exp });
export const Sqrt = (arg) => ({ type: 'Sqrt', arg });
export const Sin = (arg) => ({ type: 'Sin', arg });
export const Cos = (arg) => ({ type: 'Cos', arg });
export const Tan = (arg) => ({ type: 'Tan', arg });
export const Ln = (arg) => ({ type: 'Ln', arg });
export const Asin = (arg) => ({ type: 'Asin', arg });
export const Acos = (arg) => ({ type: 'Acos', arg });
export const Atan = (arg) => ({ type: 'Atan', arg });
export const Exp = (arg) => ({ type: 'Exp', arg });
export const Neg = (arg) =>
  arg.type === 'Num' ? Num(-arg.value) : { type: 'Neg', arg };
export const Group = (arg) => ({ type: 'Group', arg });
export const Eq = (left, right) => ({ type: 'Eq', left, right });

// Nomi "carini" delle funzioni trascendenti e delle inverse, per il rendering.
export const FUNC_PRETTY = {
  Sin: 'sin', Cos: 'cos', Tan: 'tan', Ln: 'ln',
  Asin: 'sin⁻¹', Acos: 'cos⁻¹', Atan: 'tan⁻¹', Exp: 'exp',
};

// Funzione iniettiva e sua inversa (per la semplificazione f(inversa(x)) = x).
// Mappa: nodo della funzione -> tipo del nodo inverso.
export const INVERSE_OF = {
  Sin: 'Asin', Cos: 'Acos', Tan: 'Atan', Ln: 'Exp',
};

// Appiattisce somme/prodotti annidati dello stesso tipo: Add(Add(a,b),c) -> Add(a,b,c)
function flattenAssoc(type, args) {
  const out = [];
  for (const a of args) {
    if (a && a.type === type) out.push(...a.args);
    else out.push(a);
  }
  return { type, args: out };
}

// La sottrazione resta a catena (non commutativa): appiattisce solo annidamenti
// nella posizione del primo argomento.
function flattenSubArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (i === 0 && a && a.type === 'Sub') out.push(...a.args);
    else out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Utilità numeriche
// ---------------------------------------------------------------------------
export const isNum = (n) => n && n.type === 'Num';
export const isVar = (n) => n && n.type === 'Var';
export const nVal = (n) => (isNum(n) ? n.value : null);

// Cerca di valutare un sottoalbero puramente numerico.
// Ritorna { ok:true, value } oppure { ok:false }.
export function evalConst(node) {
  switch (node.type) {
    case 'Num':
      return { ok: true, value: node.value };
    case 'Var':
      // pi greco ed e sono costanti matematiche
      if (node.name === 'pi' || node.name === 'π') return { ok: true, value: Math.PI };
      if (node.name === 'e') return { ok: true, value: Math.E };
      return { ok: false };
    case 'Add': {
      const vals = node.args.map(evalConst);
      if (vals.some((v) => !v.ok)) return { ok: false };
      return { ok: true, value: vals.reduce((s, v) => s + v.value, 0) };
    }
    case 'Sub': {
      const vals = node.args.map(evalConst);
      if (vals.some((v) => !v.ok)) return { ok: false };
      let acc = vals[0].value;
      for (let i = 1; i < vals.length; i++) acc -= vals[i].value;
      return { ok: true, value: acc };
    }
    case 'Mul': {
      const vals = node.args.map(evalConst);
      if (vals.some((v) => !v.ok)) return { ok: false };
      return { ok: true, value: vals.reduce((s, v) => s * v.value, 1) };
    }
    case 'Div': {
      const a = evalConst(node.num);
      const b = evalConst(node.den);
      if (!a.ok || !b.ok) return { ok: false };
      if (b.value === 0) return { ok: false }; // divisione per zero: non valutabile
      return { ok: true, value: a.value / b.value };
    }
    case 'Pow': {
      const a = evalConst(node.base);
      const b = evalConst(node.exp);
      if (!a.ok || !b.ok) return { ok: false };
      const val = Math.pow(a.value, b.value);
      if (!Number.isFinite(val)) return { ok: false };
      return { ok: true, value: val };
    }
    case 'Sqrt': {
      const a = evalConst(node.arg);
      if (!a.ok || a.value < 0) return { ok: false };
      return { ok: true, value: Math.sqrt(a.value) };
    }
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp': {
      const a = evalConst(node.arg);
      if (!a.ok) return { ok: false };
      const val = evalFunc(node.type, a.value);
      if (!Number.isFinite(val)) return { ok: false };
      return { ok: true, value: val };
    }
    case 'Neg': {
      const a = evalConst(node.arg);
      if (!a.ok) return { ok: false };
      return { ok: true, value: -a.value };
    }
    case 'Group':
      return evalConst(node.arg);
    default:
      return { ok: false };
  }
}

// Valuta una funzione trascendente su un valore reale.
// sin/cos/tan lavorano in RADIANTI; ln è il logaritmo naturale;
// le inverse restituiscono il valore nel ramo principale (in radianti).
function evalFunc(type, x) {
  switch (type) {
    case 'Sin': return Math.sin(x);
    case 'Cos': return Math.cos(x);
    case 'Tan': return Math.tan(x);
    case 'Ln': return x > 0 ? Math.log(x) : NaN;
    case 'Exp': return Math.exp(x);
    case 'Asin': return x >= -1 && x <= 1 ? Math.asin(x) : NaN;
    case 'Acos': return x >= -1 && x <= 1 ? Math.acos(x) : NaN;
    case 'Atan': return Math.atan(x);
    default: return NaN;
  }
}

/**
 * Valuta un'espressione AST con un dizionario di valori per le variabili (env = { s: 100, v: 20 }).
 * Restituisce { ok: true, value: number } oppure { ok: false, error?: string, missing?: string }.
 */
export function evalWithEnv(node, env = {}) {
  if (!node) return { ok: false, error: 'Nodo vuoto' };
  switch (node.type) {
    case 'Num':
      return { ok: true, value: node.value };
    case 'Var': {
      if (node.name === 'pi' || node.name === 'π') return { ok: true, value: Math.PI };
      if (node.name === 'e') return { ok: true, value: Math.E };
      if (node.name === '±') return { ok: true, value: 0 };
      if (env[node.name] !== undefined && env[node.name] !== null && env[node.name] !== '') {
        const val = Number(env[node.name]);
        if (Number.isFinite(val)) return { ok: true, value: val };
      }
      return { ok: false, missing: node.name };
    }
    case 'Add': {
      if (node.args.length === 2) {
        const first = unwrap(node.args[0]);
        if (first.type === 'Var' && first.name === '±') {
          return evalWithEnv(node.args[1], env);
        }
      }
      const vals = node.args.map((a) => evalWithEnv(a, env));
      const failed = vals.find((v) => !v.ok);
      if (failed) return failed;
      return { ok: true, value: vals.reduce((s, v) => s + v.value, 0) };
    }
    case 'Sub': {
      const vals = node.args.map((a) => evalWithEnv(a, env));
      const failed = vals.find((v) => !v.ok);
      if (failed) return failed;
      let acc = vals[0].value;
      for (let i = 1; i < vals.length; i++) acc -= vals[i].value;
      return { ok: true, value: acc };
    }
    case 'Mul': {
      const vals = node.args.map((a) => evalWithEnv(a, env));
      const failed = vals.find((v) => !v.ok);
      if (failed) return failed;
      return { ok: true, value: vals.reduce((s, v) => s * v.value, 1) };
    }
    case 'Div': {
      const a = evalWithEnv(node.num, env);
      if (!a.ok) return a;
      const b = evalWithEnv(node.den, env);
      if (!b.ok) return b;
      if (b.value === 0) return { ok: false, error: 'Divisione per zero (denominatore nullo)' };
      const val = a.value / b.value;
      if (!Number.isFinite(val)) return { ok: false, error: 'Risultato non finito' };
      return { ok: true, value: val };
    }
    case 'Pow': {
      const a = evalWithEnv(node.base, env);
      if (!a.ok) return a;
      const b = evalWithEnv(node.exp, env);
      if (!b.ok) return b;
      const val = Math.pow(a.value, b.value);
      if (!Number.isFinite(val) || isNaN(val)) return { ok: false, error: 'Potenza non calcolabile nei reali' };
      return { ok: true, value: val };
    }
    case 'Sqrt': {
      const a = evalWithEnv(node.arg, env);
      if (!a.ok) return a;
      if (a.value < 0) return { ok: false, error: 'Radice quadrata di numero negativo' };
      return { ok: true, value: Math.sqrt(a.value) };
    }
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp': {
      const a = evalWithEnv(node.arg, env);
      if (!a.ok) return a;
      const val = evalFunc(node.type, a.value);
      if (!Number.isFinite(val) || isNaN(val)) return { ok: false, error: `Errore nel calcolo di ${node.type}` };
      return { ok: true, value: val };
    }
    case 'Neg': {
      const a = evalWithEnv(node.arg, env);
      if (!a.ok) return a;
      return { ok: true, value: -a.value };
    }
    case 'Group':
      return evalWithEnv(node.arg, env);
    default:
      return { ok: false, error: 'Nodo non supportato per la valutazione' };
  }
}

/**
 * Sostituisce i nodi Var con nodi Num in base ai valori forniti in env.
 */
export function substituteVarsInAst(node, env = {}) {
  if (!node) return node;
  switch (node.type) {
    case 'Num':
      return node;
    case 'Var': {
      if (node.name === 'pi' || node.name === 'π' || node.name === 'e' || node.name === '±') return node;
      if (env[node.name] !== undefined && env[node.name] !== null && env[node.name] !== '') {
        const val = Number(env[node.name]);
        if (Number.isFinite(val)) return { type: 'Num', value: val };
      }
      return node;
    }
    case 'Add':
      return { type: 'Add', args: node.args.map((a) => substituteVarsInAst(a, env)) };
    case 'Sub':
      return { type: 'Sub', args: node.args.map((a) => substituteVarsInAst(a, env)) };
    case 'Mul':
      return { type: 'Mul', args: node.args.map((a) => substituteVarsInAst(a, env)) };
    case 'Div':
      return { type: 'Div', num: substituteVarsInAst(node.num, env), den: substituteVarsInAst(node.den, env) };
    case 'Pow':
      return { type: 'Pow', base: substituteVarsInAst(node.base, env), exp: substituteVarsInAst(node.exp, env) };
    case 'Sqrt':
      return { type: 'Sqrt', arg: substituteVarsInAst(node.arg, env) };
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
      return { type: node.type, arg: substituteVarsInAst(node.arg, env) };
    case 'Neg':
      return { type: 'Neg', arg: substituteVarsInAst(node.arg, env) };
    case 'Group':
      return { type: 'Group', arg: substituteVarsInAst(node.arg, env) };
    default:
      return node;
  }
}

// ---------------------------------------------------------------------------
// Stampa testuale (sintassi lineare con parentesi ridondanti ma corrette)
// ---------------------------------------------------------------------------
export function toText(node) {
  switch (node.type) {
    case 'Num':
      return String(node.value);
    case 'Var':
      return node.name;
    case 'Add':
      return '(' + node.args.map(toText).join(' + ') + ')';
    case 'Sub':
      return '(' + node.args.map(toText).join(' - ') + ')';
    case 'Mul':
      return '(' + node.args.map(toText).join(' * ') + ')';
    case 'Div':
      return '(' + toText(node.num) + ' / ' + toText(node.den) + ')';
    case 'Pow':
      return '(' + toText(node.base) + ' ^ ' + toText(node.exp) + ')';
    case 'Sqrt':
      return 'sqrt(' + toText(node.arg) + ')';
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
      return node.type.toLowerCase() + '(' + toText(node.arg) + ')';
    case 'Neg':
      return '(-' + toText(node.arg) + ')';
    case 'Group':
      return '(' + toText(node.arg) + ')';
    case 'Eq':
      return toText(node.left) + ' = ' + toText(node.right);
    default:
      throw new Error('Nodo sconosciuto: ' + node.type);
  }
}

// Stampa "amichevole" (senza parentesi superflue) per anteprime leggibili.
export function toPretty(node, parentPrec = 0) {
  // precedenza: 1 add/sub, 2 mul/div, 3 pow
  const wrap = (s, prec, needParen) => (needParen ? '(' + s + ')' : s);
  switch (node.type) {
    case 'Num':
      return String(node.value);
    case 'Var':
      return node.name;
    case 'Add':
    case 'Sub': {
      // Segno ± davanti a una radice: ±√(...) e non ± + √(...)
      if (node.type === 'Add' && node.args.length === 2) {
        const first = unwrap(node.args[0]);
        if (first.type === 'Var' && first.name === '±') {
          return wrap('±' + toPretty(node.args[1], 2), 1, parentPrec > 1);
        }
      }
      // I termini negativi sono mostrati come sottrazione (v − v0, non v + −v0).
      const isSub = node.type === 'Sub';
      let s = '';
      node.args.forEach((a, i) => {
        const u = unwrap(a);
        const isNeg = u.type === 'Neg' || (u.type === 'Num' && u.value < 0);
        const bodyNode = u.type === 'Neg' ? u.arg : (u.type === 'Num' && u.value < 0 ? Num(-u.value) : a);
        const body = toPretty(bodyNode, isNeg ? 2 : 1);
        if (i === 0) {
          s += (isNeg ? '−' : '') + body;
        } else {
          const minus = isSub ? !isNeg : isNeg;
          s += (minus ? ' − ' : ' + ') + body;
        }
      });
      return wrap(s, 1, parentPrec > 1);
    }
    case 'Mul': {
      const s = node.args
        .map((a) => toPretty(a, unwrap(a).type === 'Div' ? 3 : 2))
        .join('·');
      return wrap(s, 2, parentPrec > 2);
    }
    case 'Div': {
      const s = toPretty(node.num, 2) + '/' + toPretty(node.den, 3);
      return wrap(s, 2, parentPrec > 2);
    }
    case 'Pow': {
      const s = toPretty(node.base, 3) + '^' + toPretty(node.exp, 4);
      return wrap(s, 3, parentPrec > 3);
    }
    case 'Sqrt':
      return '√(' + toPretty(node.arg, 0) + ')';
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
      return FUNC_PRETTY[node.type] + '(' + toPretty(node.arg, 0) + ')';
    case 'Neg':
      return '−' + toPretty(node.arg, 2);
    case 'Group': {
      const s = toPretty(node.arg, 0);
      return '(' + s + ')';
    }
    case 'Eq':
      return toPretty(node.left, 0) + ' = ' + toPretty(node.right, 0);
    default:
      throw new Error('Nodo sconosciuto: ' + node.type);
  }
}

// Nomi "carini": pi -> π, rho -> ρ, eta -> η, lam -> λ, eps -> ε, dT -> ΔT, etc.
const LATEX_VAR_MAP = {
  pi: '\\pi', rho: '\\rho', eta: '\\eta', lam: '\\lambda', eps: '\\varepsilon',
  mu: '\\mu', dT: '\\Delta T', v0: 'v_0', L0: 'L_0',
  c1: 'c_1', c2: 'c_2', dl: '\\Delta l', ip: 'i_p',
  theta: '\\theta', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  omega: '\\omega', phi: '\\phi', sigma: '\\sigma', tau: '\\tau', nu: '\\nu',
  kappa: '\\kappa', xi: '\\xi', chi: '\\chi',
  Delta: '\\Delta', Lambda: '\\Lambda', Omega: '\\Omega', Sigma: '\\Sigma', Phi: '\\Phi',
  eps0: '\\varepsilon_0', mu0: '\\mu_0',
};

// Converte un nodo AST in codice LaTeX pulito e standard.
export function toLatex(node, parentPrec = 0) {
  if (!node) return '';
  const wrap = (s, needParen) => (needParen ? `\\left(${s}\\right)` : s);
  switch (node.type) {
    case 'Num':
      return String(node.value);
    case 'Var': {
      if (LATEX_VAR_MAP[node.name]) return LATEX_VAR_MAP[node.name];
      const knownSubsLatex = {
        Ceq: 'C_{\\text{eq}}', Req: 'R_{\\text{eq}}',
        C_eq: 'C_{\\text{eq}}', R_eq: 'R_{\\text{eq}}',
        R_1: 'R_1', R_2: 'R_2',
        C_1: 'C_1', C_2: 'C_2',
        Ieff: 'I_{\\text{eff}}', Veff: 'V_{\\text{eff}}', Vmax: 'V_{\\text{max}}',
        Icm: 'I_{\\text{cm}}', xcm: 'x_{\\text{cm}}',
        PhiB: '\\Phi_B', PhiE: '\\Phi_E',
        at: 'a_t', ac: 'a_c',
        Ec: 'E_c', Ep: 'E_p',
        Ec1: 'E_{c1}', Ec2: 'E_{c2}',
        Ep1: 'E_{p1}', Ep2: 'E_{p2}',
        v0x: 'v_{0x}', v0y: 'v_{0y}',
        H0: 'H_0', Rs: 'R_s', lam0: '\\lambda_0', lam_max: '\\lambda_{\\text{max}}',
        L_edd: 'L_{\\text{edd}}', v_area: 'v_{\\text{area}}', thetaB: '\\theta_B',
        Delta_y: '\\Delta y', Delta_G: '\\Delta G', Delta_H: '\\Delta H', Delta_S: '\\Delta S',
        P_tot: 'P_{\\text{tot}}', m_mol: 'm_{\\text{mol}}', m_solv: 'm_{\\text{solv}}',
        pH: '\\text{pH}', pOH: '\\text{pOH}', pKa: '\\text{p}K_a',
        Ka: 'K_a', Kb: 'K_b', Kw: 'K_w', Pi: '\\Pi',
      };
      if (knownSubsLatex[node.name]) return knownSubsLatex[node.name];

      if (node.name.startsWith('d') && node.name.length > 1 && !['d', 'dt'].includes(node.name)) {
        const rest = node.name.slice(1);
        if (LATEX_VAR_MAP[rest]) return `\\Delta ${LATEX_VAR_MAP[rest]}`;
        if (['T', 'l', 'U', 'V'].includes(rest)) return `\\Delta ${rest}`;
      }
      for (const [k, v] of Object.entries(LATEX_VAR_MAP)) {
        if (node.name.startsWith(k)) {
          const rest = node.name.slice(k.length);
          if (/^\d+$/.test(rest)) {
            return `${v}_${rest}`;
          }
        }
      }
      const m = node.name.match(/^([a-zA-Z]+)(\d+)$/);
      if (m) {
        const base = LATEX_VAR_MAP[m[1]] || m[1];
        return `${base}_${m[2]}`;
      }
      if (node.name.includes('_')) {
        const parts = node.name.split('_');
        const b = LATEX_VAR_MAP[parts[0]] || parts[0];
        return `${b}_{\\text{${parts.slice(1).join('_')}}}`;
      }
      return node.name;
    }
    case 'Add':
    case 'Sub': {
      // Segno ± davanti a una radice: ±√(...) e non ± + √(...)
      if (node.type === 'Add' && node.args.length === 2) {
        const first = unwrap(node.args[0]);
        if (first.type === 'Var' && first.name === '±') {
          return wrap('±' + toLatex(node.args[1], 2), parentPrec > 1);
        }
      }
      // I termini negativi diventano sottrazioni: v - v_0, non v + -v_0.
      const isSub = node.type === 'Sub';
      let s = '';
      node.args.forEach((a, i) => {
        const u = unwrap(a);
        const isNeg = u.type === 'Neg' || (u.type === 'Num' && u.value < 0);
        const bodyNode = u.type === 'Neg' ? u.arg : (u.type === 'Num' && u.value < 0 ? Num(-u.value) : a);
        const body = toLatex(bodyNode, isNeg ? 2 : 1);
        if (i === 0) {
          s += (isNeg ? '-' : '') + body;
        } else {
          const minus = isSub ? !isNeg : isNeg;
          s += (minus ? ' - ' : ' + ') + body;
        }
      });
      return wrap(s, parentPrec > 1);
    }
    case 'Mul': {
      const s = node.args.map((a) => toLatex(a, 2)).join(' \\cdot ');
      return wrap(s, parentPrec > 2);
    }
    case 'Div': {
      return `\\frac{${toLatex(node.num, 0)}}{${toLatex(node.den, 0)}}`;
    }
    case 'Pow': {
      const baseUnwrapped = unwrap(node.base);
      const needBaseParen = ['Add', 'Sub', 'Mul', 'Div', 'Neg'].includes(baseUnwrapped.type);
      const baseStr = needBaseParen ? `\\left(${toLatex(node.base, 0)}\\right)` : toLatex(node.base, 3);
      return `${baseStr}^{${toLatex(node.exp, 0)}}`;
    }
    case 'Sqrt':
      return `\\sqrt{${toLatex(node.arg, 0)}}`;
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
      return `\\${node.type.toLowerCase()}\\left(${toLatex(node.arg, 0)}\\right)`;
    case 'Asin':
      return `\\arcsin\\left(${toLatex(node.arg, 0)}\\right)`;
    case 'Acos':
      return `\\arccos\\left(${toLatex(node.arg, 0)}\\right)`;
    case 'Atan':
      return `\\arctan\\left(${toLatex(node.arg, 0)}\\right)`;
    case 'Exp':
      return `e^{${toLatex(node.arg, 0)}}`;
    case 'Neg':
      return `-${toLatex(node.arg, 2)}`;
    case 'Group': {
      const u = unwrap(node.arg);
      if (u.type === 'Var' || u.type === 'Num') return toLatex(u, 0);
      return `\\left(${toLatex(node.arg, 0)}\\right)`;
    }
    case 'Eq':
      return `${toLatex(unwrap(node.left), 0)} = ${toLatex(unwrap(node.right), 0)}`;
    default:
      return toPretty(node, parentPrec);
  }
}

// ---------------------------------------------------------------------------
// Uguaglianza strutturale
// ---------------------------------------------------------------------------
// Attraversa i Group (che sono solo annotazioni di parentesi).
export function unwrap(node) {
  return node && node.type === 'Group' ? unwrap(node.arg) : node;
}

// Attraversa i Group e ignora fattori neutri (1 moltiplicativo) o termini neutri (+0 additivo).
// Serve a garantire che moltiplicare per 1 o sommare 0 non blocchi le operazioni algebriche.
export function unwrapNeutrals(node) {
  let u = unwrap(node);
  if (!u) return u;
  if (u.type === 'Mul') {
    const nonOne = u.args.filter((a) => !(unwrap(a).type === 'Num' && unwrap(a).value === 1));
    if (nonOne.length === 0) return Num(1);
    if (nonOne.length === 1) return unwrapNeutrals(nonOne[0]);
    if (nonOne.length < u.args.length) return unwrapNeutrals(Mul(...nonOne));
  }
  if (u.type === 'Add') {
    const nonZero = u.args.filter((a) => !(unwrap(a).type === 'Num' && unwrap(a).value === 0));
    if (nonZero.length === 0) return Num(0);
    if (nonZero.length === 1) return unwrapNeutrals(nonZero[0]);
    if (nonZero.length < u.args.length) return unwrapNeutrals(Add(...nonZero));
  }
  if (u.type === 'Sub') {
    if (u.args.length === 2 && unwrap(u.args[1]).type === 'Num' && unwrap(u.args[1]).value === 0) {
      return unwrapNeutrals(u.args[0]);
    }
  }
  if (u.type === 'Div' && unwrap(u.den).type === 'Num' && unwrap(u.den).value === 1) {
    return unwrapNeutrals(u.num);
  }
  return u;
}

// Rimuove ricorsivamente i fattori neutri (1 in prodotti) e termini neutri (0 in somme).
export function stripNeutrals(node) {
  if (!node) return node;
  const raw = node;
  if (raw.type === 'Group') {
    return { type: 'Group', arg: stripNeutrals(raw.arg) };
  }
  const u = { ...node };
  switch (u.type) {
    case 'Mul': {
      const strippedArgs = u.args.map(stripNeutrals);
      const nonOnes = strippedArgs.filter((a) => !(unwrap(a).type === 'Num' && unwrap(a).value === 1));
      if (nonOnes.length === 0) return Num(1);
      if (nonOnes.length === 1) return nonOnes[0];
      return { ...u, args: nonOnes };
    }
    case 'Add': {
      const strippedArgs = u.args.map(stripNeutrals);
      const nonZeros = strippedArgs.filter((a) => !(unwrap(a).type === 'Num' && unwrap(a).value === 0));
      if (nonZeros.length === 0) return Num(0);
      if (nonZeros.length === 1) return nonZeros[0];
      return { ...u, args: nonZeros };
    }
    case 'Sub': {
      const strippedArgs = u.args.map(stripNeutrals);
      if (strippedArgs.length === 2 && unwrap(strippedArgs[1]).type === 'Num' && unwrap(strippedArgs[1]).value === 0) {
        return strippedArgs[0];
      }
      if (strippedArgs.length === 2 && unwrap(strippedArgs[0]).type === 'Num' && unwrap(strippedArgs[0]).value === 0) {
        return { type: 'Neg', arg: strippedArgs[1] };
      }
      return { ...u, args: strippedArgs };
    }
    case 'Div': {
      const num = stripNeutrals(u.num);
      const den = stripNeutrals(u.den);
      if (unwrap(den).type === 'Num' && unwrap(den).value === 1) return num;
      return { ...u, num, den };
    }
    case 'Neg':
      return { ...u, arg: stripNeutrals(u.arg) };
    case 'Pow':
      return { ...u, base: stripNeutrals(u.base), exp: stripNeutrals(u.exp) };
    case 'Eq':
      return { ...u, left: stripNeutrals(u.left), right: stripNeutrals(u.right) };
    default:
      if (u.arg) return { ...u, arg: stripNeutrals(u.arg) };
      return u;
  }
}

// Uguaglianza strutturale esatta, ignorando i Group.
export function structurallyEqual(a, b) {
  a = unwrap(a);
  b = unwrap(b);
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'Num':
      return a.value === b.value;
    case 'Var':
      return a.name === b.name;
    case 'Add':
    case 'Sub':
    case 'Mul':
      if (a.args.length !== b.args.length) return false;
      return a.args.every((x, i) => structurallyEqual(x, b.args[i]));
    case 'Div':
      return structurallyEqual(a.num, b.num) && structurallyEqual(a.den, b.den);
    case 'Pow':
      return structurallyEqual(a.base, b.base) && structurallyEqual(a.exp, b.exp);
    case 'Sqrt':
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
      return structurallyEqual(a.arg, b.arg);
    case 'Neg':
      return structurallyEqual(a.arg, b.arg);
    case 'Eq':
      return structurallyEqual(a.left, b.left) && structurallyEqual(a.right, b.right);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Canonicalizzazione: forma normale usata per il controllo di equivalenza.
// Applica, in modo conservativo e sempre valido, soltanto:
//  - rimozione dei Group;
//  - appiattimento di somme/prodotti annidati;
//  - ordinamento commutativo STABILE di somme e prodotti;
//  - fusione di costanti numeriche adiacenti;
//  - semplificazioni identitarie (x+0, x*1, x^1, x/1, 0*x).
// NON applica semplificazioni che richiedono ipotesi (es. x/x = 1).
// ---------------------------------------------------------------------------
export function canonical(node) {
  return canon(unwrap(node));
}

// ---------------------------------------------------------------------------
// Aritmetica razionale esatta: evita di trasformare 1/2 in 0.5.
// Le costanti numeriche restano frazioni finché non sono interi.
// ---------------------------------------------------------------------------
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

function ratNorm(r) {
  let { n, d } = r;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Riconosce un valore razionale esatto in un sottoalbero.
// Ritorna { n, d } oppure null. Accetta interi, negazioni e frazioni di interi.
function asRational(node) {
  node = unwrap(node);
  switch (node.type) {
    case 'Num':
      return Number.isInteger(node.value) ? { n: node.value, d: 1 } : null;
    case 'Neg': {
      const r = asRational(node.arg);
      return r ? { n: -r.n, d: r.d } : null;
    }
    case 'Div': {
      const a = asRational(node.num);
      const b = asRational(node.den);
      if (!a || !b || b.n === 0) return null;
      return ratNorm({ n: a.n * b.d, d: a.d * b.n });
    }
    default:
      return null;
  }
}

function ratAdd(a, b) {
  return ratNorm({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

function ratMul(a, b) {
  return ratNorm({ n: a.n * b.n, d: a.d * b.d });
}

function ratDiv(a, b) {
  if (b.n === 0) return a;
  return ratNorm({ n: a.n * b.d, d: a.d * b.n });
}

// Converte un razionale in nodo: null se è zero, Num se intero, Div(1,2) se frazione.
function ratToNode(r) {
  if (!r || r.n === 0) return null;
  if (r.d === 1) return Num(r.n);
  return Div(Num(r.n), Num(r.d));
}

// Raggruppa fattori con la stessa base sommando gli esponenti (es. c·c => c², c·c² => c³)
function combineIdenticalFactors(factors) {
  if (factors.length <= 1) return factors;
  const groups = [];
  for (const f of factors) {
    const u = unwrap(f);
    let base = u;
    let exp = 1;
    if (u.type === 'Pow' && u.exp && u.exp.type === 'Num' && Number.isInteger(u.exp.value) && u.exp.value > 0) {
      base = unwrap(u.base);
      exp = u.exp.value;
    }
    const key = toPretty(base, 0);
    const existing = groups.find((g) => g.key === key && equivalentExpr(g.base, base));
    if (existing) {
      existing.exp += exp;
    } else {
      groups.push({ key, base, exp });
    }
  }
  const result = [];
  for (const g of groups) {
    if (g.exp === 1) {
      result.push(g.base);
    } else {
      result.push(Pow(g.base, Num(g.exp)));
    }
  }
  result.sort(compareNodes);
  return result;
}

function canon(node) {
  // I Group sono solo annotazioni di parentesi: li attraversiamo sempre,
  // anche quando compaiono annidati come figli di altri nodi.
  node = unwrap(node);
  switch (node.type) {
    case 'Num':
      return Num(node.value);
    case 'Var':
      return Var(node.name);

    case 'Add': {
      const parts = node.args.map(canon);
      // appiattimento
      const flat = [];
      for (const p of parts) {
        if (p.type === 'Add') flat.push(...p.args);
        else flat.push(p);
      }
      // somma le costanti come frazioni esatte: 1/2 resta 1/2, mai 0.5
      let acc = { n: 0, d: 1 };
      const rest = [];
      for (const p of flat) {
        const r = asRational(p);
        if (r) acc = ratAdd(acc, r);
        else rest.push(p);
      }
      const constNode = ratToNode(acc);
      if (constNode) rest.push(constNode);
      if (rest.length === 0) return Num(0);
      if (rest.length === 1) return rest[0];
      rest.sort(compareNodes);
      return flattenAssoc('Add', rest);
    }

    case 'Sub': {
      // a - b - c  =>  a + (-b) + (-c)  per la canonicalizzazione
      const parts = node.args.map(canon);
      const terms = [parts[0]];
      for (let i = 1; i < parts.length; i++) terms.push(Neg(parts[i]));
      return canon(Add(...terms));
    }

    case 'Mul': {
      // Un segno meno dentro un prodotto diventa un fattore (−1)·y:
      // così non si formano negazioni annidate e i segni si semplificano.
      const parts = node.args.map((a) => {
        const c = canon(a);
        return c.type === 'Neg' ? Mul(Num(-1), c.arg) : c;
      });
      const flat = [];
      for (const p of parts) {
        if (p.type === 'Mul') flat.push(...p.args);
        else flat.push(p);
      }
      // prodotto delle costanti come frazioni esatte: 2 * (1/2) => 1
      // e fusione delle frazioni nel prodotto: a·(1/c) => a/c
      let acc = { n: 1, d: 1 };
      const numFactors = [];
      const denFactors = [];
      for (const p of flat) {
        const r = asRational(p);
        if (r) { acc = ratMul(acc, r); continue; }
        if (p.type === 'Div') {
          const rn = asRational(p.num);
          if (rn) acc = ratMul(acc, rn);
          else numFactors.push(p.num);
          const rd = asRational(p.den);
          if (rd) acc = ratDiv(acc, rd);
          else denFactors.push(p.den);
          continue;
        }
        numFactors.push(p);
      }
      if (acc.n === 0) return Num(0); // un fattore costante 0 annulla il prodotto
      const finalNumFactors = combineIdenticalFactors(numFactors);
      const finalDenFactors = combineIdenticalFactors(denFactors);

      const negative = acc.n < 0;
      const abs = { n: Math.abs(acc.n), d: acc.d };
      const out = [];
      if (!(abs.n === 1 && abs.d === 1)) out.push(ratToNode(abs));
      out.push(...finalNumFactors);

      if (out.length === 0 && finalDenFactors.length === 0) return Num(1);
      const numPart = out.length === 0
        ? Num(1)
        : (out.length === 1 ? out[0] : flattenAssoc('Mul', out));
      const product = finalDenFactors.length === 0
        ? numPart
        : Div(numPart, finalDenFactors.length === 1 ? finalDenFactors[0] : flattenAssoc('Mul', finalDenFactors));
      return negative ? Neg(product) : product;
    }

    case 'Div': {
      let num = canon(node.num);
      let den = canon(node.den);
      // (a/b)/c  =>  a/(b·c): evita frazioni di frazioni poco leggibili.
      while (num.type === 'Div') {
        den = canon(Mul(den, num.den));
        num = num.num;
      }
      // a/(b/c)  =>  (a·c)/b
      if (den.type === 'Div') {
        num = canon(Mul(num, den.den));
        den = den.num;
      }
      // Il segno meno va davanti alla frazione, non dentro numeratore o
      // denominatore: così i fattori comuni si riconoscono.
      let sign = 1;
      if (num.type === 'Neg') { sign = -sign; num = num.arg; }
      if (den.type === 'Neg') { sign = -sign; den = den.arg; }
      if (isNum(den) && den.value === 1) {
        return sign < 0 ? canon(Neg(num)) : num;
      }
      const frac = Div(num, den);
      return sign < 0 ? Neg(frac) : frac;
    }

    case 'Pow': {
      const base = canon(node.base);
      const exp = canon(node.exp);
      if (isNum(exp) && exp.value === 1) return base;
      // (sqrt(x))^2 -> x
      if (base.type === 'Sqrt' && isNum(exp) && exp.value === 2) return canon(base.arg);
      // radice come potenza (utile per confronti): sqrt(a) == a^(1/2)
      if (isNum(base) && isNum(exp)) {
        return Num(Math.pow(base.value, exp.value));
      }
      return { type: 'Pow', base, exp };
    }

    case 'Sqrt': {
      const arg = canon(node.arg);
      if (arg.type === 'Pow' && isNum(arg.exp) && arg.exp.value === 2) {
        return canon(arg.base);
      }
      return { type: 'Sqrt', arg };
    }

    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp': {
      const arg = canon(node.arg);
      // Semplificazione sicura "funzione ∘ inversa = identità".
      // f(inversa_di_f(x)) = x è sempre valida (l'inversa restituisce un valore
      // nel ramo principale, dove f è definita).
      // NON applichiamo il verso opposto f⁻¹(f(x)) = x, che varrebbe solo sul
      // ramo principale (per esempio per x fuori da [−π/2, π/2], asin(sin(x)) ≠ x).
      if (arg.type === INVERSE_OF[node.type]) return arg;
      return { type: node.type, arg };
    }

    case 'Neg': {
      const arg = canon(node.arg);
      if (isNum(arg)) return Num(-arg.value);
      // −(−x) => x
      if (arg.type === 'Neg') return arg.arg;
      // -(...)  =>  (-1)*(...) normalizzato dentro il prodotto
      return canon(Mul(Num(-1), arg));
    }

    case 'Eq':
      return Eq(canon(node.left), canon(node.right));

    default:
      throw new Error('Nodo sconosciuto in canonical: ' + node.type);
  }
}

// Ordinamento totale e stabile dei nodi, basato sulla loro rappresentazione testuale.
// Categoria d'ordinamento: coefficienti, poi lettere, poi potenze, ecc.
// Serve a stampare m·v² e non v²·m, e a tenere i termini negativi in fondo
// così l'Add può essere mostrato come differenza (v − v0).
function sortCategory(node) {
  const u = unwrap(node);
  if (u.type === 'Num' && u.value < 0) return 9;
  switch (u.type) {
    case 'Num': return 0;
    case 'Var': return 1;
    case 'Pow': return 2;
    case 'Sqrt': return 3;
    case 'Div': return 4;
    case 'Mul': return 5;
    case 'Add': case 'Sub': return 6;
    case 'Neg': return 9;
    default: return 7;
  }
}

function compareNodes(a, b) {
  const ca = sortCategory(a);
  const cb = sortCategory(b);
  if (ca !== cb) return ca - cb;
  const ta = toText(a);
  const tb = toText(b);
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

// Equivalenza strutturale "a meno di riformulazioni algebriche valide":
// due espressioni sono equivalenti se hanno la stessa forma canonica.
export function equivalentExpr(a, b) {
  return structurallyEqual(canonical(a), canonical(b));
}

// Equivalenza tra equazioni.
// Un'uguaglianza è simmetrica (proprietà simmetrica): A = B è equivalente a
// B = A. Quindi due equazioni sono equivalenti se coincidono membro-a-membro,
// oppure se coincidono dopo lo scambio dei due membri.
export function equivalentEq(eqA, eqB) {
  const sameOrder =
    equivalentExpr(eqA.left, eqB.left) && equivalentExpr(eqA.right, eqB.right);
  const swapped =
    equivalentExpr(eqA.left, eqB.right) && equivalentExpr(eqA.right, eqB.left);
  return sameOrder || swapped;
}

// ---------------------------------------------------------------------------
// Raccolta delle variabili
// ---------------------------------------------------------------------------
export function collectVars(node, out = new Set()) {
  switch (node.type) {
    case 'Num':
      break;
    case 'Var':
      if (node.name !== '±') out.add(node.name);
      break;
    case 'Add':
    case 'Sub':
    case 'Mul':
      node.args.forEach((a) => collectVars(a, out));
      break;
    case 'Div':
      collectVars(node.num, out);
      collectVars(node.den, out);
      break;
    case 'Pow':
      collectVars(node.base, out);
      collectVars(node.exp, out);
      break;
    case 'Sqrt':
    case 'Neg':
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
    case 'Group':
      collectVars(node.arg, out);
      break;
    case 'Eq':
      collectVars(node.left, out);
      collectVars(node.right, out);
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Clonazione (l'AST è immutabile di fatto, ma cloniamo per sicurezza)
// ---------------------------------------------------------------------------
export function clone(node) {
  return JSON.parse(JSON.stringify(node));
}

// ---------------------------------------------------------------------------
// Controllo: l'espressione è "identicamente nulla"? (serve per rifiutare
// denominatori nulli)
// ---------------------------------------------------------------------------
export function isIdenticallyZero(node) {
  if (!node) return false;
  const e = evalConst(canonical(node));
  return e.ok && e.value === 0;
}

// Il nodo contiene la variabile data al primo livello di fattore/termine?
export function containsVar(node, name) {
  return collectVars(unwrap(node)).has(name);
}
