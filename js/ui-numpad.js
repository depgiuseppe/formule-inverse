// js/ui-numpad.js — Tastierino numerico/simbolico e regole algebriche globali
// (specchio, reciproci, distributiva, raccoglimento, m.c.m., cambio di segno).

import { KEYPAD_OPERATIONS, equationKeypadTokens, parseOperand, applyKeypadOperation } from './operations.js';
import { reciprocalEquation } from './reciprocals.js';
import { reduceEquationToCommonDenominator } from './common-denom.js';
import { RULES, applyRule, negateExpr, findCommonFactor, hasTrigConflict, canDistribute } from './rules.js';
import { clone, toPretty, equivalentEq, Eq, collectVars } from './ast.js';
import { mergeConditions, whichSideHas, hasDistributableSum, isolatedSide, ensureTargetOnFirstMember } from './algebra.js';
import { analyseElementId } from './cross.js';
import { prettyVar } from './render.js';

let dom = null;
let state = null;
let ctx = null;

export function initNumpad(domRefs, appState, appCtx) {
  dom = domRefs;
  state = appState;
  ctx = appCtx;

  if (dom.btnMirror) dom.btnMirror.addEventListener('click', applyMirrorRule);
  if (dom.btnReciprocal) dom.btnReciprocal.addEventListener('click', applyReciprocalRule);
  if (dom.btnDistribute) dom.btnDistribute.addEventListener('click', applyDistributeRule);
  if (dom.btnFactorCommon) dom.btnFactorCommon.addEventListener('click', applyFactorCommonRule);
  if (dom.btnCommonDenom) dom.btnCommonDenom.addEventListener('click', applyCommonDenominatorRule);
  if (dom.btnChangeSign) dom.btnChangeSign.addEventListener('click', applyChangeSignRule);
}

