// js/manim-motion.js — Motore di animazione didattica ispirato a Manim (TransformMatchingTex)
// ed esportatore di script Python per Manim Community.
//
// 1. In-browser TransformMatchingTex:
//    Cattura lo snapshot dei token matematici prima di un'operazione algebrica (First),
//    renderizza la nuova equazione (Last), associa i token omologhi (Matching)
//    e anima gli spostamenti fisici (Invert & Play) con curve di decelerazione
//    fluide, evidenziazione del passaggio dell'uguale e dissolvenza dei termini cancellati.
//
// 2. Python Manim Exporter:
//    Genera script completi ed eseguibili con Manim Community (`from manim import *`)
//    che replicano la risoluzione passo per passo con `TransformMatchingTex(step_prev, step_curr)`.

import { toLatex } from './ast.js';
import { prettyVar } from './render.js';
import { solveFormulaSteps } from './worksheet-export.js';

export const MANIM_STORAGE_KEY = 'formuleInverse.manimMotionEnabled';

// ---------------------------------------------------------------------------
// 1. Stato e Preferenze Utente
// ---------------------------------------------------------------------------

let _manimEnabled = true;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(MANIM_STORAGE_KEY);
    if (saved !== null) {
      _manimEnabled = saved === 'true';
    }
  }
} catch {
  _manimEnabled = true;
}

export function isManimMotionEnabled() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
  }
  return _manimEnabled;
}

export function setManimMotionEnabled(val) {
  _manimEnabled = !!val;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MANIM_STORAGE_KEY, String(_manimEnabled));
    }
  } catch {
    // Ignore storage failure
  }
  return _manimEnabled;
}

export function toggleManimMotion() {
  return setManimMotionEnabled(!_manimEnabled);
}

// ---------------------------------------------------------------------------
// 2. Token Matching & Bounding Rect Snapshotting
// ---------------------------------------------------------------------------

/**
 * Estrae una chiave identificativa per un token matematico DOM.
 */
export function getTokenKey(el) {
  if (!el || typeof el !== 'object') return '';
  if (typeof Element !== 'undefined' && !(el instanceof Element)) return '';

  if (el.dataset && el.dataset.varName) {
    const type = el.dataset.nodeType || 'Var';
    return `${type}:${el.dataset.varName}`;
  }
  if (el.classList.contains('eq-sign')) {
    return 'Eq:=';
  }
  if (el.classList.contains('op')) {
    const txt = el.textContent.trim();
    return `Op:${txt}`;
  }
  if (el.classList.contains('group-paren')) {
    const txt = el.textContent.trim();
    return `Paren:${txt}`;
  }
  if (el.classList.contains('frac-bar')) {
    const side = el.closest('[data-side]')?.getAttribute('data-side') || 'bar';
    return `Bar:${side}`;
  }
  if (el.classList.contains('sqrt-symbol')) {
    return 'Sqrt:√';
  }

  const text = el.textContent ? el.textContent.trim() : '';
  return `Token:${text}`;
}

/**
 * Seleziona tutti i token matematici elementari all'interno del contenitore dell'equazione.
 */
export function queryEquationTokens(container) {
  if (!container || !container.querySelectorAll) return [];
  const selector = [
    '.node-var',
    '.node-num',
    '.node-target',
    '.eq-sign',
    '.op',
    '.frac-bar',
    '.group-paren',
    '.sqrt-symbol',
    '.math-factor-group[draggable="true"]',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll(selector));

  // Filtra token annidati ridondanti (se un genitore draggable è già un gruppo atomico)
  return elements.filter((el) => {
    // Escludi elementi nascosti o decorativi
    if (el.closest('.cross-layer') || el.closest('.cross-dissolve-layer') || el.closest('.manim-ghost-layer')) {
      return false;
    }
    return true;
  });
}

/**
 * Cattura lo snapshot geometrico e testuale di tutti i token presenti nell'equazione.
 */
