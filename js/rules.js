// rules.js — Definizione formale delle regole matematiche.
//
// Ogni regola è descritta da un oggetto con:
//   id           : identificatore univoco
//   name         : nome leggibile (italiano)
//   principle    : principio di equivalenza da cui deriva
//   requires     : funzione di precondizione, ritorna { ok, reason?, conditions? }
//   apply        : funzione (equazione, contesto) => nuova equazione (o lancia RuleError)
//   conditions   : condizioni di validità generate (array di stringhe)
//   explanation  : chiave per il modulo explanations.js
//
// `contesto` è un oggetto { target, node, side, path, ... } costruito da app.js.

import {
  Num, Var, Add, Sub, Mul, Div, Pow, Sqrt, Neg, Group, Eq,
  Sin, Cos, Tan, Ln, Asin, Acos, Atan, Exp,
  unwrap, canonical, isNum, isVar, equivalentExpr, evalConst, isIdenticallyZero,
  FUNC_INFO,
} from './ast.js';

export class RuleError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = 'RuleError';
    this.hint = hint || null;
  }
}

// ---------------------------------------------------------------------------
// Utilità interne
// ---------------------------------------------------------------------------

// Applica una funzione a entrambi i membri (primo/secondo principio).
function bothSides(eq, fn) {
  return Eq(fn(eq.left), fn(eq.right));
}

// Semplifica un membro dopo l'operazione, SOLO con trasformazioni valide in
// ogni condizione: riduzione di frazioni numeriche, x/x NON viene semplificato,
// a/a si semplifica solo se 'a' è sicuramente non nullo (costante ≠ 0 o
// variabile dichiarata non nulla). Qui ci limitiamo a semplificazioni sicure.
function simplify(node) {
  return canonical(node);
}

// Estrae la lista dei fattori di un nodo (per Mul appiattito, altrimenti [nodo]).
function factorsOf(node) {
  node = unwrap(node);
  if (node.type === 'Mul') return node.args;
  return [node];
}

// Ricostruisce un prodotto a partire da una lista di fattori.
function productOf(list) {
  if (list.length === 1) return list[0];
  return Mul(...list);
}

// Riconosce se il nodo è un rapporto semplice (frazione) num/den.
function asFraction(node) {
  node = unwrap(node);
  if (node.type === 'Div') return { num: node.num, den: node.den };
  return null;
}

// Cerca un fattore che contiene la variabile obiettivo e ne ritorna il ruolo.
// Ritorna { factor, others } dove multiply both sides by others isolates factor.
// Funzione di supporto per la modalità guidata.

// ---------------------------------------------------------------------------
// Raccolta di tutte le variabili coinvolte
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// REGOLE
// ---------------------------------------------------------------------------

// Usiamo oggetti-regola con metodi che ricevono (eq, ctx) e ritornano
// { equation, conditions, steps }.

// 1) PRIMO PRINCIPIO — aggiunta di una quantità a entrambi i membri
export const ruleAddBothSides = {
  id: 'add-both',
  name: 'Aggiunta della stessa quantità a entrambi i membri (primo principio di equivalenza)',
  principle: 'Se A = B allora A + C = B + C.',
  explanation: 'add-both',
  canAdd: (expr) => true,
  apply(eq, ctx) {
    const c = ctx.value; // quantità da aggiungere
    const newEq = bothSides(eq, (side) => simplify(Add(side, c)));
    return { equation: newEq, conditions: [], steps: [`Aggiungo ${ctx.valueText} a entrambi i membri.`] };
  },
};

// 2) PRIMO PRINCIPIO — sottrazione di una quantità da entrambi i membri
export const ruleSubBothSides = {
  id: 'sub-both',
  name: 'Sottrazione della stessa quantità da entrambi i membri (primo principio di equivalenza)',
  principle: 'Se A = B allora A − C = B − C.',
  explanation: 'sub-both',
  apply(eq, ctx) {
    const c = ctx.value;
    const newEq = bothSides(eq, (side) => simplify(Sub(side, c)));
    return { equation: newEq, conditions: [], steps: [`Sottraggo ${ctx.valueText} da entrambi i membri.`] };
  },
};

