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
      const sep = node.type === 'Add' ? ' + ' : ' − ';
      const s = node.args.map((a) => toPretty(a, 1)).join(sep);
      return wrap(s, 1, parentPrec > 1);
    }
    case 'Mul': {
      const s = node.args.map((a) => toPretty(a, 2)).join('·');
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
        Ieff: 'I_{\\text{eff}}', Veff: 'V_{\\text{eff}}', Vmax: 'V_{\\text{max}}',
        Icm: 'I_{\\text{cm}}', xcm: 'x_{\\text{cm}}',
        PhiB: '\\Phi_B', PhiE: '\\Phi_E',
        at: 'a_t', ac: 'a_c',
        Ec1: 'E_{c1}', Ec2: 'E_{c2}',
        Ep1: 'E_{p1}', Ep2: 'E_{p2}',
        v0x: 'v_{0x}', v0y: 'v_{0y}',
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
      const sep = node.type === 'Add' ? ' + ' : ' - ';
      const s = node.args.map((a) => toLatex(a, 1)).join(sep);
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
      // somma le costanti
      let constSum = 0;
      const rest = [];
      for (const p of flat) {
        const e = evalConst(p);
        if (e.ok) constSum += e.value;
        else rest.push(p);
      }
      if (constSum !== 0) rest.push(Num(constSum));
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
      const parts = node.args.map(canon);
      const flat = [];
      for (const p of parts) {
        if (p.type === 'Mul') flat.push(...p.args);
        else flat.push(p);
      }
      let constProd = 1;
      const rest = [];
      for (const p of flat) {
        const e = evalConst(p);
        if (e.ok) constProd *= e.value;
        else rest.push(p);
      }
      if (constProd === 0) return Num(0); // un fattore costante 0 annulla il prodotto
      if (rest.length === 0) return Num(constProd);
      if (constProd !== 1) rest.push(Num(constProd));
      if (rest.length === 1) return rest[0];
      rest.sort(compareNodes);
      return flattenAssoc('Mul', rest);
    }

    case 'Div': {
      const num = canon(node.num);
      const den = canon(node.den);
      if (isNum(den) && den.value === 1) return num;
      return { type: 'Div', num, den };
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
      // -(...)  =>  (-1)*(...) normalizzato dentro il prodotto
      return { type: 'Mul', args: [Num(-1), arg] };
    }

    case 'Eq':
      return Eq(canon(node.left), canon(node.right));

    default:
      throw new Error('Nodo sconosciuto in canonical: ' + node.type);
  }
}

// Ordinamento totale e stabile dei nodi, basato sulla loro rappresentazione testuale.
function compareNodes(a, b) {
  return toText(a) < toText(b) ? -1 : toText(a) > toText(b) ? 1 : 0;
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
      out.add(node.name);
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
  const e = evalConst(canonical(node));
  return e.ok && e.value === 0;
}

// Il nodo contiene la variabile data al primo livello di fattore/termine?
export function containsVar(node, name) {
  return collectVars(unwrap(node)).has(name);
}
