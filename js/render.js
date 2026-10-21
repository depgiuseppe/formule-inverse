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

  const memberOpts = { ...opts, eq };
  if (!interactive) {
    const left = renderNode(eq.left, 'left', memberOpts);
    const right = renderNode(eq.right, 'right', memberOpts);
    return `<span class="math-eq">${left}<span class="eq-sign" aria-label="uguale">=</span>${right}</span>`;
  }

  // Modalità interattiva con Drag and Drop e zone di rilascio
  const leftMember = renderMember(eq.left, 'left', memberOpts);
  const rightMember = renderMember(eq.right, 'right', memberOpts);

  return (
    `<div class="math-eq interactive-math-eq ${showImplicitDen ? 'show-implicit-denominators' : ''}">` +
    `  <div class="math-member-wrap math-member-left">${leftMember}</div>` +
    `  <div class="eq-sign-wrap"><span class="eq-sign" aria-label="uguale">=</span></div>` +
    `  <div class="math-member-wrap math-member-right">${rightMember}</div>` +
    `</div>`
  );
}

// Spazio di inserimento che si apre DURANTE il trascinamento accanto alle
// quantità già presenti, rispettando la posizione (numeratore o denominatore).
// È solo visivo: non è una dropzone, così il rilascio resta gestito dal
// contenitore (numeratore/denominatore) in cui si trova.
function insertionSlot(side, slot) {
  const where = slot === 'num' ? 'accanto al numeratore' : 'accanto al denominatore';
  return `<span class="drop-slot drop-slot-${slot}" data-side="${side}" data-slot="${slot}" aria-hidden="true" title="Rilascia qui ${where}"><span class="drop-slot-plus">+</span></span>`;
}

function renderMember(node, side, opts) {
  const raw = unwrap(node);
  const isDiv = raw.type === 'Div';

  const adjacentDropzone = opts.interactive
    ? `<div class="dropzone dropzone-adjacent" data-side="${side}" data-slot="add" title="Rilascia qui per trasportare con cambio di segno (regola del trasporto)"><span class="dropzone-label"><span class="dropzone-icon">±</span> sposta termine</span></div>`
    : '';
  const numSlot = opts.interactive ? insertionSlot(side, 'num') : '';
  const denSlot = opts.interactive ? insertionSlot(side, 'den') : '';

  if (isDiv) {
    const numContent = renderNode(raw.num, side + '/num', opts);
    const denContent = renderNode(raw.den, side + '/den', opts);
    return (
      `<div class="math-member-content member-has-frac" data-side="${side}">` +
      `  ${adjacentDropzone}` +
      `  <div class="frac">` +
      `    <div class="frac-num dropzone" data-side="${side}" data-slot="num" title="Numeratore di ${side === 'left' ? 'sinistra' : 'destra'} (rilascia per moltiplicare)">${numContent}${numSlot}</div>` +
      `    <div class="frac-bar"></div>` +
      `    <div class="frac-den dropzone" data-side="${side}" data-slot="den" title="Denominatore di ${side === 'left' ? 'sinistra' : 'destra'} (rilascia per dividere)">${denContent}${denSlot}</div>` +
      `  </div>` +
      `</div>`
    );
  }

  // Espressione senza frazione esplicita: denominatore sottinteso appare dinamicamente al passaggio del mouse durante il drag
  const numContent = renderNode(node, side, opts);
  return (
    `<div class="math-member-content member-no-frac" data-side="${side}">` +
    `  ${adjacentDropzone}` +
    `  <div class="member-num dropzone" data-side="${side}" data-slot="num" title="Membro di ${side === 'left' ? 'sinistra' : 'destra'}">${numContent}${numSlot}</div>` +
    `  <div class="dynamic-fraction-wrapper" data-side="${side}">` +
    `    <div class="dynamic-frac-bar"></div>` +
    `    <div class="dynamic-frac-den dropzone" data-side="${side}" data-slot="den" title="Rilascia qui al denominatore per dividere">` +
    `      <span class="dropzone-label"><span class="dropzone-icon">÷</span> rilascia al denominatore</span>${denSlot}` +
    `    </div>` +
    `  </div>` +
    `</div>`
  );
}