// 3) SECONDO PRINCIPIO — moltiplicazione di entrambi i membri per C.
// Richiede C ≠ 0? NO: la moltiplicazione per 0 è lecita ma degenera (0=0);
// pertanto la vietiamo esplicitamente quando C è identicamente nullo.
export const ruleMulBothSides = {
  id: 'mul-both',
  name: 'Moltiplicazione di entrambi i membri per la stessa quantità (secondo principio di equivalenza)',
  principle: 'Se A = B allora A·C = B·C.',
  explanation: 'mul-both',
  apply(eq, ctx) {
    const c = ctx.value;
    if (unwrap(c).type === 'Num' && unwrap(c).value === 0) {
      throw new RuleError(
        'Moltiplicare entrambi i membri per 0 è lecito ma distrugge l\'informazione (0 = 0): non è una trasformazione utile.',
        'Scegli una quantità non nulla.'
      );
    }
    const newEq = bothSides(eq, (side) => simplify(Mul(side, c)));
    return { equation: newEq, conditions: [], steps: [`Moltiplico entrambi i membri per ${ctx.valueText}.`] };
  },
};

// 4) SECONDO PRINCIPIO — divisione di entrambi i membri per C, con C ≠ 0.
export const ruleDivBothSides = {
  id: 'div-both',
  name: 'Divisione di entrambi i membri per la stessa quantità non nulla (secondo principio di equivalenza)',
  principle: 'Se A = B e C ≠ 0 allora A/C = B/C.',
  explanation: 'div-both',
  precondition(eq, ctx) {
    const c = ctx.value;
    if (isIdenticallyZero(c)) {
      throw new RuleError(
        'Non si può dividere per una quantità identicamente nulla: la divisione per zero non è definita.',
        'Specifica una quantità sicuramente diversa da zero.'
      );
    }
    const cond = conditionText(c, '≠ 0');
    return { conditions: [cond] };
  },
  apply(eq, ctx) {
    const c = ctx.value;
    const newEq = bothSides(eq, (side) => simplify(Div(side, c)));
    return {
      equation: newEq,
      conditions: [conditionText(c, '≠ 0')],
      steps: [`Divido entrambi i membri per ${ctx.valueText} (con ${ctx.valueText} ≠ 0).`],
    };
  },
};

// 5) TRASPORTO DI UN TERMINE ADDITIVO (cambiamento di segno)
// Isola il termine contenente la variabile obiettivo, spostando gli altri.
export const ruleMoveAdditiveTerm = {
  id: 'move-term',
  name: 'Trasporto di un termine additivo con cambiamento di segno',
  principle: 'Somma membro a membro lo stesso additivo opposto (primo principio di equivalenza).',
  explanation: 'move-term',
  apply(eq, ctx) {
    // ctx.term = termine additivo da portare dall'altra parte; ctx.side = 'left'|'right'
    const { term, side } = ctx;
    const from = side === 'left' ? eq.left : eq.right;
    const to = side === 'left' ? eq.right : eq.left;

    const fromTerms = additiveTerms(from);
    const idx = fromTerms.findIndex((t) => equivalentExpr(t.node, unwrap(term)));
    if (idx < 0) {
      throw new RuleError('Il termine selezionato non è un additivo di quel membro.');
    }
    // Conserviamo i SEGNI dei termini rimanenti: rebuildSum si aspetta
    // oggetti { node, sign }, non semplici nodi.
    const matched = fromTerms[idx];
    // Conserviamo i SEGNI dei termini rimanenti: rebuildSum si aspetta
    // oggetti { node, sign }, non semplici nodi.
    const remaining = fromTerms.filter((_, i) => i !== idx);
    const leftOver = remaining.length === 0 ? Num(0) : rebuildSum(remaining);

    // Nel trasporto il termine cambia di segno: se era sommato (+) viene
    // sottratto all'altro membro; se era sottratto (-) viene sommato.
    const movedTerm = matched.sign === '-' ? term : Neg(term);

    const newFrom = simplify(leftOver);
    const newTo = simplify(Add(to, movedTerm));

    const newEq = side === 'left' ? Eq(newFrom, newTo) : Eq(newTo, newFrom);
    return {
      equation: newEq,
      conditions: [],
      steps: [
        `Porto il termine ${ctx.termText} dall'altro membro applicando il primo principio: il termine vi compare con il segno cambiato.`,
      ],
    };
  },
};

// 6) TRASPORTO DI UN FATTORE (divisione per il fattore) — a = b·c, voglio isolare b.
export const ruleMoveFactor = {
  id: 'move-factor',
  name: 'Trasporto di un fattore (divisione di entrambi i membri per il fattore)',
  principle: 'Se A = B allora A/C = B/C, purché C ≠ 0.',
  explanation: 'move-factor',
  apply(eq, ctx) {
    const { factor, side } = ctx; // fattore da "spostare"
    const from = side === 'left' ? eq.left : eq.right;
    const fact = unwrap(factor);

    // Il fattore deve comparire davvero tra i fattori moltiplicativi del membro.
    const factList = factorsOf(from);
    const idx = factList.findIndex((f) => equivalentExpr(f, fact));
    if (idx < 0) {
      throw new RuleError(
        'Il fattore selezionato non è un fattore moltiplicativo di quel membro.',
        'Puoi trasportare solo elementi che moltiplicano l\'intero membro, non termini di una somma.'
      );
    }

    const cond = conditionText(fact, '≠ 0');
    // Dividiamo ENTRAMBI i membri per il fattore.
    const newEq = bothSides(eq, (s) => simplify(Div(s, fact)));
    return {
      equation: newEq,
      conditions: [cond],
      steps: [`Divido entrambi i membri per il fattore ${ctx.factorText} (${ctx.factorText} ≠ 0).`],
    };
  },
};

