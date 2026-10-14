import { parseEquation } from '../js/parser.js';
import { toPretty, unwrap, Mul, Div, Num, Var, Eq, Add, Neg, canonical } from '../js/ast.js';
import { applyDragMove } from '../js/dragdrop.js';

// Test 1: A * B = C -> drag B to right denominator
let eq1 = parseEquation('A * B = C');
let res1 = applyDragMove({
  currentEq: eq1,
  varName: 'B',
  nodeType: 'Var',
  fromSide: 'left',
  fromSlot: 'num',
  targetSide: 'right',
  targetSlot: 'den',
});
console.log('Test 1 (A*B=C drag B):', toPretty(res1.newEq)); // A = C/B

// Test 2: v = s / t -> drag t to left numerator
let eq2 = parseEquation('v = s / t');
let res2 = applyDragMove({
  currentEq: eq2,
  varName: 't',
  nodeType: 'Var',
  fromSide: 'right',
  fromSlot: 'den',
  targetSide: 'left',
  targetSlot: 'num',
});
console.log('Test 2 (v=s/t drag t):', toPretty(res2.newEq)); // v·t = s

// Test 3: From v*t = s -> drag v to right denominator
let res3 = applyDragMove({
  currentEq: res2.newEq,
  varName: 'v',
  nodeType: 'Var',
  fromSide: 'left',
  fromSlot: 'num',
  targetSide: 'right',
  targetSlot: 'den',
});
console.log('Test 3 (v*t=s drag v):', toPretty(res3.newEq)); // t = s/v

// Test 4: Ec = (1/2)*m*v^2 -> drag 2 to left numerator
let eq4 = parseEquation('Ec = (1/2)*m*v^2');
let res4 = applyDragMove({
  currentEq: eq4,
  varName: '2',
  nodeType: 'Num',
  fromSide: 'right',
  fromSlot: 'den',
  targetSide: 'left',
  targetSlot: 'num',
});
console.log('Test 4 (Ec=(1/2)*m*v^2 drag 2):', toPretty(res4.newEq)); // 2·Ec = m·v^2

// Test 5: From 2·Ec = m·v^2 -> drag m to left denominator
let res5 = applyDragMove({
  currentEq: res4.newEq,
  varName: 'm',
  nodeType: 'Var',
  fromSide: 'right',
  fromSlot: 'num',
  targetSide: 'left',
  targetSlot: 'den',
});
console.log('Test 5 (2·Ec=m·v^2 drag m):', toPretty(res5.newEq)); // 2·Ec/m = v^2

// Test 6: From 2·Ec = m·v^2 -> drag entire v^2 as Pow to left denominator
let res6 = applyDragMove({
  currentEq: res4.newEq,
  varName: 'v^2',
  nodeType: 'Pow',
  fromSide: 'right',
  fromSlot: 'num',
  targetSide: 'left',
  targetSlot: 'den',
});
console.log('Test 6 (2·Ec=m·v^2 drag v^2 as Pow):', toPretty(res6.newEq)); // 2·Ec/v^2 = m

// Test 7: P = p0 + d*g*h -> drag entire term d*g*h to left
let eq7 = parseEquation('P = p0 + d*g*h');
let res7 = applyDragMove({
  currentEq: eq7,
  varName: 'd*g*h',
  nodeType: 'Mul',
  fromSide: 'right',
  fromSlot: 'num',
  targetSide: 'left',
  targetSlot: 'add',
});
console.log('Test 7 (P=p0+d*g*h drag d*g*h):', toPretty(res7.newEq)); // P - d·g·h = p0

// Test 8: J = m*v - m*v0 -> drag entire term m*v0 to left
let eq8 = parseEquation('J = m*v - m*v0');
let res8 = applyDragMove({
  currentEq: eq8,
  varName: 'm*v0',
  nodeType: 'Mul',
  fromSide: 'right',
  fromSlot: 'num',
  targetSide: 'left',
  targetSlot: 'add',
});
console.log('Test 8 (J=m*v-m*v0 drag m*v0):', toPretty(res8.newEq)); // J + m·v0 = m·v
