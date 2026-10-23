// js/a11y.js — Motore di accessibilità avanzata (a11y) per DSA e studenti non vedenti:
// vocalizzazione matematica naturale in italiano (aria-live & SpeechSynthesis),
// supporto calibrazione tocco/penna per Lavagne Interattive Multimediali (LIM),
// e gestione profili WCAG AAA ad alto contrasto.

import { unwrap } from './ast.js';

// Mappatura fonetica delle lettere greche per la sintesi e gli screen reader italiani
const GREEK_NAMES_IT = {
  theta: 'theta',
  omega: 'omega',
  alpha: 'alfa',
  beta: 'beta',
  gamma: 'gamma',
  delta: 'delta',
  Delta: 'delta',
  lambda: 'lambda',
  mu: 'mu',
  rho: 'ro',
  pi: 'pi greco',
  phi: 'fi',
  psi: 'psi',
  sigma: 'sigma',
  tau: 'tau',
  eps: 'epsilon',
  epsilon: 'epsilon',
};

// Pedici fisici e notazioni comuni in didattica STEM
const SUBSCRIPTS_IT = {
  '0': 'zero',
  '1': 'uno',
  '2': 'due',
  '3': 'tre',
  '4': 'quattro',
  'eq': 'equivalente',
  'c': 'cinetica',
  'p': 'potenziale',
  'tot': 'totale',
  'in': 'iniziale',
  'fin': 'finale',
  's': 'sorgente',
  'o': 'osservatore',
};

/**
 * Converte il nome di una variabile nella sua lettura naturale italiana.
 * Esempi:
 *   "v" -> "v"
 *   "v0" -> "v zero"
 *   "theta0" -> "theta zero"
 *   "Req" -> "R equivalente"
 *   "Ec" -> "energia cinetica"
 *   "Delta_t" -> "delta t"
 */
export function verbalizeVar(name) {
  if (!name) return '';
  if (name === '±') return 'più o meno';

  // Casi speciali fisici
  if (name === 'Ec' || name === 'E_c' || name === 'Ek') return 'energia cinetica';
  if (name === 'Ep' || name === 'E_p') return 'energia potenziale';
  if (name === 'Req' || name === 'R_eq') return 'R equivalente';
  if (name === 'Ceq' || name === 'C_eq') return 'C equivalente';

  // Delta (es. dt, ds, dv, dx, dL, dT)
  if (name.startsWith('d') && name.length > 1 && !['d', 'div'].includes(name)) {
    const sub = name.slice(1);
    const subVerbal = verbalizeVar(sub);
    return `delta ${subVerbal}`;
  }
  if (name.startsWith('Delta_') || name.startsWith('Delta')) {
    const sub = name.replace(/^Delta_?/, '');
    return `delta ${verbalizeVar(sub)}`;
  }

  // Lettere greche con eventuale pedice (es. theta0 -> theta zero)
  for (const [k, v] of Object.entries(GREEK_NAMES_IT)) {
    if (name.startsWith(k)) {
      const rest = name.slice(k.length).replace(/^_/, '');
      if (!rest) return v;
      const subName = SUBSCRIPTS_IT[rest] || rest;
      return `${v} ${subName}`;
    }
  }

  // Variabili con pedice alfanumerico (es. v0, a_x, m1, p0)
  const m = name.match(/^([a-zA-Z]+)[_]?([a-zA-Z0-9]+)$/);
  if (m && m[2]) {
    const base = GREEK_NAMES_IT[m[1]] || m[1];
    const sub = SUBSCRIPTS_IT[m[2]] || m[2];
    return `${base} ${sub}`;
  }

  return GREEK_NAMES_IT[name] || name;
}

/**
 * Verbalizza ricorsivamente un nodo AST matematico in italiano naturale per screen reader (NVDA, JAWS, VoiceOver).
 */