// 7) MOLTIPLICAZIONE INCROCIATA su una proporzione a/b = c/d.
export const ruleCrossMultiply = {
  id: 'cross-multiply',
  name: 'Moltiplicazione incrociata in una proporzione',
  principle: 'Da a/b = c/d, moltiplicando entrambi i membri per b·d (b,d ≠ 0) si ottiene a·d = b·c.',
  explanation: 'cross-multiply',
  precondition(eq) {
    const L = asFraction(eq.left);
    const R = asFraction(eq.right);
    if (!L || !R) {
      throw new RuleError(
        'La moltiplicazione incrociata si applica solo quando ENTRAMBI i membri sono rapporti (frazioni).',
        'Riscrivi ciascun membro come frazione prima di applicare questa regola.'
      );
    }
    return { ok: true };
  },
  apply(eq) {
    const L = asFraction(eq.left);
    const R = asFraction(eq.right);
    if (!L || !R) {
      throw new RuleError('Entrambi i membri devono essere rapporti per la moltiplicazione incrociata.');
    }
    const newEq = Eq(
      simplify(Mul(L.num, R.den)),
      simplify(Mul(L.den, R.num))
    );
    return {
      equation: newEq,
      conditions: [conditionText(L.den, '≠ 0'), conditionText(R.den, '≠ 0')],
      steps: [
        'Moltiplico entrambi i membri per il prodotto dei denominatori: i denominatori si semplificano e si ottiene la proporzione incrociata.',
      ],
    };
  },
};

// 8) SCAMBIO DEI MEMBRI (simmetria dell'uguaglianza)
export const ruleSwapSides = {
  id: 'swap-sides',
  name: 'Scambio dei membri (proprietà simmetrica dell\'uguaglianza)',
  principle: 'Se A = B allora B = A.',
  explanation: 'swap-sides',
  apply(eq) {
    return { equation: Eq(eq.right, eq.left), conditions: [], steps: ['Scambio i due membri dell\'uguaglianza.'] };
  },
};

// 9) RECIPROCO DI ENTRAMBI I MEMBRI
export const ruleReciprocalBothSides = {
  id: 'reciprocal-both',
  name: 'Reciproco di entrambi i membri',
  principle: 'Se A = B con A ≠ 0 e B ≠ 0, allora 1/A = 1/B.',
  explanation: 'reciprocal-both',
  precondition(eq) {
    if (isIdenticallyZero(eq.left) || isIdenticallyZero(eq.right)) {
      throw new RuleError('Non si può calcolare il reciproco di un membro identicamente nullo.');
    }
    return { ok: true };
  },
  apply(eq) {
    const recip = (node) => {
      const f = asFraction(node);
      if (f) return simplify(Div(f.den, f.num));
      return simplify(Div(Num(1), node));
    };
    return {
      equation: Eq(recip(eq.left), recip(eq.right)),
      conditions: [conditionText(eq.left, '≠ 0'), conditionText(eq.right, '≠ 0')],
      steps: ['Prendo il reciproco di entrambi i membri (entrambi devono essere non nulli).'],
    };
  },
};

// 10) INVERSIONE DI UNA PROPORZIONE (reciproco di entrambi i membri di una frazione)
// Vietato invertire un solo membro.
export const ruleInvertProportion = {
  id: 'invert-proportion',
  name: 'Inversione di una proporzione (reciproco di entrambi i membri frazionari)',
  principle: 'Se a/b = c/d con a,b,c,d ≠ 0 allora b/a = d/c.',
  explanation: 'invert-proportion',
  precondition(eq) {
    const L = asFraction(eq.left);
    const R = asFraction(eq.right);
    if (!L || !R) {
      throw new RuleError(
        'L\'inversione si applica solo quando entrambi i membri sono rapporti frazionari; non si inverte mai un solo membro.',
        'Porta entrambi i membri in forma frazionaria oppure usa il reciproco di entrambi i membri.'
      );
    }
    return { ok: true };
  },
  apply(eq) {
    const L = asFraction(eq.left);
    const R = asFraction(eq.right);
    if (!L || !R) throw new RuleError('Entrambi i membri devono essere rapporti.');
    return {
      equation: Eq(simplify(Div(L.den, L.num)), simplify(Div(R.den, R.num))),
      conditions: [
        conditionText(L.num, '≠ 0'), conditionText(L.den, '≠ 0'),
        conditionText(R.num, '≠ 0'), conditionText(R.den, '≠ 0'),
      ],
      steps: ['Inverto entrambi i rapporti (numeratore e denominatore scambiati).'],
    };
  },
};