// ---------------------------------------------------------------------------
// Tastierino: operazioni applicate a entrambi i membri
// ---------------------------------------------------------------------------
export function renderKeypad() {
  if (!dom || !dom.keypadOps || !dom.keypadOperands || !state) return;

  dom.keypadOps.innerHTML = '';
  for (const op of KEYPAD_OPERATIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-op' + (state.keypadOp === op.id ? ' active' : '');
    btn.dataset.op = op.id;
    btn.textContent = op.label;
    btn.title = op.title;
    btn.setAttribute('aria-label', op.title);
    btn.setAttribute('aria-pressed', state.keypadOp === op.id ? 'true' : 'false');
    btn.disabled = !state.currentEq;
    btn.addEventListener('click', () => handleKeypadOpClick(op));
    dom.keypadOps.appendChild(btn);
  }

  dom.keypadOperands.innerHTML = '';
  if (!state.currentEq) {
    dom.keypadOperands.innerHTML = '<p class="placeholder small">Carica una formula per usare il tastierino.</p>';
    updateKeypadHint();
    return;
  }

  const { letters, numbers } = equationKeypadTokens(state.currentEq);
  for (const name of letters) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-operand keypad-letter';
    btn.textContent = prettyVar(name);
    btn.title = `Applica ${name}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(name));
    dom.keypadOperands.appendChild(btn);
  }
  for (const value of numbers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-operand keypad-number';
    btn.textContent = String(value);
    btn.title = `Applica ${value}`;
    btn.addEventListener('click', () => handleKeypadOperandClick(String(value)));
    dom.keypadOperands.appendChild(btn);
  }

  // Campo libero: serve a moltiplicare per un numero non presente nell'equazione.
  const custom = document.createElement('span');
  custom.className = 'keypad-custom';
  custom.innerHTML =
    '<input class="keypad-custom-value" type="text" inputmode="numeric" placeholder="n" aria-label="Altro numero o grandezza" size="3">' +
    '<button type="button" class="btn-mini keypad-custom-apply" title="Applica all\'equazione">Applica</button>';
  dom.keypadOperands.appendChild(custom);
  const input = custom.querySelector('.keypad-custom-value');
  const applyBtn = custom.querySelector('.keypad-custom-apply');
  const submit = () => {
    const value = (input.value || '').trim();
    if (!value) return;
    handleKeypadOperandClick(value);
    input.value = '';
  };
  applyBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  updateKeypadHint();
}

export function updateKeypadHint() {
  if (!dom || !dom.keypadHint || !state) return;
  if (!state.currentEq) {
    dom.keypadHint.textContent = 'Carica una formula per usare il tastierino.';
    return;
  }
  if (!state.keypadOp) {
    dom.keypadHint.textContent = 'Scegli un\'operazione: verrà applicata a entrambi i membri.';
    return;
  }
  const op = KEYPAD_OPERATIONS.find((o) => o.id === state.keypadOp);
  dom.keypadHint.textContent = op && !op.needsOperand
    ? `Premi di nuovo per applicare ${op.label} a entrambi i membri.`
    : `Operazione ${op ? op.label : ''} scelta: ora tocca una grandezza o un numero.`;
}

export function handleKeypadOpClick(op) {
  if (!state || !state.currentEq) return;
  if (state.keypadOp === op.id) {
    if (op.needsOperand) {
      state.keypadOp = null;
      renderKeypad();
      return;
    }
    applyKeypadMove(op.id, null, null);
    return;
  }
  state.keypadOp = op.id;
  renderKeypad();
  if (!op.needsOperand) applyKeypadMove(op.id, null, null);
}

export function handleKeypadOperandClick(text) {
  if (!state || !state.currentEq) return;
  if (!state.keypadOp) {
    if (ctx && ctx.showMessage) ctx.showMessage('Prima scegli un\'operazione nel tastierino, poi la grandezza o il numero.', 'info');
    return;
  }
  applyKeypadMove(state.keypadOp, parseOperand(text), text);
}

export function applyKeypadMove(opId, operandNode, operandText) {
  const op = KEYPAD_OPERATIONS.find((o) => o.id === opId);
  const label = op ? op.label : opId;
  const before = state.currentEq;

  const res = applyKeypadOperation(before, opId, operandNode, operandText, state.targetVar);
  if (!res.ok) {
    state.keypadOp = null;
    renderKeypad();
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    if (ctx && ctx.animateOperationBadge) ctx.animateOperationBadge(label, operandText);
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint, { label: `Applica ${label} a entrambi i membri` });
    return;
  }

  const newEq = res.equation;
  if (equivalentEq(newEq, before)) {
    state.keypadOp = null;
    renderKeypad();
    if (ctx && ctx.showMessage) ctx.showMessage('Questa operazione non cambia l\'equazione: prova un\'altra trasformazione.', 'info');
    return;
  }

  if (opId === 'add' || opId === 'sub') {
    if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();
  } else {
    if (ctx && ctx.playSoundFraction) ctx.playSoundFraction();
  }

  state.currentEq = newEq;
  state.conditions = mergeConditions(state.conditions, res.conditions || []);
  state.selectedId = null;
  state.keypadOp = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const ruleName = `Applica ${label}${operandText ? ' ' + prettyVar(operandText) : ''} a entrambi i membri`;
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(newEq),
      ruleName,
      rulePrinciple: res.note || '',
      ruleId: 'keypad-' + opId,
      steps: res.steps || [],
      conditions: (res.conditions || []).slice(),
      explanationKey: null,
      note: res.note || null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.showRulePanel) {
    ctx.showRulePanel(
      { name: ruleName, principle: res.steps && res.steps.length ? res.steps.join(' ') : '', explanation: null },
      { steps: res.steps || [], conditions: res.conditions || [], note: res.note || null },
      newEq
    );
  }
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.animateOperationBadge) ctx.animateOperationBadge(label, operandText);
  if (ctx && ctx.showMessage) {
    ctx.showMessage(`✓ ${ruleName}.`, 'success');
    if (res.note) ctx.showMessage(res.note, 'info');
  }

  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola dello specchio (scambio membri)
// ---------------------------------------------------------------------------
export function applyMirrorRule() {
  if (!state || !state.currentEq) return;
  const newEq = Eq(clone(state.currentEq.right), clone(state.currentEq.left));
  const onDone = () => {
    state.currentEq = newEq;
    state.selectedId = null;
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    const rule = {
      id: 'swapSides',
      name: 'Regola dello specchio (scambio membri)',
      principle: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
      explanation: 'scambioMembri',
    };
    if (ctx && ctx.pushHistory) {
      ctx.pushHistory({
        equation: clone(newEq),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: 'swapSides',
        steps: ['Scambio i due membri dell\'equazione (proprietà simmetrica: A = B ↔ B = A).'],
        conditions: state.conditions.slice(),
        explanationKey: 'scambioMembri',
        note: null,
        verified: true,
      }, false);
    }
    if (ctx && ctx.updateObjective) ctx.updateObjective();
    if (ctx && ctx.renderEquationView) ctx.renderEquationView();
    if (ctx && ctx.showRulePanel) {
      ctx.showRulePanel(rule, { steps: ['Scambio i due membri per la proprietà simmetrica.'], conditions: [] }, newEq);
    }
    if (ctx && ctx.showMessage) ctx.showMessage('🪞 Regola dello specchio applicata: se A = B allora B = A!', 'success');
    if (state.goalReached) {
      if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
      if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
      if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
    }
  };

  if (ctx && ctx.animateMirrorSwap) {
    ctx.animateMirrorSwap(state.currentEq, newEq, onDone);
  } else {
    onDone();
  }
}

// ---------------------------------------------------------------------------
// Regola dei reciproci (inversione di entrambi i membri)
// ---------------------------------------------------------------------------
export function applyReciprocalRule() {
  if (!state || !state.currentEq) return;
  if (ctx && ctx.playSoundFraction) ctx.playSoundFraction();
  const eq = state.currentEq;
  const res = reciprocalEquation(eq);

  if (!res.ok) {
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    if (ctx && ctx.renderEquationView) ctx.renderEquationView();
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint, { label: 'Regola dei reciproci' });
    return;
  }

  const newEq = res.newEq;
  if (equivalentEq(newEq, eq)) {
    if (ctx && ctx.showMessage) ctx.showMessage('Questa operazione non cambia l\'equazione: prova un\'altra trasformazione.', 'info');
    return;
  }

  state.currentEq = newEq;
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const rule = {
    id: 'reciprocal',
    name: 'Regola dei reciproci (inversione dei membri)',
    principle: 'Proprietà dell\'inversione: se A = B allora 1/A = 1/B; in una proporzione A/B = C/D si ottiene B/A = D/C.',
    explanation: 'reciprocal-both',
  };
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: 'reciprocal',
      steps: [`Calcolo il reciproco di entrambi i membri: ${toPretty(eq, 0)} → ${toPretty(newEq, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: 'reciprocal-both',
      note: null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.showRulePanel) ctx.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage('🔁 Regola dei reciproci applicata a entrambi i membri!', 'success');
  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola della proprietà distributiva (sviluppa le parentesi)
// ---------------------------------------------------------------------------
export function applyDistributeRule() {
  if (!state || !state.currentEq) return;
  const eq = state.currentEq;

  const leftDist = canDistribute(eq.left);
  const rightDist = canDistribute(eq.right);

  if (!leftDist && !rightDist) {
    if (ctx && ctx.showMessage) ctx.showMessage('Non ci sono parentesi (prodotti, potenze o frazioni) da sviluppare.', 'info');
    return;
  }

  let chosenSide = null;
  if (state.selectedId) {
    if (state.selectedId.startsWith('left') && leftDist) chosenSide = 'left';
    else if (state.selectedId.startsWith('right') && rightDist) chosenSide = 'right';
    else {
      const selInfo = analyseElementId(state.selectedId);
      if (selInfo && selInfo.side) {
        if (selInfo.side === 'left' && leftDist) chosenSide = 'left';
        if (selInfo.side === 'right' && rightDist) chosenSide = 'right';
      }
    }
  }

  if (!chosenSide) {
    const targetLeft = hasDistributableSum(eq.left, state.targetVar);
    const targetRight = hasDistributableSum(eq.right, state.targetVar);
    if (targetRight && !targetLeft && rightDist) chosenSide = 'right';
    else if (targetLeft && !targetRight && leftDist) chosenSide = 'left';
    else if (rightDist && !leftDist) chosenSide = 'right';
    else if (leftDist && !rightDist) chosenSide = 'left';
    else chosenSide = 'right';
  }

  if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();
  const res = applyRule(RULES.distribute, eq, { side: chosenSide });
  if (!res.ok) {
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint);
    return;
  }

  state.currentEq = res.equation;
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const rule = RULES.distribute;
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(res.equation),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: 'distribute',
      steps: [`Sviluppo le parentesi con la proprietà distributiva al ${chosenSide === 'left' ? 'primo' : 'secondo'} membro: ${toPretty(eq, 0)} → ${toPretty(res.equation, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: 'distribute',
      note: null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.showRulePanel) {
    ctx.showRulePanel(rule, { steps: ['Sviluppate le parentesi con la proprietà distributiva'], conditions: [] }, res.equation);
  }
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage('📦 Proprietà distributiva applicata: parentesi sviluppate!', 'success');
  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola del raccoglimento a fattor comune
// ---------------------------------------------------------------------------
export function applyFactorCommonRule() {
  if (!state || !state.currentEq) return;
  const eq = state.currentEq;

  const targetSide = whichSideHas(eq, state.targetVar) || 'right';
  const sidesToCheck = targetSide === 'both' ? ['right', 'left'] : [targetSide, targetSide === 'left' ? 'right' : 'left'];

  let foundSide = null;
  let commonNode = null;

  for (const s of sidesToCheck) {
    const member = s === 'left' ? eq.left : eq.right;
    const common = findCommonFactor(member, state.targetVar);
    if (common) {
      foundSide = s;
      commonNode = common;
      break;
    }
  }

  if (!commonNode) {
    for (const s of sidesToCheck) {
      const member = s === 'left' ? eq.left : eq.right;
      const common = findCommonFactor(member, null);
      if (common) {
        foundSide = s;
        commonNode = common;
        break;
      }
    }
  }

  if (!commonNode) {
    const member = targetSide === 'left' ? eq.left : eq.right;
    if (hasTrigConflict(member, state.targetVar)) {
      if (ctx && ctx.showMessage) {
        ctx.showMessage(`⚠️ Non è possibile raccogliere ${prettyVar(state.targetVar)} a fattor comune: ${prettyVar(state.targetVar)} è l'argomento di funzioni trigonometriche distinte (sin e cos), non un fattore moltiplicativo.`, 'warning');
      }
      return;
    }
    if (ctx && ctx.showMessage) ctx.showMessage('Nessun fattore comune trovato da raccogliere tra tutti i termini del membro.', 'info');
    return;
  }

  if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();
  const commonText = toPretty(commonNode, 0);
  const res = applyRule(RULES.factorCommon, eq, { side: foundSide, common: commonNode, commonText });
  if (!res.ok) {
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint);
    return;
  }

  state.currentEq = res.equation;
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const rule = RULES.factorCommon;
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(res.equation),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: 'factorCommon',
      steps: [`Raccolgo ${commonText} a fattor comune al ${foundSide === 'left' ? 'primo' : 'secondo'} membro: ${toPretty(eq, 0)} → ${toPretty(res.equation, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.showRulePanel) {
    ctx.showRulePanel(rule, { steps: [`Raccolto ${commonText} a fattor comune`], conditions: [] }, res.equation);
  }
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage(`🧩 Raccoglimento a fattor comune applicato: ${commonText} messo in evidenza!`, 'success');
  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola del minimo comune multiplo (m.c.m.) e denominatore comune
// ---------------------------------------------------------------------------
export function applyCommonDenominatorRule() {
  if (!state || !state.currentEq) return;
  const eq = state.currentEq;

  let chosenSide = null;
  if (state.selectedId) {
    if (state.selectedId.startsWith('left')) chosenSide = 'left';
    else if (state.selectedId.startsWith('right')) chosenSide = 'right';
  }

  const res = reduceEquationToCommonDenominator(eq, chosenSide);
  if (!res.ok) {
    if (ctx && ctx.showInvalidMove) ctx.showInvalidMove(res.error, res.hint, { label: 'Minimo comune multiplo (m.c.m.)' });
    return;
  }

  const newEq = res.newEq;
  if (equivalentEq(newEq, eq)) {
    if (ctx && ctx.showMessage) ctx.showMessage('L\'equazione è già espressa a denominatore comune.', 'info');
    return;
  }

  if (ctx && ctx.playSoundFraction) ctx.playSoundFraction();

  if (dom.equationDisplay) {
    dom.equationDisplay.classList.add('sign-flip-pulse');
    setTimeout(() => {
      if (dom.equationDisplay) dom.equationDisplay.classList.remove('sign-flip-pulse');
    }, 450);
  }

  state.currentEq = newEq;
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const rule = RULES.commonDenom;
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: 'common-denom',
      steps: res.steps,
      conditions: state.conditions.slice(),
      explanationKey: 'common-denom',
      note: null,
      verified: true,
    }, false);
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.showRulePanel) ctx.showRulePanel(rule, { steps: res.steps, conditions: [] }, newEq);
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage('🧮 Frazioni ridotte a denominatore comune (m.c.m.) in un\'unica frazione!', 'success');

  // Se la variabile cercata è isolata al secondo membro, animiamo il viaggio speculare
  if (state.targetVar && isolatedSide(newEq.right, state.targetVar) && !collectVars(newEq.left).has(state.targetVar)) {
    const swapped = Eq(newEq.right, newEq.left);
    setTimeout(() => {
      if (ctx && ctx.animateMirrorSwap) {
        ctx.animateMirrorSwap(newEq, swapped, () => {
          state.currentEq = swapped;
          if (ctx && ctx.renderEquationView) ctx.renderEquationView();
          if (ctx && ctx.updateObjective) ctx.updateObjective();
        });
      }
    }, 200);
  }

  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  } else if (state.mode === 'auto' && ctx && ctx.showAutoMode) {
    ctx.showAutoMode();
  }
}

// ---------------------------------------------------------------------------
// Regola del cambio di segno (moltiplicazione per -1 di entrambi i membri)
// ---------------------------------------------------------------------------
export function applyChangeSignRule() {
  if (!state || !state.currentEq) return;
  if (ctx && ctx.playSoundTransport) ctx.playSoundTransport();
  const eq = state.currentEq;
  const newEq = Eq(negateExpr(eq.left), negateExpr(eq.right));

  state.currentEq = newEq;
  state.selectedId = null;
  if (ctx && ctx.clearPreview) ctx.clearPreview();

  const rule = {
    id: 'changeSign',
    name: 'Regola del cambio di segno',
    principle: 'Secondo principio di equivalenza: moltiplicando entrambi i membri per −1, tutti i segni si invertono (+ ↔ −).',
    explanation: null,
  };
  if (ctx && ctx.pushHistory) {
    ctx.pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: 'changeSign',
      steps: [`Moltiplico entrambi i membri per −1: ${toPretty(eq, 0)} → ${toPretty(newEq, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true,
    }, false);
  }

  const isTargetIsolatedOnRight = isolatedSide(newEq.right, state.targetVar);

  if (isTargetIsolatedOnRight) {
    if (ctx && ctx.renderEquationView) ctx.renderEquationView();
    if (ctx && ctx.flashSignChanged) ctx.flashSignChanged();
    if (ctx && ctx.showRulePanel) ctx.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    if (ctx && ctx.clearMessage) ctx.clearMessage();
    if (ctx && ctx.showMessage) ctx.showMessage(`± Cambio segno applicato: ${prettyVar(state.targetVar)} è ora positivo!`, 'info');

    setTimeout(() => {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      if (flipped !== state.currentEq) {
        const onSwapDone = () => {
          state.currentEq = flipped;
          state.goalReached = true;
          if (ctx && ctx.pushHistory) {
            ctx.pushHistory({
              equation: clone(flipped),
              ruleName: 'Regola dello specchio (scambio membri)',
              rulePrinciple: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
              ruleId: 'swapSides',
              steps: ['Scambio i due membri per la proprietà simmetrica: la grandezza cercata è al primo membro.'],
              conditions: state.conditions.slice(),
              explanationKey: 'scambioMembri',
              note: null,
              verified: true,
            }, false);
          }
          if (ctx && ctx.updateObjective) ctx.updateObjective();
          if (ctx && ctx.renderEquationView) ctx.renderEquationView();
          if (ctx && ctx.showRulePanel) {
            ctx.showRulePanel({
              id: 'swapSides',
              name: 'Regola dello specchio (scambio membri)',
              principle: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
            }, { steps: ['Scambio i due membri dell\'equazione per la proprietà simmetrica.'], conditions: [] }, flipped);
          }
          if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
          if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
          if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
          if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
        };

        if (ctx && ctx.animateMirrorSwap) {
          ctx.animateMirrorSwap(state.currentEq, flipped, onSwapDone);
        } else {
          onSwapDone();
        }
      } else {
        if (ctx && ctx.updateObjective) ctx.updateObjective();
        if (ctx && ctx.renderEquationView) ctx.renderEquationView();
      }
    }, 450);
    return;
  }

  if (ctx && ctx.updateObjective) ctx.updateObjective();
  if (ctx && ctx.renderEquationView) ctx.renderEquationView();
  if (ctx && ctx.flashSignChanged) ctx.flashSignChanged();
  if (ctx && ctx.showRulePanel) ctx.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
  if (ctx && ctx.clearMessage) ctx.clearMessage();
  if (ctx && ctx.showMessage) ctx.showMessage('± Regola del cambio di segno applicata: tutti i segni invertiti!', 'success');
  if (state.goalReached) {
    if (ctx && ctx.checkAndAnimateCompoundFraction && ctx.checkAndAnimateCompoundFraction()) return;
    if (ctx && ctx.playSuccessChime) ctx.playSuccessChime();
    if (ctx && ctx.spawnVictoryConfetti) ctx.spawnVictoryConfetti();
    if (ctx && ctx.showMessage) ctx.showMessage(`🎉 Ottimo! La grandezza ${prettyVar(state.targetVar)} è isolata!`, 'success');
  }
}