export function captureEquationSnapshot(container) {
  if (!container || !container.getBoundingClientRect) return null;

  const containerRect = container.getBoundingClientRect();
  // Se il contenitore non è visibile o ha dimensioni nulle, nessun snapshot
  if (containerRect.width === 0 || containerRect.height === 0) return null;

  const tokenElements = queryEquationTokens(container);
  if (tokenElements.length === 0) return null;

  const tokens = [];
  for (const el of tokenElements) {
    const r = el.getBoundingClientRect();
    const key = getTokenKey(el);
    const side = el.dataset.side || el.closest('[data-side]')?.getAttribute('data-side') || '';
    const slot = el.dataset.slot || el.closest('[data-slot]')?.getAttribute('data-slot') || '';

    tokens.push({
      key,
      text: el.textContent ? el.textContent.trim() : '',
      html: el.innerHTML,
      outerHtml: el.outerHTML,
      side,
      slot,
      nodeType: el.dataset.nodeType || '',
      varName: el.dataset.varName || '',
      rect: {
        left: r.left - containerRect.left,
        top: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      },
    });
  }

  return {
    timestamp: Date.now(),
    containerWidth: containerRect.width,
    containerHeight: containerRect.height,
    tokens,
  };
}

/**
 * Algoritmo di matching tra i token del vecchio stato e del nuovo stato (Manim TransformMatchingTex).
 */
export function matchEquationTokens(oldSnapshot, newContainer) {
  if (!oldSnapshot || !oldSnapshot.tokens || !newContainer) {
    return { matches: [], fadeIns: [], fadeOuts: [] };
  }

  const containerRect = newContainer.getBoundingClientRect();
  const newElements = queryEquationTokens(newContainer);

  const newTokens = newElements.map((el) => {
    const r = el.getBoundingClientRect();
    const key = getTokenKey(el);
    const side = el.dataset.side || el.closest('[data-side]')?.getAttribute('data-side') || '';
    const slot = el.dataset.slot || el.closest('[data-slot]')?.getAttribute('data-slot') || '';
    return {
      el,
      key,
      text: el.textContent ? el.textContent.trim() : '',
      side,
      slot,
      nodeType: el.dataset.nodeType || '',
      varName: el.dataset.varName || '',
      rect: {
        left: r.left - containerRect.left,
        top: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      },
    };
  });

  const availableOld = oldSnapshot.tokens.slice();
  const availableNew = newTokens.slice();

  const matches = [];

  // Passaggio 1: Match esatto su chiave (es. 'Var:t' con 'Var:t')
  for (let i = availableNew.length - 1; i >= 0; i--) {
    const nTok = availableNew[i];
    const candidateIndices = [];
    for (let j = 0; j < availableOld.length; j++) {
      if (availableOld[j].key === nTok.key) {
        candidateIndices.push(j);
      }
    }

    if (candidateIndices.length === 1) {
      const matchIdx = candidateIndices[0];
      matches.push({
        oldToken: availableOld[matchIdx],
        newToken: nTok,
      });
      availableOld.splice(matchIdx, 1);
      availableNew.splice(i, 1);
    } else if (candidateIndices.length > 1) {
      // Se ci sono duplicati (es. due numeri 2), abbina al più vicino geometricamente
      let bestIdx = candidateIndices[0];
      let bestDist = Infinity;
      for (const idx of candidateIndices) {
        const oTok = availableOld[idx];
        const dist = Math.hypot(oTok.rect.left - nTok.rect.left, oTok.rect.top - nTok.rect.top);
        // Bonus di continuità se appartengono allo stesso membro (sinistro/destro)
        const sidePenalty = oTok.side && nTok.side && oTok.side !== nTok.side ? 30 : 0;
        const totalScore = dist + sidePenalty;
        if (totalScore < bestDist) {
          bestDist = totalScore;
          bestIdx = idx;
        }
      }
      matches.push({
        oldToken: availableOld[bestIdx],
        newToken: nTok,
      });
      availableOld.splice(bestIdx, 1);
      availableNew.splice(i, 1);
    }
  }

  // Passaggio 2: Token residui nuovi sono Fade-in, vecchi sono Fade-out
  return {
    matches,
    fadeIns: availableNew,
    fadeOuts: availableOld,
  };
}

// ---------------------------------------------------------------------------
// 3. Esecuzione Animazione In-Browser (FLIP + Web Animations API)
// ---------------------------------------------------------------------------

/**
 * Anima la transizione dell'equazione riproducendo la dinamica di TransformMatchingTex di Manim.
 */