// 11) RADICE DI INDICE PARI APPLICATA A ENTRAMBI I MEMBRI (caso principale: quadrata)
// Per una radice di indice pari n = 2k:
//   - il radicando deve essere ≥ 0 (nel campo reale);
//   - estraendo la radice di un grado pari si introduce il segno ±, perché
//     sia +x sia −x, elevate a un esponente pari, danno lo stesso risultato.
export const ruleSqrtBothSides = {
  id: 'sqrt-both',
  name: 'Estrazione della radice quadrata (indice pari) di entrambi i membri',
  principle: 'Se x² = A con A ≥ 0 allora x = ±√A. Una radice di indice pari richiede radicando ≥ 0 e introduce il segno ±.',
  explanation: 'sqrt-both',
  apply(eq, ctx) {
    const { side } = ctx; // membro che contiene la potenza con la variabile
    const withPow = side === 'left' ? eq.left : eq.right;
    const other = side === 'left' ? eq.right : eq.left;

    const found = extractEvenPower(withPow, ctx.insideVar);
    if (!found) {
      throw new RuleError(
        'La radice di indice pari si applica direttamente solo quando un membro è una potenza con esponente pari (x², x⁴, …).',
        'Isola prima la potenza a esponente pari su un membro.'
      );
    }
    const n = found.exp;
    const rootOther = n === 2 ? Sqrt(other) : Pow(other, Num(1 / n));
    // Sul membro con la potenza pari compare il segno ±
    const newEq = side === 'left'
      ? Eq(found.base, Add(Pm(), rootOther))
      : Eq(Add(Pm(), rootOther), found.base);
    return {
      equation: newEq,
      conditions: [conditionText(other, '≥ 0')],
      steps: [
        `Estraggo la radice ${n === 2 ? 'quadrata' : `${n}-esima`} di entrambi i membri. ` +
        'L\'indice è pari: serve il radicando ≥ 0 e la radice di un grado pari è il valore assoluto, quindi introduco il segno ±.',
      ],
      note: 'Il segno ± è matematicamente necessario: non va eliminato. ' +
        'Se la grandezza cercata è per sua natura positiva (es. una lunghezza, una massa, un tempo), scegli il segno + per togliere l\'ambiguità.',
    };
  },
};

// 12) RADICE DI INDICE DISPARI APPLICATA A ENTRAMBI I MEMBRI (es. cubica)
// Per una radice di indice dispari:
//   - il radicando può essere POSITIVO, NEGATIVO o nullo: nessuna condizione di
//     segno è necessaria (la radice di indice dispari è definita su tutto ℝ);
//   - NON si introduce alcuna ambiguità di segno: la radice è unica.
export const ruleRootOddBothSides = {
  id: 'root-odd-both',
  name: 'Estrazione di una radice di indice dispari (es. cubica) di entrambi i membri',
  principle: 'Se xⁿ = A con n dispari allora x = ⁿ√A, ed è unica: nessuna condizione di segno e nessun ±.',
  explanation: 'root-odd',
  apply(eq, ctx) {
    const { side } = ctx;
    const withPow = side === 'left' ? eq.left : eq.right;
    const other = side === 'left' ? eq.right : eq.left;

    const found = extractOddPower(withPow, ctx.insideVar);
    if (!found) {
      throw new RuleError(
        'La radice di indice dispari si applica direttamente solo quando un membro è una potenza con esponente dispari (x³, x⁵, …).',
        'Isola prima la potenza a esponente dispari su un membro.'
      );
    }
    const n = found.exp;
    const rootOther = Pow(other, Num(1 / n));
    const newEq = side === 'left'
      ? Eq(found.base, rootOther)
      : Eq(rootOther, found.base);
    return {
      equation: newEq,
      conditions: [],
      steps: [
        `Estraggo la radice ${n}-esima (indice dispari) di entrambi i membri. ` +
        'Per una radice di indice dispari il radicando può essere positivo, negativo o nullo: non serve alcuna condizione di segno e non compare il ±.',
      ],
      note: 'Radice di indice dispari: la radice è unica e NON si introduce il segno ±. ' +
        'Il radicando può essere di qualunque segno.',
    };
  },
};

