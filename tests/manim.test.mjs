// tests/manim.test.mjs — Test unitari per il motore di animazione didattica
// Manim TransformMatchingTex ed esportatore Python.

import assert from 'assert';
import { Eq, Var, Div, Mul } from '../js/ast.js';
import {
  getTokenKey,
  isManimMotionEnabled,
  setManimMotionEnabled,
  toggleManimMotion,
  matchEquationTokens,
  generateManimPythonScript,
} from '../js/manim-motion.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}:`, err.message);
    throw err;
  }
}

console.log('--- Avvio test unitari Manim Motion & TransformMatchingTex ---');

// Mock element per testing in Node.js
class MockElement {
  constructor(tag = 'span', text = '', classNames = [], dataset = {}, rect = {}) {
    this.tagName = tag.toUpperCase();
    this.textContent = text;
    this.innerHTML = text;
    this.classList = {
      _classes: new Set(classNames),
      contains(c) { return this._classes.has(c); },
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
    };
    this.dataset = { ...dataset };
    this._rect = { left: 0, top: 0, width: 20, height: 20, ...rect };
    this.children = [];
    this.parentElement = null;
  }
  getBoundingClientRect() {
    return { ...this._rect };
  }
  closest() {
    return null;
  }
  getAttribute(name) {
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      return this.dataset[key] || null;
    }
    return null;
  }
  querySelectorAll() {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 1. Preferenze e Toggle Manim
// ---------------------------------------------------------------------------
test('Stato iniziale Manim motion abilitato', () => {
  setManimMotionEnabled(true);
  assert.strictEqual(isManimMotionEnabled(), true);
});

test('Disabilitazione e riabilitazione toggle Manim motion', () => {
  setManimMotionEnabled(false);
  assert.strictEqual(isManimMotionEnabled(), false);
  toggleManimMotion();
  assert.strictEqual(isManimMotionEnabled(), true);
});

// ---------------------------------------------------------------------------
// 2. Estrazione chiavi identificative dei token (getTokenKey)
// ---------------------------------------------------------------------------
test('getTokenKey: variabile con data-var-name e data-node-type', () => {
  const el = new MockElement('span', 't', ['node-var'], { varName: 't', nodeType: 'Var' });
  assert.strictEqual(getTokenKey(el), 'Var:t');
});

test('getTokenKey: numero con data-var-name', () => {
  const el = new MockElement('span', '2', ['node-num'], { varName: '2', nodeType: 'Num' });
  assert.strictEqual(getTokenKey(el), 'Num:2');
});

test('getTokenKey: segno uguale', () => {
  const el = new MockElement('span', '=', ['eq-sign']);
  assert.strictEqual(getTokenKey(el), 'Eq:=');
});

test('getTokenKey: operatore algebrico', () => {
  const el = new MockElement('span', '+', ['op']);
  assert.strictEqual(getTokenKey(el), 'Op:+');
});

test('getTokenKey: parentesi di raggruppamento', () => {
  const el = new MockElement('span', '(', ['group-paren']);
  assert.strictEqual(getTokenKey(el), 'Paren:(');
});

test('getTokenKey: linea di frazione', () => {
  const el = new MockElement('div', '', ['frac-bar']);
  assert.strictEqual(getTokenKey(el), 'Bar:bar');
});

// ---------------------------------------------------------------------------
// 3. Matching dei token (TransformMatchingTex)
// ---------------------------------------------------------------------------
test('matchEquationTokens: associa variabili corrispondenti tra snapshot e nuovo DOM', () => {
  const oldSnapshot = {
    tokens: [
      { key: 'Var:v', text: 'v', side: 'left', rect: { left: 10, top: 20, width: 15, height: 20 } },
      { key: 'Eq:=', text: '=', side: '', rect: { left: 30, top: 20, width: 15, height: 20 } },
      { key: 'Var:s', text: 's', side: 'right', rect: { left: 50, top: 10, width: 15, height: 20 } },
      { key: 'Var:t', text: 't', side: 'right', rect: { left: 50, top: 35, width: 15, height: 20 } },
    ],
  };

  const newContainer = new MockElement('div', '', ['equation-display'], {}, { left: 0, top: 0, width: 200, height: 100 });
  const elV = new MockElement('span', 'v', ['node-var'], { varName: 'v', nodeType: 'Var' }, { left: 8, top: 20, width: 15, height: 20 });
  const elT = new MockElement('span', 't', ['node-var'], { varName: 't', nodeType: 'Var' }, { left: 28, top: 20, width: 15, height: 20 });
  const elEq = new MockElement('span', '=', ['eq-sign'], {}, { left: 48, top: 20, width: 15, height: 20 });
  const elS = new MockElement('span', 's', ['node-var'], { varName: 's', nodeType: 'Var' }, { left: 68, top: 20, width: 15, height: 20 });

  newContainer.querySelectorAll = () => [elV, elT, elEq, elS];

  const result = matchEquationTokens(oldSnapshot, newContainer);
  assert.strictEqual(result.matches.length, 4, 'Tutti e 4 i token (v, t, =, s) devono essere abbinati');
  assert.strictEqual(result.fadeIns.length, 0, 'Nessun nuovo token estraneo');
  assert.strictEqual(result.fadeOuts.length, 0, 'Nessun token scomparso');

  // Verifica lo spostamento di 't': era a x=50,y=35 (denominatore a destra) -> ora a x=28,y=20 (a sinistra dell'uguale)
  const matchT = result.matches.find((m) => m.newToken.key === 'Var:t');
  assert.ok(matchT, 'Token t trovato nei match');
  const dx = matchT.oldToken.rect.left - matchT.newToken.rect.left;
  const dy = matchT.oldToken.rect.top - matchT.newToken.rect.top;
  assert.strictEqual(dx, 50 - 28, 'Spostamento orizzontale coerente');
  assert.strictEqual(dy, 35 - 20, 'Spostamento verticale dal denominatore coerente');
});

test('matchEquationTokens: rileva fade-in per nuovi termini e fade-out per termini eliminati', () => {
  const oldSnapshot = {
    tokens: [
      { key: 'Var:a', text: 'a', rect: { left: 10, top: 10, width: 10, height: 10 } },
      { key: 'Op:+', text: '+', rect: { left: 25, top: 10, width: 10, height: 10 } },
      { key: 'Var:b', text: 'b', rect: { left: 40, top: 10, width: 10, height: 10 } },
    ],
  };

  const newContainer = new MockElement('div');
  const elA = new MockElement('span', 'a', ['node-var'], { varName: 'a', nodeType: 'Var' }, { left: 10, top: 10, width: 10, height: 10 });
  const elC = new MockElement('span', 'c', ['node-var'], { varName: 'c', nodeType: 'Var' }, { left: 30, top: 10, width: 10, height: 10 });

  newContainer.querySelectorAll = () => [elA, elC];

  const result = matchEquationTokens(oldSnapshot, newContainer);
  assert.strictEqual(result.matches.length, 1, 'Solo token "a" corrisponde');
  assert.strictEqual(result.fadeIns.length, 1, 'Token "c" è nuovo (fade-in)');
  assert.strictEqual(result.fadeIns[0].key, 'Var:c');
  assert.strictEqual(result.fadeOuts.length, 2, 'Token "+" e "b" sono stati rimossi (fade-out)');
});

// ---------------------------------------------------------------------------
// 4. Esportatore di Script Python per Manim Community
// ---------------------------------------------------------------------------
test('generateManimPythonScript: genera codice Python valido per Manim', () => {
  const script = generateManimPythonScript(
    { id: 'velocita', name: 'Velocità media', formula: 'v = s/t' },
    't'
  );

  assert.ok(typeof script === 'string', 'Lo script deve essere una stringa');
  assert.ok(script.includes('from manim import *'), 'Deve importare Manim');
  assert.ok(script.includes('class VelocitaMediaPerT(Scene):'), 'Deve definire una Scene valida in CamelCase');
  assert.ok(script.includes('TransformMatchingTex'), 'Deve invocare TransformMatchingTex per le transizioni');
  assert.ok(script.includes('SurroundingRectangle'), 'Deve evidenziare il risultato finale con riquadro');
});

test('generateManimPythonScript: contiene tutti i passaggi algebrici risolutivi', () => {
  const customSteps = [
    { equation: 'v = \\frac{s}{t}', explanation: 'Equazione di partenza' },
    { equation: 'v \\cdot t = s', explanation: 'Moltiplica ambo i membri per t' },
    { equation: 't = \\frac{s}{v}', explanation: 'Dividi ambo i membri per v' },
  ];

  const script = generateManimPythonScript(
    { id: 'velocita', name: 'Velocità', formula: 'v = s/t' },
    't',
    customSteps
  );

  assert.ok(script.includes('step_0 = MathTex(r"v = \\frac{s}{t}"'), 'Contiene step 0');
  assert.ok(script.includes('step_1 = MathTex(r"v \\cdot t = s"'), 'Contiene step 1');
  assert.ok(script.includes('step_2 = MathTex(r"t = \\frac{s}{v}"'), 'Contiene step 2');
  assert.ok(script.includes('TransformMatchingTex(step_0, step_1)'), 'Collega step 0 a step 1 con TransformMatchingTex');
  assert.ok(script.includes('TransformMatchingTex(step_1, step_2)'), 'Collega step 1 a step 2 con TransformMatchingTex');
});

test('generateManimPythonScript: supporta internazionalizzazione lingua inglese (lang: en)', () => {
  const script = generateManimPythonScript(
    { id: 'force', name: 'Newton second law', formula: 'F = m*a' },
    'a',
    null,
    { lang: 'en' }
  );

  assert.ok(script.includes('Isolating a in Newton second law'), 'Titolo in inglese');
  assert.ok(script.includes('Solved!'), 'Etichetta finale di successo in inglese');
  assert.ok(script.includes('TransformMatchingTex'), 'Usa TransformMatchingTex');
});

test('generateManimPythonScript: supporta passaggi da cronologia live con nodi AST e regole algebriche', () => {
  const astStep0 = Eq(Var('v'), Div(Var('s'), Var('t')));
  const astStep1 = Eq(Mul(Var('v'), Var('t')), Var('s'));
  const astStep2 = Eq(Var('t'), Div(Var('s'), Var('v')));

  const historySteps = [
    { equation: astStep0, ruleName: 'Formula di partenza' },
    { equation: astStep1, ruleName: 'Secondo principio: moltiplicazione per t' },
    { equation: astStep2, ruleName: 'Secondo principio: divisione per v' }
  ];

  const script = generateManimPythonScript(
    { id: 'custom', name: 'Velocità Lineare', formula: 'v = s/t' },
    't',
    historySteps
  );

  assert.ok(script.includes('step_0 = MathTex('), 'Genera step 0 da AST');
  assert.ok(script.includes('step_1 = MathTex('), 'Genera step 1 da AST');
  assert.ok(script.includes('step_2 = MathTex('), 'Genera step 2 da AST');
  assert.ok(script.includes('Secondo principio: moltiplicazione per t'), 'Include nome regola come spiegazione passaggio');
  assert.ok(script.includes('TransformMatchingTex(step_0, step_1)'), 'Usa TransformMatchingTex tra passaggi');
});

test('generateManimPythonScript: include istruzioni CLI per rendering a 60 FPS', () => {
  const script = generateManimPythonScript(
    { id: 'cinetica', name: 'Energia cinetica', formula: 'Ec = (1/2)*m*v^2' },
    'v'
  );

  assert.ok(script.includes('manim -pqh scene.py'), 'Contiene comando rendering ad alta qualità');
  assert.ok(script.includes('manim -pql scene.py'), 'Contiene comando anteprima rapida');
});

console.log(`\nRisultato: ${passed}/${passed} test Manim Motion SUPERATI con successo!`);