function hasFraction(n) {
  if (!n) return false;
  const u = unwrap(n);
  if (u.type === 'Div') return true;
  if (u.args) return u.args.some(hasFraction);
  if (u.arg) return hasFraction(u.arg);
  if (u.base && hasFraction(u.base)) return true;
  if (u.exp && hasFraction(u.exp)) return true;
  if (u.num && hasFraction(u.num)) return true;
  if (u.den && hasFraction(u.den)) return true;
  return false;
}

// Renderizza un nodo AST. `id` è il percorso usato per la selezione.
export function renderNode(node, id, opts) {
  const raw = node;
  // Le parentesi esplicite scritte dall'utente (Group) vanno mostrate:
  // se le togliessimo, (a + b) diventerebbe a + b, cambiando il significato.
  if (raw && raw.type === 'Group') {
    const u = unwrap(raw.arg);
    // In notazione 2D con barra orizzontale, una frazione autonoma (es. (1/2) in (1/2)*k*x^2)
    // non necessita di parentesi a meno che non sia la base di una potenza (es. (1/2)^2).
    if (u.type === 'Div' && !opts.isPowBase) {
      return renderNode(raw.arg, id, opts);
    }
    // Una singola variabile o numero racchiuso da parentesi superflue es. (x) o (2)
    if ((u.type === 'Num' || u.type === 'Var') && !opts.isPowBase) {
      return renderNode(raw.arg, id, opts);
    }
    // Parentesi che racchiudono l'intero numeratore o denominatore di una frazione
    // (create per la sintassi lineare 1D, es. (2*v0)/g o (m1*v1+m2*v2)/(m1+m2)):
    // nella frazione 2D la linea di frazione definisce già il raggruppamento visivo.
    if ((id.endsWith('/num') || id.endsWith('/den')) && !opts.isPowBase) {
      return renderNode(raw.arg, id, opts);
    }
    const side = id.startsWith('left') ? 'left' : 'right';
    const isDen = id.includes('/den');
    const slot = isDen ? 'den' : 'num';
    const hasFrac = hasFraction(raw.arg);
    const isDraggable = !!opts.interactive;
    const groupSyntax = toPretty(u, 0);
    const groupPretty = prettyVar(groupSyntax);
    const dragAttrs = isDraggable
      ? ` draggable="true" data-var-name="${escapeHtml(groupSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${u.type}" title="Trascina l'intero blocco (${escapeHtml(groupPretty)})"`
      : '';
    const dragCls = isDraggable ? ' draggable-token math-term-group math-factor-group' : '';
    const inner = renderNode(raw.arg, id, { ...opts, interactive: false, hideSign: false, isPowBase: false });
    const cls = 'node-group-parens' + (hasFrac ? ' has-frac' : '') + dragCls;
    return `<span class="${cls}" data-id="${id}"${dragAttrs}><span class="group-paren">(</span>${inner}<span class="group-paren">)</span></span>`;
  }
  node = unwrap(node);
  const selected = opts.selectedId === id ? ' selected' : '';
  const isTarget = opts.targetVar && node.type === 'Var' && node.name === opts.targetVar;
  const dim = opts.dimIds && opts.dimIds.has(id) ? ' dimmed' : '';

  const span = (inner, extraClass, extraId, extraAttrs = '') => {
    const baseClass = opts.isInsideCompound
      ? (extraClass || '')
      : `math-node ${extraClass || ''}${selected}${dim}`;
    return `<span class="${baseClass}" data-id="${extraId || id}"${extraAttrs}>${inner}</span>`;
  };

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
      // Il segno ± davanti a una radice si scrive ±√(...).
      const isSub = node.type === 'Sub';
      if (!isSub && node.args.length === 2) {
        const first = unwrap(node.args[0]);
        if (first.type === 'Var' && first.name === '±') {
          return span(
            `<span class="op">±</span>` + renderNode(node.args[1], id + '/Add1', { ...opts, hideSign: true }),
            'node-add'
          );
        }
      }
      const isWholeDen = isDen && (id.endsWith('/den') || !id.includes('/Mul'));
      const isWholeFracNum = id.endsWith('/num') && !id.includes('/Mul') && !id.includes('/Add') && !id.includes('/Sub');
      const isDraggableDenOrNum = !!opts.interactive && (isWholeDen || isWholeFracNum);
      const childOpts = isDraggableDenOrNum ? { ...opts, interactive: false } : opts;

      const inner = node.args.map((a, i) => {
        const u = unwrap(a);
        const isNeg = u.type === 'Neg' || (u.type === 'Num' && u.value < 0);
        const bodyNode = u.type === 'Neg' ? u.arg : (u.type === 'Num' && u.value < 0 ? { type: 'Num', value: -u.value } : a);
        const path = id + '/' + node.type + i;
        if (i === 0) {
          if (isNeg) return `<span class="op">−</span>` + renderNode(bodyNode, path, childOpts);
          if (u.type === 'Num' && u.value === 0 && node.args.length > 1) {
            return `<span class="neutral-fade-wrap">${renderNode(a, path, childOpts)}<span class="op neutral-fade-op">+</span></span>`;
          }
          return renderNode(a, path, childOpts);
        }
        const minus = isSub ? !isNeg : isNeg;
        const child = renderNode(bodyNode, path, childOpts);
        const opSymbol = minus ? '−' : '+';
        if (u.type === 'Num' && u.value === 0 && node.args.length > 1) {
          return `<span class="neutral-fade-wrap"><span class="op neutral-fade-op">${opSymbol}</span>${child}</span>`;
        }
        return `<span class="op">${opSymbol}</span>` + child;
      }).join('');

      let dragAttrs = '';
      let dragCls = '';
      if (isDraggableDenOrNum) {
        const syntax = toPretty(node, 0);
        const pretty = prettyVar(syntax);
        dragAttrs = ` draggable="true" data-var-name="${escapeHtml(syntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${node.type}" title="${isWholeDen ? `Trascina il denominatore (${escapeHtml(pretty)}) al numeratore dell'altro membro` : `Trascina il numeratore (${escapeHtml(pretty)}) al denominatore dell'altro membro`}"`;
        dragCls = ' draggable-token math-term-group math-factor-group';
      }

      return span(inner, (isSub ? 'node-sub' : 'node-add') + dragCls, id, dragAttrs);
    }
    case 'Mul': {
      const isDraggable = !!opts.interactive;
      const mulSyntax = node.args.map((a) => {
        const u = unwrap(a);
        if (u.type === 'Add' || u.type === 'Sub') return `(${toPretty(u, 0)})`;
        return toPretty(u, 0);
      }).join('*');
      const mulPretty = prettyVar(mulSyntax);
      const isParentAddOrSub = id.includes('/Add') || id.includes('/Sub');
      const isWholeMember = id === side || id === `${side}/num` || id === `${side}/den`;
      const canDragGroup = isDraggable && (isParentAddOrSub || isWholeMember);
      const dragAttrs = canDragGroup
        ? ` draggable="true" data-var-name="${escapeHtml(mulSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="Mul" title="Trascina l'intero blocco ${escapeHtml(mulPretty)}"`
        : '';
      const dragCls = canDragGroup ? ' draggable-token math-term-group' : '';
      return span(
        (canDragGroup ? `<span class="term-group-tag" title="Termine composto: trascina per spostarlo tutto insieme">📦</span>` : '') +
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

      let baseHtml = renderNode(node.base, id + '/base', { ...opts, interactive: false, isPowBase: true });
      const uBase = unwrap(node.base);
      if (node.base.type !== 'Group' && (uBase.type === 'Add' || uBase.type === 'Sub' || uBase.type === 'Mul' || uBase.type === 'Div')) {
        const hasFrac = hasFraction(uBase);
        const cls = 'node-group-parens' + (hasFrac ? ' has-frac' : '');
        baseHtml = `<span class="${cls}"><span class="group-paren">(</span>${baseHtml}<span class="group-paren">)</span></span>`;
      }
      const expText = node.exp.type === 'Num' ? escapeHtml(String(node.exp.value)) : toPretty(node.exp, 0);
      return span(
        `<span class="pow-base">${baseHtml}</span><sup class="node-exp">${escapeHtml(expText)}</sup>`,
        'node-pow' + dragCls + targetCls,
        id,
        dragAttrs
      );
    }
    case 'Sqrt': {
      const isDraggable = !!opts.interactive;
      const sqrtSyntax = toPretty(node, 0);
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(sqrtSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="Sqrt" title="Trascina la radice ${escapeHtml(prettyVar(sqrtSyntax))}"`
        : '';
      const dragCls = isDraggable ? ' draggable-token' : '';
      const bodyContent = renderNode(node.arg, id + '/arg', { ...opts, interactive: false });
      return span(
        `<span class="math-radical">` +
        `<svg class="radical-surd" viewBox="0 0 16 36" preserveAspectRatio="none" aria-hidden="true">` +
        `<path d="M 2 20 L 5.5 17.5 L 9 32 L 15 2 L 16 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
        `</svg>` +
        `<span class="radical-body">${bodyContent}</span>` +
        `</span>`,
        'node-sqrt' + dragCls,
        id,
        dragAttrs
      );
    }
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp': {
      const isDraggable = !!opts.interactive;
      const fnSyntax = toPretty(node, 0);
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(fnSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${node.type}" title="Trascina la funzione ${escapeHtml(prettyVar(fnSyntax))}"`
        : '';
      const dragCls = isDraggable ? ' draggable-token' : '';
      return span(
        `<span class="fn-name">${escapeHtml(FUNC_PRETTY[node.type])}</span>` +
        `<span class="fn-args">(${renderNode(node.arg, id + '/arg', { ...opts, interactive: false })})</span>`,
        'node-fn node-' + node.type.toLowerCase() + dragCls,
        id,
        dragAttrs
      );
    }
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

// Prodotto: usa il punto mediano, oppure giustapposizione per le variabili.
function renderMulArgs(args, id, opts) {
  const hasMultiple = args.length > 1;
  const side = id.startsWith('left') ? 'left' : 'right';
  const isDen = id.includes('/den');
  const slot = isDen ? 'den' : 'num';
  const rendered = args.map((a, i) => {
    const u = unwrap(a);
    const isNeutralOne = hasMultiple && u.type === 'Num' && u.value === 1;
    const isCompoundFactor = u.type === 'Add' || u.type === 'Sub';
    let nodeHtml = renderNode(isCompoundFactor ? u : a, id + '/Mul' + i, isCompoundFactor ? { ...opts, interactive: false, isInsideCompound: true } : opts);
    if (isCompoundFactor) {
      const hasFrac = hasFraction(u);
      const isDraggable = !!opts.interactive;
      const factorSyntax = toPretty(u, 0);
      const factorPretty = prettyVar(factorSyntax);
      const dragAttrs = isDraggable
        ? ` draggable="true" data-var-name="${escapeHtml(factorSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${u.type}" title="Trascina l'intero blocco (${escapeHtml(factorPretty)})"`
        : '';
      const dragCls = isDraggable ? ' draggable-token math-term-group math-factor-group' : '';
      const isSelected = opts.selectedId === (id + '/Mul' + i) ? ' selected' : '';
      const cls = `math-node node-group-parens${isSelected}` + (hasFrac ? ' has-frac' : '') + dragCls;
      nodeHtml = `<span class="${cls}" data-id="${id + '/Mul' + i}"${dragAttrs} tabindex="0" role="button" aria-label="Blocco (${escapeHtml(factorPretty)})"><span class="group-paren">(</span>${nodeHtml}<span class="group-paren">)</span></span>`;
    }
    return {
      html: nodeHtml,
      isNeutralOne,
    };
  });

  let html = '';
  for (let i = 0; i < rendered.length; i++) {
    const item = rendered[i];
    if (item.isNeutralOne) {
      if (i === 0 && rendered.length > 1) {
        html += `<span class="neutral-fade-wrap">${item.html}<span class="op neutral-fade-op">·</span></span>`;
      } else {
        html += `<span class="neutral-fade-wrap"><span class="op neutral-fade-op">·</span>${item.html}</span>`;
      }
    } else {
      if (i > 0 && !rendered[i - 1].isNeutralOne) {
        html += '<span class="op">·</span>';
      }
      html += item.html;
    }
  }
  return html;
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
  R_eq: 'R_eq', R_1: 'R₁', R_2: 'R₂',
  C_eq: 'C_eq', C_1: 'C₁', C_2: 'C₂',
  Ec: 'E_c', Ep: 'E_p',
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
    Ec: ['E', 'c'], Ep: ['E', 'p'],
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