// 13) ELEVAZIONE DI ENTRAMBI I MEMBRI A UN ESPONENTE
export const rulePowBothSides = {
  id: 'pow-both',
  name: 'Elevazione di entrambi i membri alla stessa potenza',
  principle: 'Se A = B allora A^n = B^n.',
  explanation: 'pow-both',
  apply(eq, ctx) {
    const n = ctx.value;
    const newEq = Eq(simplify(Pow(eq.left, n)), simplify(Pow(eq.right, n)));
    return {
      equation: newEq,
      conditions: [],
      steps: [`Elevo entrambi i membri all'esponente ${ctx.valueText}.`],
      note: isEvenInt(n)
        ? 'Attenzione: elevare a un esponente pari non è iniettivo e può introdurre soluzioni estranee: le soluzioni vanno sempre ricontrollate.'
        : 'Elevare a un esponente dispari è iniettivo: non introduce soluzioni estranee.',
    };
  },
};

// 14) PROPRIETÀ DISTRIBUTIVA  a(x+b) = c  =>  ax + ab = c
export const ruleDistribute = {
  id: 'distribute',
  name: 'Proprietà distributiva del prodotto rispetto alla somma',
  principle: 'a(x + b) = ax + ab.',
  explanation: 'distribute',
  apply(eq, ctx) {
    const { side } = ctx; // membro su cui distribuire
    const side_expr = side === 'left' ? eq.left : eq.right;
    const distributed = distribute(side_expr);
    const newEq = side === 'left'
      ? Eq(distributed, eq.right)
      : Eq(eq.left, distributed);
    return {
      equation: simplify(newEq),
      conditions: [],
      steps: ['Applico la proprietà distributiva: moltiplico il fattore per ciascun termine della somma.'],
    };
  },
};

// 15) RACCOGLIMENTO A FATTOR COMUNE (procedimento inverso della distributiva)
export const ruleFactorCommon = {
  id: 'factor-common',
  name: 'Raccoglimento a fattor comune',
  principle: 'ax + ab = a(x + b).',
  explanation: 'factor-common',
  apply(eq, ctx) {
    const { side, common } = ctx; // fattore comune da raccogliere
    const expr = side === 'left' ? eq.left : eq.right;
    const factored = factorOut(expr, common);
    if (!factored) {
      throw new RuleError('Il fattore indicato non è comune a tutti i termini del membro.');
    }
    const newEq = side === 'left' ? Eq(factored, eq.right) : Eq(eq.left, factored);
    return {
      equation: newEq,
      conditions: [],
      steps: [`Raccolgo il fattore comune ${ctx.commonText} tra i termini del membro.`],
    };
  },
};

// 16) CANCELLAZIONE DI UN FATTORE COMUNE TRA UNA FRAZIONE E UN PRODOTTO
//     (a/b)·b  =>  a   —  vale anche nella forma  b·(a/b)
// È il passo che "libera" una grandezza finita al denominatore dopo aver
// moltiplicato entrambi i membri (es. da v = s/t si arriva a v·t = (s/t)·t
// e poi si cancella t). La cancellazione è algebricamente lecita sotto la
// condizione den ≠ 0, già registrata al passo di moltiplicazione.
export const ruleCancelFactor = {
  id: 'cancel-factor',
  name: 'Cancellazione di un fattore comune tra frazione e prodotto',
  principle: '(a/b)·b = a, purché b ≠ 0 (semplificazione di un fattore comune)',
  explanation: 'cancel-factor',
  apply(eq, ctx) {
    const { den, side } = ctx; // denominatore della frazione da cancellare
    const member = side === 'left' ? eq.left : eq.right;
    const denNode = unwrap(den);

    const reduced = cancelFractionFactor(member, denNode);
    if (!reduced) {
      throw new RuleError(
        'Non trovo una frazione con questo denominatore moltiplicata per un fattore uguale: non c\'è nulla da cancellare.',
        'Seleziona il denominatore della frazione che fa parte di un prodotto con lo stesso fattore.'
      );
    }

    const newEq = side === 'left' ? Eq(reduced, eq.right) : Eq(eq.left, reduced);
    return {
      equation: simplify(newEq),
      conditions: [conditionText(denNode, '≠ 0')],
      steps: [
        `Semplifico il fattore ${ctx.denText} tra numeratore e denominatore della frazione (${ctx.denText} ≠ 0).`,
      ],
    };
  },
};