export function animateTransformMatchingTex(container, oldSnapshot, options = {}) {
  if (!isManimMotionEnabled()) return;
  if (!container || !oldSnapshot) return;

  // Supporto test o override
  const duration = typeof options.duration === 'number' ? options.duration : 500; // ms
  const easing = options.easing || 'cubic-bezier(0.16, 1, 0.3, 1)'; // Manim smooth spring-decel

  const { matches, fadeIns, fadeOuts } = matchEquationTokens(oldSnapshot, container);

  // 1. Pulizia e preparazione layer ghost per i termini che svaniscono
  // Posizionato come layer fratello fuori da equationDisplay per non alterarne il textContent
  let ghostLayer = (typeof document !== 'undefined')
    ? (document.getElementById('manim-ghost-layer') || (container.parentElement ? container.parentElement.querySelector('.manim-ghost-layer') : null))
    : null;

  if (!ghostLayer) {
    ghostLayer = container.querySelector('.manim-ghost-layer');
  }
  if (!ghostLayer && typeof document !== 'undefined') {
    ghostLayer = document.createElement('div');
    ghostLayer.id = 'manim-ghost-layer';
    ghostLayer.className = 'manim-ghost-layer';
    ghostLayer.setAttribute('aria-hidden', 'true');
    (container.parentElement || container).appendChild(ghostLayer);
  }
  if (ghostLayer) {
    ghostLayer.innerHTML = '';
  }

  const containerRect = container.getBoundingClientRect ? container.getBoundingClientRect() : { left: 0, top: 0 };
  const layerRect = (ghostLayer && ghostLayer.getBoundingClientRect)
    ? ghostLayer.getBoundingClientRect()
    : containerRect;

  // 2. Anima i token corrispondenti che si sono spostati
  for (const { oldToken, newToken } of matches) {
    const dx = oldToken.rect.left - newToken.rect.left;
    const dy = oldToken.rect.top - newToken.rect.top;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.5) {
      const crossedSides = oldToken.side && newToken.side && oldToken.side !== newToken.side;
      const el = newToken.el;

      el.classList.add('manim-transforming');
      if (crossedSides) {
        el.classList.add('manim-crossed-equals');
      }

      // Parabola verticale accentuata se attraversa l'uguale per rendere evidente lo scavalcamento
      const arcLift = crossedSides ? -12 : 0;

      const keyframes = [
        {
          transform: `translate(${dx}px, ${dy}px)`,
          opacity: 0.9,
          offset: 0,
        },
        {
          transform: `translate(${dx * 0.45}px, ${dy * 0.45 + arcLift}px)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: 'translate(0px, 0px)',
          opacity: 1,
          offset: 1,
        },
      ];

      if (typeof el.animate === 'function') {
        const anim = el.animate(keyframes, {
          duration,
          easing,
          fill: 'both',
        });
        anim.onfinish = () => {
          el.classList.remove('manim-transforming', 'manim-crossed-equals');
        };
      }
    }
  }

  // 3. Fade-in dei nuovi simboli introdotti (es. radice, frazione, nuovo fattore moltiplicato)
  for (const newTok of fadeIns) {
    const el = newTok.el;
    if (typeof el.animate === 'function') {
      el.animate(
        [
          { opacity: 0, transform: 'scale(0.65)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: Math.round(duration * 0.75),
          easing: 'ease-out',
          fill: 'both',
        }
      );
    }
  }

  // 4. Fade-out e dissolvenza dei termini cancellati / semplificati
  for (const oldTok of fadeOuts) {
    // Non animare ghost di fraction bar o segni uguali se già gestiti
    if (oldTok.key.startsWith('Bar:') || oldTok.key === 'Eq:=') continue;
    if (!ghostLayer) continue;

    const ghost = document.createElement('span');
    ghost.className = 'manim-ghost-token';
    ghost.style.position = 'absolute';
    const posX = oldTok.rect.left + containerRect.left - layerRect.left;
    const posY = oldTok.rect.top + containerRect.top - layerRect.top;
    ghost.style.left = `${posX}px`;
    ghost.style.top = `${posY}px`;
    ghost.style.width = `${oldTok.rect.width}px`;
    ghost.style.height = `${oldTok.rect.height}px`;
    ghost.style.display = 'inline-block';
    ghost.innerHTML = oldTok.html;
    ghostLayer.appendChild(ghost);

    if (typeof ghost.animate === 'function') {
      const gAnim = ghost.animate(
        [
          { opacity: 0.85, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(0.4) translateY(6px)' },
        ],
        {
          duration: Math.round(duration * 0.7),
          easing: 'ease-in',
          fill: 'forwards',
        }
      );
      gAnim.onfinish = () => {
        ghost.remove();
      };
    } else {
      setTimeout(() => ghost.remove(), duration);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Esportatore di Script Python per Manim Community (TransformMatchingTex)
// ---------------------------------------------------------------------------

/**
 * Normalizza il nome di una formula per creare una classe Python valida in CamelCase.
 */
function toPythonClassName(name, targetVar) {
  const clean = (name || 'Formula')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  const targetClean = (targetVar || 'X').replace(/[^a-zA-Z0-9]/g, '');
  return `${clean || 'InverseFormula'}Per${targetClean ? targetClean.charAt(0).toUpperCase() + targetClean.slice(1) : 'X'}`;
}

/**
 * Pulisce una stringa LaTeX per l'inclusione in raw string Python r"..."
 */
function cleanLatexForManim(latex) {
  if (!latex) return '';
  return latex.trim().replace(/\r?\n/g, ' ');
}

/**
 * Genera uno script Python completo per Manim Community che risolve la formula
 * passo per passo utilizzando `TransformMatchingTex`.
 *
 * @param {Object} formulaEntry Oggetto formula dal catalogo o custom
 * @param {string} targetVar Grandezza da isolare
 * @param {Array} steps Passaggi algebrici opzionali (se omessi, risolve automaticamente)
 * @param {Object} opts Opzioni di configurazione
 * @returns {string} Codice Python completo per Manim
 */
export function generateManimPythonScript(formulaEntry, targetVar, steps = null, opts = {}) {
  const formulaObj = typeof formulaEntry === 'string'
    ? { id: 'custom', name: 'Formula', formula: formulaEntry }
    : (formulaEntry || { id: 'custom', name: 'Formula', formula: 'v = s/t' });

  const target = targetVar || (formulaObj.isolate && formulaObj.isolate[0]) || 't';
  const lang = opts.lang === 'en' ? 'en' : 'it';
  const className = opts.className || toPythonClassName(formulaObj.name, target);

  // Risolve i passaggi se non forniti
  let derivationSteps = steps;
  if (!derivationSteps || derivationSteps.length === 0) {
    const solved = solveFormulaSteps(formulaObj.formula, target);
    derivationSteps = solved.steps || [];
  }

  // Prepara l'elenco delle equazioni LaTeX per ogni passaggio
  const stepData = [];
  derivationSteps.forEach((st, idx) => {
    let eqLatex = '';
    if (st.eq) {
      eqLatex = toLatex(st.eq);
    } else if (st.equation) {
      eqLatex = cleanLatexForManim(st.equation);
    }
    if (eqLatex) {
      const expl = st.explanation || (lang === 'en' ? `Step ${idx + 1}` : `Passaggio ${idx + 1}`);
      stepData.push({
        index: idx,
        latex: eqLatex,
        explanation: expl.replace(/"/g, '\\"'),
      });
    }
  });

  // Se nessun passaggio è stato estratto, usa la formula iniziale
  if (stepData.length === 0) {
    stepData.push({
      index: 0,
      latex: formulaObj.formula,
      explanation: lang === 'en' ? 'Initial equation' : 'Equazione di partenza',
    });
  }

  const targetPretty = prettyVar(target);
  const titleText = lang === 'en'
    ? `Isolating ${targetPretty} in ${formulaObj.name || formulaObj.formula}`
    : `Risoluzione inversa: isolare ${targetPretty} in ${formulaObj.name || formulaObj.formula}`;

  const subtitleText = lang === 'en'
    ? 'Laboratorio di Formule Inverse — TransformMatchingTex animation'
    : 'Laboratorio di Formule Inverse — Animazione con TransformMatchingTex';

  const pyCode = [];
  pyCode.push('"""');
  pyCode.push(`Animazione didattica generata automaticamente da:`);
  pyCode.push(`Laboratorio di Formule Inverse (v2.1) — https://github.com/depgiuseppe/formule-inverse`);
  pyCode.push(``);
  pyCode.push(`Requisiti:`);
  pyCode.push(`  pip install manim`);
  pyCode.push(``);
  pyCode.push(`Rendering dell'animazione a 60 FPS (qualità HD):`);
  pyCode.push(`  manim -pqh scene.py ${className}`);
  pyCode.push(`Oppure anteprima rapida a bassa risoluzione:`);
  pyCode.push(`  manim -pql scene.py ${className}`);
  pyCode.push('"""');
  pyCode.push(``);
  pyCode.push('from manim import *');
  pyCode.push(``);
  pyCode.push(``);
  pyCode.push(`class ${className}(Scene):`);
  pyCode.push('    def construct(self):');
  pyCode.push('        # Configurazione sfondo e tema');
  pyCode.push('        self.camera.background_color = "#0f172a"  # Slate dark');
  pyCode.push(``);
  pyCode.push('        # Titolo della scena');
  pyCode.push(`        title = Text("${titleText}", font_size=32, color=BLUE_B)`);
  pyCode.push(`        subtitle = Text("${subtitleText}", font_size=18, color=GRAY_A)`);
  pyCode.push('        header = VGroup(title, subtitle).arrange(DOWN, buff=0.15).to_edge(UP)');
  pyCode.push('        self.play(Write(title), FadeIn(subtitle, shift=UP*0.2))');
  pyCode.push('        self.wait(0.6)');
  pyCode.push(``);

  // Generazione del codice per i passaggi con TransformMatchingTex
  for (let i = 0; i < stepData.length; i++) {
    const cur = stepData[i];
    const varName = `step_${i}`;

    pyCode.push(`        # Passaggio ${i}: ${cur.explanation}`);
    pyCode.push(`        ${varName} = MathTex(r"${cur.latex}", font_size=48)`);
    pyCode.push(`        ${varName}.set_color(WHITE)`);

    if (i === 0) {
      pyCode.push(`        ${varName}.move_to(ORIGIN)`);
      pyCode.push(`        lbl_${i} = Text("${cur.explanation}", font_size=20, color=YELLOW_B).next_to(${varName}, DOWN, buff=0.6)`);
      pyCode.push(`        self.play(Write(${varName}), FadeIn(lbl_${i}))`);
      pyCode.push('        self.wait(1.2)');
    } else {
      const prevVar = `step_${i - 1}`;
      pyCode.push(`        ${varName}.move_to(ORIGIN)`);
      pyCode.push(`        lbl_${i} = Text("${cur.explanation}", font_size=20, color=YELLOW_B).next_to(${varName}, DOWN, buff=0.6)`);
      pyCode.push(`        self.play(`);
      pyCode.push(`            TransformMatchingTex(${prevVar}, ${varName}),`);
      pyCode.push(`            ReplacementTransform(lbl_${i - 1}, lbl_${i})`);
      pyCode.push('        )');
      pyCode.push('        self.wait(1.4)');
    }
    pyCode.push(``);
  }

  // Celebrazione ed evidenziazione del risultato finale
  const lastVar = `step_${stepData.length - 1}`;
  const lastLbl = `lbl_${stepData.length - 1}`;
  pyCode.push('        # Risultato finale: grandezza isolata con riquadro');
  pyCode.push(`        box = SurroundingRectangle(${lastVar}, color=GREEN_C, buff=0.3, corner_radius=0.1)`);
  pyCode.push(`        success_label = Text("${lang === 'en' ? 'Solved!' : 'Formula Inversa Ricavata!'}", font_size=22, color=GREEN_B).next_to(box, UP, buff=0.25)`);
  pyCode.push(`        self.play(Create(box), Write(success_label), FadeOut(${lastLbl}))`);
  pyCode.push('        self.wait(2.5)');
  pyCode.push('        self.play(FadeOut(VGroup(header, ' + lastVar + ', box, success_label)))');
  pyCode.push('        self.wait(0.5)');

  return pyCode.join('\n') + '\n';
}
