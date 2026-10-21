(() => {
  // js/ast.js
  var FUNC_INFO = {
    sin: {
      domain: null,
      branch: "[\u2212\u03C0/2, \u03C0/2]",
      range: "[\u22121, 1]",
      inverse: "asin",
      domainText: null,
      rangeText: "l'argomento di sin \xE8 un angolo (nessun vincolo)"
    },
    cos: {
      domain: null,
      branch: "[0, \u03C0]",
      range: "[\u22121, 1]",
      inverse: "acos",
      domainText: null,
      rangeText: "l'argomento di cos \xE8 un angolo (nessun vincolo)"
    },
    tan: {
      domain: "\u03B8 \u2260 \u03C0/2 + k\u03C0",
      branch: "(\u2212\u03C0/2, \u03C0/2)",
      range: "\u211D",
      inverse: "atan",
      domainText: "\u03B8 \u2260 \u03C0/2 + k\u03C0 (k \u2208 \u2124)",
      rangeText: null
    },
    ln: {
      domain: "x > 0",
      branch: "(0, +\u221E)",
      range: "\u211D",
      inverse: "exp",
      domainText: "x > 0",
      rangeText: null
    }
  };
  var Num = (value) => ({ type: "Num", value });
  var Var = (name) => ({ type: "Var", name });
  var Add = (...args) => flattenAssoc("Add", args);
  var Sub = (...args) => ({ type: "Sub", args: flattenSubArgs(args) });
  var Mul = (...args) => flattenAssoc("Mul", args);
  var Div = (num, den) => ({ type: "Div", num, den });
  var Pow = (base, exp) => ({ type: "Pow", base, exp });
  var Sqrt = (arg) => ({ type: "Sqrt", arg });
  var Sin = (arg) => ({ type: "Sin", arg });
  var Cos = (arg) => ({ type: "Cos", arg });
  var Tan = (arg) => ({ type: "Tan", arg });
  var Ln = (arg) => ({ type: "Ln", arg });
  var Asin = (arg) => ({ type: "Asin", arg });
  var Acos = (arg) => ({ type: "Acos", arg });
  var Atan = (arg) => ({ type: "Atan", arg });
  var Exp = (arg) => ({ type: "Exp", arg });
  var Neg = (arg) => arg.type === "Num" ? Num(-arg.value) : { type: "Neg", arg };
  var Group = (arg) => ({ type: "Group", arg });
  var Eq = (left, right) => ({ type: "Eq", left, right });
  var FUNC_PRETTY = {
    Sin: "sin",
    Cos: "cos",
    Tan: "tan",
    Ln: "ln",
    Asin: "sin\u207B\xB9",
    Acos: "cos\u207B\xB9",
    Atan: "tan\u207B\xB9",
    Exp: "exp"
  };
  var INVERSE_OF = {
    Sin: "Asin",
    Cos: "Acos",
    Tan: "Atan",
    Ln: "Exp"
  };
  function flattenAssoc(type, args) {
    const out = [];
    for (const a of args) {
      if (a && a.type === type) out.push(...a.args);
      else out.push(a);
    }
    return { type, args: out };
  }
  function flattenSubArgs(args) {
    const out = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (i === 0 && a && a.type === "Sub") out.push(...a.args);
      else out.push(a);
    }
    return out;
  }
  var isNum = (n) => n && n.type === "Num";
  var isVar = (n) => n && n.type === "Var";
  function evalConst(node) {
    switch (node.type) {
      case "Num":
        return { ok: true, value: node.value };
      case "Var":
        if (node.name === "pi" || node.name === "\u03C0") return { ok: true, value: Math.PI };
        if (node.name === "e") return { ok: true, value: Math.E };
        return { ok: false };
      case "Add": {
        const vals = node.args.map(evalConst);
        if (vals.some((v) => !v.ok)) return { ok: false };
        return { ok: true, value: vals.reduce((s, v) => s + v.value, 0) };
      }
      case "Sub": {
        const vals = node.args.map(evalConst);
        if (vals.some((v) => !v.ok)) return { ok: false };
        let acc = vals[0].value;
        for (let i = 1; i < vals.length; i++) acc -= vals[i].value;
        return { ok: true, value: acc };
      }
      case "Mul": {
        const vals = node.args.map(evalConst);
        if (vals.some((v) => !v.ok)) return { ok: false };
        return { ok: true, value: vals.reduce((s, v) => s * v.value, 1) };
      }
      case "Div": {
        const a = evalConst(node.num);
        const b = evalConst(node.den);
        if (!a.ok || !b.ok) return { ok: false };
        if (b.value === 0) return { ok: false };
        return { ok: true, value: a.value / b.value };
      }
      case "Pow": {
        const a = evalConst(node.base);
        const b = evalConst(node.exp);
        if (!a.ok || !b.ok) return { ok: false };
        const val = Math.pow(a.value, b.value);
        if (!Number.isFinite(val)) return { ok: false };
        return { ok: true, value: val };
      }
      case "Sqrt": {
        const a = evalConst(node.arg);
        if (!a.ok || a.value < 0) return { ok: false };
        return { ok: true, value: Math.sqrt(a.value) };
      }
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp": {
        const a = evalConst(node.arg);
        if (!a.ok) return { ok: false };
        const val = evalFunc(node.type, a.value);
        if (!Number.isFinite(val)) return { ok: false };
        return { ok: true, value: val };
      }
      case "Neg": {
        const a = evalConst(node.arg);
        if (!a.ok) return { ok: false };
        return { ok: true, value: -a.value };
      }
      case "Group":
        return evalConst(node.arg);
      default:
        return { ok: false };
    }
  }
  function evalFunc(type, x) {
    switch (type) {
      case "Sin":
        return Math.sin(x);
      case "Cos":
        return Math.cos(x);
      case "Tan":
        return Math.tan(x);
      case "Ln":
        return x > 0 ? Math.log(x) : NaN;
      case "Exp":
        return Math.exp(x);
      case "Asin":
        return x >= -1 && x <= 1 ? Math.asin(x) : NaN;
      case "Acos":
        return x >= -1 && x <= 1 ? Math.acos(x) : NaN;
      case "Atan":
        return Math.atan(x);
      default:
        return NaN;
    }
  }
  function evalWithEnv(node, env = {}) {
    if (!node) return { ok: false, error: "Nodo vuoto" };
    switch (node.type) {
      case "Num":
        return { ok: true, value: node.value };
      case "Var": {
        if (node.name === "pi" || node.name === "\u03C0") return { ok: true, value: Math.PI };
        if (node.name === "e") return { ok: true, value: Math.E };
        if (env[node.name] !== void 0 && env[node.name] !== null && env[node.name] !== "") {
          const val = Number(env[node.name]);
          if (Number.isFinite(val)) return { ok: true, value: val };
        }
        return { ok: false, missing: node.name };
      }
      case "Add": {
        const vals = node.args.map((a) => evalWithEnv(a, env));
        const failed = vals.find((v) => !v.ok);
        if (failed) return failed;
        return { ok: true, value: vals.reduce((s, v) => s + v.value, 0) };
      }
      case "Sub": {
        const vals = node.args.map((a) => evalWithEnv(a, env));
        const failed = vals.find((v) => !v.ok);
        if (failed) return failed;
        let acc = vals[0].value;
        for (let i = 1; i < vals.length; i++) acc -= vals[i].value;
        return { ok: true, value: acc };
      }
      case "Mul": {
        const vals = node.args.map((a) => evalWithEnv(a, env));
        const failed = vals.find((v) => !v.ok);
        if (failed) return failed;
        return { ok: true, value: vals.reduce((s, v) => s * v.value, 1) };
      }
      case "Div": {
        const a = evalWithEnv(node.num, env);
        if (!a.ok) return a;
        const b = evalWithEnv(node.den, env);
        if (!b.ok) return b;
        if (b.value === 0) return { ok: false, error: "Divisione per zero (denominatore nullo)" };
        const val = a.value / b.value;
        if (!Number.isFinite(val)) return { ok: false, error: "Risultato non finito" };
        return { ok: true, value: val };
      }
      case "Pow": {
        const a = evalWithEnv(node.base, env);
        if (!a.ok) return a;
        const b = evalWithEnv(node.exp, env);
        if (!b.ok) return b;
        const val = Math.pow(a.value, b.value);
        if (!Number.isFinite(val) || isNaN(val)) return { ok: false, error: "Potenza non calcolabile nei reali" };
        return { ok: true, value: val };
      }
      case "Sqrt": {
        const a = evalWithEnv(node.arg, env);
        if (!a.ok) return a;
        if (a.value < 0) return { ok: false, error: "Radice quadrata di numero negativo" };
        return { ok: true, value: Math.sqrt(a.value) };
      }
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp": {
        const a = evalWithEnv(node.arg, env);
        if (!a.ok) return a;
        const val = evalFunc(node.type, a.value);
        if (!Number.isFinite(val) || isNaN(val)) return { ok: false, error: `Errore nel calcolo di ${node.type}` };
        return { ok: true, value: val };
      }
      case "Neg": {
        const a = evalWithEnv(node.arg, env);
        if (!a.ok) return a;
        return { ok: true, value: -a.value };
      }
      case "Group":
        return evalWithEnv(node.arg, env);
      default:
        return { ok: false, error: "Nodo non supportato per la valutazione" };
    }
  }
  function substituteVarsInAst(node, env = {}) {
    if (!node) return node;
    switch (node.type) {
      case "Num":
        return node;
      case "Var": {
        if (node.name === "pi" || node.name === "\u03C0" || node.name === "e") return node;
        if (env[node.name] !== void 0 && env[node.name] !== null && env[node.name] !== "") {
          const val = Number(env[node.name]);
          if (Number.isFinite(val)) return { type: "Num", value: val };
        }
        return node;
      }
      case "Add":
        return { type: "Add", args: node.args.map((a) => substituteVarsInAst(a, env)) };
      case "Sub":
        return { type: "Sub", args: node.args.map((a) => substituteVarsInAst(a, env)) };
      case "Mul":
        return { type: "Mul", args: node.args.map((a) => substituteVarsInAst(a, env)) };
      case "Div":
        return { type: "Div", num: substituteVarsInAst(node.num, env), den: substituteVarsInAst(node.den, env) };
      case "Pow":
        return { type: "Pow", base: substituteVarsInAst(node.base, env), exp: substituteVarsInAst(node.exp, env) };
      case "Sqrt":
        return { type: "Sqrt", arg: substituteVarsInAst(node.arg, env) };
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
        return { type: node.type, arg: substituteVarsInAst(node.arg, env) };
      case "Neg":
        return { type: "Neg", arg: substituteVarsInAst(node.arg, env) };
      case "Group":
        return { type: "Group", arg: substituteVarsInAst(node.arg, env) };
      default:
        return node;
    }
  }
  function toText(node) {
    switch (node.type) {
      case "Num":
        return String(node.value);
      case "Var":
        return node.name;
      case "Add":
        return "(" + node.args.map(toText).join(" + ") + ")";
      case "Sub":
        return "(" + node.args.map(toText).join(" - ") + ")";
      case "Mul":
        return "(" + node.args.map(toText).join(" * ") + ")";
      case "Div":
        return "(" + toText(node.num) + " / " + toText(node.den) + ")";
      case "Pow":
        return "(" + toText(node.base) + " ^ " + toText(node.exp) + ")";
      case "Sqrt":
        return "sqrt(" + toText(node.arg) + ")";
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
        return node.type.toLowerCase() + "(" + toText(node.arg) + ")";
      case "Neg":
        return "(-" + toText(node.arg) + ")";
      case "Group":
        return "(" + toText(node.arg) + ")";
      case "Eq":
        return toText(node.left) + " = " + toText(node.right);
      default:
        throw new Error("Nodo sconosciuto: " + node.type);
    }
  }
  function toPretty(node, parentPrec = 0) {
    const wrap = (s, prec, needParen) => needParen ? "(" + s + ")" : s;
    switch (node.type) {
      case "Num":
        return String(node.value);
      case "Var":
        return node.name;
      case "Add":
      case "Sub": {
        if (node.type === "Add" && node.args.length === 2) {
          const first = unwrap(node.args[0]);
          if (first.type === "Var" && first.name === "\xB1") {
            return wrap("\xB1" + toPretty(node.args[1], 2), 1, parentPrec > 1);
          }
        }
        const isSub = node.type === "Sub";
        let s = "";
        node.args.forEach((a, i) => {
          const u = unwrap(a);
          const isNeg = u.type === "Neg" || u.type === "Num" && u.value < 0;
          const bodyNode = u.type === "Neg" ? u.arg : u.type === "Num" && u.value < 0 ? Num(-u.value) : a;
          const body = toPretty(bodyNode, isNeg ? 2 : 1);
          if (i === 0) {
            s += (isNeg ? "\u2212" : "") + body;
          } else {
            const minus = isSub ? !isNeg : isNeg;
            s += (minus ? " \u2212 " : " + ") + body;
          }
        });
        return wrap(s, 1, parentPrec > 1);
      }
      case "Mul": {
        const s = node.args.map((a) => toPretty(a, unwrap(a).type === "Div" ? 3 : 2)).join("\xB7");
        return wrap(s, 2, parentPrec > 2);
      }
      case "Div": {
        const s = toPretty(node.num, 2) + "/" + toPretty(node.den, 3);
        return wrap(s, 2, parentPrec > 2);
      }
      case "Pow": {
        const s = toPretty(node.base, 3) + "^" + toPretty(node.exp, 4);
        return wrap(s, 3, parentPrec > 3);
      }
      case "Sqrt":
        return "\u221A(" + toPretty(node.arg, 0) + ")";
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
        return FUNC_PRETTY[node.type] + "(" + toPretty(node.arg, 0) + ")";
      case "Neg":
        return "\u2212" + toPretty(node.arg, 2);
      case "Group": {
        const s = toPretty(node.arg, 0);
        return "(" + s + ")";
      }
      case "Eq":
        return toPretty(node.left, 0) + " = " + toPretty(node.right, 0);
      default:
        throw new Error("Nodo sconosciuto: " + node.type);
    }
  }
  var LATEX_VAR_MAP = {
    pi: "\\pi",
    rho: "\\rho",
    eta: "\\eta",
    lam: "\\lambda",
    eps: "\\varepsilon",
    mu: "\\mu",
    dT: "\\Delta T",
    v0: "v_0",
    L0: "L_0",
    c1: "c_1",
    c2: "c_2",
    dl: "\\Delta l",
    ip: "i_p",
    theta: "\\theta",
    alpha: "\\alpha",
    beta: "\\beta",
    gamma: "\\gamma",
    delta: "\\delta",
    omega: "\\omega",
    phi: "\\phi",
    sigma: "\\sigma",
    tau: "\\tau",
    nu: "\\nu",
    Delta: "\\Delta",
    Lambda: "\\Lambda",
    Omega: "\\Omega",
    Sigma: "\\Sigma",
    Phi: "\\Phi",
    eps0: "\\varepsilon_0",
    mu0: "\\mu_0"
  };
  function toLatex(node, parentPrec = 0) {
    if (!node) return "";
    const wrap = (s, needParen) => needParen ? `\\left(${s}\\right)` : s;
    switch (node.type) {
      case "Num":
        return String(node.value);
      case "Var": {
        if (LATEX_VAR_MAP[node.name]) return LATEX_VAR_MAP[node.name];
        const knownSubsLatex = {
          Ceq: "C_{\\text{eq}}",
          Req: "R_{\\text{eq}}",
          Ieff: "I_{\\text{eff}}",
          Veff: "V_{\\text{eff}}",
          Vmax: "V_{\\text{max}}",
          Icm: "I_{\\text{cm}}",
          xcm: "x_{\\text{cm}}",
          PhiB: "\\Phi_B",
          PhiE: "\\Phi_E",
          at: "a_t",
          ac: "a_c",
          Ec: "E_c",
          Ep: "E_p",
          Ec1: "E_{c1}",
          Ec2: "E_{c2}",
          Ep1: "E_{p1}",
          Ep2: "E_{p2}",
          v0x: "v_{0x}",
          v0y: "v_{0y}"
        };
        if (knownSubsLatex[node.name]) return knownSubsLatex[node.name];
        if (node.name.startsWith("d") && node.name.length > 1 && !["d", "dt"].includes(node.name)) {
          const rest = node.name.slice(1);
          if (LATEX_VAR_MAP[rest]) return `\\Delta ${LATEX_VAR_MAP[rest]}`;
          if (["T", "l", "U", "V"].includes(rest)) return `\\Delta ${rest}`;
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
        if (node.name.includes("_")) {
          const parts = node.name.split("_");
          const b = LATEX_VAR_MAP[parts[0]] || parts[0];
          return `${b}_{\\text{${parts.slice(1).join("_")}}}`;
        }
        return node.name;
      }
      case "Add":
      case "Sub": {
        if (node.type === "Add" && node.args.length === 2) {
          const first = unwrap(node.args[0]);
          if (first.type === "Var" && first.name === "\xB1") {
            return wrap("\xB1" + toLatex(node.args[1], 2), parentPrec > 1);
          }
        }
        const isSub = node.type === "Sub";
        let s = "";
        node.args.forEach((a, i) => {
          const u = unwrap(a);
          const isNeg = u.type === "Neg" || u.type === "Num" && u.value < 0;
          const bodyNode = u.type === "Neg" ? u.arg : u.type === "Num" && u.value < 0 ? Num(-u.value) : a;
          const body = toLatex(bodyNode, isNeg ? 2 : 1);
          if (i === 0) {
            s += (isNeg ? "-" : "") + body;
          } else {
            const minus = isSub ? !isNeg : isNeg;
            s += (minus ? " - " : " + ") + body;
          }
        });
        return wrap(s, parentPrec > 1);
      }
      case "Mul": {
        const s = node.args.map((a) => toLatex(a, 2)).join(" \\cdot ");
        return wrap(s, parentPrec > 2);
      }
      case "Div": {
        return `\\frac{${toLatex(node.num, 0)}}{${toLatex(node.den, 0)}}`;
      }
      case "Pow": {
        const baseUnwrapped = unwrap(node.base);
        const needBaseParen = ["Add", "Sub", "Mul", "Div", "Neg"].includes(baseUnwrapped.type);
        const baseStr = needBaseParen ? `\\left(${toLatex(node.base, 0)}\\right)` : toLatex(node.base, 3);
        return `${baseStr}^{${toLatex(node.exp, 0)}}`;
      }
      case "Sqrt":
        return `\\sqrt{${toLatex(node.arg, 0)}}`;
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
        return `\\${node.type.toLowerCase()}\\left(${toLatex(node.arg, 0)}\\right)`;
      case "Asin":
        return `\\arcsin\\left(${toLatex(node.arg, 0)}\\right)`;
      case "Acos":
        return `\\arccos\\left(${toLatex(node.arg, 0)}\\right)`;
      case "Atan":
        return `\\arctan\\left(${toLatex(node.arg, 0)}\\right)`;
      case "Exp":
        return `e^{${toLatex(node.arg, 0)}}`;
      case "Neg":
        return `-${toLatex(node.arg, 2)}`;
      case "Group": {
        const u = unwrap(node.arg);
        if (u.type === "Var" || u.type === "Num") return toLatex(u, 0);
        return `\\left(${toLatex(node.arg, 0)}\\right)`;
      }
      case "Eq":
        return `${toLatex(unwrap(node.left), 0)} = ${toLatex(unwrap(node.right), 0)}`;
      default:
        return toPretty(node, parentPrec);
    }
  }
  function unwrap(node) {
    return node && node.type === "Group" ? unwrap(node.arg) : node;
  }
  function unwrapNeutrals(node) {
    let u = unwrap(node);
    if (!u) return u;
    if (u.type === "Mul") {
      const nonOne = u.args.filter((a) => !(unwrap(a).type === "Num" && unwrap(a).value === 1));
      if (nonOne.length === 0) return Num(1);
      if (nonOne.length === 1) return unwrapNeutrals(nonOne[0]);
      if (nonOne.length < u.args.length) return unwrapNeutrals(Mul(...nonOne));
    }
    if (u.type === "Add") {
      const nonZero = u.args.filter((a) => !(unwrap(a).type === "Num" && unwrap(a).value === 0));
      if (nonZero.length === 0) return Num(0);
      if (nonZero.length === 1) return unwrapNeutrals(nonZero[0]);
      if (nonZero.length < u.args.length) return unwrapNeutrals(Add(...nonZero));
    }
    if (u.type === "Sub") {
      if (u.args.length === 2 && unwrap(u.args[1]).type === "Num" && unwrap(u.args[1]).value === 0) {
        return unwrapNeutrals(u.args[0]);
      }
    }
    if (u.type === "Div" && unwrap(u.den).type === "Num" && unwrap(u.den).value === 1) {
      return unwrapNeutrals(u.num);
    }
    return u;
  }
  function stripNeutrals(node) {
    if (!node) return node;
    const raw = node;
    if (raw.type === "Group") {
      return { type: "Group", arg: stripNeutrals(raw.arg) };
    }
    const u = { ...node };
    switch (u.type) {
      case "Mul": {
        const strippedArgs = u.args.map(stripNeutrals);
        const nonOnes = strippedArgs.filter((a) => !(unwrap(a).type === "Num" && unwrap(a).value === 1));
        if (nonOnes.length === 0) return Num(1);
        if (nonOnes.length === 1) return nonOnes[0];
        return { ...u, args: nonOnes };
      }
      case "Add": {
        const strippedArgs = u.args.map(stripNeutrals);
        const nonZeros = strippedArgs.filter((a) => !(unwrap(a).type === "Num" && unwrap(a).value === 0));
        if (nonZeros.length === 0) return Num(0);
        if (nonZeros.length === 1) return nonZeros[0];
        return { ...u, args: nonZeros };
      }
      case "Sub": {
        const strippedArgs = u.args.map(stripNeutrals);
        if (strippedArgs.length === 2 && unwrap(strippedArgs[1]).type === "Num" && unwrap(strippedArgs[1]).value === 0) {
          return strippedArgs[0];
        }
        if (strippedArgs.length === 2 && unwrap(strippedArgs[0]).type === "Num" && unwrap(strippedArgs[0]).value === 0) {
          return { type: "Neg", arg: strippedArgs[1] };
        }
        return { ...u, args: strippedArgs };
      }
      case "Div": {
        const num = stripNeutrals(u.num);
        const den = stripNeutrals(u.den);
        if (unwrap(den).type === "Num" && unwrap(den).value === 1) return num;
        return { ...u, num, den };
      }
      case "Neg":
        return { ...u, arg: stripNeutrals(u.arg) };
      case "Pow":
        return { ...u, base: stripNeutrals(u.base), exp: stripNeutrals(u.exp) };
      case "Eq":
        return { ...u, left: stripNeutrals(u.left), right: stripNeutrals(u.right) };
      default:
        if (u.arg) return { ...u, arg: stripNeutrals(u.arg) };
        return u;
    }
  }
  function structurallyEqual(a, b) {
    a = unwrap(a);
    b = unwrap(b);
    if (a.type !== b.type) return false;
    switch (a.type) {
      case "Num":
        return a.value === b.value;
      case "Var":
        return a.name === b.name;
      case "Add":
      case "Sub":
      case "Mul":
        if (a.args.length !== b.args.length) return false;
        return a.args.every((x, i) => structurallyEqual(x, b.args[i]));
      case "Div":
        return structurallyEqual(a.num, b.num) && structurallyEqual(a.den, b.den);
      case "Pow":
        return structurallyEqual(a.base, b.base) && structurallyEqual(a.exp, b.exp);
      case "Sqrt":
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
        return structurallyEqual(a.arg, b.arg);
      case "Neg":
        return structurallyEqual(a.arg, b.arg);
      case "Eq":
        return structurallyEqual(a.left, b.left) && structurallyEqual(a.right, b.right);
      default:
        return false;
    }
  }
  function canonical(node) {
    return canon(unwrap(node));
  }
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function ratNorm(r) {
    let { n, d } = r;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function asRational(node) {
    node = unwrap(node);
    switch (node.type) {
      case "Num":
        return Number.isInteger(node.value) ? { n: node.value, d: 1 } : null;
      case "Neg": {
        const r = asRational(node.arg);
        return r ? { n: -r.n, d: r.d } : null;
      }
      case "Div": {
        const a = asRational(node.num);
        const b = asRational(node.den);
        if (!a || !b || b.n === 0) return null;
        return ratNorm({ n: a.n * b.d, d: a.d * b.n });
      }
      default:
        return null;
    }
  }
  function ratAdd(a, b) {
    return ratNorm({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
  }
  function ratMul(a, b) {
    return ratNorm({ n: a.n * b.n, d: a.d * b.d });
  }
  function ratDiv(a, b) {
    if (b.n === 0) return a;
    return ratNorm({ n: a.n * b.d, d: a.d * b.n });
  }
  function ratToNode(r) {
    if (!r || r.n === 0) return null;
    if (r.d === 1) return Num(r.n);
    return Div(Num(r.n), Num(r.d));
  }
  function canon(node) {
    node = unwrap(node);
    switch (node.type) {
      case "Num":
        return Num(node.value);
      case "Var":
        return Var(node.name);
      case "Add": {
        const parts = node.args.map(canon);
        const flat = [];
        for (const p of parts) {
          if (p.type === "Add") flat.push(...p.args);
          else flat.push(p);
        }
        let acc = { n: 0, d: 1 };
        const rest = [];
        for (const p of flat) {
          const r = asRational(p);
          if (r) acc = ratAdd(acc, r);
          else rest.push(p);
        }
        const constNode = ratToNode(acc);
        if (constNode) rest.push(constNode);
        if (rest.length === 0) return Num(0);
        if (rest.length === 1) return rest[0];
        rest.sort(compareNodes);
        return flattenAssoc("Add", rest);
      }
      case "Sub": {
        const parts = node.args.map(canon);
        const terms = [parts[0]];
        for (let i = 1; i < parts.length; i++) terms.push(Neg(parts[i]));
        return canon(Add(...terms));
      }
      case "Mul": {
        const parts = node.args.map((a) => {
          const c = canon(a);
          return c.type === "Neg" ? Mul(Num(-1), c.arg) : c;
        });
        const flat = [];
        for (const p of parts) {
          if (p.type === "Mul") flat.push(...p.args);
          else flat.push(p);
        }
        let acc = { n: 1, d: 1 };
        const numFactors = [];
        const denFactors = [];
        for (const p of flat) {
          const r = asRational(p);
          if (r) {
            acc = ratMul(acc, r);
            continue;
          }
          if (p.type === "Div") {
            const rn = asRational(p.num);
            if (rn) acc = ratMul(acc, rn);
            else numFactors.push(p.num);
            const rd = asRational(p.den);
            if (rd) acc = ratDiv(acc, rd);
            else denFactors.push(p.den);
            continue;
          }
          numFactors.push(p);
        }
        if (acc.n === 0) return Num(0);
        numFactors.sort(compareNodes);
        denFactors.sort(compareNodes);
        const negative = acc.n < 0;
        const abs = { n: Math.abs(acc.n), d: acc.d };
        const out = [];
        if (!(abs.n === 1 && abs.d === 1)) out.push(ratToNode(abs));
        out.push(...numFactors);
        if (out.length === 0 && denFactors.length === 0) return Num(1);
        const numPart = out.length === 0 ? Num(1) : out.length === 1 ? out[0] : flattenAssoc("Mul", out);
        const product = denFactors.length === 0 ? numPart : Div(numPart, denFactors.length === 1 ? denFactors[0] : flattenAssoc("Mul", denFactors));
        return negative ? Neg(product) : product;
      }
      case "Div": {
        let num = canon(node.num);
        let den = canon(node.den);
        while (num.type === "Div") {
          den = canon(Mul(den, num.den));
          num = num.num;
        }
        if (den.type === "Div") {
          num = canon(Mul(num, den.den));
          den = den.num;
        }
        let sign = 1;
        if (num.type === "Neg") {
          sign = -sign;
          num = num.arg;
        }
        if (den.type === "Neg") {
          sign = -sign;
          den = den.arg;
        }
        if (isNum(den) && den.value === 1) {
          return sign < 0 ? canon(Neg(num)) : num;
        }
        const frac = Div(num, den);
        return sign < 0 ? Neg(frac) : frac;
      }
      case "Pow": {
        const base = canon(node.base);
        const exp = canon(node.exp);
        if (isNum(exp) && exp.value === 1) return base;
        if (base.type === "Sqrt" && isNum(exp) && exp.value === 2) return canon(base.arg);
        if (isNum(base) && isNum(exp)) {
          return Num(Math.pow(base.value, exp.value));
        }
        return { type: "Pow", base, exp };
      }
      case "Sqrt": {
        const arg = canon(node.arg);
        if (arg.type === "Pow" && isNum(arg.exp) && arg.exp.value === 2) {
          return canon(arg.base);
        }
        return { type: "Sqrt", arg };
      }
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp": {
        const arg = canon(node.arg);
        if (arg.type === INVERSE_OF[node.type]) return arg;
        return { type: node.type, arg };
      }
      case "Neg": {
        const arg = canon(node.arg);
        if (isNum(arg)) return Num(-arg.value);
        if (arg.type === "Neg") return arg.arg;
        return canon(Mul(Num(-1), arg));
      }
      case "Eq":
        return Eq(canon(node.left), canon(node.right));
      default:
        throw new Error("Nodo sconosciuto in canonical: " + node.type);
    }
  }
  function sortCategory(node) {
    const u = unwrap(node);
    if (u.type === "Num" && u.value < 0) return 9;
    switch (u.type) {
      case "Num":
        return 0;
      case "Var":
        return 1;
      case "Pow":
        return 2;
      case "Sqrt":
        return 3;
      case "Div":
        return 4;
      case "Mul":
        return 5;
      case "Add":
      case "Sub":
        return 6;
      case "Neg":
        return 9;
      default:
        return 7;
    }
  }
  function compareNodes(a, b) {
    const ca = sortCategory(a);
    const cb = sortCategory(b);
    if (ca !== cb) return ca - cb;
    const ta = toText(a);
    const tb = toText(b);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  }
  function equivalentExpr(a, b) {
    return structurallyEqual(canonical(a), canonical(b));
  }
  function equivalentEq(eqA, eqB) {
    const sameOrder = equivalentExpr(eqA.left, eqB.left) && equivalentExpr(eqA.right, eqB.right);
    const swapped = equivalentExpr(eqA.left, eqB.right) && equivalentExpr(eqA.right, eqB.left);
    return sameOrder || swapped;
  }
  function collectVars(node, out = /* @__PURE__ */ new Set()) {
    switch (node.type) {
      case "Num":
        break;
      case "Var":
        out.add(node.name);
        break;
      case "Add":
      case "Sub":
      case "Mul":
        node.args.forEach((a) => collectVars(a, out));
        break;
      case "Div":
        collectVars(node.num, out);
        collectVars(node.den, out);
        break;
      case "Pow":
        collectVars(node.base, out);
        collectVars(node.exp, out);
        break;
      case "Sqrt":
      case "Neg":
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
      case "Group":
        collectVars(node.arg, out);
        break;
      case "Eq":
        collectVars(node.left, out);
        collectVars(node.right, out);
        break;
    }
    return out;
  }
  function clone(node) {
    return JSON.parse(JSON.stringify(node));
  }
  function isIdenticallyZero(node) {
    if (!node) return false;
    const e = evalConst(canonical(node));
    return e.ok && e.value === 0;
  }

  // js/parser.js
  var FUNCTIONS = {
    sin: Sin,
    cos: Cos,
    tan: Tan,
    ln: Ln,
    asin: Asin,
    acos: Acos,
    atan: Atan,
    exp: Exp
  };
  var UNSUPPORTED_FUNCTIONS = [
    "cot",
    "sec",
    "csc",
    "log",
    "log10",
    "abs",
    "floor",
    "ceil",
    "round",
    "min",
    "max",
    "sum",
    "sign"
  ];
  function tokenize(input) {
    const tokens = [];
    let i = 0;
    const isDigit = (c) => c >= "0" && c <= "9";
    const isLetter = (c) => /[A-Za-z]/.test(c);
    const isGreek = (c) => "\u03C0\u03C1\u0394\u03B8\u03BB\u03BC\u03A9".includes(c);
    while (i < input.length) {
      const c = input[i];
      if (c === " " || c === "	" || c === "\n") {
        i++;
        continue;
      }
      if (isDigit(c) || c === "." && isDigit(input[i + 1])) {
        let j = i;
        while (j < input.length && (isDigit(input[j]) || input[j] === ".")) j++;
        tokens.push({ t: "num", v: parseFloat(input.slice(i, j)) });
        i = j;
        continue;
      }
      if (isLetter(c) || isGreek(c) || c === "_") {
        let j = i;
        while (j < input.length && (isLetter(input[j]) || isGreek(input[j]) || isDigit(input[j]) || input[j] === "_")) j++;
        tokens.push({ t: "ident", v: input.slice(i, j) });
        i = j;
        continue;
      }
      if ("+-*/^()=".includes(c)) {
        tokens.push({ t: c, v: c });
        i++;
        continue;
      }
      if (c === "\u221A") {
        tokens.push({ t: "ident", v: "sqrt" });
        i++;
        continue;
      }
      if (c === "\u2212") {
        tokens.push({ t: "-", v: "-" });
        i++;
        continue;
      }
      if (c === "\xB7" || c === "\xD7") {
        tokens.push({ t: "*", v: "*" });
        i++;
        continue;
      }
      if (c === "\xF7") {
        tokens.push({ t: "/", v: "/" });
        i++;
        continue;
      }
      throw new ParseError(`Carattere non riconosciuto: "${c}"`);
    }
    return tokens;
  }
  var ParseError = class extends Error {
  };
  var Parser = class {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
    }
    peek() {
      return this.tokens[this.pos];
    }
    next() {
      return this.tokens[this.pos++];
    }
    expect(type) {
      const tok = this.peek();
      if (!tok || tok.t !== type) {
        throw new ParseError(`Atteso "${type}" ma trovato ${tok ? `"${tok.v}"` : "fine formula"}`);
      }
      return this.next();
    }
    atEnd() {
      return this.pos >= this.tokens.length;
    }
    // equation := expr '=' expr   (esattamente un '=')
    parseEquation() {
      const left = this.parseExpr();
      this.expect("=");
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
      while (this.peek() && (this.peek().t === "+" || this.peek().t === "-")) {
        const op = this.next().t;
        const rhs = this.parseTerm();
        node = op === "+" ? Add(node, rhs) : Sub(node, rhs);
      }
      return node;
    }
    // term := factor (('*'|'/') factor | implicitMul)*
    parseTerm() {
      let node = this.parseFactor();
      for (; ; ) {
        const tok = this.peek();
        if (!tok) break;
        if (tok.t === "*" || tok.t === "/") {
          this.next();
          const rhs = this.parseFactor();
          node = tok.t === "*" ? Mul(node, rhs) : Div(node, rhs);
        } else if (this.startsImplicitFactor(tok)) {
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
      if (tok.t === "num" || tok.t === "(") return true;
      if (tok.t === "ident") {
        return true;
      }
      return false;
    }
    // factor := base ('^' unary)?   (la potenza è associativa a destra)
    parseFactor() {
      const base = this.parseUnary();
      if (this.peek() && this.peek().t === "^") {
        this.next();
        const exp = this.parseFactor();
        return Pow(base, exp);
      }
      return base;
    }
    // unary := ('-'|'+') unary | base
    parseUnary() {
      const tok = this.peek();
      if (tok && tok.t === "-") {
        this.next();
        return Neg(this.parseUnary());
      }
      if (tok && tok.t === "+") {
        this.next();
        return this.parseUnary();
      }
      return this.parseBase();
    }
    // base := NUMBER | IDENT '(' args ')' | IDENT | '(' expr ')'
    parseBase() {
      const tok = this.peek();
      if (!tok) throw new ParseError("Formula incompleta: atteso un elemento.");
      if (tok.t === "num") {
        this.next();
        return Num(tok.v);
      }
      if (tok.t === "(") {
        this.next();
        const inner = this.parseExpr();
        this.expect(")");
        return Group(inner);
      }
      if (tok.t === "ident") {
        this.next();
        const name = tok.v;
        const lower = name.toLowerCase();
        if (lower === "sqrt") {
          this.expect("(");
          const inner = this.parseExpr();
          this.expect(")");
          return Sqrt(inner);
        }
        if (FUNCTIONS[lower]) {
          this.expect("(");
          const inner = this.parseExpr();
          this.expect(")");
          return FUNCTIONS[lower](inner);
        }
        if (UNSUPPORTED_FUNCTIONS.includes(lower)) {
          throw new ParseError(
            `La funzione "${name}" non \xE8 supportata. Sono ammesse: sqrt, sin, cos, tan, ln, asin, acos, atan, exp, oltre a + - * / ^ e parentesi.`
          );
        }
        if (name === "\u03C0") return Var("\u03C0");
        return Var(name);
      }
      throw new ParseError(`Elemento inatteso: "${tok.v}"`);
    }
  };
  function parseEquation(input) {
    if (typeof input !== "string" || input.trim() === "") {
      throw new ParseError("La formula \xE8 vuota.");
    }
    const countEq = (input.match(/=/g) || []).length;
    if (countEq === 0) {
      throw new ParseError('Manca il segno "=". Una formula deve avere la forma "a = b".');
    }
    if (countEq > 1) {
      throw new ParseError('Ci sono pi\xF9 segni "=": inserisci una sola uguaglianza.');
    }
    const tokens = tokenize(input);
    const parser = new Parser(tokens);
    const eq2 = parser.parseEquation();
    assertNoZeroDenominator(eq2);
    return eq2;
  }
  function parseExpression(input) {
    if (typeof input !== "string" || input.trim() === "") {
      throw new ParseError("L'espressione \xE8 vuota.");
    }
    const tokens = tokenize(input);
    const parser = new Parser(tokens);
    const expr2 = parser.parseExpr();
    if (!parser.atEnd()) {
      throw new ParseError(`Elemento inatteso: "${parser.peek().v}"`);
    }
    return expr2;
  }
  function assertNoZeroDenominator(node) {
    switch (node.type) {
      case "Div": {
        const denUnwrapped = unwrap(node.den);
        if (denUnwrapped.type === "Num" && denUnwrapped.value === 0 || isIdenticallyZero(node.den)) {
          throw new ParseError("La formula contiene una divisione per zero (denominatore = 0).");
        }
        assertNoZeroDenominator(node.num);
        assertNoZeroDenominator(node.den);
        break;
      }
      case "Add":
      case "Sub":
      case "Mul":
        node.args.forEach(assertNoZeroDenominator);
        break;
      case "Pow":
        assertNoZeroDenominator(node.base);
        assertNoZeroDenominator(node.exp);
        break;
      case "Sqrt":
      case "Neg":
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
      case "Group":
        assertNoZeroDenominator(node.arg);
        break;
      case "Eq":
        assertNoZeroDenominator(node.left);
        assertNoZeroDenominator(node.right);
        break;
    }
  }

  // js/reciprocals.js
  var isOne = (node) => {
    const u = unwrap(node);
    return u.type === "Num" && u.value === 1;
  };
  function treeHasFraction(node) {
    if (!node) return false;
    const u = unwrap(node);
    switch (u.type) {
      case "Div":
        return true;
      case "Eq":
        return treeHasFraction(u.left) || treeHasFraction(u.right);
      case "Add":
      case "Sub":
      case "Mul":
        return u.args.some(treeHasFraction);
      case "Neg":
      case "Group":
        return treeHasFraction(u.arg);
      case "Pow":
        return treeHasFraction(u.base) || treeHasFraction(u.exp);
      default:
        return false;
    }
  }
  function memberIsFractionSum(node) {
    const u = unwrap(node);
    return (u.type === "Add" || u.type === "Sub") && treeHasFraction(u);
  }
  function memberAsFraction(node) {
    const u = unwrap(node);
    if (u.type === "Div") {
      return { num: clone(u.num), den: clone(u.den) };
    }
    if (u.type === "Mul") {
      const nums = [];
      const dens = [];
      for (const arg of u.args) {
        const part = memberAsFraction(arg);
        if (!isOne(part.num)) nums.push(part.num);
        if (!isOne(part.den)) dens.push(part.den);
      }
      return {
        num: nums.length === 0 ? Num(1) : nums.length === 1 ? nums[0] : Mul(...nums),
        den: dens.length === 0 ? Num(1) : dens.length === 1 ? dens[0] : Mul(...dens)
      };
    }
    return { num: clone(u), den: Num(1) };
  }
  function reciprocalOfMember(node) {
    const { num, den } = memberAsFraction(node);
    return canonical(Div(den, num));
  }
  function reciprocalEquation(eq2) {
    if (!eq2 || eq2.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione valida da invertire." };
    }
    if (isIdenticallyZero(eq2.left) || isIdenticallyZero(eq2.right)) {
      return {
        ok: false,
        error: "Non si pu\xF2 calcolare il reciproco di un membro identicamente nullo: la divisione per zero non \xE8 definita.",
        hint: "Assicurati che entrambi i membri siano diversi da zero prima di applicare la regola dei reciproci."
      };
    }
    if (memberIsFractionSum(eq2.left) || memberIsFractionSum(eq2.right)) {
      return {
        ok: false,
        error: "il reciproco di una somma di frazioni NON \xE8 la somma dei reciproci: 1/(A/B + C/D) \u2260 B/A + D/C.",
        hint: `Usa il tasto "\u{1F9EE} Denominatore comune (m.c.m.)" per sommare le frazioni in un'unica frazione: solo allora potrai invertire i due membri.`
      };
    }
    return {
      ok: true,
      newEq: Eq(reciprocalOfMember(eq2.left), reciprocalOfMember(eq2.right))
    };
  }

  // js/common-denom.js
  function gcd2(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd2(a, b);
  }
  var isOne2 = (node) => {
    const u = unwrap(node);
    return u.type === "Num" && u.value === 1;
  };
  function termAsFraction(node) {
    let sign = 1;
    let curr = unwrap(node);
    while (curr.type === "Neg") {
      sign = -sign;
      curr = unwrap(curr.arg);
    }
    if (curr.type === "Num" && curr.value < 0) {
      sign = -sign;
      curr = Num(-curr.value);
    }
    const frac = memberAsFraction(curr);
    return {
      sign,
      num: frac.num,
      den: frac.den,
      hasDen: !isOne2(frac.den)
    };
  }
  function decomposeDenominator(node) {
    let curr = unwrap(node);
    while (curr.type === "Group") curr = unwrap(curr.arg);
    let coeff = 1;
    const factors = /* @__PURE__ */ new Map();
    function addFactor(factorNode, power = 1) {
      const u = unwrap(factorNode);
      if (u.type === "Num") {
        if (Number.isInteger(u.value) && u.value > 0) {
          coeff *= u.value;
        }
        return;
      }
      if (u.type === "Pow" && u.exp.type === "Num" && Number.isInteger(u.exp.value) && u.exp.value > 0) {
        addFactor(u.base, power * u.exp.value);
        return;
      }
      const key = toPretty(u, 0);
      const existing = factors.get(key);
      if (existing) {
        existing.power += power;
      } else {
        factors.set(key, { node: clone(u), power });
      }
    }
    if (curr.type === "Num") {
      if (Number.isInteger(curr.value) && curr.value > 0) coeff = curr.value;
    } else if (curr.type === "Mul") {
      for (const arg of curr.args) {
        addFactor(arg);
      }
    } else {
      addFactor(curr);
    }
    return { coeff, factors };
  }
  function computeLcmDenominator(decomposedList) {
    let totalCoeff = 1;
    const maxPowers = /* @__PURE__ */ new Map();
    for (const dec of decomposedList) {
      totalCoeff = lcm(totalCoeff, dec.coeff);
      for (const [key, item] of dec.factors.entries()) {
        const existing = maxPowers.get(key);
        if (!existing || existing.power < item.power) {
          maxPowers.set(key, { node: clone(item.node), power: item.power });
        }
      }
    }
    const factors = [];
    if (totalCoeff > 1) {
      factors.push(Num(totalCoeff));
    }
    for (const item of maxPowers.values()) {
      if (item.power === 1) {
        factors.push(item.node);
      } else {
        factors.push(Pow(item.node, Num(item.power)));
      }
    }
    const lcmNode = factors.length === 0 ? Num(1) : factors.length === 1 ? factors[0] : Mul(...factors);
    return { totalCoeff, maxPowers, lcmNode };
  }
  function computeQuotient(totalCoeff, maxPowers, dec) {
    const mult = [];
    const numQuotient = totalCoeff / dec.coeff;
    if (numQuotient > 1) {
      mult.push(Num(numQuotient));
    }
    for (const [key, item] of maxPowers.entries()) {
      const present = dec.factors.get(key);
      const presentPower = present ? present.power : 0;
      const diff = item.power - presentPower;
      if (diff > 0) {
        if (diff === 1) {
          mult.push(clone(item.node));
        } else {
          mult.push(Pow(clone(item.node), Num(diff)));
        }
      }
    }
    if (mult.length === 0) return Num(1);
    if (mult.length === 1) return mult[0];
    return Mul(...mult);
  }
  function multiplyNumerator(num, quotient) {
    if (isOne2(quotient)) return clone(num);
    if (isOne2(num)) return clone(quotient);
    const uNum = unwrap(num);
    const uQ = unwrap(quotient);
    if (uNum.type === "Mul" && uQ.type === "Mul") {
      return Mul(...uNum.args, ...uQ.args);
    }
    if (uNum.type === "Mul") {
      return Mul(...uNum.args, quotient);
    }
    if (uQ.type === "Mul") {
      return Mul(num, ...uQ.args);
    }
    return Mul(num, quotient);
  }
  function getAdditiveTerms(node) {
    const u = unwrap(node);
    if (u.type === "Add") {
      const res = [];
      for (const a of u.args) {
        res.push(...getAdditiveTerms(a));
      }
      return res;
    }
    if (u.type === "Sub") {
      const res = [];
      const firstTerms = getAdditiveTerms(u.args[0]);
      res.push(...firstTerms);
      for (let i = 1; i < u.args.length; i++) {
        const subTerms = getAdditiveTerms(u.args[i]);
        for (const t of subTerms) {
          res.push({ sign: -t.sign, node: t.node });
        }
      }
      return res;
    }
    if (u.type === "Neg") {
      const inner = getAdditiveTerms(u.arg);
      return inner.map((t) => ({ sign: -t.sign, node: t.node }));
    }
    return [{ sign: 1, node: u }];
  }
  function reduceAdditiveTermsToCommonDenominator(node) {
    const rawTerms = getAdditiveTerms(node);
    if (rawTerms.length === 0) return node;
    const terms = rawTerms.map((t) => {
      const reducedNode = reduceToSingleFraction(t.node);
      const frac = termAsFraction(reducedNode);
      return {
        sign: t.sign * frac.sign,
        num: frac.num,
        den: frac.den,
        hasDen: frac.hasDen
      };
    });
    const anyFraction = terms.some((t) => t.hasDen);
    if (!anyFraction) {
      if (terms.length === 1) {
        const single = terms[0];
        return single.sign < 0 ? canonical(Neg(single.num)) : canonical(single.num);
      }
      const pos = terms.filter((t) => t.sign > 0).map((t) => t.num);
      const neg = terms.filter((t) => t.sign < 0).map((t) => t.num);
      if (neg.length === 0) return canonical(Add(...pos));
      if (pos.length === 0) return canonical(Neg(neg.length === 1 ? neg[0] : Add(...neg)));
      const pNode = pos.length === 1 ? pos[0] : Add(...pos);
      const nNode = neg.length === 1 ? neg[0] : Add(...neg);
      return canonical(Sub(pNode, nNode));
    }
    const decList = terms.map((t) => decomposeDenominator(t.den));
    const { totalCoeff, maxPowers, lcmNode } = computeLcmDenominator(decList);
    const posTerms = [];
    const negTerms = [];
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      const dec = decList[i];
      const q = computeQuotient(totalCoeff, maxPowers, dec);
      const newNum = canonical(multiplyNumerator(t.num, q));
      if (t.sign > 0) {
        posTerms.push(newNum);
      } else {
        negTerms.push(newNum);
      }
    }
    let totalNumNode;
    if (negTerms.length === 0) {
      totalNumNode = posTerms.length === 1 ? posTerms[0] : Add(...posTerms);
    } else if (posTerms.length === 0) {
      const negInner = negTerms.length === 1 ? negTerms[0] : Add(...negTerms);
      totalNumNode = Neg(negInner);
    } else {
      const pNode = posTerms.length === 1 ? posTerms[0] : Add(...posTerms);
      const nNode = negTerms.length === 1 ? negTerms[0] : Add(...negTerms);
      totalNumNode = Sub(pNode, nNode);
    }
    const resFrac = Div(totalNumNode, lcmNode);
    return canonical(resFrac);
  }
  function reduceToSingleFraction(node) {
    if (!node) return node;
    const u = unwrap(node);
    if (u.type === "Add" || u.type === "Sub") {
      return reduceAdditiveTermsToCommonDenominator(u);
    }
    if (u.type === "Neg") {
      const red = reduceToSingleFraction(u.arg);
      return canonical(Neg(red));
    }
    if (u.type === "Group") {
      const red = reduceToSingleFraction(u.arg);
      return Group(red);
    }
    if (u.type === "Div") {
      const numRed = reduceToSingleFraction(u.num);
      const denRed = reduceToSingleFraction(u.den);
      const fNum = termAsFraction(numRed);
      const fDen = termAsFraction(denRed);
      const totalSign = fNum.sign * fDen.sign;
      const finalNum = canonical(multiplyNumerator(fNum.num, fDen.den));
      const finalDen = canonical(multiplyNumerator(fNum.den, fDen.num));
      if (isOne2(finalDen)) {
        return totalSign < 0 ? canonical(Neg(finalNum)) : finalNum;
      }
      const frac = Div(finalNum, finalDen);
      return totalSign < 0 ? canonical(Neg(frac)) : canonical(frac);
    }
    if (u.type === "Mul") {
      const redArgs = u.args.map(reduceToSingleFraction);
      const nums = [];
      const dens = [];
      let sign = 1;
      for (const a of redArgs) {
        const f = termAsFraction(a);
        sign *= f.sign;
        if (!isOne2(f.num)) nums.push(f.num);
        if (!isOne2(f.den)) dens.push(f.den);
      }
      const numNode = nums.length === 0 ? Num(1) : nums.length === 1 ? nums[0] : Mul(...nums);
      const denNode = dens.length === 0 ? Num(1) : dens.length === 1 ? dens[0] : Mul(...dens);
      if (isOne2(denNode)) {
        return sign < 0 ? canonical(Neg(numNode)) : canonical(numNode);
      }
      const frac = Div(numNode, denNode);
      return sign < 0 ? canonical(Neg(frac)) : canonical(frac);
    }
    if (u.type === "Pow") {
      return canonical(Pow(reduceToSingleFraction(u.base), reduceToSingleFraction(u.exp)));
    }
    if (u.type === "Sqrt") {
      return canonical(Sqrt(reduceToSingleFraction(u.arg)));
    }
    return node;
  }
  function canReduceToSingleFraction(node) {
    if (!node) return false;
    const u = unwrap(node);
    if (u.type === "Add" || u.type === "Sub") {
      const terms = getAdditiveTerms(u);
      if (terms.some((t) => termAsFraction(t.node).hasDen)) return true;
      return terms.some((t) => canReduceToSingleFraction(t.node));
    }
    if (u.type === "Div") {
      const fNum = termAsFraction(u.num);
      const fDen = termAsFraction(u.den);
      if (fNum.hasDen || fDen.hasDen) return true;
      if (canReduceToSingleFraction(u.num) || canReduceToSingleFraction(u.den)) return true;
    }
    if (u.type === "Mul") {
      return u.args.some(canReduceToSingleFraction);
    }
    if (u.type === "Neg" || u.type === "Group" || u.type === "Sqrt") {
      return canReduceToSingleFraction(u.arg);
    }
    if (u.type === "Pow") {
      return canReduceToSingleFraction(u.base) || canReduceToSingleFraction(u.exp);
    }
    return false;
  }
  function reduceEquationToCommonDenominator(eq2, chosenSide = null) {
    if (!eq2 || eq2.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione valida fornita." };
    }
    const leftCan = canReduceToSingleFraction(eq2.left);
    const rightCan = canReduceToSingleFraction(eq2.right);
    if (!leftCan && !rightCan) {
      return {
        ok: false,
        error: "Non ci sono somme di frazioni o frazioni composte da ridurre a denominatore comune.",
        hint: "La formula \xE8 gi\xE0 espressa in frazioni semplici o termini interi."
      };
    }
    let newLeft = eq2.left;
    let newRight = eq2.right;
    const steps = [];
    if (chosenSide === "left" && leftCan) {
      newLeft = reduceToSingleFraction(eq2.left);
      steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq2.left, 0)} \u2192 ${toPretty(newLeft, 0)}.`);
    } else if (chosenSide === "right" && rightCan) {
      newRight = reduceToSingleFraction(eq2.right);
      steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq2.right, 0)} \u2192 ${toPretty(newRight, 0)}.`);
    } else {
      if (leftCan) {
        newLeft = reduceToSingleFraction(eq2.left);
        steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq2.left, 0)} \u2192 ${toPretty(newLeft, 0)}.`);
      }
      if (rightCan) {
        newRight = reduceToSingleFraction(eq2.right);
        steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq2.right, 0)} \u2192 ${toPretty(newRight, 0)}.`);
      }
    }
    const newEq = Eq(newLeft, newRight);
    return {
      ok: true,
      newEq,
      steps
    };
  }

  // js/rules.js
  var RuleError = class extends Error {
    constructor(message, hint) {
      super(message);
      this.name = "RuleError";
      this.hint = hint || null;
    }
  };
  function bothSides(eq2, fn) {
    return Eq(fn(eq2.left), fn(eq2.right));
  }
  function simplify(node) {
    return canonical(node);
  }
  function factorsOf(node) {
    node = unwrap(node);
    if (node.type === "Mul") return node.args;
    return [node];
  }
  function productOf(list) {
    if (list.length === 0) return Num(1);
    if (list.length === 1) return list[0];
    return Mul(...list);
  }
  function asFraction(node) {
    node = unwrap(node);
    if (node.type === "Div") return { num: node.num, den: node.den };
    return null;
  }
  var ruleAddBothSides = {
    id: "add-both",
    name: "Aggiunta della stessa quantit\xE0 a entrambi i membri (primo principio di equivalenza)",
    principle: "Se A = B allora A + C = B + C.",
    explanation: "add-both",
    canAdd: (expr2) => true,
    apply(eq2, ctx) {
      const c = ctx.value;
      const newEq = bothSides(eq2, (side) => simplify(Add(side, c)));
      return { equation: newEq, conditions: [], steps: [`Aggiungo ${ctx.valueText} a entrambi i membri.`] };
    }
  };
  var ruleSubBothSides = {
    id: "sub-both",
    name: "Sottrazione della stessa quantit\xE0 da entrambi i membri (primo principio di equivalenza)",
    principle: "Se A = B allora A \u2212 C = B \u2212 C.",
    explanation: "sub-both",
    apply(eq2, ctx) {
      const c = ctx.value;
      const newEq = bothSides(eq2, (side) => simplify(Sub(side, c)));
      return { equation: newEq, conditions: [], steps: [`Sottraggo ${ctx.valueText} da entrambi i membri.`] };
    }
  };
  var ruleMulBothSides = {
    id: "mul-both",
    name: "Moltiplicazione di entrambi i membri per la stessa quantit\xE0 (secondo principio di equivalenza)",
    principle: "Se A = B allora A\xB7C = B\xB7C.",
    explanation: "mul-both",
    apply(eq2, ctx) {
      const c = ctx.value;
      if (unwrap(c).type === "Num" && unwrap(c).value === 0) {
        throw new RuleError(
          "Moltiplicare entrambi i membri per 0 \xE8 lecito ma distrugge l'informazione (0 = 0): non \xE8 una trasformazione utile.",
          "Scegli una quantit\xE0 non nulla."
        );
      }
      const newEq = bothSides(eq2, (side) => simplify(Mul(side, c)));
      return { equation: newEq, conditions: [], steps: [`Moltiplico entrambi i membri per ${ctx.valueText}.`] };
    }
  };
  var ruleDivBothSides = {
    id: "div-both",
    name: "Divisione di entrambi i membri per la stessa quantit\xE0 non nulla (secondo principio di equivalenza)",
    principle: "Se A = B e C \u2260 0 allora A/C = B/C.",
    explanation: "div-both",
    precondition(eq2, ctx) {
      const c = ctx.value;
      if (isIdenticallyZero(c)) {
        throw new RuleError(
          "Non si pu\xF2 dividere per una quantit\xE0 identicamente nulla: la divisione per zero non \xE8 definita.",
          "Specifica una quantit\xE0 sicuramente diversa da zero."
        );
      }
      const cond = conditionText(c, "\u2260 0");
      return { conditions: [cond] };
    },
    apply(eq2, ctx) {
      const c = ctx.value;
      const newEq = bothSides(eq2, (side) => simplify(Div(side, c)));
      return {
        equation: newEq,
        conditions: [conditionText(c, "\u2260 0")],
        steps: [`Divido entrambi i membri per ${ctx.valueText} (con ${ctx.valueText} \u2260 0).`]
      };
    }
  };
  var ruleMoveAdditiveTerm = {
    id: "move-term",
    name: "Trasporto di un termine additivo con cambiamento di segno",
    principle: "Somma membro a membro lo stesso additivo opposto (primo principio di equivalenza).",
    explanation: "move-term",
    apply(eq2, ctx) {
      const { term, side } = ctx;
      const from = side === "left" ? eq2.left : eq2.right;
      const to = side === "left" ? eq2.right : eq2.left;
      const fromTerms = additiveTerms(from);
      const idx = fromTerms.findIndex((t) => equivalentExpr(t.node, unwrap(term)));
      if (idx < 0) {
        throw new RuleError("Il termine selezionato non \xE8 un additivo di quel membro.");
      }
      const matched = fromTerms[idx];
      const remaining = fromTerms.filter((_, i) => i !== idx);
      const leftOver = remaining.length === 0 ? Num(0) : rebuildSum(remaining);
      const movedTerm = matched.sign === "-" ? term : Neg(term);
      const newFrom = simplify(leftOver);
      const newTo = simplify(Add(to, movedTerm));
      const newEq = side === "left" ? Eq(newFrom, newTo) : Eq(newTo, newFrom);
      return {
        equation: newEq,
        conditions: [],
        steps: [
          `Porto il termine ${ctx.termText} dall'altro membro applicando il primo principio: il termine vi compare con il segno cambiato.`
        ]
      };
    }
  };
  var ruleMoveFactor = {
    id: "move-factor",
    name: "Trasporto di un fattore (divisione di entrambi i membri per il fattore)",
    principle: "Se A = B allora A/C = B/C, purch\xE9 C \u2260 0.",
    explanation: "move-factor",
    apply(eq2, ctx) {
      const { factor, side } = ctx;
      const from = side === "left" ? eq2.left : eq2.right;
      const fact = unwrap(factor);
      const factList = factorsOf(from);
      let idx = factList.findIndex((f) => equivalentExpr(f, fact));
      if (idx < 0) {
        idx = factList.findIndex((f) => {
          const u = unwrap(f);
          return u.type === "Neg" && equivalentExpr(u.arg, fact);
        });
      }
      const isWhole = equivalentExpr(from, fact);
      if (idx < 0 && !isWhole) {
        throw new RuleError(
          "Il fattore selezionato non \xE8 un fattore moltiplicativo di quel membro.",
          "Puoi trasportare solo elementi che moltiplicano l'intero membro, non termini di una somma."
        );
      }
      const cond = conditionText(fact, "\u2260 0");
      const newEq = bothSides(eq2, (s) => simplify(Div(s, fact)));
      return {
        equation: newEq,
        conditions: [cond],
        steps: [`Divido entrambi i membri per il fattore ${ctx.factorText} (${ctx.factorText} \u2260 0).`]
      };
    }
  };
  var ruleCrossMultiply = {
    id: "cross-multiply",
    name: "Moltiplicazione incrociata in una proporzione",
    principle: "Da a/b = c/d, moltiplicando entrambi i membri per b\xB7d (b,d \u2260 0) si ottiene a\xB7d = b\xB7c.",
    explanation: "cross-multiply",
    precondition(eq2) {
      const L = asFraction(eq2.left);
      const R = asFraction(eq2.right);
      if (!L || !R) {
        throw new RuleError(
          "La moltiplicazione incrociata si applica solo quando ENTRAMBI i membri sono rapporti (frazioni).",
          "Riscrivi ciascun membro come frazione prima di applicare questa regola."
        );
      }
      return { ok: true };
    },
    apply(eq2) {
      const L = asFraction(eq2.left);
      const R = asFraction(eq2.right);
      if (!L || !R) {
        throw new RuleError("Entrambi i membri devono essere rapporti per la moltiplicazione incrociata.");
      }
      const newEq = Eq(
        simplify(Mul(L.num, R.den)),
        simplify(Mul(L.den, R.num))
      );
      return {
        equation: newEq,
        conditions: [conditionText(L.den, "\u2260 0"), conditionText(R.den, "\u2260 0")],
        steps: [
          "Moltiplico entrambi i membri per il prodotto dei denominatori: i denominatori si semplificano e si ottiene la proporzione incrociata."
        ]
      };
    }
  };
  var ruleSwapSides = {
    id: "swap-sides",
    name: "Scambio dei membri (propriet\xE0 simmetrica dell'uguaglianza)",
    principle: "Se A = B allora B = A.",
    explanation: "swap-sides",
    apply(eq2) {
      return { equation: Eq(eq2.right, eq2.left), conditions: [], steps: ["Scambio i due membri dell'uguaglianza."] };
    }
  };
  var ruleReciprocalBothSides = {
    id: "reciprocal-both",
    name: "Reciproco di entrambi i membri",
    principle: "Se A = B con A \u2260 0 e B \u2260 0, allora 1/A = 1/B.",
    explanation: "reciprocal-both",
    precondition(eq2) {
      if (isIdenticallyZero(eq2.left) || isIdenticallyZero(eq2.right)) {
        throw new RuleError("Non si pu\xF2 calcolare il reciproco di un membro identicamente nullo.");
      }
      return { ok: true };
    },
    apply(eq2) {
      const recip = (node) => {
        const f = asFraction(node);
        if (f) return simplify(Div(f.den, f.num));
        return simplify(Div(Num(1), node));
      };
      return {
        equation: Eq(recip(eq2.left), recip(eq2.right)),
        conditions: [conditionText(eq2.left, "\u2260 0"), conditionText(eq2.right, "\u2260 0")],
        steps: ["Prendo il reciproco di entrambi i membri (entrambi devono essere non nulli)."]
      };
    }
  };
  function negateExpr(node) {
    node = unwrap(node);
    if (!node) return node;
    if (node.type === "Num") {
      return Num(-node.value);
    }
    if (node.type === "Neg") {
      return unwrap(node.arg);
    }
    if (node.type === "Add" || node.type === "Sub") {
      const terms = additiveTerms(node);
      const flipped = terms.map((t) => ({
        sign: t.sign === "-" ? "+" : "-",
        node: t.node
      }));
      return canonical(rebuildSum(flipped));
    }
    if (node.type === "Div") {
      const newNum = negateExpr(node.num);
      return canonical(Div(newNum, node.den));
    }
    if (node.type === "Mul") {
      const first = unwrap(node.args[0]);
      if (first.type === "Num") {
        const newFirst = Num(-first.value);
        return canonical(Mul(newFirst, ...node.args.slice(1)));
      }
      return canonical(Neg(node));
    }
    return canonical(Neg(node));
  }
  var ruleChangeSign = {
    id: "change-sign",
    name: "Regola del cambio di segno (moltiplicazione per \u22121)",
    principle: "Secondo principio di equivalenza: moltiplicando entrambi i membri per \u22121, tutti i segni si invertono (+ \u2194 \u2212).",
    explanation: "change-sign",
    apply(eq2) {
      const newLeft = negateExpr(eq2.left);
      const newRight = negateExpr(eq2.right);
      return {
        equation: Eq(newLeft, newRight),
        conditions: [],
        steps: ["Moltiplico entrambi i membri per \u22121 (inversione di segno di tutti i termini)."]
      };
    }
  };
  var ruleInvertProportion = {
    id: "invert-proportion",
    name: "Inversione di una proporzione (reciproco di entrambi i membri frazionari)",
    principle: "Se a/b = c/d con a,b,c,d \u2260 0 allora b/a = d/c.",
    explanation: "invert-proportion",
    precondition(eq2) {
      const L = asFraction(eq2.left);
      const R = asFraction(eq2.right);
      if (!L || !R) {
        throw new RuleError(
          "L'inversione si applica solo quando entrambi i membri sono rapporti frazionari; non si inverte mai un solo membro.",
          "Porta entrambi i membri in forma frazionaria oppure usa il reciproco di entrambi i membri."
        );
      }
      if (isIdenticallyZero(L.num) || isIdenticallyZero(R.num) || isIdenticallyZero(L.den) || isIdenticallyZero(R.den)) {
        throw new RuleError(
          "Non si pu\xF2 invertire una frazione con numeratore o denominatore nullo: la divisione per zero non \xE8 definita.",
          "Tutti i termini della proporzione devono essere diversi da zero."
        );
      }
      return { ok: true };
    },
    apply(eq2) {
      const L = asFraction(eq2.left);
      const R = asFraction(eq2.right);
      if (!L || !R) throw new RuleError("Entrambi i membri devono essere rapporti.");
      return {
        equation: Eq(simplify(Div(L.den, L.num)), simplify(Div(R.den, R.num))),
        conditions: [
          conditionText(L.num, "\u2260 0"),
          conditionText(L.den, "\u2260 0"),
          conditionText(R.num, "\u2260 0"),
          conditionText(R.den, "\u2260 0")
        ],
        steps: ["Inverto entrambi i rapporti (numeratore e denominatore scambiati)."]
      };
    }
  };
  var ruleSqrtBothSides = {
    id: "sqrt-both",
    name: "Estrazione della radice quadrata (indice pari) di entrambi i membri",
    principle: "Se x\xB2 = A con A \u2265 0 allora x = \xB1\u221AA. Una radice di indice pari richiede radicando \u2265 0 e introduce il segno \xB1.",
    explanation: "sqrt-both",
    apply(eq2, ctx) {
      const { side } = ctx;
      const withPow = side === "left" ? eq2.left : eq2.right;
      const other = side === "left" ? eq2.right : eq2.left;
      const found = extractEvenPower(withPow, ctx.insideVar);
      if (!found) {
        throw new RuleError(
          "La radice di indice pari si applica direttamente solo quando un membro \xE8 una potenza con esponente pari (x\xB2, x\u2074, \u2026).",
          "Isola prima la potenza a esponente pari su un membro."
        );
      }
      const constOther = evalConst(other);
      if (constOther.ok && constOther.value < 0) {
        throw new RuleError(
          "Non si pu\xF2 estrarre una radice di indice pari da un radicando strettamente negativo nel campo reale.",
          "L'equazione non ammette soluzioni reali."
        );
      }
      const n = found.exp;
      const rootOther = n === 2 ? Sqrt(other) : Pow(other, Num(1 / n));
      const newEq = side === "left" ? Eq(found.base, Add(Pm(), rootOther)) : Eq(Add(Pm(), rootOther), found.base);
      return {
        equation: newEq,
        conditions: [conditionText(other, "\u2265 0")],
        steps: [
          `Estraggo la radice ${n === 2 ? "quadrata" : `${n}-esima`} di entrambi i membri. L'indice \xE8 pari: serve il radicando \u2265 0 e la radice di un grado pari \xE8 il valore assoluto, quindi introduco il segno \xB1.`
        ],
        note: "Il segno \xB1 \xE8 matematicamente necessario: non va eliminato. Se la grandezza cercata \xE8 per sua natura positiva (es. una lunghezza, una massa, un tempo), scegli il segno + per togliere l'ambiguit\xE0."
      };
    }
  };
  var ruleRootOddBothSides = {
    id: "root-odd-both",
    name: "Estrazione di una radice di indice dispari (es. cubica) di entrambi i membri",
    principle: "Se x\u207F = A con n dispari allora x = \u207F\u221AA, ed \xE8 unica: nessuna condizione di segno e nessun \xB1.",
    explanation: "root-odd",
    apply(eq2, ctx) {
      const { side } = ctx;
      const withPow = side === "left" ? eq2.left : eq2.right;
      const other = side === "left" ? eq2.right : eq2.left;
      const found = extractOddPower(withPow, ctx.insideVar);
      if (!found) {
        throw new RuleError(
          "La radice di indice dispari si applica direttamente solo quando un membro \xE8 una potenza con esponente dispari (x\xB3, x\u2075, \u2026).",
          "Isola prima la potenza a esponente dispari su un membro."
        );
      }
      const n = found.exp;
      const rootOther = Pow(other, Num(1 / n));
      const newEq = side === "left" ? Eq(found.base, rootOther) : Eq(rootOther, found.base);
      return {
        equation: newEq,
        conditions: [],
        steps: [
          `Estraggo la radice ${n}-esima (indice dispari) di entrambi i membri. Per una radice di indice dispari il radicando pu\xF2 essere positivo, negativo o nullo: non serve alcuna condizione di segno e non compare il \xB1.`
        ],
        note: "Radice di indice dispari: la radice \xE8 unica e NON si introduce il segno \xB1. Il radicando pu\xF2 essere di qualunque segno."
      };
    }
  };
  var rulePowBothSides = {
    id: "pow-both",
    name: "Elevazione di entrambi i membri alla stessa potenza",
    principle: "Se A = B allora A^n = B^n.",
    explanation: "pow-both",
    apply(eq2, ctx) {
      const n = ctx.value;
      if (isIdenticallyZero(n)) {
        throw new RuleError(
          "Elevare entrambi i membri alla potenza 0 distrugge l'informazione dell'equazione (1 = 1): non \xE8 una trasformazione utile.",
          "Scegli un esponente diverso da zero."
        );
      }
      const newEq = Eq(simplify(Pow(eq2.left, n)), simplify(Pow(eq2.right, n)));
      return {
        equation: newEq,
        conditions: [],
        steps: [`Elevo entrambi i membri all'esponente ${ctx.valueText}.`],
        note: isEvenInt(n) ? "Attenzione: elevare a un esponente pari non \xE8 iniettivo e pu\xF2 introdurre soluzioni estranee: le soluzioni vanno sempre ricontrollate." : "Elevare a un esponente dispari \xE8 iniettivo: non introduce soluzioni estranee."
      };
    }
  };
  var ruleDistribute = {
    id: "distribute",
    name: "Propriet\xE0 distributiva del prodotto rispetto alla somma",
    principle: "a(x + b) = ax + ab.",
    explanation: "distribute",
    apply(eq2, ctx) {
      const { side } = ctx;
      const side_expr = side === "left" ? eq2.left : eq2.right;
      const distributed = distribute(side_expr);
      const newEq = side === "left" ? Eq(distributed, eq2.right) : Eq(eq2.left, distributed);
      return {
        equation: simplify(newEq),
        conditions: [],
        steps: ["Applico la propriet\xE0 distributiva: moltiplico il fattore per ciascun termine della somma."]
      };
    }
  };
  var ruleFactorCommon = {
    id: "factor-common",
    name: "Raccoglimento a fattor comune",
    principle: "ax + ab = a(x + b).",
    explanation: "factor-common",
    apply(eq2, ctx) {
      const { side, common } = ctx;
      const expr2 = side === "left" ? eq2.left : eq2.right;
      const factored = factorOut(expr2, common);
      if (!factored) {
        throw new RuleError("Il fattore indicato non \xE8 comune a tutti i termini del membro.");
      }
      const newEq = side === "left" ? Eq(factored, eq2.right) : Eq(eq2.left, factored);
      return {
        equation: newEq,
        conditions: [],
        steps: [`Raccolgo il fattore comune ${ctx.commonText} tra i termini del membro.`]
      };
    }
  };
  var ruleCancelFactor = {
    id: "cancel-factor",
    name: "Cancellazione di un fattore comune tra frazione e prodotto",
    principle: "(a/b)\xB7b = a, purch\xE9 b \u2260 0 (semplificazione di un fattore comune)",
    explanation: "cancel-factor",
    apply(eq2, ctx) {
      const { den, side } = ctx;
      const member = side === "left" ? eq2.left : eq2.right;
      const denNode = unwrap(den);
      const reduced = cancelFractionFactor(member, denNode);
      if (!reduced) {
        throw new RuleError(
          "Non trovo una frazione con questo denominatore moltiplicata per un fattore uguale: non c'\xE8 nulla da cancellare.",
          "Seleziona il denominatore della frazione che fa parte di un prodotto con lo stesso fattore."
        );
      }
      const newEq = side === "left" ? Eq(reduced, eq2.right) : Eq(eq2.left, reduced);
      return {
        equation: simplify(newEq),
        conditions: [conditionText(denNode, "\u2260 0")],
        steps: [
          `Semplifico il fattore ${ctx.denText} tra numeratore e denominatore della frazione (${ctx.denText} \u2260 0).`
        ]
      };
    }
  };
  var ruleInvertFunction = {
    id: "invert-function",
    name: "Applicazione della funzione inversa a entrambi i membri",
    principle: "Se A = B e f \xE8 iniettiva sul ramo considerato, allora f\u207B\xB9(A) = f\u207B\xB9(B).",
    explanation: "invert-function",
    apply(eq2, ctx) {
      const { side } = ctx;
      const withFn = unwrapNeutrals(side === "left" ? eq2.left : eq2.right);
      const other = unwrapNeutrals(side === "left" ? eq2.right : eq2.left);
      const fnNode = ctx.fnNode ? unwrapNeutrals(ctx.fnNode) : extractFunc(withFn);
      if (!fnNode) {
        throw new RuleError(
          "Nessuna funzione invertibile selezionata.",
          "Seleziona una funzione (sin, cos, tan, ln) su un membro, con il suo argomento contenente la variabile."
        );
      }
      const key = fnNode.type.toLowerCase();
      const info = FUNC_INFO[key];
      if (!info || !info.inverse) {
        throw new RuleError(`La funzione "${key}" non \xE8 invertibile in questo modo.`);
      }
      if (key === "sin" || key === "cos") {
        const ev = evalConst(other);
        if (ev.ok && (ev.value < -1 || ev.value > 1)) {
          throw new RuleError(
            `Non si pu\xF2 applicare l'inversa ${info.inverse}: il valore ${ev.value} \xE8 fuori dall'intervallo [\u22121, 1], quindi l'equazione non ammette soluzioni reali.`,
            "Le funzioni seno e coseno assumono solo valori compresi tra \u22121 e 1."
          );
        }
      }
      const invCtor = { asin: Asin, acos: Acos, atan: Atan, exp: Exp }[info.inverse];
      const argFn = fnNode.arg;
      const rhs = invCtor(other);
      const newEqRaw = side === "left" ? Eq(argFn, rhs) : Eq(rhs, argFn);
      const newEq = simplify(newEqRaw);
      const conditions = [];
      const otherText = toPretty(other, 0);
      if (key === "sin" || key === "cos") {
        conditions.push(`${otherText} \u2208 [\u22121, 1]     (dominio di ${info.inverse})`);
      }
      if (info.domainText && info.domainText !== null) {
        conditions.push(`${toPretty(argFn, 0)}: ${info.domainText}`);
      }
      conditions.push(`la soluzione \xE8 presa nel ramo principale ${info.branch} di ${key}`);
      return {
        equation: newEq,
        conditions,
        steps: [
          `Applico la funzione inversa ${info.inverse} a entrambi i membri: essendo f invertibile sul ramo principale, da ${key}(${toPretty(argFn, 0)}) = ${otherText} segue ${toPretty(argFn, 0)} = ${info.inverse}(${otherText}).`
        ],
        note: key === "sin" || key === "cos" ? "Per applicare l'inversa serve che il valore a destra sia compreso in [\u22121, 1]. L'inversa restituisce un angolo nel ramo principale: la funzione seno/coseno NON \xE8 iniettiva su tutto \u211D, perci\xF2 vanno considerate le eventuali altre soluzioni (x + 2k\u03C0, oppure \u03C0 \u2212 x per il seno, \xB1x + 2k\u03C0 per il coseno)." : "L'inversa restituisce un valore nel ramo principale: discuti l'eventuale periodicit\xE0 aggiuntiva se il problema lo richiede."
      };
    }
  };
  var ruleCommonDenominator = {
    id: "common-denom",
    name: "Minimo comune multiplo (m.c.m.) e denominatore comune",
    principle: "Somma di frazioni mediante il minimo comune multiplo (m.c.m.) dei denominatori: A/B + C/D = (A\xB7D + B\xB7C)/(B\xB7D), e semplificazione delle frazioni composte in un'unica frazione.",
    explanation: null,
    apply(eq2, ctx = {}) {
      const side = ctx.side || null;
      const res = reduceEquationToCommonDenominator(eq2, side);
      if (!res.ok) {
        throw new RuleError(res.error, res.hint);
      }
      return {
        equation: res.newEq,
        conditions: [],
        steps: res.steps
      };
    }
  };
  function Pm() {
    return Var("\xB1");
  }
  function isEvenInt(node) {
    node = unwrap(node);
    if (!isNum(node)) return false;
    return Number.isInteger(node.value) && node.value % 2 === 0;
  }
  function powExponent(node) {
    node = unwrap(node);
    if (node.type === "Pow" && isNum(unwrap(node.exp))) return unwrap(node.exp).value;
    return null;
  }
  function extractFunc(node, targetVar) {
    node = unwrapNeutrals(node);
    if (["Sin", "Cos", "Tan", "Ln"].includes(node.type)) return node;
    if (node.type === "Group") return extractFunc(node.arg, targetVar);
    return null;
  }
  function extractEvenPower(node, targetVar) {
    node = unwrap(node);
    const exp = powExponent(node);
    if (exp != null && Number.isInteger(exp) && exp > 0 && exp % 2 === 0) {
      return { base: node.base, exp };
    }
    if (node.type === "Group") return extractEvenPower(node.arg, targetVar);
    return null;
  }
  function extractOddPower(node, targetVar) {
    node = unwrap(node);
    const exp = powExponent(node);
    if (exp != null && Number.isInteger(exp) && exp > 1 && Math.abs(exp % 2) === 1) {
      return { base: node.base, exp };
    }
    if (node.type === "Group") return extractOddPower(node.arg, targetVar);
    return null;
  }
  function additiveTerms(node) {
    node = unwrap(node);
    if (node.type === "Add") {
      return node.args.map((a) => {
        const u = unwrap(a);
        if (u.type === "Neg") return { node: unwrap(u.arg), sign: "-" };
        if (u.type === "Num" && u.value < 0) return { node: Num(-u.value), sign: "-" };
        return { node: u, sign: "+" };
      });
    }
    if (node.type === "Sub") {
      const out = [{ node: unwrap(node.args[0]), sign: "+" }];
      for (let i = 1; i < node.args.length; i++) {
        const arg = unwrap(node.args[i]);
        if (arg.type === "Neg") out.push({ node: unwrap(arg.arg), sign: "-" });
        else if (arg.type === "Num" && arg.value < 0) out.push({ node: Num(-arg.value), sign: "-" });
        else out.push({ node: arg, sign: "-" });
      }
      return out;
    }
    if (node.type === "Neg") {
      return [{ node: unwrap(node.arg), sign: "-" }];
    }
    return [{ node, sign: "+" }];
  }
  function findCommonFactorInFraction(frac) {
    const u = unwrap(frac);
    if (u.type !== "Div") return null;
    const numFactors = factorsOf(u.num);
    const denFactors = factorsOf(u.den);
    if (denFactors.length === 0 || numFactors.length === 0) return null;
    const usedNum = /* @__PURE__ */ new Set();
    const usedDen = /* @__PURE__ */ new Set();
    for (let d = 0; d < denFactors.length; d++) {
      const idx = numFactors.findIndex((n, i) => !usedNum.has(i) && equivalentExpr(n, denFactors[d]));
      if (idx >= 0) {
        usedNum.add(idx);
        usedDen.add(d);
      }
    }
    if (usedDen.size === 0) return null;
    const remaining = numFactors.filter((_, i) => !usedNum.has(i));
    const remainingDen = denFactors.filter((_, d) => !usedDen.has(d));
    const cancelledList = denFactors.filter((_, d) => usedDen.has(d));
    return {
      remaining,
      remainingDen,
      cancelled: cancelledList.length === 1 ? cancelledList[0] : Mul(...cancelledList)
    };
  }
  function cancelFractionFactor(node, denNode) {
    node = unwrap(node);
    if (node.type === "Neg") {
      const inner = cancelFractionFactor(node.arg, denNode);
      return inner === null ? null : Neg(inner);
    }
    if (node.type === "Mul") {
      const fracIdx = node.args.findIndex((a) => unwrap(a).type === "Div");
      if (fracIdx >= 0) {
        const frac = unwrap(node.args[fracIdx]);
        if (equivalentExpr(frac.den, denNode)) {
          const otherFactors = node.args.filter((_, i) => i !== fracIdx);
          const cancelIdx = otherFactors.findIndex((f) => equivalentExpr(f, denNode));
          if (cancelIdx >= 0) {
            const restFactors = otherFactors.filter((_, i) => i !== cancelIdx);
            return restFactors.length === 0 ? frac.num : productOf([frac.num, ...restFactors]);
          }
        }
      }
    }
    if (node.type === "Div") {
      const common = findCommonFactorInFraction(node);
      if (common) {
        const numPart = productOf(common.remaining);
        if (common.remainingDen.length === 0) return numPart;
        return Div(numPart, productOf(common.remainingDen));
      }
    }
    return null;
  }
  function rebuildSum(terms) {
    const positive = terms.filter((t) => t.sign === "+").map((t) => t.node);
    const negative = terms.filter((t) => t.sign === "-").map((t) => t.node);
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
  function distribute(node) {
    node = unwrap(node);
    switch (node.type) {
      case "Mul": {
        const args = node.args.map(distribute);
        const idx = args.findIndex((a) => unwrap(a).type === "Add" || unwrap(a).type === "Sub");
        if (idx < 0) return Mul(...args);
        const target = unwrap(args[idx]);
        const others = args.filter((_, i) => i !== idx);
        const factor = others.length === 0 ? Num(1) : productOf(others);
        if (target.type === "Add") {
          return Add(...target.args.map((t) => distribute(Mul(factor, t))));
        } else {
          const first = distribute(Mul(factor, target.args[0]));
          const rest = target.args.slice(1).map((t) => distribute(Mul(factor, t)));
          return Sub(first, ...rest);
        }
      }
      case "Add":
        return Add(...node.args.map(distribute));
      case "Sub":
        return Sub(...node.args.map(distribute));
      case "Div":
        return Div(distribute(node.num), distribute(node.den));
      case "Pow":
        return Pow(distribute(node.base), distribute(node.exp));
      default:
        return node;
    }
  }
  function canDistribute(node) {
    if (!node) return false;
    const u = unwrap(node);
    if (u.type === "Mul") {
      const hasSumArg = u.args.some((a) => {
        const w = unwrap(a);
        return w.type === "Add" || w.type === "Sub";
      });
      if (hasSumArg) return true;
      return u.args.some(canDistribute);
    }
    if (u.type === "Add" || u.type === "Sub") {
      return (u.args || []).some(canDistribute);
    }
    if (u.type === "Div") {
      return canDistribute(u.num) || canDistribute(u.den);
    }
    if (u.type === "Neg" || u.type === "Group") {
      return canDistribute(u.arg);
    }
    return false;
  }
  function factorOut(node, common) {
    node = unwrap(node);
    if (node.type !== "Add" && node.type !== "Sub") return null;
    const terms = additiveTerms(node);
    const others = [];
    for (const t of terms) {
      const f = removeCommonFactor(t.node, common);
      if (!f) return null;
      others.push({ node: f, sign: t.sign });
    }
    const inner = rebuildSum(others);
    return Mul(common, Group(inner));
  }
  function findCommonFactor(expr2, preferredVar = null) {
    expr2 = unwrap(expr2);
    if (!expr2 || expr2.type !== "Add" && expr2.type !== "Sub") return null;
    const terms = additiveTerms(expr2);
    if (terms.length < 2) return null;
    if (preferredVar) {
      const prefNode = Var(preferredVar);
      if (factorOut(expr2, prefNode)) return prefNode;
    }
    const firstFactors = getFactorsOfTerm(terms[0].node);
    for (const f of firstFactors) {
      if (factorOut(expr2, f)) return f;
    }
    return null;
  }
  function getFactorsOfTerm(term) {
    term = unwrap(term);
    if (term.type === "Neg") term = unwrap(term.arg);
    if (term.type === "Var" || term.type === "Num") return [term];
    if (term.type === "Mul") {
      return term.args.map((a) => unwrap(a)).filter((a) => a.type === "Var" || a.type === "Num");
    }
    if (term.type === "Div") {
      return getFactorsOfTerm(term.num);
    }
    return [];
  }
  function hasTrigConflict(member, target) {
    if (!member || !target) return false;
    const vars = collectVars(member);
    if (!vars.has(target)) return false;
    let hasSin = false;
    let hasCos = false;
    function walk2(n) {
      if (!n) return;
      const u = unwrap(n);
      if (u.type === "Sin" && collectVars(u.arg).has(target)) hasSin = true;
      if (u.type === "Cos" && collectVars(u.arg).has(target)) hasCos = true;
      if (u.type === "Add" || u.type === "Sub" || u.type === "Mul") {
        (u.args || [u.left, u.right]).forEach(walk2);
      } else if (u.type === "Div") {
        walk2(u.num);
        walk2(u.den);
      } else if (u.type === "Neg" || u.type === "Group") {
        walk2(u.arg);
      }
    }
    walk2(member);
    return hasSin && hasCos;
  }
  function removeCommonFactor(expr2, common) {
    expr2 = unwrap(expr2);
    common = unwrap(common);
    if (equivalentExpr(expr2, common)) return Num(1);
    if (expr2.type === "Neg") {
      const inner = removeCommonFactor(expr2.arg, common);
      return inner ? Neg(inner) : null;
    }
    if (expr2.type === "Div") {
      const innerNum = removeCommonFactor(expr2.num, common);
      if (!innerNum) return null;
      return Div(innerNum, expr2.den);
    }
    if (expr2.type === "Mul") {
      const idx = expr2.args.findIndex((a) => equivalentExpr(a, common));
      if (idx >= 0) {
        const rest = expr2.args.filter((_, i) => i !== idx);
        return rest.length === 0 ? Num(1) : productOf(rest);
      }
    }
    return null;
  }
  function conditionText(node, relation) {
    return `${toPretty(unwrap(node), 0)} ${relation}`;
  }
  var RULES = {
    addBoth: ruleAddBothSides,
    subBoth: ruleSubBothSides,
    mulBoth: ruleMulBothSides,
    divBoth: ruleDivBothSides,
    moveTerm: ruleMoveAdditiveTerm,
    moveFactor: ruleMoveFactor,
    crossMultiply: ruleCrossMultiply,
    swapSides: ruleSwapSides,
    reciprocalBoth: ruleReciprocalBothSides,
    changeSign: ruleChangeSign,
    invertProportion: ruleInvertProportion,
    sqrtBoth: ruleSqrtBothSides,
    rootOddBoth: ruleRootOddBothSides,
    powBoth: rulePowBothSides,
    distribute: ruleDistribute,
    factorCommon: ruleFactorCommon,
    cancelFactor: ruleCancelFactor,
    invertFunction: ruleInvertFunction,
    commonDenom: ruleCommonDenominator
  };
  function applyRule(rule, eq2, ctx = {}) {
    try {
      if (rule.precondition) {
        const pre = rule.precondition(eq2, ctx);
        if (pre && pre.ok === false) {
          return { ok: false, error: pre.reason, hint: pre.hint };
        }
      }
      const res = rule.apply(eq2, ctx);
      return {
        ok: true,
        equation: res.equation,
        conditions: res.conditions || [],
        steps: res.steps || [],
        note: res.note || null
      };
    } catch (err) {
      if (err instanceof RuleError) {
        return { ok: false, error: err.message, hint: err.hint };
      }
      return { ok: false, error: "Errore interno: " + err.message, hint: null };
    }
  }

  // js/algebra.js
  function isGoalReached(eq2, target) {
    if (!eq2 || eq2.type !== "Eq" || !target) return false;
    const inL = collectVars(eq2.left).has(target);
    const inR = collectVars(eq2.right).has(target);
    if (inL && inR) return false;
    const leftIso = isolatedSide(eq2.left, target);
    const rightIso = isolatedSide(eq2.right, target);
    return leftIso && !inR || rightIso && !inL;
  }
  function ensureTargetOnFirstMember(eq2, target) {
    if (!eq2 || eq2.type !== "Eq" || !target) return eq2;
    const inL = collectVars(eq2.left).has(target);
    const inR = collectVars(eq2.right).has(target);
    if (inL && inR) return eq2;
    if (isolatedSide(eq2.right, target) && !inL) {
      return Eq(eq2.right, eq2.left);
    }
    return eq2;
  }
  function isolatedSide(node, target) {
    node = unwrapNeutrals(node);
    if (node.type === "Var" && node.name === target) return true;
    if (node.type === "Mul" && node.args.length === 2) {
      const [a, b] = node.args;
      const aC = isNum(unwrap(a)) ? unwrap(a).value : null;
      const bC = isNum(unwrap(b)) ? unwrap(b).value : null;
      if (aC === 1) return isolatedSide(b, target);
      if (bC === 1) return isolatedSide(a, target);
    }
    return false;
  }
  function whichSideHas(eq2, target) {
    const inL = collectVars(eq2.left).has(target);
    const inR = collectVars(eq2.right).has(target);
    if (inL && inR) return "both";
    if (inL) return "left";
    if (inR) return "right";
    return null;
  }
  function enumerateElements(eq2) {
    const out = [];
    walk(eq2.left, "left", out, "left", { role: "membro" });
    walk(eq2.right, "right", out, "right", { role: "membro" });
    return out;
  }
  function walk(node, side, out, id, ctx) {
    node = unwrap(node);
    const item = {
      id,
      side,
      node,
      role: ctx.role,
      parentRole: ctx.parentRole || null,
      pretty: toPretty(node, 0)
    };
    out.push(item);
    const childCtx = (role) => ({ role, parentRole: ctx.role });
    switch (node.type) {
      case "Add":
      case "Sub": {
        node.args.forEach((a, i) => walk(a, side, out, id + "/" + node.type + i, childCtx("termine")));
        break;
      }
      case "Mul": {
        node.args.forEach((a, i) => walk(a, side, out, id + "/Mul" + i, childCtx("fattore")));
        break;
      }
      case "Div": {
        walk(node.num, side, out, id + "/num", childCtx("numeratore"));
        walk(node.den, side, out, id + "/den", childCtx("denominatore"));
        break;
      }
      case "Pow": {
        walk(node.base, side, out, id + "/base", childCtx("base"));
        walk(node.exp, side, out, id + "/exp", childCtx("esponente"));
        break;
      }
      case "Sqrt": {
        walk(node.arg, side, out, id + "/arg", childCtx("radicando"));
        break;
      }
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp": {
        walk(node.arg, side, out, id + "/arg", childCtx("argomento-funzione"));
        break;
      }
      case "Neg": {
        const innerRole = ctx.role === "fattore" || ctx.role === "termine" ? ctx.role : "argomento";
        walk(node.arg, side, out, id + "/arg", childCtx(innerRole));
        break;
      }
      case "Group": {
        walk(node.arg, side, out, id + "/g", childCtx("gruppo"));
        break;
      }
    }
  }
  function findElement(eq2, id) {
    if (id === "left" || id === "right") {
      const node = unwrap(id === "left" ? eq2.left : eq2.right);
      return { id, side: id, node, role: "membro", pretty: toPretty(node, 0) };
    }
    return enumerateElements(eq2).find((e) => e.id === id) || null;
  }
  function availableActions(eq2, element, target) {
    if (!element) return [];
    const actions = [];
    const node = unwrap(element.node);
    const side = element.side;
    const otherSide = side === "left" ? "right" : "left";
    const nodeText = toPretty(node, 0);
    if (element.role === "termine" || element.role === "membro") {
      const terms = additiveTerms(side === "left" ? eq2.left : eq2.right);
      const isAdditive = terms.length > 1;
      if (isAdditive) {
        actions.push({
          id: "move-term",
          label: `Trasporta "${nodeText}" dall'altro membro (cambio di segno)`,
          description: "Somma l'opposto del termine a entrambi i membri (primo principio).",
          ruleKey: "moveTerm",
          build: () => ({ term: node, side, termText: nodeText })
        });
      }
    }
    if (element.role === "fattore" || element.role === "membro" || element.role === "numeratore") {
      const member2 = side === "left" ? eq2.left : eq2.right;
      const memberU = unwrap(member2);
      if (memberU.type === "Mul" && memberU.args.length >= 2) {
        const isSubFactor = memberU.args.some((f) => {
          if (equivalentExpr(f, node)) return true;
          const u = unwrap(f);
          return u.type === "Neg" && equivalentExpr(u.arg, node);
        });
        const isWhole = equivalentExpr(memberU, node);
        if (isSubFactor || isWhole) {
          actions.push({
            id: "move-factor",
            label: `Trasporta "${nodeText}" al denominatore opposto (divisione in croce)`,
            description: "Dividi entrambi i membri per " + nodeText + " (secondo principio, richiede " + nodeText + " \u2260 0).",
            ruleKey: "moveFactor",
            build: () => ({ factor: node, side, factorText: nodeText })
          });
        }
      }
    }
    if (element.role === "denominatore" || node.type === "Div") {
      const den = node.type === "Div" ? node.den : element.role === "denominatore" ? node : null;
      if (den) {
        const denText = toPretty(den, 0);
        actions.push({
          id: "mul-by-den",
          label: `Moltiplica entrambi i membri per "${denText}" (elimina il denominatore)`,
          description: "Moltiplica entrambi i membri per il denominatore (secondo principio).",
          ruleKey: "mulBoth",
          build: () => ({ value: den, valueText: denText })
        });
      }
    }
    if (node.type === "Sqrt" || element.role === "radicando") {
      actions.push({
        id: "square-both",
        label: "Eleva entrambi i membri al quadrato (elimina la radice)",
        description: "Eleva entrambi i membri alla seconda potenza per liberare il radicando.",
        ruleKey: "powBoth",
        build: () => ({ value: Num(2), valueText: "2" })
      });
    }
    const exp = powExpValue(node);
    if (exp != null && Number.isInteger(exp) && exp > 1) {
      if (exp % 2 === 0) {
        actions.push({
          id: "sqrt-both",
          label: `Estrai la radice ${exp === 2 ? "quadrata" : exp + "-esima"} di entrambi i membri (indice pari, introduce \xB1)`,
          description: "Radice di indice pari di entrambi i membri: richiede radicando \u2265 0 e introduce il segno \xB1.",
          ruleKey: "sqrtBoth",
          build: () => ({ side, insideVar: target })
        });
      } else {
        actions.push({
          id: "root-odd-both",
          label: `Estrai la radice ${exp}-esima di entrambi i membri (indice dispari, nessun \xB1)`,
          description: "Radice di indice dispari di entrambi i membri: definita per ogni radicando, unica, senza segno \xB1.",
          ruleKey: "rootOddBoth",
          build: () => ({ side, insideVar: target })
        });
      }
      actions.push({
        id: "pow-both",
        label: `Eleva entrambi i membri a un esponente`,
        description: "Eleva entrambi i membri allo stesso esponente.",
        ruleKey: "powBoth",
        build: () => ({ value: Num(1 / exp), valueText: "1/" + exp })
      });
    }
    const fnNode = funcNodeOf(element, side, eq2);
    if (fnNode) {
      const key = fnNode.type.toLowerCase();
      const info = FUNC_INFO[key];
      const fnText = toPretty(fnNode, 0);
      if (info && info.inverse) {
        actions.push({
          id: "invert-function",
          label: `Scomponi applicando la funzione inversa ${info.inverse}: libera l'argomento di ${fnText}`,
          description: `Applica ${info.inverse} a entrambi i membri per isolare l'argomento della funzione. Richiede che l'altro membro sia nel dominio (es. [\u22121, 1] per sin/cos).`,
          ruleKey: "invertFunction",
          build: () => ({ side, fnNode })
        });
      }
    }
    const member = side === "left" ? eq2.left : eq2.right;
    const denCandidate = node.type === "Div" ? node.den : element.role === "denominatore" ? node : null;
    if (denCandidate && hasCancellableFactor(member, denCandidate)) {
      const denText = toPretty(denCandidate, 0);
      actions.push({
        id: "cancel-factor",
        label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
        description: `Semplifica ${denText} tra numeratore e denominatore: serve ${denText} \u2260 0.`,
        ruleKey: "cancelFactor",
        build: () => ({ den: denCandidate, side, denText })
      });
    } else {
      const autoDen = findCancellableFactor(member);
      if (autoDen) {
        const denText = toPretty(autoDen, 0);
        actions.push({
          id: "cancel-factor",
          label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
          description: `Semplifica ${denText} tra numeratore e denominatore: serve ${denText} \u2260 0.`,
          ruleKey: "cancelFactor",
          build: () => ({ den: autoDen, side, denText })
        });
      }
    }
    if (canDistribute(member)) {
      actions.push({
        id: "distribute",
        label: `Sviluppa le parentesi al ${side === "left" ? "primo" : "secondo"} membro (propriet\xE0 distributiva)`,
        description: "Moltiplica il fattore per ciascun termine nella parentesi: a(b \xB1 c) = ab \xB1 ac.",
        ruleKey: "distribute",
        build: () => ({ side })
      });
    }
    const memberCommon = findCommonFactor(member, target) || findCommonFactor(member, null);
    if (memberCommon) {
      const cText = toPretty(memberCommon, 0);
      actions.push({
        id: "factor-common",
        label: `Raccogli "${cText}" a fattor comune al ${side === "left" ? "primo" : "secondo"} membro`,
        description: `Mette in evidenza il fattore comune ${cText}: ax + ab = a(x + b).`,
        ruleKey: "factorCommon",
        build: () => ({ side, common: memberCommon, commonText: cText })
      });
    }
    return actions;
  }
  function globalActions(eq2, target) {
    const actions = [];
    actions.push({
      id: "swap",
      label: "Scambia i membri (propriet\xE0 simmetrica)",
      description: "Se A = B allora B = A.",
      ruleKey: "swapSides",
      build: () => ({})
    });
    const L = unwrap(eq2.left).type === "Div";
    const R = unwrap(eq2.right).type === "Div";
    if (L && R) {
      actions.push({
        id: "cross",
        label: "Moltiplica in croce (proporzione)",
        description: "Da a/b = c/d ottieni a\xB7d = b\xB7c (denominatori \u2260 0).",
        ruleKey: "crossMultiply",
        build: () => ({})
      });
      actions.push({
        id: "invert",
        label: "Inverti entrambi i rapporti",
        description: "Da a/b = c/d ottieni b/a = d/c (tutti \u2260 0).",
        ruleKey: "invertProportion",
        build: () => ({})
      });
    }
    actions.push({
      id: "reciprocal",
      label: "Prendi il reciproco di entrambi i membri",
      description: "Se A = B e A,B \u2260 0 allora 1/A = 1/B.",
      ruleKey: "reciprocalBoth",
      build: () => ({})
    });
    const distSide = canDistribute(eq2.right) ? "right" : canDistribute(eq2.left) ? "left" : null;
    if (distSide) {
      actions.push({
        id: "distribute",
        label: `Sviluppa le parentesi al ${distSide === "left" ? "primo" : "secondo"} membro`,
        description: "Applica la propriet\xE0 distributiva a(b \xB1 c) = ab \xB1 ac.",
        ruleKey: "distribute",
        build: () => ({ side: distSide })
      });
    }
    const commonFactorLeft = findCommonFactor(eq2.left, target) || findCommonFactor(eq2.left, null);
    const commonFactorRight = findCommonFactor(eq2.right, target) || findCommonFactor(eq2.right, null);
    const factorSide = commonFactorLeft ? "left" : commonFactorRight ? "right" : null;
    const commonNode = commonFactorLeft || commonFactorRight;
    if (factorSide && commonNode) {
      const commonText = toPretty(commonNode, 0);
      actions.push({
        id: "factor-common",
        label: `Raccogli "${commonText}" a fattor comune al ${factorSide === "left" ? "primo" : "secondo"} membro`,
        description: `Mette in evidenza il fattore comune: ax + ab = a(x + b).`,
        ruleKey: "factorCommon",
        build: () => ({ side: factorSide, common: commonNode, commonText })
      });
    }
    return actions;
  }
  function performAction(eq2, action, extraCtx = {}) {
    const rule = RULES[action.ruleKey];
    if (!rule) return { ok: false, error: `Regola sconosciuta: ${action.ruleKey}` };
    const ctx = { ...action.build(extraCtx), ...extraCtx };
    const res = applyRule(rule, eq2, ctx);
    if (!res.ok) return res;
    if (hasZeroDenominator(res.equation)) {
      return {
        ok: false,
        error: "La trasformazione produrrebbe una divisione per zero: non \xE8 ammessa.",
        hint: "Riformula con una diversa operazione."
      };
    }
    return { ...res, rule };
  }
  function hasZeroDenominator(node) {
    node = unwrap(node);
    switch (node.type) {
      case "Div":
        return isIdenticallyZero(node.den) || hasZeroDenominator(node.num) || hasZeroDenominator(node.den);
      case "Add":
      case "Sub":
      case "Mul":
        return node.args.some(hasZeroDenominator);
      case "Pow":
        return hasZeroDenominator(node.base) || hasZeroDenominator(node.exp);
      case "Sqrt":
      case "Neg":
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp":
      case "Group":
        return hasZeroDenominator(node.arg);
      case "Eq":
        return hasZeroDenominator(node.left) || hasZeroDenominator(node.right);
      default:
        return false;
    }
  }
  function funcNodeOf(element, side, eq2) {
    const node = unwrap(element.node);
    const isInvertible = (n) => ["Sin", "Cos", "Tan", "Ln"].includes(n.type);
    if (isInvertible(node)) return node;
    if (typeof element.id === "string" && element.id.endsWith("/arg")) {
      const parentId = element.id.slice(0, -4);
      const parent = findElement(eq2, parentId);
      if (parent && isInvertible(unwrap(parent.node))) return unwrap(parent.node);
    }
    const member = side === "left" ? eq2.left : eq2.right;
    if (isInvertible(unwrap(member))) return unwrap(member);
    return null;
  }
  function powExpValue(node) {
    node = unwrap(node);
    if (node.type === "Pow" && isNum(unwrap(node.exp))) return unwrap(node.exp).value;
    return null;
  }
  function hasCancellableFactor(member, den) {
    if (!member || !den) return false;
    return cancelFractionFactor(member, den) !== null;
  }
  function findCancellableFactor(member) {
    if (!member) return null;
    const m = unwrap(member);
    if (m.type === "Neg") return findCancellableFactor(m.arg);
    if (m.type === "Mul") {
      const fracIdx = m.args.findIndex((a) => unwrap(a).type === "Div");
      if (fracIdx >= 0) {
        const frac = unwrap(m.args[fracIdx]);
        const den = frac.den;
        if (m.args.some((f, i) => i !== fracIdx && equivalentExpr(f, den))) {
          return den;
        }
      }
    }
    if (m.type === "Div") {
      const common = findCommonFactorInFraction(m);
      if (common) return common.cancelled;
    }
    return null;
  }
  function hasDistributableSum(node, target) {
    const u = unwrap(node);
    if (u.type === "Mul") {
      if (u.args.some((a) => {
        const w = unwrap(a);
        return (w.type === "Add" || w.type === "Sub") && collectVars(w).has(target);
      })) return true;
    }
    if (u.type === "Add" || u.type === "Sub") {
      return u.args.some((a) => hasDistributableSum(a, target));
    }
    return false;
  }
  function suggestNextStep(eq2, target) {
    if (isGoalReached(eq2, target)) {
      if (isolatedSide(eq2.right, target) && !isolatedSide(eq2.left, target)) {
        return {
          found: true,
          action: {
            id: "swap",
            label: "Scambia i membri per avere " + target + " al primo membro",
            description: "Se A = B allora B = A (propriet\xE0 simmetrica dell'uguaglianza).",
            ruleKey: "swapSides",
            build: () => ({})
          },
          reason: `La grandezza ${target} \xE8 isolata al secondo membro: scambia i membri per scriverla nella forma standard ${target} = ...`
        };
      }
      return { found: false, message: "Obiettivo gi\xE0 raggiunto!" };
    }
    const canL = findCancellableFactor(eq2.left);
    if (canL) {
      const denText = toPretty(canL, 0);
      return {
        found: true,
        action: {
          id: "cancel-factor",
          label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
          description: `Semplifica ${denText} (\u2260 0) tra numeratore e denominatore.`,
          ruleKey: "cancelFactor",
          build: () => ({ den: canL, side: "left", denText })
        },
        reason: `Al primo membro c'\xE8 un fattore comune ${denText} tra numeratore e denominatore: semplificalo prima di procedere.`
      };
    }
    const canR = findCancellableFactor(eq2.right);
    if (canR) {
      const denText = toPretty(canR, 0);
      return {
        found: true,
        action: {
          id: "cancel-factor",
          label: `Cancella il fattore "${denText}" (semplifica la frazione)`,
          description: `Semplifica ${denText} (\u2260 0) tra numeratore e denominatore.`,
          ruleKey: "cancelFactor",
          build: () => ({ den: canR, side: "right", denText })
        },
        reason: `Al secondo membro c'\xE8 un fattore comune ${denText} tra numeratore e denominatore: semplificalo prima di procedere.`
      };
    }
    const side = whichSideHas(eq2, target);
    if (side === "both") {
      const rightTerms = additiveTerms(eq2.right);
      const targetTermOnRight = rightTerms.find((t) => collectVars(t.node).has(target));
      if (targetTermOnRight && rightTerms.length > 1) {
        const tText = toPretty(targetTermOnRight.node, 0);
        return {
          found: true,
          action: {
            id: "move-term",
            label: `Porta ${tText} al primo membro (cambio di segno)`,
            description: `Sottrai ${tText} da entrambi i membri per raggruppare ${target}.`,
            ruleKey: "moveTerm",
            build: () => ({ term: targetTermOnRight.node, side: "right", termText: tText })
          },
          reason: `La grandezza ${target} compare in entrambi i membri: porta ${tText} a sinistra per raggrupparla.`
        };
      }
      const leftTerms = additiveTerms(eq2.left);
      const strangeOnLeft = leftTerms.find((t) => !collectVars(t.node).has(target));
      if (strangeOnLeft && leftTerms.length > 1) {
        const sText = toPretty(strangeOnLeft.node, 0);
        return {
          found: true,
          action: {
            id: "move-term",
            label: `Porta ${sText} al secondo membro (cambio di segno)`,
            description: `Sottrai ${sText} da entrambi i membri per isolare i termini con ${target}.`,
            ruleKey: "moveTerm",
            build: () => ({ term: strangeOnLeft.node, side: "left", termText: sText })
          },
          reason: `Il termine ${sText} non contiene ${target}: portalo a destra.`
        };
      }
      const isDistributable = (node) => {
        const u = unwrap(node);
        if (u.type !== "Mul") return false;
        return u.args.some((a) => {
          const w = unwrap(a);
          return (w.type === "Add" || w.type === "Sub") && collectVars(w).has(target);
        });
      };
      const distSide = isDistributable(eq2.right) ? "right" : isDistributable(eq2.left) ? "left" : null;
      if (distSide) {
        return {
          found: true,
          action: {
            id: "distribute",
            label: `Sviluppa il prodotto al ${distSide === "left" ? "primo" : "secondo"} membro (propriet\xE0 distributiva)`,
            description: `Applica la propriet\xE0 distributiva per separare i termini che contengono ${target}.`,
            ruleKey: "distribute",
            build: () => ({ side: distSide })
          },
          reason: `La grandezza ${target} \xE8 in una somma moltiplicata per un fattore: sviluppando il prodotto i termini con ${target} si possono raggruppare.`
        };
      }
      return {
        found: true,
        action: {
          id: "swap",
          label: "Porta tutti i termini con " + target + " su un solo membro",
          description: "Applica i principi di equivalenza per raggruppare la variabile.",
          ruleKey: "swapSides",
          build: () => ({})
        },
        reason: `La grandezza ${target} compare in entrambi i membri: occorre raggrupparla prima di isolarla.`
      };
    }
    if (!side) {
      return { found: false, message: `La grandezza ${target} non compare nell'equazione.` };
    }
    const member = side === "left" ? eq2.left : eq2.right;
    const other = side === "left" ? eq2.right : eq2.left;
    const mU = unwrap(member);
    if (hasTrigConflict(member, target)) {
      return {
        found: false,
        message: `La grandezza ${target} compare sia all'interno di sin(${target}) sia di cos(${target}). Non \xE8 possibile raccoglierla a fattor comune perch\xE9 ${target} \xE8 l'argomento delle funzioni trigonometriche (sin(${target}) \u2260 sin \xB7 ${target}) e l'equazione non \xE8 isolabile con i soli principi di equivalenza elementari.`
      };
    }
    if (mU.type === "Neg" && collectVars(mU.arg).has(target)) {
      const inner = toPretty(mU.arg, 0);
      return {
        found: true,
        action: {
          id: "mul-by-minus-one",
          label: "Moltiplica entrambi i membri per \u22121",
          description: `Cambia il segno di entrambi i membri per liberare ${inner}.`,
          ruleKey: "mulBoth",
          build: () => ({ value: Num(-1), valueText: "\u22121" })
        },
        reason: `Il membro con ${target} \xE8 preceduto dal segno meno: moltiplicando entrambi i membri per \u22121 l'espressione diventa positiva e pi\xF9 semplice da isolare.`
      };
    }
    if (mU.type === "Sqrt") {
      return {
        found: true,
        action: {
          id: "square-both",
          label: "Eleva entrambi i membri al quadrato",
          description: "Elimina la radice quadrata elevando entrambi i membri alla seconda potenza.",
          ruleKey: "powBoth",
          build: () => ({ value: Num(2), valueText: "2" })
        },
        reason: `La grandezza ${target} si trova sotto radice quadrata: elevando entrambi i membri al quadrato la radice viene eliminata.`
      };
    }
    if (["Sin", "Cos", "Tan", "Ln"].includes(mU.type)) {
      const key = mU.type.toLowerCase();
      const info = FUNC_INFO[key];
      const argText = toPretty(mU.arg, 0);
      const condText = key === "sin" || key === "cos" ? `, con ${toPretty(other, 0)} \u2208 [\u22121, 1]` : "";
      return {
        found: true,
        action: {
          id: "invert-function",
          label: `Applica la funzione inversa ${info.inverse} a entrambi i membri`,
          description: `Da ${key}(${argText}) = ${toPretty(other, 0)} si ottiene ${argText} = ${info.inverse}(${toPretty(other, 0)})${condText}.`,
          ruleKey: "invertFunction",
          build: () => ({ side, fnNode: mU })
        },
        reason: `La grandezza ${target} \xE8 "dentro" la funzione ${key}: per liberarla applica la funzione inversa ${info.inverse} a entrambi i membri${condText}.`
      };
    }
    if (mU.type === "Div") {
      const den = mU.den;
      const denText = toPretty(den, 0);
      return {
        found: true,
        action: {
          id: "mul-by-den",
          label: `Moltiplica entrambi i membri per ${denText}`,
          description: `Elimina il denominatore moltiplicando entrambi i membri per ${denText}.`,
          ruleKey: "mulBoth",
          build: () => ({ value: den, valueText: denText })
        },
        reason: collectVars(den).has(target) ? `La variabile ${target} \xE8 al denominatore di una frazione: moltiplicando entrambi i membri per ${denText} sale al numeratore.` : `Il membro contenente ${target} ha un denominatore ${denText}: moltiplicando entrambi i membri per ${denText} la frazione scompare.`
      };
    }
    const terms = additiveTerms(member);
    if (terms.length > 1) {
      const hasBareTarget = (node) => {
        const u = unwrap(node);
        if (u.type === "Var") return u.name === target;
        if (u.type === "Neg") return hasBareTarget(u.arg);
        if (u.type === "Mul") {
          return u.args.some((a) => hasBareTarget(a));
        }
        if (u.type === "Div") return hasBareTarget(u.num);
        return false;
      };
      const allHaveBareTarget = terms.every((t) => hasBareTarget(t.node));
      if (allHaveBareTarget) {
        const targetNode = Var(target);
        return {
          found: true,
          action: {
            id: "factor-common",
            label: `Raccogli ${target} a fattor comune`,
            description: `Metti in evidenza ${target}, presente in tutti i termini del membro.`,
            ruleKey: "factorCommon",
            build: () => ({ common: targetNode, side, commonText: target })
          },
          reason: `La grandezza ${target} compare in tutti i termini del membro: raccogliendola a fattor comune rester\xE0 un unico fattore da eliminare.`
        };
      }
      const strange = terms.find((t) => !collectVars(t.node).has(target));
      if (strange) {
        const t = toPretty(strange.node, 0);
        return {
          found: true,
          action: {
            id: "move-term",
            label: `Porta ${t} dall'altro membro (cambio di segno)`,
            description: `Sottrai ${t} da entrambi i membri per isolare ${target}.`,
            ruleKey: "moveTerm",
            build: () => ({ term: strange.node, side, termText: t })
          },
          reason: `Il termine ${t} \xE8 sommato/sottratto al termine contenente ${target}: trasportandolo dall'altra parte con il segno opposto ci si avvicina all'obiettivo.`
        };
      }
    }
    if (mU.type === "Mul") {
      const strange = mU.args.find((f) => !collectVars(unwrap(f)).has(target));
      if (strange) {
        const t = toPretty(strange, 0);
        return {
          found: true,
          action: {
            id: "move-factor",
            label: `Dividi entrambi i membri per ${t}`,
            description: `Isola ${target} eliminando il fattore ${t} (richiede ${t} \u2260 0).`,
            ruleKey: "moveFactor",
            build: () => ({ factor: unwrap(strange), side, factorText: t })
          },
          reason: `Il fattore ${t} moltiplica la grandezza ${target}: per isolarla dividi entrambi i membri per ${t} (secondo principio).`
        };
      }
    }
    const exp = powExpValue(mU);
    if (exp != null && Number.isInteger(exp) && exp > 1) {
      if (exp % 2 === 0) {
        return {
          found: true,
          action: {
            id: "sqrt-both",
            label: `Estrai la radice ${exp === 2 ? "quadrata" : exp + "-esima"} di entrambi i membri (indice pari)`,
            description: "Radice di indice pari: introduce il segno \xB1 e richiede radicando \u2265 0.",
            ruleKey: "sqrtBoth",
            build: () => ({ side, insideVar: target })
          },
          reason: `${target} \xE8 elevata a un esponente pari: estraendo la radice di indice pari compare \xB1 e richiede radicando \u2265 0.`
        };
      }
      return {
        found: true,
        action: {
          id: "root-odd-both",
          label: `Estrai la radice ${exp}-esima di entrambi i membri (indice dispari)`,
          description: "Radice di indice dispari: definita per ogni radicando, unica, senza \xB1.",
          ruleKey: "rootOddBoth",
          build: () => ({ side, insideVar: target })
        },
        reason: `${target} \xE8 elevata a un esponente dispari: estraendo la radice di indice dispari si isola senza \xB1 e senza condizioni di segno.`
      };
    }
    if (hasDistributableSum(member, target)) {
      return {
        found: true,
        action: {
          id: "distribute",
          label: `Sviluppa il prodotto al ${side === "left" ? "primo" : "secondo"} membro (propriet\xE0 distributiva)`,
          description: `Applica la propriet\xE0 distributiva per separare i termini che contengono ${target}.`,
          ruleKey: "distribute",
          build: () => ({ side })
        },
        reason: `La grandezza ${target} \xE8 in una somma moltiplicata per un fattore: sviluppando il prodotto i termini con ${target} si possono raggruppare.`
      };
    }
    return {
      found: false,
      message: `Non trovo un passo diretto automatico. Prova a selezionare un termine o fattore di ${target}.`
    };
  }
  function mergeConditions(existing, added) {
    const set = new Set(existing);
    for (const c of added) set.add(c);
    return Array.from(set);
  }

  // js/operations.js
  var KEYPAD_OPERATIONS = [
    { id: "add", label: "+", title: "Somma la stessa grandezza o numero a entrambi i membri", needsOperand: true },
    { id: "sub", label: "\u2212", title: "Sottrai la stessa grandezza o numero a entrambi i membri", needsOperand: true },
    { id: "mul", label: "\xD7", title: "Moltiplica entrambi i membri per la stessa grandezza o numero", needsOperand: true },
    { id: "div", label: "\xF7", title: "Dividi entrambi i membri per la stessa grandezza o numero (\u2260 0)", needsOperand: true },
    { id: "pow", label: "^", title: "Eleva entrambi i membri alla stessa potenza", needsOperand: true },
    { id: "sqrt", label: "\u221A", title: "Estrai la radice quadrata di entrambi i membri", needsOperand: false },
    { id: "asin", label: "arcsin", title: "Applica l'arcoseno (sin\u207B\xB9) a entrambi i membri per liberare l'argomento del seno", needsOperand: false },
    { id: "acos", label: "arccos", title: "Applica l'arcocoseno (cos\u207B\xB9) a entrambi i membri per liberare l'argomento del coseno", needsOperand: false },
    { id: "atan", label: "arctan", title: "Applica l'arcotangente (tan\u207B\xB9) a entrambi i membri per liberare l'argomento della tangente", needsOperand: false }
  ];
  var RULE_BY_OP = {
    add: "addBoth",
    sub: "subBoth",
    mul: "mulBoth",
    div: "divBoth",
    pow: "powBoth"
  };
  function equationKeypadTokens(eq2) {
    const letters = [...collectVars(eq2)].sort();
    const numbers = /* @__PURE__ */ new Set();
    const walk2 = (node) => {
      if (!node) return;
      const u = unwrap(node);
      if (u.type === "Num" && Number.isFinite(u.value)) numbers.add(u.value);
      switch (u.type) {
        case "Eq":
          walk2(u.left);
          walk2(u.right);
          break;
        case "Add":
        case "Sub":
        case "Mul":
          u.args.forEach(walk2);
          break;
        case "Div":
          walk2(u.num);
          walk2(u.den);
          break;
        case "Pow":
          walk2(u.base);
          walk2(u.exp);
          break;
        default:
          if (u.arg) walk2(u.arg);
      }
    };
    walk2(eq2);
    return {
      letters,
      numbers: [...numbers].sort((a, b) => a - b)
    };
  }
  function parseOperand(text) {
    const t = String(text || "").trim();
    if (!t) return null;
    try {
      return parseExpression(t);
    } catch {
      return null;
    }
  }
  function evenPowerOf(node) {
    const u = unwrap(node);
    if (u.type === "Pow" && isNum(u.exp) && Number.isInteger(u.exp.value) && u.exp.value % 2 === 0 && u.exp.value > 0) {
      return u.exp.value;
    }
    return null;
  }
  function applySqrtBothSides(eq2, targetVar) {
    const side = targetVar ? whichSideHas(eq2, targetVar) : null;
    if (side === "left" || side === "right") {
      const res = applyRule(RULES.sqrtBoth, eq2, { side, insideVar: targetVar });
      if (res.ok) {
        return {
          ok: true,
          equation: res.equation,
          conditions: res.conditions || [],
          steps: res.steps || [],
          note: res.note || null
        };
      }
    }
    for (const member of [eq2.left, eq2.right]) {
      const constM = evalConst(member);
      if (constM.ok && constM.value < 0) {
        return {
          ok: false,
          error: "Non si pu\xF2 estrarre una radice di indice pari da un radicando strettamente negativo nel campo reale.",
          hint: "L'equazione non ammette soluzioni reali."
        };
      }
    }
    for (const member of [eq2.left, eq2.right]) {
      if (evenPowerOf(member) !== null) {
        return {
          ok: false,
          error: "Un membro \xE8 una potenza a esponente pari: la radice va presa con la regola dedicata, che introduce il segno \xB1, perch\xE9 \u221A(x\xB2) = |x|.",
          hint: `Seleziona prima la potenza nell'area di lavoro e usa l'azione "Estrai la radice", oppure isola la potenza su un membro.`
        };
      }
    }
    const newEq = canonical(Eq(Sqrt(eq2.left), Sqrt(eq2.right)));
    return {
      ok: true,
      equation: newEq,
      conditions: [conditionText(eq2.left, "\u2265 0"), conditionText(eq2.right, "\u2265 0")],
      steps: ["Estraggo la radice quadrata di entrambi i membri."],
      note: "La radice di un quadrato \xE8 un valore assoluto: \u221A(x\xB2) = |x|. Perch\xE9 la radice di entrambi i membri abbia senso, entrambi devono essere \u2265 0."
    };
  }
  function nodeContainsType(node, type) {
    if (!node) return false;
    const u = unwrap(node);
    if (u.type === type) return true;
    switch (u.type) {
      case "Add":
      case "Sub":
      case "Mul":
        return u.args.some((arg) => nodeContainsType(arg, type));
      case "Div":
        return nodeContainsType(u.num, type) || nodeContainsType(u.den, type);
      case "Pow":
        return nodeContainsType(u.base, type) || nodeContainsType(u.exp, type);
      case "Eq":
        return nodeContainsType(u.left, type) || nodeContainsType(u.right, type);
      default:
        return u.arg ? nodeContainsType(u.arg, type) : false;
    }
  }
  var TRIG_OPS = {
    asin: {
      trigType: "Sin",
      fnName: "seno (sin)",
      invName: "arcoseno (arcsin)",
      notation: "sin(...)"
    },
    acos: {
      trigType: "Cos",
      fnName: "coseno (cos)",
      invName: "arcocoseno (arccos)",
      notation: "cos(...)"
    },
    atan: {
      trigType: "Tan",
      fnName: "tangente (tan)",
      invName: "arcotangente (arctan)",
      notation: "tan(...)"
    }
  };
  function applyInverseTrigBothSides(eq2, opId, targetVar) {
    const info = TRIG_OPS[opId];
    if (!info) return { ok: false, error: `Operazione trigonometrica sconosciuta: ${opId}.` };
    const leftU = unwrapNeutrals(eq2.left);
    const rightU = unwrapNeutrals(eq2.right);
    const leftIsTrig = leftU.type === info.trigType;
    const rightIsTrig = rightU.type === info.trigType;
    let side = null;
    let fnNode = null;
    if (leftIsTrig && rightIsTrig) {
      const sideHas = targetVar ? whichSideHas(eq2, targetVar) : null;
      side = sideHas === "right" ? "right" : "left";
      fnNode = side === "left" ? leftU : rightU;
    } else if (leftIsTrig) {
      side = "left";
      fnNode = leftU;
    } else if (rightIsTrig) {
      side = "right";
      fnNode = rightU;
    }
    if (side && fnNode) {
      const res = applyRule(RULES.invertFunction, eq2, { side, fnNode });
      if (!res.ok) {
        return { ok: false, error: res.error, hint: res.hint };
      }
      let newEq = res.equation;
      if (targetVar && whichSideHas(newEq, targetVar) === "right") {
        newEq = Eq(newEq.right, newEq.left);
      }
      return {
        ok: true,
        equation: newEq,
        conditions: res.conditions || [],
        steps: res.steps || [],
        note: res.note || null
      };
    }
    const containsInEq = nodeContainsType(eq2.left, info.trigType) || nodeContainsType(eq2.right, info.trigType);
    if (containsInEq) {
      return {
        ok: false,
        error: `Per applicare l'${info.invName} devi prima isolare la funzione ${info.fnName} su uno dei due membri!`,
        hint: `Sposta o dividi prima per i coefficienti o termini che la moltiplicano o la sommano fino ad avere ${info.notation} = ...`
      };
    }
    return {
      ok: false,
      error: `Nessuna funzione ${info.fnName} presente nell'equazione da invertire.`,
      hint: `L'operazione ${info.invName} si applica per liberare l'argomento quando un membro \xE8 costituito da ${info.notation}.`
    };
  }
  function applyKeypadOperation(eq2, opId, operandNode, operandText, targetVar) {
    if (!eq2 || eq2.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione su cui operare." };
    }
    if (opId === "sqrt") return applySqrtBothSides(eq2, targetVar);
    if (opId === "asin" || opId === "acos" || opId === "atan") {
      return applyInverseTrigBothSides(eq2, opId, targetVar);
    }
    const ruleKey = RULE_BY_OP[opId];
    if (!ruleKey) return { ok: false, error: `Operazione sconosciuta: ${opId}.` };
    if (!operandNode) return { ok: false, error: "Scegli prima una grandezza o un numero." };
    const res = applyRule(RULES[ruleKey], eq2, { value: operandNode, valueText: operandText });
    if (!res.ok) return { ok: false, error: res.error, hint: res.hint };
    return {
      ok: true,
      equation: res.equation,
      conditions: res.conditions || [],
      steps: res.steps || [],
      note: res.note || null
    };
  }

  // js/cross.js
  var INDEXED = /^(Add|Sub|Mul)(\d+)$/;
  function childAt(node, segment) {
    const u = unwrap(node);
    const m = INDEXED.exec(segment);
    if (m) return u.args ? u.args[Number(m[2])] : void 0;
    switch (segment) {
      case "num":
        return u.num;
      case "den":
        return u.den;
      case "base":
        return u.base;
      case "exp":
        return u.exp;
      case "arg":
        return u.arg;
      case "g":
        return u.arg;
      default:
        return void 0;
    }
  }
  function replaceChild(node, segment, replacement) {
    const u = unwrap(node);
    const m = INDEXED.exec(segment);
    if (m) {
      const i = Number(m[2]);
      if (!u.args) return node;
      return { ...u, args: u.args.map((a, k) => k === i ? replacement : a) };
    }
    switch (segment) {
      case "num":
        return Div(replacement, u.den);
      case "den":
        return Div(u.num, replacement);
      case "base":
        return Pow(replacement, u.exp);
      case "exp":
        return Pow(u.base, replacement);
      case "arg":
        return { ...u, arg: replacement };
      case "g":
        return Group(replacement);
      default:
        return node;
    }
  }
  function nodeAtSegments(node, segments) {
    let cur = unwrap(node);
    for (const seg of segments) {
      const next = childAt(cur, seg);
      if (next === void 0) return void 0;
      cur = unwrap(next);
    }
    return cur;
  }
  function rebuildAlongPath(root, pathSegments, newValue) {
    if (pathSegments.length === 0) return newValue;
    const [head, ...rest] = pathSegments;
    const child = childAt(root, head);
    if (child === void 0) return root;
    const newChild = rest.length === 0 ? newValue : rebuildAlongPath(child, rest, newValue);
    return replaceChild(root, head, newChild);
  }
  function removeFromParent(parent, segment) {
    const u = unwrap(parent);
    const m = INDEXED.exec(segment);
    if (m) {
      if (u.type !== "Mul" || !u.args) return null;
      const rest = u.args.filter((_, k) => k !== Number(m[2]));
      if (rest.length === 0) return Num(1);
      if (rest.length === 1) return rest[0];
      return Mul(...rest);
    }
    if (u.type === "Div") {
      if (segment === "num") return Div(Num(1), u.den);
      if (segment === "den") return u.num;
    }
    if (u.type === "Pow" && segment === "base" && u.exp && u.exp.type === "Num") {
      const n = u.exp.value - 1;
      if (n === 0) return Num(1);
      if (n === 1) return u.base;
      return Pow(u.base, Num(n));
    }
    return null;
  }
  function removeAt(node, segments) {
    if (segments.length === 0) {
      return { ok: false, error: "Indica un fattore dentro la frazione, non l'intero membro." };
    }
    const parentSegments = segments.slice(0, -1);
    const last = segments[segments.length - 1];
    const parent = parentSegments.length === 0 ? unwrap(node) : nodeAtSegments(node, parentSegments);
    if (!parent) return { ok: false, error: "Percorso non valido in questa equazione." };
    const replacement = removeFromParent(parent, last);
    if (replacement === null) {
      return {
        ok: false,
        error: "Non si pu\xF2 eliminare questo elemento: la semplificazione riguarda solo i fattori di prodotti e frazioni."
      };
    }
    if (parentSegments.length === 0) return { ok: true, node: replacement };
    return { ok: true, node: rebuildAlongPath(node, parentSegments, replacement) };
  }
  function analyseElementId(id) {
    const parts = String(id || "").split("/");
    const side = parts[0];
    if (side !== "left" && side !== "right" || parts.length < 2) return null;
    const segments = parts.slice(1);
    let k = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === "num" || segments[i] === "den") {
        k = i;
        break;
      }
    }
    if (k === -1) {
      if (segments.every((s) => /^Mul\d+$/.test(s) || s === "base")) {
        return { side, segments, slot: "num" };
      }
      return null;
    }
    const prefix = segments.slice(0, k);
    const suffix = segments.slice(k + 1);
    if (prefix.some((s) => !(/^Mul\d+$/.test(s) || /^Add\d+$/.test(s)))) return null;
    for (let i = 0; i < suffix.length - 1; i++) {
      if (!/^Mul\d+$/.test(suffix[i])) return null;
    }
    const last = suffix[suffix.length - 1];
    if (suffix.length > 0 && last !== "base" && !/^Mul\d+$/.test(last)) return null;
    return { side, segments, slot: segments[k] };
  }
  function analyseAdditiveId(id) {
    const parts = String(id || "").split("/");
    const side = parts[0];
    if (side !== "left" && side !== "right") return null;
    const segs = parts.slice(1);
    if (segs.length === 0) return { side, segs: [], sign: 1 };
    let sign = 1;
    for (const seg of segs) {
      const m = /^(Add|Sub)(\d+)$/.exec(seg);
      if (!m) return null;
      if (m[1] === "Sub" && Number(m[2]) > 0) sign = -sign;
    }
    return { side, segs, sign };
  }
  function termEff(t) {
    return t.sign === "+" ? canonical(t.node) : canonical(Neg(t.node));
  }
  function removeByEff(terms, eff) {
    const idx = terms.findIndex((t) => equivalentExpr(termEff(t), eff));
    if (idx < 0) return null;
    return terms.filter((_, k) => k !== idx);
  }
  function removeAdditiveDeep(member, segs) {
    if (segs.length === 0) return Num(0);
    const parentSegs = segs.slice(0, -1);
    const last = segs[segs.length - 1];
    const m = /^(Add|Sub)(\d+)$/.exec(last);
    if (!m) return null;
    const idx = Number(m[2]);
    const parent = parentSegs.length === 0 ? unwrap(member) : nodeAtSegments(member, parentSegs);
    if (!parent || !parent.args || parent.type !== m[1]) return null;
    const keep = parent.args.filter((_, k) => k !== idx);
    let newParent;
    if (keep.length === 0) {
      newParent = Num(0);
    } else if (keep.length === 1 && parent.type === "Add") {
      newParent = keep[0];
    } else if (parent.type === "Sub" && idx === 0) {
      newParent = keep.length === 1 ? Neg(keep[0]) : Sub(Num(0), ...keep);
    } else if (keep.length === 1) {
      newParent = keep[0];
    } else {
      newParent = { ...parent, args: keep };
    }
    if (parentSegs.length === 0) return canonical(newParent);
    return canonical(rebuildAlongPath(member, parentSegs, newParent));
  }
  function crossCancelAdditive(eq2, idA, idB) {
    const a = analyseAdditiveId(idA);
    const b = analyseAdditiveId(idB);
    if (!a || !b) return null;
    const memberA = a.side === "left" ? eq2.left : eq2.right;
    const memberB = b.side === "left" ? eq2.left : eq2.right;
    const nodeA = a.segs.length === 0 ? unwrap(memberA) : nodeAtSegments(memberA, a.segs);
    const nodeB = b.segs.length === 0 ? unwrap(memberB) : nodeAtSegments(memberB, b.segs);
    if (!nodeA || !nodeB) return null;
    const effA = a.sign > 0 ? canonical(nodeA) : canonical(Neg(nodeA));
    const effB = b.sign > 0 ? canonical(nodeB) : canonical(Neg(nodeB));
    if (a.side === b.side) {
      if (!equivalentExpr(effA, canonical(Neg(effB)))) return null;
      const flatTerms = additiveTerms(canonical(memberA));
      const after1 = removeByEff(flatTerms, effA);
      if (!after1) return null;
      const after2 = removeByEff(after1, effB);
      if (!after2) return null;
      const newMember = after2.length === 0 ? Num(0) : canonical(rebuildSum(after2));
      const newEq2 = canonical(a.side === "left" ? Eq(newMember, eq2.right) : Eq(eq2.left, newMember));
      const pos = effA.type === "Neg" ? canonical(Neg(effA)) : effA;
      const c2 = toPretty(pos, 0);
      return {
        ok: true,
        newEq: newEq2,
        cancelled: c2,
        ruleName: `Eliminazione dei termini opposti \xB1${c2}`,
        rulePrinciple: `${c2} \u2212 ${c2} = 0: termini opposti si cancellano (primo principio).`,
        conditions: []
      };
    }
    if (!equivalentExpr(effA, effB)) return null;
    const newA = removeAdditiveDeep(memberA, a.segs);
    const newB = removeAdditiveDeep(memberB, b.segs);
    if (!newA || !newB) return null;
    const newLeft = a.side === "left" ? newA : newB;
    const newRight = a.side === "left" ? newB : newA;
    const newEq = canonical(Eq(newLeft, newRight));
    const c = toPretty(effA, 0);
    return {
      ok: true,
      newEq,
      cancelled: c,
      ruleName: `Eliminazione di ${c} da entrambi i membri`,
      rulePrinciple: `Sottraendo ${c} da entrambi i membri si elimina il termine comune (primo principio).`,
      conditions: []
    };
  }
  function crossCancel(eq2, idA, idB) {
    if (!eq2 || eq2.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione su cui semplificare." };
    }
    if (idA === idB) {
      return { ok: false, error: "Hai indicato due volte lo stesso elemento." };
    }
    const a = analyseElementId(idA);
    const b = analyseElementId(idB);
    if (!a || !b) {
      const addResult = crossCancelAdditive(eq2, idA, idB);
      if (addResult) return addResult;
      return {
        ok: false,
        error: "Seleziona: \u2460  un fattore al numeratore e uno uguale al denominatore della stessa frazione, oppure \u2461 due termini opposti (es. a e \u2212a) della stessa somma, oppure \u2462 la stessa grandezza su entrambi i membri.",
        hint: "Trascina la croce su fattori uguali (num./den.), su termini opposti, o sulla stessa grandezza a entrambi i lati."
      };
    }
    if (a.side !== b.side) {
      const addResult = crossCancelAdditive(eq2, idA, idB);
      if (addResult) return addResult;
      return {
        ok: false,
        error: "I due fattori di una frazione devono stare nello stesso membro. Per cancellare la stessa grandezza su entrambi i lati, selezionala come termine additivo.",
        hint: "Semplifica un fattore al numeratore e uno al denominatore dello stesso membro."
      };
    }
    const member = a.side === "left" ? eq2.left : eq2.right;
    const nodeA = nodeAtSegments(member, a.segments);
    const nodeB = nodeAtSegments(member, b.segments);
    if (!nodeA || !nodeB) {
      return { ok: false, error: "Elemento non trovato nell'equazione." };
    }
    if (!equivalentExpr(nodeA, nodeB)) {
      return {
        ok: false,
        error: `I due elementi non sono uguali, quindi non si semplificano: ${toPretty(nodeA, 0)} \u2260 ${toPretty(nodeB, 0)}.`,
        hint: "Si semplificano solo fattori identici, per esempio la stessa lettera o lo stesso numero."
      };
    }
    const slotA = a.slot;
    const slotB = b.slot;
    if (slotA === slotB) {
      return {
        ok: false,
        error: "Servono un elemento al numeratore e uno al denominatore: due fattori nella stessa posizione non si eliminano.",
        hint: "La semplificazione vale tra numeratore e denominatore (a/a = 1, con a \u2260 0)."
      };
    }
    const numEntry = slotA === "num" ? a : b;
    const denEntry = slotA === "den" ? a : b;
    let simplifiedNode = null;
    const afterNum = removeAt(member, numEntry.segments);
    if (afterNum.ok) {
      const afterBoth = removeAt(afterNum.node, denEntry.segments);
      if (afterBoth.ok) simplifiedNode = afterBoth.node;
    }
    if (!simplifiedNode) {
      const afterDen = removeAt(member, denEntry.segments);
      if (afterDen.ok) {
        const afterBoth2 = removeAt(afterDen.node, numEntry.segments);
        if (afterBoth2.ok) simplifiedNode = afterBoth2.node;
      }
    }
    if (!simplifiedNode) {
      const viaFraction = cancelFractionFactor(member, nodeA);
      if (viaFraction) simplifiedNode = viaFraction;
    }
    if (!simplifiedNode) {
      return { ok: false, error: "Impossibile completare la semplificazione di questi elementi." };
    }
    const simplified = canonical(simplifiedNode);
    const newEq = canonical(a.side === "left" ? Eq(simplified, eq2.right) : Eq(eq2.left, simplified));
    const cancelled = toPretty(nodeA, 0);
    return {
      ok: true,
      newEq,
      cancelled,
      ruleName: `Semplificazione di ${cancelled} tra numeratore e denominatore`,
      rulePrinciple: `${cancelled}/${cancelled} = 1, purch\xE9 ${cancelled} \u2260 0: un fattore uguale al numeratore e al denominatore si pu\xF2 eliminare.`,
      conditions: [`${cancelled} \u2260 0`]
    };
  }

  // js/compound-fraction.js
  function getFractionParts(node) {
    let sign = 1;
    let curr = unwrap(node);
    while (curr && curr.type === "Neg") {
      sign = -sign;
      curr = unwrap(curr.arg);
    }
    if (curr && curr.type === "Div") {
      return { isDiv: true, sign, num: curr.num, den: curr.den };
    }
    return { isDiv: false, sign, node: curr };
  }
  function hasCompoundFraction(node) {
    if (!node) return false;
    const u = unwrap(node);
    if (u.type === "Div") {
      const pNum = getFractionParts(u.num);
      const pDen = getFractionParts(u.den);
      if (pNum.isDiv || pDen.isDiv) return true;
    }
    if (u.args) return u.args.some(hasCompoundFraction);
    if (u.arg) return hasCompoundFraction(u.arg);
    if (u.base && hasCompoundFraction(u.base)) return true;
    if (u.exp && hasCompoundFraction(u.exp)) return true;
    if (u.num && hasCompoundFraction(u.num)) return true;
    if (u.den && hasCompoundFraction(u.den)) return true;
    return false;
  }
  function transformToReciprocalMul(node) {
    if (!node) return node;
    const u = unwrap(node);
    if (u.type === "Div") {
      const pNum = getFractionParts(u.num);
      const pDen = getFractionParts(u.den);
      if (pNum.isDiv && pDen.isDiv) {
        const totalSign = pNum.sign * pDen.sign;
        const numFrac = Div(pNum.num, pNum.den);
        const denReciprocal = Div(pDen.den, pDen.num);
        const prod = Mul(numFrac, denReciprocal);
        return totalSign < 0 ? Neg(prod) : prod;
      }
      if (pDen.isDiv) {
        const denReciprocal = Div(pDen.den, pDen.num);
        let numNode = u.num;
        if (pDen.sign < 0) {
          numNode = Neg(numNode);
        }
        return Mul(numNode, denReciprocal);
      }
      if (pNum.isDiv) {
        let numFrac = Div(pNum.num, pNum.den);
        if (pNum.sign < 0) {
          numFrac = Neg(numFrac);
        }
        const denInv = Div(Num(1), u.den);
        return Mul(numFrac, denInv);
      }
      return Div(transformToReciprocalMul(u.num), transformToReciprocalMul(u.den));
    }
    if (node.type === "Neg") {
      return Neg(transformToReciprocalMul(node.arg));
    }
    if (node.type === "Group") {
      return { ...node, arg: transformToReciprocalMul(node.arg) };
    }
    if (node.type === "Mul") {
      return Mul(...node.args.map(transformToReciprocalMul));
    }
    if (node.type === "Add") {
      return { ...node, args: node.args.map(transformToReciprocalMul) };
    }
    if (node.type === "Sub") {
      return { ...node, args: node.args.map(transformToReciprocalMul) };
    }
    if (node.type === "Pow") {
      return { ...node, base: transformToReciprocalMul(node.base), exp: transformToReciprocalMul(node.exp) };
    }
    if (node.type === "Sqrt") {
      return { ...node, arg: transformToReciprocalMul(node.arg) };
    }
    return node;
  }
  function getCompoundFractionSteps(eq2, targetVar) {
    if (!eq2 || eq2.type !== "Eq" || !targetVar) return null;
    let targetSide = null;
    let resultSide = null;
    const inL = collectVars(eq2.left).has(targetVar);
    const inR = collectVars(eq2.right).has(targetVar);
    if (inL && inR) return null;
    if (isolatedSide(eq2.left, targetVar) && !inR) {
      targetSide = "left";
      resultSide = "right";
    } else if (isolatedSide(eq2.right, targetVar) && !inL) {
      targetSide = "right";
      resultSide = "left";
    } else {
      return null;
    }
    const resNode = eq2[resultSide];
    if (!hasCompoundFraction(resNode)) return null;
    const step1Eq = clone(eq2);
    const step2ResNode = transformToReciprocalMul(clone(resNode));
    const step2Eq = targetSide === "left" ? Eq(eq2.left, step2ResNode) : Eq(step2ResNode, eq2.right);
    let step3ResNode = canonical(clone(step2ResNode));
    while (hasCompoundFraction(step3ResNode)) {
      step3ResNode = canonical(transformToReciprocalMul(step3ResNode));
    }
    const targetNode = targetSide === "left" ? eq2.left : eq2.right;
    const step3Eq = Eq(targetNode, step3ResNode);
    return {
      targetSide,
      resultSide,
      targetVar,
      step1Eq,
      step2Eq,
      step3Eq,
      step1Pretty: toPretty(step1Eq, 0),
      step2Pretty: toPretty(step2Eq, 0),
      step3Pretty: toPretty(step3Eq, 0)
    };
  }

  // js/formulas-fisica.js
  var FORMULAS_FISICA = [
    // ============================ CINEMATICA ============================
    {
      id: "x-legge-oraria-mru",
      topic: "cinematica",
      name: "legge oraria (moto uniforme)",
      formula: "x = x0 + v*t",
      isolate: ["x", "x0", "v", "t"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Moto rettilineo uniforme (velocit\xE0 costante)."
    },
    {
      id: "s-vt-half-at2",
      topic: "cinematica",
      name: "legge oraria (moto accelerato)",
      formula: "x = x0 + v0*t + 1/2*a*t^2",
      isolate: ["x", "x0", "v0", "a", "t"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Moto rettilineo uniformemente accelerato."
    },
    {
      id: "v-quadrata",
      topic: "cinematica",
      name: "relazione spazio-velocit\xE0 (senza tempo)",
      formula: "v^2 = v0^2 + 2*a*s",
      isolate: ["v", "v0", "a", "s"],
      difficulty: 4,
      conditions: [],
      notes: "Per isolare v serve la radice quadrata e il segno \xB1."
    },
    {
      id: "s-vmedia",
      topic: "cinematica",
      name: "spazio medio (velocit\xE0 media)",
      formula: "s = (v0 + v)/2*t",
      isolate: ["s", "v0", "v", "t"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Accelerazione costante."
    },
    {
      id: "h-max-lancio",
      topic: "cinematica",
      name: "altezza massima (lancio verticale)",
      formula: "h = v0^2/(2*g)",
      isolate: ["h", "v0", "g"],
      difficulty: 3,
      conditions: ["g \u2260 0"],
      hypotheses: "Lancio verticale verso l'alto, attrito dell'aria trascurabile."
    },
    {
      id: "t-salita",
      topic: "cinematica",
      name: "tempo di salita",
      formula: "t = v0/g",
      isolate: ["t", "v0", "g"],
      difficulty: 2,
      conditions: ["g \u2260 0"],
      hypotheses: "Lancio verticale verso l'alto."
    },
    {
      id: "t-volo-vert",
      topic: "cinematica",
      name: "tempo di volo (da terra a terra)",
      formula: "t = (2*v0)/g",
      isolate: ["t", "v0", "g"],
      difficulty: 2,
      conditions: ["g \u2260 0"],
      hypotheses: "Lancio verticale da terra e ritorno al suolo."
    },
    {
      id: "t-volo-orizz",
      topic: "cinematica",
      name: "tempo di volo (lancio orizzontale)",
      formula: "t = sqrt((2*h)/g)",
      isolate: ["t", "h", "g"],
      difficulty: 3,
      conditions: ["h \u2265 0", "g \u2260 0"],
      hypotheses: "Lancio orizzontale da altezza h."
    },
    {
      id: "gittata-orizz",
      topic: "cinematica",
      name: "gittata (lancio orizzontale)",
      formula: "x = v0*sqrt((2*h)/g)",
      isolate: ["x", "v0", "h", "g"],
      difficulty: 4,
      conditions: ["h \u2265 0", "g \u2260 0"]
    },
    {
      id: "v0x",
      topic: "cinematica",
      name: "componente orizzontale della velocit\xE0 iniziale",
      formula: "v0x = v0*cos(theta)",
      isolate: ["v0x", "v0", "theta"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Lancio obliquo con angolo theta rispetto all'orizzontale."
    },
    {
      id: "v0y",
      topic: "cinematica",
      name: "componente verticale della velocit\xE0 iniziale",
      formula: "v0y = v0*sin(theta)",
      isolate: ["v0y", "v0", "theta"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Lancio obliquo con angolo theta rispetto all'orizzontale."
    },
    {
      id: "t-salita-obliquo",
      topic: "cinematica",
      name: "tempo per l'altezza massima (proiettile)",
      formula: "t = (v0*sin(theta))/g",
      isolate: ["t", "v0", "theta", "g"],
      difficulty: 3,
      conditions: ["g \u2260 0"]
    },
    {
      id: "ymax-obliquo",
      topic: "cinematica",
      name: "altezza massima (proiettile)",
      formula: "y = (v0^2*sin(theta)^2)/(2*g)",
      isolate: ["y", "v0", "theta", "g"],
      difficulty: 4,
      conditions: ["g \u2260 0"]
    },
    {
      id: "gittata-proiettile",
      topic: "cinematica",
      name: "gittata (proiettile, piano orizzontale)",
      formula: "R = (v0^2*sin(2*theta))/g",
      isolate: ["R", "v0", "theta", "g"],
      difficulty: 4,
      conditions: ["g \u2260 0"],
      hypotheses: "Lancio obliquo e ritorno alla stessa quota."
    },
    {
      id: "omega-mcu",
      topic: "cinematica",
      name: "velocit\xE0 angolare (moto circolare uniforme)",
      formula: "omega = (2*pi)/T",
      isolate: ["omega", "T"],
      difficulty: 3,
      conditions: ["T \u2260 0"]
    },
    {
      id: "omega-f",
      topic: "cinematica",
      name: "velocit\xE0 angolare (dalla frequenza)",
      formula: "omega = 2*pi*f",
      isolate: ["omega", "f"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "v-omega-r",
      topic: "cinematica",
      name: "velocit\xE0 tangenziale (moto circolare)",
      formula: "v = omega*r",
      isolate: ["v", "omega", "r"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "ac-v2r",
      topic: "cinematica",
      name: "accelerazione centripeta",
      formula: "ac = v^2/r",
      isolate: ["ac", "v", "r"],
      difficulty: 3,
      conditions: ["r \u2260 0"]
    },
    {
      id: "ac-omega2r",
      topic: "cinematica",
      name: "accelerazione centripeta (velocit\xE0 angolare)",
      formula: "ac = omega^2*r",
      isolate: ["ac", "omega", "r"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "at-alpha-r",
      topic: "cinematica",
      name: "accelerazione tangenziale (moto circolare accelerato)",
      formula: "at = alpha*r",
      isolate: ["at", "alpha", "r"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "theta-legge-oraria",
      topic: "cinematica",
      name: "legge oraria angolare",
      formula: "theta = theta0 + omega0*t + 1/2*alpha*t^2",
      isolate: ["theta", "theta0", "omega0", "alpha", "t"],
      difficulty: 5,
      conditions: [],
      hypotheses: "Moto circolare uniformemente accelerato."
    },
    {
      id: "mas-legge-oraria",
      topic: "cinematica",
      name: "legge oraria (moto armonico semplice)",
      formula: "x = A*cos(omega*t + phi)",
      isolate: ["x", "A", "omega", "t", "phi"],
      difficulty: 5,
      conditions: [],
      hypotheses: "Moto armonico semplice."
    },
    {
      id: "mas-velocita",
      topic: "cinematica",
      name: "velocit\xE0 (moto armonico semplice)",
      formula: "v = -A*omega*sin(omega*t + phi)",
      isolate: ["v", "A", "omega", "t", "phi"],
      difficulty: 5,
      conditions: []
    },
    {
      id: "mas-accelerazione",
      topic: "cinematica",
      name: "accelerazione (moto armonico semplice)",
      formula: "a = -omega^2*x",
      isolate: ["a", "omega", "x"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "omega-molla",
      topic: "cinematica",
      name: "pulsazione massa-molla",
      formula: "omega = sqrt(k/m)",
      isolate: ["omega", "k", "m"],
      difficulty: 3,
      conditions: ["m \u2260 0", "k \u2265 0"]
    },
    {
      id: "T-molla",
      topic: "cinematica",
      name: "periodo massa-molla",
      formula: "T = 2*pi*sqrt(m/k)",
      isolate: ["T", "m", "k"],
      difficulty: 4,
      conditions: ["k \u2260 0", "m \u2265 0"]
    },
    {
      id: "T-pendolo",
      topic: "cinematica",
      name: "periodo del pendolo semplice",
      formula: "T = 2*pi*sqrt(l/g)",
      isolate: ["T", "l", "g"],
      difficulty: 4,
      conditions: ["g \u2260 0", "l \u2265 0"],
      hypotheses: "Piccole oscillazioni."
    },
    // ============================ DINAMICA ============================
    {
      id: "F2-ma",
      topic: "dinamica",
      name: "secondo principio (due forze)",
      formula: "F1 + F2 = m*a",
      isolate: ["F1", "F2", "m", "a"],
      difficulty: 3,
      conditions: [],
      notes: "Seconda legge di Newton nel caso di due forze applicate."
    },
    {
      id: "attrito-statico",
      topic: "dinamica",
      name: "attrito statico massimo",
      formula: "fs = mu*N",
      isolate: ["fs", "mu", "N"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "piano-parallela",
      topic: "dinamica",
      name: "componente del peso parallela al piano",
      formula: "Fp = m*g*sin(theta)",
      isolate: ["Fp", "m", "g", "theta"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Piano inclinato di angolo theta."
    },
    {
      id: "piano-perp",
      topic: "dinamica",
      name: "componente del peso perpendicolare al piano",
      formula: "Fp = m*g*cos(theta)",
      isolate: ["Fp", "m", "g", "theta"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Piano inclinato di angolo theta."
    },
    {
      id: "piano-accel",
      topic: "dinamica",
      name: "accelerazione su piano inclinato (senza attrito)",
      formula: "a = g*sin(theta)",
      isolate: ["a", "g", "theta"],
      difficulty: 3,
      conditions: []
    },
    // ================= LAVORO, ENERGIA E POTENZA =================
    {
      id: "L-do-dp",
      topic: "lavoro, energia e potenza",
      name: "lavoro (forza e spostamento)",
      formula: "W = F*s*cos(theta)",
      isolate: ["W", "F", "s", "theta"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "P-Fv",
      topic: "lavoro, energia e potenza",
      name: "potenza istantanea",
      formula: "P = F*v",
      isolate: ["P", "F", "v"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "teorema-ec",
      topic: "lavoro, energia e potenza",
      name: "teorema dell'energia cinetica",
      formula: "W = 1/2*m*v^2 - 1/2*m*v0^2",
      isolate: ["W", "m", "v", "v0"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "Uel",
      topic: "lavoro, energia e potenza",
      name: "energia potenziale elastica",
      formula: "U = 1/2*k*x^2",
      isolate: ["U", "k", "x"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "conserv-energia",
      topic: "lavoro, energia e potenza",
      name: "conservazione dell'energia meccanica",
      formula: "Ec1 + Ep1 = Ec2 + Ep2",
      isolate: ["Ec1", "Ep1", "Ec2", "Ep2"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Solo forze conservative."
    },
    // ==================== QUANTITÀ DI MOTO E URTI ====================
    {
      id: "q-mv",
      topic: "quantit\xE0 di moto e urti",
      name: "quantit\xE0 di moto",
      formula: "p = m*v",
      isolate: ["p", "m", "v"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "impulso",
      topic: "quantit\xE0 di moto e urti",
      name: "impulso di una forza",
      formula: "J = F*t",
      isolate: ["J", "F", "t"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "impulso-dp",
      topic: "quantit\xE0 di moto e urti",
      name: "teorema dell'impulso (variazione q.d.m.)",
      formula: "J = m*v - m*v0",
      isolate: ["J", "m", "v", "v0"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "conserv-qdm",
      topic: "quantit\xE0 di moto e urti",
      name: "conservazione della quantit\xE0 di moto",
      formula: "m1*v1 = m2*v2",
      isolate: ["m1", "v1", "m2", "v2"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Sistema isolato."
    },
    {
      id: "urto-anelastico",
      topic: "quantit\xE0 di moto e urti",
      name: "urto completamente anelastico",
      formula: "V = (m1*v1 + m2*v2)/(m1 + m2)",
      isolate: ["V", "m1", "v1", "m2", "v2"],
      difficulty: 4,
      conditions: ["m1 + m2 \u2260 0"]
    },
    {
      id: "cm-due-corpi",
      topic: "quantit\xE0 di moto e urti",
      name: "centro di massa (due corpi)",
      formula: "xcm = (m1*x1 + m2*x2)/(m1 + m2)",
      isolate: ["xcm", "m1", "x1", "m2", "x2"],
      difficulty: 4,
      conditions: ["m1 + m2 \u2260 0"]
    },
    // ==================== CORPO RIGIDO E GRAVITAZIONE ====================
    {
      id: "momento-forza",
      topic: "corpo rigido e gravitazione",
      name: "momento di una forza",
      formula: "M = r*F*sin(theta)",
      isolate: ["M", "r", "F", "theta"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "tau-Ialpha",
      topic: "corpo rigido e gravitazione",
      name: "equazione della dinamica rotazionale",
      formula: "tau = I*alpha",
      isolate: ["tau", "I", "alpha"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "momento-inerzia",
      topic: "corpo rigido e gravitazione",
      name: "momento di inerzia (punti discreti)",
      formula: "I = m1*r1^2 + m2*r2^2",
      isolate: ["I", "m1", "r1", "m2", "r2"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "steiner",
      topic: "corpo rigido e gravitazione",
      name: "teorema di Huygens-Steiner",
      formula: "I = Icm + M*d^2",
      isolate: ["I", "Icm", "M", "d"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "Ec-rot",
      topic: "corpo rigido e gravitazione",
      name: "energia cinetica rotazionale",
      formula: "Ec = 1/2*I*omega^2",
      isolate: ["Ec", "I", "omega"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "conserv-L",
      topic: "corpo rigido e gravitazione",
      name: "conservazione del momento angolare",
      formula: "I1*omega1 = I2*omega2",
      isolate: ["I1", "omega1", "I2", "omega2"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Momento delle forze esterne nullo."
    },
    {
      id: "grav-universale",
      topic: "corpo rigido e gravitazione",
      name: "legge di gravitazione universale",
      formula: "F = G*(m1*m2)/r^2",
      isolate: ["F", "G", "m1", "m2", "r"],
      difficulty: 4,
      conditions: ["r \u2260 0"]
    },
    {
      id: "g-superficie",
      topic: "corpo rigido e gravitazione",
      name: "accelerazione di gravit\xE0 sulla superficie",
      formula: "g = G*M/R^2",
      isolate: ["g", "G", "M", "R"],
      difficulty: 4,
      conditions: ["R \u2260 0"]
    },
    {
      id: "U-gravit",
      topic: "corpo rigido e gravitazione",
      name: "energia potenziale gravitazionale universale",
      formula: "U = -G*(M*m)/r",
      isolate: ["U", "G", "M", "m", "r"],
      difficulty: 5,
      conditions: ["r \u2260 0"]
    },
    {
      id: "v-orbitale",
      topic: "corpo rigido e gravitazione",
      name: "velocit\xE0 orbitale (orbita circolare)",
      formula: "v = sqrt(G*M/r)",
      isolate: ["v", "G", "M", "r"],
      difficulty: 4,
      conditions: ["r \u2260 0", "G*M/r \u2265 0"]
    },
    {
      id: "v-fuga",
      topic: "corpo rigido e gravitazione",
      name: "velocit\xE0 di fuga",
      formula: "v = sqrt((2*G*M)/R)",
      isolate: ["v", "G", "M", "R"],
      difficulty: 4,
      conditions: ["R \u2260 0"]
    },
    {
      id: "keplero-3",
      topic: "corpo rigido e gravitazione",
      name: "terza legge di Keplero",
      formula: "T^2/a^3 = (4*pi^2)/(G*M)",
      isolate: ["T", "a", "G", "M"],
      difficulty: 5,
      conditions: ["a \u2260 0", "G*M \u2260 0"]
    },
    // ==================== PRESSIONE E FLUIDOSTATICA ====================
    {
      id: "stevino",
      topic: "pressione e fluidostatica",
      name: "legge di Stevino (pressione totale)",
      formula: "p = p0 + rho*g*h",
      isolate: ["p", "p0", "rho", "g", "h"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Legge di Stevino con pressione atmosferica superficiale p0.",
      tags: ["stevino", "stevin", "pressione atmosferica", "idrostatica", "profondita", "sub", "fondale"]
    },
    {
      id: "pascal",
      topic: "pressione e fluidostatica",
      name: "principio di Pascal (torchio idraulico)",
      formula: "F1/A1 = F2/A2",
      isolate: ["F1", "A1", "F2", "A2"],
      difficulty: 3,
      conditions: ["A1 \u2260 0", "A2 \u2260 0"],
      tags: ["pascal", "torchio idraulico", "freni", "pistone", "pressione"]
    },
    {
      id: "galleggia",
      topic: "pressione e fluidostatica",
      name: "condizione di galleggiamento (Archimede)",
      formula: "rho_corpo/rho_fluido = V_imm/V_tot",
      isolate: ["rho_corpo", "rho_fluido", "V_imm", "V_tot"],
      difficulty: 4,
      conditions: ["rho_fluido \u2260 0", "V_tot \u2260 0"],
      hypotheses: "Principio di Archimede applicato all'equilibrio di galleggiamento.",
      tags: ["archimede", "galleggiamento", "galleggia", "iceberg", "volume immerso", "spinta"]
    },
    // ============================ IDRODINAMICA ============================
    {
      id: "portata",
      topic: "idrodinamica",
      name: "portata volumetrica",
      formula: "Q = A*v",
      isolate: ["Q", "A", "v"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "continuita",
      topic: "idrodinamica",
      name: "equazione di continuit\xE0",
      formula: "A1*v1 = A2*v2",
      isolate: ["A1", "v1", "A2", "v2"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Fluido incomprimibile."
    },
    {
      id: "bernoulli",
      topic: "idrodinamica",
      name: "teorema di Bernoulli",
      formula: "p + 1/2*rho*v^2 + rho*g*z = cost",
      isolate: ["p", "rho", "v", "g", "z", "cost"],
      difficulty: 5,
      conditions: [],
      hypotheses: "Fluido ideale, regime stazionario."
    },
    {
      id: "torricelli",
      topic: "idrodinamica",
      name: "legge di Torricelli",
      formula: "v = sqrt(2*g*h)",
      isolate: ["v", "g", "h"],
      difficulty: 3,
      conditions: ["h \u2265 0"]
    },
    {
      id: "poiseuille",
      topic: "idrodinamica",
      name: "legge di Poiseuille",
      formula: "Q = (pi*r^4*(p1 - p2))/(8*eta*L)",
      isolate: ["Q", "r", "p1", "p2", "eta", "L"],
      difficulty: 5,
      conditions: ["eta \u2260 0", "L \u2260 0"],
      hypotheses: "Regime laminare, fluido viscoso."
    },
    // ============================ TERMOLOGIA ============================
    {
      id: "dilatazione-lineare-completa",
      topic: "termologia",
      name: "dilatazione termica lineare",
      formula: "l = l0 + lam*L0*(T - T0)",
      isolate: ["l", "l0", "lam", "L0", "T", "T0"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Solido isotropo; l0 (o L0) lunghezza iniziale, lam coeff. di dilatazione termica.",
      notes: "Dilatazione termica lineare: l = l\u2080 + \u03BB\xB7L\u2080\xB7(T \u2212 T\u2080)."
    },
    {
      id: "dilatazione-vol",
      topic: "termologia",
      name: "dilatazione volumetrica",
      formula: "dV = alpha*V0*dT",
      isolate: ["dV", "alpha", "V0", "dT"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "capacita-termica",
      topic: "termologia",
      name: "capacit\xE0 termica",
      formula: "C = m*c",
      isolate: ["C", "m", "c"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "calore-latente",
      topic: "termologia",
      name: "calore latente di transizione",
      formula: "Q = L*m",
      isolate: ["Q", "L", "m"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "boyle",
      topic: "termologia",
      name: "legge di Boyle (isoterma)",
      formula: "p1*V1 = p2*V2",
      isolate: ["p1", "V1", "p2", "V2"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Trasformazione isoterma di un gas."
    },
    {
      id: "gaylussac",
      topic: "termologia",
      name: "legge di Gay-Lussac (isobara)",
      formula: "V1/T1 = V2/T2",
      isolate: ["V1", "T1", "V2", "T2"],
      difficulty: 3,
      conditions: ["T1 \u2260 0", "T2 \u2260 0"]
    },
    {
      id: "charles",
      topic: "termologia",
      name: "legge di Charles (isocora)",
      formula: "p1/T1 = p2/T2",
      isolate: ["p1", "T1", "p2", "T2"],
      difficulty: 3,
      conditions: ["T1 \u2260 0", "T2 \u2260 0"]
    },
    {
      id: "equilibrio-termico",
      topic: "termologia",
      name: "temperatura di equilibrio termico",
      formula: "Te = (m1*c1*T1 + m2*c2*T2)/(m1*c1 + m2*c2)",
      isolate: ["Te", "m1", "c1", "T1", "m2", "c2", "T2"],
      difficulty: 5,
      conditions: ["m1*c1 + m2*c2 \u2260 0"]
    },
    // ============================ TERMODINAMICA ============================
    {
      id: "equipartizione",
      topic: "termodinamica",
      name: "energia interna (equipartizione)",
      formula: "U = f/2*n*R*T",
      isolate: ["U", "f", "n", "R", "T"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "mayer",
      topic: "termodinamica",
      name: "relazione di Mayer",
      formula: "Cp - Cv = R",
      isolate: ["Cp", "Cv", "R"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "primo-principio",
      topic: "termodinamica",
      name: "primo principio della termodinamica",
      formula: "dU = Q - W",
      isolate: ["dU", "Q", "W"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "lavoro-isobaro",
      topic: "termodinamica",
      name: "lavoro termodinamico isobaro",
      formula: "W = p*dV",
      isolate: ["W", "p", "dV"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "rendimento-carnot",
      topic: "termodinamica",
      name: "rendimento di Carnot",
      formula: "eta = 1 - Tc/Th",
      isolate: ["eta", "Tc", "Th"],
      difficulty: 4,
      conditions: ["Th \u2260 0"],
      hypotheses: "Macchina reversibile tra due sorgenti."
    },
    {
      id: "lavoro-isoterma",
      topic: "termodinamica",
      name: "lavoro in isoterma reversibile",
      formula: "W = n*R*T*ln(V2/V1)",
      isolate: ["W", "n", "R", "T", "V2", "V1"],
      difficulty: 5,
      conditions: ["V1 \u2260 0"]
    },
    // ============================ ONDE E ACUSTICA ============================
    {
      id: "onda-v-lam-f",
      topic: "onde e acustica",
      name: "velocit\xE0 di propagazione dell'onda (suono e luce)",
      formula: "v = lam*f",
      isolate: ["v", "lam", "f"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Relazione fondamentale tra velocit\xE0 dell'onda sonora o elettromagnetica, lunghezza d'onda e frequenza.",
      tags: ["suono", "onda", "acustica", "velocita del suono", "lunghezza d onda", "frequenza"]
    },
    {
      id: "onda-periodo-frequenza",
      topic: "onde e acustica",
      name: "relazione frequenza-periodo sonoro",
      formula: "f = 1/T",
      isolate: ["f", "T"],
      difficulty: 1,
      conditions: ["T \u2260 0"],
      hypotheses: "Frequenza sonora come inverso del periodo di oscillazione T.",
      tags: ["suono", "onda", "acustica", "frequenza", "periodo", "tempo"]
    },
    {
      id: "onda-v-lam-T",
      topic: "onde e acustica",
      name: "velocit\xE0 d'onda in funzione del periodo",
      formula: "v = lam/T",
      isolate: ["v", "lam", "T"],
      difficulty: 2,
      conditions: ["T \u2260 0"],
      hypotheses: "Velocit\xE0 di propagazione del suono calcolata a partire dal periodo T.",
      tags: ["suono", "onda", "acustica", "velocita", "periodo", "lunghezza d onda"]
    },
    {
      id: "doppler-avvicinamento-sorgente",
      topic: "onde e acustica",
      name: "effetto Doppler (sorgente sonora in avvicinamento)",
      formula: "fp = (f*v)/(v - vs)",
      isolate: ["fp", "f", "v", "vs"],
      difficulty: 4,
      conditions: ["v - vs \u2260 0"],
      hypotheses: "Sorgente sonora in avvicinamento verso osservatore fermo. v = velocit\xE0 del suono nell'aria, vs = velocit\xE0 sorgente, f = frequenza emessa, fp = frequenza percepita.",
      tags: ["doppler", "suono", "effetto doppler", "acustica", "sorgente in moto", "ambulanza", "avvicinamento", "frequenza"]
    },
    {
      id: "doppler-allontanamento-sorgente",
      topic: "onde e acustica",
      name: "effetto Doppler (sorgente sonora in allontanamento)",
      formula: "fp = (f*v)/(v + vs)",
      isolate: ["fp", "f", "v", "vs"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Sorgente sonora che si allontana dall'osservatore fermo. La frequenza percepita fp diminuisce rispetto alla frequenza emessa f.",
      tags: ["doppler", "suono", "effetto doppler", "acustica", "sorgente in moto", "sirena", "allontanamento", "frequenza"]
    },
    {
      id: "doppler-avvicinamento-osservatore",
      topic: "onde e acustica",
      name: "effetto Doppler (osservatore in avvicinamento)",
      formula: "fp = f*(v + vo)/v",
      isolate: ["fp", "f", "v", "vo"],
      difficulty: 3,
      conditions: ["v \u2260 0"],
      hypotheses: "Osservatore in moto con velocit\xE0 vo verso una sorgente sonora ferma.",
      tags: ["doppler", "suono", "effetto doppler", "acustica", "osservatore in moto", "avvicinamento"]
    },
    {
      id: "doppler-allontanamento-osservatore",
      topic: "onde e acustica",
      name: "effetto Doppler (osservatore in allontanamento)",
      formula: "fp = f*(v - vo)/v",
      isolate: ["fp", "f", "v", "vo"],
      difficulty: 3,
      conditions: ["v \u2260 0"],
      hypotheses: "Osservatore in allontanamento con velocit\xE0 vo dalla sorgente sonora ferma.",
      tags: ["doppler", "suono", "effetto doppler", "acustica", "osservatore in moto", "allontanamento"]
    },
    {
      id: "eco-suono",
      topic: "onde e acustica",
      name: "eco e sonar (riflessione del suono)",
      formula: "2*d = v*t",
      isolate: ["d", "v", "t"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Onda sonora che compie il percorso di andata e ritorno (2*d) a velocit\xE0 v nel tempo totale t.",
      tags: ["suono", "eco", "sonar", "acustica", "riflessione", "distanza ostacolo", "tempo di ritorno"]
    },
    {
      id: "intensita-sonora",
      topic: "onde e acustica",
      name: "intensit\xE0 sonora (onda sferica)",
      formula: "I = P/(4*pi*r^2)",
      isolate: ["I", "P", "r"],
      difficulty: 4,
      conditions: ["r \u2260 0"],
      hypotheses: "Intensit\xE0 I dell'onda sonora a distanza r da sorgente puntiforme isotropa di potenza acustica P.",
      tags: ["suono", "intensita sonora", "acustica", "decibel", "potenza acustica", "propagazione", "sfera"]
    },
    {
      id: "battimenti-sonori",
      topic: "onde e acustica",
      name: "frequenza dei battimenti sonori",
      formula: "fb = f1 - f2",
      isolate: ["fb", "f1", "f2"],
      difficulty: 1,
      conditions: [],
      hypotheses: "Battimenti sonori percepiti per sovrapposizione di due onde di frequenze vicine f1 > f2.",
      tags: ["suono", "battimenti", "acustica", "interferenza", "accordatore", "frequenze"]
    },
    {
      id: "canne-organo-aperte",
      topic: "onde e acustica",
      name: "frequenza fondamentale di una canna d'organo aperta",
      formula: "f = v/(2*L)",
      isolate: ["f", "v", "L"],
      difficulty: 2,
      conditions: ["L \u2260 0"],
      hypotheses: "Tubo o canna sonora aperta a entrambe le estremit\xE0 di lunghezza L. v = velocit\xE0 del suono nell'aria.",
      tags: ["suono", "canne d organo", "tubo sonoro", "acustica", "musica", "risonanza"]
    },
    {
      id: "corda-armonica",
      topic: "onde e acustica",
      name: "legge di Mersenne (corda vibrante)",
      formula: "f = (1/(2*L))*sqrt(T/mu)",
      isolate: ["f", "L", "T", "mu"],
      difficulty: 5,
      conditions: ["L \u2260 0", "mu \u2260 0"],
      hypotheses: "Frequenza della nota fondamentale emessa da una corda di lunghezza L tesa con forza T e densit\xE0 lineare mu.",
      tags: ["suono", "mersenne", "corda vibrante", "chitarra", "musica", "acustica", "tensione"]
    },
    // ============================ ELETTROSTATICA ============================
    {
      id: "coulomb",
      topic: "elettrostatica",
      name: "legge di Coulomb",
      formula: "F = (1/(4*pi*eps0))*(q1*q2)/r^2",
      isolate: ["F", "q1", "q2", "r", "eps0"],
      difficulty: 5,
      conditions: ["r \u2260 0", "eps0 \u2260 0"]
    },
    {
      id: "campo-carica",
      topic: "elettrostatica",
      name: "campo elettrico di una carica puntiforme",
      formula: "E = (1/(4*pi*eps0))*q/r^2",
      isolate: ["E", "q", "r", "eps0"],
      difficulty: 5,
      conditions: ["r \u2260 0", "eps0 \u2260 0"]
    },
    {
      id: "forza-campo",
      topic: "elettrostatica",
      name: "forza su una carica in campo elettrico",
      formula: "F = q*E",
      isolate: ["F", "q", "E"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "gauss-elettrico",
      topic: "elettrostatica",
      name: "legge di Gauss (flusso del campo elettrico)",
      formula: "Phi = q/eps0",
      isolate: ["Phi", "q", "eps0"],
      difficulty: 5,
      conditions: ["eps0 \u2260 0"]
    },
    {
      id: "energia-coulomb",
      topic: "elettrostatica",
      name: "energia potenziale elettrostatica",
      formula: "U = (1/(4*pi*eps0))*(q1*q2)/r",
      isolate: ["U", "q1", "q2", "r", "eps0"],
      difficulty: 5,
      conditions: ["r \u2260 0", "eps0 \u2260 0"]
    },
    {
      id: "potenziale-carica",
      topic: "elettrostatica",
      name: "potenziale elettrico di una carica",
      formula: "V = (1/(4*pi*eps0))*q/r",
      isolate: ["V", "q", "r", "eps0"],
      difficulty: 5,
      conditions: ["r \u2260 0", "eps0 \u2260 0"]
    },
    {
      id: "E-dV-d",
      topic: "elettrostatica",
      name: "campo elettrico uniforme (relazione con la tensione)",
      formula: "E = V/d",
      isolate: ["E", "V", "d"],
      difficulty: 3,
      conditions: ["d \u2260 0"]
    },
    {
      id: "capacita-cond",
      topic: "elettrostatica",
      name: "capacit\xE0 di un condensatore",
      formula: "C = Q/V",
      isolate: ["C", "Q", "V"],
      difficulty: 3,
      conditions: ["V \u2260 0"]
    },
    {
      id: "energia-condensatore",
      topic: "elettrostatica",
      name: "energia immagazzinata in un condensatore",
      formula: "U = 1/2*C*V^2",
      isolate: ["U", "C", "V"],
      difficulty: 4,
      conditions: []
    },
    // ============================ MAGNETOSTATICA ============================
    {
      id: "lorentz",
      topic: "magnetostatica",
      name: "forza di Lorentz",
      formula: "F = q*v*B*sin(theta)",
      isolate: ["F", "q", "v", "B", "theta"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "raggio-lorentz",
      topic: "magnetostatica",
      name: "raggio di curvatura (carica in campo magnetico)",
      formula: "r = (m*v)/(q*B)",
      isolate: ["r", "m", "v", "q", "B"],
      difficulty: 4,
      conditions: ["q \u2260 0", "B \u2260 0"]
    },
    {
      id: "laplace",
      topic: "magnetostatica",
      name: "forza di Laplace",
      formula: "F = I*L*B*sin(theta)",
      isolate: ["F", "I", "L", "B", "theta"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "biot-savart",
      topic: "magnetostatica",
      name: "campo magnetico di un filo rettilineo",
      formula: "B = (mu0*I)/(2*pi*r)",
      isolate: ["B", "mu0", "I", "r"],
      difficulty: 4,
      conditions: ["r \u2260 0"]
    },
    {
      id: "bobina-centro",
      topic: "magnetostatica",
      name: "campo magnetico al centro di una spira",
      formula: "B = (mu0*I)/(2*R)",
      isolate: ["B", "mu0", "I", "R"],
      difficulty: 4,
      conditions: ["R \u2260 0"]
    },
    {
      id: "solenoide",
      topic: "magnetostatica",
      name: "campo magnetico in un solenoide",
      formula: "B = mu0*(N/L)*I",
      isolate: ["B", "mu0", "N", "L", "I"],
      difficulty: 4,
      conditions: ["L \u2260 0"]
    },
    // ============================ CIRCUITI ELETTRICI ============================
    {
      id: "ohm-2-fis",
      topic: "circuiti elettrici",
      name: "seconda legge di Ohm",
      formula: "R = rho*L/A",
      isolate: ["R", "rho", "L", "A"],
      difficulty: 3,
      conditions: ["A \u2260 0"]
    },
    {
      id: "resistivita-temp",
      topic: "circuiti elettrici",
      name: "resistivit\xE0 in funzione della temperatura",
      formula: "rho = rho0*(1 + alpha*dT)",
      isolate: ["rho", "rho0", "alpha", "dT"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "potenza-joule",
      topic: "circuiti elettrici",
      name: "potenza ed effetto Joule",
      formula: "P = R*I^2",
      isolate: ["P", "R", "I"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "resistori-serie",
      topic: "circuiti elettrici",
      name: "resistori in serie",
      formula: "Req = R1 + R2",
      isolate: ["Req", "R1", "R2"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "resistori-parallelo",
      topic: "circuiti elettrici",
      name: "resistori in parallelo",
      formula: "Req = (R1*R2)/(R1 + R2)",
      isolate: ["Req", "R1", "R2"],
      difficulty: 3,
      conditions: ["R1 + R2 \u2260 0"]
    },
    {
      id: "condensatori-parallelo",
      topic: "circuiti elettrici",
      name: "condensatori in parallelo",
      formula: "Ceq = C1 + C2",
      isolate: ["Ceq", "C1", "C2"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "condensatori-serie",
      topic: "circuiti elettrici",
      name: "condensatori in serie",
      formula: "Ceq = (C1*C2)/(C1 + C2)",
      isolate: ["Ceq", "C1", "C2"],
      difficulty: 3,
      conditions: ["C1 + C2 \u2260 0"]
    },
    {
      id: "rc-costante",
      topic: "circuiti elettrici",
      name: "costante di tempo RC",
      formula: "tau = R*C",
      isolate: ["tau", "R", "C"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "rl-costante",
      topic: "circuiti elettrici",
      name: "costante di tempo RL",
      formula: "tau = L/R",
      isolate: ["tau", "L", "R"],
      difficulty: 2,
      conditions: ["R \u2260 0"]
    },
    {
      id: "valori-efficaci",
      topic: "circuiti elettrici",
      name: "valore efficace (tensione alternata)",
      formula: "Veff = Vmax/sqrt(2)",
      isolate: ["Veff", "Vmax"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "reattanza-ind",
      topic: "circuiti elettrici",
      name: "reattanza induttiva",
      formula: "XL = omega*L",
      isolate: ["XL", "omega", "L"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "reattanza-cap",
      topic: "circuiti elettrici",
      name: "reattanza capacitiva",
      formula: "XC = 1/(omega*C)",
      isolate: ["XC", "omega", "C"],
      difficulty: 3,
      conditions: ["omega \u2260 0", "C \u2260 0"]
    },
    {
      id: "impedenza-rlc",
      topic: "circuiti elettrici",
      name: "impedenza di un circuito RLC in serie",
      formula: "Z = sqrt(R^2 + (XL - XC)^2)",
      isolate: ["Z", "R", "XL", "XC"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "risonanza-rlc",
      topic: "circuiti elettrici",
      name: "frequenza di risonanza RLC",
      formula: "f0 = 1/(2*pi*sqrt(L*C))",
      isolate: ["f0", "L", "C"],
      difficulty: 5,
      conditions: ["L \u2260 0", "C \u2260 0"]
    },
    {
      id: "potenza-media-ac",
      topic: "circuiti elettrici",
      name: "potenza media in corrente alternata",
      formula: "P = Veff*Ieff*cos(phi)",
      isolate: ["P", "Veff", "Ieff", "phi"],
      difficulty: 4,
      conditions: []
    },
    // ============================ ELETTROMAGNETISMO ============================
    {
      id: "flusso-magnetico",
      topic: "elettromagnetismo",
      name: "flusso del campo magnetico",
      formula: "PhiB = B*A*cos(theta)",
      isolate: ["PhiB", "B", "A", "theta"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "faraday",
      topic: "elettromagnetismo",
      name: "legge di Faraday-Neumann-Lenz",
      formula: "fem = PhiB/t",
      isolate: ["fem", "PhiB", "t"],
      difficulty: 4,
      conditions: ["t \u2260 0"],
      notes: "Forma semplificata con il flusso medio; la forma completa usa la derivata."
    },
    {
      id: "fem-cinetica",
      topic: "elettromagnetismo",
      name: "forza elettromotrice cinetica",
      formula: "fem = B*L*v",
      isolate: ["fem", "B", "L", "v"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Sbarra conduttrice in moto in campo magnetico uniforme."
    },
    {
      id: "autoinduzione",
      topic: "elettromagnetismo",
      name: "flusso di autoinduzione",
      formula: "PhiB = L*I",
      isolate: ["PhiB", "L", "I"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "energia-induttanza",
      topic: "elettromagnetismo",
      name: "energia immagazzinata in un'induttanza",
      formula: "U = 1/2*L*I^2",
      isolate: ["U", "L", "I"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "densita-energia",
      topic: "elettromagnetismo",
      name: "densit\xE0 di energia del campo elettrico",
      formula: "u = 1/2*eps0*E^2",
      isolate: ["u", "eps0", "E"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "corrente-spostamento",
      topic: "elettromagnetismo",
      name: "corrente di spostamento di Maxwell",
      formula: "Id = eps0*PhiE/t",
      isolate: ["Id", "eps0", "PhiE", "t"],
      difficulty: 5,
      conditions: ["t \u2260 0"]
    },
    {
      id: "velocita-luce",
      topic: "elettromagnetismo",
      name: "velocit\xE0 della luce nel vuoto (Maxwell)",
      formula: "c = 1/sqrt(eps0*mu0)",
      isolate: ["c", "eps0", "mu0"],
      difficulty: 4,
      conditions: ["eps0 \u2260 0", "mu0 \u2260 0"]
    },
    {
      id: "onda-E-B",
      topic: "elettromagnetismo",
      name: "relazione d'onda tra campo elettrico e magnetico",
      formula: "E = c*B",
      isolate: ["E", "c", "B"],
      difficulty: 3,
      conditions: []
    },
    // ============================ OTTICA ============================
    {
      id: "indice-rifrazione",
      topic: "ottica",
      name: "indice di rifrazione",
      formula: "n = c/v",
      isolate: ["n", "c", "v"],
      difficulty: 2,
      conditions: ["v \u2260 0"]
    },
    {
      id: "snell",
      topic: "ottica",
      name: "legge di Snell (rifrazione)",
      formula: "n1*sin(theta1) = n2*sin(theta2)",
      isolate: ["n1", "theta1", "n2", "theta2"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "angolo-limite",
      topic: "ottica",
      name: "angolo limite (riflessione totale)",
      formula: "sin(thetaL) = n2/n1",
      isolate: ["thetaL", "n1", "n2"],
      difficulty: 4,
      conditions: ["n1 \u2260 0"],
      hypotheses: "Passaggio da mezzo pi\xF9 denso a meno denso."
    },
    {
      id: "lenti-sottili",
      topic: "ottica",
      name: "equazione dei punti coniugati (lenti sottili)",
      formula: "1/f = 1/p + 1/q",
      isolate: ["f", "p", "q"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "ingrandimento",
      topic: "ottica",
      name: "ingrandimento trasversale",
      formula: "G = -q/p",
      isolate: ["G", "q", "p"],
      difficulty: 3,
      conditions: ["p \u2260 0"]
    },
    {
      id: "young-massimi",
      topic: "ottica",
      name: "interferenza di Young (massimi)",
      formula: "d*sin(theta) = k*lam",
      isolate: ["d", "theta", "k", "lam"],
      difficulty: 5,
      conditions: [],
      hypotheses: "Esperimento delle due fenditure."
    },
    // ============================ RELATIVITÀ ============================
    {
      id: "fattore-lorentz",
      topic: "relativit\xE0",
      name: "fattore di Lorentz",
      formula: "gamma = 1/sqrt(1 - v^2/c^2)",
      isolate: ["gamma", "v", "c"],
      difficulty: 5,
      conditions: ["c \u2260 0", "1 - v^2/c^2 \u2265 0"]
    },
    {
      id: "dilatazione-tempi",
      topic: "relativit\xE0",
      name: "dilatazione dei tempi",
      formula: "dt = gamma*dt0",
      isolate: ["dt", "gamma", "dt0"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "contrazione-lunghezze",
      topic: "relativit\xE0",
      name: "contrazione delle lunghezze",
      formula: "L = L0/gamma",
      isolate: ["L", "L0", "gamma"],
      difficulty: 4,
      conditions: ["gamma \u2260 0"]
    },
    {
      id: "composizione-velocita",
      topic: "relativit\xE0",
      name: "composizione relativistica delle velocit\xE0",
      formula: "u = (u1 + v)/(1 + (u1*v)/c^2)",
      isolate: ["u", "u1", "v", "c"],
      difficulty: 5,
      conditions: ["c \u2260 0", "1 + (u1*v)/c^2 \u2260 0"],
      hypotheses: "Somma relativistica di velocit\xE0 in una dimensione."
    },
    {
      id: "qdm-relativistica",
      topic: "relativit\xE0",
      name: "quantit\xE0 di moto relativistica",
      formula: "p = gamma*m*v",
      isolate: ["p", "gamma", "m", "v"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "energia-riposo",
      topic: "relativit\xE0",
      name: "energia a riposo",
      formula: "E0 = m*c^2",
      isolate: ["E0", "m", "c"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "energia-relativistica",
      topic: "relativit\xE0",
      name: "energia totale relativistica",
      formula: "E = gamma*m*c^2",
      isolate: ["E", "gamma", "m", "c"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "invariante-energia-impulso",
      topic: "relativit\xE0",
      name: "invariante energia-impulso",
      formula: "E^2 - (p*c)^2 = (m*c^2)^2",
      isolate: ["E", "p", "c", "m"],
      difficulty: 5,
      conditions: []
    },
    // ============================ FISICA MODERNA ============================
    {
      id: "planck-einstein",
      topic: "fisica moderna",
      name: "energia del fotone (Planck-Einstein)",
      formula: "E = h*nu",
      isolate: ["E", "h", "nu"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "fotoelettrico",
      topic: "fisica moderna",
      name: "effetto fotoelettrico (energia cinetica massima)",
      formula: "Ek = h*nu - W0",
      isolate: ["Ek", "h", "nu", "W0"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "compton",
      topic: "fisica moderna",
      name: "effetto Compton (spostamento di lunghezza d'onda)",
      formula: "dlam = (h/(m*c))*(1 - cos(theta))",
      isolate: ["dlam", "h", "m", "c", "theta"],
      difficulty: 5,
      conditions: ["m \u2260 0", "c \u2260 0"]
    },
    {
      id: "de-broglie",
      topic: "fisica moderna",
      name: "lunghezza d'onda di De Broglie",
      formula: "lam = h/(m*v)",
      isolate: ["lam", "h", "m", "v"],
      difficulty: 4,
      conditions: ["m \u2260 0", "v \u2260 0"]
    },
    {
      id: "bohr-raggio",
      topic: "fisica moderna",
      name: "raggio delle orbite di Bohr",
      formula: "rn = n^2*r1",
      isolate: ["rn", "n", "r1"],
      difficulty: 4,
      conditions: []
    },
    {
      id: "bohr-energia",
      topic: "fisica moderna",
      name: "livelli energetici di Bohr",
      formula: "En = -E1/n^2",
      isolate: ["En", "E1", "n"],
      difficulty: 4,
      conditions: ["n \u2260 0"]
    }
  ];

  // js/formulas.js
  var TOPICS = [
    "cinematica",
    "dinamica",
    "lavoro, energia e potenza",
    "quantit\xE0 di moto e urti",
    "corpo rigido e gravitazione",
    "pressione e fluidostatica",
    "idrodinamica",
    "termologia",
    "termodinamica",
    "onde e acustica",
    "elettricit\xE0",
    "elettrostatica",
    "magnetostatica",
    "circuiti elettrici",
    "elettromagnetismo",
    "ottica",
    "relativit\xE0",
    "fisica moderna",
    "geometria",
    "proporzionalit\xE0",
    "algebra"
  ];
  var FORMULAS = [
    // --- CINEMATICA ---
    {
      id: "v-st",
      topic: "cinematica",
      name: "velocit\xE0 (moto uniforme)",
      formula: "v = s/t",
      isolate: ["v", "s", "t"],
      difficulty: 1,
      conditions: ["t \u2260 0"],
      hypotheses: "Moto rettilineo uniforme; t \xE8 l'intervallo di tempo.",
      notes: "Formula fondamentale del moto uniforme."
    },
    {
      id: "s-vt",
      topic: "cinematica",
      name: "spazio percorso",
      formula: "s = v*t",
      isolate: ["s", "v", "t"],
      difficulty: 1,
      conditions: [],
      notes: "Prodotto diretto: le inverse richiedono una divisione."
    },
    {
      id: "a-dvdt",
      topic: "cinematica",
      name: "accelerazione",
      formula: "a = (v - v0)/t",
      isolate: ["a", "v", "v0", "t"],
      difficulty: 2,
      conditions: ["t \u2260 0"],
      hypotheses: "Moto uniformemente accelerato."
    },
    {
      id: "v-at",
      topic: "cinematica",
      name: "velocit\xE0 (da accelerazione)",
      formula: "v = v0 + a*t",
      isolate: ["v", "v0", "a", "t"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "s-half-at2",
      topic: "cinematica",
      name: "spazio (moto accelerato, da fermo)",
      formula: "s = 1/2*a*t^2",
      isolate: ["s", "a", "t"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Velocit\xE0 iniziale nulla."
    },
    // --- DINAMICA ---
    {
      id: "F-ma",
      topic: "dinamica",
      name: "forza (secondo principio)",
      formula: "F = m*a",
      isolate: ["F", "m", "a"],
      difficulty: 1,
      conditions: [],
      notes: "Seconda legge di Newton."
    },
    {
      id: "P-mg",
      topic: "dinamica",
      name: "forza peso",
      formula: "P = m*g",
      isolate: ["P", "m", "g"],
      difficulty: 1,
      conditions: [],
      hypotheses: "g \u2248 9,81 m/s\xB2 (accelerazione di gravit\xE0)."
    },
    {
      id: "Fmu",
      topic: "dinamica",
      name: "forza di attrito",
      formula: "Fa = mu*N",
      isolate: ["Fa", "mu", "N"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "F-el",
      topic: "dinamica",
      name: "forza elastica (Hooke)",
      formula: "F = k*x",
      isolate: ["F", "k", "x"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Legge di Hooke, entro il limite di elasticit\xE0."
    },
    // --- LAVORO, ENERGIA, POTENZA ---
    {
      id: "L-Fs",
      topic: "lavoro, energia e potenza",
      name: "lavoro",
      formula: "L = F*s",
      isolate: ["L", "F", "s"],
      difficulty: 1,
      conditions: []
    },
    {
      id: "P-Lt",
      topic: "lavoro, energia e potenza",
      name: "potenza",
      formula: "P = L/t",
      isolate: ["P", "L", "t"],
      difficulty: 2,
      conditions: ["t \u2260 0"]
    },
    {
      id: "Ec",
      topic: "lavoro, energia e potenza",
      name: "energia cinetica",
      formula: "Ec = 1/2*m*v^2",
      isolate: ["Ec", "m", "v"],
      difficulty: 3,
      conditions: [],
      notes: "Per ricavare v serve la radice quadrata e il segno \xB1."
    },
    {
      id: "Ep",
      topic: "lavoro, energia e potenza",
      name: "energia potenziale gravitazionale",
      formula: "Ep = m*g*h",
      isolate: ["Ep", "m", "g", "h"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "eta",
      topic: "lavoro, energia e potenza",
      name: "rendimento",
      formula: "eta = Lu/Lt",
      isolate: ["eta", "Lu", "Lt"],
      difficulty: 2,
      conditions: ["Lt \u2260 0"]
    },
    // --- PRESSIONE E FLUIDOSTATICA ---
    {
      id: "p-FS",
      topic: "pressione e fluidostatica",
      name: "pressione",
      formula: "p = F/S",
      isolate: ["p", "F", "S"],
      difficulty: 1,
      conditions: ["S \u2260 0"]
    },
    {
      id: "rho-mV",
      topic: "pressione e fluidostatica",
      name: "densit\xE0",
      formula: "rho = m/V",
      isolate: ["rho", "m", "V"],
      difficulty: 2,
      conditions: ["V \u2260 0"]
    },
    {
      id: "ph-rhoghh",
      topic: "pressione e fluidostatica",
      name: "pressione idrostatica (legge di Stevino)",
      formula: "p = rho*g*h",
      isolate: ["p", "rho", "g", "h"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Legge di Stevino: la pressione idrostatica dipende dalla densit\xE0 del fluido, da g e dalla profondit\xE0 h.",
      notes: "Legge di Stevino per fluidi incomprimibili.",
      tags: ["stevino", "stevin", "idrostatica", "pressione", "fluido", "liquido", "profondita", "colonna"]
    },
    {
      id: "legge-archimede",
      topic: "pressione e fluidostatica",
      name: "spinta di Archimede (principio di Archimede)",
      formula: "S = rho*g*V",
      isolate: ["S", "rho", "g", "V"],
      difficulty: 3,
      conditions: [],
      hypotheses: "Principio di Archimede: la spinta verso l'alto \xE8 pari al peso del volume di fluido spostato.",
      notes: "Principio di Archimede per corpi immersi in un fluido.",
      tags: ["archimede", "spinta", "galleggiamento", "idrostatica", "peso apparente", "volume immerso", "fluido", "densita"]
    },
    // --- ELETTRICITÀ ---
    {
      id: "V-RI",
      topic: "elettricit\xE0",
      name: "differenza di potenziale",
      formula: "V = R*I",
      isolate: ["V", "R", "I"],
      difficulty: 1,
      conditions: [],
      notes: "Prima legge di Ohm."
    },
    {
      id: "P-VI",
      topic: "elettricit\xE0",
      name: "potenza elettrica",
      formula: "P = V*I",
      isolate: ["P", "V", "I"],
      difficulty: 1,
      conditions: []
    },
    {
      id: "I-qt",
      topic: "elettricit\xE0",
      name: "intensit\xE0 di corrente",
      formula: "I = q/t",
      isolate: ["I", "q", "t"],
      difficulty: 2,
      conditions: ["t \u2260 0"]
    },
    {
      id: "R-rhoLS",
      topic: "elettricit\xE0",
      name: "seconda legge di Ohm",
      formula: "R = (rho*L)/S",
      isolate: ["R", "rho", "L", "S"],
      difficulty: 3,
      conditions: ["S \u2260 0"]
    },
    {
      id: "capacita",
      topic: "elettricit\xE0",
      name: "capacit\xE0 di un condensatore piano",
      formula: "C = (eps*S)/d",
      isolate: ["C", "eps", "S", "d"],
      difficulty: 4,
      conditions: ["d \u2260 0"]
    },
    // --- TERMOLOGIA ---
    {
      id: "Q-cmtd",
      topic: "termologia",
      name: "calore (equilibrio termico)",
      formula: "Q = c*m*dT",
      isolate: ["Q", "c", "m", "dT"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "dilatazione",
      topic: "termologia",
      name: "dilatazione lineare",
      formula: "dl = lam*L0*dT",
      isolate: ["dl", "lam", "L0", "dT"],
      difficulty: 3,
      conditions: []
    },
    {
      id: "gas-perfetti",
      topic: "termologia",
      name: "legge dei gas perfetti",
      formula: "p*V = n*R*T",
      isolate: ["p", "V", "n", "R", "T"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Gas perfetto."
    },
    // --- GEOMETRIA ---
    {
      id: "A-bh",
      topic: "geometria",
      name: "area del rettangolo",
      formula: "A = b*h",
      isolate: ["A", "b", "h"],
      difficulty: 1,
      conditions: []
    },
    {
      id: "C-2pir",
      topic: "geometria",
      name: "circonferenza",
      formula: "C = 2*pi*r",
      isolate: ["C", "r"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "A-pir2",
      topic: "geometria",
      name: "area del cerchio",
      formula: "A = pi*r^2",
      isolate: ["A", "r"],
      difficulty: 3,
      conditions: ["r \u2265 0"],
      notes: "Per ricavare r serve la radice quadrata; r \u2265 0 per significato geometrico."
    },
    {
      id: "A-bh2",
      topic: "geometria",
      name: "area del triangolo",
      formula: "A = (b*h)/2",
      isolate: ["A", "b", "h"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "V-prisma",
      topic: "geometria",
      name: "volume del parallelepipedo",
      formula: "V = a*b*c",
      isolate: ["V", "a", "b", "c"],
      difficulty: 2,
      conditions: []
    },
    {
      id: "pitagora",
      topic: "geometria",
      name: "teorema di Pitagora",
      formula: "ip = sqrt(c1^2 + c2^2)",
      isolate: ["ip", "c1", "c2"],
      difficulty: 4,
      conditions: ["c1^2 + c2^2 \u2265 0"]
    },
    // --- PROPORZIONALITÀ ---
    {
      id: "prop",
      topic: "proporzionalit\xE0",
      name: "proporzione",
      formula: "a/b = c/d",
      isolate: ["a", "b", "c", "d"],
      difficulty: 3,
      conditions: ["b \u2260 0", "d \u2260 0"],
      notes: "Ideale per la moltiplicazione incrociata e l'inversione."
    },
    {
      id: "proporz-dir",
      topic: "proporzionalit\xE0",
      name: "proporzionalit\xE0 diretta",
      formula: "y = k*x",
      isolate: ["y", "k", "x"],
      difficulty: 1,
      conditions: []
    },
    {
      id: "proporz-inv",
      topic: "proporzionalit\xE0",
      name: "proporzionalit\xE0 inversa",
      formula: "y = k/x",
      isolate: ["y", "k", "x"],
      difficulty: 2,
      conditions: ["x \u2260 0"]
    },
    // --- ALGEBRA ---
    {
      id: "alg-lin",
      topic: "algebra",
      name: "equazione lineare",
      formula: "x + a = b",
      isolate: ["x"],
      difficulty: 2,
      conditions: [],
      notes: "Esempio dei principi di equivalenza con termini additivi."
    },
    {
      id: "alg-prod",
      topic: "algebra",
      name: "prodotto",
      formula: "a = b*c",
      isolate: ["a", "b", "c"],
      difficulty: 1,
      conditions: []
    },
    {
      id: "alg-distr",
      topic: "algebra",
      name: "equazione con parentesi",
      formula: "a*(x + b) = c",
      isolate: ["x"],
      difficulty: 4,
      conditions: ["a \u2260 0"],
      notes: "Richiede distribuzione o raccoglimento."
    },
    {
      id: "alg-quadrato",
      topic: "algebra",
      name: "quadrato",
      formula: "y = a*x^2",
      isolate: ["y", "a", "x"],
      difficulty: 4,
      conditions: ["a \u2260 0"],
      notes: "Per isolare x: divisione per a, poi radice quadrata con segno \xB1."
    },
    {
      id: "alg-multi",
      topic: "algebra",
      name: "formula a pi\xF9 fattori",
      formula: "z = a*b/c",
      isolate: ["z", "a", "b", "c"],
      difficulty: 3,
      conditions: ["c \u2260 0"]
    },
    // --- Formulario completo di Fisica (quinquennio): voci aggiuntive ---
    ...FORMULAS_FISICA
  ];
  var BY_ID = Object.fromEntries(FORMULAS.map((f) => [f.id, f]));
  function getFormulaById(id) {
    return BY_ID[id] || null;
  }
  var SEARCH_SYNONYMS = {
    stevino: ["stevino", "stevin", "idrostatica", "pressione idrostatica", "profondita", "liquido", "fluido", "p0"],
    archimede: ["archimede", "spinta", "galleggiamento", "galleggia", "galleggiare", "peso apparente", "volume immerso", "fluido"],
    suono: ["suono", "acustica", "sonoro", "sonora", "sonori", "sonore", "acustico", "acustici", "acustiche", "doppler", "eco", "sonar", "rumore", "decibel", "battimenti", "canna d organo", "canne d organo", "corda vibrante", "mersenne", "frequenza", "lunghezza d onda", "onda sonora", "onde sonore", "velocita del suono"],
    acustica: ["suono", "acustica", "sonoro", "sonora", "doppler", "eco", "sonar", "frequenza sonora", "decibel"],
    doppler: ["doppler", "effetto doppler", "suono", "sorgente in moto", "osservatore in moto", "ambulanza", "sirena", "frequenza percepita"],
    eco: ["eco", "sonar", "riflessione", "suono", "acustica", "distanza ostacolo"],
    newton: ["newton", "seconda legge", "terza legge", "dinamica", "forza", "gravitazione"],
    hooke: ["hooke", "molla", "elastica", "elasticita", "allungamento"],
    ohm: ["ohm", "resistenza", "resistivita", "circuiti", "differenza di potenziale"],
    coulomb: ["coulomb", "elettrostatica", "carica elettrica"],
    joule: ["joule", "effetto joule", "calore"],
    torricelli: ["torricelli", "efflusso", "caduta libera"],
    keplero: ["keplero", "orbita", "periodo orbitale", "pianeti"],
    snell: ["snell", "rifrazione", "ottica", "indice di rifrazione"],
    bernoulli: ["bernoulli", "idrodinamica", "fluido in moto"],
    pascal: ["pascal", "torchio idraulico", "pistone"],
    lorentz: ["lorentz", "relativita", "forza di lorentz"],
    faraday: ["faraday", "neumann", "lenz", "induzione", "flusso magnetico"],
    ampere: ["ampere", "biot savart", "campo magnetico"],
    carnot: ["carnot", "rendimento", "macchina termica"],
    onda: ["onda", "onde", "propagazione", "lunghezza d onda", "frequenza", "periodo", "suono"],
    onde: ["onda", "onde", "propagazione", "lunghezza d onda", "frequenza", "periodo", "suono"]
  };
  var STOP_WORDS = /* @__PURE__ */ new Set([
    "di",
    "del",
    "dello",
    "della",
    "dei",
    "degli",
    "delle",
    "da",
    "dal",
    "dallo",
    "dalla",
    "dai",
    "dagli",
    "dalle",
    "in",
    "nel",
    "nello",
    "nella",
    "nei",
    "negli",
    "nelle",
    "con",
    "su",
    "sul",
    "sullo",
    "sulla",
    "sui",
    "sugli",
    "sulle",
    "per",
    "tra",
    "fra",
    "il",
    "lo",
    "la",
    "i",
    "gli",
    "le",
    "un",
    "uno",
    "una",
    "d",
    "l"
  ]);
  function normalizeText(str) {
    if (!str) return "";
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function buildSearchCorpus(f) {
    const parts = [
      f.id || "",
      f.name || "",
      f.formula || "",
      f.topic || "",
      ...f.isolate || [],
      f.hypotheses || "",
      f.notes || "",
      ...f.tags || [],
      ...f.aliases || [],
      ...f.keywords || []
    ];
    return normalizeText(parts.join(" "));
  }
  function filterFormulas({ topic, search, difficulty } = {}) {
    const normSearch = normalizeText(search);
    const rawTokens = normSearch ? normSearch.split(" ").filter(Boolean) : [];
    const filteredTokens = rawTokens.filter((t) => !STOP_WORDS.has(t));
    const searchTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;
    const matchesFormula = (f) => {
      if (difficulty && String(f.difficulty) !== String(difficulty)) return false;
      if (searchTokens.length > 0) {
        const corpus = buildSearchCorpus(f);
        const allTokensMatch = searchTokens.every((token) => {
          if (corpus.includes(token)) return true;
          const synonyms = SEARCH_SYNONYMS[token];
          if (synonyms && synonyms.some((syn) => corpus.includes(normalizeText(syn)))) {
            return true;
          }
          if (token === "suono" && (f.topic === "onde e acustica" || f.topic === "onde e suono" || corpus.includes("suono") || corpus.includes("acustic") || corpus.includes("doppler"))) {
            return true;
          }
          if (token === "acustica" && (f.topic === "onde e acustica" || f.topic === "onde e suono" || corpus.includes("suono") || corpus.includes("acustic"))) {
            return true;
          }
          return false;
        });
        if (!allTokensMatch) return false;
      }
      return true;
    };
    if (topic) {
      const inTopicList = FORMULAS.filter((f) => f.topic === topic && matchesFormula(f));
      if (inTopicList.length === 0 && searchTokens.length > 0) {
        const globalList = FORMULAS.filter(matchesFormula);
        if (globalList.length > 0) {
          return globalList;
        }
      }
      return inTopicList;
    }
    return FORMULAS.filter(matchesFormula);
  }
  function randomExercise() {
    const f = FORMULAS[Math.floor(Math.random() * FORMULAS.length)];
    const candidates = f.isolate.filter((v) => {
      return !formulaTriviallyIsolates(f.formula, v);
    });
    const pool = candidates.length ? candidates : f.isolate;
    const target = pool[Math.floor(Math.random() * pool.length)];
    return { id: f.id, target };
  }
  function formulaTriviallyIsolates(formulaStr, v) {
    const m = formulaStr.split("=");
    if (m.length !== 2) return false;
    const left = m[0].trim();
    return left === v;
  }

  // js/explanations.js
  var EXPLANATIONS = {
    "add-both": {
      nome: "Aggiunta della stessa quantit\xE0 a entrambi i membri",
      intuitiva: "Se due quantit\xE0 sono uguali, aggiungendo la stessa cosa sia a destra che a sinistra l'uguaglianza resta vera. \xC8 come mettere lo stesso peso su entrambi i piatti di una bilancia in equilibrio: la bilancia resta in equilibrio.",
      principio: "Primo principio di equivalenza: se A = B allora A + C = B + C.",
      perche: "L'operazione viene eseguita su ENTRAMBI i membri con la stessa quantit\xE0 C, quindi i due membri restano uguali.",
      attenzione: []
    },
    "sub-both": {
      nome: "Sottrazione della stessa quantit\xE0 da entrambi i membri",
      intuitiva: "Se togli la stessa quantit\xE0 da entrambi i piatti di una bilancia in equilibrio, l'equilibrio non cambia.",
      principio: "Primo principio di equivalenza: se A = B allora A \u2212 C = B \u2212 C.",
      perche: "La stessa quantit\xE0 C \xE8 sottratta a entrambi i membri: l'uguaglianza \xE8 preservata.",
      attenzione: [
        'Questa \xE8 la giustificazione corretta del cosiddetto "trasporto con cambiamento di segno": non sposti fisicamente il termine, sommi il suo opposto a entrambi i membri.'
      ]
    },
    "mul-both": {
      nome: "Moltiplicazione di entrambi i membri per la stessa quantit\xE0",
      intuitiva: "Moltiplicare entrambi i membri per lo stesso numero \xE8 come ingrandire (o ridurre) allo stesso modo entrambi i piatti della bilancia: l'uguaglianza resta.",
      principio: "Secondo principio di equivalenza: se A = B allora A\xB7C = B\xB7C.",
      perche: "Entrambi i membri sono moltiplicati per la stessa quantit\xE0 C, quindi restano uguali.",
      attenzione: [
        "Moltiplicare per 0 \xE8 lecito ma distrugge l'informazione (si ottiene 0 = 0): non \xE8 utile, perci\xF2 l'app lo impedisce."
      ]
    },
    "div-both": {
      nome: "Divisione di entrambi i membri per la stessa quantit\xE0",
      intuitiva: "Dividere entrambi i membri per la stessa quantit\xE0 non nulla riduce allo stesso modo i due piatti: l'uguaglianza resta.",
      principio: "Secondo principio di equivalenza: se A = B e C \u2260 0 allora A/C = B/C.",
      perche: "La stessa divisione per C \u2260 0 \xE8 applicata a entrambi i membri. La condizione C \u2260 0 \xE8 essenziale: non si divide per zero.",
      attenzione: [
        "La condizione C \u2260 0 deve essere esplicitata. Se C \xE8 una variabile, va dichiarata diversa da zero (o si discussi il caso C = 0 separatamente)."
      ]
    },
    "move-term": {
      nome: "Trasporto di un termine additivo (cambiamento di segno)",
      intuitiva: `Un termine che \xE8 aggiunto ("+a") pu\xF2 passare dall'altra parte "cambiando segno" ("\u2212a") perch\xE9 togli "a" da entrambi i membri.`,
      principio: "Primo principio di equivalenza (somma dell'opposto a entrambi i membri).",
      perche: "Portare un termine dall'altra parte NON \xE8 uno spostamento fisico: equivale a sommare l'opposto del termine a entrambi i membri.",
      attenzione: [
        "Vale SOLO per termini additivi (ognuno preceduto da + o \u2212), non per i fattori che moltiplicano l'intero membro."
      ]
    },
    "move-factor": {
      nome: "Trasporto di un fattore (divisione per il fattore)",
      intuitiva: `Un fattore che moltiplica tutto un membro pu\xF2 "passare dall'altra parte" come divisore: \xE8 la stessa idea del "trasporto di fattori".`,
      principio: "Secondo principio di equivalenza (divisione di entrambi i membri per il fattore).",
      perche: "Dividiamo entrambi i membri per lo stesso fattore. Serve che il fattore sia diverso da zero.",
      attenzione: [
        "Puoi trasportare solo fattori che moltiplicano l'INTERO membro: non i termini di una somma.",
        "La condizione di validit\xE0 richiede che il fattore sia \u2260 0."
      ]
    },
    "cross-multiply": {
      nome: "Moltiplicazione incrociata (proporzioni)",
      intuitiva: 'In una proporzione a/b = c/d "i prodotti in croce" sono uguali: a\xB7d = b\xB7c. Si ottiene moltiplicando entrambi i membri per b\xB7d.',
      principio: "Secondo principio di equivalenza, moltiplicando per il prodotto dei denominatori.",
      perche: "Moltiplicando entrambi i membri per b\xB7d (\u2260 0) le frazioni si semplificano e restano i prodotti in croce.",
      attenzione: [
        "Si applica SOLO se entrambi i membri sono frazioni (rapporti).",
        "Richiede denominatori non nulli: b \u2260 0 e d \u2260 0."
      ]
    },
    "swap-sides": {
      nome: "Scambio dei membri (propriet\xE0 simmetrica)",
      intuitiva: `L'uguaglianza \xE8 simmetrica: se "una cosa = un'altra", vale anche il contrario.`,
      principio: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
      perche: "Non cambia il contenuto informativo, solo l'ordine con cui si leggono i due membri.",
      attenzione: [
        "Da non confondere con l'inversione di una frazione (scambio tra numeratore e denominatore) n\xE9 con il cambiamento di segno di un termine."
      ]
    },
    "reciprocal-both": {
      nome: "Reciproco di entrambi i membri",
      intuitiva: 'Se due quantit\xE0 non nulle sono uguali, anche i loro reciproci sono uguali (riempi "1 diviso" su entrambi i lati).',
      principio: "Si applica la funzione reciproco x \u21A6 1/x (definita per x \u2260 0) a entrambi i membri.",
      perche: "La funzione reciproco \xE8 iniettiva sul dominio dei numeri non nulli: applicata a entrambi i membri conserva l'uguaglianza.",
      attenzione: ["Richiede che entrambi i membri siano \u2260 0."]
    },
    "invert-proportion": {
      nome: "Inversione di una proporzione",
      intuitiva: "In una proporzione puoi scambiare numeratore e denominatore, purch\xE9 lo faccia su ENTRAMBI i rapporti.",
      principio: "Applicazione della propriet\xE0: se a/b = c/d con a,b,c,d \u2260 0 allora b/a = d/c.",
      perche: "Equivale a prendere il reciproco di entrambi i membri, che sono rapporti non nulli.",
      attenzione: [
        "NON si inverte mai un solo membro: si perderebbe l'uguaglianza.",
        "Servono condizioni di non nullit\xE0 su tutti i numeratori e denominatori."
      ]
    },
    "sqrt-both": {
      nome: "Estrazione di una radice di indice PARI di entrambi i membri",
      intuitiva: "Se x\xB2 = k (o pi\xF9 in generale x^(2m) = k), allora x \xE8 una radice di indice pari di k \u2014 ma con DUE possibilit\xE0 di segno, perch\xE9 sia x sia \u2212x, elevati a un esponente pari, danno lo stesso k.",
      principio: "Applicazione a entrambi i membri della radice di indice pari n = 2m (definita per radicandi \u2265 0 nel campo reale), ricordando che \u207F\u221A(x\u207F) = |x| quando n \xE8 pari.",
      perche: "Poich\xE9 \u207F\u221A(x\u207F) = |x| = \xB1x per n pari, la soluzione corretta include sia il segno + sia il segno \u2212: il segno \xB1 non va eliminato.",
      attenzione: [
        "Indice PARI: il radicando deve essere \u2265 0 (nel campo reale): condizione necessaria.",
        "Il segno \xB1 \xE8 matematicamente necessario: non va soppresso.",
        "Se la quantit\xE0 cercata \xE8 per sua natura positiva (lunghezza, massa, tempo, una frequenza, \u2026), scegli il segno + per eliminare l'ambiguit\xE0: la scelta va motivata in base al significato fisico."
      ]
    },
    "root-odd": {
      nome: "Estrazione di una radice di indice DISPARI (es. cubica) di entrambi i membri",
      intuitiva: "Se x\xB3 = k, allora x = \u221Bk. Una radice di indice dispari \xE8 definita per OGNI valore di k, positivo o negativo, e restituisce un solo risultato.",
      principio: "Applicazione della funzione radice n-esima con n dispari (definita su tutto \u211D) a entrambi i membri: se A = B allora \u207F\u221AA = \u207F\u221AB.",
      perche: "La funzione radice di indice dispari \xE8 strettamente crescente e iniettiva su \u211D: conserva l'uguaglianza e non introduce ambiguit\xE0 di segno.",
      attenzione: [
        "Indice DISPARI: NESSUNA condizione di segno, il radicando pu\xF2 essere positivo, negativo o nullo.",
        "NON si introduce il segno \xB1: la radice di indice dispari \xE8 unica."
      ]
    },
    "pow-both": {
      nome: "Elevazione di entrambi i membri a una potenza",
      intuitiva: "Se due quantit\xE0 sono uguali, elevandole allo stesso esponente restano uguali.",
      principio: "Se A = B allora A^n = B^n.",
      perche: "La potenza con esponente fisso \xE8 una funzione ben definita: applicarla a entrambi i membri conserva l'uguaglianza.",
      attenzione: [
        "Elevare a un esponente PARI non \xE8 iniettivo: pu\xF2 introdurre soluzioni estranee (ad es. da x = 3 si ottiene x\xB2 = 9, che ammette anche x = \u22123).",
        "Le soluzioni trovate vanno quindi sempre ricontrollate."
      ]
    },
    "distribute": {
      nome: "Propriet\xE0 distributiva",
      intuitiva: 'Un fattore che moltiplica una somma si pu\xF2 "distribuire" su ciascun addendo: a(x + b) = ax + ab.',
      principio: "Propriet\xE0 distributiva del prodotto rispetto alla somma.",
      perche: "\xC8 un'identit\xE0 algebrica: vale per ogni valore delle lettere, senza condizioni aggiuntive.",
      attenzione: []
    },
    "factor-common": {
      nome: "Raccoglimento a fattor comune",
      intuitiva: 'Se tutti i termini hanno un fattore in comune, puoi "raccoglierlo": ax + ab = a(x + b).',
      principio: "Procedimento inverso della propriet\xE0 distributiva.",
      perche: "Raccogliere \xE8 l'operazione inversa del distribuire: il risultato \xE8 identicamente uguale.",
      attenzione: [
        "Il fattore raccolto deve comparire in TUTTI i termini del membro."
      ]
    },
    "cancel-factor": {
      nome: "Cancellazione di un fattore comune tra frazione e prodotto",
      intuitiva: 'Se una frazione A/B \xE8 moltiplicata per lo stesso fattore B, il fattore B "si cancella" tra numeratore e denominatore e resta A: (A/B)\xB7B = A.',
      principio: "Semplificazione di un fattore comune: (A/B)\xB7B = A\xB7(B/B) = A, lecita purch\xE9 B \u2260 0.",
      perche: "Il fattore B compare sia al denominatore della frazione sia come fattore esterno; il loro rapporto \xE8 B/B = 1 (con B \u2260 0). \xC8 la stessa idea della moltiplicazione incrociata in una proporzione.",
      attenzione: [
        "La semplificazione \xE8 lecita SOLO se il fattore cancellato \xE8 \u2260 0.",
        "Attenzione: si pu\xF2 cancellare un fattore con un fattore (un prodotto), MAI un fattore con un termine di una somma."
      ]
    },
    "invert-function": {
      nome: "Applicazione della funzione inversa a entrambi i membri",
      intuitiva: `Se una funzione \xE8 applicata a una quantit\xE0 (per esempio sin(\u03B8) o ln(x)), per "liberare" l'argomento si applica la funzione inversa a ENTRAMBI i membri: da sin(\u03B8) = k segue \u03B8 = sin\u207B\xB9(k). \xC8 lo stesso principio del trasporto, ma con le funzioni al posto di +, \u2212, \xB7, /.`,
      principio: "Se A = B e f \xE8 una funzione iniettiva sul ramo considerato, allora f\u207B\xB9(A) = f\u207B\xB9(B).",
      perche: `La funzione inversa "annulla" l'effetto della funzione: f\u207B\xB9(f(x)) = x sul ramo principale. La funzione deve essere iniettiva su quel ramo, altrimenti la soluzione non \xE8 unica.`,
      attenzione: [
        "La funzione deve essere invertibile sul ramo considerato: sin, cos, tan e ln lo sono solo su un opportuno intervallo (ramo principale).",
        "L'argomento della funzione inversa deve appartenere al dominio: per sin\u207B\xB9 e cos\u207B\xB9 serve un valore in [\u22121, 1]; per ln l'argomento deve essere > 0.",
        "L'inversa restituisce la soluzione nel RAMO PRINCIPALE. Poich\xE9 le funzioni trigonometriche sono periodiche, possono esistere altre soluzioni: vanno discusse separatamente."
      ]
    }
  };
  function getExplanation(key) {
    return EXPLANATIONS[key] || null;
  }

  // js/render.js
  function renderEquation(eq2, opts = {}) {
    const {
      selectedId = null,
      dimIds = /* @__PURE__ */ new Set(),
      targetVar = null,
      interactive = false,
      showImplicitDen = false
    } = opts;
    const memberOpts = { ...opts, eq: eq2 };
    if (!interactive) {
      const left = renderNode(eq2.left, "left", memberOpts);
      const right = renderNode(eq2.right, "right", memberOpts);
      return `<span class="math-eq">${left}<span class="eq-sign" aria-label="uguale">=</span>${right}</span>`;
    }
    const leftMember = renderMember(eq2.left, "left", memberOpts);
    const rightMember = renderMember(eq2.right, "right", memberOpts);
    return `<div class="math-eq interactive-math-eq ${showImplicitDen ? "show-implicit-denominators" : ""}">  <div class="math-member-wrap math-member-left">${leftMember}</div>  <div class="eq-sign-wrap"><span class="eq-sign" aria-label="uguale">=</span></div>  <div class="math-member-wrap math-member-right">${rightMember}</div></div>`;
  }
  function insertionSlot(side, slot) {
    const where = slot === "num" ? "accanto al numeratore" : "accanto al denominatore";
    return `<span class="drop-slot drop-slot-${slot}" data-side="${side}" data-slot="${slot}" aria-hidden="true" title="Rilascia qui ${where}"><span class="drop-slot-plus">+</span></span>`;
  }
  function renderMember(node, side, opts) {
    const raw = unwrap(node);
    const isDiv = raw.type === "Div";
    const adjacentDropzone = opts.interactive ? `<div class="dropzone dropzone-adjacent" data-side="${side}" data-slot="add" title="Rilascia qui per trasportare con cambio di segno (regola del trasporto)"><span class="dropzone-label"><span class="dropzone-icon">\xB1</span> sposta termine</span></div>` : "";
    const numSlot = opts.interactive ? insertionSlot(side, "num") : "";
    const denSlot = opts.interactive ? insertionSlot(side, "den") : "";
    if (isDiv) {
      const numContent2 = renderNode(raw.num, side + "/num", opts);
      const denContent = renderNode(raw.den, side + "/den", opts);
      return `<div class="math-member-content member-has-frac" data-side="${side}">  ${adjacentDropzone}  <div class="frac">    <div class="frac-num dropzone" data-side="${side}" data-slot="num" title="Numeratore di ${side === "left" ? "sinistra" : "destra"} (rilascia per moltiplicare)">${numContent2}${numSlot}</div>    <div class="frac-bar"></div>    <div class="frac-den dropzone" data-side="${side}" data-slot="den" title="Denominatore di ${side === "left" ? "sinistra" : "destra"} (rilascia per dividere)">${denContent}${denSlot}</div>  </div></div>`;
    }
    const numContent = renderNode(node, side, opts);
    return `<div class="math-member-content member-no-frac" data-side="${side}">  ${adjacentDropzone}  <div class="member-num dropzone" data-side="${side}" data-slot="num" title="Membro di ${side === "left" ? "sinistra" : "destra"}">${numContent}${numSlot}</div>  <div class="dynamic-fraction-wrapper" data-side="${side}">    <div class="dynamic-frac-bar"></div>    <div class="dynamic-frac-den dropzone" data-side="${side}" data-slot="den" title="Rilascia qui al denominatore per dividere">      <span class="dropzone-label"><span class="dropzone-icon">\xF7</span> rilascia al denominatore</span>${denSlot}    </div>  </div></div>`;
  }
  function hasFraction(n) {
    if (!n) return false;
    const u = unwrap(n);
    if (u.type === "Div") return true;
    if (u.args) return u.args.some(hasFraction);
    if (u.arg) return hasFraction(u.arg);
    if (u.base && hasFraction(u.base)) return true;
    if (u.exp && hasFraction(u.exp)) return true;
    if (u.num && hasFraction(u.num)) return true;
    if (u.den && hasFraction(u.den)) return true;
    return false;
  }
  function renderNode(node, id, opts) {
    const raw = node;
    if (raw && raw.type === "Group") {
      const u = unwrap(raw.arg);
      if (u.type === "Div" && !opts.isPowBase) {
        return renderNode(raw.arg, id, opts);
      }
      if ((u.type === "Num" || u.type === "Var") && !opts.isPowBase) {
        return renderNode(raw.arg, id, opts);
      }
      if ((id.endsWith("/num") || id.endsWith("/den")) && !opts.isPowBase) {
        return renderNode(raw.arg, id, opts);
      }
      const side2 = id.startsWith("left") ? "left" : "right";
      const isDen2 = id.includes("/den");
      const slot2 = isDen2 ? "den" : "num";
      const hasFrac = hasFraction(raw.arg);
      const isDraggable = !!opts.interactive;
      const groupSyntax = toPretty(u, 0);
      const groupPretty = prettyVar(groupSyntax);
      const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(groupSyntax)}" data-side="${side2}" data-slot="${slot2}" data-node-type="${u.type}" title="Trascina l'intero blocco (${escapeHtml(groupPretty)})"` : "";
      const dragCls = isDraggable ? " draggable-token math-term-group math-factor-group" : "";
      const inner = renderNode(raw.arg, id, { ...opts, interactive: false, hideSign: false, isPowBase: false });
      const cls = "node-group-parens" + (hasFrac ? " has-frac" : "") + dragCls;
      return `<span class="${cls}" data-id="${id}"${dragAttrs}><span class="group-paren">(</span>${inner}<span class="group-paren">)</span></span>`;
    }
    node = unwrap(node);
    const selected = opts.selectedId === id ? " selected" : "";
    const isTarget = opts.targetVar && node.type === "Var" && node.name === opts.targetVar;
    const dim = opts.dimIds && opts.dimIds.has(id) ? " dimmed" : "";
    const span = (inner, extraClass, extraId, extraAttrs = "") => {
      const baseClass = opts.isInsideCompound ? extraClass || "" : `math-node ${extraClass || ""}${selected}${dim}`;
      return `<span class="${baseClass}" data-id="${extraId || id}"${extraAttrs}>${inner}</span>`;
    };
    const side = id.startsWith("left") ? "left" : "right";
    const isDen = id.includes("/den");
    const slot = isDen ? "den" : "num";
    switch (node.type) {
      case "Num": {
        const isDraggable = !!opts.interactive;
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(String(node.value))}" data-side="${side}" data-slot="${slot}" data-node-type="Num" title="Trascina con il mouse"` : "";
        const dragCls = isDraggable ? " draggable-token" : "";
        return span(escapeHtml(String(node.value)), "node-num" + dragCls, id, dragAttrs);
      }
      case "Var": {
        const isDraggable = !!opts.interactive;
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(node.name)}" data-side="${side}" data-slot="${slot}" data-node-type="Var" title="Trascina con il mouse ${prettyVar(node.name)}"` : "";
        const dragCls = isDraggable ? " draggable-token" : "";
        return span(
          renderVarHtml(node.name),
          "node-var" + (isTarget ? " node-target" : "") + dragCls,
          id,
          dragAttrs
        );
      }
      case "Add":
      case "Sub": {
        const isSub = node.type === "Sub";
        if (!isSub && node.args.length === 2) {
          const first = unwrap(node.args[0]);
          if (first.type === "Var" && first.name === "\xB1") {
            return span(
              `<span class="op">\xB1</span>` + renderNode(node.args[1], id + "/Add1", { ...opts, hideSign: true }),
              "node-add"
            );
          }
        }
        const isWholeDen = isDen && (id.endsWith("/den") || !id.includes("/Mul"));
        const isWholeFracNum = id.endsWith("/num") && !id.includes("/Mul") && !id.includes("/Add") && !id.includes("/Sub");
        const isDraggableDenOrNum = !!opts.interactive && (isWholeDen || isWholeFracNum);
        const childOpts = isDraggableDenOrNum ? { ...opts, interactive: false } : opts;
        const inner = node.args.map((a, i) => {
          const u = unwrap(a);
          const isNeg = u.type === "Neg" || u.type === "Num" && u.value < 0;
          const bodyNode = u.type === "Neg" ? u.arg : u.type === "Num" && u.value < 0 ? { type: "Num", value: -u.value } : a;
          const path = id + "/" + node.type + i;
          if (i === 0) {
            if (isNeg) return `<span class="op">\u2212</span>` + renderNode(bodyNode, path, childOpts);
            if (u.type === "Num" && u.value === 0 && node.args.length > 1) {
              return `<span class="neutral-fade-wrap">${renderNode(a, path, childOpts)}<span class="op neutral-fade-op">+</span></span>`;
            }
            return renderNode(a, path, childOpts);
          }
          const minus = isSub ? !isNeg : isNeg;
          const child = renderNode(bodyNode, path, childOpts);
          const opSymbol = minus ? "\u2212" : "+";
          if (u.type === "Num" && u.value === 0 && node.args.length > 1) {
            return `<span class="neutral-fade-wrap"><span class="op neutral-fade-op">${opSymbol}</span>${child}</span>`;
          }
          return `<span class="op">${opSymbol}</span>` + child;
        }).join("");
        let dragAttrs = "";
        let dragCls = "";
        if (isDraggableDenOrNum) {
          const syntax = toPretty(node, 0);
          const pretty = prettyVar(syntax);
          dragAttrs = ` draggable="true" data-var-name="${escapeHtml(syntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${node.type}" title="${isWholeDen ? `Trascina il denominatore (${escapeHtml(pretty)}) al numeratore dell'altro membro` : `Trascina il numeratore (${escapeHtml(pretty)}) al denominatore dell'altro membro`}"`;
          dragCls = " draggable-token math-term-group math-factor-group";
        }
        return span(inner, (isSub ? "node-sub" : "node-add") + dragCls, id, dragAttrs);
      }
      case "Mul": {
        const isDraggable = !!opts.interactive;
        const mulSyntax = node.args.map((a) => {
          const u = unwrap(a);
          if (u.type === "Add" || u.type === "Sub") return `(${toPretty(u, 0)})`;
          return toPretty(u, 0);
        }).join("*");
        const mulPretty = prettyVar(mulSyntax);
        const isParentAddOrSub = id.includes("/Add") || id.includes("/Sub");
        const isWholeMember = id === side || id === `${side}/num` || id === `${side}/den`;
        const canDragGroup = isDraggable && (isParentAddOrSub || isWholeMember);
        const dragAttrs = canDragGroup ? ` draggable="true" data-var-name="${escapeHtml(mulSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="Mul" title="Trascina l'intero blocco ${escapeHtml(mulPretty)}"` : "";
        const dragCls = canDragGroup ? " draggable-token math-term-group" : "";
        return span(
          (canDragGroup ? `<span class="term-group-tag" title="Termine composto: trascina per spostarlo tutto insieme">\u{1F4E6}</span>` : "") + renderMulArgs(node.args, id, opts),
          "node-mul" + dragCls,
          id,
          dragAttrs
        );
      }
      case "Div": {
        return span(
          `<span class="frac"><span class="frac-num">${renderNode(node.num, id + "/num", opts)}</span><span class="frac-bar"></span><span class="frac-den">${renderNode(node.den, id + "/den", opts)}</span></span>`,
          "node-div"
        );
      }
      case "Pow": {
        const isDraggable = !!opts.interactive;
        const powText = toPretty(node, 0);
        const isTarget2 = opts.targetVar && unwrap(node.base).type === "Var" && unwrap(node.base).name === opts.targetVar;
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(powText)}" data-side="${side}" data-slot="${slot}" data-node-type="Pow" title="Trascina l'intera potenza ${escapeHtml(prettyVar(powText))}"` : "";
        const dragCls = isDraggable ? " draggable-token draggable-pow" : "";
        const targetCls = isTarget2 ? " node-target" : "";
        let baseHtml = renderNode(node.base, id + "/base", { ...opts, interactive: false, isPowBase: true });
        const uBase = unwrap(node.base);
        if (node.base.type !== "Group" && (uBase.type === "Add" || uBase.type === "Sub" || uBase.type === "Mul" || uBase.type === "Div")) {
          const hasFrac = hasFraction(uBase);
          const cls = "node-group-parens" + (hasFrac ? " has-frac" : "");
          baseHtml = `<span class="${cls}"><span class="group-paren">(</span>${baseHtml}<span class="group-paren">)</span></span>`;
        }
        const expText = node.exp.type === "Num" ? escapeHtml(String(node.exp.value)) : toPretty(node.exp, 0);
        return span(
          `<span class="pow-base">${baseHtml}</span><sup class="node-exp">${escapeHtml(expText)}</sup>`,
          "node-pow" + dragCls + targetCls,
          id,
          dragAttrs
        );
      }
      case "Sqrt": {
        const isDraggable = !!opts.interactive;
        const sqrtSyntax = toPretty(node, 0);
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(sqrtSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="Sqrt" title="Trascina la radice ${escapeHtml(prettyVar(sqrtSyntax))}"` : "";
        const dragCls = isDraggable ? " draggable-token" : "";
        const bodyContent = renderNode(node.arg, id + "/arg", { ...opts, interactive: false });
        return span(
          `<span class="math-radical"><svg class="radical-surd" viewBox="0 0 16 36" preserveAspectRatio="none" aria-hidden="true"><path d="M 2 20 L 5.5 17.5 L 9 32 L 15 2 L 16 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg><span class="radical-body">${bodyContent}</span></span>`,
          "node-sqrt" + dragCls,
          id,
          dragAttrs
        );
      }
      case "Sin":
      case "Cos":
      case "Tan":
      case "Ln":
      case "Asin":
      case "Acos":
      case "Atan":
      case "Exp": {
        const isDraggable = !!opts.interactive;
        const fnSyntax = toPretty(node, 0);
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(fnSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${node.type}" title="Trascina la funzione ${escapeHtml(prettyVar(fnSyntax))}"` : "";
        const dragCls = isDraggable ? " draggable-token" : "";
        return span(
          `<span class="fn-name">${escapeHtml(FUNC_PRETTY[node.type])}</span><span class="fn-args">(${renderNode(node.arg, id + "/arg", { ...opts, interactive: false })})</span>`,
          "node-fn node-" + node.type.toLowerCase() + dragCls,
          id,
          dragAttrs
        );
      }
      case "Neg": {
        const u = unwrap(node.arg);
        const body = renderNode(node.arg, id + "/arg", { ...opts, hideSign: false });
        const bodyHtml = u.type === "Add" || u.type === "Sub" ? `<span class="neg-parens">(${body})</span>` : body;
        const sign = opts.hideSign ? "" : "\u2212";
        return span(sign + bodyHtml, "node-neg");
      }
      case "Group":
        return span(
          `(${renderNode(node.arg, id + "/g", opts)})`,
          "node-group"
        );
      default:
        return span(escapeHtml(toPretty(node, 0)), "");
    }
  }
  function renderMulArgs(args, id, opts) {
    const hasMultiple = args.length > 1;
    const side = id.startsWith("left") ? "left" : "right";
    const isDen = id.includes("/den");
    const slot = isDen ? "den" : "num";
    const rendered = args.map((a, i) => {
      const u = unwrap(a);
      const isNeutralOne = hasMultiple && u.type === "Num" && u.value === 1;
      const isCompoundFactor = u.type === "Add" || u.type === "Sub";
      let nodeHtml = renderNode(isCompoundFactor ? u : a, id + "/Mul" + i, isCompoundFactor ? { ...opts, interactive: false, isInsideCompound: true } : opts);
      if (isCompoundFactor) {
        const hasFrac = hasFraction(u);
        const isDraggable = !!opts.interactive;
        const factorSyntax = toPretty(u, 0);
        const factorPretty = prettyVar(factorSyntax);
        const dragAttrs = isDraggable ? ` draggable="true" data-var-name="${escapeHtml(factorSyntax)}" data-side="${side}" data-slot="${slot}" data-node-type="${u.type}" title="Trascina l'intero blocco (${escapeHtml(factorPretty)})"` : "";
        const dragCls = isDraggable ? " draggable-token math-term-group math-factor-group" : "";
        const isSelected = opts.selectedId === id + "/Mul" + i ? " selected" : "";
        const cls = `math-node node-group-parens${isSelected}` + (hasFrac ? " has-frac" : "") + dragCls;
        nodeHtml = `<span class="${cls}" data-id="${id + "/Mul" + i}"${dragAttrs} tabindex="0" role="button" aria-label="Blocco (${escapeHtml(factorPretty)})"><span class="group-paren">(</span>${nodeHtml}<span class="group-paren">)</span></span>`;
      }
      return {
        html: nodeHtml,
        isNeutralOne
      };
    });
    let html = "";
    for (let i = 0; i < rendered.length; i++) {
      const item = rendered[i];
      if (item.isNeutralOne) {
        if (i === 0 && rendered.length > 1) {
          html += `<span class="neutral-fade-wrap">${item.html}<span class="op neutral-fade-op">\xB7</span></span>`;
        } else {
          html += `<span class="neutral-fade-wrap"><span class="op neutral-fade-op">\xB7</span>${item.html}</span>`;
        }
      } else {
        if (i > 0 && !rendered[i - 1].isNeutralOne) {
          html += '<span class="op">\xB7</span>';
        }
        html += item.html;
      }
    }
    return html;
  }
  var SUB_DIGITS = {
    "0": "\u2080",
    "1": "\u2081",
    "2": "\u2082",
    "3": "\u2083",
    "4": "\u2084",
    "5": "\u2085",
    "6": "\u2086",
    "7": "\u2087",
    "8": "\u2088",
    "9": "\u2089",
    "a": "\u2090",
    "e": "\u2091",
    "h": "\u2095",
    "i": "\u1D62",
    "j": "\u2C7C",
    "k": "\u2096",
    "l": "\u2097",
    "m": "\u2098",
    "n": "\u2099",
    "o": "\u2092",
    "p": "\u209A",
    "r": "\u1D63",
    "s": "\u209B",
    "t": "\u209C",
    "u": "\u1D64",
    "v": "\u1D65",
    "x": "\u2093",
    "y": "\u1D67"
  };
  var SUP_DIGITS = {
    "0": "\u2070",
    "1": "\xB9",
    "2": "\xB2",
    "3": "\xB3",
    "4": "\u2074",
    "5": "\u2075",
    "6": "\u2076",
    "7": "\u2077",
    "8": "\u2078",
    "9": "\u2079"
  };
  var GREEK_VARS = {
    pi: "\u03C0",
    rho: "\u03C1",
    eta: "\u03B7",
    lam: "\u03BB",
    eps: "\u03B5",
    mu: "\u03BC",
    theta: "\u03B8",
    alpha: "\u03B1",
    beta: "\u03B2",
    gamma: "\u03B3",
    delta: "\u03B4",
    omega: "\u03C9",
    phi: "\u03C6",
    sigma: "\u03C3",
    tau: "\u03C4",
    nu: "\u03BD",
    Delta: "\u0394",
    Lambda: "\u039B",
    Omega: "\u03A9",
    Sigma: "\u03A3",
    Phi: "\u03A6"
  };
  var SPECIAL_PRETTY_VARS = {
    dT: "\u0394T",
    dl: "\u0394l",
    dlam: "\u0394\u03BB",
    dU: "\u0394U",
    dV: "\u0394V",
    dt0: "\u0394t\u2080",
    at: "a\u209C",
    ac: "a_c",
    v0x: "v\u2080\u2093",
    v0y: "v\u2080\u1D67",
    PhiB: "\u03A6_B",
    PhiE: "\u03A6_E",
    Icm: "I_cm",
    xcm: "x_cm",
    Req: "R_eq",
    Ceq: "C_eq",
    Ec: "E_c",
    Ep: "E_p",
    Vmax: "V_max",
    Veff: "V_eff",
    Ieff: "I_eff",
    rho_corpo: "\u03C1_corpo",
    rho_fluido: "\u03C1_fluido",
    V_imm: "V_imm",
    V_tot: "V_tot"
  };
  function renderVarHtml(name) {
    if (!name) return "";
    if (name.startsWith("d") && name.length > 1 && !["d", "dt"].includes(name)) {
      const rest = name.slice(1);
      if (GREEK_VARS[rest]) return `<span class="var-base">\u0394${GREEK_VARS[rest]}</span>`;
      if (["T", "l", "U", "V"].includes(rest)) return `<span class="var-base">\u0394${rest}</span>`;
      if (rest === "t0") return `<span class="var-base">\u0394t</span><sub class="var-sub">0</sub>`;
    }
    if (name.includes("_")) {
      const parts = name.split("_");
      const base = GREEK_VARS[parts[0]] || parts[0];
      const sub = parts.slice(1).join("_");
      return `<span class="var-base">${escapeHtml(base)}</span><sub class="var-sub">${escapeHtml(sub)}</sub>`;
    }
    const knownSubs = {
      Ceq: ["C", "eq"],
      Req: ["R", "eq"],
      Ieff: ["I", "eff"],
      Veff: ["V", "eff"],
      Vmax: ["V", "max"],
      Icm: ["I", "cm"],
      xcm: ["x", "cm"],
      PhiB: ["\u03A6", "B"],
      PhiE: ["\u03A6", "E"],
      at: ["a", "t"],
      ac: ["a", "c"],
      Ec: ["E", "c"],
      Ep: ["E", "p"],
      Ec1: ["E", "c1"],
      Ec2: ["E", "c2"],
      Ep1: ["E", "p1"],
      Ep2: ["E", "p2"],
      v0x: ["v", "0x"],
      v0y: ["v", "0y"]
    };
    if (knownSubs[name]) {
      const [b, sub] = knownSubs[name];
      return `<span class="var-base">${b}</span><sub class="var-sub">${sub}</sub>`;
    }
    for (const [k, v] of Object.entries(GREEK_VARS)) {
      if (name.startsWith(k)) {
        const rest = name.slice(k.length);
        if (/^\d+$/.test(rest)) {
          return `<span class="var-base">${v}</span><sub class="var-sub">${rest}</sub>`;
        }
      }
    }
    const m = name.match(/^([a-zA-Z]+)(\d+)$/);
    if (m) {
      const base = GREEK_VARS[m[1]] || m[1];
      return `<span class="var-base">${base}</span><sub class="var-sub">${m[2]}</sub>`;
    }
    if (GREEK_VARS[name]) return `<span class="var-base">${GREEK_VARS[name]}</span>`;
    return `<span class="var-base">${escapeHtml(name)}</span>`;
  }
  function prettyVar(name) {
    if (SPECIAL_PRETTY_VARS[name]) return SPECIAL_PRETTY_VARS[name];
    if (typeof name === "string" && name.includes("^")) {
      const [b, e] = name.split("^");
      const sup = (e || "").split("").map((c) => SUP_DIGITS[c] || c).join("");
      return prettyVar(b) + sup;
    }
    if (name.startsWith("d") && name.length > 1 && !["d", "dt"].includes(name)) {
      const rest = name.slice(1);
      if (GREEK_VARS[rest]) return "\u0394" + GREEK_VARS[rest];
      if (["T", "l", "U", "V"].includes(rest)) return "\u0394" + rest;
      if (rest === "t0") return "\u0394t\u2080";
    }
    for (const [k, v] of Object.entries(GREEK_VARS)) {
      if (name.startsWith(k)) {
        const rest = name.slice(k.length);
        if (/^\d+$/.test(rest)) {
          return v + rest.split("").map((c) => SUB_DIGITS[c] || c).join("");
        }
      }
    }
    const m = name.match(/^([a-zA-Z]+)(\d+)$/);
    if (m) {
      const base = GREEK_VARS[m[1]] || m[1];
      const sub = m[2].split("").map((c) => SUB_DIGITS[c] || c).join("");
      return base + sub;
    }
    if (GREEK_VARS[name]) return GREEK_VARS[name];
    return name;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  // js/dragdrop.js
  function isMatch(node, targetVarName) {
    const u = unwrap(node);
    if (u.type === "Var" && u.name === targetVarName) return true;
    if (u.type === "Num" && String(u.value) === String(targetVarName)) return true;
    if (toPretty(u, 0) === targetVarName) return true;
    if (u.type === "Mul") {
      const mapArg = (x) => {
        const ux = unwrap(x);
        if (ux.type === "Add" || ux.type === "Sub") return `(${toPretty(ux, 0)})`;
        return toPretty(ux, 0);
      };
      const s1 = u.args.map(mapArg).join("*");
      const s2 = u.args.map(mapArg).join("\xB7");
      if (s1 === targetVarName || s2 === targetVarName) return true;
    }
    if (u.type === "Pow") {
      const p1 = toPretty(u, 0);
      const p2 = `${toPretty(u.base, 0)}^${toPretty(u.exp, 0)}`;
      if (p1 === targetVarName || p2 === targetVarName) return true;
    }
    try {
      const normalized = targetVarName.replace(/[₀-₉]/g, (c) => ({ "\u2080": "0", "\u2081": "1", "\u2082": "2", "\u2083": "3", "\u2084": "4", "\u2085": "5", "\u2086": "6", "\u2087": "7", "\u2088": "8", "\u2089": "9" })[c] || c).replace(/·/g, "*").replace(/θ/g, "theta").replace(/−/g, "-");
      const parsed = parseExpression(normalized);
      if (parsed && structurallyEqual(u, parsed)) return true;
    } catch {
    }
    return false;
  }
  function removeFactorFromExpr(expr2, targetVarName) {
    expr2 = unwrap(expr2);
    if (isMatch(expr2, targetVarName)) {
      return Num(1);
    }
    if (expr2.type === "Neg") {
      const inner = removeFactorFromExpr(expr2.arg, targetVarName);
      if (structurallyEqual(inner, expr2.arg)) return expr2;
      if (inner.type === "Num" && inner.value === 1) return Num(-1);
      return { type: "Neg", arg: inner };
    }
    if (expr2.type === "Mul") {
      let idx = expr2.args.findIndex((a) => isMatch(a, targetVarName));
      if (idx !== -1) {
        const remaining = expr2.args.filter((_, i) => i !== idx);
        if (remaining.length === 0) return Num(1);
        if (remaining.length === 1) return remaining[0];
        return Mul(...remaining);
      }
      const negIdx = expr2.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== "Neg") return false;
        const inner = removeFactorFromExpr(u.arg, targetVarName);
        return !structurallyEqual(inner, u.arg);
      });
      if (negIdx !== -1) {
        const u = unwrap(expr2.args[negIdx]);
        const newInner = removeFactorFromExpr(u.arg, targetVarName);
        const newArg = newInner.type === "Num" && newInner.value === 1 ? Num(-1) : { type: "Neg", arg: newInner };
        const newArgs = expr2.args.map((a, i) => i === negIdx ? newArg : a);
        return Mul(...newArgs);
      }
      idx = expr2.args.findIndex((a) => {
        const u = unwrap(a);
        return u.type === "Num" && u.value < 0 && String(-u.value) === String(targetVarName);
      });
      if (idx !== -1) {
        const newArgs = expr2.args.map((a, i) => i === idx ? Num(-1) : a);
        if (newArgs.length === 1) return newArgs[0];
        return Mul(...newArgs);
      }
      const divIdx = expr2.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== "Div") return false;
        const res = removeFactorFromExpr(u.num, targetVarName);
        return !structurallyEqual(res, u.num);
      });
      if (divIdx !== -1) {
        const u = unwrap(expr2.args[divIdx]);
        const newNum = removeFactorFromExpr(u.num, targetVarName);
        const newDiv = Div(newNum, u.den);
        const newArgs = expr2.args.map((a, i) => i === divIdx ? newDiv : a);
        return Mul(...newArgs);
      }
    }
    if (expr2.type === "Div") {
      const newNum = removeFactorFromExpr(expr2.num, targetVarName);
      return Div(newNum, expr2.den);
    }
    return expr2;
  }
  function addFactorToDenominator(expr2, factorNode) {
    expr2 = unwrap(expr2);
    if (expr2.type === "Neg") {
      return { type: "Neg", arg: addFactorToDenominator(expr2.arg, factorNode) };
    }
    if (expr2.type === "Div") {
      const curDen = unwrap(expr2.den);
      let newDen;
      if (curDen.type === "Mul") {
        newDen = Mul(...curDen.args, factorNode);
      } else {
        newDen = Mul(curDen, factorNode);
      }
      return Div(expr2.num, newDen);
    }
    return Div(expr2, factorNode);
  }
  function removeFactorFromDenominator(expr2, targetVarName) {
    expr2 = unwrap(expr2);
    if (expr2.type === "Neg") {
      const inner = removeFactorFromDenominator(expr2.arg, targetVarName);
      return structurallyEqual(inner, expr2.arg) ? expr2 : { type: "Neg", arg: inner };
    }
    if (expr2.type === "Div") {
      const den = unwrap(expr2.den);
      if (isMatch(den, targetVarName)) {
        return expr2.num;
      }
      if (den.type === "Neg") {
        const inner = removeFactorFromExpr(den.arg, targetVarName);
        if (!structurallyEqual(inner, den.arg)) {
          if (inner.type === "Num" && inner.value === 1) {
            return { type: "Neg", arg: expr2.num };
          }
          return Div(expr2.num, { type: "Neg", arg: inner });
        }
      }
      if (den.type === "Mul") {
        const idx = den.args.findIndex((a) => isMatch(a, targetVarName));
        if (idx !== -1) {
          const remaining = den.args.filter((_, i) => i !== idx);
          const newDen = remaining.length === 1 ? remaining[0] : Mul(...remaining);
          return Div(expr2.num, newDen);
        }
        const negIdx = den.args.findIndex((a) => {
          const u = unwrap(a);
          if (u.type !== "Neg") return false;
          const inner = removeFactorFromExpr(u.arg, targetVarName);
          return !structurallyEqual(inner, u.arg);
        });
        if (negIdx !== -1) {
          const u = unwrap(den.args[negIdx]);
          const newInner = removeFactorFromExpr(u.arg, targetVarName);
          const newArg = newInner.type === "Num" && newInner.value === 1 ? Num(-1) : { type: "Neg", arg: newInner };
          const newArgs = den.args.map((a, i) => i === negIdx ? newArg : a);
          return Div(expr2.num, Mul(...newArgs));
        }
      }
    }
    if (expr2.type === "Mul") {
      const idx = expr2.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== "Div") return false;
        const den = unwrap(u.den);
        if (isMatch(den, targetVarName)) return true;
        if (den.type === "Mul") {
          return den.args.some((d) => isMatch(d, targetVarName));
        }
        return false;
      });
      if (idx !== -1) {
        const updatedFactor = removeFactorFromDenominator(expr2.args[idx], targetVarName);
        const uFact = unwrap(updatedFactor);
        let newArgs;
        if (uFact.type === "Num" && uFact.value === 1) {
          newArgs = expr2.args.filter((_, i) => i !== idx);
          if (newArgs.length === 0) return Num(1);
          if (newArgs.length === 1) return newArgs[0];
          return Mul(...newArgs);
        } else {
          newArgs = expr2.args.map((arg, i) => i === idx ? updatedFactor : arg);
          return Mul(...newArgs);
        }
      }
    }
    return expr2;
  }
  function addFactorToNumerator(expr2, factorNode) {
    expr2 = unwrap(expr2);
    if (expr2.type === "Neg") {
      return { type: "Neg", arg: addFactorToNumerator(expr2.arg, factorNode) };
    }
    if (expr2.type === "Num" && expr2.value === 1) {
      return factorNode;
    }
    if (expr2.type === "Div") {
      const curNum = unwrap(expr2.num);
      let newNum;
      if (curNum.type === "Num" && curNum.value === 1) {
        newNum = factorNode;
      } else if (curNum.type === "Mul") {
        newNum = Mul(...curNum.args, factorNode);
      } else {
        newNum = Mul(curNum, factorNode);
      }
      return Div(newNum, expr2.den);
    }
    if (expr2.type === "Mul") {
      return Mul(...expr2.args, factorNode);
    }
    return Mul(expr2, factorNode);
  }
  function moveAdditiveTermByDrag(fromExpr, toExpr, targetVarName) {
    const terms = additiveTerms(fromExpr);
    const idx = terms.findIndex((t) => isMatch(t.node, targetVarName));
    if (idx < 0) return null;
    const matched = terms[idx];
    const remaining = terms.filter((_, i) => i !== idx);
    const newFrom = remaining.length === 0 ? Num(0) : rebuildSum(remaining);
    const movedNode = matched.node;
    let newTo;
    const isToZero = isNum(unwrap(toExpr)) && unwrap(toExpr).value === 0;
    if (isToZero) {
      newTo = matched.sign === "-" ? movedNode : Neg(movedNode);
    } else {
      newTo = matched.sign === "-" ? Add(toExpr, movedNode) : Sub(toExpr, movedNode);
    }
    return { newFrom: canonical(newFrom), newTo: canonical(newTo), sign: matched.sign };
  }
  function treeContainsTarget(node, targetVarName) {
    if (!node) return false;
    const u = unwrap(node);
    if (isMatch(u, targetVarName)) return true;
    if (u.type === "Var" && u.name === targetVarName) return true;
    if (u.type === "Num" && String(u.value) === String(targetVarName)) return true;
    if (toPretty(u, 0) === targetVarName) return true;
    if (u.args) return u.args.some((a) => treeContainsTarget(a, targetVarName));
    if (u.arg) return treeContainsTarget(u.arg, targetVarName);
    if (u.num && treeContainsTarget(u.num, targetVarName)) return true;
    if (u.den && treeContainsTarget(u.den, targetVarName)) return true;
    if (u.base && treeContainsTarget(u.base, targetVarName)) return true;
    if (u.exp && treeContainsTarget(u.exp, targetVarName)) return true;
    return false;
  }
  function findMulSum(node, varName, prettyName) {
    const un = unwrap(node);
    if (!un) return null;
    if (un.type === "Mul") {
      for (let i = 0; i < un.args.length; i++) {
        const a = unwrap(un.args[i]);
        if ((a.type === "Add" || a.type === "Sub") && treeContainsTarget(a, varName)) {
          const others = un.args.filter((_, idx) => idx !== i);
          const multText = others.map((f) => prettyVar(toPretty(f, 0))).join(" \xB7 ") || "un altro fattore";
          const sumText = prettyVar(toPretty(a, 0));
          return {
            error: `Non puoi spostare "${prettyName}" con la regola del trasporto perch\xE9 si trova all'interno della parentesi (${sumText}) moltiplicata per ${multText}! Devi prima dividere entrambi i membri per ${multText} per liberare la parentesi, oppure puoi trascinare l'intero blocco (${sumText}) al denominatore dell'altro membro.`,
            hint: `Trascina prima ${multText} al denominatore dell'altro membro per dividere per ${multText}, oppure trascina l'intera parentesi (${sumText}) al denominatore!`
          };
        }
      }
    }
    if (un.args) {
      for (const a of un.args) {
        const r = findMulSum(a, varName, prettyName);
        if (r) return r;
      }
    }
    if (un.arg) return findMulSum(un.arg, varName, prettyName);
    if (un.num) return findMulSum(un.num, varName, prettyName);
    if (un.den) return findMulSum(un.den, varName, prettyName);
    return null;
  }
  function findDivSum(node, varName, prettyName) {
    const un = unwrap(node);
    if (!un) return null;
    if (un.type === "Div") {
      const num = unwrap(un.num);
      if ((num.type === "Add" || num.type === "Sub") && treeContainsTarget(num, varName)) {
        const denText = prettyVar(toPretty(un.den, 0));
        return {
          error: `Non puoi trasportare "${prettyName}" con cambio di segno finch\xE9 si trova al numeratore della frazione con denominatore ${denText}! Devi prima moltiplicare entrambi i membri per ${denText} per eliminare la frazione.`,
          hint: `Trascina prima ${denText} al numeratore dell'altro membro per moltiplicare per ${denText}.`
        };
      }
    }
    if (un.args) {
      for (const a of un.args) {
        const r = findDivSum(a, varName, prettyName);
        if (r) return r;
      }
    }
    if (un.arg) return findDivSum(un.arg, varName, prettyName);
    if (un.num) return findDivSum(un.num, varName, prettyName);
    if (un.den) return findDivSum(un.den, varName, prettyName);
    return null;
  }
  function findFunctionArg(node, varName, prettyName) {
    const un = unwrap(node);
    if (!un) return null;
    if (["Sin", "Cos", "Tan", "Ln", "Exp", "Asin", "Acos", "Atan", "Sqrt"].includes(un.type)) {
      if (treeContainsTarget(un.arg, varName)) {
        const fnName = un.type === "Sqrt" ? "radice quadrata" : `funzione ${un.type.toLowerCase()}`;
        return {
          error: `"${prettyName}" si trova all'interno dell'argomento di una ${fnName}! Non puoi trasportarlo con il 1\xB0 principio finch\xE9 non applichi l'operazione inversa per liberare l'argomento.`,
          hint: `Isola prima la ${fnName} ed applica l'operazione inversa dal tastierino.`
        };
      }
    }
    if (un.args) {
      for (const a of un.args) {
        const r = findFunctionArg(a, varName, prettyName);
        if (r) return r;
      }
    }
    if (un.arg) return findFunctionArg(un.arg, varName, prettyName);
    if (un.num) return findFunctionArg(un.num, varName, prettyName);
    if (un.den) return findFunctionArg(un.den, varName, prettyName);
    return null;
  }
  function findPow(node, varName, prettyName) {
    const un = unwrap(node);
    if (!un) return null;
    if (un.type === "Pow") {
      if (treeContainsTarget(un.base, varName) || treeContainsTarget(un.exp, varName)) {
        const powText = prettyVar(toPretty(un, 0));
        return {
          error: `"${prettyName}" fa parte della potenza ${powText}! Non puoi trasportarlo singolarmente con il 1\xB0 principio.`,
          hint: `Trascina l'intera potenza oppure isolala ed estrai la radice.`
        };
      }
    }
    if (un.args) {
      for (const a of un.args) {
        const r = findPow(a, varName, prettyName);
        if (r) return r;
      }
    }
    if (un.arg) return findPow(un.arg, varName, prettyName);
    if (un.num) return findPow(un.num, varName, prettyName);
    if (un.den) return findPow(un.den, varName, prettyName);
    return null;
  }
  function diagnoseInvalidAdditiveMove(fromExpr, varName, prettyName) {
    const u = unwrap(fromExpr);
    const mulSumRes = findMulSum(u, varName, prettyName);
    if (mulSumRes) return mulSumRes;
    const divSumRes = findDivSum(u, varName, prettyName);
    if (divSumRes) return divSumRes;
    const fnRes = findFunctionArg(u, varName, prettyName);
    if (fnRes) return fnRes;
    const powRes = findPow(u, varName, prettyName);
    if (powRes) return powRes;
    if (u.type === "Add" || u.type === "Sub") {
      for (const term of u.args) {
        const uTerm = unwrap(term);
        if (uTerm.type === "Mul" && treeContainsTarget(uTerm, varName)) {
          const termText = prettyVar(toPretty(uTerm, 0));
          return {
            error: `Non puoi trasportare solo "${prettyName}": fa parte del termine moltiplicativo composto "${termText}". Trascina l'intero blocco del termine per trasportarlo con cambio di segno!`,
            hint: `Trascina l'intero termine "${termText}" oppure isolalo prima dagli altri addendi.`
          };
        }
      }
    }
    const testFactor = removeFactorFromExpr(fromExpr, varName);
    if (!structurallyEqual(testFactor, fromExpr)) {
      return {
        error: `"${prettyName}" \xE8 un fattore che moltiplica l'intero membro, non un termine additivo! Per il 2\xB0 principio di equivalenza (divisione), per trasportarlo rilascialo sotto la linea di frazione (nello slot denominatore).`,
        hint: `Trascina "${prettyName}" sotto la linea di frazione del membro opposto per dividere.`
      };
    }
    return {
      error: `Operazione non valida: "${prettyName}" non pu\xF2 essere spostato con il 1\xB0 principio di equivalenza perch\xE9 non \xE8 un addendo isolato dell'intero membro.`,
      hint: `Verifica le precedenze delle operazioni: parentesi, moltiplicazioni o frazioni bloccano il trasporto diretto dell'addendo.`
    };
  }
  function diagnoseInvalidDivision(fromExpr, varName, prettyName) {
    const u = unwrap(fromExpr);
    const mulSumRes = findMulSum(u, varName, prettyName);
    if (mulSumRes) return mulSumRes;
    const divSumRes = findDivSum(u, varName, prettyName);
    if (divSumRes) return divSumRes;
    const fnRes = findFunctionArg(u, varName, prettyName);
    if (fnRes) return fnRes;
    const powRes = findPow(u, varName, prettyName);
    if (powRes) return powRes;
    if (u.type === "Add" || u.type === "Sub") {
      return {
        error: `Non puoi dividere per "${prettyName}" finch\xE9 fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno (1\xB0 principio).`,
        hint: `Trascina "${prettyName}" nello slot \xB1 accanto al membro opposto per trasportarlo.`
      };
    }
    return {
      error: `"${prettyName}" non \xE8 un fattore moltiplicativo dell'intero membro: non puoi dividere per esso.`,
      hint: `Puoi dividere solo per fattori che moltiplicano l'intero membro o l'intero numeratore.`
    };
  }
  function applyDragMove({ currentEq, varName, nodeType, fromSide, fromSlot, targetSide, targetSlot }) {
    if (!currentEq || !varName) {
      return { ok: false, error: "Dati trascinamento non validi." };
    }
    if (fromSide === targetSide) {
      if (fromSlot === "num" && targetSlot === "den") {
        const oppMember = fromSide === "right" ? "primo membro (sotto la linea di frazione a sinistra)" : "secondo membro (sotto la linea di frazione a destra)";
        return {
          ok: false,
          error: `Non puoi spostare ${prettyVar(varName)} al denominatore dello stesso membro! Per il 2\xB0 principio di equivalenza, se dividi per ${prettyVar(varName)}, esso va al denominatore del membro OPPOSTO (${oppMember}).`,
          hint: `Trascina ${prettyVar(varName)} sotto la linea di frazione del membro opposto!`
        };
      }
      return {
        ok: false,
        error: "Trascina la variabile dall'altra parte dell'uguale per applicare la regola del trasporto!"
      };
    }
    let factorNode;
    if (nodeType === "Num") {
      factorNode = Num(Number(varName));
    } else {
      try {
        const cleanVar = varName.replace(/[₀-₉]/g, (c) => ({ "\u2080": "0", "\u2081": "1", "\u2082": "2", "\u2083": "3", "\u2084": "4", "\u2085": "5", "\u2086": "6", "\u2087": "7", "\u2088": "8", "\u2089": "9" })[c] || c).replace(/−/g, "-").replace(/·/g, "*");
        factorNode = parseExpression(cleanVar);
      } catch {
        factorNode = Var(varName);
      }
    }
    const prettyName = prettyVar(varName);
    let leftExpr = currentEq.left;
    let rightExpr = currentEq.right;
    if (fromSlot === "den" && targetSlot === "num") {
      const fromExpr = fromSide === "left" ? leftExpr : rightExpr;
      const updatedFrom = removeFactorFromDenominator(fromExpr, varName);
      if (structurallyEqual(updatedFrom, fromExpr)) {
        return {
          ok: false,
          error: `"${prettyName}" non \xE8 un fattore dell'intero denominatore: non puoi moltiplicare per esso finch\xE9 fa parte di una somma.`
        };
      }
      if (fromSide === "right") {
        rightExpr = updatedFrom;
        leftExpr = addFactorToNumerator(leftExpr, factorNode);
      } else {
        leftExpr = updatedFrom;
        rightExpr = addFactorToNumerator(rightExpr, factorNode);
      }
      const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
      return {
        ok: true,
        principle: "second",
        newEq,
        ruleName: `Trasporto di ${prettyName} a moltiplicare`,
        rulePrinciple: `Secondo principio di equivalenza: moltiplicando entrambi i membri per ${prettyName}, ${prettyName} si semplifica al denominatore e compare al numeratore dall'altro membro.`,
        steps: [`Trascino ${prettyName} dal denominatore al numeratore dell'altro membro (moltiplico entrambi i membri per ${prettyName}).`],
        conditions: [`${varName} \u2260 0`]
      };
    }
    if (fromSlot === "num" && targetSlot === "den") {
      const fromExpr = fromSide === "left" ? leftExpr : rightExpr;
      const uFrom = unwrap(fromExpr);
      const rawFrom = uFrom.type === "Neg" ? unwrap(uFrom.arg) : uFrom;
      if (rawFrom.type === "Add" || rawFrom.type === "Sub") {
        return {
          ok: false,
          error: `Non puoi dividere per "${prettyName}" finch\xE9 fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno.`
        };
      }
      const updatedFrom = removeFactorFromExpr(fromExpr, varName);
      if (structurallyEqual(updatedFrom, fromExpr)) {
        const diag = diagnoseInvalidDivision(fromExpr, varName, prettyName);
        return {
          ok: false,
          error: diag.error,
          hint: diag.hint
        };
      }
      if (fromSide === "left") {
        leftExpr = updatedFrom;
        rightExpr = addFactorToDenominator(rightExpr, factorNode);
      } else {
        rightExpr = updatedFrom;
        leftExpr = addFactorToDenominator(leftExpr, factorNode);
      }
      const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
      return {
        ok: true,
        principle: "second",
        newEq,
        ruleName: `Trasporto di ${prettyName} al denominatore`,
        rulePrinciple: `Secondo principio di equivalenza: dividendo entrambi i membri per ${prettyName}, compare la linea di frazione e ${prettyName} va al denominatore (${varName} \u2260 0).`,
        steps: [`Trascino ${prettyName} dal numeratore al denominatore dell'altro membro: compare la linea di frazione e divido entrambi i membri per ${prettyName}.`],
        conditions: [`${varName} \u2260 0`]
      };
    }
    if (targetSlot === "add" || fromSlot === "num" && targetSlot === "num") {
      const fromExpr = fromSide === "left" ? leftExpr : rightExpr;
      const toExpr = fromSide === "left" ? rightExpr : leftExpr;
      const additiveRes = moveAdditiveTermByDrag(fromExpr, toExpr, varName);
      if (additiveRes) {
        const newL = fromSide === "left" ? additiveRes.newFrom : additiveRes.newTo;
        const newR = fromSide === "left" ? additiveRes.newTo : additiveRes.newFrom;
        const newEq = Eq(unwrap(newL), unwrap(newR));
        const opText = additiveRes.sign === "-" ? `sommo ${prettyName}` : `sottraggo ${prettyName}`;
        return {
          ok: true,
          principle: "first",
          newEq,
          ruleName: `Trasporto del termine ${prettyName} (cambio segno)`,
          rulePrinciple: `Primo principio di equivalenza: spostando un termine additivo all'altro membro, esso cambia di segno (${opText} a entrambi i membri).`,
          steps: [`Trascino ${prettyName} all'altro membro con cambiamento di segno.`],
          conditions: []
        };
      }
      if (targetSlot === "num") {
        const updatedFrom = removeFactorFromExpr(fromExpr, varName);
        if (!structurallyEqual(updatedFrom, fromExpr)) {
          if (fromSide === "left") {
            leftExpr = updatedFrom;
            rightExpr = addFactorToDenominator(rightExpr, factorNode);
          } else {
            rightExpr = updatedFrom;
            leftExpr = addFactorToDenominator(leftExpr, factorNode);
          }
          const newEq = Eq(canonical(leftExpr), canonical(rightExpr));
          return {
            ok: true,
            principle: "second",
            newEq,
            ruleName: `Trasporto di ${prettyName} al denominatore`,
            rulePrinciple: `Secondo principio di equivalenza: dividendo entrambi i membri per ${prettyName}, compare la linea di frazione e ${prettyName} va al denominatore (${varName} \u2260 0).`,
            steps: [`Trascino ${prettyName} all'altro membro: compare la linea di frazione e divido entrambi i membri per ${prettyName}.`],
            conditions: [`${varName} \u2260 0`]
          };
        }
      }
      const diag = diagnoseInvalidAdditiveMove(fromExpr, varName, prettyName);
      return {
        ok: false,
        error: diag.error,
        hint: diag.hint
      };
    }
    return {
      ok: false,
      error: `Mossa non valida per ${prettyName}. Rilascia sul denominatore per dividere o nello slot accanto per trasportare il termine.`
    };
  }
  var _arrowSvg = null;
  var _arrowContainer = null;
  var _arrowPath = null;
  var _arrowHideTimer = null;
  function initDragArrow() {
    if (_arrowSvg && _arrowSvg.parentNode) _arrowSvg.parentNode.removeChild(_arrowSvg);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "drag-arrow-overlay");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;overflow:visible;z-index:9998";
    const defs = document.createElementNS(NS, "defs");
    const marker = document.createElementNS(NS, "marker");
    marker.setAttribute("id", "drag-arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "4");
    marker.setAttribute("orient", "auto");
    const tip = document.createElementNS(NS, "polygon");
    tip.setAttribute("points", "0 0, 10 4, 0 8");
    tip.setAttribute("fill", "#ef4444");
    marker.appendChild(tip);
    defs.appendChild(marker);
    svg.appendChild(defs);
    const path = document.createElementNS(NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ef4444");
    path.setAttribute("stroke-width", "2.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("marker-end", "url(#drag-arrowhead)");
    path.style.visibility = "hidden";
    path.style.opacity = "0";
    svg.appendChild(path);
    document.body.appendChild(svg);
    _arrowSvg = svg;
    _arrowPath = path;
    _arrowContainer = null;
  }
  function updateDragArrow(sourceEl, targetEl, crossesMember) {
    if (!_arrowPath || !sourceEl || !targetEl) return;
    if (_arrowHideTimer) {
      clearTimeout(_arrowHideTimer);
      _arrowHideTimer = null;
    }
    const sR = sourceEl.getBoundingClientRect();
    const tR = targetEl.getBoundingClientRect();
    const x1 = sR.left + sR.width / 2;
    const y1 = sR.top + sR.height / 2;
    const x2 = tR.left + tR.width / 2;
    const y2 = tR.top + tR.height / 2;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
    const shorten = Math.min(14, len * 0.12);
    const ex = x2 - (x2 - x1) / len * shorten;
    const ey = y2 - (y2 - y1) / len * shorten;
    const slot = targetEl.dataset.slot || targetEl.closest("[data-slot]") && targetEl.closest("[data-slot]").dataset.slot;
    const isTransport = slot === "add" || targetEl.classList.contains("dropzone-adjacent") || !!targetEl.closest(".dropzone-adjacent");
    let d;
    if (isTransport) {
      const midX = (x1 + ex) / 2;
      const topY = Math.min(y1, ey) - 72;
      d = `M ${x1} ${y1} C ${midX} ${topY} ${midX} ${topY} ${ex} ${ey}`;
    } else {
      d = `M ${x1} ${y1} L ${ex} ${ey}`;
    }
    try {
      _arrowPath.style.d = `path("${d}")`;
    } catch (_) {
    }
    _arrowPath.setAttribute("d", d);
    _arrowPath.style.visibility = "visible";
    _arrowPath.style.opacity = "0.92";
  }
  function hideDragArrow() {
    if (!_arrowPath) return;
    if (_arrowHideTimer) clearTimeout(_arrowHideTimer);
    _arrowPath.style.opacity = "0";
    _arrowHideTimer = setTimeout(() => {
      if (_arrowPath) _arrowPath.style.visibility = "hidden";
      _arrowHideTimer = null;
    }, 320);
  }
  var activeDragData = null;
  var touchDragClone = null;
  function setupEquationDragAndDrop(container, { onApplyMove, getCurrentEquation }) {
    if (!container) return;
    let activeDragSourceEl = null;
    container.querySelectorAll(".draggable-token").forEach((token) => {
      token.setAttribute("draggable", "true");
      token.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        const varName = token.dataset.varName;
        const fromSide = token.dataset.side;
        const fromSlot = token.dataset.slot || "num";
        const nodeType = token.dataset.nodeType || "Var";
        activeDragData = { varName, fromSide, fromSlot, nodeType };
        activeDragSourceEl = token;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", JSON.stringify(activeDragData));
          e.dataTransfer.effectAllowed = "move";
        }
        token.classList.add("is-being-dragged");
        container.classList.add("is-dragging-equation");
        highlightDropzones(container, activeDragData);
      });
      token.addEventListener("dragend", () => {
        token.classList.remove("is-being-dragged");
        container.classList.remove("is-dragging-equation");
        clearDropzonesHighlight(container);
        hideDragArrow();
        activeDragData = null;
        activeDragSourceEl = null;
      });
    });
    container.addEventListener("dragover", (e) => {
      if (!activeDragData || !activeDragSourceEl) return;
      const dz = e.target.closest(".dropzone[data-side][data-slot]");
      if (dz && !dz.contains(activeDragSourceEl)) {
        const crossesMember = dz.dataset.side !== activeDragData.fromSide;
        updateDragArrow(activeDragSourceEl, dz, crossesMember);
      } else {
        hideDragArrow();
      }
    });
    container.querySelectorAll(".dropzone").forEach((dropzone) => {
      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        dropzone.classList.add("dropzone-hover");
        const slot = dropzone.querySelector(".drop-slot");
        if (slot) slot.classList.add("drop-slot-hover");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dropzone-hover");
        const slot = dropzone.querySelector(".drop-slot");
        if (slot) slot.classList.remove("drop-slot-hover");
      });
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone-hover");
        const slot = dropzone.querySelector(".drop-slot");
        if (slot) slot.classList.remove("drop-slot-hover");
        container.classList.remove("is-dragging-equation");
        let dragData = activeDragData;
        if (!dragData && e.dataTransfer) {
          try {
            const raw = e.dataTransfer.getData("text/plain");
            if (raw) dragData = JSON.parse(raw);
          } catch {
          }
        }
        if (!dragData) return;
        const targetSide = dropzone.dataset.side;
        const targetSlot = dropzone.dataset.slot;
        const sourceRect = activeDragSourceEl ? activeDragSourceEl.getBoundingClientRect() : null;
        const targetRect = dropzone.getBoundingClientRect();
        const tokenText = dragData ? dragData.varName || "" : "";
        const currentEq = getCurrentEquation();
        const result = applyDragMove({
          currentEq,
          varName: dragData.varName,
          nodeType: dragData.nodeType,
          fromSide: dragData.fromSide,
          fromSlot: dragData.fromSlot,
          targetSide,
          targetSlot
        });
        clearDropzonesHighlight(container);
        activeDragData = null;
        if (onApplyMove) {
          onApplyMove(result, { sourceRect, targetRect, tokenText, targetSide, targetSlot, varName: dragData?.varName });
        }
      });
    });
    setupTouchDragFallback(container, { onApplyMove, getCurrentEquation });
  }
  function highlightDropzones(container, dragData) {
    const oppositeSide = dragData.fromSide === "left" ? "right" : "left";
    container.querySelectorAll(`.dropzone[data-side="${oppositeSide}"]`).forEach((dz) => {
      dz.classList.add("dropzone-active-target");
    });
    container.querySelectorAll(`.drop-slot[data-side="${oppositeSide}"]`).forEach((slot) => {
      slot.classList.add("drop-slot-visible");
    });
    container.querySelectorAll(`.dynamic-fraction-wrapper[data-side="${oppositeSide}"]`).forEach((wrap) => {
      wrap.classList.add("wrapper-expanded");
    });
    container.querySelectorAll(`.dropzone-adjacent[data-side="${oppositeSide}"]`).forEach((adj) => {
      adj.classList.add("adjacent-active");
    });
  }
  function clearDropzonesHighlight(container) {
    container.querySelectorAll(".dropzone").forEach((dz) => {
      dz.classList.remove("dropzone-active-target", "dropzone-hover");
    });
    container.querySelectorAll(".drop-slot").forEach((slot) => {
      slot.classList.remove("drop-slot-visible", "drop-slot-hover");
    });
    container.querySelectorAll(".dynamic-fraction-wrapper").forEach((wrap) => {
      wrap.classList.remove("wrapper-expanded");
    });
    container.querySelectorAll(".dropzone-adjacent").forEach((adj) => {
      adj.classList.remove("adjacent-active");
    });
  }
  function setupTouchDragFallback(container, { onApplyMove, getCurrentEquation }) {
    let touchStartPos = null;
    let draggedElem = null;
    container.querySelectorAll(".draggable-token").forEach((token) => {
      token.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") return;
        draggedElem = token;
        touchStartPos = { x: e.clientX, y: e.clientY };
        const varName = token.dataset.varName;
        const fromSide = token.dataset.side;
        const fromSlot = token.dataset.slot || "num";
        const nodeType = token.dataset.nodeType || "Var";
        activeDragData = { varName, fromSide, fromSlot, nodeType };
        touchDragClone = document.createElement("div");
        touchDragClone.className = "touch-drag-badge";
        touchDragClone.textContent = token.textContent.trim();
        touchDragClone.style.left = `${e.clientX}px`;
        touchDragClone.style.top = `${e.clientY}px`;
        document.body.appendChild(touchDragClone);
        container.classList.add("is-dragging-equation");
        highlightDropzones(container, activeDragData);
        token.setPointerCapture(e.pointerId);
      });
      token.addEventListener("pointermove", (e) => {
        if (!touchDragClone || draggedElem !== token) return;
        touchDragClone.style.left = `${e.clientX}px`;
        touchDragClone.style.top = `${e.clientY}px`;
        const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
        const dropzone = elemBelow ? elemBelow.closest(".dropzone") : null;
        container.querySelectorAll(".dropzone").forEach((dz) => {
          dz.classList.remove("dropzone-hover");
          const slot = dz.querySelector(".drop-slot");
          if (slot) slot.classList.remove("drop-slot-hover");
        });
        if (dropzone) {
          dropzone.classList.add("dropzone-hover");
          const slot = dropzone.querySelector(".drop-slot");
          if (slot) slot.classList.add("drop-slot-hover");
          const crossesMember = dropzone.dataset.side !== activeDragData?.fromSide;
          updateDragArrow(token, dropzone, crossesMember);
        } else {
          hideDragArrow();
        }
      });
      token.addEventListener("pointerup", (e) => {
        if (!draggedElem || draggedElem !== token) return;
        const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
        const dropzone = elemBelow ? elemBelow.closest(".dropzone") : null;
        if (touchDragClone && touchDragClone.parentNode) {
          touchDragClone.parentNode.removeChild(touchDragClone);
        }
        touchDragClone = null;
        container.classList.remove("is-dragging-equation");
        hideDragArrow();
        if (dropzone && activeDragData) {
          const targetSide = dropzone.dataset.side;
          const targetSlot = dropzone.dataset.slot;
          const sourceRect = draggedElem ? draggedElem.getBoundingClientRect() : touchStartPos ? { left: touchStartPos.x - 20, top: touchStartPos.y - 15, width: 40, height: 30 } : null;
          const targetRect = dropzone.getBoundingClientRect();
          const tokenText = activeDragData ? activeDragData.varName || "" : "";
          const currentEq = getCurrentEquation();
          const result = applyDragMove({
            currentEq,
            varName: activeDragData.varName,
            nodeType: activeDragData.nodeType,
            fromSide: activeDragData.fromSide,
            fromSlot: activeDragData.fromSlot,
            targetSide,
            targetSlot
          });
          clearDropzonesHighlight(container);
          const varName = activeDragData.varName;
          activeDragData = null;
          draggedElem = null;
          if (onApplyMove) onApplyMove(result, { sourceRect, targetRect, tokenText, targetSide, targetSlot, varName });
        } else {
          clearDropzonesHighlight(container);
          activeDragData = null;
          draggedElem = null;
        }
      });
      token.addEventListener("pointercancel", () => {
        if (touchDragClone && touchDragClone.parentNode) {
          touchDragClone.parentNode.removeChild(touchDragClone);
        }
        touchDragClone = null;
        container.classList.remove("is-dragging-equation");
        clearDropzonesHighlight(container);
        hideDragArrow();
        activeDragData = null;
        draggedElem = null;
      });
    });
  }

  // js/physics-units.js
  var PHYSICAL_QUANTITIES = {
    // --- Cinematica e Geometria ---
    s: { name: "Spazio / Distanza percorsa", unit: "m", sample: 100 },
    s0: { name: "Posizione iniziale", unit: "m", sample: 0 },
    x: { name: "Posizione / Coordinata", unit: "m", sample: 50 },
    x0: { name: "Posizione iniziale", unit: "m", sample: 0 },
    y: { name: "Altezza / Ordinata", unit: "m", sample: 20 },
    y0: { name: "Altezza iniziale", unit: "m", sample: 0 },
    h: { name: "Altezza", unit: "m", sample: 25 },
    d: { name: "Distanza / Spessore", unit: "m", sample: 10 },
    r: { name: "Raggio", unit: "m", sample: 5 },
    R: { name: "Raggio / Resistenza", unit: "m", sample: 10 },
    // overridden by topic
    l: { name: "Lunghezza", unit: "m", sample: 2 },
    L: { name: "Lunghezza / Lavoro", unit: "m", sample: 4 },
    Delta_s: { name: "Spostamento", unit: "m", sample: 80 },
    Delta_x: { name: "Spostamento", unit: "m", sample: 60 },
    // --- Tempo ---
    t: { name: "Tempo / Istante", unit: "s", sample: 4 },
    t0: { name: "Istante iniziale", unit: "s", sample: 0 },
    Delta_t: { name: "Intervallo di tempo", unit: "s", sample: 5 },
    T: { name: "Periodo / Temperatura", unit: "s", sample: 2 },
    // --- Velocità e Accelerazione ---
    v: { name: "Velocit\xE0", unit: "m/s", sample: 20 },
    v0: { name: "Velocit\xE0 iniziale", unit: "m/s", sample: 15 },
    v_f: { name: "Velocit\xE0 finale", unit: "m/s", sample: 30 },
    v0x: { name: "Componente orizzontale velocit\xE0", unit: "m/s", sample: 12 },
    v0y: { name: "Componente verticale velocit\xE0", unit: "m/s", sample: 16 },
    vm: { name: "Velocit\xE0 media", unit: "m/s", sample: 25 },
    a: { name: "Accelerazione", unit: "m/s\xB2", sample: 2 },
    ac: { name: "Accelerazione centripeta", unit: "m/s\xB2", sample: 4 },
    at: { name: "Accelerazione tangenziale", unit: "m/s\xB2", sample: 1.5 },
    g: { name: "Accelerazione di gravit\xE0", unit: "m/s\xB2", sample: 9.81 },
    // --- Dinamica e Forze ---
    m: { name: "Massa", unit: "kg", sample: 5 },
    M: { name: "Massa maggiore", unit: "kg", sample: 50 },
    m1: { name: "Massa 1", unit: "kg", sample: 2 },
    m2: { name: "Massa 2", unit: "kg", sample: 8 },
    F: { name: "Forza", unit: "N", sample: 40 },
    Fp: { name: "Forza peso", unit: "N", sample: 49.05 },
    Fe: { name: "Forza elastica", unit: "N", sample: 30 },
    Fa: { name: "Forza di attrito", unit: "N", sample: 10 },
    Fc: { name: "Forza centripeta", unit: "N", sample: 25 },
    k: { name: "Costante elastica", unit: "N/m", sample: 250 },
    mu: { name: "Coefficiente di attrito", unit: "adimensionale", sample: 0.25 },
    p: { name: "Pressione / Quantit\xE0 di moto", unit: "Pa", sample: 101325 },
    // --- Lavoro, Energia, Potenza ---
    E: { name: "Energia totale", unit: "J", sample: 600 },
    Ek: { name: "Energia cinetica", unit: "J", sample: 400 },
    Ep: { name: "Energia potenziale", unit: "J", sample: 200 },
    U: { name: "Energia potenziale / interna", unit: "J", sample: 350 },
    W: { name: "Lavoro", unit: "J", sample: 240 },
    Q: { name: "Calore / Carica", unit: "J", sample: 1200 },
    P: { name: "Potenza", unit: "W", sample: 1500 },
    // --- Termodinamica e Fluidi ---
    V: { name: "Volume / Tensione", unit: "m\xB3", sample: 0.05 },
    rho: { name: "Densit\xE0", unit: "kg/m\xB3", sample: 1e3 },
    c: { name: "Calore specifico", unit: "J/(kg\xB7K)", sample: 4186 },
    cs: { name: "Calore specifico", unit: "J/(kg\xB7K)", sample: 900 },
    lambda: { name: "Calore latente / Lunghezza d'onda", unit: "J/kg", sample: 333500 },
    lam: { name: "Lunghezza d'onda", unit: "m", sample: 0.02 },
    n: { name: "Numero di moli", unit: "mol", sample: 2 },
    Delta_T: { name: "Variazione di temperatura", unit: "K", sample: 15 },
    // --- Onde, Suono e Acustica ---
    f: { name: "Frequenza", unit: "Hz", sample: 440 },
    fp: { name: "Frequenza percepita (Doppler)", unit: "Hz", sample: 480 },
    vs: { name: "Velocit\xE0 della sorgente sonora", unit: "m/s", sample: 25 },
    vo: { name: "Velocit\xE0 dell'osservatore", unit: "m/s", sample: 15 },
    fb: { name: "Frequenza di battimento", unit: "Hz", sample: 4 },
    f1: { name: "Frequenza sorgente 1", unit: "Hz", sample: 440 },
    f2: { name: "Frequenza sorgente 2", unit: "Hz", sample: 444 },
    omega: { name: "Velocit\xE0 angolare", unit: "rad/s", sample: 6.28 },
    theta: { name: "Angolo", unit: "rad", sample: 0.5236 },
    alpha: { name: "Accelerazione angolare / Angolo", unit: "rad/s\xB2", sample: 1.5 },
    phi: { name: "Fase / Angolo", unit: "rad", sample: 0 },
    // --- Elettromagnetismo ---
    I: { name: "Intensit\xE0 di corrente", unit: "A", sample: 2.5 },
    i: { name: "Intensit\xE0 di corrente", unit: "A", sample: 1.2 },
    q: { name: "Carica elettrica", unit: "C", sample: 5e-3 },
    q1: { name: "Carica 1", unit: "C", sample: 2e-3 },
    q2: { name: "Carica 2", unit: "C", sample: 4e-3 },
    B: { name: "Induzione magnetica (campo B)", unit: "T", sample: 0.5 },
    C: { name: "Capacit\xE0 elettrica", unit: "F", sample: 1e-4 },
    Delta_V: { name: "Differenza di potenziale", unit: "V", sample: 12 },
    Req: { name: "Resistenza equivalente", unit: "\u03A9", sample: 20 },
    R1: { name: "Resistenza 1", unit: "\u03A9", sample: 30 },
    R2: { name: "Resistenza 2", unit: "\u03A9", sample: 60 }
  };
  function getQuantityInfo(symbol, formulaEntry = null) {
    const topic = formulaEntry && formulaEntry.topic ? formulaEntry.topic.toLowerCase() : "";
    const formulaId = formulaEntry && formulaEntry.id ? formulaEntry.id.toLowerCase() : "";
    if (symbol === "R" || symbol === "Req" || symbol === "R1" || symbol === "R2") {
      if (topic.includes("elettricita") || topic.includes("circuito") || topic.includes("elettromagnetismo") || formulaId.includes("ohm")) {
        return { name: "Resistenza elettrica", unit: "\u03A9", sample: 10 };
      }
    }
    if (symbol === "V" || symbol === "Delta_V") {
      if (topic.includes("elettricita") || topic.includes("circuito") || topic.includes("elettromagnetismo") || formulaId.includes("ohm")) {
        return { name: "Differenza di potenziale (tensione)", unit: "V", sample: 12 };
      }
      if (topic.includes("termo") || topic.includes("fluid") || formulaId.includes("gas") || formulaId.includes("boyle")) {
        return { name: "Volume", unit: "m\xB3", sample: 0.04 };
      }
    }
    if (symbol === "T") {
      if (topic.includes("termo") || formulaId.includes("gas") || formulaId.includes("calor")) {
        return { name: "Temperatura assoluta", unit: "K", sample: 300 };
      }
      return { name: "Periodo di oscillazione", unit: "s", sample: 2 };
    }
    if (symbol === "Q") {
      if (topic.includes("elettr") || formulaId.includes("coulomb") || formulaId.includes("condensatore")) {
        return { name: "Carica elettrica", unit: "C", sample: 0.02 };
      }
      return { name: "Quantit\xE0 di calore", unit: "J", sample: 1e3 };
    }
    if (symbol === "p") {
      if (formulaId.includes("quantita-di-moto") || topic.includes("urti")) {
        return { name: "Quantit\xE0 di moto", unit: "kg\xB7m/s", sample: 25 };
      }
      return { name: "Pressione", unit: "Pa", sample: 101325 };
    }
    if (symbol === "k") {
      if (topic.includes("elettr") || formulaId.includes("coulomb")) {
        return { name: "Costante di Coulomb", unit: "N\xB7m\xB2/C\xB2", sample: 899e7 };
      }
      return { name: "Costante elastica", unit: "N/m", sample: 200 };
    }
    if (symbol === "I") {
      if (topic.includes("suono") || topic.includes("onde") || topic.includes("acust")) {
        return { name: "Intensit\xE0 sonora", unit: "W/m\xB2", sample: 1e-3 };
      }
    }
    if (PHYSICAL_QUANTITIES[symbol]) {
      return { ...PHYSICAL_QUANTITIES[symbol] };
    }
    return {
      name: `Grandezza ${prettyVar(symbol)}`,
      unit: "u.m.",
      sample: 5
    };
  }
  function formatResultNumber(val) {
    if (val === null || val === void 0 || !Number.isFinite(val)) return "\u2014";
    if (Math.abs(val) === 0) return "0";
    const absVal = Math.abs(val);
    if (absVal >= 1e5 || absVal < 1e-3) {
      return val.toExponential(3).replace("e+", " \xD7 10^").replace("e-", " \xD7 10^-");
    }
    if (Number.isInteger(val)) {
      return String(val);
    }
    const rounded = parseFloat(val.toFixed(4));
    return String(rounded);
  }

  // js/tests.js
  var counter = 0;
  function test(name, fn) {
    const id = "test-" + counter++;
    try {
      const r = fn();
      const ok = r === true || r !== false && typeof r !== "string";
      return { id, name, ok, detail: typeof r === "string" ? r : null };
    } catch (err) {
      return { id, name, ok: false, detail: err.message };
    }
  }
  function eq(str) {
    return parseEquation(str);
  }
  function expr(str) {
    return parseExpression(str);
  }
  function checkRule(ruleKey, input, ctx, expected) {
    const inputEq = eq(input);
    const expectedEq = eq(expected);
    const res = applyRule(RULES[ruleKey], inputEq, ctx);
    if (!res.ok) return `regola rifiutata: ${res.error}`;
    if (!equivalentEq(res.equation, expectedEq)) {
      return `atteso ${expected}, ottenuto ${toPretty(res.equation, 0)}`;
    }
    return true;
  }
  function checkReject(ruleKey, input, ctx) {
    const inputEq = eq(input);
    const res = applyRule(RULES[ruleKey], inputEq, ctx);
    if (res.ok) return `la regola \xE8 stata accettata ma doveva essere rifiutata (${toPretty(res.equation, 0)})`;
    return true;
  }
  function runAllTests() {
    counter = 0;
    const results = [];
    results.push(test("Parser: v = s/t", () => {
      const e = eq("v = s/t");
      return equivalentEq(e, eq("v = s/t"));
    }));
    results.push(test("Parser: coefficiente implicito 2pir -> 2*pi*r", () => {
      const e = eq("C = 2*pi*r");
      return collectVars(e).has("r");
    }));
    results.push(test('Parser: errore su "v = s/" (denominatore mancante)', () => {
      try {
        eq("v = s/");
        return "nessun errore lanciato";
      } catch (e) {
        return e instanceof ParseError ? true : "tipo di errore errato: " + e.name;
      }
    }));
    results.push(test('Parser: errore su "v = (s/t" (parentesi non chiusa)', () => {
      try {
        eq("v = (s/t");
        return "nessun errore lanciato";
      } catch (e) {
        return e instanceof ParseError ? true : "tipo di errore errato";
      }
    }));
    results.push(test('Parser: errore su "v = s + " (termine mancante)', () => {
      try {
        eq("v = s +");
        return "nessun errore lanciato";
      } catch (e) {
        return e instanceof ParseError ? true : "tipo di errore errato";
      }
    }));
    results.push(test('Parser: errore su "v = s/(0)" (divisione per zero con parentesi)', () => {
      try {
        eq("v = s/(0)");
        return "nessun errore lanciato";
      } catch (e) {
        return e instanceof ParseError ? true : "tipo di errore errato: " + e.name;
      }
    }));
    results.push(test(
      "Regola: v = s/t, divido? no \u2014 moltiplico per t -> v*t = s",
      () => checkRule("mulBoth", "v = s/t", { value: expr("t"), valueText: "t" }, "v*t = (s/t)*t")
    ));
    results.push(test(
      "Regola: primo principio x - a = b -> x = b + a (trasporto termine)",
      () => checkRule("moveTerm", "x - a = b", { term: expr("a"), side: "left", termText: "a" }, "x = b + a")
    ));
    results.push(test(
      "Regola: scambio membri a = b -> b = a",
      () => checkRule("swapSides", "a = b", {}, "b = a")
    ));
    results.push(test(
      "Regola: moltiplicazione incrociata a/b = c/d -> a*d = b*c",
      () => checkRule("crossMultiply", "a/b = c/d", {}, "a*d = b*c")
    ));
    results.push(test(
      "Regola: inversione a/b = c/d -> b/a = d/c",
      () => checkRule("invertProportion", "a/b = c/d", {}, "b/a = d/c")
    ));
    results.push(test(
      "Regola: divisione entrambi i membri 4*x = 8 -> 4*x/2 = 8/2",
      () => checkRule("divBoth", "4*x = 8", { value: expr("2"), valueText: "2" }, "(4*x)/2 = 8/2")
    ));
    results.push(test(
      "Regola: trasporto fattore 2*L = b -> 2*L/2 = b/2",
      () => checkRule("moveFactor", "2*L = b", { factor: expr("2"), side: "left", factorText: "2" }, "(2*L)/2 = b/2")
    ));
    results.push(test(
      "Regola: propriet\xE0 distributiva a*(x + b) = c -> a*x + a*b = c",
      () => checkRule("distribute", "a*(x + b) = c", { side: "left" }, "a*x + a*b = c")
    ));
    results.push(test(
      "Regola: radice quadrata x^2 = 9 -> x = \xB1sqrt(9) (con \xB1)",
      () => {
        const res = applyRule(RULES.sqrtBoth, eq("x^2 = 9"), { side: "left", insideVar: "x" });
        if (!res.ok) return "regola rifiutata: " + res.error;
        const txt = toPretty(res.equation, 0);
        return txt.includes("\xB1") ? true : "manca il segno \xB1 in: " + txt;
      }
    ));
    results.push(test(
      "Regola: radice di indice pari x^4 = 16 -> x = \xB116^(1/4) (con \xB1)",
      () => {
        const res = applyRule(RULES.sqrtBoth, eq("x^4 = 16"), { side: "left", insideVar: "x" });
        if (!res.ok) return "regola rifiutata: " + res.error;
        const txt = toPretty(res.equation, 0);
        if (!txt.includes("\xB1")) return "manca il segno \xB1 in: " + txt;
        return res.conditions && res.conditions.some((c) => c.includes("\u2265")) ? true : "manca la condizione radicando \u2265 0";
      }
    ));
    results.push(test(
      "Regola: radice cubica x^3 = 27 -> x = 27^(1/3) SENZA \xB1",
      () => {
        const res = applyRule(RULES.rootOddBoth, eq("x^3 = 27"), { side: "left", insideVar: "x" });
        if (!res.ok) return "regola rifiutata: " + res.error;
        const txt = toPretty(res.equation, 0);
        if (txt.includes("\xB1")) return "la radice di indice dispari NON deve introdurre \xB1: " + txt;
        return res.conditions && res.conditions.length === 0 ? true : "la radice dispari non deve produrre condizioni di segno: " + JSON.stringify(res.conditions);
      }
    ));
    results.push(test(
      "Regola: radice dispari accetta radicando negativo x^3 = -8 -> x = (-8)^(1/3)",
      () => {
        const res = applyRule(RULES.rootOddBoth, eq("x^3 = -8"), { side: "left", insideVar: "x" });
        if (!res.ok) return "regola rifiutata: " + res.error;
        return !toPretty(res.equation, 0).includes("\xB1") ? true : "non deve comparire \xB1";
      }
    ));
    results.push(test(
      "Regola: cancellazione (s/t)*t = s (fattore comune tra frazione e prodotto)",
      () => {
        const res = applyRule(RULES.cancelFactor, eq("v*t = (s/t)*t"), { den: expr("t"), side: "right", denText: "t" });
        if (!res.ok) return "regola rifiutata: " + res.error;
        return equivalentEq(res.equation, eq("v*t = s")) ? true : "atteso v*t = s, ottenuto " + toPretty(res.equation, 0);
      }
    ));
    results.push(test(
      "Regola: cancellazione rifiutata se non c'\xE8 fattore comune",
      () => checkReject("cancelFactor", "v*t = (s/t)*u", { den: expr("t"), side: "right", denText: "t" })
    ));
    results.push(test(
      "Mossa illecita: divisione per 0 rifiutata",
      () => checkReject("divBoth", "x = 5", { value: expr("0"), valueText: "0" })
    ));
    results.push(test(
      "Mossa illecita: moltiplicazione per 0 rifiutata",
      () => checkReject("mulBoth", "x = 5", { value: expr("0"), valueText: "0" })
    ));
    results.push(test(
      "Mossa illecita: inversione con un solo membro frazionario rifiutata",
      () => checkReject("invertProportion", "a/b = c", {})
    ));
    results.push(test(
      "Mossa illecita: moltiplicazione incrociata senza proporzione rifiutata",
      () => checkReject("crossMultiply", "a = c", {})
    ));
    results.push(test(
      "Mossa illecita: trasporto di un fattore che non esiste rifiutato",
      () => checkReject("moveFactor", "a + b = c", { factor: expr("a"), side: "left", factorText: "a" })
    ));
    results.push(test(
      "Equivalenza: x = y e y = x sono equivalenti",
      () => equivalentEq(eq("x = y"), eq("y = x"))
    ));
    results.push(test(
      "Non equivalenza: x = y e x = z NON equivalenti",
      () => equivalentEq(eq("x = y"), eq("x = z")) === false
    ));
    results.push(test(
      'Obiettivo: in "v = s/t" la var t NON \xE8 isolata',
      () => isGoalReached(eq("v = s/t"), "t") === false
    ));
    results.push(test(
      'Obiettivo: in "t = s/v" la var t \xC8 isolata',
      () => isGoalReached(eq("t = s/v"), "t") === true
    ));
    results.push(test(
      "Trasporto termine x - a = b raggiunge x isolata",
      () => isGoalReached(eq("x = b + a"), "x") === true
    ));
    results.push(test(
      "Suggerimento: per isolare t in v = s/t propone di moltiplicare per t",
      () => {
        const sug = suggestNextStep(eq("v = s/t"), "t");
        if (!sug.found) return "nessun suggerimento trovato";
        return sug.action.ruleKey === "mulBoth" ? true : "regola suggerita: " + sug.action.ruleKey;
      }
    ));
    results.push(test(
      "Enumerazione elementi: v = s/t produce pi\xF9 elementi selezionabili",
      () => enumerateElements(eq("v = s/t")).length >= 4
    ));
    results.push(test(
      "Catena: applicare il primo principio preserva la soluzione (v=s/t)",
      () => {
        const res = applyRule(RULES.mulBoth, eq("v = s/t"), { value: expr("t"), valueText: "t" });
        if (!res.ok) return "rifiutata: " + res.error;
        const hasV = collectVars(res.equation).has("v");
        const hasS = collectVars(res.equation).has("s");
        return hasV && hasS;
      }
    ));
    results.push(test(
      "Regola: cancellazione frazione numeratore (2*L)/2 = b -> L = b",
      () => {
        const res = applyRule(RULES.cancelFactor, eq("(2*L)/2 = b/2"), { den: expr("2"), side: "left", denText: "2" });
        if (!res.ok) return "rifiutata: " + res.error;
        return equivalentEq(res.equation, eq("L = b/2")) ? true : "atteso L = b/2, ottenuto " + toPretty(res.equation, 0);
      }
    ));
    results.push(test(
      "Regola: cancellazione frazione (t*v)/v = s/v -> t = s/v",
      () => {
        const res = applyRule(RULES.cancelFactor, eq("(t*v)/v = s/v"), { den: expr("v"), side: "left", denText: "v" });
        if (!res.ok) return "rifiutata: " + res.error;
        return equivalentEq(res.equation, eq("t = s/v")) ? true : "atteso t = s/v, ottenuto " + toPretty(res.equation, 0);
      }
    ));
    results.push(test(
      "Risoluzione completa: sequenza automatica per isolare t in v = s/t",
      () => {
        let current = eq("v = s/t");
        for (let s = 0; s < 6; s++) {
          if (isGoalReached(current, "t")) return true;
          const sug = suggestNextStep(current, "t");
          if (!sug.found) return "nessun suggerimento al passo " + s;
          const res = performAction(current, sug.action);
          if (!res.ok) return "azione fallita: " + res.error;
          current = res.equation;
        }
        return isGoalReached(current, "t") ? true : "obiettivo t non raggiunto: " + toPretty(current, 0);
      }
    ));
    results.push(test(
      "La stringa originale NON viene riscritta (nessun testo hardcoded)",
      () => {
        const e = eq("v = s/t");
        const tex = toPretty(e, 0);
        return tex.includes("v") && tex.includes("s") && tex.includes("t");
      }
    ));
    results.push(test(
      "Simboli con pedici greci: theta0 -> \u03B8\u2080 e omega0 -> \u03C9\u2080",
      () => prettyVar("theta0") === "\u03B8\u2080" && prettyVar("omega0") === "\u03C9\u2080" && prettyVar("alpha0") === "\u03B1\u2080"
    ));
    results.push(test(
      "LaTeX: conversione corretta per frazioni e radici",
      () => {
        const l1 = toLatex(eq("v = s/t"));
        const l2 = toLatex(eq("c = sqrt(a^2 + b^2)"));
        return l1 === "v = \\frac{s}{t}" && l2.includes("\\sqrt") && (l2.includes("a^{2}") || l2.includes("a^2"));
      }
    ));
    results.push(test(
      "LaTeX: theta = theta0 + omega0*t converte a \\theta = \\theta_0 + \\omega_0 \\cdot t",
      () => {
        const l = toLatex(eq("theta = theta0 + omega0*t"));
        return l === "\\theta = \\theta_0 + \\omega_0 \\cdot t";
      }
    ));
    results.push(test("Reciproci: v = s/t diventa 1/v = t/s", () => {
      const r = reciprocalEquation(eq("v = s/t"));
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("1/v = t/s")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Reciproci: A/B = C/D diventa B/A = D/C", () => {
      const r = reciprocalEquation(eq("A/B = C/D"));
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("B/A = D/C")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Reciproci: denominatore sottinteso F = m*a diventa 1/F = 1/(m*a)", () => {
      const r = reciprocalEquation(eq("F = m*a"));
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("1/F = 1/(m*a)")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Reciproci: (1/2)*m*v^2 estrae il fattore 2 al numeratore", () => {
      const r = reciprocalEquation(eq("Ec = (1/2)*m*v^2"));
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("1/Ec = 2/(m*v^2)")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Reciproci: somma di frazioni viene rifiutata con spiegazione", () => {
      const r = reciprocalEquation(eq("1/Req = 1/R1 + 1/R2"));
      if (r.ok) return "accettata ma doveva essere rifiutata";
      return !/somma/.test(r.error) ? `messaggio poco chiaro: ${r.error}` : true;
    }));
    results.push(test("Reciproci: applicata due volte torna all'equazione di partenza", () => {
      const start = eq("a = (v - v0)/t");
      const once = reciprocalEquation(start);
      if (!once.ok) return `rifiutata: ${once.error}`;
      const twice = reciprocalEquation(once.newEq);
      if (!twice.ok) return `rifiutata al secondo passaggio: ${twice.error}`;
      return equivalentEq(twice.newEq, start) || `ottenuto ${toPretty(twice.newEq, 0)}`;
    }));
    results.push(test("Notazione: i fattori sono ordinati (m\xB7v\xB2, non v\xB2\xB7m)", () => {
      const s = toPretty(canonical(eq("Ec = (1/2)*m*v^2")), 0);
      return s.includes("m\xB7v^2") ? true : `ottenuto ${s}`;
    }));
    results.push(test("Notazione: 1/2 resta frazione, non diventa 0.5", () => {
      const s = toPretty(canonical(eq("Ec = (1/2)*m*v^2")), 0);
      return s.includes("0.5") ? `decimalizzato: ${s}` : true;
    }));
    results.push(test("Notazione: 2\xB7(1/2)\xB7m si semplifica in m", () => {
      const s = toPretty(canonical(parseExpression("2*(1/2)*m")), 0);
      return s === "m" ? true : `ottenuto ${s}`;
    }));
    results.push(test("Notazione: la differenza si scrive v \u2212 v0, non v + -1\xB7v0", () => {
      const s = toPretty(canonical(eq("a = (v - v0)/t")), 0);
      return s.includes("+ -") || s.includes("\u2212 -") ? `ottenuto ${s}` : true;
    }));
    results.push(test("Drag: trasporto fattore 2 da coefficiente negativo Num(-2) al denominatore", () => {
      const e = eq("-2*a*s = b");
      const r = applyDragMove({
        currentEq: e,
        varName: "2",
        nodeType: "Num",
        fromSide: "left",
        fromSlot: "num",
        targetSide: "right",
        targetSlot: "den"
      });
      if (!r.ok) return `rifiutata: ${r.error}`;
      const leftText = toPretty(r.newEq.left, 0);
      if (leftText.includes("2")) return `Num(-2) non rimosso: ${leftText}`;
      const rightText = toPretty(r.newEq.right, 0);
      return rightText.includes("2") ? true : `2 non al denominatore destro: ${rightText}`;
    }));
    results.push(test("Notazione: nessuna parentesi ridondante sul membro isolato", () => {
      const r = applyDragMove({
        currentEq: eq("P = p0 + d*g*h"),
        varName: "d*g*h",
        nodeType: "Mul",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "add"
      });
      if (!r.ok) return `mossa rifiutata: ${r.error}`;
      const s = toPretty(r.newEq, 0);
      return s.startsWith("(P)") ? `parentesi ridondanti: ${s}` : true;
    }));
    results.push(test("Notazione: le parentesi scritte dall'utente restano visibili", () => {
      const html = renderEquation(eq("x - (a + b) = 0"), {});
      const text = html.replace(/<[^>]+>/g, "");
      return text.includes("(a") && text.includes("b)") ? true : `reso come ${text}`;
    }));
    results.push(test("Notazione: 1/2 in un prodotto non mostra parentesi (es. U = (1/2)*k*x^2)", () => {
      const html = renderEquation(eq("U = (1/2)*k*x^2"), {});
      return !html.includes("node-group-parens") ? true : `contiene ancora parentesi: ${html}`;
    }));
    results.push(test("Notazione: numeratore/denominatore intero non mostra parentesi superflue (es. (2*v0)/g)", () => {
      const html = renderEquation(eq("t = (2*v0)/g"), {});
      return !html.includes("node-group-parens") ? true : `contiene parentesi nel numeratore: ${html}`;
    }));
    results.push(test("Notazione: frazione elevata a potenza mantiene le parentesi centrate (has-frac)", () => {
      const html = renderEquation(eq("y = (a/b)^2"), {});
      return html.includes("node-group-parens") && html.includes("has-frac") ? true : `mancano parentesi has-frac: ${html}`;
    }));
    results.push(test("Croce: (2\xB7L)/2 semplifica il 2 e resta L = b", () => {
      const r = crossCancel(eq("(2*L)/2 = b"), "left/num/Mul0", "left/den");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("L = b")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce: (t\xB7v)/v semplifica v e resta t = s/v", () => {
      const r = crossCancel(eq("(t*v)/v = s/v"), "left/num/Mul1", "left/den");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("t = s/v")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce: v\xB2/v semplifica a v", () => {
      const r = crossCancel(eq("(v^2*t)/v = s"), "left/num/Mul0/base", "left/den");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("t*v = s")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce: rifiuta due fattori diversi", () => {
      const r = crossCancel(eq("(t*v)/v = s/v"), "left/num/Mul0", "left/den");
      return r.ok ? "accettata ma doveva essere rifiutata" : true;
    }));
    results.push(test("Croce: rifiuta due fattori nello stesso numeratore", () => {
      const r = crossCancel(eq("v = s/t"), "left/num", "left/num");
      return r.ok ? "accettata ma doveva essere rifiutata" : true;
    }));
    results.push(test("Croce: rifiuta fattori in membri diversi", () => {
      const r = crossCancel(eq("v = s/t"), "right/num", "left/num");
      return r.ok ? "accettata ma doveva essere rifiutata" : true;
    }));
    results.push(test("Croce: (a/b)\xB7(b/c) diventa a/c", () => {
      const r = crossCancel(eq("z = (a/b)*(b/c)"), "right/Mul0/den", "right/Mul1/num");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("z = a/c")) || `ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce: non elimina un addendo di una somma", () => {
      const r = crossCancel(eq("x + a = b"), "left/Add0", "left/Add0");
      return r.ok ? "accettata ma doveva essere rifiutata" : true;
    }));
    results.push(test("Croce additiva: a e \u2212a nella stessa somma \u2192 si cancellano", () => {
      const e = eq("x + a - a = b");
      const r = crossCancel(e, "left/Sub0/Add1", "left/Sub1");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("x = b")) ? true : `atteso x = b, ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce additiva: stessa grandezza su ambo i membri \u2192 si cancella", () => {
      const e = eq("a + F = a + G");
      const r = crossCancel(e, "left/Add0", "right/Add0");
      if (!r.ok) return `rifiutata: ${r.error}`;
      return equivalentEq(r.newEq, eq("F = G")) ? true : `atteso F = G, ottenuto ${toPretty(r.newEq, 0)}`;
    }));
    results.push(test("Croce additiva: rifiuta due termini non opposti nella stessa somma", () => {
      const r = crossCancel(eq("a + b = c"), "left/Add0", "left/Add1");
      return r.ok ? "accettata ma doveva essere rifiutata (a \u2260 -b in generale)" : true;
    }));
    results.push(test("Croce additiva: rifiuta grandezze diverse su ambo i membri", () => {
      const r = crossCancel(eq("a + F = b + G"), "left/Add0", "right/Add1");
      return r.ok ? "accettata ma doveva essere rifiutata (a \u2260 G)" : true;
    }));
    const autoResolve = (formula, target) => {
      let curr = eq(formula);
      for (let i = 0; i < 25; i++) {
        if (isGoalReached(curr, target)) break;
        const sug = suggestNextStep(curr, target);
        if (!sug.found) return `bloccata su ${toPretty(curr, 0)} (${sug.message})`;
        const res = performAction(curr, sug.action);
        if (!res.ok) return `passo fallito: ${res.error}`;
        curr = res.equation;
      }
      return isGoalReached(curr, target) ? true : `non isolata: ${toPretty(curr, 0)}`;
    };
    results.push(test("Risoluzione: v = s/t isola t", () => autoResolve("v = s/t", "t")));
    results.push(test("Risoluzione: v = s/t isola s", () => autoResolve("v = s/t", "s")));
    results.push(test("Risoluzione: F = m*a isola m", () => autoResolve("F = m*a", "m")));
    results.push(test("Risoluzione: h = v0^2/(2*g) isola g (fattori comuni)", () => autoResolve("h = v0^2/(2*g)", "g")));
    results.push(test("Risoluzione: h = v0^2/(2*g) isola v0", () => autoResolve("h = v0^2/(2*g)", "v0")));
    results.push(test("Risoluzione: U = -G*(M*m)/r isola r (segno davanti alla frazione)", () => autoResolve("U = -G*(M*m)/r", "r")));
    results.push(test("Risoluzione: En = -E1/n^2 isola n", () => autoResolve("En = -E1/n^2", "n")));
    results.push(test("Risoluzione: J = m*v - m*v0 isola m (raccoglimento)", () => autoResolve("J = m*v - m*v0", "m")));
    results.push(test("Risoluzione: Req = (R1*R2)/(R1+R2) isola R1", () => autoResolve("Req = (R1*R2)/(R1+R2)", "R1")));
    results.push(test("Risoluzione: W = (1/2)*m*v^2 - (1/2)*m*v0^2 isola m", () => autoResolve("W = (1/2)*m*v^2 - (1/2)*m*v0^2", "m")));
    results.push(test("Risoluzione: F = G*(m1*m2)/r^2 isola r", () => autoResolve("F = G*(m1*m2)/r^2", "r")));
    results.push(test("Risoluzione: p = (1/2)*rho*v^2 + rho*g*z isola rho", () => autoResolve("p = (1/2)*rho*v^2 + rho*g*z", "rho")));
    results.push(test("Risoluzione: ingrandimento G = -q/p isola p", () => autoResolve("G = -q/p", "p")));
    results.push(test("Regola: addBoth x = 5 aggiunge 3 \u2192 x + 3 = 5 + 3", () => checkRule("addBoth", "x = 5", { value: expr("3"), valueText: "3" }, "x + 3 = 5 + 3")));
    results.push(test("Regola: subBoth x + a = b sottrae a \u2192 x + a - a = b - a", () => checkRule("subBoth", "x + a = b", { value: expr("a"), valueText: "a" }, "x + a - a = b - a")));
    results.push(test("Regola: invertFunction sin(x) = a \u2192 x = asin(a)", () => {
      const res = applyRule(RULES.invertFunction, eq("sin(x) = a"), { side: "left", fnNode: Sin(Var("x")) });
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("x = asin(a)")) ? true : "atteso x = asin(a), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: invertFunction ln(x) = a \u2192 x = exp(a)", () => {
      const res = applyRule(RULES.invertFunction, eq("ln(x) = a"), { side: "left", fnNode: Ln(Var("x")) });
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("x = exp(a)")) ? true : "atteso x = exp(a), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: factorCommon m*v - m*v0 = J \u2192 m*(v-v0) = J", () => {
      const res = applyRule(RULES.factorCommon, eq("m*v - m*v0 = J"), { side: "left", common: Var("m"), commonText: "m" });
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("m*(v - v0) = J")) ? true : "atteso m*(v-v0) = J, ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: propriet\xE0 distributiva Doppler fp*v = f*(v - vo) \u2192 fp*v = f*v - f*vo", () => {
      const startEq = eq("fp * v = f * (v - vo)");
      if (!canDistribute(startEq.right)) return "atteso canDistribute true per membro destro";
      const res = applyRule(RULES.distribute, startEq, { side: "right" });
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("fp * v = f * v - f * vo")) ? true : "atteso fp*v = f*v - f*vo, ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: raccoglimento a fattori per Doppler fp*v - f*v = -f*vo \u2192 v*(fp - f) = -f*vo", () => {
      const startEq = eq("fp * v - f * v = -f * vo");
      const commonV = findCommonFactor(startEq.left, "v");
      if (!commonV || commonV.name !== "v") return "atteso fattore comune v, trovato: " + JSON.stringify(commonV);
      const res = applyRule(RULES.factorCommon, startEq, { side: "left", common: commonV, commonText: "v" });
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("v * (fp - f) = -f * vo")) ? true : "atteso v*(fp - f) = -f*vo, ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Risoluzione: effetto Doppler fp = (f*(v - vo))/v isola v", () => autoResolve("fp = (f * (v - vo)) / v", "v")));
    results.push(test("Risoluzione: sin(theta) = F/G isola theta", () => autoResolve("sin(theta) = F/G", "theta")));
    results.push(test("Risoluzione: ln(x) = a isola x", () => autoResolve("ln(x) = a", "x")));
    results.push(test("Risoluzione: nessuna equazione va in ciclo infinito", () => {
      const casi = ["v = s/t", "Req = (R1*R2)/(R1+R2)", "h = v0^2/(2*g)", "U = -G*(M*m)/r"];
      for (const f of casi) {
        const start = eq(f);
        for (const target of collectVars(start)) {
          let curr = clone(start);
          const seen = /* @__PURE__ */ new Set();
          for (let i = 0; i < 25; i++) {
            if (isGoalReached(curr, target)) break;
            const key = toPretty(curr, 0);
            if (seen.has(key)) return `ciclo su ${key} isolando ${target} in ${f}`;
            seen.add(key);
            const sug = suggestNextStep(curr, target);
            if (!sug.found) break;
            const res = performAction(curr, sug.action);
            if (!res.ok) break;
            curr = res.equation;
          }
        }
      }
      return true;
    }));
    results.push(test("Reciproci: x = 0 rifiutato per divisione per zero", () => {
      const res = reciprocalEquation(eq("x = 0"));
      return !res.ok ? true : "accettata ma x=0 non deve essere invertibile";
    }));
    results.push(test("Regola: invertProportion rifiutata con numeratore o denominatore nullo", () => {
      const res1 = applyRule(RULES.invertProportion, eq("0/b = c/d"), {});
      if (res1.ok) return "accettata inversione con 0 al numeratore";
      return true;
    }));
    results.push(test("Regola: powBoth con esponente 0 rifiutata", () => {
      const res = applyRule(RULES.powBoth, eq("x = y"), { value: Num(0), valueText: "0" });
      return !res.ok ? true : "accettata elevazione a potenza 0";
    }));
    results.push(test("Regola: sqrtBoth con radicando negativo x^2 = -9 rifiutata", () => {
      const res = applyRule(RULES.sqrtBoth, eq("x^2 = -9"), { side: "left", insideVar: "x" });
      return !res.ok ? true : "accettata radice di indice pari su radicando negativo";
    }));
    results.push(test("Tastierino: sqrt su membro negativo x = -4 rifiutata", () => {
      const res = applyKeypadOperation(eq("x = -4"), "sqrt", null, null, "x");
      return !res.ok ? true : "accettata radice del tastierino su membro negativo";
    }));
    results.push(test("Regola: invertFunction sin(x) = 2 rifiutata fuori dal dominio [-1, 1]", () => {
      const res = applyRule(RULES.invertFunction, eq("sin(x) = 2"), { side: "left", fnNode: Sin(Var("x")) });
      return !res.ok ? true : "accettata arcsin di valore > 1";
    }));
    results.push(test("Tastierino: arcsin su sin(theta) = F/G libera theta = asin(F/G)", () => {
      const res = applyKeypadOperation(eq("sin(theta) = F/G"), "asin", null, null, "theta");
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("theta = asin(F/G)")) ? true : "atteso theta = asin(F/G), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Tastierino: arccos su cos(theta) = a/b libera theta = acos(a/b)", () => {
      const res = applyKeypadOperation(eq("cos(theta) = a/b"), "acos", null, null, "theta");
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("theta = acos(a/b)")) ? true : "atteso theta = acos(a/b), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Tastierino: arctan su tan(theta) = mu libera theta = atan(mu)", () => {
      const res = applyKeypadOperation(eq("tan(theta) = mu"), "atan", null, null, "theta");
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, eq("theta = atan(mu)")) ? true : "atteso theta = atan(mu), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Tastierino: arcsin rifiutata con spiegazione se sin non e isolato", () => {
      const res = applyKeypadOperation(eq("v = -A*omega*sin(omega*t)"), "asin", null, null, "t");
      if (res.ok) return "accettata operazione arcsin con sin non isolato";
      return res.error.includes("isolare la funzione") ? true : "messaggio inatteso: " + res.error;
    }));
    results.push(test("Tastierino: arcsin rifiutata se non c'e alcuna funzione seno nell'equazione", () => {
      const res = applyKeypadOperation(eq("v = s/t"), "asin", null, null, "s");
      if (res.ok) return "accettata arcsin su equazione senza seno";
      return res.error.includes("Nessuna funzione") ? true : "messaggio inatteso: " + res.error;
    }));
    results.push(test("Croce additiva: a - b - c = a preserva segni negativi -b - c = 0", () => {
      const e = eq("a - b - c = a");
      const r = crossCancel(e, "left/Sub0", "right");
      if (!r.ok) return "rifiutata: " + r.error;
      return equivalentEq(r.newEq, eq("-b - c = 0")) ? true : "atteso -b - c = 0, ottenuto " + toPretty(r.newEq, 0);
    }));
    results.push(test("Croce: (s/t)*t = v semplifica t producendo s = v", () => {
      const e = eq("(s/t)*t = v");
      const r = crossCancel(e, "left/Mul0/den", "left/Mul1");
      if (!r.ok) return "rifiutata: " + r.error;
      return equivalentEq(r.newEq, eq("s = v")) ? true : "atteso s = v, ottenuto " + toPretty(r.newEq, 0);
    }));
    results.push(test("Notazione: differenze con costanti si presentano come x - 3 e non + -3 o -3 + x", () => {
      const exprAst = canonical(eq("x - 3 = y").left);
      const pretty = toPretty(exprAst, 0);
      if (pretty.includes("+ -") || pretty.startsWith("-3 +")) {
        return "notazione non ottimale: " + pretty;
      }
      return true;
    }));
    results.push(test("Notazione: Ec ed Ep vengono formattati con pedici corretti in LaTeX", () => {
      const latex = toLatex(eq("Ec = Ep"));
      if (!latex.includes("E_c") || !latex.includes("E_p")) {
        return "LaTeX non contiene pedici corretti: " + latex;
      }
      return true;
    }));
    results.push(test("Drag: (3/2)*x = y trascinando 3 al denominatore opposto produce (1/2)*x", () => {
      const res = applyDragMove({
        currentEq: eq("(3/2)*x = y"),
        varName: "3",
        nodeType: "Num",
        fromSide: "left",
        fromSlot: "num",
        targetSide: "right",
        targetSlot: "den"
      });
      if (!res.ok) return "drag fallito: " + (res.error || "");
      return equivalentEq(res.newEq, eq("(1/2)*x = y/3")) ? true : "atteso (1/2)*x = y/3, ottenuto " + toPretty(res.newEq, 0);
    }));
    results.push(test("Drag: addendo in numeratore di frazione (a+b)/c = y non puo essere trascinato", () => {
      const res = applyDragMove({
        currentEq: eq("(a+b)/c = y"),
        varName: "a",
        nodeType: "Var",
        fromSide: "left",
        fromSlot: "num",
        targetSide: "right",
        targetSlot: "den"
      });
      return !res.ok ? true : "accettato trascinamento addendo da numeratore a frazione!";
    }));
    results.push(test('Drag: fattore composto tra parentesi fp*v = f*(v + vo) trascinando "v + vo" al denominatore', () => {
      const e = eq("fp*v = f*(v + vo)");
      const res = applyDragMove({
        currentEq: e,
        varName: "v + vo",
        nodeType: "Add",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "den"
      });
      if (!res.ok) return "drag fallito: " + (res.error || "");
      if (res.newEq.right.type !== "Var" || res.newEq.right.name !== "f") {
        return "destra non \xE8 f: " + toPretty(res.newEq.right, 0);
      }
      const den = unwrap(res.newEq.left.den);
      if (den.type !== "Add" || den.args.length !== 2) {
        return "denominatore non \xE8 Add(v, vo): " + JSON.stringify(den);
      }
      const html = renderEquation(e, { interactive: true });
      if (!html.includes('data-var-name="v + vo"') || !html.includes("draggable-token")) {
        return "HTML non rende (v + vo) come draggable-token: " + html;
      }
      return true;
    }));
    results.push(test('Drag: denominatore composto (fp*v)/(v + vo) = f trascinando "v + vo" al numeratore', () => {
      const e = canonical(eq("(fp*v)/(v + vo) = f"));
      const res = applyDragMove({
        currentEq: e,
        varName: "v + vo",
        nodeType: "Add",
        fromSide: "left",
        fromSlot: "den",
        targetSide: "right",
        targetSlot: "num"
      });
      if (!res.ok) return "drag dal denominatore fallito: " + (res.error || "");
      const right = unwrap(res.newEq.right);
      if (right.type !== "Mul" || right.args.length !== 2) {
        return "destra non \xE8 Mul(f, v + vo): " + toPretty(right, 0);
      }
      const denHtml = renderEquation(e, { interactive: true });
      if (!denHtml.includes('data-var-name="v + vo"') || !denHtml.includes('data-slot="den"')) {
        return "HTML denominatore non ha draggable-token per (v + vo): " + denHtml;
      }
      return true;
    }));
    results.push(test("Drag: termine intero al secondo membro f*v in fp*v - fp*vs = f*v \xE8 trascinabile come blocco \u{1F4E6}", () => {
      const e = canonical(eq("fp*v - fp*vs = f*v"));
      const html = renderEquation(e, { interactive: true });
      if (!html.includes('data-var-name="f*v"') || !html.includes("math-term-group")) {
        return 'f*v a secondo membro non ha data-var-name="f*v" o math-term-group: ' + html;
      }
      const res = applyDragMove({
        currentEq: e,
        varName: "f*v",
        nodeType: "Mul",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "add"
      });
      if (!res.ok) return "spostamento f*v a primo membro fallito: " + (res.error || "");
      const right = unwrap(res.newEq.right);
      if (right.type !== "Num" || right.value !== 0) {
        return "destra non \xE8 0: " + toPretty(right, 0);
      }
      return true;
    }));
    results.push(test("Calcolo Numerico: evalWithEnv calcola frazione s/v con valori numerici", () => {
      const expr2 = parseExpression("s/v");
      const res = evalWithEnv(expr2, { s: 100, v: 20 });
      return res.ok && res.value === 5 ? true : `atteso 5, ottenuto: ${JSON.stringify(res)}`;
    }));
    results.push(test("Calcolo Numerico: divisione per zero intercettata correttamente", () => {
      const expr2 = parseExpression("s/t");
      const res = evalWithEnv(expr2, { s: 50, t: 0 });
      return !res.ok && res.error.includes("zero") ? true : `non intercettata divisione per zero: ${JSON.stringify(res)}`;
    }));
    results.push(test("Calcolo Numerico: radice quadrata e potenze sqrt((2*E)/k)", () => {
      const expr2 = parseExpression("sqrt((2*E)/k)");
      const res = evalWithEnv(expr2, { E: 200, k: 4 });
      return res.ok && res.value === 10 ? true : `atteso 10, ottenuto: ${JSON.stringify(res)}`;
    }));
    results.push(test("Calcolo Numerico: substituteVarsInAst sostituisce correttamente le variabili", () => {
      const expr2 = parseExpression("a + b");
      const sub = substituteVarsInAst(expr2, { a: 3, b: 7 });
      return sub.args[0].value === 3 && sub.args[1].value === 7 ? true : "sostituzione fallita";
    }));
    results.push(test("Unita SI: risoluzione unita e quantita fisiche", () => {
      const infoS = getQuantityInfo("s");
      const infoV = getQuantityInfo("v");
      const infoA = getQuantityInfo("a");
      return infoS.unit === "m" && infoV.unit === "m/s" && infoA.unit === "m/s\xB2" ? true : "unita non corrispondenti";
    }));
    results.push(test("Unita SI: formattazione numeri decimali e scientifici", () => {
      const f1 = formatResultNumber(4.5);
      const f2 = formatResultNumber(12);
      const f3 = formatResultNumber(25e5);
      return f1 === "4.5" && f2 === "12" && f3.includes("10^") ? true : `formattazione inattesa: ${f1}, ${f2}, ${f3}`;
    }));
    results.push(test("Drag: trasporto fattore A da prodotto con segno meno -A*omega*sin(...) al denominatore", () => {
      const eq2 = parseEquation("v = -A*omega*sin(omega*t + phi)");
      const res = applyDragMove({
        currentEq: eq2,
        varName: "A",
        nodeType: "Var",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "den"
      });
      if (!res.ok) return `mossa rifiutata: ${res.error}`;
      const leftPretty = toPretty(res.newEq.left, 0);
      const rightPretty = toPretty(res.newEq.right, 0);
      return (leftPretty === "v/A" || leftPretty === "(v)/A") && rightPretty.startsWith("\u2212") ? true : `risultato inatteso: ${leftPretty} = ${rightPretty}`;
    }));
    results.push(test("Drag: trasporto fattore -A intero da prodotto al denominatore", () => {
      const eq2 = parseEquation("v = -A*omega*sin(omega*t + phi)");
      const res = applyDragMove({
        currentEq: eq2,
        varName: "-A",
        nodeType: "Var",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "den"
      });
      if (!res.ok) return `mossa rifiutata: ${res.error}`;
      return true;
    }));
    results.push(test("Elementi neutri: isGoalReached riconosce 1*x e x*1 come x isolata", () => {
      const e1 = parseEquation("1*x = y");
      const e2 = parseEquation("x*1 = y");
      const e3 = parseEquation("x + 0 = y");
      if (!isGoalReached(e1, "x")) return "1*x non riconosciuto come isolato";
      if (!isGoalReached(e2, "x")) return "x*1 non riconosciuto come isolato";
      if (!isGoalReached(e3, "x")) return "x+0 non riconosciuto come isolato";
      return true;
    }));
    results.push(test("Elementi neutri: stripNeutrals elimina 1 moltiplicativo e +0 additivo", () => {
      const e1 = parseEquation("1*x = y + 0");
      const stripped = stripNeutrals(e1);
      return equivalentEq(stripped, parseEquation("x = y")) ? true : "atteso x = y, ottenuto " + toPretty(stripped, 0);
    }));
    results.push(test("Elementi neutri: stripNeutrals preserva 1 nelle differenze come 1 - cos(theta)", () => {
      const e = parseEquation("c*dlam*m = h*(1 - cos(theta))");
      const stripped = stripNeutrals(e);
      return toPretty(stripped.right, 0).includes("1") ? true : "il numero 1 in 1 - cos(theta) \xE8 stato rimosso erroneamente: " + toPretty(stripped, 0);
    }));
    results.push(test("Drag: trascinando un fattore su membro orizzontale applica il 2\xB0 principio (divisione)", () => {
      const eq2 = parseEquation("c*dlam*m = h*(1 - cos(theta))");
      const res = applyDragMove({
        currentEq: eq2,
        varName: "h",
        nodeType: "Var",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "num"
        // rilasciato sul membro di sinistra
      });
      if (!res.ok) return "mossa rifiutata: " + res.error;
      if (res.newEq.left.type !== "Div") return "la divisione non \xE8 stata applicata: " + toPretty(res.newEq, 0);
      return true;
    }));
    results.push(test("Tastierino: arccos con 1*cos(theta) libera theta senza bloccare", () => {
      const eq2 = parseEquation("1*cos(theta) = k");
      const res = applyKeypadOperation(eq2, "acos", null, null, "theta");
      if (!res.ok) return "rifiutata: " + res.error;
      return equivalentEq(res.equation, parseEquation("theta = acos(k)")) ? true : "atteso theta = acos(k), ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: cambio segno inverte -x = 5 in x = -5", () => {
      const res = applyRule(RULES.changeSign, eq("-x = 5"), {});
      if (!res.ok) return "regola fallita: " + res.error;
      const str = toPretty(res.equation, 0);
      return str === "x = -5" ? true : "atteso x = -5, ottenuto " + str;
    }));
    results.push(test("Regola: cambio segno inverte somma algebrica -v = -v0 + a*t", () => {
      const res = applyRule(RULES.changeSign, eq("-v = -v0 + a*t"), {});
      if (!res.ok) return "regola fallita: " + res.error;
      return equivalentEq(res.equation, eq("v = v0 - a*t")) ? true : "atteso v = v0 - a*t, ottenuto " + toPretty(res.equation, 0);
    }));
    results.push(test("Regola: cambio segno applicata due volte ritorna all'equazione originale", () => {
      const orig = eq("v - v0 = a*t");
      const step1 = applyRule(RULES.changeSign, orig, {});
      const step2 = applyRule(RULES.changeSign, step1.equation, {});
      return equivalentEq(step2.equation, orig) ? true : "atteso " + toPretty(orig, 0) + ", ottenuto " + toPretty(step2.equation, 0);
    }));
    results.push(test("Raccoglimento: findCommonFactor individua m in J = m*v - m*v0", () => {
      const common = findCommonFactor(expr("m*v - m*v0"), "m");
      return common && common.name === "m" ? true : "m non individuata come fattore comune";
    }));
    results.push(test("Trigonometria: hasTrigConflict individua il conflitto di theta in a = g*(sin(theta) - mu*cos(theta))", () => {
      const hasConflict = hasTrigConflict(expr("g*(sin(theta) - mu*cos(theta))"), "theta");
      return hasConflict ? true : "conflitto trigonometrico su theta non rilevato";
    }));
    results.push(test("Trigonometria: suggestNextStep fornisce spiegazione didattica su theta in combinazione lineare", () => {
      const sug = suggestNextStep(eq("a = g*(sin(theta) - mu*cos(theta))"), "theta");
      return !sug.found && sug.message.includes("sin") && sug.message.includes("cos") ? true : "messaggio didattico non corretto: " + JSON.stringify(sug);
    }));
    results.push(test("Risoluzione: mu in a = g*(sin(theta) - mu*cos(theta)) viene isolata correttamente", () => {
      let curr = eq("a = g*(sin(theta) - mu*cos(theta))");
      for (let i = 0; i < 8; i++) {
        if (isGoalReached(curr, "mu")) break;
        const sug = suggestNextStep(curr, "mu");
        if (!sug.found) return "passo non trovato al tentativo " + i;
        const res = performAction(curr, sug.action);
        if (!res.ok) return "azione fallita: " + res.error;
        curr = res.equation;
      }
      return isGoalReached(curr, "mu") ? true : "mu non isolata: " + toPretty(curr, 0);
    }));
    results.push(test('Ricerca: "stevino" trova tutte le formule della legge di Stevino', () => {
      const list = filterFormulas({ search: "stevino" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("ph-rhoghh") || !ids.includes("stevino")) {
        return `formule stevino mancanti: trovate ${ids.join(", ")}`;
      }
      return true;
    }));
    results.push(test('Ricerca: "archimede" trova spinta di Archimede e condizione di galleggiamento', () => {
      const list = filterFormulas({ search: "archimede" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("legge-archimede") || !ids.includes("galleggia")) {
        return `formule archimede mancanti: trovate ${ids.join(", ")}`;
      }
      return true;
    }));
    results.push(test('Ricerca: "suono" restituisce tutte le formule di acustica e onde sonore', () => {
      const list = filterFormulas({ search: "suono" });
      const ids = list.map((f) => f.id);
      const expected = [
        "onda-v-lam-f",
        "onda-periodo-frequenza",
        "onda-v-lam-T",
        "doppler-avvicinamento-sorgente",
        "doppler-allontanamento-sorgente",
        "doppler-avvicinamento-osservatore",
        "doppler-allontanamento-osservatore",
        "eco-suono",
        "intensita-sonora",
        "battimenti-sonori",
        "canne-organo-aperte",
        "corda-armonica"
      ];
      for (const exp of expected) {
        if (!ids.includes(exp)) return `formula suono '${exp}' non trovata per query 'suono'`;
      }
      return list.length >= 12 ? true : `trovate solo ${list.length} formule`;
    }));
    results.push(test(`Ricerca: "doppler" trova le formule dell'effetto Doppler`, () => {
      const list = filterFormulas({ search: "doppler" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("doppler-avvicinamento-sorgente") || !ids.includes("doppler-avvicinamento-osservatore")) {
        return `formule doppler mancanti: ${ids.join(", ")}`;
      }
      return true;
    }));
    results.push(test('Ricerca: "eco" trova la formula di riflessione ed eco del suono', () => {
      const list = filterFormulas({ search: "eco" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("eco-suono")) return `formula eco mancante: ${ids.join(", ")}`;
      return true;
    }));
    results.push(test('Ricerca: normalizzazione con accenti e maiuscole "velocit\xE0 del suono"', () => {
      const list = filterFormulas({ search: "Velocit\xE0 del Suono" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("onda-v-lam-f")) return `formula v=lam*f mancante con ricerca accentata: ${ids.join(", ")}`;
      return true;
    }));
    results.push(test("Ricerca: fallback globale se argomento selezionato non contiene la formula cercata", () => {
      const list = filterFormulas({ topic: "cinematica", search: "stevino" });
      const ids = list.map((f) => f.id);
      if (!ids.includes("ph-rhoghh") && !ids.includes("stevino")) {
        return `fallback globale fallito: trovate ${ids.join(", ")}`;
      }
      return true;
    }));
    results.push(test("Frazione di frazione: hasCompoundFraction riconosce frazioni di frazione e frazioni normali", () => {
      const normal = eq("v = s/t");
      if (hasCompoundFraction(normal.right)) return "s/t scambiata per frazione di frazione";
      const A = Sub(Mul(Var("fp"), Var("p")), Var("f"));
      const B = Mul(Var("f"), Var("vo"));
      const compoundDoppler = Neg(Div(Num(1), Div(A, B)));
      if (!hasCompoundFraction(compoundDoppler)) return "Doppler -1 / ((fp - f)/(f*vo)) non riconosciuta come frazione di frazione";
      const c2 = Div(Num(1), Div(Var("a"), Var("b")));
      if (!hasCompoundFraction(c2)) return "1 / (a/b) non riconosciuta";
      const c3 = Div(Div(Var("a"), Var("b")), Var("c"));
      if (!hasCompoundFraction(c3)) return "(a/b) / c non riconosciuta";
      const c4 = Div(Div(Var("a"), Var("b")), Div(Var("c"), Var("d")));
      if (!hasCompoundFraction(c4)) return "(a/b) / (c/d) non riconosciuta";
      return true;
    }));
    results.push(test("Frazione di frazione: transformToReciprocalMul inverte il denominatore in moltiplicazione per la reciproca", () => {
      const c1 = Div(Num(1), Div(Var("a"), Var("b")));
      const s1 = transformToReciprocalMul(c1);
      if (toPretty(s1, 0) !== "1\xB7(b/a)") return `atteso 1\xB7(b/a), ottenuto ${toPretty(s1, 0)}`;
      const A = Sub(Mul(Var("fp"), Var("p")), Var("f"));
      const B = Mul(Var("f"), Var("vo"));
      const compoundDoppler = Neg(Div(Num(1), Div(A, B)));
      const s2 = transformToReciprocalMul(compoundDoppler);
      if (toPretty(s2, 0) !== "\u22121\xB7(f\xB7vo/(fp\xB7p \u2212 f))") {
        return `atteso \u22121\xB7(f\xB7vo/(fp\xB7p \u2212 f)), ottenuto ${toPretty(s2, 0)}`;
      }
      return true;
    }));
    results.push(test("Frazione di frazione: getCompoundFractionSteps genera la sequenza didattica lenta a 3 passaggi", () => {
      const A = Sub(Mul(Var("fp"), Var("p")), Var("f"));
      const B = Mul(Var("f"), Var("vo"));
      const dopplerEq = Eq(Var("v"), Neg(Div(Num(1), Div(A, B))));
      const steps = getCompoundFractionSteps(dopplerEq, "v");
      if (!steps) return "getCompoundFractionSteps ha restituito null per formula Doppler con frazione di frazione";
      if (steps.targetVar !== "v") return `targetVar errato: ${steps.targetVar}`;
      if (steps.step1Pretty !== "v = \u22121/((fp\xB7p \u2212 f)/(f\xB7vo))") return `step 1 errato: ${steps.step1Pretty}`;
      if (steps.step2Pretty !== "v = \u22121\xB7(f\xB7vo/(fp\xB7p \u2212 f))") return `step 2 errato: ${steps.step2Pretty}`;
      if (steps.step3Pretty !== "v = \u2212f\xB7vo/(fp\xB7p \u2212 f)") return `step 3 errato: ${steps.step3Pretty}`;
      const normalEq = eq("v = s/t");
      const noSteps = getCompoundFractionSteps(normalEq, "v");
      if (noSteps !== null) return "atteso null per formula normale v = s/t";
      return true;
    }));
    results.push(test("Obiettivo: isGoalReached rifiuta variabile presente in entrambi i membri (es. vo + fp*v/f = v)", () => {
      const dopplerEq = eq("vo + (fp*v)/f = v");
      if (isGoalReached(dopplerEq, "v") !== false) {
        return "vo + (fp*v)/f = v non deve essere considerata risolta per v!";
      }
      const sug = suggestNextStep(dopplerEq, "v");
      if (!sug.found || sug.action.id === "swap") {
        return "suggestNextStep non deve proporre lo swap su una formula non ancora risolta: " + JSON.stringify(sug);
      }
      return true;
    }));
    results.push(test("Obiettivo: isGoalReached rifiuta variabile con segno negativo (es. -v0 = a*t - v o -x = 5)", () => {
      const negEq = eq("-v0 = a*t - v");
      if (isGoalReached(negEq, "v0") !== false) {
        return "-v0 = a*t - v non deve essere considerata risolta per v0!";
      }
      const negX = eq("-x = 5");
      if (isGoalReached(negX, "x") !== false) {
        return "-x = 5 non deve essere considerata risolta per x!";
      }
      const sug = suggestNextStep(negEq, "v0");
      if (!sug.found || sug.action.ruleKey !== "mulBoth") {
        return "suggestNextStep deve proporre di moltiplicare per -1: " + JSON.stringify(sug);
      }
      return true;
    }));
    results.push(test("Obiettivo: ensureTargetOnFirstMember isola sempre la grandezza al primo membro", () => {
      const eRight = eq("s/t = v");
      const flipped = ensureTargetOnFirstMember(eRight, "v");
      if (toPretty(flipped, 0) !== "v = s/t") {
        return "Atteso v = s/t, ottenuto: " + toPretty(flipped, 0);
      }
      const eBoth = eq("vo + (fp*v)/f = v");
      const unchangedBoth = ensureTargetOnFirstMember(eBoth, "v");
      if (toPretty(unchangedBoth, 0) !== toPretty(eBoth, 0)) {
        return "Formula con v in ambo i membri non deve essere invertita!";
      }
      return true;
    }));
    results.push(test("Drag: fattore composto tra parentesi (fp - f) in v*(fp - f) = -fp*vs \xE8 trascinabile per dividere", () => {
      const e = eq("v*(fp - f) = -fp*vs");
      const html = renderEquation(e, { interactive: true });
      if (!html.includes('data-var-name="fp \u2212 f"') && !html.includes('data-var-name="fp - f"')) {
        return "HTML non rende (fp - f) come draggable: " + html;
      }
      if (html.includes('data-var-name="v*fp \u2212 f"') || html.includes('data-var-name="v*fp - f"')) {
        return "HTML non deve generare la sintassi corrotta v*fp - f: " + html;
      }
      const res = applyDragMove({
        currentEq: e,
        varName: "fp - f",
        nodeType: "Sub",
        fromSide: "left",
        fromSlot: "num",
        targetSide: "right",
        targetSlot: "den"
      });
      if (!res.ok) return "drag di fp - f fallito: " + (res.error || "");
      if (toPretty(res.newEq, 0) !== "v = \u2212fp\xB7vs/(fp \u2212 f)") {
        return "formula risultante errata: " + toPretty(res.newEq, 0);
      }
      if (!isGoalReached(res.newEq, "v")) {
        return "l'equazione risultante v = ... deve raggiungere l'obiettivo!";
      }
      return true;
    }));
    results.push(test("Drag: fp*vs e (fp-f) possono essere mossi in croce in blocco", () => {
      const e = eq("v*(fp - f) = fp*vs");
      const html = renderEquation(e, { interactive: true });
      if (!html.includes('data-var-name="fp \u2212 f"') && !html.includes('data-var-name="fp - f"')) {
        return "HTML non rende (fp - f) come draggable: " + html;
      }
      if (!html.includes('data-var-name="fp*vs"') && !html.includes('data-var-name="fp\xB7vs"')) {
        return "HTML non rende fp*vs come blocco draggable: " + html;
      }
      const r1 = applyDragMove({
        currentEq: e,
        varName: "fp - f",
        nodeType: "Sub",
        fromSide: "left",
        fromSlot: "num",
        targetSide: "right",
        targetSlot: "den"
      });
      if (!r1.ok) return "spostamento in croce di (fp - f) fallito: " + (r1.error || "");
      if (toPretty(r1.newEq, 0) !== "v = fp\xB7vs/(fp \u2212 f)") {
        return "risultato errato per (fp - f): " + toPretty(r1.newEq, 0);
      }
      if (!isGoalReached(r1.newEq, "v")) {
        return "v deve risultare isolata al primo membro dopo lo spostamento di (fp - f)!";
      }
      const r2 = applyDragMove({
        currentEq: e,
        varName: "fp*vs",
        nodeType: "Mul",
        fromSide: "right",
        fromSlot: "num",
        targetSide: "left",
        targetSlot: "den"
      });
      if (!r2.ok) return "spostamento in croce di fp*vs fallito: " + (r2.error || "");
      if (toPretty(r2.newEq, 0) !== "v\xB7(fp \u2212 f)/(fp\xB7vs) = 1") {
        return "risultato errato per fp*vs: " + toPretty(r2.newEq, 0);
      }
      const r3 = applyDragMove({
        currentEq: r2.newEq,
        varName: "fp*vs",
        nodeType: "Mul",
        fromSide: "left",
        fromSlot: "den",
        targetSide: "right",
        targetSlot: "num"
      });
      if (!r3.ok) return "ritorno in croce di fp*vs fallito: " + (r3.error || "");
      if (toPretty(r3.newEq, 0) !== "v\xB7(fp \u2212 f) = fp\xB7vs") {
        return "ritorno errato: " + toPretty(r3.newEq, 0);
      }
      return true;
    }));
    results.push(test("m.c.m.: somma di frazioni 1/R1 + 1/R2 diventa (R1 + R2)/(R1\xB7R2)", () => {
      const expr2 = Add(Div(Num(1), Var("R_1")), Div(Num(1), Var("R_2")));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "(R_1 + R_2)/(R_1\xB7R_2)" ? true : `atteso (R_1 + R_2)/(R_1\xB7R_2), ottenuto: ${pretty}`;
    }));
    results.push(test("m.c.m.: somma frazione e termine intero A/B + C diventa (A + B\xB7C)/B", () => {
      const expr2 = Add(Div(Var("A"), Var("B")), Var("C"));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "(A + B\xB7C)/B" ? true : `atteso (A + B\xB7C)/B, ottenuto: ${pretty}`;
    }));
    results.push(test("m.c.m.: differenza termine e frazione A - B/C diventa (A\xB7C \u2212 B)/C", () => {
      const expr2 = Sub(Var("A"), Div(Var("B"), Var("C")));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "(A\xB7C \u2212 B)/C" ? true : `atteso (A\xB7C \u2212 B)/C, ottenuto: ${pretty}`;
    }));
    results.push(test("m.c.m.: frazione con denominatori numerici x/2 + y/4 diventa (y + 2\xB7x)/4", () => {
      const expr2 = Add(Div(Var("x"), Num(2)), Div(Var("y"), Num(4)));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "(y + 2\xB7x)/4" ? true : `atteso (y + 2\xB7x)/4, ottenuto: ${pretty}`;
    }));
    results.push(test("m.c.m.: doppia frazione con somma al denominatore 1 / (1/R1 + 1/R2) diventa R1\xB7R2/(R1 + R2)", () => {
      const expr2 = Div(Num(1), Add(Div(Num(1), Var("R_1")), Div(Num(1), Var("R_2"))));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "R_1\xB7R_2/(R_1 + R_2)" ? true : `atteso R_1\xB7R_2/(R_1 + R_2), ottenuto: ${pretty}`;
    }));
    results.push(test("m.c.m.: frazione di frazione semplice v / (s/t) diventa t\xB7v/s", () => {
      const expr2 = Div(Var("v"), Div(Var("s"), Var("t")));
      const res = reduceToSingleFraction(expr2);
      const pretty = toPretty(res, 0);
      return pretty === "t\xB7v/s" ? true : `atteso t\xB7v/s, ottenuto: ${pretty}`;
    }));
    results.push(test("Regola: commonDenom applicata a 1/Req = 1/R1 + 1/R2 produce 1/Req = (R1 + R2)/(R1\xB7R2)", () => {
      const e = eq("1/Req = 1/R1 + 1/R2");
      const res = applyRule(RULES.commonDenom, e, { side: "right" });
      if (!res.ok) return "regola commonDenom rifiutata: " + res.error;
      const pretty = toPretty(res.equation, 0);
      return pretty === "1/Req = (R1 + R2)/(R1\xB7R2)" ? true : `atteso 1/Req = (R1 + R2)/(R1\xB7R2), ottenuto: ${pretty}`;
    }));
    results.push(test("Risoluzione completa: 1/Req = 1/R1 + 1/R2 con commonDenom + reciproco isola Req", () => {
      const e = eq("1/Req = 1/R1 + 1/R2");
      const step1 = applyRule(RULES.commonDenom, e, { side: "right" });
      if (!step1.ok) return "passo 1 fallito: " + step1.error;
      const step2 = reciprocalEquation(step1.equation);
      if (!step2.ok) return "passo 2 fallito: " + step2.error;
      const finalPretty = toPretty(step2.newEq, 0);
      const goal = isGoalReached(step2.newEq, "Req");
      return goal && finalPretty === "Req = R1\xB7R2/(R1 + R2)" ? true : `atteso Req = R1\xB7R2/(R1 + R2), ottenuto: ${finalPretty}`;
    }));
    results.push(test("Regola: commonDenom rifiutata se l'equazione \xE8 gi\xE0 a frazione semplice", () => {
      const e = eq("v = s/t");
      const res = applyRule(RULES.commonDenom, e);
      return !res.ok && res.error.includes("denominatore comune") ? true : "doveva rifiutare v = s/t";
    }));
    return results;
  }
  function formatTestResults(results) {
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    const html = results.map((r) => {
      const cls = r.ok ? "pass" : "fail";
      const icon = r.ok ? "\u2713" : "\u2717";
      return `<div class="test-row ${cls}">
      <span class="test-icon">${icon}</span>
      <span class="test-name">${escapeHtml2(r.name)}</span>
      ${r.detail ? `<span class="test-detail">${escapeHtml2(r.detail)}</span>` : ""}
    </div>`;
    }).join("");
    return { passed, failed, total: results.length, html };
  }
  function escapeHtml2(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // js/formula-db.js
  var STORAGE_KEY = "formuleInverse.userFormulas.v1";
  var GREEK_MAP = {
    alpha: "alpha",
    beta: "beta",
    gamma: "gamma",
    delta: "delta",
    epsilon: "eps",
    varepsilon: "eps",
    zeta: "zeta",
    eta: "eta",
    theta: "theta",
    vartheta: "theta",
    iota: "iota",
    kappa: "kappa",
    lambda: "lam",
    mu: "mu",
    nu: "nu",
    xi: "xi",
    pi: "pi",
    varpi: "pi",
    rho: "rho",
    varrho: "rho",
    sigma: "sigma",
    varsigma: "sigma",
    tau: "tau",
    upsilon: "upsilon",
    phi: "phi",
    varphi: "phi",
    chi: "chi",
    psi: "psi",
    omega: "omega",
    Gamma: "Gamma",
    Theta: "Theta",
    Lambda: "Lambda",
    Xi: "Xi",
    Pi: "Pi",
    Sigma: "Sigma",
    Upsilon: "Upsilon",
    Phi: "Phi",
    Psi: "Psi",
    Omega: "Omega",
    Delta: "d"
  };
  var SIMPLE_COMMANDS = {
    cdot: "*",
    times: "*",
    "\\cdot": "*",
    div: "/",
    pm: "+",
    mp: "-",
    leq: "<=",
    le: "<=",
    geq: ">=",
    ge: ">=",
    neq: "!=",
    ne: "!=",
    approx: "~"
  };
  var LatexError = class extends Error {
  };
  function latexToSyntax(input) {
    if (typeof input !== "string" || !input.trim()) {
      throw new LatexError("Nessuna formula fornita.");
    }
    let s = input.trim();
    s = s.replace(/^\s*\$\$?/, "").replace(/\$\$?\s*$/, "");
    s = s.replace(/\\\[/g, "").replace(/\\\]/g, "");
    s = s.replace(/\\\(/g, "").replace(/\\\)/g, "");
    s = expandCommand(s, "frac", (args) => `(${args[0]})/(${args[1]})`, 2);
    s = expandCommand(s, "dfrac", (args) => `(${args[0]})/(${args[1]})`, 2);
    s = expandCommand(s, "tfrac", (args) => `(${args[0]})/(${args[1]})`, 2);
    s = expandSqrt(s);
    s = s.replace(/\\(left|right|big|Big|bigg|Bigg|middle)\.?/g, "");
    s = s.replace(/\\(text|mathrm|mathsf|mathbf|operatorname)\{([^{}]*)\}/g, "$2");
    s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => {
      if (Object.prototype.hasOwnProperty.call(GREEK_MAP, name)) return GREEK_MAP[name];
      if (Object.prototype.hasOwnProperty.call(SIMPLE_COMMANDS, name)) return SIMPLE_COMMANDS[name];
      return "";
    });
    s = s.replace(/\\[,;:!]/g, "");
    s = s.replace(/\\quad|\\qquad/g, " ");
    s = s.replace(/\\!/g, "");
    s = s.replace(/\{/g, "(").replace(/\}/g, ")");
    s = s.replace(/([A-Za-z0-9]+)_\{([A-Za-z0-9]+)\}/g, "$1_$2");
    s = s.replace(/([A-Za-z0-9]+)_([A-Za-z0-9])/g, "$1$2");
    s = s.replace(/(^|[^A-Za-z0-9])d\s+([A-Za-z])(?![A-Za-z0-9])/g, "$1d$2");
    let prev;
    do {
      prev = s;
      s = s.replace(/([A-Za-z0-9]+)\s+([A-Za-z0-9]+)/g, (m, a, b) => {
        if (a.length === 1 && b.length === 1) return a + b;
        return a + "*" + b;
      });
    } while (s !== prev);
    s = s.replace(/\s+/g, " ").trim();
    if (!s || !s.includes("=")) {
      throw new LatexError(`La conversione non ha prodotto un'equazione con "=".`);
    }
    return s;
  }
  function expandCommand(src, cmd, build, argc, depth = 0) {
    const marker = "\\" + cmd;
    let result = "";
    let i = 0;
    while (i < src.length) {
      if (src.startsWith(marker, i)) {
        let j = i + marker.length;
        const args = [];
        let ok = true;
        for (let k = 0; k < argc; k++) {
          while (src[j] === " ") j++;
          if (src[j] !== "{") {
            ok = false;
            break;
          }
          const close = matchBrace(src, j);
          if (close < 0) {
            ok = false;
            break;
          }
          args.push(src.slice(j + 1, close));
          j = close + 1;
        }
        if (!ok) {
          result += src[i];
          i++;
          continue;
        }
        const expandedArgs = args.map((a) => expandCommand(a, cmd, build, argc, depth + 1));
        result += build(expandedArgs);
        i = j;
      } else {
        result += src[i];
        i++;
      }
    }
    return result;
  }
  function matchBrace(str, open) {
    let depth = 0;
    for (let k = open; k < str.length; k++) {
      if (str[k] === "{") depth++;
      else if (str[k] === "}") {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  }
  function expandSqrt(src) {
    let result = "";
    let i = 0;
    while (i < src.length) {
      if (src.startsWith("\\sqrt", i)) {
        let j = i + 5;
        let n = null;
        if (src[j] === "[") {
          const end = src.indexOf("]", j);
          if (end > 0) {
            n = src.slice(j + 1, end);
            j = end + 1;
          }
        }
        while (src[j] === " ") j++;
        if (src[j] === "{") {
          const close = matchBrace(src, j);
          if (close > 0) {
            const inner = expandSqrt(src.slice(j + 1, close));
            if (n && n.trim() && n.trim() !== "2") {
              result += `(${inner})^(1/(${n.trim()}))`;
            } else {
              result += `sqrt(${inner})`;
            }
            i = close + 1;
            continue;
          }
        }
        result += "sqrt";
        i += 5;
      } else {
        result += src[i];
        i++;
      }
    }
    return result;
  }
  var memoryStore = null;
  function storageAvailable() {
    try {
      const k = "__fi_test__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }
  var HAS_LS = typeof window !== "undefined" && storageAvailable();
  var CLEARED_KEY = "formuleInverse.userFormulas.cleared";
  var PRELOADED_USER_FORMULAS = [
    {
      id: "usr-dilatazione-termica-lineare",
      name: "Dilatazione termica lineare",
      formula: "l = l0 + lam * L0 * ( T-T0)",
      latex: "l = l_0 + \\lambda \\cdot L_0 \\cdot ( T-T_0)",
      topic: "Le mie formule",
      isolate: ["l", "l0", "lam", "L0", "T", "T0"],
      conditions: [],
      difficulty: 3,
      notes: "Dilatazione termica lineare: l = l\u2080 + \u03BB\xB7L\u2080\xB7(T \u2212 T\u2080).",
      createdAt: 17e11
    }
  ];
  function readRaw() {
    if (!HAS_LS) {
      if (memoryStore === null) {
        memoryStore = PRELOADED_USER_FORMULAS.slice();
      }
      return memoryStore.slice();
    }
    try {
      const cleared = window.localStorage.getItem(CLEARED_KEY);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      let list = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(list)) list = raw ? [] : null;
      if (list === null) {
        list = cleared ? [] : PRELOADED_USER_FORMULAS.slice();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } else if (!cleared && !list.some((f) => f.id === "usr-dilatazione-termica-lineare" || f.name && f.name.toLowerCase() === "dilatazione termica lineare")) {
        list.unshift(...PRELOADED_USER_FORMULAS);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      return list;
    } catch (e) {
      return memoryStore ? memoryStore.slice() : [];
    }
  }
  function writeRaw(list) {
    if (!HAS_LS) {
      memoryStore = list.slice();
      return true;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      memoryStore = list.slice();
      return false;
    }
  }
  function getUserFormulas() {
    return readRaw();
  }
  function saveUserFormula(entry) {
    if (HAS_LS) {
      try {
        window.localStorage.removeItem(CLEARED_KEY);
      } catch (e) {
      }
    }
    if (!entry || !entry.formula) {
      throw new LatexError("Dati insufficienti per salvare la formula.");
    }
    const list = readRaw();
    const saved = {
      id: entry.id || "usr-" + Date.now() + "-" + Math.floor(Math.random() * 1e4),
      name: entry.name || "formula salvata",
      formula: String(entry.formula),
      latex: entry.latex || "",
      topic: entry.topic || "Le mie formule",
      isolate: Array.isArray(entry.isolate) ? entry.isolate : [],
      conditions: Array.isArray(entry.conditions) ? entry.conditions : [],
      difficulty: entry.difficulty || 3,
      notes: entry.notes || "",
      createdAt: entry.createdAt || Date.now()
    };
    const idx = list.findIndex((f) => f.id === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    writeRaw(list);
    return saved;
  }
  function deleteUserFormula(id) {
    const list = readRaw();
    const next = list.filter((f) => f.id !== id);
    if (next.length === list.length) return false;
    writeRaw(next);
    return true;
  }
  function clearUserFormulas() {
    if (HAS_LS) {
      try {
        window.localStorage.setItem(CLEARED_KEY, "1");
      } catch (e) {
      }
    }
    writeRaw([]);
    memoryStore = [];
  }
  function exportUserFormulasJSON() {
    return JSON.stringify(readRaw(), null, 2);
  }
  function importUserFormulasJSON(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new LatexError("Il testo incollato non e' un JSON valido.");
    }
    if (!Array.isArray(parsed)) {
      throw new LatexError("Il JSON deve contenere un elenco (array) di formule.");
    }
    const list = readRaw();
    let added = 0;
    for (const item of parsed) {
      if (!item || !item.formula) continue;
      if (list.some((f) => f.id === item.id)) continue;
      list.push({
        id: item.id || "usr-" + Date.now() + "-" + Math.floor(Math.random() * 1e4),
        name: item.name || "formula importata",
        formula: String(item.formula),
        latex: item.latex || "",
        topic: item.topic || "Le mie formule",
        isolate: Array.isArray(item.isolate) ? item.isolate : [],
        conditions: Array.isArray(item.conditions) ? item.conditions : [],
        difficulty: item.difficulty || 3,
        notes: item.notes || "",
        createdAt: item.createdAt || Date.now()
      });
      added++;
    }
    writeRaw(list);
    return added;
  }

  // js/app.js
  var state = {
    baseFormula: null,
    startEq: null,
    currentEq: null,
    targetVar: null,
    conditions: [],
    history: [],
    historyIndex: -1,
    mode: "free",
    selectedId: null,
    pendingMove: null,
    goalReached: false,
    showImplicitDen: false,
    keypadOp: null,
    crossMode: false,
    crossPicked: [],
    clickDragToken: null,
    isAnimatingCompoundFraction: false,
    compoundAnimTimers: []
  };
  var $ = (sel) => document.querySelector(sel);
  var dom = {
    btnInstallPwa: $("#btn-install-pwa"),
    libraryList: $("#library-list"),
    librarySearch: $("#library-search"),
    libraryTopic: $("#library-topic"),
    libraryDifficulty: $("#library-difficulty"),
    libraryCountBadge: $("#library-count-badge"),
    btnRandom: $("#btn-random"),
    objectiveText: $("#objective-text"),
    objectiveStatus: $("#objective-status"),
    objectiveBox: $("#objective-box"),
    btnRetryExercise: $("#btn-retry-exercise"),
    completionBanner: $("#completion-banner"),
    completionTitle: $("#completion-title"),
    completionSubtitle: $("#completion-subtitle"),
    btnCompletionRetry: $("#btn-completion-retry"),
    btnCompletionNext: $("#btn-completion-next"),
    btnMirror: $("#btn-mirror"),
    btnReciprocal: $("#btn-reciprocal"),
    btnDistribute: $("#btn-distribute"),
    btnFactorCommon: $("#btn-factor-common"),
    btnCommonDenom: $("#btn-common-denom"),
    btnChangeSign: $("#btn-change-sign"),
    btnCross: $("#btn-cross"),
    compoundFractionBanner: $("#compound-fraction-banner"),
    compoundFractionTitle: $("#compound-fraction-title"),
    compoundFractionStepBadge: $("#compound-fraction-step-badge"),
    compoundFractionMsg: $("#compound-fraction-msg"),
    crossLayer: $("#cross-layer"),
    crossHandle: $("#cross-handle"),
    crossDissolveLayer: $("#cross-dissolve-layer"),
    equationDisplay: $("#equation-display"),
    keypadOps: $("#keypad-ops"),
    keypadOperands: $("#keypad-operands"),
    keypadHint: $("#keypad-hint"),
    latexLiveCode: $("#latex-live-code"),
    btnCopyLatexInline: $("#btn-copy-latex-inline"),
    objectiveTargetPicker: $("#objective-target-picker"),
    targetChips: $("#target-chips"),
    pickTargetBackdrop: $("#pick-target-backdrop"),
    pickTargetFormulaName: $("#pick-target-formula-name"),
    pickTargetFormulaPreview: $("#pick-target-formula-preview"),
    pickTargetButtons: $("#pick-target-buttons"),
    conditionsBox: $("#conditions-box"),
    conditionsList: $("#conditions-list"),
    previewBox: $("#preview-box"),
    previewText: $("#preview-text"),
    btnConfirm: $("#btn-confirm"),
    btnCancel: $("#btn-cancel"),
    messageBox: $("#message-box"),
    actionHint: $("#action-hint"),
    actionButtons: $("#action-buttons"),
    btnQuickHint: $("#btn-quick-hint"),
    rulePanel: $("#rule-panel"),
    historyList: $("#history-list"),
    btnUndo: $("#btn-undo"),
    btnRedo: $("#btn-redo"),
    btnReset: $("#btn-reset"),
    btnCopySteps: $("#btn-copy-steps"),
    btnCopyStepsLatex: $("#btn-copy-steps-latex"),
    customFormula: $("#custom-formula"),
    customTarget: $("#custom-target"),
    btnLoadCustom: $("#btn-load-custom"),
    customError: $("#custom-error"),
    modalBackdrop: $("#modal-backdrop"),
    modalTitle: $("#modal-title"),
    modalBody: $("#modal-body"),
    modalActions: $("#modal-actions"),
    testsBackdrop: $("#tests-backdrop"),
    testsSummary: $("#tests-summary"),
    testsBody: $("#tests-body"),
    btnRunTests: $("#btn-run-tests"),
    btnHelp: $("#btn-help"),
    btnContrast: $("#btn-contrast"),
    btnTheme: $("#btn-theme"),
    // --- Import LaTeX ---
    latexInput: $("#latex-input"),
    latexName: $("#latex-name"),
    latexTarget: $("#latex-target"),
    btnLatexPreview: $("#btn-latex-preview"),
    btnLatexSave: $("#btn-latex-save"),
    latexPreview: $("#latex-preview"),
    latexError: $("#latex-error"),
    // --- Archivio personale ---
    myFormulasList: $("#my-formulas-list"),
    myFormulasCount: $("#my-formulas-count"),
    btnExportFormulas: $("#btn-export-formulas"),
    btnImportFormulas: $("#btn-import-formulas"),
    btnClearFormulas: $("#btn-clear-formulas"),
    jsonArea: $("#json-area"),
    storageError: $("#storage-error"),
    // --- Didactic Bubble (Fumetto Diagnosi) ---
    didacticBubbleAnchor: $("#didactic-bubble-anchor"),
    didacticBubble: $("#didactic-bubble"),
    bubbleBadge: $("#bubble-badge"),
    bubbleMessage: $("#bubble-message"),
    bubbleHintBox: $("#bubble-hint-box"),
    bubbleHintText: $("#bubble-hint-text"),
    bubbleFooterRule: $("#bubble-footer-rule"),
    btnCloseBubble: $("#btn-close-bubble"),
    btnBubbleOk: $("#btn-bubble-ok"),
    // --- Calcolo numerico con Unità SI ---
    numericalCalcCard: $("#numerical-calc-card"),
    btnCalcSample: $("#btn-calc-sample"),
    btnCalcReset: $("#btn-calc-reset"),
    calcInputsGrid: $("#calc-inputs-grid"),
    calcResultBox: $("#calc-result-box"),
    calcStepFormula: $("#calc-step-formula"),
    calcTargetVar: $("#calc-target-var"),
    calcFinalNumber: $("#calc-final-number"),
    calcFinalUnit: $("#calc-final-unit"),
    btnCopyCalcResult: $("#btn-copy-calc-result"),
    calcErrorNotice: $("#calc-error-notice")
  };
  function init() {
    initTheme();
    populateTopics();
    renderLibrary();
    bindLibraryEvents();
    bindWorkAreaEvents();
    bindHistoryEvents();
    bindEditorEvents();
    bindModeEvents();
    bindGlobalEvents();
    bindLatexEvents();
    bindStorageEvents();
    renderMyFormulas();
    if (dom.crossLayer) dom.crossLayer.hidden = true;
    initDragArrow();
    initPwa();
    loadFormula(getFormulaById("v-st"), "t");
  }
  var deferredInstallPrompt = null;
  function initPwa() {
    if ("serviceWorker" in navigator && (window.location.protocol.startsWith("http") || window.location.protocol === "file:")) {
      if (window.location.protocol.startsWith("http")) {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  showMessage("Nuova versione disponibile! Ricarica la pagina per aggiornare.", "info");
                }
              };
            }
          };
        }).catch((err) => {
          console.debug("Service Worker non registrato:", err);
        });
      }
    }
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (dom.btnInstallPwa && !isStandalone) {
        dom.btnInstallPwa.style.display = "inline-flex";
      }
    });
    if (dom.btnInstallPwa) {
      dom.btnInstallPwa.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        dom.btnInstallPwa.style.display = "none";
        deferredInstallPrompt.prompt();
        try {
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            showMessage("\u{1F389} Installazione avviata! Troverai l'app sulla schermata Home.", "success");
          }
        } catch (_) {
        }
        deferredInstallPrompt = null;
      });
    }
    window.addEventListener("appinstalled", () => {
      if (dom.btnInstallPwa) dom.btnInstallPwa.style.display = "none";
      deferredInstallPrompt = null;
      showMessage('\u{1F389} "Formule Inverse" \xE8 ora installata sul tuo dispositivo!', "success");
    });
  }
  function populateTopics() {
    for (const t of TOPICS) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      dom.libraryTopic.appendChild(opt);
    }
  }
  var parsedFormulaCache = /* @__PURE__ */ new Map();
  function parseFormulaCached(formulaStr) {
    if (!parsedFormulaCache.has(formulaStr)) {
      parsedFormulaCache.set(formulaStr, parseEquation(formulaStr));
    }
    return parsedFormulaCache.get(formulaStr);
  }
  function renderLibrary() {
    const topic = dom.libraryTopic ? dom.libraryTopic.value : "";
    const search = dom.librarySearch ? dom.librarySearch.value.trim() : "";
    const difficulty = dom.libraryDifficulty ? dom.libraryDifficulty.value : "";
    const list = filterFormulas({ topic, search, difficulty });
    if (topic && search && list.length > 0 && list.some((f) => f.topic !== topic)) {
      if (dom.libraryTopic) dom.libraryTopic.value = "";
    }
    if (dom.libraryCountBadge) {
      dom.libraryCountBadge.textContent = list.length + (list.length === 1 ? " formula" : " formule");
    }
    dom.libraryList.innerHTML = "";
    if (list.length === 0) {
      dom.libraryList.innerHTML = '<p class="placeholder">Nessuna formula trovata per i filtri selezionati.</p>';
      return;
    }
    for (const f of list) {
      const card = document.createElement("div");
      card.className = "formula-card";
      card.dataset.id = f.id;
      card.setAttribute("role", "option");
      card.tabIndex = 0;
      const dif = "\u2605".repeat(f.difficulty) + "\u2606".repeat(5 - f.difficulty);
      let mathHtml = "";
      try {
        mathHtml = renderEquation(parseFormulaCached(f.formula), {});
      } catch (e) {
        mathHtml = escapeHtml3(f.formula);
      }
      card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml3(f.topic)}</span>
        <span class="formula-diff" title="Difficolt\xE0 ${f.difficulty}/5">${dif}</span>
      </div>
      <div class="formula-name">${escapeHtml3(f.name)}</div>
      <div class="formula-math">${mathHtml}</div>
      <div class="formula-isolate">
        <span class="isolate-label">Scegli cosa ricavare:</span>
        <div class="isolate-chips">
          ${f.isolate.map((v) => `<button type="button" class="isolate-chip" data-var="${v}" title="Ricava ${prettyVar(v)}">${prettyVar(v)}</button>`).join("")}
        </div>
      </div>
    `;
      card.querySelectorAll(".isolate-chip").forEach((chip) => {
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          clearSelection();
          clearPreview();
          loadFormula(f, chip.dataset.var);
        });
      });
      const select = () => {
        clearSelection();
        clearPreview();
        if (f.isolate.length > 1) {
          openPickTargetModal(f);
        } else {
          loadFormula(f, f.isolate[0]);
        }
      };
      card.addEventListener("click", select);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });
      dom.libraryList.appendChild(card);
    }
  }
  function openPickTargetModal(formulaEntry) {
    if (!dom.pickTargetBackdrop) {
      loadFormula(formulaEntry, formulaEntry.isolate[0]);
      return;
    }
    dom.pickTargetFormulaName.textContent = formulaEntry.name;
    try {
      dom.pickTargetFormulaPreview.innerHTML = renderEquation(parseFormulaCached(formulaEntry.formula), {});
    } catch {
      dom.pickTargetFormulaPreview.textContent = formulaEntry.formula;
    }
    dom.pickTargetButtons.innerHTML = "";
    formulaEntry.isolate.forEach((v) => {
      const btn = document.createElement("button");
      btn.className = "pick-target-btn";
      btn.type = "button";
      btn.innerHTML = `<span>${escapeHtml3(prettyVar(v))}</span><small>ricava ${escapeHtml3(prettyVar(v))}</small>`;
      btn.addEventListener("click", () => {
        dom.pickTargetBackdrop.hidden = true;
        loadFormula(formulaEntry, v);
      });
      dom.pickTargetButtons.appendChild(btn);
    });
    dom.pickTargetBackdrop.hidden = false;
  }
  function triviallyIsolated(formulaStr, v) {
    const parts = formulaStr.split("=");
    if (parts.length !== 2) return false;
    return parts[0].trim() === v;
  }
  function bindLibraryEvents() {
    if (dom.librarySearch) {
      dom.librarySearch.addEventListener("input", renderLibrary);
      dom.librarySearch.addEventListener("search", renderLibrary);
    }
    if (dom.libraryTopic) dom.libraryTopic.addEventListener("change", renderLibrary);
    if (dom.libraryDifficulty) dom.libraryDifficulty.addEventListener("change", renderLibrary);
    if (dom.btnRandom) {
      dom.btnRandom.addEventListener("click", () => {
        const { id, target } = randomExercise();
        loadFormula(getFormulaById(id), target);
      });
    }
  }
  function loadFormula(formulaEntry, targetVar) {
    cancelCompoundFractionAnimation();
    cancelActiveSwapAnimations();
    let eq2;
    try {
      eq2 = parseEquation(formulaEntry.formula);
    } catch (e) {
      showMessage("Errore nel caricamento della formula: " + e.message, "error");
      return;
    }
    const vars = collectVars(eq2);
    if (!vars.has(targetVar)) {
      const alt = [...vars].find((v) => v.toLowerCase() === targetVar.toLowerCase());
      if (alt) targetVar = alt;
      else {
        showMessage(`La grandezza "${targetVar}" non compare nella formula.`, "error");
        return;
      }
    }
    state.baseFormula = formulaEntry;
    state.startEq = clone(eq2);
    state.currentEq = clone(eq2);
    state.targetVar = targetVar;
    state.conditions = (formulaEntry.conditions || []).slice();
    state.history = [];
    state.historyIndex = -1;
    state.selectedId = null;
    state.pendingMove = null;
    state.goalReached = false;
    state.keypadOp = null;
    state.crossMode = false;
    state.crossPicked = [];
    if (dom.btnCross) {
      dom.btnCross.classList.remove("active");
      dom.btnCross.setAttribute("aria-pressed", "false");
    }
    pushHistory({
      equation: clone(eq2),
      ruleName: "Formula di partenza",
      rulePrinciple: formulaEntry.formula,
      steps: [],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: formulaEntry.hypotheses || null,
      verified: true
    }, true);
    updateObjective();
    renderEquationView();
    updateRulePanelInitial(formulaEntry);
    clearMessage();
    clearPreview();
    clearSelection();
    dismissDidacticBubble();
    if (state.goalReached && checkAndAnimateCompoundFraction()) {
      return;
    }
    if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function renderEquationView() {
    if (!state.currentEq) {
      dom.equationDisplay.innerHTML = '<p class="placeholder">Nessuna equazione caricata.</p>';
      if (dom.latexLiveCode) dom.latexLiveCode.textContent = "";
      renderKeypad();
      return;
    }
    dom.equationDisplay.innerHTML = renderEquation(state.currentEq, {
      selectedId: state.selectedId,
      targetVar: state.targetVar,
      interactive: true,
      showImplicitDen: state.showImplicitDen
    });
    if (dom.latexLiveCode) {
      dom.latexLiveCode.textContent = toLatex(state.currentEq);
    }
    attachEquationHandlers();
    setupEquationDragAndDrop(dom.equationDisplay, {
      getCurrentEquation: () => state.currentEq,
      onApplyMove: applyDragResult
    });
    attachDropzoneClickHandlers();
    renderConditions();
    renderKeypad();
    const card = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.toggle("is-auto-mode", state.mode === "auto");
    if (state.mode === "auto") {
      const hintBadge = document.querySelector(".drag-hint-badge");
      const hintText = document.querySelector(".drag-hint-text");
      if (hintBadge && hintText) {
        hintBadge.textContent = "\u26A1 Modalit\xE0 Automatica";
        hintText.innerHTML = "<strong>Fai clic ovunque con il mouse</strong> (sull'equazione o sul pulsante) per eseguire il passaggio con la giustificazione della regola!";
      }
    }
    scheduleNeutralCleanup();
  }
  var _neutralCleanupTimer = null;
  function scheduleNeutralCleanup() {
    if (_neutralCleanupTimer) clearTimeout(_neutralCleanupTimer);
    _neutralCleanupTimer = setTimeout(() => {
      if (!state.currentEq) return;
      const cleaned = stripNeutrals(state.currentEq);
      if (!structurallyEqual(cleaned, state.currentEq)) {
        const wraps = dom.equationDisplay ? dom.equationDisplay.querySelectorAll(".neutral-fade-wrap") : [];
        if (wraps.length > 0) {
          wraps.forEach((w) => {
            w.classList.add("var-exploding");
            spawnVariableExplosion(w, "gold");
          });
          setTimeout(() => {
            state.currentEq = cleaned;
            renderEquationView();
          }, 400);
        } else {
          state.currentEq = cleaned;
          renderEquationView();
        }
      }
    }, 1600);
  }
  function renderKeypad() {
    if (!dom.keypadOps || !dom.keypadOperands) return;
    dom.keypadOps.innerHTML = "";
    for (const op of KEYPAD_OPERATIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-op" + (state.keypadOp === op.id ? " active" : "");
      btn.dataset.op = op.id;
      btn.textContent = op.label;
      btn.title = op.title;
      btn.setAttribute("aria-label", op.title);
      btn.setAttribute("aria-pressed", state.keypadOp === op.id ? "true" : "false");
      btn.disabled = !state.currentEq;
      btn.addEventListener("click", () => handleKeypadOpClick(op));
      dom.keypadOps.appendChild(btn);
    }
    dom.keypadOperands.innerHTML = "";
    if (!state.currentEq) {
      dom.keypadOperands.innerHTML = '<p class="placeholder small">Carica una formula per usare il tastierino.</p>';
      updateKeypadHint();
      return;
    }
    const { letters, numbers } = equationKeypadTokens(state.currentEq);
    for (const name of letters) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-operand keypad-letter";
      btn.textContent = prettyVar(name);
      btn.title = `Applica ${name}`;
      btn.addEventListener("click", () => handleKeypadOperandClick(name));
      dom.keypadOperands.appendChild(btn);
    }
    for (const value of numbers) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-operand keypad-number";
      btn.textContent = String(value);
      btn.title = `Applica ${value}`;
      btn.addEventListener("click", () => handleKeypadOperandClick(String(value)));
      dom.keypadOperands.appendChild(btn);
    }
    const custom = document.createElement("span");
    custom.className = "keypad-custom";
    custom.innerHTML = `<input class="keypad-custom-value" type="text" inputmode="numeric" placeholder="n" aria-label="Altro numero o grandezza" size="3"><button type="button" class="btn-mini keypad-custom-apply" title="Applica all'equazione">Applica</button>`;
    dom.keypadOperands.appendChild(custom);
    const input = custom.querySelector(".keypad-custom-value");
    const applyBtn = custom.querySelector(".keypad-custom-apply");
    const submit = () => {
      const value = (input.value || "").trim();
      if (!value) return;
      handleKeypadOperandClick(value);
      input.value = "";
    };
    applyBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    updateKeypadHint();
  }
  function updateKeypadHint() {
    if (!dom.keypadHint) return;
    if (!state.currentEq) {
      dom.keypadHint.textContent = "Carica una formula per usare il tastierino.";
      return;
    }
    if (!state.keypadOp) {
      dom.keypadHint.textContent = "Scegli un'operazione: verr\xE0 applicata a entrambi i membri.";
      return;
    }
    const op = KEYPAD_OPERATIONS.find((o) => o.id === state.keypadOp);
    dom.keypadHint.textContent = op && !op.needsOperand ? `Premi di nuovo per applicare ${op.label} a entrambi i membri.` : `Operazione ${op ? op.label : ""} scelta: ora tocca una grandezza o un numero.`;
  }
  function handleKeypadOpClick(op) {
    if (!state.currentEq) return;
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
  function handleKeypadOperandClick(text) {
    if (!state.currentEq) return;
    if (!state.keypadOp) {
      showMessage("Prima scegli un'operazione nel tastierino, poi la grandezza o il numero.", "info");
      return;
    }
    applyKeypadMove(state.keypadOp, parseOperand(text), text);
  }
  function applyKeypadMove(opId, operandNode, operandText) {
    const op = KEYPAD_OPERATIONS.find((o) => o.id === opId);
    const label = op ? op.label : opId;
    const before = state.currentEq;
    const res = applyKeypadOperation(before, opId, operandNode, operandText, state.targetVar);
    if (!res.ok) {
      state.keypadOp = null;
      renderKeypad();
      clearPreview();
      animateOperationBadge(label, operandText);
      showInvalidMove(res.error, res.hint, { label: `Applica ${label} a entrambi i membri` });
      return;
    }
    const newEq = res.equation;
    if (equivalentEq(newEq, before)) {
      state.keypadOp = null;
      renderKeypad();
      showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    if (opId === "add" || opId === "sub") playSoundTransport();
    else playSoundFraction();
    state.currentEq = newEq;
    state.conditions = mergeConditions(state.conditions, res.conditions || []);
    state.selectedId = null;
    state.keypadOp = null;
    clearPreview();
    const ruleName = `Applica ${label}${operandText ? " " + prettyVar(operandText) : ""} a entrambi i membri`;
    pushHistory({
      equation: clone(newEq),
      ruleName,
      rulePrinciple: res.note || "",
      ruleId: "keypad-" + opId,
      steps: res.steps || [],
      conditions: (res.conditions || []).slice(),
      explanationKey: null,
      note: res.note || null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    showRulePanel(
      { name: ruleName, principle: res.steps && res.steps.length ? res.steps.join(" ") : "", explanation: null },
      { steps: res.steps || [], conditions: res.conditions || [], note: res.note || null },
      newEq
    );
    clearMessage();
    animateOperationBadge(label, operandText);
    showMessage(`\u2713 ${ruleName}.`, "success");
    if (res.note) showMessage(res.note, "info");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function animateOperationBadge(label, operandText) {
    if (!dom.equationDisplay) return;
    const card = dom.equationDisplay.closest(".equation-display-card") || dom.equationDisplay;
    card.classList.remove("op-animating");
    void card.offsetWidth;
    card.classList.add("op-animating");
    const badge = document.createElement("span");
    badge.className = "op-anim-badge";
    badge.textContent = operandText ? `${label}${prettyVar(operandText)}` : label;
    badge.setAttribute("aria-hidden", "true");
    card.appendChild(badge);
    const cleanup = () => {
      card.classList.remove("op-animating");
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    };
    badge.addEventListener("animationend", cleanup);
    setTimeout(cleanup, 1200);
  }
  var _isMirrorSwapping = false;
  var _currentMirrorAnims = [];
  function cancelActiveSwapAnimations() {
    _isMirrorSwapping = false;
    if (_currentMirrorAnims.length > 0) {
      _currentMirrorAnims.forEach((a) => {
        try {
          a.cancel();
        } catch (_) {
        }
      });
      _currentMirrorAnims = [];
    }
  }
  function animateMirrorSwap(fromEq, toEq, onComplete) {
    if (_isMirrorSwapping) {
      if (onComplete) onComplete();
      return;
    }
    const memberL = dom.equationDisplay ? dom.equationDisplay.querySelector(".math-member-left") : null;
    const memberR = dom.equationDisplay ? dom.equationDisplay.querySelector(".math-member-right") : null;
    const eqSign = dom.equationDisplay ? dom.equationDisplay.querySelector(".eq-sign") : null;
    if (!memberL || !memberR) {
      if (onComplete) onComplete();
      return;
    }
    _isMirrorSwapping = true;
    playSoundTransport();
    const rectL = memberL.getBoundingClientRect();
    const rectR = memberR.getBoundingClientRect();
    const deltaX = rectR.left - rectL.left;
    if (eqSign) {
      eqSign.classList.remove("eq-sign-mirror-active");
      void eqSign.offsetWidth;
      eqSign.classList.add("eq-sign-mirror-active");
    }
    const animL = memberL.animate([
      { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      { transform: `translate(${deltaX * 0.5}px, -20px) scale(1.04)`, opacity: 0.94, offset: 0.5 },
      { transform: `translate(${deltaX}px, 0px) scale(1)`, opacity: 1 }
    ], {
      duration: 260,
      easing: "cubic-bezier(0.25, 1, 0.4, 1)",
      fill: "forwards"
    });
    const animR = memberR.animate([
      { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      { transform: `translate(${-deltaX * 0.5}px, 20px) scale(1.04)`, opacity: 0.94, offset: 0.5 },
      { transform: `translate(${-deltaX}px, 0px) scale(1)`, opacity: 1 }
    ], {
      duration: 260,
      easing: "cubic-bezier(0.25, 1, 0.4, 1)",
      fill: "forwards"
    });
    _currentMirrorAnims = [animL, animR];
    animL.onfinish = () => {
      _isMirrorSwapping = false;
      _currentMirrorAnims = [];
      if (eqSign) eqSign.classList.remove("eq-sign-mirror-active");
      if (onComplete) onComplete();
    };
  }
  function animateTokenTravel(sourceRect, targetRect, tokenText, onComplete) {
    if (!sourceRect || !targetRect) {
      if (onComplete) onComplete();
      return;
    }
    const flyer = document.createElement("div");
    flyer.className = "flying-math-token";
    flyer.textContent = tokenText || "";
    flyer.style.left = `${sourceRect.left}px`;
    flyer.style.top = `${sourceRect.top}px`;
    flyer.style.width = `${Math.max(30, sourceRect.width)}px`;
    flyer.style.height = `${Math.max(28, sourceRect.height)}px`;
    document.body.appendChild(flyer);
    const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
    const midX = dx * 0.5;
    const arcY = dy * 0.5 - Math.max(38, Math.min(85, Math.abs(dx) * 0.28));
    const anim = flyer.animate([
      { transform: "translate(0px, 0px) scale(1)", opacity: 0.95 },
      { transform: `translate(${midX}px, ${arcY}px) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0.95 }
    ], {
      duration: 440,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards"
    });
    anim.onfinish = () => {
      flyer.remove();
      if (onComplete) onComplete();
    };
  }
  function flashSignChanged() {
    if (!dom.equationDisplay) return;
    dom.equationDisplay.querySelectorAll(".draggable-token, .node-target, .op").forEach((el) => {
      el.classList.add("sign-flip-pulse");
    });
    setTimeout(() => {
      if (dom.equationDisplay) {
        dom.equationDisplay.querySelectorAll(".sign-flip-pulse").forEach((el) => el.classList.remove("sign-flip-pulse"));
      }
    }, 700);
  }
  function highlightLandedToken(varName, side) {
    if (!dom.equationDisplay || !varName) return;
    const tokens = dom.equationDisplay.querySelectorAll(`.draggable-token[data-side="${side}"]`);
    for (const t of tokens) {
      if (t.dataset.varName === varName || t.textContent.trim() === varName) {
        t.classList.add("token-landing-glow");
        setTimeout(() => t.classList.remove("token-landing-glow"), 600);
        break;
      }
    }
  }
  function enterClickDragMode(tokenEl) {
    const varName = tokenEl.dataset.varName;
    if (!varName || !state.currentEq) return;
    state.clickDragToken = {
      varName,
      fromSide: tokenEl.dataset.side,
      fromSlot: tokenEl.dataset.slot || "num",
      nodeType: tokenEl.dataset.nodeType || "Var"
    };
    tokenEl.classList.add("token-in-flight");
    dom.equationDisplay.classList.add("is-dragging-equation", "is-click-drag-mode");
    highlightDropzones(dom.equationDisplay, state.clickDragToken);
    showMessage(`"${prettyVar(varName)}" selezionato \u2014 clicca la destinazione (denominatore o membro opposto) per applicare il trasporto, oppure scegli un'operazione in basso. Riclicca per annullare.`, "info");
    const foundEl = findElement(state.currentEq, tokenEl.dataset.id);
    if (foundEl) {
      state.selectedId = tokenEl.dataset.id;
      const actions = availableActions(state.currentEq, foundEl, state.targetVar);
      renderActions(foundEl, actions);
    }
  }
  function exitClickDragMode() {
    state.clickDragToken = null;
    dom.equationDisplay.classList.remove("is-dragging-equation", "is-click-drag-mode");
    dom.equationDisplay.querySelectorAll(".token-in-flight").forEach((el) => el.classList.remove("token-in-flight"));
    clearDropzonesHighlight(dom.equationDisplay);
    hideDragArrow();
  }
  function applyClickDragToDropzone(dz) {
    if (!state.clickDragToken) return;
    const drag = state.clickDragToken;
    const tokenEl = dom.equationDisplay.querySelector(".token-in-flight");
    const sourceRect = tokenEl ? tokenEl.getBoundingClientRect() : null;
    const targetRect = dz.getBoundingClientRect();
    const tokenText = drag.varName;
    exitClickDragMode();
    const result = applyDragMove({
      currentEq: state.currentEq,
      varName: drag.varName,
      nodeType: drag.nodeType,
      fromSide: drag.fromSide,
      fromSlot: drag.fromSlot,
      targetSide: dz.dataset.side,
      targetSlot: dz.dataset.slot
    });
    if (!result.ok) {
      flashTokenRejected(drag.varName, drag.fromSide);
      applyDragResult(result);
      return;
    }
    applyDragResult(result, { sourceRect, targetRect, tokenText, targetSide: dz.dataset.side, varName: drag.varName });
  }
  function attachEquationHandlers() {
    dom.equationDisplay.querySelectorAll(".math-node").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.mode === "auto") {
          executeNextAutoStep();
          return;
        }
        if (state.crossMode) {
          crossPickToken(el.dataset.id, el);
          return;
        }
        if (el.classList.contains("draggable-token") && el.dataset.varName) {
          if (state.clickDragToken) {
            if (el.classList.contains("token-in-flight")) {
              exitClickDragMode();
              return;
            }
            if (el.dataset.side === state.clickDragToken.fromSide) {
              exitClickDragMode();
              enterClickDragMode(el);
              return;
            }
            const dz = el.closest(".dropzone");
            if (dz && dz.dataset.side && dz.dataset.slot) {
              applyClickDragToDropzone(dz);
              return;
            }
            exitClickDragMode();
            return;
          }
          enterClickDragMode(el);
          return;
        }
        if (state.clickDragToken) {
          const dz = el.closest(".dropzone");
          if (dz && dz.dataset.side && dz.dataset.side !== state.clickDragToken.fromSide) {
            applyClickDragToDropzone(dz);
            return;
          }
          exitClickDragMode();
          return;
        }
        selectElement(el.dataset.id);
      });
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", "Elemento: " + (el.textContent || "").trim());
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (state.mode === "auto") {
            executeNextAutoStep();
            return;
          }
          if (state.crossMode) crossPickToken(el.dataset.id, el);
          else selectElement(el.dataset.id);
        }
      });
    });
  }
  function attachDropzoneClickHandlers() {
    dom.equationDisplay.querySelectorAll(".dropzone").forEach((dz) => {
      dz.addEventListener("click", (e) => {
        if (state.mode === "auto") {
          executeNextAutoStep();
          return;
        }
        if (!state.clickDragToken) return;
        if (dz.dataset.side === state.clickDragToken.fromSide) {
          if (state.clickDragToken.fromSlot === "num" && dz.dataset.slot === "den") {
            const oppMember = state.clickDragToken.fromSide === "right" ? "primo membro (sotto la linea di frazione a sinistra)" : "secondo membro (sotto la linea di frazione a destra)";
            showMessage(`Non puoi spostare "${prettyVar(state.clickDragToken.varName)}" al denominatore dello stesso membro! Per il 2\xB0 principio di equivalenza, se dividi per esso va al denominatore del membro OPPOSTO (${oppMember}).`, "warning");
          } else {
            showMessage(`Trascina o clicca sul membro opposto per applicare la regola del trasporto!`, "info");
          }
          flashTokenRejected(state.clickDragToken.varName, state.clickDragToken.fromSide);
          return;
        }
        e.stopPropagation();
        applyClickDragToDropzone(dz);
      });
      dz.addEventListener("mouseenter", () => {
        if (!state.clickDragToken) return;
        const tokenEl = dom.equationDisplay.querySelector(".token-in-flight");
        if (!tokenEl) return;
        const crossesMember = dz.dataset.side !== state.clickDragToken.fromSide;
        updateDragArrow(tokenEl, dz, crossesMember);
      });
      dz.addEventListener("mouseleave", () => {
        if (state.clickDragToken) hideDragArrow();
      });
    });
  }
  function toggleCrossMode(force) {
    state.crossMode = typeof force === "boolean" ? force : !state.crossMode;
    state.crossPicked = [];
    if (dom.btnCross) {
      dom.btnCross.classList.toggle("active", state.crossMode);
      dom.btnCross.setAttribute("aria-pressed", state.crossMode ? "true" : "false");
    }
    if (dom.crossLayer) {
      dom.crossLayer.hidden = !state.crossMode;
    }
    const card = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.toggle("cross-mode", state.crossMode);
    clearCrossMarks();
    if (state.crossMode) {
      showMessage("\u2715/ Semplificazione attiva \u2014 clicca due elementi da eliminare (fattori num./den., termini opposti o stessa grandezza su entrambi i membri).", "info");
    }
  }
  function clearCrossMarks() {
    dom.equationDisplay.querySelectorAll(".cross-marked").forEach((el) => el.classList.remove("cross-marked"));
  }
  function crossPickToken(id, element) {
    if (!state.currentEq || !id) return;
    const already = state.crossPicked.indexOf(id);
    if (already >= 0) {
      state.crossPicked.splice(already, 1);
      if (element) element.classList.remove("cross-marked");
      if (state.crossPicked.length === 0) clearPreview();
      return;
    }
    state.crossPicked.push(id);
    if (element) element.classList.add("cross-marked");
    if (state.crossPicked.length < 2) {
      showMessage("Primo elemento selezionato \u2014 ora scegli il secondo da semplificare.", "info");
      return;
    }
    const [idA, idB] = state.crossPicked;
    const res = crossCancel(state.currentEq, idA, idB);
    if (!res.ok) {
      state.crossPicked = [];
      clearCrossMarks();
      flashCrossError();
      showInvalidMove(res.error, res.hint, { label: "Semplificazione" });
      return;
    }
    dissolveThenApplyCross(idA, idB, res);
  }
  function spawnVariableExplosion(el, colorScheme = "neon") {
    const layer = dom.crossDissolveLayer;
    if (!el || !layer) return;
    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const cx = rect.left + rect.width / 2 - layerRect.left;
    const cy = rect.top + rect.height / 2 - layerRect.top;
    const shockwave = document.createElement("div");
    shockwave.className = "explosion-shockwave";
    shockwave.style.left = `${cx}px`;
    shockwave.style.top = `${cy}px`;
    layer.appendChild(shockwave);
    const palette = colorScheme === "gold" ? ["#fbbf24", "#f59e0b", "#fb7185", "#38bdf8", "#ffffff"] : ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#34d399", "#fbbf24"];
    const symbols = ["\u2726", "\u2605", "\u25CF", "\u2726", "\u25B2", "\u25C6", "\u2728"];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "explosion-particle";
      const angle = i / count * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const distance = 28 + Math.random() * 42;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const color = palette[i % palette.length];
      const size = 11 + Math.random() * 9;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.color = color;
      p.style.fontSize = `${size}px`;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      layer.appendChild(p);
    }
    setTimeout(() => {
      shockwave.remove();
      layer.querySelectorAll(".explosion-particle").forEach((p) => p.remove());
    }, 750);
  }
  function spawnVictoryConfetti() {
    const layer = dom.crossDissolveLayer;
    if (!layer) return;
    const layerRect = layer.getBoundingClientRect();
    const width = layerRect.width || 600;
    const height = layerRect.height || 200;
    const colors = ["#38bdf8", "#ec4899", "#a855f7", "#fbbf24", "#10b981", "#6366f1"];
    const symbols = ["\u2605", "\u2726", "\u{1F389}", "\u2728", "\u25C6", "\u25CF"];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement("div");
      p.className = "explosion-particle victory-particle";
      const startX = Math.random() * width;
      const startY = height * 0.2 + Math.random() * (height * 0.6);
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const distance = 40 + Math.random() * 85;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${startX}px`;
      p.style.top = `${startY}px`;
      p.style.color = color;
      p.style.fontSize = `${12 + Math.random() * 12}px`;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      layer.appendChild(p);
    }
    setTimeout(() => {
      layer.querySelectorAll(".victory-particle").forEach((p) => p.remove());
    }, 950);
  }
  function findCancellableDomElements(action) {
    if (!dom.equationDisplay || !action) return [];
    if (action.ruleKey !== "cancelFactor" && action.id !== "cancel-factor") return [];
    let denText = "";
    try {
      const ctx = action.build ? action.build({}) : {};
      denText = (ctx.denText || "").trim();
    } catch {
    }
    if (!denText) return [];
    const found = [];
    dom.equationDisplay.querySelectorAll(".math-node").forEach((el) => {
      const txt = (el.textContent || "").trim();
      if (txt === denText || el.dataset.varName === denText) {
        found.push(el);
      }
    });
    return found;
  }
  function dissolveThenApplyCross(idA, idB, res) {
    clearCrossMarks();
    clearPreview();
    playSoundExplosion();
    const elA = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idA)}"]`);
    const elB = dom.equationDisplay.querySelector(`[data-id="${CSS.escape(idB)}"]`);
    [elA, elB].forEach((el) => {
      if (el) {
        el.classList.add("cross-dissolving", "var-exploding");
        spawnVariableExplosion(el);
      }
    });
    setTimeout(() => {
      state.currentEq = res.newEq;
      state.conditions = mergeConditions(state.conditions, res.conditions || []);
      state.selectedId = null;
      state.crossPicked = [];
      pushHistory({
        equation: clone(res.newEq),
        ruleName: res.ruleName,
        rulePrinciple: res.rulePrinciple,
        ruleId: "cross-cancel",
        steps: [`Elimino "${res.cancelled}" (semplificazione).`],
        conditions: (res.conditions || []).slice(),
        explanationKey: null,
        note: null,
        verified: true
      }, false);
      updateObjective();
      renderEquationView();
      showRulePanel(
        { name: res.ruleName, principle: res.rulePrinciple, explanation: null },
        { steps: [`Elimino ${res.cancelled}.`], conditions: res.conditions || [] },
        res.newEq
      );
      clearMessage();
      showMessage(`\u2713 ${res.ruleName}.`, "success");
      toggleCrossMode(false);
      if (state.goalReached) {
        if (checkAndAnimateCompoundFraction()) return;
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
      } else if (state.mode === "auto") {
        showAutoMode();
      }
    }, 460);
  }
  function flashCrossError() {
    const card = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
    if (!card) return;
    card.classList.remove("cross-error");
    void card.offsetWidth;
    card.classList.add("cross-error");
    setTimeout(() => card.classList.remove("cross-error"), 500);
  }
  function bindCrossDrag() {
    const handle = dom.crossHandle;
    if (!handle) return;
    let dragging = false;
    const tokenUnder = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const node = el.closest(".math-node");
      if (!node || !dom.equationDisplay.contains(node)) return null;
      return node;
    };
    const moveHandle = (x, y) => {
      const card = handle.closest(".cross-layer");
      const host = card || handle.parentElement;
      const rect = host.getBoundingClientRect();
      handle.style.left = `${x - rect.left}px`;
      handle.style.top = `${y - rect.top}px`;
    };
    const highlight = (node) => {
      dom.equationDisplay.querySelectorAll(".cross-hover").forEach((el) => el.classList.remove("cross-hover"));
      if (node && !node.classList.contains("cross-marked")) node.classList.add("cross-hover");
    };
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = true;
      handle.classList.add("dragging");
      handle.setPointerCapture(e.pointerId);
      moveHandle(e.clientX, e.clientY);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moveHandle(e.clientX, e.clientY);
      highlight(tokenUnder(e.clientX, e.clientY));
    });
    const finish = (e) => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("dragging");
      highlight(null);
      const node = tokenUnder(e.clientX, e.clientY);
      if (node) crossPickToken(node.dataset.id, node);
      handle.style.left = "";
      handle.style.top = "";
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", () => {
      dragging = false;
      handle.classList.remove("dragging");
      highlight(null);
      handle.style.left = "";
      handle.style.top = "";
    });
    handle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showMessage("Usa Tab per raggiungere un fattore e Invio per sceglierlo.", "info");
      }
    });
  }
  function applyDragResult(result, meta = {}) {
    if (!result || state.isAnimatingCompoundFraction) return;
    if (!result.ok) {
      clearPreview();
      const card = dom.equationDisplay.closest(".equation-display-card") || dom.equationDisplay;
      card.classList.remove("cross-error");
      void card.offsetWidth;
      card.classList.add("cross-error");
      setTimeout(() => card.classList.remove("cross-error"), 500);
      showInvalidMove(result.error, "Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.", { label: result.ruleName || "Trasporto" });
      return;
    }
    if (meta.sourceRect && meta.targetRect && meta.tokenText) {
      animateTokenTravel(meta.sourceRect, meta.targetRect, meta.tokenText, () => {
        finalizeDragResult(result, meta);
      });
    } else {
      finalizeDragResult(result, meta);
    }
  }
  function finalizeDragResult(result, meta = {}) {
    if (result.principle === "first") playSoundTransport();
    else playSoundFraction();
    dismissDidacticBubble();
    clearPreview();
    const nextEq = result.newEq;
    state.conditions = mergeConditions(state.conditions, result.conditions || []);
    state.selectedId = null;
    const pseudoRule = {
      name: result.ruleName,
      principle: result.rulePrinciple,
      explanation: null
    };
    const pseudoResult = {
      equation: nextEq,
      rule: pseudoRule,
      steps: result.steps || [],
      conditions: result.conditions || []
    };
    const isTargetIsolatedOnRight = isolatedSide(nextEq.right, state.targetVar);
    if (isTargetIsolatedOnRight) {
      state.currentEq = nextEq;
      renderEquationView();
      highlightLandedToken(meta.varName, meta.targetSide);
      showRulePanel(pseudoRule, pseudoResult, nextEq);
      showMessage(`\u2713 ${result.ruleName}!`, "success");
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
        if (flipped !== state.currentEq) {
          animateMirrorSwap(state.currentEq, flipped, () => {
            state.currentEq = flipped;
            state.goalReached = true;
            pushHistory({
              equation: clone(flipped),
              ruleName: "Regola dello specchio (scambio membri)",
              rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
              ruleId: "swapSides",
              steps: ["Scambio i due membri per la propriet\xE0 simmetrica: la grandezza cercata \xE8 al primo membro."],
              conditions: state.conditions.slice(),
              explanationKey: "scambioMembri",
              note: null,
              verified: true
            }, false);
            updateObjective();
            renderEquationView();
            if (checkAndAnimateCompoundFraction()) return;
            playSuccessChime();
            spawnVictoryConfetti();
            showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo!`, "success");
          });
        }
      }, 450);
      return;
    }
    state.currentEq = nextEq;
    pushHistory({
      equation: clone(nextEq),
      ruleName: result.ruleName,
      rulePrinciple: result.rulePrinciple,
      ruleId: null,
      steps: result.steps || [],
      conditions: (result.conditions || []).slice(),
      explanationKey: null,
      note: null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    highlightLandedToken(meta.varName, meta.targetSide);
    showRulePanel(pseudoRule, pseudoResult, result.newEq);
    clearMessage();
    showMessage(`\u2713 ${result.ruleName}!`, "success");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function applyReciprocalRule() {
    if (!state.currentEq) return;
    playSoundFraction();
    const eq2 = state.currentEq;
    const res = reciprocalEquation(eq2);
    if (!res.ok) {
      clearPreview();
      renderEquationView();
      showInvalidMove(res.error, res.hint, { label: "Regola dei reciproci" });
      return;
    }
    const newEq = res.newEq;
    if (equivalentEq(newEq, eq2)) {
      showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    state.currentEq = newEq;
    state.selectedId = null;
    clearPreview();
    const rule = {
      id: "reciprocal",
      name: "Regola dei reciproci (inversione dei membri)",
      principle: "Propriet\xE0 dell'inversione: se A = B allora 1/A = 1/B; in una proporzione A/B = C/D si ottiene B/A = D/C.",
      explanation: null
    };
    pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: "reciprocal",
      steps: [`Calcolo il reciproco di entrambi i membri: ${toPretty(eq2, 0)} \u2192 ${toPretty(newEq, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    clearMessage();
    showMessage("\u{1F501} Regola dei reciproci applicata a entrambi i membri!", "success");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function applyDistributeRule() {
    if (!state.currentEq) return;
    const eq2 = state.currentEq;
    const leftDist = canDistribute(eq2.left);
    const rightDist = canDistribute(eq2.right);
    if (!leftDist && !rightDist) {
      showMessage("Non ci sono prodotti con parentesi (somme o differenze) da sviluppare.", "info");
      return;
    }
    let chosenSide = null;
    if (state.selectedId) {
      const selInfo = analyseElementId(state.selectedId);
      if (selInfo && selInfo.side) {
        if (selInfo.side === "left" && leftDist) chosenSide = "left";
        if (selInfo.side === "right" && rightDist) chosenSide = "right";
      }
    }
    if (!chosenSide) {
      const targetLeft = hasDistributableSum(eq2.left, state.targetVar);
      const targetRight = hasDistributableSum(eq2.right, state.targetVar);
      if (targetRight && !targetLeft && rightDist) chosenSide = "right";
      else if (targetLeft && !targetRight && leftDist) chosenSide = "left";
      else if (rightDist && !leftDist) chosenSide = "right";
      else if (leftDist && !rightDist) chosenSide = "left";
      else chosenSide = "right";
    }
    playSoundTransport();
    const res = applyRule(RULES.distribute, eq2, { side: chosenSide });
    if (!res.ok) {
      showInvalidMove(res.error, res.hint);
      return;
    }
    state.currentEq = res.equation;
    state.selectedId = null;
    clearPreview();
    const rule = RULES.distribute;
    pushHistory({
      equation: clone(res.equation),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: "distribute",
      steps: [`Sviluppo le parentesi con la propriet\xE0 distributiva al ${chosenSide === "left" ? "primo" : "secondo"} membro: ${toPretty(eq2, 0)} \u2192 ${toPretty(res.equation, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: "distribute",
      note: null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, { steps: ["Sviluppate le parentesi con la propriet\xE0 distributiva"], conditions: [] }, res.equation);
    clearMessage();
    showMessage("\u{1F4E6} Propriet\xE0 distributiva applicata: parentesi sviluppate!", "success");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function applyFactorCommonRule() {
    if (!state.currentEq) return;
    const eq2 = state.currentEq;
    const targetSide = whichSideHas(eq2, state.targetVar) || "right";
    const sidesToCheck = targetSide === "both" ? ["right", "left"] : [targetSide, targetSide === "left" ? "right" : "left"];
    let foundSide = null;
    let commonNode = null;
    for (const s of sidesToCheck) {
      const member = s === "left" ? eq2.left : eq2.right;
      const common = findCommonFactor(member, state.targetVar);
      if (common) {
        foundSide = s;
        commonNode = common;
        break;
      }
    }
    if (!commonNode) {
      for (const s of sidesToCheck) {
        const member = s === "left" ? eq2.left : eq2.right;
        const common = findCommonFactor(member, null);
        if (common) {
          foundSide = s;
          commonNode = common;
          break;
        }
      }
    }
    if (!commonNode) {
      const member = targetSide === "left" ? eq2.left : eq2.right;
      if (hasTrigConflict(member, state.targetVar)) {
        showMessage(`\u26A0\uFE0F Non \xE8 possibile raccogliere ${prettyVar(state.targetVar)} a fattor comune: ${prettyVar(state.targetVar)} \xE8 l'argomento di funzioni trigonometriche distinte (sin e cos), non un fattore moltiplicativo.`, "warning");
        return;
      }
      showMessage("Nessun fattore comune trovato da raccogliere tra tutti i termini del membro.", "info");
      return;
    }
    playSoundTransport();
    const commonText = toPretty(commonNode, 0);
    const res = applyRule(RULES.factorCommon, eq2, { side: foundSide, common: commonNode, commonText });
    if (!res.ok) {
      showInvalidMove(res.error, res.hint);
      return;
    }
    state.currentEq = res.equation;
    state.selectedId = null;
    clearPreview();
    const rule = RULES.factorCommon;
    pushHistory({
      equation: clone(res.equation),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: "factorCommon",
      steps: [`Raccolgo ${commonText} a fattor comune al ${foundSide === "left" ? "primo" : "secondo"} membro: ${toPretty(eq2, 0)} \u2192 ${toPretty(res.equation, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, { steps: [`Raccolto ${commonText} a fattor comune`], conditions: [] }, res.equation);
    clearMessage();
    showMessage(`\u{1F9E9} Raccoglimento a fattor comune applicato: ${commonText} messo in evidenza!`, "success");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function applyCommonDenominatorRule() {
    if (!state.currentEq) return;
    const eq2 = state.currentEq;
    let chosenSide = null;
    if (state.selectedId) {
      const selInfo = analyseElementId(state.selectedId);
      if (selInfo && selInfo.side) chosenSide = selInfo.side;
    }
    const res = reduceEquationToCommonDenominator(eq2, chosenSide);
    if (!res.ok) {
      showInvalidMove(res.error, res.hint, { label: "Minimo comune multiplo (m.c.m.)" });
      return;
    }
    const newEq = res.newEq;
    if (equivalentEq(newEq, eq2)) {
      showMessage("L'equazione \xE8 gi\xE0 espressa a denominatore comune.", "info");
      return;
    }
    playSoundFraction();
    if (dom.equationDisplay) {
      dom.equationDisplay.classList.add("sign-flip-pulse");
      setTimeout(() => {
        if (dom.equationDisplay) dom.equationDisplay.classList.remove("sign-flip-pulse");
      }, 450);
    }
    state.currentEq = newEq;
    state.selectedId = null;
    clearPreview();
    const rule = RULES.commonDenom;
    pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: "common-denom",
      steps: res.steps,
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true
    }, false);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, { steps: res.steps, conditions: [] }, newEq);
    clearMessage();
    showMessage("\u{1F9EE} Frazioni ridotte a denominatore comune (m.c.m.) in un'unica frazione!", "success");
    if (state.targetVar && isolatedSide(newEq.right, state.targetVar) && !collectVars(newEq.left).has(state.targetVar)) {
      const swapped = Eq(newEq.right, newEq.left);
      setTimeout(() => {
        animateMirrorSwap(newEq, swapped, () => {
          state.currentEq = swapped;
          renderEquationView();
          updateObjective();
        });
      }, 200);
    }
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function applyChangeSignRule() {
    if (!state.currentEq) return;
    playSoundTransport();
    const eq2 = state.currentEq;
    const newEq = Eq(negateExpr(eq2.left), negateExpr(eq2.right));
    state.currentEq = newEq;
    state.selectedId = null;
    clearPreview();
    const rule = {
      id: "changeSign",
      name: "Regola del cambio di segno",
      principle: "Secondo principio di equivalenza: moltiplicando entrambi i membri per \u22121, tutti i segni si invertono (+ \u2194 \u2212).",
      explanation: null
    };
    pushHistory({
      equation: clone(newEq),
      ruleName: rule.name,
      rulePrinciple: rule.principle,
      ruleId: "changeSign",
      steps: [`Moltiplico entrambi i membri per \u22121: ${toPretty(eq2, 0)} \u2192 ${toPretty(newEq, 0)}.`],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: null,
      verified: true
    }, false);
    const isTargetIsolatedOnRight = isolatedSide(newEq.right, state.targetVar);
    if (isTargetIsolatedOnRight) {
      renderEquationView();
      flashSignChanged();
      showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
      clearMessage();
      showMessage(`\xB1 Cambio segno applicato: ${prettyVar(state.targetVar)} \xE8 ora positivo!`, "info");
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
        if (flipped !== state.currentEq) {
          animateMirrorSwap(state.currentEq, flipped, () => {
            state.currentEq = flipped;
            state.goalReached = true;
            pushHistory({
              equation: clone(flipped),
              ruleName: "Regola dello specchio (scambio membri)",
              rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
              ruleId: "swapSides",
              steps: ["Scambio i due membri per la propriet\xE0 simmetrica: la grandezza cercata \xE8 al primo membro."],
              conditions: state.conditions.slice(),
              explanationKey: "scambioMembri",
              note: null,
              verified: true
            }, false);
            updateObjective();
            renderEquationView();
            showRulePanel({
              id: "swapSides",
              name: "Regola dello specchio (scambio membri)",
              principle: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A."
            }, { steps: ["Scambio i due membri dell'equazione per la propriet\xE0 simmetrica."], conditions: [] }, flipped);
            if (checkAndAnimateCompoundFraction()) return;
            playSuccessChime();
            spawnVictoryConfetti();
            showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
          });
        } else {
          updateObjective();
          renderEquationView();
        }
      }, 450);
      return;
    }
    updateObjective();
    renderEquationView();
    flashSignChanged();
    showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    clearMessage();
    showMessage("\xB1 Regola del cambio di segno applicata: tutti i segni invertiti!", "success");
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function renderConditions() {
    if (!state.conditions || state.conditions.length === 0) {
      dom.conditionsBox.hidden = true;
      return;
    }
    dom.conditionsBox.hidden = false;
    dom.conditionsList.innerHTML = state.conditions.map((c) => `<li>${escapeHtml3(c)}</li>`).join("");
  }
  function selectElement(id) {
    if (!state.currentEq) return;
    state.selectedId = id;
    clearPreview();
    renderEquationView();
    const element = findElement(state.currentEq, id);
    if (!element) {
      dom.actionHint.textContent = "Elemento non trovato.";
      dom.actionButtons.innerHTML = "";
      return;
    }
    const actions = availableActions(state.currentEq, element, state.targetVar);
    renderActions(element, actions);
  }
  function renderActions(element, specificActions) {
    dom.actionButtons.innerHTML = "";
    const el = findElement(state.currentEq, state.selectedId);
    dom.actionHint.textContent = `Selezionato: "${el ? el.pretty : ""}" (${roleLabel(el ? el.role : "")}). Operazioni disponibili:`;
    const all = [...specificActions];
    for (const g of globalActions(state.currentEq, state.targetVar)) {
      if (!all.find((a) => a.id === g.id)) all.push(g);
    }
    addValueOps(all, element);
    if (all.length === 0) {
      dom.actionButtons.innerHTML = '<p class="placeholder small">Nessuna operazione diretta su questo elemento. Prova a selezionare un fattore, un termine o un denominatore.</p>';
      return;
    }
    for (const action of all) {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.type = "button";
      btn.innerHTML = `<span class="action-label">${escapeHtml3(action.label)}</span>
      <span class="action-desc">${escapeHtml3(action.description || "")}</span>`;
      btn.addEventListener("click", () => previewAction(action));
      dom.actionButtons.appendChild(btn);
    }
  }
  function addValueOps(actions, element) {
    const node = unwrap(element.node);
    const text = toPretty(node, 0);
    if (node.type === "Var" || node.type === "Div" || node.type === "Mul" || node.type === "Add" || node.type === "Sub" || node.type === "Group") {
      actions.push({
        id: "mul-both",
        label: `Moltiplica entrambi i membri per "${text}"`,
        description: "Secondo principio di equivalenza.",
        ruleKey: "mulBoth",
        build: () => ({ value: node, valueText: text })
      });
      actions.push({
        id: "div-both",
        label: `Dividi entrambi i membri per "${text}" (richiede \u2260 0)`,
        description: "Secondo principio di equivalenza; serve la condizione \u2260 0.",
        ruleKey: "divBoth",
        build: () => ({ value: node, valueText: text })
      });
    }
  }
  function roleLabel(role) {
    const map = {
      membro: "intero membro",
      termine: "termine additivo",
      fattore: "fattore moltiplicativo",
      numeratore: "numeratore",
      denominatore: "denominatore",
      base: "base della potenza",
      esponente: "esponente",
      radicando: "radicando (sotto radice)",
      argomento: "argomento",
      gruppo: "espressione tra parentesi"
    };
    return map[role] || role;
  }
  function previewAction(action) {
    const res = performAction(state.currentEq, action);
    if (!res.ok) {
      showInvalidMove(res.error, res.hint, action);
      return;
    }
    if (equivalentEq(res.equation, state.currentEq)) {
      showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    state.pendingMove = { action, result: res };
    showPreview(action, res);
  }
  function showPreview(action, res) {
    dom.previewBox.hidden = false;
    dom.previewText.innerHTML = `Anteprima: <span class="preview-eq">${escapeHtml3(toPretty(res.equation, 0))}</span> \u2014 regola: <em>${escapeHtml3(action.label)}</em>`;
    dom.btnConfirm.focus();
  }
  function clearPreview() {
    state.pendingMove = null;
    dom.previewBox.hidden = true;
    dom.previewText.innerHTML = "";
  }
  function confirmMove() {
    if (!state.pendingMove) return;
    if (state.pendingMove.kind === "cross") {
      const { idA, idB, result: result2 } = state.pendingMove;
      state.pendingMove = null;
      dissolveThenApplyCross(idA, idB, result2);
      return;
    }
    if (state.pendingMove.kind === "drag") {
      const res = state.pendingMove.result;
      if (!res.ok) {
        clearPreview();
        showInvalidMove(res.error, "Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.", { label: res.ruleName || "Trasporto" });
        return;
      }
      state.currentEq = res.newEq;
      state.conditions = mergeConditions(state.conditions, res.conditions || []);
      state.selectedId = null;
      const pseudoRule = {
        name: res.ruleName,
        principle: res.rulePrinciple,
        explanation: null
      };
      const pseudoResult = {
        equation: res.newEq,
        rule: pseudoRule,
        steps: res.steps || [],
        conditions: res.conditions || []
      };
      pushHistory({
        equation: clone(res.newEq),
        ruleName: res.ruleName,
        rulePrinciple: res.rulePrinciple,
        ruleId: null,
        steps: res.steps || [],
        conditions: (res.conditions || []).slice(),
        explanationKey: null,
        note: null,
        verified: true
      }, false);
      clearPreview();
      updateObjective();
      renderEquationView();
      showRulePanel(pseudoRule, pseudoResult, res.newEq);
      clearMessage();
      if (state.goalReached) {
        if (checkAndAnimateCompoundFraction()) return;
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo!`, "success");
      }
      return;
    }
    const { action, result } = state.pendingMove;
    playSoundForRule(action.ruleKey);
    state.currentEq = result.equation;
    state.conditions = mergeConditions(state.conditions, result.conditions || []);
    state.selectedId = null;
    const rule = result.rule;
    pushHistory({
      equation: clone(result.equation),
      ruleName: rule ? rule.name : action.label,
      rulePrinciple: rule ? rule.principle : "",
      ruleId: rule ? rule.id : action.id,
      steps: result.steps || [],
      conditions: (result.conditions || []).slice(),
      explanationKey: rule ? rule.explanation : null,
      note: result.note || null,
      verified: true
    }, false);
    clearPreview();
    updateObjective();
    renderEquationView();
    showRulePanel(rule, result, state.currentEq);
    clearMessage();
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo!`, "success");
    } else if (state.mode === "auto") {
      showAutoMode();
    }
  }
  function cancelPreview() {
    clearPreview();
    clearCrossMarks();
    state.crossPicked = [];
    renderEquationView();
  }
  function flashTokenRejected(varName, side) {
    if (!varName || !dom.equationDisplay) return;
    const el = dom.equationDisplay.querySelector(`[data-var-name="${CSS.escape(varName)}"][data-side="${side}"]`);
    if (!el) return;
    el.classList.remove("token-rejected");
    void el.offsetWidth;
    el.classList.add("token-rejected");
    setTimeout(() => el.classList.remove("token-rejected"), 600);
  }
  var bubbleTimeout = null;
  function showDidacticBubble({ error, hint, action }) {
    if (!dom.didacticBubbleAnchor) return;
    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
      bubbleTimeout = null;
    }
    const errLow = (error || "").toLowerCase();
    let badgeText = "Principio di Equivalenza";
    let ruleReminder = "Ricorda di applicare correttamente i principi di equivalenza delle equazioni.";
    if (errLow.includes("fa parte di una somma") || errLow.includes("non \xE8 un fattore") || errLow.includes("dividere") || errLow.includes("moltiplicare")) {
      badgeText = "2\xB0 Principio (Fattori e Prodotti)";
      ruleReminder = "Secondo principio: puoi dividere entrambi i membri solo per un fattore che moltiplica l'intero membro!";
    } else if (errLow.includes("additivo") || errLow.includes("trasporto") || errLow.includes("segno") || errLow.includes("trascina la variabile")) {
      badgeText = "1\xB0 Principio (Regola del Trasporto)";
      ruleReminder = "Primo principio: spostando un addendo all'altro membro, esso cambia di segno (+ diventa \u2212, \u2212 diventa +).";
    } else if (errLow.includes("zero") || errLow.includes("\u2260 0")) {
      badgeText = "Condizione di Esistenza (\u2260 0)";
      ruleReminder = "Attenzione: la divisione per zero non \xE8 definita nei numeri reali.";
    }
    if (dom.bubbleBadge) dom.bubbleBadge.textContent = badgeText;
    if (dom.bubbleMessage) dom.bubbleMessage.textContent = error || "Operazione non consentita.";
    if (dom.bubbleHintBox && dom.bubbleHintText) {
      if (hint) {
        dom.bubbleHintText.textContent = hint;
        dom.bubbleHintBox.hidden = false;
      } else {
        dom.bubbleHintBox.hidden = true;
      }
    }
    if (dom.bubbleFooterRule) dom.bubbleFooterRule.textContent = ruleReminder;
    dom.didacticBubbleAnchor.hidden = false;
    if (dom.didacticBubble) dom.didacticBubble.classList.remove("bubble-closing");
    bubbleTimeout = setTimeout(() => {
      dismissDidacticBubble();
    }, 8e3);
  }
  function dismissDidacticBubble() {
    if (!dom.didacticBubbleAnchor || dom.didacticBubbleAnchor.hidden) return;
    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
      bubbleTimeout = null;
    }
    if (dom.didacticBubble) {
      dom.didacticBubble.classList.add("bubble-closing");
      setTimeout(() => {
        if (dom.didacticBubbleAnchor) dom.didacticBubbleAnchor.hidden = true;
        if (dom.didacticBubble) dom.didacticBubble.classList.remove("bubble-closing");
      }, 220);
    } else {
      dom.didacticBubbleAnchor.hidden = true;
    }
  }
  function showInvalidMove(error, hint, action) {
    playSoundInvalid();
    const parts = [];
    parts.push("Mossa non valida: " + error);
    if (hint) parts.push("Suggerimento: " + hint);
    if (action) parts.push("Regola tentata: " + action.label);
    showMessage(parts.join(" "), "error");
    showDidacticBubble({ error, hint, action });
    pushHistory({
      equation: clone(state.currentEq),
      ruleName: "Tentativo non valido",
      rulePrinciple: "",
      steps: [action ? action.label : ""],
      conditions: [],
      explanationKey: null,
      note: error,
      verified: false
    }, false, true);
  }
  function showRulePanel(rule, result, afterEq) {
    const ex = rule ? getExplanation(rule.explanation) : null;
    let html = `<div class="rule-name">\u{1F4DC} ${escapeHtml3(rule ? rule.name : "Trasformazione")}</div>`;
    if (ex) {
      html += `<div class="rule-section"><strong>\u{1F4A1} Spiegazione intuitiva</strong><p>${escapeHtml3(ex.intuitiva)}</p></div>`;
      html += `<div class="rule-section"><strong>\u2696\uFE0F Principio di equivalenza</strong><p>${escapeHtml3(ex.principio)}</p></div>`;
      html += `<div class="rule-section"><strong>\u{1F3AF} Perch\xE9 \xE8 corretta</strong><p>${escapeHtml3(ex.perche)}</p></div>`;
    } else if (rule && rule.principle) {
      html += `<div class="rule-section"><strong>\u2696\uFE0F Principio matematico</strong><p>${escapeHtml3(rule.principle)}</p></div>`;
    }
    if (result.steps && result.steps.length) {
      html += `<div class="rule-section"><strong>\u2699\uFE0F Operazione svolta</strong><ul class="steps-list">${result.steps.map((s) => `<li>${escapeHtml3(s)}</li>`).join("")}</ul></div>`;
    }
    html += `<div class="rule-section rule-eq"><strong>\u{1F4D0} Equazione dopo</strong><div class="rule-math">${renderEquation(afterEq, {})}</div></div>`;
    if (result.conditions && result.conditions.length) {
      html += `<div class="rule-section conditions"><strong>\u{1F50D} Condizioni di validit\xE0 richieste</strong><ul>${result.conditions.map((c) => `<li>${escapeHtml3(c)}</li>`).join("")}</ul></div>`;
    }
    if (ex && ex.attenzione && ex.attenzione.length) {
      html += `<div class="rule-section warning"><strong>\u26A0\uFE0F Attenzione</strong><ul>${ex.attenzione.map((c) => `<li>${escapeHtml3(c)}</li>`).join("")}</ul></div>`;
    }
    if (result.note) {
      html += `<div class="rule-section warning"><p>${escapeHtml3(result.note)}</p></div>`;
    }
    dom.rulePanel.innerHTML = html;
  }
  function updateRulePanelInitial(formulaEntry) {
    dom.rulePanel.innerHTML = `
    <div class="rule-name">Formula di partenza</div>
    <div class="rule-section"><strong>${escapeHtml3(formulaEntry.name)}</strong>
      <div class="rule-math">${renderEquation(state.startEq, {})}</div></div>
    ${formulaEntry.notes ? `<div class="rule-section"><p>${escapeHtml3(formulaEntry.notes)}</p></div>` : ""}
    ${formulaEntry.hypotheses ? `<div class="rule-section"><strong>Ipotesi</strong><p>${escapeHtml3(formulaEntry.hypotheses)}</p></div>` : ""}
    <div class="rule-section"><p>Seleziona un elemento nell'area di lavoro per iniziare a ricavare la formula inversa.</p></div>
  `;
  }
  function cancelCompoundFractionAnimation() {
    if (state.compoundAnimTimers && state.compoundAnimTimers.length) {
      for (const t of state.compoundAnimTimers) clearTimeout(t);
      state.compoundAnimTimers = [];
    }
    state.isAnimatingCompoundFraction = false;
    if (dom.equationDisplay) {
      dom.equationDisplay.classList.remove("compound-anim-step1", "compound-anim-step2", "compound-anim-step3");
    }
    if (dom.compoundFractionBanner) {
      dom.compoundFractionBanner.hidden = true;
    }
  }
  function checkAndAnimateCompoundFraction(onComplete) {
    if (state.isAnimatingCompoundFraction) return false;
    if (!state.currentEq || !state.targetVar) return false;
    if (!isGoalReached(state.currentEq, state.targetVar)) return false;
    const steps = getCompoundFractionSteps(state.currentEq, state.targetVar);
    if (!steps) return false;
    startCompoundFractionAnimation(steps, onComplete);
    return true;
  }
  function startCompoundFractionAnimation(steps, onComplete) {
    cancelCompoundFractionAnimation();
    state.isAnimatingCompoundFraction = true;
    if (dom.completionBanner) dom.completionBanner.hidden = true;
    if (dom.compoundFractionBanner) {
      dom.compoundFractionBanner.hidden = false;
      if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = "Passaggio 1 di 2";
      if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = "Frazione di frazione rilevata";
      if (dom.compoundFractionMsg) {
        dom.compoundFractionMsg.textContent = "La formula presenta una frazione al denominatore. Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa).";
      }
    }
    if (dom.equationDisplay) {
      dom.equationDisplay.classList.remove("compound-anim-step2", "compound-anim-step3");
      dom.equationDisplay.classList.add("compound-anim-step1");
    }
    state.currentEq = steps.step1Eq;
    renderEquationView();
    updateObjective();
    const t1 = setTimeout(() => {
      if (!state.isAnimatingCompoundFraction) return;
      playSoundFraction();
      state.currentEq = steps.step2Eq;
      renderEquationView();
      if (dom.compoundFractionBanner) {
        if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = "Passaggio 2 di 2";
        if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = "Inversione del denominatore";
        if (dom.compoundFractionMsg) {
          dom.compoundFractionMsg.textContent = "Moltiplichiamo il numeratore per la frazione reciproca del denominatore: la frazione si capovolge.";
        }
      }
      if (dom.equationDisplay) {
        dom.equationDisplay.classList.remove("compound-anim-step1");
        dom.equationDisplay.classList.add("compound-anim-step2");
      }
      const t2 = setTimeout(() => {
        if (!state.isAnimatingCompoundFraction) return;
        playSuccessChime();
        spawnVictoryConfetti();
        state.currentEq = steps.step3Eq;
        state.isAnimatingCompoundFraction = false;
        renderEquationView();
        const rule = {
          name: "Semplificazione frazione di frazione",
          principle: "Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa): a / (b/c) = (a \xB7 c) / b.",
          explanation: null
        };
        pushHistory({
          equation: clone(steps.step3Eq),
          ruleName: rule.name,
          rulePrinciple: rule.principle,
          ruleId: "compound_frac_simplify",
          steps: [
            `Frazione di frazione rilevata: ${steps.step1Pretty}`,
            `Moltiplicazione per la reciproca: ${steps.step2Pretty}`,
            `Frazione normale semplificata: ${steps.step3Pretty}`
          ],
          conditions: (state.conditions || []).slice(),
          explanationKey: null,
          note: "Semplificazione automatica frazione di frazione",
          verified: true
        }, false);
        if (dom.compoundFractionBanner) {
          if (dom.compoundFractionStepBadge) dom.compoundFractionStepBadge.textContent = "Completato \u2713";
          if (dom.compoundFractionTitle) dom.compoundFractionTitle.textContent = "Frazione normale ottenuta!";
          if (dom.compoundFractionMsg) {
            dom.compoundFractionMsg.textContent = `Formula finale semplificata: ${steps.step3Pretty}.`;
          }
        }
        if (dom.equationDisplay) {
          dom.equationDisplay.classList.remove("compound-anim-step2");
          dom.equationDisplay.classList.add("compound-anim-step3");
        }
        updateObjective();
        showMessage(`\u{1F389} Frazione di frazione semplificata! Formula inversa finale ricavata con successo.`, "success");
        const t3 = setTimeout(() => {
          if (dom.compoundFractionBanner) dom.compoundFractionBanner.hidden = true;
          if (dom.equationDisplay) dom.equationDisplay.classList.remove("compound-anim-step3");
          if (typeof onComplete === "function") onComplete();
        }, 3200);
        state.compoundAnimTimers.push(t3);
      }, 2500);
      state.compoundAnimTimers.push(t2);
    }, 2200);
    state.compoundAnimTimers.push(t1);
  }
  function updateObjective() {
    const f = state.baseFormula;
    const t = prettyVar(state.targetVar);
    dom.objectiveText.textContent = f ? `ricavare ${t} \u2014 ${f.name} (${f.formula})` : `ricavare ${t}`;
    state.goalReached = isGoalReached(state.currentEq, state.targetVar);
    if (!_isMirrorSwapping && state.goalReached && state.currentEq && state.currentEq.type === "Eq") {
      const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
      if (flipped !== state.currentEq) {
        state.currentEq = flipped;
        if (dom.equationDisplay) {
          dom.equationDisplay.innerHTML = renderEquation(state.currentEq, {
            selectedId: state.selectedId,
            targetVar: state.targetVar,
            interactive: true,
            showImplicitDen: state.showImplicitDen
          });
          if (dom.latexLiveCode) dom.latexLiveCode.textContent = toLatex(state.currentEq);
        }
      }
    }
    const resSide = state.currentEq && state.currentEq.type === "Eq" ? isolatedSide(state.currentEq.left, state.targetVar) ? state.currentEq.right : isolatedSide(state.currentEq.right, state.targetVar) ? state.currentEq.left : null : null;
    const hasCompound = hasCompoundFraction(resSide);
    const isFullySolved = state.goalReached && !hasCompound && !state.isAnimatingCompoundFraction;
    dom.objectiveStatus.hidden = false;
    if (state.isAnimatingCompoundFraction) {
      dom.objectiveStatus.textContent = "\u26A1 Semplificazione...";
      dom.objectiveStatus.className = "status-badge status-progress";
      dom.objectiveBox.classList.remove("objective-done");
    } else {
      dom.objectiveStatus.textContent = isFullySolved ? "\u2713 Raggiunto" : "\u25CF In corso";
      dom.objectiveStatus.className = "status-badge " + (isFullySolved ? "status-success" : "status-progress");
      dom.objectiveBox.classList.toggle("objective-done", isFullySolved);
    }
    if (dom.btnRetryExercise) dom.btnRetryExercise.hidden = !state.startEq;
    if (dom.completionBanner) {
      dom.completionBanner.hidden = !isFullySolved;
      if (isFullySolved) {
        if (dom.completionTitle) dom.completionTitle.textContent = `\u{1F3C6} Ottimo lavoro! Hai isolato ${t}`;
        if (dom.completionSubtitle) {
          dom.completionSubtitle.textContent = `Formula inversa ricavata con successo: ${toPretty(state.currentEq, 0)}.`;
        }
      }
    }
    if (dom.objectiveTargetPicker && f && f.isolate) {
      dom.objectiveTargetPicker.hidden = false;
      dom.targetChips.innerHTML = "";
      f.isolate.forEach((v) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "target-chip" + (v === state.targetVar ? " active" : "");
        chip.textContent = prettyVar(v);
        chip.title = `Imposta come obiettivo: isola ${prettyVar(v)}`;
        chip.addEventListener("click", () => setTargetVar(v));
        dom.targetChips.appendChild(chip);
      });
    } else if (dom.objectiveTargetPicker) {
      dom.objectiveTargetPicker.hidden = true;
    }
    updateNumericalCalculator();
  }
  function setTargetVar(v) {
    state.targetVar = v;
    dismissDidacticBubble();
    updateObjective();
    renderEquationView();
    clearMessage();
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(v)} \xE8 gi\xE0 isolata!`, "success");
    } else {
      showMessage(`\u{1F3AF} Nuovo obiettivo impostato: isolare ${prettyVar(v)}.`, "info");
    }
  }
  function getSolvedExpression() {
    if (!state.currentEq || !state.targetVar) return null;
    const leftRaw = unwrap(state.currentEq.left);
    const rightRaw = unwrap(state.currentEq.right);
    if (isVar(leftRaw) && leftRaw.name === state.targetVar) {
      return rightRaw;
    }
    if (isVar(rightRaw) && rightRaw.name === state.targetVar) {
      return leftRaw;
    }
    return null;
  }
  function updateNumericalCalculator() {
    if (!dom.numericalCalcCard) return;
    if (!state.goalReached) {
      dom.numericalCalcCard.hidden = true;
      return;
    }
    const solvedExpr = getSolvedExpression();
    if (!solvedExpr) {
      dom.numericalCalcCard.hidden = true;
      return;
    }
    dom.numericalCalcCard.hidden = false;
    const targetInfo = getQuantityInfo(state.targetVar, state.baseFormula);
    if (dom.calcTargetVar) dom.calcTargetVar.textContent = prettyVar(state.targetVar);
    if (dom.calcFinalUnit) dom.calcFinalUnit.textContent = targetInfo.unit;
    const freeVars = Array.from(collectVars(solvedExpr)).filter(
      (v) => v !== state.targetVar && v !== "pi" && v !== "\u03C0" && v !== "e"
    );
    renderCalculatorInputs(freeVars, solvedExpr);
  }
  function renderCalculatorInputs(freeVars, solvedExpr) {
    if (!dom.calcInputsGrid) return;
    dom.calcInputsGrid.innerHTML = "";
    if (freeVars.length === 0) {
      const evalRes = evalWithEnv(solvedExpr, {});
      const valStr = evalRes.ok ? formatResultNumber(evalRes.value) : "\u2014";
      if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = valStr;
      if (dom.calcStepFormula) dom.calcStepFormula.textContent = `${prettyVar(state.targetVar)} = ${valStr}`;
      return;
    }
    freeVars.forEach((v) => {
      const qInfo = getQuantityInfo(v, state.baseFormula);
      const item = document.createElement("div");
      item.className = "calc-input-item";
      item.innerHTML = `
      <div class="calc-input-meta">
        <span class="calc-input-symbol">${prettyVar(v)}</span>
        <span class="calc-input-label" title="${escapeHtml3(qInfo.name)}">${escapeHtml3(qInfo.name)}</span>
      </div>
      <div class="calc-input-row">
        <input type="number" step="any" class="calc-num-input" data-var="${escapeHtml3(v)}" placeholder="0" />
        <span class="calc-unit-badge">${escapeHtml3(qInfo.unit)}</span>
      </div>
    `;
      const input = item.querySelector(".calc-num-input");
      input.addEventListener("input", () => runNumericalCalculation(solvedExpr));
      dom.calcInputsGrid.appendChild(item);
    });
    populateCalculatorSamples(freeVars, solvedExpr);
  }
  function populateCalculatorSamples(freeVars, solvedExpr) {
    if (!dom.calcInputsGrid) return;
    const inputs = dom.calcInputsGrid.querySelectorAll(".calc-num-input");
    inputs.forEach((input) => {
      const v = input.dataset.var;
      const qInfo = getQuantityInfo(v, state.baseFormula);
      input.value = qInfo.sample !== void 0 ? qInfo.sample : 1;
    });
    runNumericalCalculation(solvedExpr);
  }
  function resetCalculatorInputs(solvedExpr) {
    if (!dom.calcInputsGrid) return;
    const inputs = dom.calcInputsGrid.querySelectorAll(".calc-num-input");
    inputs.forEach((input) => {
      input.value = "";
    });
    runNumericalCalculation(solvedExpr);
  }
  function runNumericalCalculation(solvedExpr) {
    if (!dom.calcInputsGrid) return;
    const inputs = dom.calcInputsGrid.querySelectorAll(".calc-num-input");
    const env = {};
    let anyEmpty = false;
    inputs.forEach((input) => {
      const v = input.dataset.var;
      const val = input.value.trim();
      if (val === "") {
        anyEmpty = true;
      } else {
        env[v] = parseFloat(val);
      }
    });
    const targetInfo = getQuantityInfo(state.targetVar, state.baseFormula);
    if (anyEmpty) {
      if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = "\u2014";
      if (dom.calcStepFormula) dom.calcStepFormula.textContent = "Inserisci tutte le grandezze per visualizzare il calcolo numerico.";
      if (dom.calcErrorNotice) dom.calcErrorNotice.hidden = true;
      return;
    }
    const evalRes = evalWithEnv(solvedExpr, env);
    if (evalRes.ok) {
      const formatted = formatResultNumber(evalRes.value);
      if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = formatted;
      if (dom.calcErrorNotice) dom.calcErrorNotice.hidden = true;
      try {
        const substitutedAst = substituteVarsInAst(solvedExpr, env);
        const substitutedHtml = renderNode(substitutedAst, "calc-step", { interactive: false });
        if (dom.calcStepFormula) {
          dom.calcStepFormula.innerHTML = `
          <span class="calc-step-var">${prettyVar(state.targetVar)}</span>
          <span class="calc-step-eq">=</span>
          <span class="calc-step-expr">${substitutedHtml}</span>
          <span class="calc-step-eq">=</span>
          <strong>${formatted}</strong>
          <span class="calc-step-unit">${targetInfo.unit}</span>
        `;
        }
      } catch {
        if (dom.calcStepFormula) {
          dom.calcStepFormula.textContent = `${prettyVar(state.targetVar)} = ${formatted} ${targetInfo.unit}`;
        }
      }
    } else {
      if (dom.calcFinalNumber) dom.calcFinalNumber.textContent = "Non calcolabile";
      if (dom.calcErrorNotice) {
        dom.calcErrorNotice.textContent = `\u26A0\uFE0F Impossibile completare il calcolo: ${evalRes.error || "Errore nei valori numerici"}`;
        dom.calcErrorNotice.hidden = false;
      }
      if (dom.calcStepFormula) dom.calcStepFormula.textContent = "Verifica i valori inseriti.";
    }
  }
  function copyCalculatorResult() {
    const val = dom.calcFinalNumber ? dom.calcFinalNumber.textContent.trim() : "";
    const unit = dom.calcFinalUnit ? dom.calcFinalUnit.textContent.trim() : "";
    const target = prettyVar(state.targetVar);
    if (!val || val === "\u2014" || val === "Non calcolabile") {
      showMessage("Nessun valore valido da copiare.", "warning");
      return;
    }
    const text = `${target} = ${val} ${unit}`;
    navigator.clipboard.writeText(text).then(() => {
      const oldText = dom.btnCopyCalcResult.textContent;
      dom.btnCopyCalcResult.textContent = "\u2713 Copiato!";
      setTimeout(() => {
        if (dom.btnCopyCalcResult) dom.btnCopyCalcResult.textContent = oldText;
      }, 1800);
      showMessage(`Copiato negli appunti: ${text}`, "success");
    }).catch(() => {
      showMessage(`Risultato: ${text}`, "info");
    });
  }
  function pushHistory(entry, isInitial = false, isFailed = false) {
    if (!isInitial && state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    entry.timestamp = Date.now();
    entry.failed = !!isFailed;
    state.history.push(entry);
    state.historyIndex = state.history.length - 1;
    renderHistory();
    updateHistoryButtons();
  }
  function renderHistory() {
    if (state.history.length === 0) {
      dom.historyList.innerHTML = '<li class="history-empty">Nessun passaggio registrato.</li>';
      return;
    }
    dom.historyList.innerHTML = "";
    state.history.forEach((h, i) => {
      const li = document.createElement("li");
      li.className = "history-item";
      if (i === state.historyIndex) li.classList.add("current");
      if (h.failed) li.classList.add("failed");
      if (i > state.historyIndex) li.classList.add("future");
      li.innerHTML = `
      <div class="history-head">
        <span class="history-step">${h.failed ? "\u2717" : i === 0 ? "0" : i}</span> <span class="history-rule">${escapeHtml3(h.ruleName)}</span>
      </div>
      <div class="history-eq">${renderEquation(h.equation, {})}</div>
      ${h.conditions && h.conditions.length ? `<div class="history-cond">Condizioni: ${h.conditions.map(escapeHtml3).join("; ")}</div>` : ""}
      ${h.note ? `<div class="history-note">${escapeHtml3(h.note)}</div>` : ""}
      <div class="history-status">${h.verified ? "\u2713 controllo matematico superato" : "\u2717 mossa rifiutata"}</div>
    `;
      li.addEventListener("click", () => goToHistory(i));
      li.tabIndex = 0;
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter") goToHistory(i);
      });
      dom.historyList.appendChild(li);
    });
    const cur = dom.historyList.querySelector(".current");
    if (cur && dom.historyList) {
      const top = cur.offsetTop - dom.historyList.offsetTop;
      dom.historyList.scrollTop = Math.max(0, top);
    }
  }
  function goToHistory(i) {
    cancelCompoundFractionAnimation();
    if (i < 0 || i >= state.history.length) return;
    if (state.history[i].failed) {
      showMessage("Questo \xE8 un tentativo non valido: l'equazione non \xE8 cambiata.", "info");
      return;
    }
    state.historyIndex = i;
    state.currentEq = clone(state.history[i].equation);
    state.conditions = collectConditionsUpTo(i);
    state.selectedId = null;
    clearPreview();
    updateObjective();
    renderEquationView();
    renderHistory();
    updateHistoryButtons();
    if (i > 0) {
      const h = state.history[i];
      const rule = h.ruleId ? Object.values(RULES).find((r) => r.id === h.ruleId) : null;
      showRulePanel(rule || { name: h.ruleName, principle: h.rulePrinciple }, { steps: h.steps, conditions: h.conditions, note: h.note }, state.currentEq);
    } else {
      updateRulePanelInitial(state.baseFormula);
    }
  }
  function collectConditionsUpTo(i) {
    const set = new Set(state.baseFormula && state.baseFormula.conditions ? state.baseFormula.conditions : []);
    for (let k = 0; k <= i; k++) {
      if (state.history[k].failed) continue;
      for (const c of state.history[k].conditions || []) set.add(c);
    }
    return Array.from(set);
  }
  function bindHistoryEvents() {
    dom.btnUndo.addEventListener("click", undo);
    dom.btnRedo.addEventListener("click", redo);
    dom.btnReset.addEventListener("click", resetExercise);
    if (dom.btnCopySteps) dom.btnCopySteps.addEventListener("click", copyStepsText);
    if (dom.btnCopyStepsLatex) dom.btnCopyStepsLatex.addEventListener("click", copyStepsLatex);
  }
  function undo() {
    let i = state.historyIndex - 1;
    while (i >= 0 && state.history[i].failed) i--;
    if (i < 0) {
      showMessage("Non ci sono trasformazioni da annullare.", "info");
      return;
    }
    goToHistory(i);
  }
  function redo() {
    let i = state.historyIndex + 1;
    while (i < state.history.length && state.history[i].failed) i++;
    if (i >= state.history.length) {
      showMessage("Non ci sono trasformazioni da ripristinare.", "info");
      return;
    }
    goToHistory(i);
  }
  function resetExercise() {
    cancelCompoundFractionAnimation();
    if (!state.startEq) return;
    playSoundClick();
    dismissDidacticBubble();
    clearSelection();
    clearPreview();
    if (state.baseFormula && state.targetVar) {
      loadFormula(state.baseFormula, state.targetVar);
      showMessage("Esercizio ricominciato dall'inizio.", "info");
      return;
    }
    state.history = [];
    state.historyIndex = -1;
    state.currentEq = clone(state.startEq);
    state.conditions = (state.baseFormula && state.baseFormula.conditions ? state.baseFormula.conditions : state.conditions || []).slice();
    state.selectedId = null;
    pushHistory({
      equation: clone(state.startEq),
      ruleName: "Formula di partenza",
      rulePrinciple: state.baseFormula ? state.baseFormula.formula : toPretty(state.startEq, 0),
      steps: [],
      conditions: state.conditions.slice(),
      explanationKey: null,
      note: state.baseFormula && state.baseFormula.hypotheses || null,
      verified: true
    }, true);
    updateObjective();
    renderEquationView();
    if (state.baseFormula) updateRulePanelInitial(state.baseFormula);
    clearMessage();
    showMessage("Esercizio ricominciato dall'inizio.", "info");
  }
  function updateHistoryButtons() {
    let prev = state.historyIndex - 1;
    while (prev >= 0 && state.history[prev].failed) prev--;
    let next = state.historyIndex + 1;
    while (next < state.history.length && state.history[next].failed) next++;
    dom.btnUndo.disabled = prev < 0;
    dom.btnRedo.disabled = next >= state.history.length;
  }
  function showMessage(text, kind) {
    dom.messageBox.hidden = false;
    dom.messageBox.textContent = text;
    dom.messageBox.className = "message-box message-" + (kind || "info");
  }
  function clearMessage() {
    dom.messageBox.hidden = true;
    dom.messageBox.textContent = "";
    dom.messageBox.className = "message-box";
  }
  function clearSelection() {
    state.selectedId = null;
    if (dom.actionButtons && state.mode === "free") dom.actionButtons.innerHTML = "";
    if (dom.actionHint && state.mode === "free") {
      dom.actionHint.textContent = "Seleziona un elemento dell'equazione per vedere le operazioni disponibili.";
    }
  }
  function retryCurrentExercise() {
    cancelCompoundFractionAnimation();
    playSoundClick();
    dismissDidacticBubble();
    clearSelection();
    clearPreview();
    if (state.baseFormula && state.targetVar) {
      loadFormula(state.baseFormula, state.targetVar);
      showMessage(`\u{1F504} Esercizio riavviato! Riprova a ricavare ${prettyVar(state.targetVar)}.`, "info");
    } else if (state.startEq && state.targetVar) {
      loadFormula({
        id: "custom-" + Date.now(),
        topic: "formula personalizzata",
        name: "formula personalizzata",
        formula: toPretty(state.startEq, 0),
        isolate: [state.targetVar],
        conditions: state.conditions ? state.conditions.slice() : [],
        difficulty: 3
      }, state.targetVar);
      showMessage(`\u{1F504} Esercizio riavviato! Riprova a ricavare ${prettyVar(state.targetVar)}.`, "info");
    } else if (state.startEq) {
      resetExercise();
    }
  }
  function bindWorkAreaEvents() {
    const eqCard = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
    if (eqCard) {
      eqCard.addEventListener("click", (e) => {
        if (state.mode !== "auto") return;
        if (e.target.closest(".cross-layer, .didactic-bubble-anchor, .btn-mini, .close-btn, button")) return;
        executeNextAutoStep();
      });
    }
    dom.equationDisplay.addEventListener("click", (e) => {
      if (state.mode === "auto") {
        executeNextAutoStep();
        return;
      }
      if (e.target === dom.equationDisplay) clearSelection();
    });
    dom.btnConfirm.addEventListener("click", confirmMove);
    dom.btnCancel.addEventListener("click", cancelPreview);
    if (dom.btnMirror) dom.btnMirror.addEventListener("click", applyMirrorRule);
    if (dom.btnReciprocal) dom.btnReciprocal.addEventListener("click", applyReciprocalRule);
    if (dom.btnDistribute) dom.btnDistribute.addEventListener("click", applyDistributeRule);
    if (dom.btnFactorCommon) dom.btnFactorCommon.addEventListener("click", applyFactorCommonRule);
    if (dom.btnCommonDenom) dom.btnCommonDenom.addEventListener("click", applyCommonDenominatorRule);
    if (dom.btnChangeSign) dom.btnChangeSign.addEventListener("click", applyChangeSignRule);
    if (dom.btnCross) dom.btnCross.addEventListener("click", () => toggleCrossMode());
    bindCrossDrag();
    if (dom.btnCopyLatexInline) dom.btnCopyLatexInline.addEventListener("click", copyLatexFormula);
    if (dom.btnQuickHint) dom.btnQuickHint.addEventListener("click", triggerQuickHint);
    if (dom.btnRetryExercise) dom.btnRetryExercise.addEventListener("click", retryCurrentExercise);
    if (dom.btnCompletionRetry) dom.btnCompletionRetry.addEventListener("click", retryCurrentExercise);
    if (dom.btnCompletionNext) {
      dom.btnCompletionNext.addEventListener("click", () => {
        playSoundClick();
        const { id, target } = randomExercise();
        loadFormula(getFormulaById(id), target);
      });
    }
    if (dom.btnCloseBubble) dom.btnCloseBubble.addEventListener("click", dismissDidacticBubble);
    if (dom.btnBubbleOk) {
      dom.btnBubbleOk.addEventListener("click", () => {
        playSoundClick();
        dismissDidacticBubble();
      });
    }
    if (dom.btnCalcSample) {
      dom.btnCalcSample.addEventListener("click", () => {
        playSoundClick();
        const solvedExpr = getSolvedExpression();
        if (!solvedExpr) return;
        const freeVars = Array.from(collectVars(solvedExpr)).filter(
          (v) => v !== state.targetVar && v !== "pi" && v !== "\u03C0" && v !== "e"
        );
        populateCalculatorSamples(freeVars, solvedExpr);
      });
    }
    if (dom.btnCalcReset) {
      dom.btnCalcReset.addEventListener("click", () => {
        playSoundClick();
        const solvedExpr = getSolvedExpression();
        if (!solvedExpr) return;
        resetCalculatorInputs(solvedExpr);
      });
    }
    if (dom.btnCopyCalcResult) {
      dom.btnCopyCalcResult.addEventListener("click", copyCalculatorResult);
    }
  }
  function applyMirrorRule() {
    if (!state.currentEq) return;
    const newEq = Eq(clone(state.currentEq.right), clone(state.currentEq.left));
    animateMirrorSwap(state.currentEq, newEq, () => {
      state.currentEq = newEq;
      state.selectedId = null;
      clearPreview();
      const rule = {
        id: "swapSides",
        name: "Regola dello specchio (scambio membri)",
        principle: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
        explanation: "scambioMembri"
      };
      pushHistory({
        equation: clone(newEq),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "swapSides",
        steps: ["Scambio i due membri dell'equazione (propriet\xE0 simmetrica: A = B \u2194 B = A)."],
        conditions: state.conditions.slice(),
        explanationKey: "scambioMembri",
        note: null,
        verified: true
      }, false);
      updateObjective();
      renderEquationView();
      showRulePanel(rule, { steps: ["Scambio i due membri per la propriet\xE0 simmetrica."], conditions: [] }, newEq);
      showMessage("\u{1FA9E} Regola dello specchio applicata: se A = B allora B = A!", "success");
      if (state.goalReached) {
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata!`, "success");
      }
    });
  }
  function bindModeEvents() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        state.mode = btn.dataset.mode;
        const modeDesc = {
          free: "\u{1F513} Modalit\xE0 Libera: interagisci liberamente trascinando variabili e applicando operazioni.",
          auto: "\u26A1 Modalit\xE0 Automatica: a ogni clic del mouse il programma esegue una operazione giustificando la regola."
        };
        showMessage(modeDesc[state.mode] || "", "info");
        const card = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
        if (card) card.classList.toggle("is-auto-mode", state.mode === "auto");
        if (state.mode === "auto") {
          showAutoMode();
        } else {
          const hintBadge = document.querySelector(".drag-hint-badge");
          const hintText = document.querySelector(".drag-hint-text");
          if (hintBadge && hintText) {
            hintBadge.textContent = "\u2728 Modalit\xE0 Libera";
            hintText.innerHTML = "Trascina una variabile dall'altra parte dell'uguale: rilasciala <strong>sotto la linea di frazione</strong> per dividere, o al numeratore per moltiplicare!";
          }
          renderEquationView();
          clearSelection();
        }
      });
    });
  }
  var _isAutoStepping = false;
  function executeNextAutoStep() {
    if (_isAutoStepping) return;
    _isAutoStepping = true;
    setTimeout(() => {
      _isAutoStepping = false;
    }, 250);
    if (!state.currentEq) {
      showMessage("Seleziona prima una formula dalla libreria per iniziare.", "info");
      return;
    }
    if (state.goalReached) {
      playSuccessChime();
      showMessage(`\u{1F389} Obiettivo gi\xE0 raggiunto! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata.`, "success");
      return;
    }
    const sug = suggestNextStep(state.currentEq, state.targetVar);
    if (!sug.found) {
      showMessage(sug.message || "Nessun ulteriore passaggio automatico trovato.", "info");
      return;
    }
    const res = performAction(state.currentEq, sug.action, { target: state.targetVar });
    if (!res.ok) {
      showInvalidMove(res.error, res.hint, { label: sug.action.label });
      return;
    }
    const cancellables = findCancellableDomElements(sug.action);
    if (cancellables.length > 0) {
      playSoundExplosion();
      cancellables.forEach((el) => {
        el.classList.add("var-exploding", "cross-dissolving");
        spawnVariableExplosion(el);
      });
      setTimeout(() => {
        applyAutoStepState(sug, res);
      }, 420);
      return;
    }
    applyAutoStepState(sug, res);
  }
  function applyAutoStepState(sug, res) {
    playSoundForRule(sug.action.ruleKey);
    const nextEq = res.equation;
    state.conditions = mergeConditions(state.conditions, res.conditions || []);
    state.selectedId = null;
    clearPreview();
    const rule = res.rule || {
      id: sug.action.ruleKey || sug.action.id,
      name: res.ruleName || sug.action.label,
      principle: res.rulePrinciple || sug.reason || "Principio di equivalenza delle equazioni.",
      explanation: res.explanationKey || null
    };
    pushHistory({
      equation: clone(nextEq),
      ruleName: rule.name || sug.action.label,
      rulePrinciple: rule.principle || res.rulePrinciple || "",
      ruleId: rule.id || sug.action.id,
      steps: res.steps || (sug.reason ? [sug.reason] : []),
      conditions: (res.conditions || []).slice(),
      explanationKey: rule.explanation || null,
      note: res.note || sug.reason || null,
      verified: true
    }, false);
    const isTargetOnRight = isolatedSide(nextEq.right, state.targetVar);
    if (isTargetOnRight) {
      state.currentEq = nextEq;
      renderEquationView();
      showRulePanel(rule, res, state.currentEq);
      animateOperationBadge(sug.action.label, sug.action.operandText);
      clearMessage();
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state.currentEq, state.targetVar);
        animateMirrorSwap(state.currentEq, flipped, () => {
          state.currentEq = flipped;
          state.goalReached = true;
          pushHistory({
            equation: clone(flipped),
            ruleName: "Regola dello specchio (scambio membri)",
            rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
            ruleId: "swapSides",
            steps: ["Scambio i due membri per la propriet\xE0 simmetrica."],
            conditions: state.conditions.slice(),
            explanationKey: "scambioMembri",
            note: null,
            verified: true
          }, false);
          updateObjective();
          renderEquationView();
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo!`, "success");
          showAutoMode();
        });
      }, 450);
      return;
    }
    if (sug.action.ruleKey === "swapSides") {
      animateMirrorSwap(state.currentEq, nextEq, () => {
        state.currentEq = nextEq;
        state.goalReached = isGoalReached(state.currentEq, state.targetVar);
        updateObjective();
        renderEquationView();
        showRulePanel(rule, res, state.currentEq);
        animateOperationBadge(sug.action.label, sug.action.operandText);
        clearMessage();
        if (state.goalReached) {
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo! Regola: ${rule.name}`, "success");
        } else {
          showMessage(`\u2713 ${sug.action.label}: ${sug.reason || rule.principle}`, "success");
        }
        showAutoMode();
      });
      return;
    }
    state.currentEq = nextEq;
    state.goalReached = isGoalReached(state.currentEq, state.targetVar);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, res, state.currentEq);
    animateOperationBadge(sug.action.label, sug.action.operandText);
    clearMessage();
    if (state.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state.targetVar)} \xE8 isolata con successo! Regola: ${rule.name}`, "success");
    } else {
      showMessage(`\u2713 ${sug.action.label}: ${sug.reason || rule.principle}`, "success");
    }
    showAutoMode();
  }
  function showAutoMode() {
    if (!state.currentEq) return;
    const card = dom.equationDisplay ? dom.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.add("is-auto-mode");
    const hintBadge = document.querySelector(".drag-hint-badge");
    const hintText = document.querySelector(".drag-hint-text");
    if (hintBadge && hintText) {
      hintBadge.textContent = "\u26A1 Modalit\xE0 Automatica";
      hintText.innerHTML = "<strong>Fai clic ovunque con il mouse</strong> (sull'equazione o sul pulsante in basso) per eseguire il passaggio successivo!";
    }
    if (state.goalReached) {
      if (dom.actionHint) dom.actionHint.textContent = "Modalit\xE0 Automatica:";
      if (dom.actionButtons) {
        dom.actionButtons.innerHTML = `
        <div class="auto-mode-finished">
          <div class="auto-success-header">\u{1F389} Formula isolata con successo!</div>
          <p>La grandezza <strong>${prettyVar(state.targetVar)}</strong> \xE8 stata completamente isolata. Puoi cambiare la grandezza da isolare in alto o selezionare un'altra formula dalla libreria.</p>
        </div>
      `;
      }
      return;
    }
    const sug = suggestNextStep(state.currentEq, state.targetVar);
    const roadmap = computeRoadmap(state.currentEq, state.targetVar);
    if (dom.actionHint) {
      dom.actionHint.textContent = `Modalit\xE0 Automatica \u2014 A ogni clic del mouse il programma esegue un'operazione (${roadmap.length} passaggi stimati):`;
    }
    if (!dom.actionButtons) return;
    dom.actionButtons.innerHTML = "";
    if (!sug.found) {
      dom.actionButtons.innerHTML = `<p class="placeholder small">${escapeHtml3(sug.message || "Nessuna sequenza automatica diretta trovata per questa formula.")}</p>`;
      return;
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "action-btn auto-step-btn";
    nextBtn.type = "button";
    nextBtn.innerHTML = `
    <span class="action-label">\u{1F5B1}\uFE0F Fai clic per eseguire: ${escapeHtml3(sug.action.label)}</span>
    <span class="action-desc"><strong>Giustificazione della regola:</strong> ${escapeHtml3(sug.reason || sug.action.description || "")}</span>
  `;
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      executeNextAutoStep();
    });
    dom.actionButtons.appendChild(nextBtn);
    if (roadmap.length > 0) {
      const roadmapCard = document.createElement("div");
      roadmapCard.className = "roadmap-card";
      roadmapCard.innerHTML = `
      <div class="roadmap-header">Piano di risoluzione (passaggi rimanenti):</div>
      <ol class="roadmap-list">
        ${roadmap.map((s, idx) => `
          <li class="roadmap-item ${idx === 0 ? "roadmap-current" : ""}">
            <span class="roadmap-step-num">${idx + 1}</span>
            <div class="roadmap-step-content">
              <strong>${escapeHtml3(s.action.label)}</strong>
              <p>${escapeHtml3(s.reason || s.action.description || "")}</p>
            </div>
          </li>
        `).join("")}
      </ol>
    `;
      dom.actionButtons.appendChild(roadmapCard);
    }
  }
  function computeRoadmap(startEquation, target) {
    let curr = clone(startEquation);
    const steps = [];
    let iter = 0;
    while (iter < 12 && !isGoalReached(curr, target)) {
      const sug = suggestNextStep(curr, target);
      if (!sug.found) break;
      steps.push(sug);
      const res = performAction(curr, sug.action, { target });
      if (!res.ok) break;
      curr = res.equation;
      iter++;
    }
    return steps;
  }
  function triggerQuickHint() {
    if (!state.currentEq) return;
    if (state.goalReached) {
      showMessage("Obiettivo gi\xE0 raggiunto! La grandezza " + prettyVar(state.targetVar) + " \xE8 gi\xE0 isolata.", "success");
      return;
    }
    const sug = suggestNextStep(state.currentEq, state.targetVar);
    if (!sug.found) {
      showMessage(sug.message || "Nessun suggerimento disponibile per questo stato.", "info");
      return;
    }
    previewAction(sug.action);
    showMessage("\u{1F4A1} Passo consigliato: " + sug.reason, "info");
  }
  function bindEditorEvents() {
    dom.btnLoadCustom.addEventListener("click", loadCustomFormula);
    dom.customFormula.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadCustomFormula();
    });
  }
  function loadCustomFormula() {
    const text = dom.customFormula.value.trim();
    const target = dom.customTarget.value.trim();
    dom.customError.hidden = true;
    if (!text) {
      showCustomError("Inserisci una formula.");
      return;
    }
    let eq2;
    try {
      eq2 = parseEquation(text);
    } catch (e) {
      showCustomError("Errore di sintassi: " + e.message);
      return;
    }
    const vars = collectVars(eq2);
    let t = target;
    let multipleSpecified = false;
    if (t && (t.includes(",") || t.includes(";"))) {
      const parts = t.split(/[,;\s]+/).filter(Boolean);
      const validParts = parts.filter((p) => vars.has(p) || [...vars].some((v) => v.toLowerCase() === p.toLowerCase()));
      if (validParts.length > 0) {
        t = [...vars].find((v) => v.toLowerCase() === validParts[0].toLowerCase()) || validParts[0];
        multipleSpecified = true;
      } else {
        showCustomError(`Inserisci una sola grandezza da isolare alla volta (es. "${[...vars][0]}"). Grandezze presenti: ${[...vars].join(", ")}.`);
        return;
      }
    }
    if (!t) {
      const L = unwrap(eq2.left);
      if (L.type === "Var") t = L.name;
      else {
        showCustomError("Specifica la grandezza da isolare (una sola lettera, es. " + [...vars][0] + ").");
        return;
      }
    }
    if (!vars.has(t)) {
      const alt = [...vars].find((v) => v.toLowerCase() === t.toLowerCase());
      if (alt) t = alt;
      else {
        showCustomError(`La grandezza "${t}" non compare nella formula. Inserisci una sola grandezza presente: ${[...vars].join(", ")}.`);
        return;
      }
    }
    loadFormula({
      id: "custom-" + Date.now(),
      topic: "formula personalizzata",
      name: "formula personalizzata",
      formula: text,
      isolate: [...vars],
      conditions: [],
      difficulty: 3,
      notes: "Formula inserita manualmente."
    }, t);
    if (multipleSpecified) {
      showMessage(`\xC8 possibile isolare una sola grandezza alla volta: impostato obiettivo su "${prettyVar(t)}". Puoi cambiare grandezza da isolare in qualsiasi momento dall'interfaccia!`, "info");
    } else {
      showMessage(`Formula personalizzata caricata. Obiettivo: isolare ${prettyVar(t)}.`, "success");
    }
  }
  function showCustomError(msg) {
    dom.customError.hidden = false;
    dom.customError.textContent = msg;
  }
  function bindGlobalEvents() {
    dom.btnHelp.addEventListener("click", showHelp);
    dom.btnContrast.addEventListener("click", toggleContrast);
    if (dom.btnTheme) dom.btnTheme.addEventListener("click", toggleTheme);
    dom.btnRunTests.addEventListener("click", runTests);
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.close).hidden = true;
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.testsBackdrop.hidden) {
          dom.testsBackdrop.hidden = true;
          return;
        }
        if (!dom.modalBackdrop.hidden) {
          dom.modalBackdrop.hidden = true;
          return;
        }
        if (state.pendingMove) cancelPreview();
        else if (state.clickDragToken) exitClickDragMode();
        else clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        redo();
      }
    });
  }
  function toggleContrast() {
    const on = document.body.classList.toggle("high-contrast");
    dom.btnContrast.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    try {
      localStorage.setItem("formuleInverse.theme", isDark ? "dark" : "light");
    } catch (e) {
    }
    if (dom.btnTheme) {
      dom.btnTheme.textContent = isDark ? "\u2600\uFE0F Modalit\xE0 chiara" : "\u{1F319} Modalit\xE0 scura";
    }
  }
  function initTheme() {
    try {
      const saved = localStorage.getItem("formuleInverse.theme");
      if (saved === "dark" || !saved && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark-theme");
        if (dom.btnTheme) dom.btnTheme.textContent = "\u2600\uFE0F Modalit\xE0 chiara";
      }
    } catch (e) {
    }
  }
  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch (e) {
    }
  }
  function _audioCtx() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      return C ? new C() : null;
    } catch {
      return null;
    }
  }
  function playSoundTransport() {
    try {
      const ctx = _audioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(1e-4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
    }
  }
  function playSoundFraction() {
    try {
      const ctx = _audioCtx();
      if (!ctx) return;
      [[440, 0, 0.15], [880, 0.02, 0.12]].forEach(([freq, delay, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.14, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      });
    } catch {
    }
  }
  function playSoundInvalid() {
    try {
      const ctx = _audioCtx();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(200, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(213, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(64, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.38);
      [osc1, osc2].forEach((o) => {
        o.connect(gain);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.4);
      });
      gain.connect(ctx.destination);
    } catch {
    }
  }
  function playSoundClick() {
    try {
      const ctx = _audioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
    }
  }
  function playSoundExplosion() {
    try {
      const ctx = _audioCtx();
      if (!ctx) return;
      const sr = ctx.sampleRate;
      const dur = 0.55;
      const buf = ctx.createBuffer(1, sr * dur, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(1200, ctx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.55, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.5);
      noise.connect(filt);
      filt.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = "sine";
      boom.frequency.setValueAtTime(140, ctx.currentTime);
      boom.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.4);
      boomGain.gain.setValueAtTime(0.55, ctx.currentTime);
      boomGain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.42);
      boom.connect(boomGain);
      boomGain.connect(ctx.destination);
      boom.start(ctx.currentTime);
      boom.stop(ctx.currentTime + 0.45);
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "square";
      click.frequency.value = 80;
      clickGain.gain.setValueAtTime(0.4, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.04);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(ctx.currentTime);
      click.stop(ctx.currentTime + 0.05);
    } catch {
    }
  }
  var _FIRST_PRINCIPLE = /* @__PURE__ */ new Set(["moveTerm", "addBoth", "subBoth", "swapSides"]);
  function playSoundForRule(ruleKey) {
    if (_FIRST_PRINCIPLE.has(ruleKey)) playSoundTransport();
    else playSoundFraction();
  }
  function copyStepsText() {
    if (state.history.length === 0) return;
    const lines = state.history.filter((h) => !h.failed).map((h, i) => `${i === 0 ? "Partenza" : "Passo " + i}: ${toPretty(h.equation, 0)} (${h.ruleName})`);
    const text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showMessage(`${lines.length} passaggi copiati negli appunti!`, "success");
      }).catch(() => {
        prompt("Copia i passaggi:", text);
      });
    } else {
      prompt("Copia i passaggi:", text);
    }
  }
  function copyLatexFormula() {
    if (!state.currentEq) return;
    const latexStr = toLatex(state.currentEq);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(latexStr).then(() => {
        showMessage(`Formula LaTeX copiata negli appunti: "${latexStr}"`, "success");
      }).catch(() => {
        prompt("Copia il codice LaTeX:", latexStr);
      });
    } else {
      prompt("Copia il codice LaTeX:", latexStr);
    }
  }
  function copyStepsLatex() {
    if (state.history.length === 0) return;
    const validSteps = state.history.filter((h) => !h.failed);
    const lines = validSteps.map((h, i) => {
      const ltx = toLatex(h.equation);
      const aligned = ltx.includes("=") ? ltx.replace("=", "&=") : ltx + " &=";
      const label = escapeLatexComment(h.ruleName || (i === 0 ? "Formula di partenza" : "Passo " + i));
      return `  ${aligned} && \\text{(${label})}`;
    });
    const block = `\\begin{align*}
${lines.join(" \\\\\n")}
\\end{align*}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(block).then(() => {
        showMessage(`Svolgimento LaTeX (align*) copiato negli appunti!`, "success");
      }).catch(() => {
        prompt("Copia lo svolgimento LaTeX:", block);
      });
    } else {
      prompt("Copia lo svolgimento LaTeX:", block);
    }
  }
  function escapeLatexComment(s) {
    return (s || "").replace(/([&%$#_{}~^\\])/g, "\\$1");
  }
  function showHelp() {
    dom.modalTitle.textContent = "Guida rapida";
    dom.modalBody.innerHTML = `
    <h4>Come si usa l'app</h4>
    <ol>
      <li><strong>A. Libreria</strong>: scegli una formula, oppure scrivine una nell'editor.</li>
      <li><strong>E. Obiettivo</strong>: in alto compare la grandezza da isolare.</li>
      <li><strong>B. Area di lavoro</strong>: <em>clicca</em> una lettera, un termine, un fattore o un denominatore. Appaiono le operazioni lecite.</li>
      <li>Scegli un'operazione: vedrai un'<strong>anteprima</strong>. Conferma o annulla.</li>
      <li><strong>C. Regola</strong>: leggi la spiegazione intuitiva e il principio di equivalenza.</li>
      <li><strong>D. Cronologia</strong>: ripercorri i passaggi; usa <em>Annulla</em>/<em>Ripristina</em>. Puoi cliccare un passaggio per tornarci.</li>
    </ol>
    <h4>Concetti chiave</h4>
    <ul>
      <li><strong>Trasporto di un termine</strong>: non \xE8 uno "spostamento", ma sommare l'opposto a entrambi i membri (primo principio). Vale solo per i termini additivi.</li>
      <li><strong>Trasporto di un fattore</strong>: si divide entrambi i membri per il fattore, che deve essere \u2260 0 (secondo principio). Vale solo per fattori che moltiplicano tutto il membro.</li>
      <li><strong>Segno \xB1</strong>: risolvendo x\xB2 = a si ottiene x = \xB1\u221Aa: il segno non va eliminato.</li>
      <li><strong>Condizioni di validit\xE0</strong>: i denominatori devono essere \u2260 0 e i radicandi \u2265 0; l'app le registra e le mostra.</li>
    </ul>
    <h4>Scorciatoie</h4>
    <p>Ctrl/Cmd+Z annulla, Ctrl/Cmd+Y ripristina, Esc annulla l'anteprima o la selezione.</p>
  `;
    dom.modalActions.innerHTML = '<button class="btn btn-secondary" type="button" data-close-help>Chiudi</button>';
    dom.modalActions.querySelector("[data-close-help]").addEventListener("click", () => {
      dom.modalBackdrop.hidden = true;
    });
    dom.modalBackdrop.hidden = false;
  }
  function runTests() {
    const results = runAllTests();
    const { passed, failed, total, html } = formatTestResults(results);
    dom.testsSummary.innerHTML = `<span class="test-pass">${passed}</span> / <span class="test-total">${total}</span> superati` + (failed ? ` \u2014 <span class="test-fail">${failed} falliti</span>` : ' \u2014 <span class="test-pass">tutti superati</span>');
    dom.testsBody.innerHTML = html;
    dom.testsBackdrop.hidden = false;
  }
  function bindLatexEvents() {
    dom.btnLatexPreview.addEventListener("click", previewLatex);
    dom.btnLatexSave.addEventListener("click", saveLatex);
    dom.latexInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        previewLatex();
      }
    });
  }
  function clearLatexError() {
    if (dom.latexError) {
      dom.latexError.hidden = true;
      dom.latexError.textContent = "";
    }
  }
  function showLatexError(msg) {
    if (dom.latexError) {
      dom.latexError.hidden = false;
      dom.latexError.textContent = msg;
    }
  }
  function previewLatex() {
    clearLatexError();
    const raw = (dom.latexInput.value || "").trim();
    if (argsEmpty(raw)) {
      showLatexError("Incolla un'equazione LaTeX.");
      return null;
    }
    let syntax;
    try {
      syntax = latexToSyntax(raw);
      parseEquation(syntax);
    } catch (e) {
      const msg = e instanceof LatexError || e instanceof ParseError ? e.message : "Conversione non riuscita: " + e.message;
      showLatexError(msg);
      if (dom.latexPreview) dom.latexPreview.hidden = true;
      return null;
    }
    if (dom.latexPreview) {
      dom.latexPreview.hidden = false;
      let mathHtml = "";
      try {
        mathHtml = renderEquation(parseEquation(syntax), {});
      } catch (e) {
        mathHtml = escapeHtml3(syntax);
      }
      dom.latexPreview.innerHTML = `<span class="conv-label">Sintassi per l'editor</span><div class="conv-code">` + escapeHtml3(syntax) + '</div><span class="conv-label" style="margin-top:.5rem">Anteprima</span><div class="latex-math-preview">' + mathHtml + "</div>";
    }
    return syntax;
  }
  function argsEmpty(t) {
    return !t;
  }
  function resolveVar(token, vars) {
    if (vars.has(token)) return token;
    const clean = token.replace(/^\\/, "");
    if (vars.has(clean)) return clean;
    const lower = clean.toLowerCase();
    const greek = GREEK_MAP && GREEK_MAP[lower];
    if (greek && vars.has(greek)) return greek;
    const alt = [...vars].find((v) => v.toLowerCase() === lower);
    if (alt) return alt;
    return null;
  }
  function saveLatex() {
    const syntax = previewLatex();
    if (!syntax) return;
    const name = (dom.latexName.value || "").trim() || "formula da LaTeX";
    const targetRaw = (dom.latexTarget.value || "").trim();
    let eq2;
    try {
      eq2 = parseEquation(syntax);
    } catch (e) {
      showLatexError("Errore di sintassi: " + e.message);
      return;
    }
    const vars = collectVars(eq2);
    let isolateList = [...vars];
    if (targetRaw) {
      const parts = targetRaw.split(/[,;\s]+/).filter(Boolean);
      const resolved = [];
      for (const p of parts) {
        const match = resolveVar(p, vars);
        if (match) {
          if (!resolved.includes(match)) resolved.push(match);
        } else {
          showLatexError(`La grandezza "${p}" non compare nella formula. Presenti: ${[...vars].join(", ")}.`);
          return;
        }
      }
      if (resolved.length > 0) {
        isolateList = resolved;
      }
    }
    try {
      saveUserFormula({
        name,
        formula: syntax,
        latex: (dom.latexInput.value || "").trim(),
        topic: "Le mie formule",
        isolate: isolateList,
        conditions: [],
        difficulty: 3,
        notes: "Importata da LaTeX."
      });
    } catch (e) {
      showLatexError(e.message);
      return;
    }
    renderMyFormulas();
    clearLatexError();
    dom.latexInput.value = "";
    dom.latexName.value = "";
    dom.latexTarget.value = "";
    if (dom.latexPreview) dom.latexPreview.hidden = true;
    showMessage(`Formula "${name}" salvata nell'archivio.`, "success");
  }
  function bindStorageEvents() {
    dom.btnExportFormulas.addEventListener("click", exportFormulas);
    dom.btnImportFormulas.addEventListener("click", importFormulas);
    dom.btnClearFormulas.addEventListener("click", clearFormulas);
  }
  function clearStorageError() {
    if (dom.storageError) {
      dom.storageError.hidden = true;
      dom.storageError.textContent = "";
    }
  }
  function showStorageError(msg) {
    if (dom.storageError) {
      dom.storageError.hidden = false;
      dom.storageError.textContent = msg;
    }
  }
  function renderMyFormulas() {
    const list = getUserFormulas();
    if (dom.myFormulasCount) {
      dom.myFormulasCount.textContent = list.length === 0 ? "Nessuna formula salvata. Importa da LaTeX o salva una formula personalizzata." : `${list.length} formula/e nell'archivio (persistente su questo dispositivo).`;
    }
    if (!dom.myFormulasList) return;
    dom.myFormulasList.innerHTML = "";
    if (list.length === 0) {
      dom.myFormulasList.innerHTML = '<p class="placeholder">Archivio vuoto.</p>';
      return;
    }
    for (const f of list) {
      const card = document.createElement("div");
      card.className = "formula-card";
      card.setAttribute("role", "option");
      card.tabIndex = 0;
      let mathHtml = "";
      try {
        mathHtml = renderEquation(parseEquation(f.formula), {});
      } catch (e) {
        mathHtml = escapeHtml3(f.formula);
      }
      card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml3(f.topic || "Le mie formule")}</span>
        <button class="icon-btn" type="button" title="Elimina" aria-label="Elimina formula">\u2715</button>
      </div>
      <div class="formula-name">${escapeHtml3(f.name)}</div>
      <div class="formula-math">${mathHtml}</div>
      ${f.isolate && f.isolate.length ? `<div class="formula-isolate">Isola: ${f.isolate.map((v) => prettyVar(v)).join(", ")}</div>` : ""}
    `;
      const load = () => {
        const cands = (f.isolate || []).filter((v) => !triviallyIsolated(f.formula, v));
        const tgt = (cands.length ? cands : f.isolate || [])[0];
        const vars = [...collectVars(parseEquation(f.formula))];
        const target = tgt || vars[0];
        loadFormula({
          id: f.id,
          topic: f.topic,
          name: f.name,
          formula: f.formula,
          isolate: f.isolate && f.isolate.length ? f.isolate : vars,
          conditions: f.conditions || [],
          difficulty: f.difficulty || 3,
          notes: f.notes || ""
        }, target);
      };
      card.addEventListener("click", (e) => {
        if (e.target.closest(".icon-btn")) return;
        load();
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          load();
        }
      });
      card.querySelector(".icon-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.confirm(`Eliminare la formula "${f.name}"?`)) {
          deleteUserFormula(f.id);
          renderMyFormulas();
          showMessage("Formula eliminata dall'archivio.", "info");
        }
      });
      dom.myFormulasList.appendChild(card);
    }
  }
  function exportFormulas() {
    clearStorageError();
    const json = exportUserFormulasJSON();
    if (dom.jsonArea) {
      dom.jsonArea.hidden = false;
      dom.jsonArea.value = json;
      dom.jsonArea.focus();
      dom.jsonArea.select();
    }
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formule-inverse.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    } catch (e) {
    }
    showMessage("Archivio esportato (JSON nell'area e file scaricato).", "success");
  }
  function importFormulas() {
    clearStorageError();
    if (!dom.jsonArea) return;
    if (dom.jsonArea.hidden) {
      dom.jsonArea.hidden = false;
      dom.jsonArea.focus();
      showMessage(`Incolla il JSON nell'area e premi di nuovo "Importa JSON".`, "info");
      return;
    }
    const json = dom.jsonArea.value.trim();
    if (!json) {
      showStorageError("Incolla prima un JSON da importare.");
      return;
    }
    try {
      const added = importUserFormulasJSON(json);
      renderMyFormulas();
      showMessage(`${added} formula/e importate nell'archivio.`, "success");
    } catch (e) {
      showStorageError(e.message);
    }
  }
  function clearFormulas() {
    clearStorageError();
    if (!window.confirm("Svuotare l'archivio delle formule salvate? Operazione non annullabile.")) return;
    clearUserFormulas();
    renderMyFormulas();
    showMessage("Archivio svuotato.", "info");
  }
  function escapeHtml3(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