// 17) INVERSIONE DI UNA FUNZIONE TRASCENDENTE APPLICATA A ENTRAMBI I MEMBRI
//     Es. sin(x) = k  =>  x = asin(k)   (con le dovute condizioni di dominio).
// La funzione f va applicata "a rovescio" (inversa f⁻¹) a ENTRAMBI i membri.
// Richiede che il membro senza la funzione sia nel codominio dell'inversa, cioè
// nel dominio della funzione (es. per sin/asin serve k ∈ [−1, 1]).
// L'inversa restituisce il valore nel RAMO PRINCIPALE: vanno pertanto registrate
// le condizioni di dominio e discusso il ramo.
export const ruleInvertFunction = {
  id: 'invert-function',
  name: 'Applicazione della funzione inversa a entrambi i membri',
  principle: 'Se A = B e f è iniettiva sul ramo considerato, allora f⁻¹(A) = f⁻¹(B).',
  explanation: 'invert-function',
  apply(eq, ctx) {
    // ctx.side = 'left'|'right' : membro che contiene f(arg) da "liberare".
    const { side } = ctx;
    const withFn = unwrap(side === 'left' ? eq.left : eq.right);
    const other = unwrap(side === 'left' ? eq.right : eq.left);
    const fnNode = ctx.fnNode ? unwrap(ctx.fnNode) : extractFunc(withFn);
    if (!fnNode) {
      throw new RuleError(
        'Nessuna funzione invertibile selezionata.',
        'Seleziona una funzione (sin, cos, tan, ln) su un membro, con il suo argomento contenente la variabile.'
      );
    }

    const key = fnNode.type.toLowerCase(); // 'sin' | 'cos' | 'tan' | 'ln'
    const info = FUNC_INFO[key];
    if (!info || !info.inverse) {
      throw new RuleError(`La funzione "${key}" non è invertibile in questo modo.`);
    }
    const invCtor = { asin: Asin, acos: Acos, atan: Atan, exp: Exp }[info.inverse];

    // Nuova equazione: argomento = inversa(altro membro).
    // coerenza ramo/inversa: la var restituita è nel ramo principale.
    const argFn = fnNode.arg;                       // argomento della funzione
    const rhs = invCtor(other);                     // f⁻¹(altro membro)
    const newEqRaw = side === 'left' ? Eq(argFn, rhs) : Eq(rhs, argFn);
    const newEq = simplify(newEqRaw);

    // Condizioni: l'argomento di f⁻¹ (cioè l'altro membro) deve appartenere al
    // dominio di f. Inoltre per tan/ln va registrato l'eventuale vincolo.
    const conditions = [];
    // Dominio di f⁻¹ = codominio di f sul ramo principale:
    //  - sin, cos  -> l'argomento dev'essere in [−1, 1]
    //  - tan       -> ℝ
    //  - ln        -> ℝ
    const otherText = toPretty(other, 0);
    if (key === 'sin' || key === 'cos') {
      conditions.push(`${otherText} ∈ [−1, 1]     (dominio di ${info.inverse})`);
    }
    // Vincolo dell'argomento della funzione originale (per tan e ln):
    if (info.domainText && info.domainText !== null) {
      conditions.push(`${toPretty(argFn, 0)}: ${info.domainText}`);
    }
    // Il valore ottenuto con l'inversa è sempre nel ramo principale:
    conditions.push(`la soluzione è presa nel ramo principale ${info.branch} di ${key}`);

    return {
      equation: newEq,
      conditions,
      steps: [
        `Applico la funzione inversa ${info.inverse} a entrambi i membri: essendo f invertibile sul ramo principale, ` +
        `da ${key}(${toPretty(argFn, 0)}) = ${otherText} segue ${toPretty(argFn, 0)} = ${info.inverse}(${otherText}).`,
      ],
      note: key === 'sin' || key === 'cos'
        ? 'Per applicare l\'inversa serve che il valore a destra sia compreso in [−1, 1]. ' +
          'L\'inversa restituisce un angolo nel ramo principale: la funzione seno/coseno NON è iniettiva su tutto ℝ, perciò vanno considerate le eventuali altre soluzioni (x + 2kπ, oppure π − x per il seno, ±x + 2kπ per il coseno).'
        : 'L\'inversa restituisce un valore nel ramo principale: discuti l\'eventuale periodicità aggiuntiva se il problema lo richiede.',
    };
  },
};

// ---------------------------------------------------------------------------
// Helper per potenze / quadrati / ±
// ---------------------------------------------------------------------------
function Pm() {
  // Rappresentazione del segno ± come variabile speciale "±"
  return Var('±');
}

// True se l'esponente è un intero pari noto (2, 4, 6, …).
function isEvenInt(node) {
  node = unwrap(node);
  if (!isNum(node)) return false;
  return Number.isInteger(node.value) && node.value % 2 === 0;
}

