// parser.js — Analisi delle formule scritte dall'utente e costruzione dell'AST.
//
// SINTASSI SUPPORTATA (documentata nella guida):
//   numeri:            3, 4.5, 1/2
//   variabili:         x, v, m, s, t, r  (lettere, anche greche come π/pi)
//   operatori:         +  -  *  /  ^
//   parentesi:         ( )
//   moltiplicazione:   esplicita (a*b) oppure implicita (ab, 2x, 3(x+1))
//   radice quadrata:   sqrt(...)  oppure  √(...)
//   funzioni:          sin, cos, tan (in radianti), ln, asin, acos, atan, exp
//   uguaglianza:       un solo '='
//   funzioni NON supportate (log, abs, ...) vengono rifiutate esplicitamente.
//
// NON si usa eval(). Il testo è tokenizzato e interpretato con la discesa
// ricorsiva classica (precedenze: + - / * / ^ / unario).
//
// Grammatica (EBNF semplificata):
//   equation := expr '=' expr
//   expr     := term (('+' | '-') term)*
//   term     := factor (('*' | '/') factor | implicitMul)*
//   factor   := base ('^' unary)?
//   unary    := ('-' | '+') unary | base
//   base     := NUMBER | IDENT '(' ... ')' | IDENT | '(' expr ')'
//
import {
  Num, Var, Add, Sub, Mul, Div, Pow, Sqrt, Neg, Group, Eq,
  Sin, Cos, Tan, Ln, Asin, Acos, Atan, Exp,
} from './ast.js';

// Funzioni supportate: nome (minuscolo) -> costruttore di nodo.
// Le funzioni trigonometriche lavorano in RADIANTI; ln è il logaritmo naturale;
// asin/acos/atan e exp sono le funzioni inverse (ramo principale).
const FUNCTIONS = {
  sin: Sin, cos: Cos, tan: Tan, ln: Ln,
  asin: Asin, acos: Acos, atan: Atan, exp: Exp,
};

// Funzioni matematiche riconosciute ma NON supportate (per dare un errore chiaro)
const UNSUPPORTED_FUNCTIONS = [
  'cot', 'sec', 'csc', 'log', 'log10', 'abs', 'floor', 'ceil', 'round',
  'min', 'max', 'sum', 'sign',
];

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
function tokenize(input) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isLetter = (c) => /[A-Za-z]/.test(c);
  const isGreek = (c) => 'πρΔθλμΩ'.includes(c);

  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

    if (isDigit(c) || (c === '.' && isDigit(input[i + 1]))) {
      let j = i;
      while (j < input.length && (isDigit(input[j]) || input[j] === '.')) j++;
      tokens.push({ t: 'num', v: parseFloat(input.slice(i, j)) });
      i = j;
      continue;
    }

    if (isLetter(c) || isGreek(c) || c === '_') {
      let j = i;
      while (j < input.length && (isLetter(input[j]) || isGreek(input[j]) || isDigit(input[j]) || input[j] === '_')) j++;
      tokens.push({ t: 'ident', v: input.slice(i, j) });
      i = j;
      continue;
    }

    if ('+-*/^()='.includes(c)) {
      // '√' trattato come identificatore di funzione radice
      tokens.push({ t: c, v: c });
      i++;
      continue;
    }

    if (c === '√') { tokens.push({ t: 'ident', v: 'sqrt' }); i++; continue; }
    // accetta anche il segno meno unicode
    if (c === '−') { tokens.push({ t: '-', v: '-' }); i++; continue; }
    if (c === '·' || c === '×') { tokens.push({ t: '*', v: '*' }); i++; continue; }
    if (c === '÷') { tokens.push({ t: '/', v: '/' }); i++; continue; }

    throw new ParseError(`Carattere non riconosciuto: "${c}"`);
  }
  return tokens;
}

export class ParseError extends Error {}