export function verbalizeAst(node, context = {}) {
  if (!node) return '';
  const u = unwrap(node);

  switch (u.type) {
    case 'Num': {
      const val = u.value;
      if (val === -1 && context.inMul) return 'meno';
      return String(val).replace('.', ' virgola ');
    }

    case 'Var':
      return verbalizeVar(u.name);

    case 'Neg': {
      const inner = verbalizeAst(u.arg, { ...context, inNeg: true });
      return `meno ${inner}`;
    }

    case 'Add':
    case 'Sub': {
      const isSub = u.type === 'Sub';
      const parts = u.args.map((arg, idx) => {
        const text = verbalizeAst(arg, { ...context, inSum: true });
        if (idx === 0) return text;
        const op = isSub ? 'meno' : 'più';
        return `${op} ${text}`;
      });
      return parts.join(' ');
    }

    case 'Mul': {
      // Casi particolari: (1/2)*m*v^2 -> "un mezzo per m per v al quadrato"
      const parts = [];
      for (let i = 0; i < u.args.length; i++) {
        const arg = u.args[i];
        const un = unwrap(arg);
        if (un.type === 'Div') {
          const numU = unwrap(un.num);
          const denU = unwrap(un.den);
          if (numU.type === 'Num' && denU.type === 'Num') {
            if (numU.value === 1 && denU.value === 2) { parts.push('un mezzo'); continue; }
            if (numU.value === 1 && denU.value === 3) { parts.push('un terzo'); continue; }
            if (numU.value === 1 && denU.value === 4) { parts.push('un quarto'); continue; }
            if (numU.value === 2 && denU.value === 3) { parts.push('due terzi'); continue; }
            if (numU.value === 3 && denU.value === 4) { parts.push('tre quarti'); continue; }
          }
        }
        parts.push(verbalizeAst(arg, { ...context, inMul: true }));
      }
      return parts.filter(Boolean).join(' per ');
    }

    case 'Div': {
      const numU = unwrap(u.num);
      const denU = unwrap(u.den);

      // Frazioni numeriche speciali
      if (numU.type === 'Num' && denU.type === 'Num') {
        if (numU.value === 1 && denU.value === 2) return 'un mezzo';
        if (numU.value === 1 && denU.value === 3) return 'un terzo';
        if (numU.value === 1 && denU.value === 4) return 'un quarto';
        if (numU.value === 2 && denU.value === 3) return 'due terzi';
        if (numU.value === 3 && denU.value === 4) return 'tre quarti';
      }

      const numText = verbalizeAst(u.num, { ...context, inFracNum: true });
      const denText = verbalizeAst(u.den, { ...context, inFracDen: true });

      // Se numeratore o denominatore sono espressioni composte, aggiunge chiarezza didattica
      const isNumCompound = numU.type === 'Add' || numU.type === 'Sub';
      const isDenCompound = denU.type === 'Add' || denU.type === 'Sub';

      if (isNumCompound || isDenCompound) {
        return `frazione con numeratore ${numText}, fratto denominatore ${denText}`;
      }
      return `${numText} fratto ${denText}`;
    }

    case 'Pow': {
      const baseText = verbalizeAst(u.base, context);
      const expU = unwrap(u.exp);
      if (expU.type === 'Num') {
        if (expU.value === 2) return `${baseText} al quadrato`;
        if (expU.value === 3) return `${baseText} al cubo`;
        if (expU.value === -1) return `${baseText} alla meno uno`;
        return `${baseText} elevato a ${expU.value}`;
      }
      const expText = verbalizeAst(u.exp, context);
      return `${baseText} elevato alla ${expText}`;
    }

    case 'Sqrt':
      return `radice quadrata di ${verbalizeAst(u.arg, context)}`;

    case 'Sin':
      return `seno di ${verbalizeAst(u.arg, context)}`;

    case 'Cos':
      return `coseno di ${verbalizeAst(u.arg, context)}`;

    case 'Tan':
      return `tangente di ${verbalizeAst(u.arg, context)}`;

    case 'Ln':
      return `logaritmo naturale di ${verbalizeAst(u.arg, context)}`;

    case 'Asin':
      return `arcoseno di ${verbalizeAst(u.arg, context)}`;

    case 'Acos':
      return `arcocoseno di ${verbalizeAst(u.arg, context)}`;

    case 'Atan':
      return `arcotangente di ${verbalizeAst(u.arg, context)}`;

    case 'Exp':
      return `esponenziale di ${verbalizeAst(u.arg, context)}`;

    case 'Group':
      return `quantità ${verbalizeAst(u.arg, context)}`;

    case 'Eq':
      return `${verbalizeAst(u.left, context)} uguale a ${verbalizeAst(u.right, context)}`;

    default:
      return '';
  }
}

/**
 * Restituisce la verbalizzazione completa e naturale di un'equazione per screen reader.
 * Esempio: v = s/t -> "v uguale a s fratto t"
 */
export function verbalizeEquation(eq) {
  if (!eq) return 'Nessuna equazione attiva';
  return `${verbalizeAst(eq.left)} uguale a ${verbalizeAst(eq.right)}`;
}

/**
 * Aggiorna la regione live (aria-live="polite") per screen reader e studenti DSA.
 */
export function announceMathLive(message, alert = false) {
  if (typeof document === 'undefined') return;
  const targetId = alert ? 'math-live-alert' : 'math-live-verbalizer';
  const el = document.getElementById(targetId);
  if (el) {
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }
}

/**
 * Sintesi vocale Web Speech API in lingua italiana con cadenza didattica rilassata.
 */
let currentUtterance = null;
export function speakMath(text, onEnd = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    u.rate = 0.92; // ritmo leggermente più lento per massima comprensione DSA
    u.pitch = 1.0;
    currentUtterance = u;
    if (onEnd) {
      u.onend = () => { currentUtterance = null; onEnd(); };
      u.onerror = () => { currentUtterance = null; };
    }
    window.speechSynthesis.speak(u);
    return true;
  } catch (_) {
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    } catch (_) {}
  }
}