// Valore dell'esponente se il nodo è una potenza con esponente numerico intero.
function powExponent(node) {
  node = unwrap(node);
  if (node.type === 'Pow' && isNum(unwrap(node.exp))) return unwrap(node.exp).value;
  return null;
}

// Cerca un nodo funzione trascendente (sin/cos/tan/ln) nel sottoalbero, con un
// argomento che contiene la variabile obiettivo; ritorna il nodo funzione o null.
function extractFunc(node, targetVar) {
  node = unwrap(node);
  if (['Sin', 'Cos', 'Tan', 'Ln'].includes(node.type)) return node;
  if (node.type === 'Group') return extractFunc(node.arg, targetVar);
  return null;
}

// Cerca un nodo della forma base^exp con exp intero PARI (> 0); ritorna { base, exp }.
function extractEvenPower(node, targetVar) {
  node = unwrap(node);
  const exp = powExponent(node);
  if (exp != null && Number.isInteger(exp) && exp > 0 && exp % 2 === 0) {
    return { base: node.base, exp };
  }
  if (node.type === 'Group') return extractEvenPower(node.arg, targetVar);
  return null;
}

// Cerca un nodo della forma base^exp con exp intero DISPARI (> 1); ritorna { base, exp }.
function extractOddPower(node, targetVar) {
  node = unwrap(node);
  const exp = powExponent(node);
  if (exp != null && Number.isInteger(exp) && exp > 1 && Math.abs(exp % 2) === 1) {
    return { base: node.base, exp };
  }
  if (node.type === 'Group') return extractOddPower(node.arg, targetVar);
  return null;
}

// ---------------------------------------------------------------------------
// Helper per termini additivi e ricostruzione somme
// ---------------------------------------------------------------------------
// Ritorna la lista di { node, sign } dei termini additivi di un membro,
// normalizzando le sottrazioni come somme di opposti.
export function additiveTerms(node) {
  node = unwrap(node);
  if (node.type === 'Add') {
    return node.args.map((a) => ({ node: unwrap(a), sign: '+' }));
  }
  if (node.type === 'Sub') {
    const out = [{ node: unwrap(node.args[0]), sign: '+' }];
    for (let i = 1; i < node.args.length; i++) {
      const arg = unwrap(node.args[i]);
      if (arg.type === 'Neg') out.push({ node: arg.arg, sign: '-' });
      else out.push({ node: arg, sign: '-' });
    }
    return out;
  }
  if (node.type === 'Neg') {
    return [{ node: unwrap(node.arg), sign: '-' }];
  }
  return [{ node, sign: '+' }];
}

// Cerca in `node` (un membro) un prodotto che contenga una frazione A/B e un
// fattore equivalente a B; restituisce il membro riscritto con (A/B)·B -> A.
// Gestisce anche il caso B·(A/B) e prodotto con più fattori. Ritorna null se
// non trova alcuna cancellazione possibile.
export function cancelFractionFactor(node, denNode) {
  node = unwrap(node);
  if (node.type === 'Mul') {
    const fracIdx = node.args.findIndex((a) => unwrap(a).type === 'Div');
    if (fracIdx >= 0) {
      const frac = unwrap(node.args[fracIdx]);
      if (equivalentExpr(frac.den, denNode)) {
        const otherFactors = node.args.filter((_, i) => i !== fracIdx);
        // serve almeno un altro fattore uguale al denominatore
        const cancelIdx = otherFactors.findIndex((f) => equivalentExpr(f, denNode));
        if (cancelIdx >= 0) {
          const restFactors = otherFactors.filter((_, i) => i !== cancelIdx);
          return restFactors.length === 0
            ? frac.num
            : productOf([frac.num, ...restFactors]);
        }
      }
    }
  }

  if (node.type === 'Div') {
    const num = unwrap(node.num);
    const den = unwrap(node.den);
    if (equivalentExpr(den, denNode)) {
      if (equivalentExpr(num, denNode)) return Num(1);
      if (num.type === 'Mul') {
        const idx = num.args.findIndex((f) => equivalentExpr(f, denNode));
        if (idx >= 0) {
          const restFactors = num.args.filter((_, i) => i !== idx);
          return productOf(restFactors);
        }
      }
    }
  }

  return null;
}

export function rebuildSum(terms) {
  const positive = terms.filter((t) => t.sign === '+').map((t) => t.node);
  const negative = terms.filter((t) => t.sign === '-').map((t) => t.node);
  let node;
  if (positive.length === 0) {
    node = Num(0);
  } else if (positive.length === 1) {
    node = positive[0];
  } else {
    node = Add(...positive);
  }
  for (const n of negative) {
    node = Sub(node, n);
  }
  return node;
}