// ---------------------------------------------------------------------------
// Parser a discesa ricorsiva
// ---------------------------------------------------------------------------
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  expect(type) {
    const tok = this.peek();
    if (!tok || tok.t !== type) {
      throw new ParseError(`Atteso "${type}" ma trovato ${tok ? `"${tok.v}"` : 'fine formula'}`);
    }
    return this.next();
  }
  atEnd() { return this.pos >= this.tokens.length; }

  // equation := expr '=' expr   (esattamente un '=')
  parseEquation() {
    const left = this.parseExpr();
    this.expect('=');
    const right = this.parseExpr();
    if (!this.atEnd()) {
      const t = this.peek();
      throw new ParseError(`Elemento inatteso dopo l'equazione: "${t.v}"`);
    }
    return Eq(left, right);
  }

  // expr := term (('+'|'-') term)*
  parseExpr() {
    let node = this.parseTerm();
    while (this.peek() && (this.peek().t === '+' || this.peek().t === '-')) {
      const op = this.next().t;
      const rhs = this.parseTerm();
      node = op === '+' ? Add(node, rhs) : Sub(node, rhs);
    }
    return node;
  }

  // term := factor (('*'|'/') factor | implicitMul)*
  parseTerm() {
    let node = this.parseFactor();
    for (;;) {
      const tok = this.peek();
      if (!tok) break;
      if (tok.t === '*' || tok.t === '/') {
        this.next();
        const rhs = this.parseFactor();
        node = tok.t === '*' ? Mul(node, rhs) : Div(node, rhs);
      } else if (this.startsImplicitFactor(tok)) {
        // moltiplicazione implicita: 2x, 3(x+1), x y
        const rhs = this.parseFactor();
        node = Mul(node, rhs);
      } else {
        break;
      }
    }
    return node;
  }

  // Un token può iniziare un fattore implicito (senza operatore esplicito)?
  startsImplicitFactor(tok) {
    if (tok.t === 'num' || tok.t === '(') return true;
    if (tok.t === 'ident') {
      // "sqrt" da solo è funzione: gestito in parseBase
      return true;
    }
    return false;
  }

  // factor := base ('^' unary)?   (la potenza è associativa a destra)
  parseFactor() {
    const base = this.parseUnary();
    if (this.peek() && this.peek().t === '^') {
      this.next();
      const exp = this.parseFactor(); // associativa a destra: a^b^c = a^(b^c)
      return Pow(base, exp);
    }
    return base;
  }

  // unary := ('-'|'+') unary | base
  parseUnary() {
    const tok = this.peek();
    if (tok && tok.t === '-') { this.next(); return Neg(this.parseUnary()); }
    if (tok && tok.t === '+') { this.next(); return this.parseUnary(); }
    return this.parseBase();
  }

  // base := NUMBER | IDENT '(' args ')' | IDENT | '(' expr ')'
  parseBase() {
    const tok = this.peek();
    if (!tok) throw new ParseError('Formula incompleta: atteso un elemento.');

    if (tok.t === 'num') {
      this.next();
      return Num(tok.v);
    }

    if (tok.t === '(') {
      this.next();
      const inner = this.parseExpr();
      this.expect(')');
      return Group(inner);
    }

    if (tok.t === 'ident') {
      this.next();
      const name = tok.v;
      const lower = name.toLowerCase();

      if (lower === 'sqrt') {
        this.expect('(');
        const inner = this.parseExpr();
        this.expect(')');
        return Sqrt(inner);
      }
      // Funzioni supportate: sin, cos, tan, ln, asin, acos, atan, exp.
      if (FUNCTIONS[lower]) {
        this.expect('(');
        const inner = this.parseExpr();
        this.expect(')');
        return FUNCTIONS[lower](inner);
      }
      if (UNSUPPORTED_FUNCTIONS.includes(lower)) {
        throw new ParseError(
          `La funzione "${name}" non è supportata. Sono ammesse: sqrt, sin, cos, ` +
          `tan, ln, asin, acos, atan, exp, oltre a + - * / ^ e parentesi.`
        );
      }
      // identificatore semplice: variabile (o costante π/pi/e)
      if (name === 'π') return Var('π');
      return Var(name);
    }

    throw new ParseError(`Elemento inatteso: "${tok.v}"`);
  }
}

// ---------------------------------------------------------------------------
// API pubblica
// ---------------------------------------------------------------------------

// Analizza una formula completa "sinistra = destra".
export function parseEquation(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new ParseError('La formula è vuota.');
  }
  const countEq = (input.match(/=/g) || []).length;
  if (countEq === 0) {
    throw new ParseError('Manca il segno "=". Una formula deve avere la forma "a = b".');
  }
  if (countEq > 1) {
    throw new ParseError('Ci sono più segni "=": inserisci una sola uguaglianza.');
  }
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const eq = parser.parseEquation();

  // Controllo: nessun denominatore identicamente nullo.
  assertNoZeroDenominator(eq);
  return eq;
}

// Analizza una singola espressione (senza '=').
export function parseExpression(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new ParseError('L\'espressione è vuota.');
  }
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const expr = parser.parseExpr();
  if (!parser.atEnd()) {
    throw new ParseError(`Elemento inatteso: "${parser.peek().v}"`);
  }
  return expr;
}

// Verifica che nessun denominatore sia una costante identicamente nulla.
function assertNoZeroDenominator(node) {
  switch (node.type) {
    case 'Div':
      if (node.den.type === 'Num' && node.den.value === 0) {
        throw new ParseError('La formula contiene una divisione per zero (denominatore = 0).');
      }
      assertNoZeroDenominator(node.num);
      assertNoZeroDenominator(node.den);
      break;
    case 'Add':
    case 'Sub':
    case 'Mul':
      node.args.forEach(assertNoZeroDenominator);
      break;
    case 'Pow':
      assertNoZeroDenominator(node.base);
      assertNoZeroDenominator(node.exp);
      break;
    case 'Sqrt':
    case 'Neg':
    case 'Sin': case 'Cos': case 'Tan': case 'Ln':
    case 'Asin': case 'Acos': case 'Atan': case 'Exp':
    case 'Group':
      assertNoZeroDenominator(node.arg);
      break;
    case 'Eq':
      assertNoZeroDenominator(node.left);
      assertNoZeroDenominator(node.right);
      break;
  }
}
