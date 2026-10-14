// render.js — Rendering dell'equazione in notazione matematica, con elementi
// selezionabili e supporto completo al Drag and Drop interattivo tra membri.
//
// Non usiamo KaTeX/MathJax: costruiamo noi l'HTML con frazioni (display:flex),
// esponenti, radicali, così ogni elemento è un nodo DOM selezionabile e possiamo
// collegarlo all'AST. Questo mantiene:
//   - nessuna dipendenza esterna (l'app funziona offline);
//   - ogni lettera/operatore è un elemento distinto, cliccabile e trascinabile;
//   - la struttura matematica (frazioni, potenze) resta visibile;
//   - supporto a denominatori sottintesi (/1) e linee di frazione dinamiche.

import { unwrap, toPretty, FUNC_PRETTY } from './ast.js';

// Ritorna una stringa HTML che rappresenta l'equazione.
export function renderEquation(eq, opts = {}) {
  const {
    selectedId = null,
    dimIds = new Set(),
    targetVar = null,
    interactive = false,
    showImplicitDen = false,
  } = opts;

  if (!interactive) {
    const left = renderNode(eq.left, 'left', opts);
    const right = renderNode(eq.right, 'right', opts);
    return `<span class="math-eq">${left}<span class="eq-sign" aria-label="uguale">=</span>${right}</span>`;
  }

  // Modalità interattiva con Drag and Drop e zone di rilascio
  const leftMember = renderMember(eq.left, 'left', opts);
  const rightMember = renderMember(eq.right, 'right', opts);

  return (
    `<div class="math-eq interactive-math-eq ${showImplicitDen ? 'show-implicit-denominators' : ''}">` +
    `  <div class="math-member-wrap math-member-left">${leftMember}</div>` +
    `  <div class="eq-sign-wrap"><span class="eq-sign" aria-label="uguale">=</span></div>` +
    `  <div class="math-member-wrap math-member-right">${rightMember}</div>` +
    `</div>`
  );
}

function renderMember(node, side, opts) {
  const raw = unwrap(node);
  const isDiv = raw.type === 'Div';

  const adjacentDropzone = opts.interactive
    ? `<div class="dropzone dropzone-adjacent" data-side="${side}" data-slot="add" title="Rilascia qui per trasportare con cambio di segno (regola del trasporto)"><span class="dropzone-label"><span class="dropzone-icon">±</span> sposta termine</span></div>`
    : '';

  if (isDiv) {
    const numContent = renderNode(raw.num, side + '/num', opts);
    const denContent = renderNode(raw.den, side + '/den', opts);
    return (
      `<div class="math-member-content member-has-frac" data-side="${side}">` +
      `  ${adjacentDropzone}` +
      `  <div class="frac">` +
      `    <div class="frac-num dropzone" data-side="${side}" data-slot="num" title="Numeratore di ${side === 'left' ? 'sinistra' : 'destra'} (rilascia per moltiplicare)">${numContent}</div>` +
      `    <div class="frac-bar"></div>` +
      `    <div class="frac-den dropzone" data-side="${side}" data-slot="den" title="Denominatore di ${side === 'left' ? 'sinistra' : 'destra'} (rilascia per dividere)">${denContent}</div>` +
      `  </div>` +
      `</div>`
    );
  }

  // Espressione senza frazione esplicita: denominatore sottinteso appare dinamicamente al passaggio del mouse durante il drag
  const numContent = renderNode(node, side, opts);
  return (
    `<div class="math-member-content member-no-frac" data-side="${side}">` +
    `  ${adjacentDropzone}` +
    `  <div class="member-num dropzone" data-side="${side}" data-slot="num" title="Membro di ${side === 'left' ? 'sinistra' : 'destra'}">${numContent}</div>` +
    `  <div class="dynamic-fraction-wrapper" data-side="${side}">` +
    `    <div class="dynamic-frac-bar"></div>` +
    `    <div class="dynamic-frac-den dropzone" data-side="${side}" data-slot="den" title="Rilascia qui al denominatore per dividere">` +
    `      <span class="dropzone-label"><span class="dropzone-icon">÷</span> rilascia al denominatore</span>` +
    `    </div>` +
    `  </div>` +
    `</div>`
  );
}