// ---------------------------------------------------------------------------
// Distributiva / raccoglimento ricorsivi
// ---------------------------------------------------------------------------
function distribute(node) {
  node = unwrap(node);
  switch (node.type) {
    case 'Mul': {
      const args = node.args.map(distribute);
      // cerca un argomento che è una somma
      const idx = args.findIndex((a) => unwrap(a).type === 'Add' || unwrap(a).type === 'Sub');
      if (idx < 0) return Mul(...args);
      const target = unwrap(args[idx]);
      const others = args.filter((_, i) => i !== idx);
      const factor = others.length === 0 ? Num(1) : productOf(others);
      if (target.type === 'Add') {
        return Add(...target.args.map((t) => distribute(Mul(factor, t))));
      } else { // Sub
        const first = distribute(Mul(factor, target.args[0]));
        const rest = target.args.slice(1).map((t) => distribute(Mul(factor, t)));
        return Sub(first, ...rest);
      }
    }
    case 'Add':
      return Add(...node.args.map(distribute));
    case 'Sub':
      return Sub(...node.args.map(distribute));
    case 'Div':
      return Div(distribute(node.num), distribute(node.den));
    case 'Pow':
      return Pow(distribute(node.base), distribute(node.exp));
    default:
      return node;
  }
}

function factorOut(node, common) {
  node = unwrap(node);
  if (node.type !== 'Add' && node.type !== 'Sub') return null;
  const terms = additiveTerms(node);
  const others = [];
  for (const t of terms) {
    const f = removeCommonFactor(t.node, common);
    if (!f) return null; // il fattore non è comune a tutti
    others.push({ node: f, sign: t.sign });
  }
  const inner = rebuildSum(others);
  return Mul(common, Group(inner));
}

// Se `expr` è del tipo common * rest, ritorna rest; altrimenti se expr == common
// ritorna 1; altrimenti null.
function removeCommonFactor(expr, common) {
  expr = unwrap(expr);
  common = unwrap(common);
  if (equivalentExpr(expr, common)) return Num(1);
  if (expr.type === 'Mul') {
    const idx = expr.args.findIndex((a) => equivalentExpr(a, common));
    if (idx >= 0) {
      const rest = expr.args.filter((_, i) => i !== idx);
      return rest.length === 0 ? Num(1) : productOf(rest);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Testo delle condizioni
// ---------------------------------------------------------------------------
import { toPretty } from './ast.js';

export function conditionText(node, relation) {
  return `${toPretty(unwrap(node), 0)} ${relation}`;
}

function negText(text) {
  return `(−${text})`;
}

// ---------------------------------------------------------------------------
// Registro delle regole esposte all'interfaccia
// ---------------------------------------------------------------------------
export const RULES = {
  addBoth: ruleAddBothSides,
  subBoth: ruleSubBothSides,
  mulBoth: ruleMulBothSides,
  divBoth: ruleDivBothSides,
  moveTerm: ruleMoveAdditiveTerm,
  moveFactor: ruleMoveFactor,
  crossMultiply: ruleCrossMultiply,
  swapSides: ruleSwapSides,
  reciprocalBoth: ruleReciprocalBothSides,
  invertProportion: ruleInvertProportion,
  sqrtBoth: ruleSqrtBothSides,
  rootOddBoth: ruleRootOddBothSides,
  powBoth: rulePowBothSides,
  distribute: ruleDistribute,
  factorCommon: ruleFactorCommon,
  cancelFactor: ruleCancelFactor,
  invertFunction: ruleInvertFunction,
};

// ---------------------------------------------------------------------------
// Applicatore generico: esegue una regola sull'equazione, gestendo errori e
// condizioni. Ritorna { ok, equation, conditions, steps, note } oppure
// { ok:false, error, hint }.
// ---------------------------------------------------------------------------
export function applyRule(rule, eq, ctx = {}) {
  try {
    if (rule.precondition) {
      const pre = rule.precondition(eq, ctx);
      if (pre && pre.ok === false) {
        return { ok: false, error: pre.reason, hint: pre.hint };
      }
    }
    const res = rule.apply(eq, ctx);
    return {
      ok: true,
      equation: res.equation,
      conditions: res.conditions || [],
      steps: res.steps || [],
      note: res.note || null,
    };
  } catch (err) {
    if (err instanceof RuleError) {
      return { ok: false, error: err.message, hint: err.hint };
    }
    return { ok: false, error: 'Errore interno: ' + err.message, hint: null };
  }
}