// Renderizza un nodo AST. `id` è il percorso usato per la selezione.
function renderNode(node, id, opts) {
  const raw = node;
  // Le parentesi esplicite scritte dall'utente (Group) vanno mostrate:
  // se le togliessimo, (a + b) diventerebbe a + b, cambiando il significato.
  if (raw && raw.type === 'Group') {
    const inner = renderNode(raw.arg, id, { ...opts, hideSign: false });
    return `<span class="node-group-parens"><span class="group-paren">(</span>${inner}<span class="group-paren">)</span></span>`;
  }
  node = unwrap(node);
  const selected = opts.selectedId === id ? ' selected' : '';
  const isTarget = opts.targetVar && node.type === 'Var' && node.name === opts.targetVar;
  const dim = opts.dimIds && opts.dimIds.has(id) ? ' dimmed' : '';

  const span = (inner, extraClass, extraId, extraAttrs = '') =>
    `<span class="math-node ${extraClass || ''}${selected}${dim}" data-id="${extraId || id}"${extraAttrs}>${inner}</span>`;

  const side = id.startsWith('left') ? 'left' : 'right';
  const isDen = id.includes('/den');
  const slot = isDen ? 'den' : 'num';

  switch (node.type) {
    case 'Num': {
      const isDraggable = !!opts.interactive;
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(String(node.value))}" data-side="${side}" data-slot="${slot}" data-node-type="Num" title="Trascina con il mouse"`
        : '';
      const dragCls = isDraggable ? ' draggable-token' : '';
      return span(escapeHtml(String(node.value)), 'node-num' + dragCls, id, dragAttrs);
    }
    case 'Var': {
      const isDraggable = !!opts.interactive;
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(node.name)}" data-side="${side}" data-slot="${slot}" data-node-type="Var" title="Trascina con il mouse ${prettyVar(node.name)}"`
        : '';
      const dragCls = isDraggable ? ' draggable-token' : '';
      return span(
        renderVarHtml(node.name),
        'node-var' + (isTarget ? ' node-target' : '') + dragCls,
        id,
        dragAttrs
      );
    }
    case 'Add':
    case 'Sub': {
      // Stampa i termini negativi come sottrazioni: x − y, non x + −y.
      const isSub = node.type === 'Sub';
      const inner = node.args.map((a, i) => {
        const neg = unwrap(a).type === 'Neg';
        const path = id + '/' + node.type + i;
        if (i === 0) return renderNode(a, path, opts);
        const minus = isSub ? !neg : neg;
        const child = neg ? renderNode(a, path, { ...opts, hideSign: true }) : renderNode(a, path, opts);
        return `<span class="op">${minus ? '−' : '+'}</span>` + child;
      }).join('');
      return span(inner, isSub ? 'node-sub' : 'node-add');
    }
    case 'Mul': {
      const isDraggable = !!opts.interactive;
      const mulSyntax = node.args.map((a) => toPretty(unwrap(a), 0)).join('*');
      const mulPretty = prettyVar(mulSyntax);
      const isParentAddOrSub = id.includes('/Add') || id.includes('/Sub') || id === 'left' || id === 'right';
      const dragAttrs = (isDraggable && isParentAddOrSub)
        ? ` draggable="true" data-var-name="${escapeHtml(mulSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="Mul" title="Trascina l'intero termine ${escapeHtml(mulPretty)}"`
        : '';
      const dragCls = (isDraggable && isParentAddOrSub) ? ' draggable-token math-term-group' : '';
      return span(
        (isDraggable && isParentAddOrSub ? `<span class="term-group-tag" title="Termine composto: trascina per spostarlo tutto insieme">📦</span>` : '') +
        renderMulArgs(node.args, id, opts),
        'node-mul' + dragCls,
        id,
        dragAttrs
      );
    }
    case 'Div': {
      return span(
        `<span class="frac"><span class="frac-num">${renderNode(node.num, id + '/num', opts)}</span>` +
        `<span class="frac-bar"></span>` +
        `<span class="frac-den">${renderNode(node.den, id + '/den', opts)}</span></span>`,
        'node-div'
      );
    }
    case 'Pow': {
      const isDraggable = !!opts.interactive;
      const powText = toPretty(node, 0);
      const isTarget = opts.targetVar && unwrap(node.base).type === 'Var' && unwrap(node.base).name === opts.targetVar;
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(powText)}" data-side="${side}" data-slot="${slot}" data-node-type="Pow" title="Trascina l'intera potenza ${escapeHtml(prettyVar(powText))}"`
        : '';
      const dragCls = isDraggable ? ' draggable-token draggable-pow' : '';
      const targetCls = isTarget ? ' node-target' : '';

      const baseHtml = renderNode(node.base, id + '/base', { ...opts, interactive: false });
      const expText = node.exp.type === 'Num' ? escapeHtml(String(node.exp.value)) : toPretty(node.exp, 0);
      return span(
        `<span class="pow-base">${baseHtml}</span><sup class="node-exp">${escapeHtml(expText)}</sup>`,
        'node-pow' + dragCls + targetCls,
        id,
        dragAttrs
      );
    }
    case 'Sqrt': {
      const bodyContent = renderNode(node.arg, id + '/arg', opts);
      return span(
        `<span class="math-radical">` +
        `<svg class="radical-surd" viewBox="0 0 16 36" preserveAspectRatio="none" aria-hidden="true">` +
        `<path d="M 2 20 L 5.5 17.5 L 9 32 L 15 2 L 16 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
        `</svg>` +
        `<span class="radical-body">${bodyContent}</span>` +
        `</span>`,
        'node-sqrt'
      );
    }
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
      return span(
        `<span class="fn-name">${escapeHtml(FUNC_PRETTY[node.type])}</span>` +
        `<span class="fn-args">(${renderNode(node.arg, id + '/arg', opts)})</span>`,
        'node-fn node-' + node.type.toLowerCase()
      );
    case 'Neg': {
      const u = unwrap(node.arg);
      const body = renderNode(node.arg, id + '/arg', { ...opts, hideSign: false });
      const bodyHtml = (u.type === 'Add' || u.type === 'Sub')
        ? `<span class="neg-parens">(${body})</span>`
        : body;
      const sign = opts.hideSign ? '' : '−';
      return span(sign + bodyHtml, 'node-neg');
    }
    case 'Group':
      return span(
        `(${renderNode(node.arg, id + '/g', opts)})`,
        'node-group'
      );
    default:
      return span(escapeHtml(toPretty(node, 0)), '');
  }
}

function renderArgs(args, id, type, opts, sep) {
  return args
    .map((a, i) => renderNode(a, id + '/' + type + i, opts))
    .join(`<span class="op">${sep.trim()}</span>`);
}

// Prodotto: usa il punto mediano, oppure giustapposizione per le variabili.
function renderMulArgs(args, id, opts) {
  return args
    .map((a, i) => renderNode(a, id + '/Mul' + i, opts))
    .join('<span class="op">·</span>');
}

const SUB_DIGITS = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ', 'y': 'ᵧ',
};

const SUP_DIGITS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

const GREEK_VARS = {
  pi: 'π', rho: 'ρ', eta: 'η', lam: 'λ', eps: 'ε',
  mu: 'μ', theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ',
  delta: 'δ', omega: 'ω', phi: 'φ', sigma: 'σ', tau: 'τ', nu: 'ν',
  Delta: 'Δ', Lambda: 'Λ', Omega: 'Ω', Sigma: 'Σ', Phi: 'Φ',
};

const SPECIAL_PRETTY_VARS = {
  dT: 'ΔT', dl: 'Δl', dlam: 'Δλ', dU: 'ΔU', dV: 'ΔV', dt0: 'Δt₀',
  at: 'aₜ', ac: 'a_c',
  v0x: 'v₀ₓ', v0y: 'v₀ᵧ',
  PhiB: 'Φ_B', PhiE: 'Φ_E',
  Icm: 'I_cm', xcm: 'x_cm',
  Req: 'R_eq', Ceq: 'C_eq',
  Vmax: 'V_max', Veff: 'V_eff', Ieff: 'I_eff',
  rho_corpo: 'ρ_corpo', rho_fluido: 'ρ_fluido',
  V_imm: 'V_imm', V_tot: 'V_tot',
};

// Genera l'HTML tipografico per le variabili con pedici (sub) e simboli greci corretti.
export function renderVarHtml(name) {
  if (!name) return '';

  // Quantità con Delta (es. dT -> ΔT, dl -> Δl)
  if (name.startsWith('d') && name.length > 1 && !['d', 'dt'].includes(name)) {
    const rest = name.slice(1);
    if (GREEK_VARS[rest]) return `<span class="var-base">Δ${GREEK_VARS[rest]}</span>`;
    if (['T', 'l', 'U', 'V'].includes(rest)) return `<span class="var-base">Δ${rest}</span>`;
    if (rest === 't0') return `<span class="var-base">Δt</span><sub class="var-sub">0</sub>`;
  }

  // Variabili con underscore esplicito (es. rho_corpo -> ρ_corpo, V_imm -> V_imm)
  if (name.includes('_')) {
    const parts = name.split('_');
    const base = GREEK_VARS[parts[0]] || parts[0];
    const sub = parts.slice(1).join('_');
    return `<span class="var-base">${escapeHtml(base)}</span><sub class="var-sub">${escapeHtml(sub)}</sub>`;
  }

  // Pedici noti per grandezze composte
  const knownSubs = {
    Ceq: ['C', 'eq'], Req: ['R', 'eq'],
    Ieff: ['I', 'eff'], Veff: ['V', 'eff'], Vmax: ['V', 'max'],
    Icm: ['I', 'cm'], xcm: ['x', 'cm'],
    PhiB: ['Φ', 'B'], PhiE: ['Φ', 'E'],
    at: ['a', 't'], ac: ['a', 'c'],
    Ec1: ['E', 'c1'], Ec2: ['E', 'c2'],
    Ep1: ['E', 'p1'], Ep2: ['E', 'p2'],
    v0x: ['v', '0x'], v0y: ['v', '0y'],
  };
  if (knownSubs[name]) {
    const [b, sub] = knownSubs[name];
    return `<span class="var-base">${b}</span><sub class="var-sub">${sub}</sub>`;
  }

  // Lettere greche con cifre (es. theta0 -> θ₀, omega0 -> ω₀, eps0 -> ε₀)
  for (const [k, v] of Object.entries(GREEK_VARS)) {
    if (name.startsWith(k)) {
      const rest = name.slice(k.length);
      if (/^\d+$/.test(rest)) {
        return `<span class="var-base">${v}</span><sub class="var-sub">${rest}</sub>`;
      }
    }
  }

  // Lettere con cifre (es. C1 -> C₁, C2 -> C₂, v0 -> v₀, x0 -> x₀)
  const m = name.match(/^([a-zA-Z]+)(\d+)$/);
  if (m) {
    const base = GREEK_VARS[m[1]] || m[1];
    return `<span class="var-base">${base}</span><sub class="var-sub">${m[2]}</sub>`;
  }

  if (GREEK_VARS[name]) return `<span class="var-base">${GREEK_VARS[name]}</span>`;
  return `<span class="var-base">${escapeHtml(name)}</span>`;
}

// Nomi "carini" per testo semplice: theta0 -> θ₀, omega0 -> ω₀, t^2 -> t², pi -> π, etc.
export function prettyVar(name) {
  if (SPECIAL_PRETTY_VARS[name]) return SPECIAL_PRETTY_VARS[name];

  if (typeof name === 'string' && name.includes('^')) {
    const [b, e] = name.split('^');
    const sup = (e || '').split('').map((c) => SUP_DIGITS[c] || c).join('');
    return prettyVar(b) + sup;
  }

  if (name.startsWith('d') && name.length > 1 && !['d', 'dt'].includes(name)) {
    const rest = name.slice(1);
    if (GREEK_VARS[rest]) return 'Δ' + GREEK_VARS[rest];
    if (['T', 'l', 'U', 'V'].includes(rest)) return 'Δ' + rest;
    if (rest === 't0') return 'Δt₀';
  }

  // Verifica lettere greche con pedice (es. theta0 -> θ₀, omega1 -> ω₁, eps0 -> ε₀)
  for (const [k, v] of Object.entries(GREEK_VARS)) {
    if (name.startsWith(k)) {
      const rest = name.slice(k.length);
      if (/^\d+$/.test(rest)) {
        return v + rest.split('').map((c) => SUB_DIGITS[c] || c).join('');
      }
    }
  }

  // Verifica variabili con cifre (es. x0 -> x₀, v0 -> v₀, m1 -> m₁, c2 -> c₂)
  const m = name.match(/^([a-zA-Z]+)(\d+)$/);
  if (m) {
    const base = GREEK_VARS[m[1]] || m[1];
    const sub = m[2].split('').map((c) => SUB_DIGITS[c] || c).join('');
    return base + sub;
  }

  if (GREEK_VARS[name]) return GREEK_VARS[name];
  return name;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Trasforma un'equazione in una stringa HTML "inline" per la cronologia.
export function renderEquationInline(eq) {
  return renderEquation(eq, { interactive: false });
}
