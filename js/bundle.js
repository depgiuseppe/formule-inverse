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
        if (node.name === "\xB1") return { ok: true, value: 0 };
        if (env[node.name] !== void 0 && env[node.name] !== null && env[node.name] !== "") {
          const val = Number(env[node.name]);
          if (Number.isFinite(val)) return { ok: true, value: val };
        }
        return { ok: false, missing: node.name };
      }
      case "Add": {
        if (node.args.length === 2) {
          const first = unwrap(node.args[0]);
          if (first.type === "Var" && first.name === "\xB1") {
            return evalWithEnv(node.args[1], env);
          }
        }
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
        if (node.name === "pi" || node.name === "\u03C0" || node.name === "e" || node.name === "\xB1") return node;
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
    kappa: "\\kappa",
    xi: "\\xi",
    chi: "\\chi",
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
          C_eq: "C_{\\text{eq}}",
          R_eq: "R_{\\text{eq}}",
          R_1: "R_1",
          R_2: "R_2",
          C_1: "C_1",
          C_2: "C_2",
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
          v0y: "v_{0y}",
          H0: "H_0",
          Rs: "R_s",
          lam0: "\\lambda_0",
          lam_max: "\\lambda_{\\text{max}}",
          L_edd: "L_{\\text{edd}}",
          v_area: "v_{\\text{area}}",
          thetaB: "\\theta_B",
          Delta_y: "\\Delta y",
          Delta_G: "\\Delta G",
          Delta_H: "\\Delta H",
          Delta_S: "\\Delta S",
          P_tot: "P_{\\text{tot}}",
          m_mol: "m_{\\text{mol}}",
          m_solv: "m_{\\text{solv}}",
          pH: "\\text{pH}",
          pOH: "\\text{pOH}",
          pKa: "\\text{p}K_a",
          Ka: "K_a",
          Kb: "K_b",
          Kw: "K_w",
          Pi: "\\Pi"
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
  function combineIdenticalFactors(factors) {
    if (factors.length <= 1) return factors;
    const groups = [];
    for (const f of factors) {
      const u = unwrap(f);
      let base = u;
      let exp = 1;
      if (u.type === "Pow" && u.exp && u.exp.type === "Num" && Number.isInteger(u.exp.value) && u.exp.value > 0) {
        base = unwrap(u.base);
        exp = u.exp.value;
      }
      const key = toPretty(base, 0);
      const existing = groups.find((g) => g.key === key && equivalentExpr(g.base, base));
      if (existing) {
        existing.exp += exp;
      } else {
        groups.push({ key, base, exp });
      }
    }
    const result = [];
    for (const g of groups) {
      if (g.exp === 1) {
        result.push(g.base);
      } else {
        result.push(Pow(g.base, Num(g.exp)));
      }
    }
    result.sort(compareNodes);
    return result;
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
        const finalNumFactors = combineIdenticalFactors(numFactors);
        const finalDenFactors = combineIdenticalFactors(denFactors);
        const negative = acc.n < 0;
        const abs = { n: Math.abs(acc.n), d: acc.d };
        const out = [];
        if (!(abs.n === 1 && abs.d === 1)) out.push(ratToNode(abs));
        out.push(...finalNumFactors);
        if (out.length === 0 && finalDenFactors.length === 0) return Num(1);
        const numPart = out.length === 0 ? Num(1) : out.length === 1 ? out[0] : flattenAssoc("Mul", out);
        const product = finalDenFactors.length === 0 ? numPart : Div(numPart, finalDenFactors.length === 1 ? finalDenFactors[0] : flattenAssoc("Mul", finalDenFactors));
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
        if (node.name !== "\xB1") out.add(node.name);
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
    const eq = parser.parseEquation();
    assertNoZeroDenominator(eq);
    return eq;
  }
  function parseExpression(input) {
    if (typeof input !== "string" || input.trim() === "") {
      throw new ParseError("L'espressione \xE8 vuota.");
    }
    const tokens = tokenize(input);
    const parser = new Parser(tokens);
    const expr = parser.parseExpr();
    if (!parser.atEnd()) {
      throw new ParseError(`Elemento inatteso: "${parser.peek().v}"`);
    }
    return expr;
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
  function reciprocalEquation(eq) {
    if (!eq || eq.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione valida da invertire." };
    }
    if (isIdenticallyZero(eq.left) || isIdenticallyZero(eq.right)) {
      return {
        ok: false,
        error: "Non si pu\xF2 calcolare il reciproco di un membro identicamente nullo: la divisione per zero non \xE8 definita.",
        hint: "Assicurati che entrambi i membri siano diversi da zero prima di applicare la regola dei reciproci."
      };
    }
    if (memberIsFractionSum(eq.left) || memberIsFractionSum(eq.right)) {
      return {
        ok: false,
        error: "Il reciproco di una somma di frazioni NON \xE8 la somma dei reciproci: 1/(A/B + C/D) \u2260 B/A + D/C. Esempio numerico: 1/2 + 1/2 = 1 il cui reciproco \xE8 1, mentre capovolgendo i singoli addendi verrebbe 2 + 2 = 4!",
        hint: `Usa il tasto "\u{1F9EE} Denominatore comune (m.c.m.)" per sommare le frazioni in un'unica frazione: solo allora potrai invertire entrambi i membri.`
      };
    }
    return {
      ok: true,
      newEq: Eq(reciprocalOfMember(eq.left), reciprocalOfMember(eq.right))
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
  function reduceStepDidactic(node) {
    if (!node) return node;
    const u = unwrap(node);
    if (u.type === "Add" || u.type === "Sub") {
      return reduceAdditiveTermsToCommonDenominator(u);
    }
    if (u.type === "Div") {
      const denU = unwrap(u.den);
      const numU = unwrap(u.num);
      const denHasSumFrac = (denU.type === "Add" || denU.type === "Sub") && getAdditiveTerms(denU).some((t) => termAsFraction(t.node).hasDen);
      const numHasSumFrac = (numU.type === "Add" || numU.type === "Sub") && getAdditiveTerms(numU).some((t) => termAsFraction(t.node).hasDen);
      if (denHasSumFrac || numHasSumFrac) {
        const newNum = numHasSumFrac ? reduceAdditiveTermsToCommonDenominator(numU) : u.num;
        const newDen = denHasSumFrac ? reduceAdditiveTermsToCommonDenominator(denU) : u.den;
        return Div(newNum, newDen);
      }
    }
    return reduceToSingleFraction(node);
  }
  function reduceEquationToCommonDenominator(eq, chosenSide = null) {
    if (!eq || eq.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione valida fornita." };
    }
    const leftCan = canReduceToSingleFraction(eq.left);
    const rightCan = canReduceToSingleFraction(eq.right);
    if (!leftCan && !rightCan) {
      return {
        ok: false,
        error: "Non ci sono somme di frazioni o frazioni composte da ridurre a denominatore comune.",
        hint: "La formula \xE8 gi\xE0 espressa in frazioni semplici o termini interi."
      };
    }
    let newLeft = eq.left;
    let newRight = eq.right;
    const steps = [];
    if (chosenSide === "left" && leftCan) {
      newLeft = reduceStepDidactic(eq.left);
      steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq.left, 0)} \u2192 ${toPretty(newLeft, 0)}.`);
    } else if (chosenSide === "right" && rightCan) {
      newRight = reduceStepDidactic(eq.right);
      steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq.right, 0)} \u2192 ${toPretty(newRight, 0)}.`);
    } else {
      if (leftCan) {
        newLeft = reduceStepDidactic(eq.left);
        steps.push(`Riduco a denominatore comune (m.c.m.) al primo membro: ${toPretty(eq.left, 0)} \u2192 ${toPretty(newLeft, 0)}.`);
      }
      if (rightCan) {
        newRight = reduceStepDidactic(eq.right);
        steps.push(`Riduco a denominatore comune (m.c.m.) al secondo membro: ${toPretty(eq.right, 0)} \u2192 ${toPretty(newRight, 0)}.`);
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
  function bothSides(eq, fn) {
    return Eq(fn(eq.left), fn(eq.right));
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
    canAdd: (expr) => true,
    apply(eq, ctx5) {
      const c = ctx5.value;
      const newEq = bothSides(eq, (side) => simplify(Add(side, c)));
      return { equation: newEq, conditions: [], steps: [`Aggiungo ${ctx5.valueText} a entrambi i membri.`] };
    }
  };
  var ruleSubBothSides = {
    id: "sub-both",
    name: "Sottrazione della stessa quantit\xE0 da entrambi i membri (primo principio di equivalenza)",
    principle: "Se A = B allora A \u2212 C = B \u2212 C.",
    explanation: "sub-both",
    apply(eq, ctx5) {
      const c = ctx5.value;
      const newEq = bothSides(eq, (side) => simplify(Sub(side, c)));
      return { equation: newEq, conditions: [], steps: [`Sottraggo ${ctx5.valueText} da entrambi i membri.`] };
    }
  };
  var ruleMulBothSides = {
    id: "mul-both",
    name: "Moltiplicazione di entrambi i membri per la stessa quantit\xE0 (secondo principio di equivalenza)",
    principle: "Se A = B allora A\xB7C = B\xB7C.",
    explanation: "mul-both",
    apply(eq, ctx5) {
      const c = ctx5.value;
      if (unwrap(c).type === "Num" && unwrap(c).value === 0) {
        throw new RuleError(
          "Moltiplicare entrambi i membri per 0 \xE8 lecito ma distrugge l'informazione (0 = 0): non \xE8 una trasformazione utile.",
          "Scegli una quantit\xE0 non nulla."
        );
      }
      const newEq = bothSides(eq, (side) => simplify(Mul(side, c)));
      return { equation: newEq, conditions: [], steps: [`Moltiplico entrambi i membri per ${ctx5.valueText}.`] };
    }
  };
  var ruleDivBothSides = {
    id: "div-both",
    name: "Divisione di entrambi i membri per la stessa quantit\xE0 non nulla (secondo principio di equivalenza)",
    principle: "Se A = B e C \u2260 0 allora A/C = B/C.",
    explanation: "div-both",
    precondition(eq, ctx5) {
      const c = ctx5.value;
      if (isIdenticallyZero(c)) {
        throw new RuleError(
          "Non si pu\xF2 dividere per una quantit\xE0 identicamente nulla: la divisione per zero non \xE8 definita.",
          "Specifica una quantit\xE0 sicuramente diversa da zero."
        );
      }
      const cond = conditionText(c, "\u2260 0");
      return { conditions: [cond] };
    },
    apply(eq, ctx5) {
      const c = ctx5.value;
      const newEq = bothSides(eq, (side) => simplify(Div(side, c)));
      return {
        equation: newEq,
        conditions: [conditionText(c, "\u2260 0")],
        steps: [`Divido entrambi i membri per ${ctx5.valueText} (con ${ctx5.valueText} \u2260 0).`]
      };
    }
  };
  var ruleMoveAdditiveTerm = {
    id: "move-term",
    name: "Trasporto di un termine additivo con cambiamento di segno",
    principle: "Somma membro a membro lo stesso additivo opposto (primo principio di equivalenza).",
    explanation: "move-term",
    apply(eq, ctx5) {
      const { term, side } = ctx5;
      const from = side === "left" ? eq.left : eq.right;
      const to = side === "left" ? eq.right : eq.left;
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
          `Porto il termine ${ctx5.termText} dall'altro membro applicando il primo principio: il termine vi compare con il segno cambiato.`
        ]
      };
    }
  };
  var ruleMoveFactor = {
    id: "move-factor",
    name: "Trasporto di un fattore (divisione di entrambi i membri per il fattore)",
    principle: "Se A = B allora A/C = B/C, purch\xE9 C \u2260 0.",
    explanation: "move-factor",
    apply(eq, ctx5) {
      const { factor, side } = ctx5;
      const from = side === "left" ? eq.left : eq.right;
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
      const newEq = bothSides(eq, (s) => simplify(Div(s, fact)));
      return {
        equation: newEq,
        conditions: [cond],
        steps: [`Divido entrambi i membri per il fattore ${ctx5.factorText} (${ctx5.factorText} \u2260 0).`]
      };
    }
  };
  var ruleCrossMultiply = {
    id: "cross-multiply",
    name: "Moltiplicazione incrociata in una proporzione",
    principle: "Da a/b = c/d, moltiplicando entrambi i membri per b\xB7d (b,d \u2260 0) si ottiene a\xB7d = b\xB7c.",
    explanation: "cross-multiply",
    precondition(eq) {
      const L = asFraction(eq.left);
      const R = asFraction(eq.right);
      if (!L || !R) {
        throw new RuleError(
          "La moltiplicazione incrociata si applica solo quando ENTRAMBI i membri sono rapporti (frazioni).",
          "Riscrivi ciascun membro come frazione prima di applicare questa regola."
        );
      }
      return { ok: true };
    },
    apply(eq) {
      const L = asFraction(eq.left);
      const R = asFraction(eq.right);
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
    apply(eq) {
      return { equation: Eq(eq.right, eq.left), conditions: [], steps: ["Scambio i due membri dell'uguaglianza."] };
    }
  };
  var ruleReciprocalBothSides = {
    id: "reciprocal-both",
    name: "Reciproco di entrambi i membri",
    principle: "Se A = B con A \u2260 0 e B \u2260 0, allora 1/A = 1/B.",
    explanation: "reciprocal-both",
    precondition(eq) {
      if (isIdenticallyZero(eq.left) || isIdenticallyZero(eq.right)) {
        throw new RuleError("Non si pu\xF2 calcolare il reciproco di un membro identicamente nullo.");
      }
      if (memberIsFractionSum(eq.left) || memberIsFractionSum(eq.right)) {
        throw new RuleError(
          "Il reciproco di una somma di frazioni NON \xE8 la somma dei reciproci: 1/(A/B + C/D) \u2260 B/A + D/C.",
          `Usa il tasto "\u{1F9EE} Denominatore comune (m.c.m.)" per sommare le frazioni in un'unica frazione prima di invertire i membri.`
        );
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
        conditions: [conditionText(eq.left, "\u2260 0"), conditionText(eq.right, "\u2260 0")],
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
    apply(eq) {
      const newLeft = negateExpr(eq.left);
      const newRight = negateExpr(eq.right);
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
    precondition(eq) {
      const L = asFraction(eq.left);
      const R = asFraction(eq.right);
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
    apply(eq) {
      const L = asFraction(eq.left);
      const R = asFraction(eq.right);
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
    apply(eq, ctx5) {
      const { side } = ctx5;
      const withPow = side === "left" ? eq.left : eq.right;
      const other = side === "left" ? eq.right : eq.left;
      const found = extractEvenPower(withPow, ctx5.insideVar);
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
    apply(eq, ctx5) {
      const { side } = ctx5;
      const withPow = side === "left" ? eq.left : eq.right;
      const other = side === "left" ? eq.right : eq.left;
      const found = extractOddPower(withPow, ctx5.insideVar);
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
    apply(eq, ctx5) {
      const n = ctx5.value;
      if (isIdenticallyZero(n)) {
        throw new RuleError(
          "Elevare entrambi i membri alla potenza 0 distrugge l'informazione dell'equazione (1 = 1): non \xE8 una trasformazione utile.",
          "Scegli un esponente diverso da zero."
        );
      }
      const newEq = Eq(simplify(Pow(eq.left, n)), simplify(Pow(eq.right, n)));
      return {
        equation: newEq,
        conditions: [],
        steps: [`Elevo entrambi i membri all'esponente ${ctx5.valueText}.`],
        note: isEvenInt(n) ? "Attenzione: elevare a un esponente pari non \xE8 iniettivo e pu\xF2 introdurre soluzioni estranee: le soluzioni vanno sempre ricontrollate." : "Elevare a un esponente dispari \xE8 iniettivo: non introduce soluzioni estranee."
      };
    }
  };
  var ruleDistribute = {
    id: "distribute",
    name: "Propriet\xE0 distributiva e sviluppo parentesi",
    principle: "Sviluppa le parentesi: a(b \xB1 c) = ab \xB1 ac, (A/B)\u207F = A\u207F/B\u207F, (\u221Ax)\xB2 = x.",
    explanation: "distribute",
    apply(eq, ctx5) {
      const { side } = ctx5;
      const side_expr = side === "left" ? eq.left : eq.right;
      const distributed = distribute(side_expr);
      const newEq = side === "left" ? Eq(distributed, eq.right) : Eq(eq.left, distributed);
      return {
        equation: simplify(newEq),
        conditions: [],
        steps: ["Applico lo sviluppo delle parentesi (propriet\xE0 distributiva di prodotti o potenze)."]
      };
    }
  };
  var ruleFactorCommon = {
    id: "factor-common",
    name: "Raccoglimento a fattor comune",
    principle: "ax + ab = a(x + b).",
    explanation: "factor-common",
    apply(eq, ctx5) {
      const { side, common } = ctx5;
      const expr = side === "left" ? eq.left : eq.right;
      const factored = factorOut(expr, common);
      if (!factored) {
        throw new RuleError("Il fattore indicato non \xE8 comune a tutti i termini del membro.");
      }
      const newEq = side === "left" ? Eq(factored, eq.right) : Eq(eq.left, factored);
      return {
        equation: newEq,
        conditions: [],
        steps: [`Raccolgo il fattore comune ${ctx5.commonText} tra i termini del membro.`]
      };
    }
  };
  var ruleCancelFactor = {
    id: "cancel-factor",
    name: "Cancellazione di un fattore comune tra frazione e prodotto",
    principle: "(a/b)\xB7b = a, purch\xE9 b \u2260 0 (semplificazione di un fattore comune)",
    explanation: "cancel-factor",
    apply(eq, ctx5) {
      const { den, side } = ctx5;
      const member = side === "left" ? eq.left : eq.right;
      const denNode = unwrap(den);
      const reduced = cancelFractionFactor(member, denNode);
      if (!reduced) {
        throw new RuleError(
          "Non trovo una frazione con questo denominatore moltiplicata per un fattore uguale: non c'\xE8 nulla da cancellare.",
          "Seleziona il denominatore della frazione che fa parte di un prodotto con lo stesso fattore."
        );
      }
      const newEq = side === "left" ? Eq(reduced, eq.right) : Eq(eq.left, reduced);
      return {
        equation: simplify(newEq),
        conditions: [conditionText(denNode, "\u2260 0")],
        steps: [
          `Semplifico il fattore ${ctx5.denText} tra numeratore e denominatore della frazione (${ctx5.denText} \u2260 0).`
        ]
      };
    }
  };
  var ruleInvertFunction = {
    id: "invert-function",
    name: "Applicazione della funzione inversa a entrambi i membri",
    principle: "Se A = B e f \xE8 iniettiva sul ramo considerato, allora f\u207B\xB9(A) = f\u207B\xB9(B).",
    explanation: "invert-function",
    apply(eq, ctx5) {
      const { side } = ctx5;
      const withFn = unwrapNeutrals(side === "left" ? eq.left : eq.right);
      const other = unwrapNeutrals(side === "left" ? eq.right : eq.left);
      const fnNode = ctx5.fnNode ? unwrapNeutrals(ctx5.fnNode) : extractFunc(withFn);
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
    explanation: "common-denom",
    apply(eq, ctx5 = {}) {
      const side = ctx5.side || null;
      const res = reduceEquationToCommonDenominator(eq, side);
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
  function distributePower(base, exp) {
    const uBase = unwrap(base);
    const uExp = unwrap(exp);
    if (uExp.type === "Num" && uExp.value === 1) {
      return distribute(uBase);
    }
    if (uBase.type === "Div") {
      const newNum = distributePower(uBase.num, uExp);
      const newDen = distributePower(uBase.den, uExp);
      return Div(newNum, newDen);
    }
    if (uBase.type === "Sqrt" && uExp.type === "Num" && uExp.value === 2) {
      return distribute(unwrap(uBase.arg));
    }
    if (uBase.type === "Sqrt" && uExp.type === "Num" && uExp.value % 2 === 0 && uExp.value > 2) {
      return distributePower(unwrap(uBase.arg), Num(uExp.value / 2));
    }
    if (uBase.type === "Mul") {
      return Mul(...uBase.args.map((a) => distributePower(a, uExp)));
    }
    if (uBase.type === "Num" && uExp.type === "Num") {
      if (uBase.value === 1) return Num(1);
      if (uBase.value === 0) return Num(0);
      if (Number.isInteger(uBase.value) && Number.isInteger(uExp.value) && uExp.value >= 0 && uExp.value <= 4) {
        return Num(Math.pow(uBase.value, uExp.value));
      }
    }
    if (uBase.type === "Neg") {
      if (uExp.type === "Num" && uExp.value % 2 === 0) {
        return distributePower(uBase.arg, uExp);
      }
      if (uExp.type === "Num" && uExp.value % 2 === 1) {
        return Neg(distributePower(uBase.arg, uExp));
      }
      return Pow(distribute(uBase), distribute(uExp));
    }
    if (uBase.type === "Pow" && uExp.type === "Num" && unwrap(uBase.exp).type === "Num") {
      return Pow(uBase.base, Num(unwrap(uBase.exp).value * uExp.value));
    }
    return Pow(distribute(uBase), distribute(uExp));
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
      case "Pow": {
        const uBase = unwrap(node.base);
        const uExp = unwrap(node.exp);
        if (uBase.type === "Div" || uBase.type === "Sqrt" || uBase.type === "Mul" || uBase.type === "Pow") {
          return distributePower(uBase, uExp);
        }
        return Pow(distribute(node.base), distribute(node.exp));
      }
      case "Sqrt":
        return Sqrt(distribute(node.arg));
      case "Neg":
        return Neg(distribute(node.arg));
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
    if (u.type === "Pow") {
      const b = unwrap(u.base);
      if (b.type === "Div" || b.type === "Sqrt" || b.type === "Mul" || b.type === "Pow") return true;
      return canDistribute(u.base) || canDistribute(u.exp);
    }
    if (u.type === "Sqrt") {
      return canDistribute(u.arg);
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
  function findCommonFactor(expr, preferredVar = null) {
    expr = unwrap(expr);
    if (!expr || expr.type !== "Add" && expr.type !== "Sub") return null;
    const terms = additiveTerms(expr);
    if (terms.length < 2) return null;
    if (preferredVar) {
      const prefNode = Var(preferredVar);
      if (factorOut(expr, prefNode)) return prefNode;
    }
    const firstFactors = getFactorsOfTerm(terms[0].node);
    for (const f of firstFactors) {
      if (factorOut(expr, f)) return f;
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
  function removeCommonFactor(expr, common) {
    expr = unwrap(expr);
    common = unwrap(common);
    if (equivalentExpr(expr, common)) return Num(1);
    if (expr.type === "Neg") {
      const inner = removeCommonFactor(expr.arg, common);
      return inner ? Neg(inner) : null;
    }
    if (expr.type === "Div") {
      const innerNum = removeCommonFactor(expr.num, common);
      if (!innerNum) return null;
      return Div(innerNum, expr.den);
    }
    if (expr.type === "Mul") {
      const idx = expr.args.findIndex((a) => equivalentExpr(a, common));
      if (idx >= 0) {
        const rest = expr.args.filter((_, i) => i !== idx);
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
    reciprocal: ruleReciprocalBothSides,
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
  function applyRule(rule, eq, ctx5 = {}) {
    try {
      if (rule.precondition) {
        const pre = rule.precondition(eq, ctx5);
        if (pre && pre.ok === false) {
          return { ok: false, error: pre.reason, hint: pre.hint };
        }
      }
      const res = rule.apply(eq, ctx5);
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
  function isGoalReached(eq, target) {
    if (!eq || eq.type !== "Eq" || !target) return false;
    const inL = collectVars(eq.left).has(target);
    const inR = collectVars(eq.right).has(target);
    if (inL && inR) return false;
    const leftIso = isolatedSide(eq.left, target);
    const rightIso = isolatedSide(eq.right, target);
    return leftIso && !inR || rightIso && !inL;
  }
  function ensureTargetOnFirstMember(eq, target) {
    if (!eq || eq.type !== "Eq" || !target) return eq;
    const inL = collectVars(eq.left).has(target);
    const inR = collectVars(eq.right).has(target);
    if (inL && inR) return eq;
    if (isolatedSide(eq.right, target) && !inL) {
      return Eq(eq.right, eq.left);
    }
    return eq;
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
  function whichSideHas(eq, target) {
    const inL = collectVars(eq.left).has(target);
    const inR = collectVars(eq.right).has(target);
    if (inL && inR) return "both";
    if (inL) return "left";
    if (inR) return "right";
    return null;
  }
  function enumerateElements(eq) {
    const out = [];
    walk(eq.left, "left", out, "left", { role: "membro" });
    walk(eq.right, "right", out, "right", { role: "membro" });
    return out;
  }
  function walk(node, side, out, id, ctx5) {
    node = unwrap(node);
    const item = {
      id,
      side,
      node,
      role: ctx5.role,
      parentRole: ctx5.parentRole || null,
      pretty: toPretty(node, 0)
    };
    out.push(item);
    const childCtx = (role) => ({ role, parentRole: ctx5.role });
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
        const innerRole = ctx5.role === "fattore" || ctx5.role === "termine" ? ctx5.role : "argomento";
        walk(node.arg, side, out, id + "/arg", childCtx(innerRole));
        break;
      }
      case "Group": {
        walk(node.arg, side, out, id + "/g", childCtx("gruppo"));
        break;
      }
    }
  }
  function findElement(eq, id) {
    if (id === "left" || id === "right") {
      const node = unwrap(id === "left" ? eq.left : eq.right);
      return { id, side: id, node, role: "membro", pretty: toPretty(node, 0) };
    }
    return enumerateElements(eq).find((e) => e.id === id) || null;
  }
  function findTargetCommonFactor(member, target) {
    if (!member || !target) return null;
    const terms = additiveTerms(member);
    if (terms.length < 2) return null;
    const candidates = [];
    function extract(node) {
      node = unwrap(node);
      if (!node) return;
      if (node.type === "Neg") return extract(node.arg);
      if (node.type === "Div") return extract(node.num);
      if (node.type === "Mul") {
        for (const a of node.args) extract(a);
        return;
      }
      if (node.type === "Pow") {
        const b = unwrap(node.base);
        if (b.type === "Var" && b.name === target) {
          candidates.push(node);
          candidates.push(b);
        }
        return;
      }
      if (node.type === "Var" && node.name === target) {
        candidates.push(node);
        return;
      }
    }
    const targetTerms = terms.filter((t) => collectVars(t.node).has(target));
    for (const t of targetTerms) {
      extract(t.node);
    }
    for (const cand of candidates) {
      if (factorOut(member, cand)) return cand;
    }
    return null;
  }
  function availableActions(eq, element, target) {
    if (!element) return [];
    const actions = [];
    const node = unwrap(element.node);
    const side = element.side;
    const otherSide = side === "left" ? "right" : "left";
    const nodeText = toPretty(node, 0);
    if (element.role === "termine" || element.role === "membro") {
      const terms = additiveTerms(side === "left" ? eq.left : eq.right);
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
      const member2 = side === "left" ? eq.left : eq.right;
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
    const fnNode = funcNodeOf(element, side, eq);
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
    const member = side === "left" ? eq.left : eq.right;
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
    const memberCommon = findCommonFactor(member, target) || findTargetCommonFactor(member, target) || findCommonFactor(member, null);
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
    if (canReduceToSingleFraction(element.node) || canReduceToSingleFraction(member)) {
      const sideName = side === "left" ? "primo" : "secondo";
      actions.push({
        id: "common-denom",
        label: `Calcola il minimo comune multiplo (m.c.m.) al ${sideName} membro`,
        description: "Somma frazioni e numeri allo stesso denominatore comune (m.c.m.).",
        ruleKey: "commonDenom",
        build: () => ({ side })
      });
    }
    return actions;
  }
  function globalActions(eq, target) {
    const actions = [];
    if (canReduceToSingleFraction(eq.left) || canReduceToSingleFraction(eq.right)) {
      actions.push({
        id: "common-denom",
        label: "Calcola il minimo comune multiplo (m.c.m.)",
        description: "Somma frazioni e numeri allo stesso denominatore comune (m.c.m.).",
        ruleKey: "commonDenom",
        build: () => ({})
      });
    }
    actions.push({
      id: "swap",
      label: "Scambia i membri (propriet\xE0 simmetrica)",
      description: "Se A = B allora B = A.",
      ruleKey: "swapSides",
      build: () => ({})
    });
    const L = unwrap(eq.left).type === "Div";
    const R = unwrap(eq.right).type === "Div";
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
    const distSide = canDistribute(eq.right) ? "right" : canDistribute(eq.left) ? "left" : null;
    if (distSide) {
      actions.push({
        id: "distribute",
        label: `Sviluppa le parentesi al ${distSide === "left" ? "primo" : "secondo"} membro`,
        description: "Applica la propriet\xE0 distributiva a(b \xB1 c) = ab \xB1 ac.",
        ruleKey: "distribute",
        build: () => ({ side: distSide })
      });
    }
    const commonFactorLeft = findCommonFactor(eq.left, target) || findTargetCommonFactor(eq.left, target) || findCommonFactor(eq.left, null);
    const commonFactorRight = findCommonFactor(eq.right, target) || findTargetCommonFactor(eq.right, target) || findCommonFactor(eq.right, null);
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
  function performAction(eq, action, extraCtx = {}) {
    const rule = RULES[action.ruleKey];
    if (!rule) return { ok: false, error: `Regola sconosciuta: ${action.ruleKey}` };
    const ctx5 = { ...action.build(extraCtx), ...extraCtx };
    const res = applyRule(rule, eq, ctx5);
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
  function funcNodeOf(element, side, eq) {
    const node = unwrap(element.node);
    const isInvertible = (n) => ["Sin", "Cos", "Tan", "Ln"].includes(n.type);
    if (isInvertible(node)) return node;
    if (typeof element.id === "string" && element.id.endsWith("/arg")) {
      const parentId = element.id.slice(0, -4);
      const parent = findElement(eq, parentId);
      if (parent && isInvertible(unwrap(parent.node))) return unwrap(parent.node);
    }
    const member = side === "left" ? eq.left : eq.right;
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
      return u.args.some((a) => hasDistributableSum(a, target));
    }
    if (u.type === "Pow") {
      const b = unwrap(u.base);
      if ((b.type === "Div" || b.type === "Sqrt" || b.type === "Mul" || b.type === "Pow") && collectVars(b).has(target)) {
        return true;
      }
      return hasDistributableSum(u.base, target);
    }
    if (u.type === "Sqrt") {
      return hasDistributableSum(u.arg, target);
    }
    if (u.type === "Div") {
      return hasDistributableSum(u.num, target) || hasDistributableSum(u.den, target);
    }
    if (u.type === "Add" || u.type === "Sub") {
      return u.args.some((a) => hasDistributableSum(a, target));
    }
    return false;
  }
  function suggestNextStep(eq, target) {
    if (isGoalReached(eq, target)) {
      if (isolatedSide(eq.right, target) && !isolatedSide(eq.left, target)) {
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
    const canL = findCancellableFactor(eq.left);
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
    const canR = findCancellableFactor(eq.right);
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
    const side = whichSideHas(eq, target);
    if (side === "both") {
      const rightTerms = additiveTerms(eq.right);
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
      const leftTerms = additiveTerms(eq.left);
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
      const distSide = isDistributable(eq.right) ? "right" : isDistributable(eq.left) ? "left" : null;
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
    const member = side === "left" ? eq.left : eq.right;
    const other = side === "left" ? eq.right : eq.left;
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
    if (canReduceToSingleFraction(other)) {
      const sideName = side === "left" ? "secondo" : "primo";
      return {
        found: true,
        action: {
          id: "common-denom",
          label: `Calcola il minimo comune multiplo (m.c.m.) al ${sideName} membro`,
          description: "Somma le frazioni a denominatore comune per ottenere un'unica frazione canonica.",
          ruleKey: "commonDenom",
          build: () => ({ side: side === "left" ? "right" : "left" })
        },
        reason: `Al ${sideName} membro c'\xE8 una somma di frazioni: calcola il minimo comune multiplo (m.c.m.) per trasformarla in una singola frazione canonica.`
      };
    }
    const memberTerms = additiveTerms(member);
    const hasStrangeTerms = memberTerms.length > 1 && memberTerms.some((t) => !collectVars(t.node).has(target));
    if (!hasStrangeTerms && canReduceToSingleFraction(member)) {
      const sideName = side === "left" ? "primo" : "secondo";
      return {
        found: true,
        action: {
          id: "common-denom",
          label: `Calcola il minimo comune multiplo (m.c.m.) al ${sideName} membro`,
          description: "Somma le frazioni a denominatore comune per ottenere un'unica frazione canonica.",
          ruleKey: "commonDenom",
          build: () => ({ side })
        },
        reason: `Al ${sideName} membro c'\xE8 una somma di frazioni: calcola il minimo comune multiplo (m.c.m.) per trasformarla in una singola frazione canonica.`
      };
    }
    if (mU.type === "Div" && unwrap(mU.num).type === "Num" && unwrap(mU.num).value === 1 && unwrap(mU.den).type === "Var" && unwrap(mU.den).name === target) {
      const otherU = unwrap(other);
      if (otherU.type === "Div") {
        return {
          found: true,
          action: {
            id: "reciprocal",
            label: "Inverti entrambi i membri (regola del reciproco)",
            description: `Da 1/${target} = A/B si ottiene ${target} = B/A invertendo numeratore e denominatore su entrambi i membri.`,
            ruleKey: "reciprocalBoth",
            build: () => ({})
          },
          reason: `L'incognita ${target} si trova al denominatore della frazione 1/${target} e l'altro membro \xE8 una frazione: applica la regola del reciproco per portarla subito al numeratore.`
        };
      }
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
      const commonTarget = findTargetCommonFactor(member, target);
      if (commonTarget) {
        const cText = toPretty(commonTarget, 0);
        return {
          found: true,
          action: {
            id: "factor-common",
            label: `Raccogli ${cText} a fattor comune`,
            description: `Metti in evidenza ${cText}, presente in tutti i termini del membro.`,
            ruleKey: "factorCommon",
            build: () => ({ common: commonTarget, side, commonText: cText })
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
  function equationKeypadTokens(eq) {
    const letters = [...collectVars(eq)].sort();
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
    walk2(eq);
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
  function applySqrtBothSides(eq, targetVar) {
    const side = targetVar ? whichSideHas(eq, targetVar) : null;
    if (side === "left" || side === "right") {
      const res = applyRule(RULES.sqrtBoth, eq, { side, insideVar: targetVar });
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
    for (const member of [eq.left, eq.right]) {
      const constM = evalConst(member);
      if (constM.ok && constM.value < 0) {
        return {
          ok: false,
          error: "Non si pu\xF2 estrarre una radice di indice pari da un radicando strettamente negativo nel campo reale.",
          hint: "L'equazione non ammette soluzioni reali."
        };
      }
    }
    for (const member of [eq.left, eq.right]) {
      if (evenPowerOf(member) !== null) {
        return {
          ok: false,
          error: "Un membro \xE8 una potenza a esponente pari: la radice va presa con la regola dedicata, che introduce il segno \xB1, perch\xE9 \u221A(x\xB2) = |x|.",
          hint: `Seleziona prima la potenza nell'area di lavoro e usa l'azione "Estrai la radice", oppure isola la potenza su un membro.`
        };
      }
    }
    const newEq = canonical(Eq(Sqrt(eq.left), Sqrt(eq.right)));
    return {
      ok: true,
      equation: newEq,
      conditions: [conditionText(eq.left, "\u2265 0"), conditionText(eq.right, "\u2265 0")],
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
  function applyInverseTrigBothSides(eq, opId, targetVar) {
    const info = TRIG_OPS[opId];
    if (!info) return { ok: false, error: `Operazione trigonometrica sconosciuta: ${opId}.` };
    const leftU = unwrapNeutrals(eq.left);
    const rightU = unwrapNeutrals(eq.right);
    const leftIsTrig = leftU.type === info.trigType;
    const rightIsTrig = rightU.type === info.trigType;
    let side = null;
    let fnNode = null;
    if (leftIsTrig && rightIsTrig) {
      const sideHas = targetVar ? whichSideHas(eq, targetVar) : null;
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
      const res = applyRule(RULES.invertFunction, eq, { side, fnNode });
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
    const containsInEq = nodeContainsType(eq.left, info.trigType) || nodeContainsType(eq.right, info.trigType);
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
  function applyKeypadOperation(eq, opId, operandNode, operandText, targetVar) {
    if (!eq || eq.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione su cui operare." };
    }
    if (opId === "sqrt") return applySqrtBothSides(eq, targetVar);
    if (opId === "asin" || opId === "acos" || opId === "atan") {
      return applyInverseTrigBothSides(eq, opId, targetVar);
    }
    const ruleKey = RULE_BY_OP[opId];
    if (!ruleKey) return { ok: false, error: `Operazione sconosciuta: ${opId}.` };
    if (!operandNode) return { ok: false, error: "Scegli prima una grandezza o un numero." };
    const res = applyRule(RULES[ruleKey], eq, { value: operandNode, valueText: operandText });
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
  function crossCancelAdditive(eq, idA, idB) {
    const a = analyseAdditiveId(idA);
    const b = analyseAdditiveId(idB);
    if (!a || !b) return null;
    const memberA = a.side === "left" ? eq.left : eq.right;
    const memberB = b.side === "left" ? eq.left : eq.right;
    const nodeA = a.segs.length === 0 ? unwrap(memberA) : nodeAtSegments(memberA, a.segs);
    const nodeB = b.segs.length === 0 ? unwrap(memberB) : nodeAtSegments(memberB, b.segs);
    if (!nodeA || !nodeB) return null;
    const effA = a.sign > 0 ? canonical(nodeA) : canonical(Neg(nodeA));
    const effB = b.sign > 0 ? canonical(nodeB) : canonical(Neg(nodeB));
    if (a.side === b.side) {
      if (!equivalentExpr(effA, canonical(Neg(effB)))) {
        if (equivalentExpr(effA, effB)) {
          const termName = toPretty(effA, 0);
          return {
            ok: false,
            error: `Due termini con lo stesso segno nella stessa somma non si annullano, ma si sommano: ${termName} + ${termName} = 2\xB7${termName}! Si annullano solo termini opposti (con segno contrario, come +${termName} e \u2212${termName}).`,
            hint: `Puoi cancellare due termini nella stessa somma solo se uno ha segno + e l'altro ha segno \u2212.`
          };
        }
        return null;
      }
      const flatTerms = additiveTerms(canonical(memberA));
      const after1 = removeByEff(flatTerms, effA);
      if (!after1) return null;
      const after2 = removeByEff(after1, effB);
      if (!after2) return null;
      const newMember = after2.length === 0 ? Num(0) : canonical(rebuildSum(after2));
      const newEq2 = canonical(a.side === "left" ? Eq(newMember, eq.right) : Eq(eq.left, newMember));
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
  function crossCancel(eq, idA, idB) {
    if (!eq || eq.type !== "Eq") {
      return { ok: false, error: "Nessuna equazione su cui semplificare." };
    }
    if (idA === idB) {
      return { ok: false, error: "Hai indicato due volte lo stesso elemento." };
    }
    const a = analyseElementId(idA);
    const b = analyseElementId(idB);
    if (!a || !b) {
      const addResult = crossCancelAdditive(eq, idA, idB);
      if (addResult) return addResult;
      const partsA = String(idA || "").split("/");
      const partsB = String(idB || "").split("/");
      if (partsA[0] === partsB[0] && (partsA[0] === "left" || partsA[0] === "right")) {
        const sideKey = partsA[0];
        const member2 = eq[sideKey];
        const hasSumA = partsA.some((s) => /^(Add|Sub)\d+$/.test(s));
        const hasSumB = partsB.some((s) => /^(Add|Sub)\d+$/.test(s));
        const hasNumA = partsA.includes("num");
        const hasNumB = partsB.includes("num");
        const hasDenA = partsA.includes("den");
        const hasDenB = partsB.includes("den");
        if ((hasSumA || hasSumB) && (hasNumA && hasDenB || hasDenA && hasNumB)) {
          const nodeA2 = nodeAtSegments(member2, partsA.slice(1));
          const nodeB2 = nodeAtSegments(member2, partsB.slice(1));
          const txtA = nodeA2 ? toPretty(nodeA2, 0) : "questo termine";
          const txtB = nodeB2 ? toPretty(nodeB2, 0) : "il denominatore";
          return {
            ok: false,
            error: `Cancellazione illecita su una somma: non puoi semplificare un addendo con il denominatore! In una frazione puoi semplificare solo fattori che moltiplicano l'INTERO numeratore e denominatore, MAI singoli termini di una somma. Semplificare "${txtA}" con "${txtB}" violerebbe la propriet\xE0 distributiva della divisione.`,
            hint: `Per semplificare una frazione, raccogli prima un fattore comune a tutti i termini se possibile (es. a\xB7(1 + b/a)), oppure separa la frazione nella somma di due frazioni distinte.`
          };
        }
      }
      return {
        ok: false,
        error: "Seleziona: \u2460  un fattore al numeratore e uno uguale al denominatore della stessa frazione, oppure \u2461 due termini opposti (es. a e \u2212a) della stessa somma, oppure \u2462 la stessa grandezza su entrambi i membri.",
        hint: "Trascina la croce su fattori uguali (num./den.), su termini opposti, o sulla stessa grandezza a entrambi i lati."
      };
    }
    if (a.side !== b.side) {
      const addResult = crossCancelAdditive(eq, idA, idB);
      if (addResult) return addResult;
      return {
        ok: false,
        error: "I due fattori di una frazione devono stare nello stesso membro. Per cancellare la stessa grandezza su entrambi i lati, selezionala come termine additivo.",
        hint: "Semplifica un fattore al numeratore e uno al denominatore dello stesso membro."
      };
    }
    const member = a.side === "left" ? eq.left : eq.right;
    const nodeA = nodeAtSegments(member, a.segments);
    const nodeB = nodeAtSegments(member, b.segments);
    if (!nodeA || !nodeB) {
      return { ok: false, error: "Elemento non trovato nell'equazione." };
    }
    let matchDirect = equivalentExpr(nodeA, nodeB);
    let powerReduction = null;
    if (!matchDirect) {
      const uA = unwrap(nodeA);
      const uB = unwrap(nodeB);
      if (uB.type === "Pow" && uB.exp && uB.exp.type === "Num" && Number.isInteger(uB.exp.value) && uB.exp.value > 1 && equivalentExpr(nodeA, uB.base)) {
        matchDirect = true;
        powerReduction = {
          powerEntry: b,
          baseEntry: a,
          baseNode: uB.base,
          newExp: uB.exp.value - 1
        };
      } else if (uA.type === "Pow" && uA.exp && uA.exp.type === "Num" && Number.isInteger(uA.exp.value) && uA.exp.value > 1 && equivalentExpr(nodeB, uA.base)) {
        matchDirect = true;
        powerReduction = {
          powerEntry: a,
          baseEntry: b,
          baseNode: uA.base,
          newExp: uA.exp.value - 1
        };
      }
    }
    if (!matchDirect) {
      return {
        ok: false,
        error: `I due elementi non sono uguali, quindi non si semplificano: ${toPretty(nodeA, 0)} \u2260 ${toPretty(nodeB, 0)}.`,
        hint: "Si semplificano solo fattori identici (o potenze della stessa base, es. c con c\xB2)."
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
    if (powerReduction) {
      const replacement = powerReduction.newExp === 1 ? powerReduction.baseNode : Pow(powerReduction.baseNode, Num(powerReduction.newExp));
      const afterBase = removeAt(member, powerReduction.baseEntry.segments);
      if (afterBase.ok) {
        simplifiedNode = rebuildAlongPath(afterBase.node, powerReduction.powerEntry.segments, replacement);
      }
    }
    if (!simplifiedNode) {
      const afterNum2 = removeAt(member, numEntry.segments);
      if (afterNum2.ok) {
        const afterBoth = removeAt(afterNum2.node, denEntry.segments);
        if (afterBoth.ok) simplifiedNode = afterBoth.node;
      }
    }
    if (!simplifiedNode) {
      const afterDen2 = removeAt(member, denEntry.segments);
      if (afterDen2.ok) {
        const afterBoth2 = removeAt(afterDen2.node, numEntry.segments);
        if (afterBoth2.ok) simplifiedNode = afterBoth2.node;
      }
    }
    if (!simplifiedNode) {
      const viaFraction = cancelFractionFactor(member, nodeA);
      if (viaFraction) simplifiedNode = viaFraction;
    }
    if (!simplifiedNode) {
      if (afterNum && !afterNum.ok && afterNum.error && afterNum.error.includes("solo i fattori") || afterDen && !afterDen.ok && afterDen.error && afterDen.error.includes("solo i fattori")) {
        return {
          ok: false,
          error: "Cancellazione illecita su una somma: non si pu\xF2 semplificare un addendo con il denominatore! In algebra la semplificazione riguarda solo i fattori di prodotti e frazioni.",
          hint: "Raccogli prima a fattor comune se possibile, oppure riscrivi come somma di frazioni distinte."
        };
      }
      return { ok: false, error: "Impossibile completare la semplificazione di questi elementi." };
    }
    const simplified = canonical(simplifiedNode);
    const newEq = canonical(a.side === "left" ? Eq(simplified, eq.right) : Eq(eq.left, simplified));
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
  function getCompoundFractionSteps(eq, targetVar) {
    if (!eq || eq.type !== "Eq" || !targetVar) return null;
    let targetSide = null;
    let resultSide = null;
    const inL = collectVars(eq.left).has(targetVar);
    const inR = collectVars(eq.right).has(targetVar);
    if (inL && inR) return null;
    if (isolatedSide(eq.left, targetVar) && !inR) {
      targetSide = "left";
      resultSide = "right";
    } else if (isolatedSide(eq.right, targetVar) && !inL) {
      targetSide = "right";
      resultSide = "left";
    } else {
      return null;
    }
    const resNode = eq[resultSide];
    if (!hasCompoundFraction(resNode)) return null;
    const step1Eq = clone(eq);
    const step2ResNode = transformToReciprocalMul(clone(resNode));
    const step2Eq = targetSide === "left" ? Eq(eq.left, step2ResNode) : Eq(step2ResNode, eq.right);
    let step3ResNode = canonical(clone(step2ResNode));
    while (hasCompoundFraction(step3ResNode)) {
      step3ResNode = canonical(transformToReciprocalMul(step3ResNode));
    }
    const targetNode = targetSide === "left" ? eq.left : eq.right;
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
      isolate: ["x", "x0", "v0", "a"],
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
      isolate: ["theta", "theta0", "omega0", "alpha"],
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
      formula: "1/R_eq = 1/R_1 + 1/R_2",
      isolate: ["R_eq", "R_1", "R_2"],
      difficulty: 3,
      aliases: ["1/Req = 1/R1 + 1/R2", "Req = (R1*R2)/(R1 + R2)"],
      conditions: ["R_eq \u2260 0", "R_1 \u2260 0", "R_2 \u2260 0"],
      hypotheses: "Due resistori collegati in parallelo; la tensione \xE8 uguale ai capi di entrambi.",
      notes: "Formula fondamentale dei resistori in parallelo. Si usa il minimo comune multiplo (m.c.m.) per sommare le frazioni e poi la regola del reciproco per isolare l'incognita."
    },
    {
      id: "resistori-parallelo-equivalente",
      topic: "circuiti elettrici",
      name: "resistori in parallelo (formula ridotta)",
      formula: "Req = (R1*R2)/(R1 + R2)",
      isolate: ["Req", "R1", "R2"],
      difficulty: 3,
      conditions: ["R1 + R2 \u2260 0"],
      notes: "Forma a frazione singola della resistenza equivalente di due resistori in parallelo."
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
      formula: "1/C_eq = 1/C_1 + 1/C_2",
      isolate: ["C_eq", "C_1", "C_2"],
      difficulty: 3,
      aliases: ["1/Ceq = 1/C1 + 1/C2", "Ceq = (C1*C2)/(C1 + C2)"],
      conditions: ["C_eq \u2260 0", "C_1 \u2260 0", "C_2 \u2260 0"],
      notes: "Formula fondamentale per due condensatori in serie."
    },
    {
      id: "condensatori-serie-equivalente",
      topic: "circuiti elettrici",
      name: "condensatori in serie (formula ridotta)",
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
    },
    // ============================ ASTROFISICA E LEGGI DI KEPLERO ============================
    {
      id: "legge-hubble",
      topic: "astrofisica",
      name: "legge di Hubble (espansione cosmica)",
      formula: "v = H0*d",
      isolate: ["v", "H0", "d"],
      difficulty: 2,
      conditions: ["d > 0"],
      hypotheses: "Universo omogeneo e isotropo su larga scala; H0 \xE8 la costante di Hubble.",
      latex: "v = H_0 \\cdot d"
    },
    {
      id: "raggio-schwarzschild",
      topic: "astrofisica",
      name: "raggio di Schwarzschild (buco nero statico)",
      formula: "Rs = (2*G*M)/c^2",
      isolate: ["Rs", "G", "M", "c"],
      difficulty: 4,
      conditions: ["c \u2260 0"],
      hypotheses: "Relativit\xE0 generale; buco nero a simmetria sferica non rotante.",
      latex: "R_s = \\frac{2 \\cdot G \\cdot M}{c^2}"
    },
    {
      id: "luminosita-stellare",
      topic: "astrofisica",
      name: "luminosit\xE0 stellare (Stefan-Boltzmann)",
      formula: "L = 4*pi*R^2*sigma*T^4",
      isolate: ["L", "R", "sigma", "T"],
      difficulty: 4,
      conditions: ["R > 0", "T > 0"],
      hypotheses: "Stella considerata corpo nero sferico di raggio R e temperatura superficiale T.",
      latex: "L = 4 \\cdot \\pi \\cdot R^2 \\cdot \\sigma \\cdot T^4"
    },
    {
      id: "legge-wien",
      topic: "astrofisica",
      name: "legge dello spostamento di Wien",
      formula: "lam_max*T = b",
      isolate: ["lam_max", "T", "b"],
      difficulty: 2,
      conditions: ["T > 0"],
      hypotheses: "Emissione di corpo nero; b \xE8 la costante dello spostamento di Wien.",
      latex: "\\lambda_{\\text{max}} \\cdot T = b"
    },
    {
      id: "redshift-astronomico",
      topic: "astrofisica",
      name: "parametro di redshift cosmologico (z)",
      formula: "z = (lam - lam0)/lam0",
      isolate: ["z", "lam", "lam0"],
      difficulty: 3,
      conditions: ["lam0 > 0"],
      hypotheses: "lam \xE8 la lunghezza d'onda osservata, lam0 quella emessa a riposo dalla sorgente.",
      latex: "z = \\frac{\\lambda - \\lambda_0}{\\lambda_0}"
    },
    {
      id: "luminosita-eddington",
      topic: "astrofisica",
      name: "luminosit\xE0 limite di Eddington",
      formula: "L_edd = (4*pi*G*M*c)/kappa",
      isolate: ["L_edd", "G", "M", "c", "kappa"],
      difficulty: 4,
      conditions: ["kappa \u2260 0"],
      hypotheses: "Equilibrio idrostatico tra spinta di radiazione e attrazione gravitazionale.",
      latex: "L_{\\text{edd}} = \\frac{4 \\cdot \\pi \\cdot G \\cdot M \\cdot c}{\\kappa}"
    },
    {
      id: "energia-orbitale-keplero",
      topic: "astrofisica",
      name: "energia orbitale (orbita ellittica)",
      formula: "E = -(G*M*m)/(2*a)",
      isolate: ["E", "G", "M", "m", "a"],
      difficulty: 4,
      conditions: ["a > 0"],
      hypotheses: "Moto in campo gravitazionale centrale newtoniano con semiasse maggiore a.",
      latex: "E = -\\frac{G \\cdot M \\cdot m}{2 \\cdot a}"
    },
    {
      id: "keplero-3-masse",
      topic: "astrofisica",
      name: "terza legge di Keplero generalizzata (due corpi)",
      formula: "T^2 = (4*pi^2*a^3)/(G*(M1 + M2))",
      isolate: ["T", "a", "G", "M1", "M2"],
      difficulty: 5,
      conditions: ["G*(M1 + M2) \u2260 0"],
      hypotheses: "Due masse M1 e M2 in moto orbitale attorno al baricentro comune.",
      latex: "T^2 = \\frac{4 \\cdot \\pi^2 \\cdot a^3}{G \\cdot (M_1 + M_2)}"
    },
    {
      id: "equazione-vis-viva",
      topic: "astrofisica",
      name: "equazione vis-viva (velocit\xE0 orbitale)",
      formula: "v^2 = G*M*(2/r - 1/a)",
      isolate: ["v", "G", "M", "r", "a"],
      difficulty: 5,
      conditions: ["r > 0", "a > 0"],
      hypotheses: "Conservazione dell'energia in orbita ellittica kepleriana attorno alla massa centrale M.",
      latex: "v^2 = G \\cdot M \\cdot \\left(\\frac{2}{r} - \\frac{1}{a}\\right)"
    },
    {
      id: "velocita-areale-keplero",
      topic: "astrofisica",
      name: "velocit\xE0 areale (seconda legge di Keplero)",
      formula: "v_area = L/(2*m)",
      isolate: ["v_area", "L", "m"],
      difficulty: 3,
      conditions: ["m \u2260 0"],
      hypotheses: "Moto sotto forza centrale con conservazione del momento angolare L.",
      latex: "v_{\\text{area}} = \\frac{L}{2 \\cdot m}"
    },
    // ============================ OTTICA ONDULATORIA ============================
    {
      id: "young-frange",
      topic: "ottica",
      name: "interfrangia di Young (doppia fenditura)",
      formula: "Delta_y = (lam*L)/d",
      isolate: ["Delta_y", "lam", "L", "d"],
      difficulty: 3,
      conditions: ["d \u2260 0"],
      hypotheses: "Interferenza a due fenditure con distanza schermo L molto maggiore del passo d.",
      latex: "\\Delta y = \\frac{\\lambda \\cdot L}{d}"
    },
    {
      id: "diffrazione-singola-fenditura",
      topic: "ottica",
      name: "diffrazione da singola fenditura (minimi)",
      formula: "a*sin(theta) = m*lam",
      isolate: ["a", "theta", "m", "lam"],
      difficulty: 4,
      conditions: ["a > 0"],
      hypotheses: "Minimi di diffrazione da fenditura lineare di larghezza a; m intero non nullo.",
      latex: "a \\cdot \\sin(\\theta) = m \\cdot \\lambda"
    },
    {
      id: "reticolo-diffrazione",
      topic: "ottica",
      name: "reticolo di diffrazione (massimi principali)",
      formula: "d*sin(theta) = m*lam",
      isolate: ["d", "theta", "m", "lam"],
      difficulty: 4,
      conditions: ["d > 0"],
      hypotheses: "Passo del reticolo d; m \xE8 l'ordine del massimo di interferenza.",
      latex: "d \\cdot \\sin(\\theta) = m \\cdot \\lambda"
    },
    {
      id: "criterio-rayleigh",
      topic: "ottica",
      name: "criterio di Rayleigh (risoluzione angolare)",
      formula: "theta = (1.22*lam)/D",
      isolate: ["theta", "lam", "D"],
      difficulty: 3,
      conditions: ["D > 0"],
      hypotheses: "Diffrazione da apertura circolare di diametro D (disco di Airy).",
      latex: "\\theta = \\frac{1.22 \\cdot \\lambda}{D}"
    },
    {
      id: "legge-malus",
      topic: "ottica",
      name: "legge di Malus (polarizzazione)",
      formula: "I = I0*cos(theta)^2",
      isolate: ["I", "I0", "theta"],
      difficulty: 4,
      conditions: [],
      hypotheses: "Luce polarizzata linearmente incidente con intensit\xE0 I0 su filtro analizzatore inclinato di theta.",
      latex: "I = I_0 \\cdot \\cos^2(\\theta)"
    },
    {
      id: "legge-brewster",
      topic: "ottica",
      name: "angolo di Brewster (polarizzazione per riflessione)",
      formula: "tan(thetaB) = n2/n1",
      isolate: ["thetaB", "n2", "n1"],
      difficulty: 4,
      conditions: ["n1 \u2260 0"],
      hypotheses: "Raggio riflesso totalmente polarizzato ortogonalmente al piano di incidenza.",
      latex: "\\tan(\\theta_B) = \\frac{n_2}{n_1}"
    },
    {
      id: "lamine-sottili-interferenza",
      topic: "ottica",
      name: "interferenza su lamine sottili (cammino ottico)",
      formula: "2*n*d = m*lam",
      isolate: ["n", "d", "m", "lam"],
      difficulty: 3,
      conditions: ["n \u2265 1"],
      hypotheses: "Riflessione quasi normale su pellicola di spessore d e indice di rifrazione n.",
      latex: "2 \\cdot n \\cdot d = m \\cdot \\lambda"
    },
    // ============================ CHIMICA GENERALE ============================
    // --- Gas Ideali e Reali ---
    {
      id: "gas-van-der-waals",
      topic: "chimica",
      name: "equazione di Van der Waals (gas reali)",
      formula: "(p + (a*n^2)/V^2)*(V - n*b) = n*R*T",
      isolate: ["p", "V", "n", "R", "T", "a", "b"],
      difficulty: 5,
      conditions: ["V > n*b", "V \u2260 0"],
      hypotheses: "Gas reale con attrazione molecolare (parametro a) e volume proprio (covolume b).",
      latex: "\\left(p + \\frac{a \\cdot n^2}{V^2}\\right) \\cdot (V - n \\cdot b) = n \\cdot R \\cdot T"
    },
    {
      id: "densita-gas-ideali",
      topic: "chimica",
      name: "densit\xE0 di un gas ideale",
      formula: "rho = (p*M)/(R*T)",
      isolate: ["rho", "p", "M", "R", "T"],
      difficulty: 3,
      conditions: ["R \u2260 0", "T > 0"],
      hypotheses: "M \xE8 la massa molare del gas, p la pressione e T la temperatura assoluta.",
      latex: "\\rho = \\frac{p \\cdot M}{R \\cdot T}"
    },
    {
      id: "legge-graham",
      topic: "chimica",
      name: "legge di Graham (velocit\xE0 di effusione)",
      formula: "v1/v2 = sqrt(M2/M1)",
      isolate: ["v1", "v2", "M1", "M2"],
      difficulty: 4,
      conditions: ["v2 \u2260 0", "M1 > 0"],
      hypotheses: "Rapporto di effusione tra due gas con masse molari M1 e M2 a pari T e p.",
      latex: "\\frac{v_1}{v_2} = \\sqrt{\\frac{M_2}{M_1}}"
    },
    {
      id: "legge-dalton",
      topic: "chimica",
      name: "legge di Dalton (pressione parziale)",
      formula: "Pi = xi*P_tot",
      isolate: ["Pi", "xi", "P_tot"],
      difficulty: 2,
      conditions: ["P_tot > 0"],
      hypotheses: "xi \xE8 la frazione molare del componente i-esimo in una miscela ideale di gas.",
      latex: "P_i = \\chi_i \\cdot P_{\\text{tot}}"
    },
    // --- Equilibri Acido-Base e pH ---
    {
      id: "ph-poh-relazione",
      topic: "chimica",
      name: "relazione tra pH e pOH",
      formula: "pH + pOH = 14",
      isolate: ["pH", "pOH"],
      difficulty: 2,
      conditions: [],
      hypotheses: "Soluzione acquosa a 25\xB0C (298.15 K), dove Kw = 1.0e-14 e pKw = 14.",
      latex: "\\text{pH} + \\text{pOH} = 14"
    },
    {
      id: "prodotto-ionico-acqua",
      topic: "chimica",
      name: "prodotto ionico dell'acqua (Kw)",
      formula: "Kw = H*OH",
      isolate: ["Kw", "H", "OH"],
      difficulty: 2,
      conditions: ["H > 0", "OH > 0"],
      hypotheses: "H e OH rappresentano le concentrazioni molari [H+] e [OH-].",
      latex: "K_w = [\\text{H}^+] \\cdot [\\text{OH}^-]"
    },
    {
      id: "costante-dissociazione-acida",
      topic: "chimica",
      name: "costante di dissociazione acida (Ka)",
      formula: "Ka = (H*A)/HA",
      isolate: ["Ka", "H", "A", "HA"],
      difficulty: 3,
      conditions: ["HA > 0"],
      hypotheses: "Equilibrio acido debole HA <=> H+ + A-; A rappresenta la base coniugata.",
      latex: "K_a = \\frac{[\\text{H}^+] \\cdot [\\text{A}^-]}{[\\text{HA}]}"
    },
    {
      id: "costante-dissociazione-basica",
      topic: "chimica",
      name: "costante di dissociazione basica (Kb)",
      formula: "Kb = (OH*BH)/B",
      isolate: ["Kb", "OH", "BH", "B"],
      difficulty: 3,
      conditions: ["B > 0"],
      hypotheses: "Equilibrio base debole B + H2O <=> BH+ + OH-; BH \xE8 l'acido coniugato.",
      latex: "K_b = \\frac{[\\text{OH}^-] \\cdot [\\text{BH}^+]}{[\\text{B}]}"
    },
    {
      id: "henderson-hasselbalch",
      topic: "chimica",
      name: "equazione di Henderson-Hasselbalch (tampone acido)",
      formula: "pH = pKa + ln(A/HA)/ln(10)",
      isolate: ["pH", "pKa", "A", "HA"],
      difficulty: 4,
      conditions: ["HA > 0", "A > 0"],
      hypotheses: "Soluzione tampone formata da acido debole HA e base coniugata A-.",
      latex: "\\text{pH} = \\text{p}K_a + \\frac{\\ln([\\text{A}^-]/[\\text{HA}])}{\\ln(10)}"
    },
    // --- Elettrochimica ed Equazione di Nernst ---
    {
      id: "nernst-generale",
      topic: "chimica",
      name: "equazione di Nernst (potenziale di cella)",
      formula: "E = E0 - ((R*T)/(z*F))*ln(Q)",
      isolate: ["E", "E0", "R", "T", "z", "F", "Q"],
      difficulty: 5,
      conditions: ["z \u2260 0", "F \u2260 0", "Q > 0"],
      hypotheses: "Potenziale di riduzione reale con quoziente di reazione Q e z elettroni scambiati.",
      latex: "E = E_0 - \\frac{R \\cdot T}{z \\cdot F} \\cdot \\ln(Q)"
    },
    {
      id: "nernst-298k",
      topic: "chimica",
      name: "equazione di Nernst a 25\xB0C (298 K)",
      formula: "E = E0 - (0.0257/z)*ln(Q)",
      isolate: ["E", "E0", "z", "Q"],
      difficulty: 4,
      conditions: ["z \u2260 0", "Q > 0"],
      hypotheses: "Condizioni standard a 298.15 K con fattore RT/F = 0.0257 V.",
      latex: "E = E_0 - \\frac{0.0257}{z} \\cdot \\ln(Q)"
    },
    {
      id: "gibbs-fem",
      topic: "chimica",
      name: "relazione tra energia libera di Gibbs e f.e.m.",
      formula: "Delta_G = -z*F*E",
      isolate: ["Delta_G", "z", "F", "E"],
      difficulty: 3,
      conditions: ["z \u2260 0", "F \u2260 0"],
      hypotheses: "Lavoro elettrico reversibile in cella elettrochimica; F \xE8 la costante di Faraday.",
      latex: "\\Delta G = -z \\cdot F \\cdot E"
    },
    // --- Molarità, Soluzioni e Proprietà Colligative ---
    {
      id: "molarita",
      topic: "chimica",
      name: "molarit\xE0 (concentrazione molare)",
      formula: "M = n/V",
      isolate: ["M", "n", "V"],
      difficulty: 2,
      conditions: ["V > 0"],
      hypotheses: "n \xE8 il numero di moli di soluto, V il volume della soluzione in litri (o m\xB3).",
      latex: "M = \\frac{n}{V}"
    },
    {
      id: "moli-massa-molare",
      topic: "chimica",
      name: "relazione tra moli e massa molare",
      formula: "n = m/MM",
      isolate: ["n", "m", "MM"],
      difficulty: 2,
      conditions: ["MM > 0"],
      hypotheses: "m \xE8 la massa del soluto, MM la sua massa molare.",
      latex: "n = \\frac{m}{MM}"
    },
    {
      id: "diluizione-soluzione",
      topic: "chimica",
      name: "legge di diluizione delle soluzioni",
      formula: "M1*V1 = M2*V2",
      isolate: ["M1", "V1", "M2", "V2"],
      difficulty: 3,
      conditions: ["M2 \u2260 0", "V2 \u2260 0"],
      hypotheses: "Aggiunta di solo solvente: la quantit\xE0 di soluto disciolto si conserva.",
      latex: "M_1 \\cdot V_1 = M_2 \\cdot V_2"
    },
    {
      id: "molalita",
      topic: "chimica",
      name: "molalit\xE0 della soluzione",
      formula: "m_mol = n/m_solv",
      isolate: ["m_mol", "n", "m_solv"],
      difficulty: 2,
      conditions: ["m_solv > 0"],
      hypotheses: "m_solv \xE8 la massa del solo solvente (in kg).",
      latex: "m_{\\text{mol}} = \\frac{n}{m_{\\text{solv}}}"
    },
    {
      id: "pressione-osmotica",
      topic: "chimica",
      name: "pressione osmotica (van 't Hoff)",
      formula: "Pi = i*M*R*T",
      isolate: ["Pi", "i", "M", "R", "T"],
      difficulty: 3,
      conditions: ["T > 0"],
      hypotheses: "Soluzione diluita; i \xE8 il coefficiente di van 't Hoff (fattore di ionizzazione).",
      latex: "\\Pi = i \\cdot M \\cdot R \\cdot T"
    },
    {
      id: "legge-raoult",
      topic: "chimica",
      name: "legge di Raoult (tensione di vapore)",
      formula: "P1 = x1*P0",
      isolate: ["P1", "x1", "P0"],
      difficulty: 2,
      conditions: ["0 \u2264 x1 \u2264 1"],
      hypotheses: "Soluzione ideale con soluto non volatile; P0 \xE8 la tensione di vapore del solvente puro.",
      latex: "P_1 = x_1 \\cdot P_0"
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
    "astrofisica",
    "chimica",
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
    keplero: ["keplero", "kepler", "orbita", "periodo orbitale", "pianeti", "vis-viva", "velocita areale", "semiasse"],
    snell: ["snell", "rifrazione", "ottica", "indice di rifrazione"],
    bernoulli: ["bernoulli", "idrodinamica", "fluido in moto"],
    pascal: ["pascal", "torchio idraulico", "pistone"],
    lorentz: ["lorentz", "relativita", "forza di lorentz"],
    faraday: ["faraday", "neumann", "lenz", "induzione", "flusso magnetico"],
    ampere: ["ampere", "biot savart", "campo magnetico"],
    carnot: ["carnot", "rendimento", "macchina termica"],
    onda: ["onda", "onde", "propagazione", "lunghezza d onda", "frequenza", "periodo", "suono"],
    onde: ["onda", "onde", "propagazione", "lunghezza d onda", "frequenza", "periodo", "suono"],
    hubble: ["hubble", "recessione", "espansione", "galassia", "galassie", "redshift", "costante di hubble"],
    astrofisica: ["astrofisica", "astronomia", "stella", "stelle", "buco nero", "schwarzschild", "eddington", "wien", "stefan boltzmann"],
    diffrazione: ["diffrazione", "reticolo", "singola fenditura", "rayleigh", "frange", "disco di airy"],
    interferenza: ["interferenza", "young", "doppia fenditura", "lamine sottili", "frangia", "frange"],
    chimica: ["chimica", "moli", "molarita", "gas ideali", "van der waals", "ph", "poh", "nernst", "soluzione", "tampone"],
    nernst: ["nernst", "elettrodo", "potenziale standard", "elettrochimica", "pila", "redox", "faraday"],
    ph: ["ph", "poh", "acido", "base", "dissociazione", "ka", "kb", "kw", "henderson", "hasselbalch", "tampone"],
    molarita: ["molarita", "concentrazione", "diluizione", "molalita", "soluzione", "soluto", "solvente"],
    gas: ["gas", "gas perfetti", "gas ideali", "gas reali", "van der waals", "dalton", "graham", "effusione"]
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
        "Vale SOLO per termini additivi liberi (ognuno preceduto da + o \u2212 al livello del membro), mai per fattori moltiplicativi.",
        "Non puoi trasportare direttamente un addendo racchiuso dentro una parentesi moltiplicata o bloccato al numeratore di una frazione: devi prima liberare la parentesi o eliminare il denominatore."
      ]
    },
    "move-factor": {
      nome: "Trasporto di un fattore (divisione per il fattore)",
      intuitiva: `Un fattore che moltiplica tutto un membro pu\xF2 "passare dall'altra parte" come divisore: \xE8 la stessa idea del "trasporto di fattori".`,
      principio: "Secondo principio di equivalenza (divisione di entrambi i membri per il fattore).",
      perche: "Dividiamo entrambi i membri per lo stesso fattore. Serve che il fattore sia diverso da zero.",
      attenzione: [
        "Puoi trasportare solo fattori che moltiplicano l'INTERO membro: MAI i singoli termini di una somma.",
        "La condizione di validit\xE0 richiede che il fattore sia \u2260 0 (la divisione per zero non \xE8 definita).",
        "Confusione comune: non cambiare il segno di un fattore quando lo porti al denominatore! Il cambio di segno vale solo per il 1\xB0 principio (addendi)."
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
      attenzione: [
        "Richiede che entrambi i membri siano \u2260 0.",
        "Attenzione all'errore classico: il reciproco di una somma NON \xE8 la somma dei reciproci! 1/(A + B) \u2260 1/A + 1/B.",
        "Se un membro contiene una somma di frazioni (come 1/R\u2081 + 1/R\u2082), calcola PRIMA il minimo comune multiplo (m.c.m.) per ridurla a un'unica frazione, e SOLO DOPO applica il reciproco."
      ]
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
        "Attenzione fondamentale: si pu\xF2 cancellare un fattore con un fattore (un prodotto), MAI un addendo di una somma con il denominatore! In (x + y)/x la x non \xE8 un fattore comune."
      ]
    },
    "common-denom": {
      nome: "Minimo comune multiplo (m.c.m.) e denominatore comune",
      intuitiva: "Per sommare o sottrarre frazioni con denominatori diversi, bisogna prima portarle allo stesso denominatore comune (m.c.m.). Una volta che le frazioni hanno lo stesso denominatore, puoi sommare i numeratori ottenendo un'unica frazione su cui \xE8 possibile applicare il reciproco o la moltiplicazione incrociata.",
      principio: "Propriet\xE0 invariantiva delle frazioni (moltiplicando numeratore e denominatore per una stessa quantit\xE0 non nulla il valore non cambia): A/B + C/D = (A\xB7D)/(B\xB7D) + (B\xB7C)/(B\xB7D) = (A\xB7D + B\xB7C)/(B\xB7D).",
      perche: "Non si possono sommare direttamente parti frazionarie eterogenee: il denominatore comune esprime ciascun termine nella stessa partizione, rendendo i numeratori direttamente sommabili in un unico rapporto.",
      attenzione: [
        "Passo fondamentale prima della regola dei reciproci: se hai 1/R = 1/R\u2081 + 1/R\u2082, NON puoi invertire i singoli addendi (R \u2260 R\u2081 + R\u2082)! Devi prima calcolare il denominatore comune.",
        "Tutti i denominatori devono essere non nulli (condizioni di esistenza)."
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
  var STUDENT_MISCONCEPTIONS = {
    "illegal-sum-cancellation": {
      id: "illegal-sum-cancellation",
      titolo: "Cancellazione illecita su una somma (Somma vs Prodotto)",
      badge: "Semplificazione Illecita (Somma vs Prodotto)",
      principio: "Propriet\xE0 distributiva della divisione: (A + B)/C = A/C + B/C \u2260 A + B/C.",
      spiegazione: "Non puoi semplificare un termine che fa parte di una somma con il denominatore. In algebra si possono semplificare solo fattori che moltiplicano l'INTERO numeratore e l'INTERO denominatore, MAI singoli addendi!",
      controesempio: 'Considera numeri semplici: (2 + 6)/2 = 8/2 = 4. Se cancellassi il "2" tra numeratore e denominatore otterresti 6 (oppure 1 + 6 = 7), entrambi palesemente errati! La frazione significa (2/2) + (6/2) = 1 + 3 = 4.',
      come_risolvere: "Per semplificare, raccogli prima il fattore comune a TUTTI i termini del numeratore (es. (2\xB7a + 2\xB7b)/2 = 2\xB7(a + b)/2 = a + b), oppure separa la frazione nella somma di due frazioni distinte.",
      regola_guida: "Si semplificano solo fattori di prodotti (a\xB7b/a = b), MAI addendi di somme ((a + b)/a \u2260 b)!"
    },
    "missing-common-denom-reciprocal": {
      id: "missing-common-denom-reciprocal",
      titolo: "Mancato denominatore comune prima del reciproco",
      badge: "Frazioni e Reciproci (m.c.m. necessario)",
      principio: "Non linearit\xE0 del reciproco: 1/(A + B) \u2260 1/A + 1/B.",
      spiegazione: "Il reciproco di una somma NON \xE8 la somma dei reciproci! Applicare la regola dei reciproci termine a termine (pensando che 1/R\u2081 + 1/R\u2082 diventi R\u2081 + R\u2082) \xE8 un errore concettuale grave.",
      controesempio: "Esempio numerico: 1/2 + 1/2 = 1 (il cui reciproco \xE8 1). Se capovolgessi i singoli addendi otterresti 2 + 2 = 4, che \xE8 quattro volte il risultato corretto! Nella formula dei resistori in parallelo: 1/Req = 1/R1 + 1/R2 non d\xE0 affatto Req = R1 + R2.",
      come_risolvere: "Calcola prima il minimo comune multiplo (m.c.m.) per sommare le frazioni in un unico rapporto: 1/R\u2081 + 1/R\u2082 = (R\u2082 + R\u2081)/(R\u2081\xB7R\u2082). Solo quando entrambi i membri sono frazioni singole puoi capovolgerli con la regola dei reciproci: Req = (R\u2081\xB7R\u2082)/(R\u2081 + R\u2082).",
      regola_guida: 'Usa il tasto "\u{1F9EE} Denominatore comune (m.c.m.)" per unire le frazioni prima di applicare il reciproco!'
    },
    "invalid-transposition-factor-as-term": {
      id: "invalid-transposition-factor-as-term",
      titolo: "Trasporto errato di un fattore con cambio di segno (confusione 1\xB0 e 2\xB0 principio)",
      badge: "1\xB0 vs 2\xB0 Principio (Fattori vs Addendi)",
      principio: "Secondo principio di equivalenza (divisione per grandezze moltiplicate).",
      spiegazione: "Hai provato a spostare una grandezza moltiplicativa cambiando segno (+ \u2194 \u2212). Il cambio di segno vale solo per gli addendi sommati o sottratti (1\xB0 principio), non per grandezze legate da moltiplicazione!",
      controesempio: 'In F = m\xB7a, se sottraessi "a" otterresti F \u2212 a = m\xB7a \u2212 a, non m isolata. In 3\xB7x = 12, sottraendo 3 otterresti 3x \u2212 3 = 9, non x = 9. La soluzione corretta \xE8 x = 12/3 = 4.',
      come_risolvere: "Per annullare una moltiplicazione devi applicare l'operazione inversa: dividi entrambi i membri per quel fattore (2\xB0 principio). Trascinalo sotto la linea di frazione del membro opposto.",
      regola_guida: "I termini sommati si trasportano cambiando segno (+ \u2194 \u2212), i fattori moltiplicati si trasportano dividendo (\xB7 \u2194 /)!"
    },
    "invalid-transposition-term-as-factor": {
      id: "invalid-transposition-term-as-factor",
      titolo: "Tentativo di dividere per un addendo di una somma",
      badge: "1\xB0 vs 2\xB0 Principio (Addendi vs Fattori)",
      principio: "Primo principio di equivalenza (trasporto con cambiamento di segno).",
      spiegazione: "Non puoi dividere per una grandezza che fa parte di una somma con altri termini. La divisione agisce sull'INTERO membro: dividere solo un pezzo violerebbe l'uguaglianza.",
      controesempio: "In v = v\u2080 + a\xB7t, se dividessi per v\u2080 otterresti v/v\u2080 = 1 + (a\xB7t)/v\u2080, non a\xB7t isolata! In x + 5 = 10, dividendo per 5 avresti x/5 + 1 = 2, non x = 2.",
      come_risolvere: "Trascina l'addendo nello slot \xB1 accanto al membro opposto per trasportarlo con cambio di segno (+v\u2080 diventa \u2212v\u2080): v \u2212 v\u2080 = a\xB7t. Solo quando la variabile moltiplicata \xE8 isolata potrai dividere per i suoi fattori.",
      regola_guida: "Se una grandezza \xE8 sommata, spostala all'altro membro cambiando segno con il 1\xB0 principio!"
    },
    "invalid-transposition-parenthesis-blocked": {
      id: "invalid-transposition-parenthesis-blocked",
      titolo: "Addendo bloccato dentro parentesi moltiplicate",
      badge: "Precedenza Operazioni (Parentesi moltiplicate)",
      principio: "Gerarchia delle operazioni e propriet\xE0 distributiva k\xB7(A + B) = k\xB7A + k\xB7B.",
      spiegazione: `Non puoi trasportare direttamente un termine racchiuso tra parentesi moltiplicate per un fattore esterno (es. "v\u2080" in F = k\xB7(v \u2212 v\u2080)). La moltiplicazione esterna vincola tutti i termini all'interno.`,
      controesempio: "In 2\xB7(x + 3) = 10, se spostassi il 3 come 10 \u2212 3 = 7 otterresti 2x = 7 (x = 3.5), mentre l'equazione originale \xE8 verificata per x = 2 (infatti 2\xB7(2 + 3) = 10)!",
      come_risolvere: "Hai due opzioni lecite: \u2460 dividere prima entrambi i membri per il fattore moltiplicativo esterno (liberando la parentesi), oppure \u2461 applicare la propriet\xE0 distributiva per sciogliere la parentesi e poi trasportare il termine.",
      regola_guida: "Prima libera la parentesi dividendo per il fattore esterno o distribuendo, poi trasporta i singoli addendi!"
    },
    "invalid-transposition-fraction-blocked": {
      id: "invalid-transposition-fraction-blocked",
      titolo: "Addendo bloccato al numeratore di una frazione",
      badge: "Precedenza Operazioni (Linea di frazione)",
      principio: "La linea di frazione funge da parentesi: (A + B)/C.",
      spiegazione: `Non puoi trasportare con cambio di segno un termine che si trova al numeratore di una frazione (es. "s\u2080" in v = (s \u2212 s\u2080)/t). L'intero numeratore \xE8 vincolato dalla divisione per il denominatore.`,
      controesempio: "In (x + 6)/2 = 5, se trasportassi il 6 otterresti x/2 = 5 \u2212 6 = \u22121 (x = \u22122), mentre moltiplicando prima per 2 si ha x + 6 = 10 \u2192 x = 4!",
      come_risolvere: "Elimina prima il denominatore moltiplicando entrambi i membri per esso (2\xB0 principio): v\xB7t = s \u2212 s\u2080. Successivamente potrai trasportare il termine con il 1\xB0 principio.",
      regola_guida: "Trascina prima il denominatore all'altro membro per moltiplicare, poi trasporta l'addendo con cambio di segno!"
    },
    "invalid-transposition-same-side": {
      id: "invalid-transposition-same-side",
      titolo: "Spostamento all'interno dello stesso membro",
      badge: "Principi di Equivalenza (Ambo i membri)",
      principio: "Definizione di equazione: uguaglianza tra due membri.",
      spiegazione: "La regola del trasporto e i principi di equivalenza servono a trasferire quantit\xE0 da un piatto all'altro della bilancia (oltre l'uguale). Muovere un elemento all'interno dello stesso piatto non applica i principi di equivalenza.",
      controesempio: "Spostare una grandezza al denominatore dello stesso membro trasformerebbe A in 1/A senza modificare l'altro membro: l'uguaglianza non sarebbe pi\xF9 vera.",
      come_risolvere: "Trascina la grandezza oltre il segno di uguale (=), rilasciandola sul membro opposto (sotto la frazione per dividere o nello slot \xB1 per trasportare il termine).",
      regola_guida: "Trascina sempre la grandezza oltre l'uguale (=) per operare sul membro opposto!"
    },
    "invalid-transposition-sign-error": {
      id: "invalid-transposition-sign-error",
      titolo: "Mancato cambiamento di segno nel trasporto",
      badge: "1\xB0 Principio (Regola dei Segni)",
      principio: "Primo principio di equivalenza (somma dell'opposto).",
      spiegazione: "Quando sposti un termine additivo all'altro membro, devi cambiare il suo segno (+ diventa \u2212, \u2212 diventa +). Trasportare non \xE8 un semplice spostamento: equivale a togliere o aggiungere la stessa quantit\xE0 su entrambi i piatti.",
      controesempio: "Se x + 3 = 7, togliendo 3 da ambo i piatti abbiamo x + 3 \u2212 3 = 7 \u2212 3, quindi x = 7 \u2212 3 = 4. Scrivere x = 7 + 3 = 10 violerebbe l'equilibrio di partenza!",
      come_risolvere: "Ricorda: ci\xF2 che \xE8 addizionato (+) a un membro passa all'altro membro sottratto (\u2212), e ci\xF2 che \xE8 sottratto (\u2212) passa addizionato (+).",
      regola_guida: "Regola del trasporto (1\xB0 principio): oltrepassando l'uguale, il termine inverte sempre il segno!"
    }
  };
  function getExplanation(key) {
    return EXPLANATIONS[key] || null;
  }
  function diagnoseStudentMisconception(errorText = "", hintText = "", action = null) {
    const errLow = String(errorText || "").toLowerCase();
    const hintLow = String(hintText || "").toLowerCase();
    const actLabel = action && action.label ? String(action.label).toLowerCase() : "";
    if (errLow.includes("cancellazione illecita") || errLow.includes("semplificare un fattore con un termine di una somma") || errLow.includes("non puoi semplificare un addendo") || errLow.includes("non \xE8 un fattore comune") || errLow.includes("semplificazione riguarda solo i fattori") || errLow.includes("due fattori nella stessa posizione") || errLow.includes("semplific") && errLow.includes("somma")) {
      const m = STUDENT_MISCONCEPTIONS["illegal-sum-cancellation"];
      return {
        category: "illegal-sum-cancellation",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText.length > 50 ? errorText : m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("reciproco di una somma") || errLow.includes("non \xE8 la somma dei reciproci") || errLow.includes("1/(a/b + c/d)") || actLabel.includes("reciproc") || errLow.includes("reciproco") && (errLow.includes("somma") || errLow.includes("m.c.m."))) {
      const m = STUDENT_MISCONCEPTIONS["missing-common-denom-reciprocal"];
      return {
        category: "missing-common-denom-reciprocal",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("all'interno della parentesi") || errLow.includes("parentesi (") || errLow.includes("moltiplicata per")) {
      const m = STUDENT_MISCONCEPTIONS["invalid-transposition-parenthesis-blocked"];
      return {
        category: "invalid-transposition-parenthesis-blocked",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("al numeratore della frazione") || errLow.includes("finch\xE9 si trova al numeratore") || errLow.includes("eliminare la frazione")) {
      const m = STUDENT_MISCONCEPTIONS["invalid-transposition-fraction-blocked"];
      return {
        category: "invalid-transposition-fraction-blocked",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("\xE8 un fattore che moltiplica") || errLow.includes("non \xE8 un termine additivo") || errLow.includes("non \xE8 un additivo di quel membro")) {
      const m = STUDENT_MISCONCEPTIONS["invalid-transposition-factor-as-term"];
      return {
        category: "invalid-transposition-factor-as-term",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("finch\xE9 fa parte di una somma") || errLow.includes("non puoi dividere per") || errLow.includes("non \xE8 un fattore moltiplicativo") || errLow.includes("puoi dividere solo per fattori che moltiplicano")) {
      const m = STUDENT_MISCONCEPTIONS["invalid-transposition-term-as-factor"];
      return {
        category: "invalid-transposition-term-as-factor",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("stesso membro") || errLow.includes("dall'altra parte dell'uguale")) {
      const m = STUDENT_MISCONCEPTIONS["invalid-transposition-same-side"];
      return {
        category: "invalid-transposition-same-side",
        badge: m.badge,
        title: m.titolo,
        explanation: errorText || m.spiegazione,
        counterexample: m.controesempio,
        advice: hintText || m.come_risolvere,
        ruleReminder: m.regola_guida,
        principio: m.principio
      };
    }
    if (errLow.includes("zero") || errLow.includes("\u2260 0") || errLow.includes("nullo")) {
      return {
        category: "zero-division",
        badge: "Condizione di Esistenza (\u2260 0)",
        title: "Divisione per zero o termine nullo",
        explanation: errorText || "La divisione per zero non \xE8 un'operazione definita nei numeri reali.",
        counterexample: "Non esiste alcun numero x tale che x \xB7 0 = 1.",
        advice: hintText || "Assicurati che la quantit\xE0 per cui dividi sia diversa da zero.",
        ruleReminder: "Attenzione: non \xE8 consentito dividere per zero o per quantit\xE0 nulle!",
        principio: "Definizione di divisione in algebra reale."
      };
    }
    return {
      category: "general",
      badge: "Principio di Equivalenza",
      title: "Operazione non valida",
      explanation: errorText || "Questa operazione non conserva l'uguaglianza tra i due membri.",
      counterexample: "",
      advice: hintText || "Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.",
      ruleReminder: "Ricorda di eseguire trasformazioni che conservano sempre l'uguaglianza tra i due membri dell'equazione.",
      principio: "Principi di equivalenza delle equazioni."
    };
  }

  // js/a11y.js
  var GREEK_NAMES_IT = {
    theta: "theta",
    omega: "omega",
    alpha: "alfa",
    beta: "beta",
    gamma: "gamma",
    delta: "delta",
    Delta: "delta",
    lambda: "lambda",
    mu: "mu",
    rho: "ro",
    pi: "pi greco",
    phi: "fi",
    psi: "psi",
    sigma: "sigma",
    tau: "tau",
    eps: "epsilon",
    epsilon: "epsilon"
  };
  var SUBSCRIPTS_IT = {
    "0": "zero",
    "1": "uno",
    "2": "due",
    "3": "tre",
    "4": "quattro",
    "eq": "equivalente",
    "c": "cinetica",
    "p": "potenziale",
    "tot": "totale",
    "in": "iniziale",
    "fin": "finale",
    "s": "sorgente",
    "o": "osservatore"
  };
  function verbalizeVar(name) {
    if (!name) return "";
    if (name === "\xB1") return "pi\xF9 o meno";
    if (name === "Ec" || name === "E_c" || name === "Ek") return "energia cinetica";
    if (name === "Ep" || name === "E_p") return "energia potenziale";
    if (name === "Req" || name === "R_eq") return "R equivalente";
    if (name === "Ceq" || name === "C_eq") return "C equivalente";
    if (name.startsWith("d") && name.length > 1 && !["d", "div"].includes(name)) {
      const sub = name.slice(1);
      const subVerbal = verbalizeVar(sub);
      return `delta ${subVerbal}`;
    }
    if (name.startsWith("Delta_") || name.startsWith("Delta")) {
      const sub = name.replace(/^Delta_?/, "");
      return `delta ${verbalizeVar(sub)}`;
    }
    for (const [k, v] of Object.entries(GREEK_NAMES_IT)) {
      if (name.startsWith(k)) {
        const rest = name.slice(k.length).replace(/^_/, "");
        if (!rest) return v;
        const subName = SUBSCRIPTS_IT[rest] || rest;
        return `${v} ${subName}`;
      }
    }
    const m = name.match(/^([a-zA-Z]+)[_]?([a-zA-Z0-9]+)$/);
    if (m && m[2]) {
      const base = GREEK_NAMES_IT[m[1]] || m[1];
      const sub = SUBSCRIPTS_IT[m[2]] || m[2];
      return `${base} ${sub}`;
    }
    return GREEK_NAMES_IT[name] || name;
  }
  function verbalizeAst(node, context = {}) {
    if (!node) return "";
    const u = unwrap(node);
    switch (u.type) {
      case "Num": {
        const val = u.value;
        if (val === -1 && context.inMul) return "meno";
        return String(val).replace(".", " virgola ");
      }
      case "Var":
        return verbalizeVar(u.name);
      case "Neg": {
        const inner = verbalizeAst(u.arg, { ...context, inNeg: true });
        return `meno ${inner}`;
      }
      case "Add":
      case "Sub": {
        const isSub = u.type === "Sub";
        const parts = u.args.map((arg, idx) => {
          const text = verbalizeAst(arg, { ...context, inSum: true });
          if (idx === 0) return text;
          const op = isSub ? "meno" : "pi\xF9";
          return `${op} ${text}`;
        });
        return parts.join(" ");
      }
      case "Mul": {
        const parts = [];
        for (let i = 0; i < u.args.length; i++) {
          const arg = u.args[i];
          const un = unwrap(arg);
          if (un.type === "Div") {
            const numU = unwrap(un.num);
            const denU = unwrap(un.den);
            if (numU.type === "Num" && denU.type === "Num") {
              if (numU.value === 1 && denU.value === 2) {
                parts.push("un mezzo");
                continue;
              }
              if (numU.value === 1 && denU.value === 3) {
                parts.push("un terzo");
                continue;
              }
              if (numU.value === 1 && denU.value === 4) {
                parts.push("un quarto");
                continue;
              }
              if (numU.value === 2 && denU.value === 3) {
                parts.push("due terzi");
                continue;
              }
              if (numU.value === 3 && denU.value === 4) {
                parts.push("tre quarti");
                continue;
              }
            }
          }
          parts.push(verbalizeAst(arg, { ...context, inMul: true }));
        }
        return parts.filter(Boolean).join(" per ");
      }
      case "Div": {
        const numU = unwrap(u.num);
        const denU = unwrap(u.den);
        if (numU.type === "Num" && denU.type === "Num") {
          if (numU.value === 1 && denU.value === 2) return "un mezzo";
          if (numU.value === 1 && denU.value === 3) return "un terzo";
          if (numU.value === 1 && denU.value === 4) return "un quarto";
          if (numU.value === 2 && denU.value === 3) return "due terzi";
          if (numU.value === 3 && denU.value === 4) return "tre quarti";
        }
        const numText = verbalizeAst(u.num, { ...context, inFracNum: true });
        const denText = verbalizeAst(u.den, { ...context, inFracDen: true });
        const isNumCompound = numU.type === "Add" || numU.type === "Sub";
        const isDenCompound = denU.type === "Add" || denU.type === "Sub";
        if (isNumCompound || isDenCompound) {
          return `frazione con numeratore ${numText}, fratto denominatore ${denText}`;
        }
        return `${numText} fratto ${denText}`;
      }
      case "Pow": {
        const baseText = verbalizeAst(u.base, context);
        const expU = unwrap(u.exp);
        if (expU.type === "Num") {
          if (expU.value === 2) return `${baseText} al quadrato`;
          if (expU.value === 3) return `${baseText} al cubo`;
          if (expU.value === -1) return `${baseText} alla meno uno`;
          return `${baseText} elevato a ${expU.value}`;
        }
        const expText = verbalizeAst(u.exp, context);
        return `${baseText} elevato alla ${expText}`;
      }
      case "Sqrt":
        return `radice quadrata di ${verbalizeAst(u.arg, context)}`;
      case "Sin":
        return `seno di ${verbalizeAst(u.arg, context)}`;
      case "Cos":
        return `coseno di ${verbalizeAst(u.arg, context)}`;
      case "Tan":
        return `tangente di ${verbalizeAst(u.arg, context)}`;
      case "Ln":
        return `logaritmo naturale di ${verbalizeAst(u.arg, context)}`;
      case "Asin":
        return `arcoseno di ${verbalizeAst(u.arg, context)}`;
      case "Acos":
        return `arcocoseno di ${verbalizeAst(u.arg, context)}`;
      case "Atan":
        return `arcotangente di ${verbalizeAst(u.arg, context)}`;
      case "Exp":
        return `esponenziale di ${verbalizeAst(u.arg, context)}`;
      case "Group":
        return `quantit\xE0 ${verbalizeAst(u.arg, context)}`;
      case "Eq":
        return `${verbalizeAst(u.left, context)} uguale a ${verbalizeAst(u.right, context)}`;
      default:
        return "";
    }
  }
  function verbalizeEquation(eq) {
    if (!eq) return "Nessuna equazione attiva";
    return `${verbalizeAst(eq.left)} uguale a ${verbalizeAst(eq.right)}`;
  }
  function announceMathLive(message, alert2 = false) {
    if (typeof document === "undefined") return;
    const targetId = alert2 ? "math-live-alert" : "math-live-verbalizer";
    const el = document.getElementById(targetId);
    if (el) {
      el.textContent = "";
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    }
  }
  var currentUtterance = null;
  function speakMath(text, onEnd = null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "it-IT";
      u.rate = 0.92;
      u.pitch = 1;
      currentUtterance = u;
      if (onEnd) {
        u.onend = () => {
          currentUtterance = null;
          onEnd();
        };
        u.onerror = () => {
          currentUtterance = null;
        };
      }
      window.speechSynthesis.speak(u);
      return true;
    } catch (_) {
      return false;
    }
  }

  // js/render.js
  function renderEquation(eq, opts = {}) {
    const {
      selectedId = null,
      dimIds = /* @__PURE__ */ new Set(),
      targetVar = null,
      interactive = false,
      showImplicitDen = false
    } = opts;
    const memberOpts = { ...opts, eq };
    if (!interactive) {
      const left = renderNode(eq.left, "left", memberOpts);
      const right = renderNode(eq.right, "right", memberOpts);
      return `<span class="math-eq">${left}<span class="eq-sign" aria-label="uguale">=</span>${right}</span>`;
    }
    const leftMember = renderMember(eq.left, "left", memberOpts);
    const rightMember = renderMember(eq.right, "right", memberOpts);
    const speechLabel = verbalizeEquation(eq);
    return `<div class="math-eq interactive-math-eq ${showImplicitDen ? "show-implicit-denominators" : ""}" role="region" aria-label="Equazione: ${escapeHtml(speechLabel)}" aria-roledescription="equazione matematica interattiva">  <div class="math-member-wrap math-member-left">${leftMember}</div>  <div class="eq-sign-wrap"><span class="eq-sign" aria-label="uguale">=</span></div>  <div class="math-member-wrap math-member-right">${rightMember}</div></div>`;
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
    kappa: "\u03BA",
    xi: "\u03BE",
    chi: "\u03C7",
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
    R_eq: "R_eq",
    R_1: "R\u2081",
    R_2: "R\u2082",
    C_eq: "C_eq",
    C_1: "C\u2081",
    C_2: "C\u2082",
    Ec: "E_c",
    Ep: "E_p",
    Vmax: "V_max",
    Veff: "V_eff",
    Ieff: "I_eff",
    rho_corpo: "\u03C1_corpo",
    rho_fluido: "\u03C1_fluido",
    V_imm: "V_imm",
    V_tot: "V_tot",
    H0: "H\u2080",
    Rs: "R_s",
    lam0: "\u03BB\u2080",
    lam_max: "\u03BB_max",
    L_edd: "L_edd",
    v_area: "v_area",
    thetaB: "\u03B8_B",
    Delta_y: "\u0394y",
    Delta_G: "\u0394G",
    Delta_H: "\u0394H",
    Delta_S: "\u0394S",
    P_tot: "P_tot",
    m_mol: "m_mol",
    m_solv: "m_solv",
    pH: "pH",
    pOH: "pOH",
    pKa: "pK\u2090",
    Ka: "K\u2090",
    Kb: "K\u1D66",
    Kw: "K_w",
    Pi: "\u03A0"
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
  function removeFactorFromExpr(expr, targetVarName) {
    expr = unwrap(expr);
    if (isMatch(expr, targetVarName)) {
      return Num(1);
    }
    if (expr.type === "Neg") {
      const inner = removeFactorFromExpr(expr.arg, targetVarName);
      if (structurallyEqual(inner, expr.arg)) return expr;
      if (inner.type === "Num" && inner.value === 1) return Num(-1);
      return { type: "Neg", arg: inner };
    }
    if (expr.type === "Mul") {
      let idx = expr.args.findIndex((a) => isMatch(a, targetVarName));
      if (idx !== -1) {
        const remaining = expr.args.filter((_, i) => i !== idx);
        if (remaining.length === 0) return Num(1);
        if (remaining.length === 1) return remaining[0];
        return Mul(...remaining);
      }
      const negIdx = expr.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== "Neg") return false;
        const inner = removeFactorFromExpr(u.arg, targetVarName);
        return !structurallyEqual(inner, u.arg);
      });
      if (negIdx !== -1) {
        const u = unwrap(expr.args[negIdx]);
        const newInner = removeFactorFromExpr(u.arg, targetVarName);
        const newArg = newInner.type === "Num" && newInner.value === 1 ? Num(-1) : { type: "Neg", arg: newInner };
        const newArgs = expr.args.map((a, i) => i === negIdx ? newArg : a);
        return Mul(...newArgs);
      }
      idx = expr.args.findIndex((a) => {
        const u = unwrap(a);
        return u.type === "Num" && u.value < 0 && String(-u.value) === String(targetVarName);
      });
      if (idx !== -1) {
        const newArgs = expr.args.map((a, i) => i === idx ? Num(-1) : a);
        if (newArgs.length === 1) return newArgs[0];
        return Mul(...newArgs);
      }
      const divIdx = expr.args.findIndex((a) => {
        const u = unwrap(a);
        if (u.type !== "Div") return false;
        const res = removeFactorFromExpr(u.num, targetVarName);
        return !structurallyEqual(res, u.num);
      });
      if (divIdx !== -1) {
        const u = unwrap(expr.args[divIdx]);
        const newNum = removeFactorFromExpr(u.num, targetVarName);
        const newDiv = Div(newNum, u.den);
        const newArgs = expr.args.map((a, i) => i === divIdx ? newDiv : a);
        return Mul(...newArgs);
      }
    }
    if (expr.type === "Div") {
      const newNum = removeFactorFromExpr(expr.num, targetVarName);
      return Div(newNum, expr.den);
    }
    return expr;
  }
  function addFactorToDenominator(expr, factorNode) {
    expr = unwrap(expr);
    if (expr.type === "Neg") {
      return { type: "Neg", arg: addFactorToDenominator(expr.arg, factorNode) };
    }
    if (expr.type === "Div") {
      const curDen = unwrap(expr.den);
      let newDen;
      if (curDen.type === "Mul") {
        newDen = Mul(...curDen.args, factorNode);
      } else {
        newDen = Mul(curDen, factorNode);
      }
      return Div(expr.num, newDen);
    }
    return Div(expr, factorNode);
  }
  function removeFactorFromDenominator(expr, targetVarName) {
    expr = unwrap(expr);
    if (expr.type === "Neg") {
      const inner = removeFactorFromDenominator(expr.arg, targetVarName);
      return structurallyEqual(inner, expr.arg) ? expr : { type: "Neg", arg: inner };
    }
    if (expr.type === "Div") {
      const den = unwrap(expr.den);
      if (isMatch(den, targetVarName)) {
        return expr.num;
      }
      if (den.type === "Neg") {
        const inner = removeFactorFromExpr(den.arg, targetVarName);
        if (!structurallyEqual(inner, den.arg)) {
          if (inner.type === "Num" && inner.value === 1) {
            return { type: "Neg", arg: expr.num };
          }
          return Div(expr.num, { type: "Neg", arg: inner });
        }
      }
      if (den.type === "Mul") {
        const idx = den.args.findIndex((a) => isMatch(a, targetVarName));
        if (idx !== -1) {
          const remaining = den.args.filter((_, i) => i !== idx);
          const newDen = remaining.length === 1 ? remaining[0] : Mul(...remaining);
          return Div(expr.num, newDen);
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
          return Div(expr.num, Mul(...newArgs));
        }
      }
    }
    if (expr.type === "Mul") {
      const idx = expr.args.findIndex((a) => {
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
        const updatedFactor = removeFactorFromDenominator(expr.args[idx], targetVarName);
        const uFact = unwrap(updatedFactor);
        let newArgs;
        if (uFact.type === "Num" && uFact.value === 1) {
          newArgs = expr.args.filter((_, i) => i !== idx);
          if (newArgs.length === 0) return Num(1);
          if (newArgs.length === 1) return newArgs[0];
          return Mul(...newArgs);
        } else {
          newArgs = expr.args.map((arg, i) => i === idx ? updatedFactor : arg);
          return Mul(...newArgs);
        }
      }
    }
    return expr;
  }
  function addFactorToNumerator(expr, factorNode) {
    expr = unwrap(expr);
    if (expr.type === "Neg") {
      return { type: "Neg", arg: addFactorToNumerator(expr.arg, factorNode) };
    }
    if (expr.type === "Num" && expr.value === 1) {
      return factorNode;
    }
    if (expr.type === "Div") {
      const curNum = unwrap(expr.num);
      let newNum;
      if (curNum.type === "Num" && curNum.value === 1) {
        newNum = factorNode;
      } else if (curNum.type === "Mul") {
        newNum = Mul(...curNum.args, factorNode);
      } else {
        newNum = Mul(curNum, factorNode);
      }
      return Div(newNum, expr.den);
    }
    if (expr.type === "Mul") {
      return Mul(...expr.args, factorNode);
    }
    return Mul(expr, factorNode);
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
          error: `Non puoi dividere per "${prettyName}" finch\xE9 fa parte di una somma con altri termini! Trascinalo accanto al membro opposto per trasportarlo con cambio di segno.`,
          hint: `Trascina "${prettyName}" nello slot \xB1 accanto al membro opposto per applicare il 1\xB0 principio di equivalenza (trasporto con cambio di segno).`
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
  var touchDraggedElem = null;
  var touchStartPos = null;
  var activePointerId = null;
  var touchHasMoved = false;
  var lastPointerType = "mouse";
  var lastTouchDragEndAt = 0;
  var globalTouchListenersBound = false;
  function wasRecentTouchDrag() {
    return Date.now() - lastTouchDragEndAt < 350;
  }
  function cleanupTouchDrag(container) {
    if (typeof document !== "undefined") {
      document.querySelectorAll(".touch-drag-badge").forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll(".is-being-dragged").forEach((el) => {
        el.classList.remove("is-being-dragged");
      });
    }
    if (touchDraggedElem && activePointerId !== null) {
      try {
        if (touchDraggedElem.hasPointerCapture && touchDraggedElem.hasPointerCapture(activePointerId)) {
          touchDraggedElem.releasePointerCapture(activePointerId);
        }
      } catch (_) {
      }
    }
    const targetContainer = container || (typeof document !== "undefined" ? document.getElementById("equation-display") : null);
    if (targetContainer) {
      targetContainer.classList.remove("is-dragging-equation", "lim-stylus-mode", "lim-stylus-active");
      clearDropzonesHighlight(targetContainer);
    }
    hideDragArrow();
    activeDragData = null;
    touchDraggedElem = null;
    touchStartPos = null;
    activePointerId = null;
    touchHasMoved = false;
  }
  function bindGlobalTouchSafetyListeners() {
    if (globalTouchListenersBound || typeof window === "undefined") return;
    globalTouchListenersBound = true;
    const safeClean = () => {
      if (touchDraggedElem || activeDragData) {
        cleanupTouchDrag();
      }
    };
    window.addEventListener("blur", safeClean);
    window.addEventListener("pagehide", safeClean);
    window.addEventListener("contextmenu", () => {
      if (lastPointerType !== "mouse") safeClean();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) safeClean();
    });
    document.addEventListener("pointercancel", safeClean, true);
  }
  function setupEquationDragAndDrop(container, { onApplyMove, getCurrentEquation }) {
    if (!container) return;
    cleanupTouchDrag(container);
    bindGlobalTouchSafetyListeners();
    let activeDragSourceEl = null;
    container.querySelectorAll(".draggable-token").forEach((token) => {
      token.setAttribute("draggable", "true");
      token.addEventListener("dragstart", (e) => {
        if (lastPointerType !== "mouse" || touchDraggedElem) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
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
  function findCalibratedDropzone(container, clientX, clientY, pointerType = "touch", activeDragData2 = null) {
    if (!container || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    if (typeof document !== "undefined") {
      const elemBelow = document.elementFromPoint(clientX, clientY);
      const directDz = elemBelow ? elemBelow.closest(".dropzone") : null;
      if (directDz) {
        if (activeDragData2 && directDz.dataset.side === activeDragData2.fromSide && directDz.dataset.slot === activeDragData2.fromSlot) {
          return null;
        }
        return directDz;
      }
    }
    const isPen = pointerType === "pen";
    const isLimMode = container.classList.contains("lim-mode") || typeof document !== "undefined" && (document.body.classList.contains("lim-mode") || document.body.classList.contains("lim-stylus-mode"));
    const maxDistance = isPen ? isLimMode ? 68 : 52 : isLimMode ? 46 : 32;
    const candidates = Array.from(container.querySelectorAll(".dropzone"));
    let bestDz = null;
    let bestDist = Infinity;
    for (const dz of candidates) {
      if (activeDragData2 && dz.dataset.side === activeDragData2.fromSide && dz.dataset.slot === activeDragData2.fromSlot) {
        continue;
      }
      const rect = dz.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist <= maxDistance && dist < bestDist) {
        bestDist = dist;
        bestDz = dz;
      }
    }
    return bestDz;
  }
  function setupTouchDragFallback(container, { onApplyMove, getCurrentEquation }) {
    container.querySelectorAll(".draggable-token").forEach((token) => {
      token.addEventListener("pointerdown", (e) => {
        lastPointerType = e.pointerType || "touch";
        if (e.pointerType === "mouse") return;
        if (e.pointerType === "pen") {
          container.classList.add("lim-stylus-mode");
          if (typeof document !== "undefined") document.body.classList.add("stylus-detected");
        }
        e.stopPropagation();
        if (e.isPrimary === false) {
          cleanupTouchDrag(container);
          return;
        }
        cleanupTouchDrag(container);
        touchDraggedElem = token;
        activePointerId = e.pointerId;
        touchStartPos = { x: e.clientX, y: e.clientY };
        touchHasMoved = false;
        const varName = token.dataset.varName;
        const fromSide = token.dataset.side;
        const fromSlot = token.dataset.slot || "num";
        const nodeType = token.dataset.nodeType || "Var";
        activeDragData = { varName, fromSide, fromSlot, nodeType };
        token.classList.add("is-being-dragged");
        container.classList.add("is-dragging-equation");
        highlightDropzones(container, activeDragData);
        try {
          token.setPointerCapture(e.pointerId);
        } catch (_) {
        }
      });
      token.addEventListener("pointermove", (e) => {
        if (e.pointerType === "mouse") return;
        if (touchDraggedElem !== token || !activeDragData) return;
        e.stopPropagation();
        if (touchStartPos && Math.hypot(e.clientX - touchStartPos.x, e.clientY - touchStartPos.y) > 6) {
          touchHasMoved = true;
        }
        const dropzone = findCalibratedDropzone(container, e.clientX, e.clientY, e.pointerType, activeDragData);
        container.querySelectorAll(".dropzone").forEach((dz) => {
          dz.classList.remove("dropzone-hover");
          const slot = dz.querySelector(".drop-slot");
          if (slot) slot.classList.remove("drop-slot-hover");
        });
        const isSameOriginSlot = dropzone && activeDragData && dropzone.dataset.side === activeDragData.fromSide && dropzone.dataset.slot === activeDragData.fromSlot;
        if (dropzone && !isSameOriginSlot) {
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
        if (e.pointerType === "mouse") return;
        e.stopPropagation();
        const isCurrentToken = touchDraggedElem === token;
        const dragData = activeDragData ? { ...activeDragData } : null;
        const hadMoved = touchHasMoved;
        const dropzone = findCalibratedDropzone(container, e.clientX, e.clientY, e.pointerType, dragData);
        cleanupTouchDrag(container);
        if (!isCurrentToken || !dragData) return;
        if (hadMoved) {
          lastTouchDragEndAt = Date.now();
        }
        if (!dropzone) return;
        const targetSide = dropzone.dataset.side;
        const targetSlot = dropzone.dataset.slot;
        if (targetSide === dragData.fromSide && targetSlot === dragData.fromSlot) {
          return;
        }
        lastTouchDragEndAt = Date.now();
        const tokenText = prettyVar(dragData.varName || "");
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
        if (onApplyMove) {
          onApplyMove(result, { sourceRect: null, targetRect: null, tokenText, targetSide, targetSlot, varName: dragData.varName });
        }
      });
      const handleCancelOrLostCapture = (e) => {
        if (e && e.pointerType === "mouse") return;
        cleanupTouchDrag(container);
      };
      token.addEventListener("pointercancel", handleCancelOrLostCapture);
      token.addEventListener("lostpointercapture", handleCancelOrLostCapture);
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
    M1: { name: "Massa corpo 1", unit: "kg", sample: 1989e27 },
    M2: { name: "Massa corpo 2", unit: "kg", sample: 5972e21 },
    F: { name: "Forza", unit: "N", sample: 40 },
    Fp: { name: "Forza peso", unit: "N", sample: 49.05 },
    Fe: { name: "Forza elastica", unit: "N", sample: 30 },
    Fa: { name: "Forza di attrito", unit: "N", sample: 10 },
    Fc: { name: "Forza centripeta", unit: "N", sample: 25 },
    F1: { name: "Forza 1", unit: "N", sample: 20 },
    F2: { name: "Forza 2", unit: "N", sample: 40 },
    fs: { name: "Forza di attrito statico massimo", unit: "N", sample: 15 },
    k: { name: "Costante elastica", unit: "N/m", sample: 250 },
    mu: { name: "Coefficiente di attrito", unit: "adimensionale", sample: 0.25 },
    p: { name: "Pressione / Quantit\xE0 di moto", unit: "Pa", sample: 101325 },
    p0: { name: "Pressione atmosferica iniziale", unit: "Pa", sample: 101325 },
    p1: { name: "Pressione stato 1", unit: "Pa", sample: 1e5 },
    p2: { name: "Pressione stato 2", unit: "Pa", sample: 2e5 },
    G: { name: "Costante di gravitazione universale", unit: "N\xB7m\xB2/kg\xB2", sample: 6674e-14 },
    // --- Lavoro, Energia, Potenza ---
    E: { name: "Energia totale", unit: "J", sample: 600 },
    Ec: { name: "Energia cinetica", unit: "J", sample: 400 },
    E_c: { name: "Energia cinetica", unit: "J", sample: 400 },
    Ek: { name: "Energia cinetica", unit: "J", sample: 400 },
    E_k: { name: "Energia cinetica", unit: "J", sample: 400 },
    Ep: { name: "Energia potenziale", unit: "J", sample: 200 },
    E_p: { name: "Energia potenziale", unit: "J", sample: 200 },
    Em: { name: "Energia meccanica", unit: "J", sample: 600 },
    E_m: { name: "Energia meccanica", unit: "J", sample: 600 },
    Ec1: { name: "Energia cinetica iniziale", unit: "J", sample: 300 },
    E_c1: { name: "Energia cinetica iniziale", unit: "J", sample: 300 },
    Ec2: { name: "Energia cinetica finale", unit: "J", sample: 500 },
    E_c2: { name: "Energia cinetica finale", unit: "J", sample: 500 },
    Ep1: { name: "Energia potenziale iniziale", unit: "J", sample: 200 },
    E_p1: { name: "Energia potenziale iniziale", unit: "J", sample: 200 },
    Ep2: { name: "Energia potenziale finale", unit: "J", sample: 100 },
    E_p2: { name: "Energia potenziale finale", unit: "J", sample: 100 },
    E0: { name: "Energia a riposo", unit: "J", sample: 9e16 },
    E_0: { name: "Energia a riposo", unit: "J", sample: 9e16 },
    E1: { name: "Energia stato fondamentale (Bohr)", unit: "J", sample: 218e-20 },
    E_1: { name: "Energia stato fondamentale (Bohr)", unit: "J", sample: 218e-20 },
    En: { name: "Livello energetico (Bohr)", unit: "J", sample: 545e-21 },
    E_n: { name: "Livello energetico (Bohr)", unit: "J", sample: 545e-21 },
    U: { name: "Energia potenziale / interna", unit: "J", sample: 350 },
    Uel: { name: "Energia potenziale elastica", unit: "J", sample: 150 },
    U_el: { name: "Energia potenziale elastica", unit: "J", sample: 150 },
    Ug: { name: "Energia potenziale gravitazionale", unit: "J", sample: 250 },
    U_g: { name: "Energia potenziale gravitazionale", unit: "J", sample: 250 },
    dU: { name: "Variazione di energia interna", unit: "J", sample: 500 },
    Delta_U: { name: "Variazione di energia interna", unit: "J", sample: 500 },
    Delta_E: { name: "Variazione di energia", unit: "J", sample: 300 },
    Delta_Ec: { name: "Variazione di energia cinetica", unit: "J", sample: 250 },
    Delta_Ep: { name: "Variazione di energia potenziale", unit: "J", sample: 250 },
    W: { name: "Lavoro", unit: "J", sample: 240 },
    W0: { name: "Lavoro di estrazione", unit: "J", sample: 32e-20 },
    W_0: { name: "Lavoro di estrazione", unit: "J", sample: 32e-20 },
    Lu: { name: "Lavoro utile", unit: "J", sample: 800 },
    Lt: { name: "Lavoro totale assorbito", unit: "J", sample: 1e3 },
    Q: { name: "Calore / Carica", unit: "J", sample: 1200 },
    P: { name: "Potenza", unit: "W", sample: 1500 },
    u: { name: "Densit\xE0 di energia", unit: "J/m\xB3", sample: 0.05 },
    J: { name: "Impulso della forza", unit: "N\xB7s", sample: 40 },
    // --- Geometria e Statica ---
    A: { name: "Area / Superficie", unit: "m\xB2", sample: 1.5 },
    A1: { name: "Area sezione 1", unit: "m\xB2", sample: 0.5 },
    A_1: { name: "Area sezione 1", unit: "m\xB2", sample: 0.5 },
    A2: { name: "Area sezione 2", unit: "m\xB2", sample: 2 },
    A_2: { name: "Area sezione 2", unit: "m\xB2", sample: 2 },
    S: { name: "Superficie / Sezione", unit: "m\xB2", sample: 2 },
    b: { name: "Base", unit: "m", sample: 4 },
    ip: { name: "Ipotenusa", unit: "m", sample: 5 },
    c1: { name: "Cateto 1", unit: "m", sample: 3 },
    c2: { name: "Cateto 2", unit: "m", sample: 4 },
    z: { name: "Quota geodetica / Quota z", unit: "m", sample: 10 },
    xcm: { name: "Posizione centro di massa", unit: "m", sample: 2 },
    x1: { name: "Posizione corpo 1", unit: "m", sample: 1 },
    x2: { name: "Posizione corpo 2", unit: "m", sample: 3 },
    r1: { name: "Raggio 1", unit: "m", sample: 2 },
    r2: { name: "Raggio 2", unit: "m", sample: 4 },
    rn: { name: "Raggio orbita di Bohr", unit: "m", sample: 529e-13 },
    Icm: { name: "Momento d'inerzia baricentrico", unit: "kg\xB7m\xB2", sample: 0.5 },
    I1: { name: "Momento d'inerzia 1", unit: "kg\xB7m\xB2", sample: 0.2 },
    I2: { name: "Momento d'inerzia 2", unit: "kg\xB7m\xB2", sample: 0.8 },
    tau: { name: "Momento torcente / Costante di tempo", unit: "N\xB7m", sample: 20 },
    v1: { name: "Velocit\xE0 1", unit: "m/s", sample: 10 },
    v_1: { name: "Velocit\xE0 1", unit: "m/s", sample: 10 },
    v2: { name: "Velocit\xE0 2", unit: "m/s", sample: 20 },
    v_2: { name: "Velocit\xE0 2", unit: "m/s", sample: 20 },
    u1: { name: "Velocit\xE0 relativistica 1", unit: "m/s", sample: 15e7 },
    // --- Termodinamica e Fluidi ---
    V: { name: "Volume / Tensione", unit: "m\xB3", sample: 0.05 },
    V0: { name: "Volume iniziale", unit: "m\xB3", sample: 0.02 },
    V1: { name: "Volume stato 1", unit: "m\xB3", sample: 0.02 },
    V2: { name: "Volume stato 2", unit: "m\xB3", sample: 0.04 },
    V_imm: { name: "Volume immerso", unit: "m\xB3", sample: 8e-3 },
    V_tot: { name: "Volume totale", unit: "m\xB3", sample: 0.01 },
    dV: { name: "Variazione di volume", unit: "m\xB3", sample: 0.01 },
    rho: { name: "Densit\xE0", unit: "kg/m\xB3", sample: 1e3 },
    rho_corpo: { name: "Densit\xE0 del solido/corpo", unit: "kg/m\xB3", sample: 800 },
    rho_fluido: { name: "Densit\xE0 del fluido/liquido", unit: "kg/m\xB3", sample: 1e3 },
    c: { name: "Calore specifico", unit: "J/(kg\xB7K)", sample: 4186 },
    cs: { name: "Calore specifico", unit: "J/(kg\xB7K)", sample: 900 },
    lambda: { name: "Calore latente / Lunghezza d'onda", unit: "J/kg", sample: 333500 },
    lam: { name: "Lunghezza d'onda", unit: "m", sample: 0.02 },
    dlam: { name: "Spostamento Compton", unit: "m", sample: 243e-14 },
    n: { name: "Numero di moli", unit: "mol", sample: 2 },
    Delta_T: { name: "Variazione di temperatura", unit: "K", sample: 15 },
    dT: { name: "Variazione di temperatura", unit: "K", sample: 15 },
    T0: { name: "Temperatura iniziale", unit: "K", sample: 273.15 },
    T1: { name: "Temperatura stato 1", unit: "K", sample: 300 },
    T2: { name: "Temperatura stato 2", unit: "K", sample: 350 },
    Te: { name: "Temperatura di equilibrio termico", unit: "K", sample: 310 },
    Tc: { name: "Temperatura sorgente fredda", unit: "K", sample: 290 },
    Th: { name: "Temperatura sorgente calda", unit: "K", sample: 450 },
    L0: { name: "Lunghezza iniziale", unit: "m", sample: 10 },
    l0: { name: "Lunghezza iniziale", unit: "m", sample: 10 },
    dl: { name: "Allungamento / Variazione lunghezza", unit: "m", sample: 5e-3 },
    Delta_l: { name: "Allungamento / Variazione lunghezza", unit: "m", sample: 5e-3 },
    Cp: { name: "Calore molare a pressione costante", unit: "J/(mol\xB7K)", sample: 29.1 },
    Cv: { name: "Calore molare a volume costante", unit: "J/(mol\xB7K)", sample: 20.8 },
    cost: { name: "Costante di Bernoulli", unit: "Pa", sample: 101325 },
    // --- Onde, Suono e Acustica ---
    f: { name: "Frequenza", unit: "Hz", sample: 440 },
    fp: { name: "Frequenza percepita (Doppler)", unit: "Hz", sample: 480 },
    vs: { name: "Velocit\xE0 della sorgente sonora", unit: "m/s", sample: 25 },
    vo: { name: "Velocit\xE0 dell'osservatore", unit: "m/s", sample: 15 },
    fb: { name: "Frequenza di battimento", unit: "Hz", sample: 4 },
    f1: { name: "Frequenza sorgente 1", unit: "Hz", sample: 440 },
    f2: { name: "Frequenza sorgente 2", unit: "Hz", sample: 444 },
    f0: { name: "Frequenza di risonanza", unit: "Hz", sample: 1e3 },
    nu: { name: "Frequenza del fotone", unit: "Hz", sample: 6e14 },
    omega: { name: "Velocit\xE0 angolare", unit: "rad/s", sample: 6.28 },
    omega0: { name: "Velocit\xE0 angolare iniziale", unit: "rad/s", sample: 0 },
    omega1: { name: "Velocit\xE0 angolare 1", unit: "rad/s", sample: 3.14 },
    omega2: { name: "Velocit\xE0 angolare 2", unit: "rad/s", sample: 6.28 },
    theta: { name: "Angolo", unit: "rad", sample: 0.5236 },
    theta0: { name: "Angolo iniziale", unit: "rad", sample: 0 },
    theta1: { name: "Angolo di incidenza", unit: "rad", sample: 0.5236 },
    theta2: { name: "Angolo di rifrazione", unit: "rad", sample: 0.3398 },
    thetaL: { name: "Angolo limite", unit: "rad", sample: 0.7297 },
    alpha: { name: "Accelerazione angolare / Angolo", unit: "rad/s\xB2", sample: 1.5 },
    phi: { name: "Fase / Angolo", unit: "rad", sample: 0 },
    // --- Ottica e Relatività ---
    n1: { name: "Indice di rifrazione mezzo 1", unit: "adimensionale", sample: 1 },
    n2: { name: "Indice di rifrazione mezzo 2", unit: "adimensionale", sample: 1.5 },
    gamma: { name: "Fattore di Lorentz", unit: "adimensionale", sample: 1.25 },
    dt: { name: "Tempo relativistico / intervallo", unit: "s", sample: 5 },
    dt0: { name: "Tempo proprio", unit: "s", sample: 4 },
    // --- Elettromagnetismo ---
    I: { name: "Intensit\xE0 di corrente", unit: "A", sample: 2.5 },
    i: { name: "Intensit\xE0 di corrente", unit: "A", sample: 1.2 },
    Ieff: { name: "Corrente efficace alternata", unit: "A", sample: 5 },
    Id: { name: "Corrente di spostamento", unit: "A", sample: 0.05 },
    q: { name: "Carica elettrica", unit: "C", sample: 5e-3 },
    q1: { name: "Carica 1", unit: "C", sample: 2e-3 },
    q2: { name: "Carica 2", unit: "C", sample: 4e-3 },
    B: { name: "Induzione magnetica (campo B)", unit: "T", sample: 0.5 },
    Phi: { name: "Flusso del campo elettrico", unit: "N\xB7m\xB2/C", sample: 50 },
    PhiE: { name: "Flusso del campo elettrico", unit: "N\xB7m\xB2/C", sample: 50 },
    PhiB: { name: "Flusso del campo magnetico", unit: "Wb", sample: 0.02 },
    fem: { name: "Forza elettromotrice (f.e.m.)", unit: "V", sample: 12 },
    C: { name: "Capacit\xE0 elettrica", unit: "F", sample: 1e-4 },
    Delta_V: { name: "Differenza di potenziale", unit: "V", sample: 12 },
    Veff: { name: "Tensione efficace alternata", unit: "V", sample: 230 },
    Vmax: { name: "Tensione di picco / massima", unit: "V", sample: 325 },
    Req: { name: "Resistenza equivalente", unit: "\u03A9", sample: 20 },
    R_eq: { name: "Resistenza equivalente", unit: "\u03A9", sample: 20 },
    R1: { name: "Resistenza 1", unit: "\u03A9", sample: 30 },
    R_1: { name: "Resistenza 1", unit: "\u03A9", sample: 30 },
    R2: { name: "Resistenza 2", unit: "\u03A9", sample: 60 },
    R_2: { name: "Resistenza 2", unit: "\u03A9", sample: 60 },
    XL: { name: "Reattanza induttiva", unit: "\u03A9", sample: 50 },
    XC: { name: "Reattanza capacitiva", unit: "\u03A9", sample: 30 },
    Z: { name: "Impedenza circuito RLC", unit: "\u03A9", sample: 60 },
    Ceq: { name: "Capacit\xE0 equivalente", unit: "F", sample: 5e-5 },
    C_eq: { name: "Capacit\xE0 equivalente", unit: "F", sample: 5e-5 },
    C1: { name: "Capacit\xE0 1", unit: "F", sample: 1e-4 },
    C_1: { name: "Capacit\xE0 1", unit: "F", sample: 1e-4 },
    C2: { name: "Capacit\xE0 2", unit: "F", sample: 1e-4 },
    C_2: { name: "Capacit\xE0 2", unit: "F", sample: 1e-4 },
    eps0: { name: "Costante dielettrica del vuoto", unit: "F/m", sample: 8854e-15 },
    eps: { name: "Costante dielettrica", unit: "F/m", sample: 177e-13 },
    mu0: { name: "Permeabilit\xE0 magnetica del vuoto", unit: "T\xB7m/A", sample: 1256e-9 },
    rho0: { name: "Resistivit\xE0 a 0\xB0C", unit: "\u03A9\xB7m", sample: 168e-10 },
    // --- Astrofisica e Gravitazione Avanzata ---
    H0: { name: "Costante di Hubble", unit: "km/(s\xB7Mpc)", sample: 70 },
    Rs: { name: "Raggio di Schwarzschild", unit: "m", sample: 2950 },
    sigma: { name: "Costante di Stefan-Boltzmann", unit: "W/(m\xB2\xB7K\u2074)", sample: 567e-10 },
    lam_max: { name: "Lunghezza d'onda di picco", unit: "m", sample: 5e-7 },
    lam0: { name: "Lunghezza d'onda a riposo", unit: "m", sample: 5e-7 },
    L_edd: { name: "Luminosit\xE0 limite di Eddington", unit: "W", sample: 1e38 },
    kappa: { name: "Opacit\xE0 della materia", unit: "m\xB2/kg", sample: 0.04 },
    v_area: { name: "Velocit\xE0 areale", unit: "m\xB2/s", sample: 1e15 },
    // --- Ottica Ondulatoria ---
    Delta_y: { name: "Interfrangia (distanza tra frange)", unit: "m", sample: 2e-3 },
    D: { name: "Diametro apertura circolare", unit: "m", sample: 0.1 },
    I0: { name: "Intensit\xE0 incidente", unit: "W/m\xB2", sample: 1e3 },
    thetaB: { name: "Angolo di Brewster", unit: "rad", sample: 0.9828 },
    // --- Chimica Generale (Gas, Soluzioni, Acido-Base, Elettrochimica) ---
    Pi: { name: "Pressione parziale / Pressione osmotica", unit: "Pa", sample: 101325 },
    xi: { name: "Frazione molare", unit: "adimensionale", sample: 0.2 },
    P_tot: { name: "Pressione totale miscela", unit: "Pa", sample: 101325 },
    pH: { name: "pH della soluzione", unit: "adimensionale", sample: 7 },
    pOH: { name: "pOH della soluzione", unit: "adimensionale", sample: 7 },
    Kw: { name: "Prodotto ionico dell'acqua", unit: "mol\xB2/L\xB2", sample: 1e-14 },
    H: { name: "Concentrazione [H\u207A]", unit: "mol/L", sample: 1e-7 },
    OH: { name: "Concentrazione [OH\u207B]", unit: "mol/L", sample: 1e-7 },
    Ka: { name: "Costante di dissociazione acida", unit: "mol/L", sample: 18e-6 },
    Kb: { name: "Costante di dissociazione basica", unit: "mol/L", sample: 18e-6 },
    HA: { name: "Concentrazione acido indissociato [HA]", unit: "mol/L", sample: 0.1 },
    BH: { name: "Concentrazione acido coniugato [BH\u207A]", unit: "mol/L", sample: 0.1 },
    pKa: { name: "Costante pKa", unit: "adimensionale", sample: 4.75 },
    Delta_G: { name: "Variazione di energia libera di Gibbs", unit: "J", sample: 212e3 },
    MM: { name: "Massa molare", unit: "g/mol", sample: 18 },
    m_mol: { name: "Molalit\xE0", unit: "mol/kg", sample: 0.5 },
    m_solv: { name: "Massa del solvente", unit: "kg", sample: 1 },
    P0: { name: "Tensione di vapore solvente puro", unit: "Pa", sample: 3170 },
    P1: { name: "Tensione di vapore soluzione", unit: "Pa", sample: 3100 }
  };
  function getQuantityInfo(symbol, formulaEntry = null) {
    if (symbol === "\xB1") {
      return { name: "Segno \xB1", unit: "", sample: 1 };
    }
    const topic = formulaEntry && formulaEntry.topic ? formulaEntry.topic.toLowerCase() : "";
    const formulaId = formulaEntry && formulaEntry.id ? formulaEntry.id.toLowerCase() : "";
    if (symbol === "N") {
      if (formulaId.includes("solenoide") || topic.includes("elettr") || topic.includes("magnet")) {
        return { name: "Numero di spire", unit: "spire", sample: 500 };
      }
      return { name: "Reazione normale vincolare", unit: "N", sample: 49.05 };
    }
    if (symbol === "eta") {
      if (formulaId.includes("poiseuille") || topic.includes("fluid")) {
        return { name: "Viscosit\xE0 dinamica", unit: "Pa\xB7s", sample: 1e-3 };
      }
      return { name: "Rendimento", unit: "adimensionale", sample: 0.4 };
    }
    if (symbol === "tau") {
      if (formulaId.includes("rc") || formulaId.includes("rl") || topic.includes("elettr")) {
        return { name: "Costante di tempo", unit: "s", sample: 2e-3 };
      }
      return { name: "Momento torcente (coppia)", unit: "N\xB7m", sample: 20 };
    }
    if (symbol === "c1" || symbol === "c2") {
      if (formulaId.includes("termico") || topic.includes("termo")) {
        return { name: symbol === "c1" ? "Calore specifico sostanza 1" : "Calore specifico sostanza 2", unit: "J/(kg\xB7K)", sample: 4186 };
      }
      return { name: symbol === "c1" ? "Cateto 1" : "Cateto 2", unit: "m", sample: symbol === "c1" ? 3 : 4 };
    }
    if (["R", "Req", "R_eq", "R1", "R_1", "R2", "R_2"].includes(symbol)) {
      if (topic.includes("elettricita") || topic.includes("circuito") || topic.includes("elettromagnetismo") || formulaId.includes("ohm") || formulaId.includes("resistor")) {
        return { name: "Resistenza elettrica", unit: "\u03A9", sample: 10 };
      }
    }
    if (["C", "Ceq", "C_eq", "C1", "C_1", "C2", "C_2"].includes(symbol)) {
      if (topic.includes("elettricita") || topic.includes("circuito") || topic.includes("condensator")) {
        return { name: "Capacit\xE0 elettrica", unit: "F", sample: 1e-4 };
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
    if (topic.includes("chimica")) {
      if (symbol === "F") {
        return { name: "Costante di Faraday", unit: "C/mol", sample: 96485 };
      }
      if (symbol === "R") {
        return { name: "Costante universale dei gas", unit: "J/(mol\xB7K)", sample: 8.314 };
      }
      if (symbol === "Q") {
        return { name: "Quoziente di reazione", unit: "adimensionale", sample: 0.01 };
      }
      if (symbol === "z") {
        return { name: "Numero di elettroni scambiati", unit: "adimensionale", sample: 2 };
      }
      if (symbol === "B") {
        return { name: "Concentrazione base debole [B]", unit: "mol/L", sample: 0.1 };
      }
      if (symbol === "x1") {
        return { name: "Frazione molare solvente", unit: "adimensionale", sample: 0.95 };
      }
      if (symbol === "A") {
        return { name: "Concentrazione base coniugata [A\u207B]", unit: "mol/L", sample: 0.1 };
      }
      if (symbol === "M") {
        return { name: "Molarit\xE0 / Concentrazione molare", unit: "mol/L", sample: 1 };
      }
      if (symbol === "M1") {
        return { name: "Molarit\xE0 iniziale", unit: "mol/L", sample: 1 };
      }
      if (symbol === "M2") {
        return { name: "Molarit\xE0 finale", unit: "mol/L", sample: 0.2 };
      }
      if (symbol === "V") {
        return { name: "Volume della soluzione o del gas", unit: "L", sample: 1 };
      }
      if (symbol === "V1") {
        return { name: "Volume iniziale", unit: "L", sample: 0.05 };
      }
      if (symbol === "V2") {
        return { name: "Volume finale", unit: "L", sample: 0.25 };
      }
      if (symbol === "a") {
        return { name: "Parametro attrattivo di Van der Waals", unit: "Pa\xB7m\u2076/mol\xB2", sample: 0.136 };
      }
      if (symbol === "b") {
        return { name: "Covolume di Van der Waals", unit: "m\xB3/mol", sample: 39e-6 };
      }
      if (symbol === "E0") {
        return { name: "Potenziale standard di riduzione", unit: "V", sample: 1.1 };
      }
      if (symbol === "E") {
        return { name: "Potenziale elettrochimico reale", unit: "V", sample: 1.05 };
      }
      if (symbol === "i") {
        return { name: "Fattore di van 't Hoff", unit: "adimensionale", sample: 1 };
      }
    }
    if (topic.includes("astrofisica") || topic.includes("gravita")) {
      if (symbol === "c") {
        return { name: "Velocit\xE0 della luce nel vuoto", unit: "m/s", sample: 2998e5 };
      }
      if (symbol === "a") {
        return { name: "Semiasse maggiore dell'orbita", unit: "m", sample: 1496e8 };
      }
      if (symbol === "L") {
        return { name: "Luminosit\xE0 stellare / Momento angolare", unit: "W", sample: 3828e23 };
      }
      if (symbol === "b") {
        return { name: "Costante dello spostamento di Wien", unit: "m\xB7K", sample: 2898e-6 };
      }
      if (symbol === "R") {
        return { name: "Raggio stellare", unit: "m", sample: 6963e5 };
      }
      if (symbol === "z") {
        return { name: "Parametro di redshift cosmologico", unit: "adimensionale", sample: 0.05 };
      }
    }
    if (topic.includes("ottica")) {
      if (symbol === "a") {
        return { name: "Larghezza della fenditura", unit: "m", sample: 1e-4 };
      }
      if (symbol === "d") {
        return { name: "Passo del reticolo / Distanza fenditure", unit: "m", sample: 2e-4 };
      }
      if (symbol === "L") {
        return { name: "Distanza fenditure-schermo", unit: "m", sample: 1.5 };
      }
      if (symbol === "m") {
        return { name: "Ordine di interferenza / diffrazione", unit: "adimensionale", sample: 1 };
      }
      if (symbol === "I") {
        return { name: "Intensit\xE0 luminosa trasmessa", unit: "W/m\xB2", sample: 500 };
      }
      if (symbol === "I0") {
        return { name: "Intensit\xE0 incidente", unit: "W/m\xB2", sample: 1e3 };
      }
    }
    if (PHYSICAL_QUANTITIES[symbol]) {
      return { ...PHYSICAL_QUANTITIES[symbol] };
    }
    const normalized = symbol.replace(/_/g, "");
    if (PHYSICAL_QUANTITIES[normalized]) {
      return { ...PHYSICAL_QUANTITIES[normalized] };
    }
    if (symbol.startsWith("Delta_") || symbol.startsWith("d")) {
      const baseSym = symbol.startsWith("Delta_") ? symbol.slice(6) : symbol.slice(1);
      if (PHYSICAL_QUANTITIES[baseSym]) {
        const baseInfo = PHYSICAL_QUANTITIES[baseSym];
        return {
          name: `Variazione di ${baseInfo.name.toLowerCase()}`,
          unit: baseInfo.unit,
          sample: baseInfo.sample !== void 0 ? Math.max(1, Math.round(baseInfo.sample * 0.2)) : 5
        };
      }
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

  // js/worksheet-export.js
  function escapeLatexText(str) {
    if (typeof str !== "string") return "";
    let s = str.replace(/\\/g, "\\textbackslash{}").replace(/([%&$#_{}])/g, "\\$1").replace(/~/g, "\\textasciitilde{}").replace(/\^/g, "\\textasciicircum{}");
    s = s.replace(/≠/g, "$\\neq$");
    s = s.replace(/≥/g, "$\\ge$");
    s = s.replace(/≤/g, "$\\le$");
    s = s.replace(/↔/g, "$\\leftrightarrow$");
    s = s.replace(/→/g, "$\\rightarrow$");
    s = s.replace(/±/g, "$\\pm$");
    s = s.replace(/·/g, "$\\cdot$");
    s = s.replace(/²/g, "$^2$");
    s = s.replace(/³/g, "$^3$");
    s = s.replace(/°/g, "$^\\circ$");
    s = s.replace(/θ/g, "$\\theta$");
    s = s.replace(/ω/g, "$\\omega$");
    s = s.replace(/λ/g, "$\\lambda$");
    s = s.replace(/ρ/g, "$\\rho$");
    s = s.replace(/π/g, "$\\pi$");
    s = s.replace(/Δ/g, "$\\Delta$");
    return s;
  }
  function escapeHtml2(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function solveFormulaSteps(formulaInput, targetVar) {
    let curr;
    try {
      curr = typeof formulaInput === "string" ? parseEquation(formulaInput) : clone(formulaInput);
    } catch (err) {
      return {
        success: false,
        error: "Impossibile analizzare la formula: " + (err.message || String(err)),
        steps: [],
        finalEquation: null,
        finalLatex: "",
        conditions: []
      };
    }
    if (!targetVar) {
      const vars = collectVars(curr);
      targetVar = vars[0] || "x";
    }
    const steps = [];
    const conditions = /* @__PURE__ */ new Set();
    const maxIterations = 25;
    let iterations = 0;
    while (!isGoalReached(curr, targetVar) && iterations < maxIterations) {
      iterations++;
      const sug = suggestNextStep(curr, targetVar);
      if (!sug || !sug.found || !sug.action) {
        break;
      }
      const beforeEq = clone(curr);
      const res = performAction(curr, sug.action);
      if (!res || !res.ok) {
        break;
      }
      curr = res.equation;
      if (res.condition) {
        conditions.add(res.condition);
      }
      steps.push({
        stepNum: iterations,
        label: sug.action && sug.action.label || sug.message || `Passaggio ${iterations}`,
        description: sug.action && sug.action.description || "",
        ruleKey: sug.action && sug.action.ruleKey || "",
        beforeEq,
        afterEq: clone(curr),
        latexBefore: toLatex(beforeEq),
        latexAfter: toLatex(curr),
        prettyAfter: toPretty(curr)
      });
    }
    if (isGoalReached(curr, targetVar)) {
      try {
        const adjusted = ensureTargetOnFirstMember(curr, targetVar);
        if (toPretty(adjusted) !== toPretty(curr)) {
          const beforeEq = clone(curr);
          curr = adjusted;
          steps.push({
            stepNum: steps.length + 1,
            label: "Regola dello specchio",
            description: "Porta la grandezza incognita al primo membro (A = B \u2194 B = A).",
            ruleKey: "swapMembers",
            beforeEq,
            afterEq: clone(curr),
            latexBefore: toLatex(beforeEq),
            latexAfter: toLatex(curr),
            prettyAfter: toPretty(curr)
          });
        }
      } catch (e) {
      }
    }
    const success = isGoalReached(curr, targetVar);
    return {
      success,
      initialEquation: typeof formulaInput === "string" ? parseEquation(formulaInput) : formulaInput,
      finalEquation: curr,
      finalLatex: toLatex(curr),
      finalPretty: toPretty(curr),
      targetVar,
      targetVarPretty: prettyVar(targetVar),
      steps,
      conditions: Array.from(conditions)
    };
  }
  function buildWorksheetExercises(options = {}) {
    const {
      source = "topic",
      // 'topic' | 'current' | 'user' | 'all'
      topic = "all",
      difficulty = "all",
      count = 5,
      pointsPerExercise = 2,
      randomizeTargets = true,
      requireConditions = true,
      currentFormula = null,
      currentTarget = null
    } = options;
    let pool = [];
    if (source === "current") {
      if (currentFormula) {
        pool = [currentFormula];
      } else {
        pool = FORMULAS.slice(0, 1);
      }
    } else if (source === "user") {
      const userForms = getUserFormulas();
      pool = userForms.length > 0 ? userForms : FORMULAS.slice(0, 5);
    } else if (source === "all") {
      pool = [...FORMULAS, ...getUserFormulas()];
    } else {
      if (topic === "all") {
        pool = FORMULAS.slice();
      } else {
        pool = FORMULAS.filter((f) => f.topic === topic);
        if (pool.length === 0) pool = FORMULAS.slice();
      }
    }
    if (difficulty !== "all" && source !== "current") {
      if (difficulty === "4-5") {
        const filtered = pool.filter((f) => (f.difficulty || 2) >= 4);
        if (filtered.length > 0) pool = filtered;
      } else {
        const diffNum = Number(difficulty);
        const filtered = pool.filter((f) => (f.difficulty || 2) === diffNum);
        if (filtered.length > 0) pool = filtered;
      }
    }
    const shuffled = pool.slice();
    if (source !== "current") {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    const selectedCount = Math.min(Math.max(1, count), shuffled.length);
    const selectedEntries = shuffled.slice(0, selectedCount);
    return selectedEntries.map((entry, idx) => {
      let parsedEq;
      try {
        parsedEq = parseEquation(entry.formula);
      } catch (e) {
        parsedEq = parseEquation("v = s/t");
      }
      const isolable = Array.isArray(entry.isolate) && entry.isolate.length > 0 ? entry.isolate : collectVars(parsedEq);
      let targetVar;
      if (source === "current" && currentTarget) {
        targetVar = currentTarget;
      } else if (randomizeTargets && isolable.length > 1) {
        const leftVar = parsedEq.left && parsedEq.left.type === "Var" ? parsedEq.left.name : null;
        const candidates = leftVar && isolable.length > 1 ? isolable.filter((v) => v !== leftVar) : isolable;
        targetVar = candidates[Math.floor(Math.random() * candidates.length)] || isolable[0];
      } else {
        targetVar = isolable[0] || "x";
      }
      const solution = solveFormulaSteps(entry.formula, targetVar);
      return {
        index: idx + 1,
        id: entry.id || `es-${idx + 1}`,
        name: entry.name || `Formula ${idx + 1}`,
        topic: entry.topic || "Fisica",
        difficulty: entry.difficulty || 2,
        formulaStr: entry.formula,
        parsedEquation: parsedEq,
        latexFormula: toLatex(parsedEq),
        targetVar,
        targetVarPretty: prettyVar(targetVar),
        latexTarget: prettyVar(targetVar),
        conditions: requireConditions && Array.isArray(entry.conditions) ? entry.conditions : [],
        points: Number(pointsPerExercise) || 2,
        solution
      };
    });
  }
  function generateLatexDocument(exercises, options = {}) {
    const {
      docType = "test",
      // 'test' | 'worksheet' | 'recovery'
      title = "Verifica di Fisica: Formule Inverse",
      school = "Istituto d'Istruzione Superiore",
      subject = "Fisica",
      className = "",
      teacher = "",
      date = "",
      spaceType = "grid",
      // 'grid' | 'lines' | 'blank' | 'compact'
      spaceHeight = 4,
      solutions = "appendix",
      // 'appendix' | 'result_only' | 'none'
      reqConditions = true
    } = options;
    const totalPoints = exercises.reduce((sum, ex) => sum + (ex.points || 2), 0);
    let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[italian]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{a4paper, top=2cm, bottom=2cm, left=2cm, right=2cm}
\\usepackage{fancyhdr}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{tikz}

\\pagestyle{fancy}
\\fancyhf{}
`;
    if (docType === "test") {
      tex += `\\lhead{\\textbf{Materia:} ${escapeLatexText(subject)} \\quad \\textbf{Classe:} ${escapeLatexText(className) || "\\rule{2cm}{0.4pt}"}}
\\rhead{\\textbf{Data:} ${escapeLatexText(date) || "\\rule{2.5cm}{0.4pt}"} \\quad \\textbf{Docente:} ${escapeLatexText(teacher) || "\\rule{2.5cm}{0.4pt}"}}
\\cfoot{Pagina \\thepage}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${escapeLatexText(title)}}} \\\\[4pt]
{\\large ${escapeLatexText(school)}} \\\\[8pt]
\\begin{tabular}{|p{7.5cm}|p{4cm}|p{4.5cm}|}
\\hline
\\textbf{Cognome e Nome:} & \\textbf{Data:} & \\textbf{Punteggio / Valutazione:} \\\\
\\rule{0pt}{1.8em} & & \\hfill / ${totalPoints} pt \\\\
\\hline
\\end{tabular}
\\end{center}
\\vspace{0.3cm}

\\noindent\\textbf{Istruzioni:} Per ciascuna delle seguenti formule, isola la grandezza indicata applicando rigorosamente i principi di equivalenza delle equazioni. Mostra tutti i passaggi intermedi ed esplicita eventuali condizioni di validit\xE0 (denominatori $\\neq 0$, radicandi $\\ge 0$).
\\vspace{0.4cm}
`;
    } else {
      tex += `\\lhead{\\textbf{${escapeLatexText(subject)}} \\quad \\textbf{Classe:} ${escapeLatexText(className) || "\\rule{2cm}{0.4pt}"}}
\\rhead{\\textbf{Data:} ${escapeLatexText(date) || "\\rule{2.5cm}{0.4pt}"}}
\\cfoot{Pagina \\thepage}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${escapeLatexText(title)}}} \\\\[4pt]
{\\large ${escapeLatexText(school)}}
\\end{center}
\\vspace{0.3cm}

\\noindent\\textbf{Obiettivo didattico:} Ricava la grandezza richiesta per ciascuna equazione giustificando i passaggi con il primo o il secondo principio di equivalenza.
\\vspace{0.4cm}
`;
    }
    exercises.forEach((ex) => {
      tex += `\\subsection*{Esercizio ${ex.index}: ${escapeLatexText(ex.name)} \\hfill \\textnormal{[Punti: ${ex.points}]}}
\\noindent Dalla formula:
\\begin{equation*}
${ex.latexFormula}
\\end{equation*}
ricava la grandezza incognita: $\\mathbf{${ex.latexTarget}}$.
`;
      if (reqConditions && ex.conditions && ex.conditions.length > 0) {
        tex += `\\par\\noindent\\textit{Condizioni di validit\xE0 iniziali:} $${ex.conditions.join(", ")}$
`;
      }
      tex += `\\par\\noindent\\textbf{Svolgimento:}\\par
`;
      if (spaceType === "grid") {
        tex += `\\begin{center}
\\begin{tikzpicture}
\\draw[step=0.5cm,gray!35,very thin] (0,0) grid (\\textwidth, ${spaceHeight});
\\end{tikzpicture}
\\end{center}
`;
      } else if (spaceType === "lines") {
        tex += `\\vspace{0.2cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}\\par\\vspace{0.75cm}
\\noindent\\rule{\\textwidth}{0.3pt}
\\vspace{0.2cm}
`;
      } else if (spaceType === "blank") {
        tex += `\\vspace{${spaceHeight}cm}
`;
      } else {
        tex += `\\vspace{1cm}
`;
      }
    });
    if (solutions === "appendix") {
      tex += `\\newpage
\\fancyhead[L]{\\textbf{SOLUZIONARIO E GUIDA DOCENTE}}
\\fancyhead[R]{\\textbf{${escapeLatexText(subject)}}}
\\section*{Soluzioni e Svolgimenti Dettagliati}
\\noindent\\textit{Guida per il docente con tutti i passaggi algebrici risolutivi e le condizioni di validit\xE0.}
\\bigskip

`;
      exercises.forEach((ex) => {
        tex += `\\subsection*{Soluzione Esercizio ${ex.index}: ${escapeLatexText(ex.name)}}
\\noindent Formula di partenza: $${ex.latexFormula}$ \\quad $\\rightarrow$ \\quad Isolare: $\\mathbf{${ex.latexTarget}}$
\\par\\vspace{0.2cm}
\\noindent\\textbf{Formula finale ricavata:}
\\begin{equation*}
\\mathbf{${ex.solution.finalLatex || ex.latexFormula}}
\\end{equation*}
`;
        if (ex.solution.steps && ex.solution.steps.length > 0) {
          tex += `\\noindent\\textbf{Passaggi di risoluzione:}
\\begin{enumerate}[label=\\textbf{Passaggio \\arabic*:}]
`;
          ex.solution.steps.forEach((st) => {
            tex += `  \\item \\textbf{${escapeLatexText(st.label)}}${st.description ? ` \\\\ \\textit{${escapeLatexText(st.description)}}` : ""}
  \\begin{equation*}
  ${st.latexAfter}
  \\end{equation*}
`;
          });
          tex += `\\end{enumerate}
`;
        }
        if (ex.solution.conditions && ex.solution.conditions.length > 0) {
          tex += `\\noindent\\textbf{Condizioni di validit\xE0 maturate:} $${ex.solution.conditions.join(", ")}$
`;
        }
        tex += `\\bigskip
`;
      });
    } else if (solutions === "result_only") {
      tex += `\\newpage
\\section*{Griglia Sintetica delle Soluzioni}
\\begin{center}
\\begin{tabular}{|c|p{4.5cm}|c|p{5.5cm}|c|}
\\hline
\\textbf{N.} & \\textbf{Formula di partenza} & \\textbf{Incognita} & \\textbf{Formula finale ricavata} & \\textbf{Punti} \\\\
\\hline
`;
      exercises.forEach((ex) => {
        tex += `${ex.index} & $${ex.latexFormula}$ & $${ex.latexTarget}$ & $\\mathbf{${ex.solution.finalLatex || ex.latexFormula}}$ & ${ex.points} pt \\\\ \\hline
`;
      });
      tex += `\\end{tabular}
\\end{center}
`;
    }
    tex += `\\end{document}
`;
    return tex;
  }
  function generateHtmlWorksheet(exercises, options = {}, standalone = true) {
    const {
      docType = "test",
      title = "Verifica di Fisica: Formule Inverse",
      school = "Istituto d'Istruzione Superiore",
      subject = "Fisica",
      className = "",
      teacher = "",
      date = "",
      spaceType = "grid",
      spaceHeight = 4,
      solutions = "appendix",
      reqConditions = true
    } = options;
    const totalPoints = exercises.reduce((sum, ex) => sum + (ex.points || 2), 0);
    const heightMm = Math.round((spaceHeight || 4) * 10);
    let html = "";
    if (standalone) {
      html += `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml2(title)}</title>
<style>
  :root {
    --text: #0f172a;
    --text-muted: #475569;
    --border: #cbd5e1;
    --bg-page: #f8fafc;
    --card: #ffffff;
    --primary: #2563eb;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-math: 'STIX Two Text', 'Cambria Math', Georgia, serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-sans);
    color: var(--text);
    background: var(--bg-page);
    line-height: 1.5;
    padding: 2rem 1rem;
  }
  .print-page {
    max-width: 210mm;
    margin: 0 auto 2rem;
    background: var(--card);
    padding: 20mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border-radius: 8px;
  }
  .no-print-toolbar {
    position: sticky;
    top: 1rem;
    z-index: 100;
    max-width: 210mm;
    margin: 0 auto 1.5rem;
    background: #1e293b;
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .toolbar-brand { font-weight: 600; font-size: 0.95rem; }
  .toolbar-actions { display: flex; gap: 0.5rem; }
  .tb-btn {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 6px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tb-btn-primary { background: #3b82f6; color: white; }
  .tb-btn-primary:hover { background: #2563eb; }
  .tb-btn-secondary { background: #334155; color: white; }
  .tb-btn-secondary:hover { background: #475569; }

  /* Intestazione scheda */
  .sheet-header {
    border-bottom: 2px solid var(--text);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  .sheet-title-group { text-align: center; margin-bottom: 1rem; }
  .sheet-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .sheet-school { font-size: 1rem; color: var(--text-muted); font-weight: 500; }
  
  /* Tabella dati studente */
  .student-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.8rem;
  }
  .student-table td {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  .student-table .fill-line {
    display: inline-block;
    border-bottom: 1px dotted var(--text-muted);
    min-width: 120px;
  }

  /* Istruzioni */
  .instructions-box {
    background: #f1f5f9;
    border-left: 4px solid var(--primary);
    padding: 0.75rem 1rem;
    font-size: 0.88rem;
    margin-bottom: 1.5rem;
    border-radius: 0 4px 4px 0;
  }

  /* Esercizi */
  .exercise-item {
    margin-bottom: 1.8rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .exercise-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.4rem;
  }
  .exercise-num { font-weight: 700; font-size: 1.05rem; }
  .exercise-points {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    background: #e2e8f0;
    padding: 2px 8px;
    border-radius: 12px;
  }
  .exercise-prompt {
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
  }
  .target-badge {
    display: inline-block;
    font-family: var(--font-math);
    font-weight: 700;
    font-size: 1.15rem;
    color: #1e40af;
    background: #dbeafe;
    padding: 0 8px;
    border-radius: 4px;
    border: 1px solid #bfdbfe;
  }
  .exercise-eq-box {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.6rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    margin-bottom: 0.6rem;
    font-size: 1.3rem;
    font-family: var(--font-math);
  }
  .exercise-conditions {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 0.4rem;
  }

  /* Spazio di svolgimento */
  .workspace-box {
    width: 100%;
    margin-top: 0.4rem;
    border-radius: 4px;
    position: relative;
  }
  .workspace-box.workspace-grid {
    height: ${heightMm}mm;
    border: 1px solid #cbd5e1;
    background-size: 5mm 5mm;
    background-image: 
      linear-gradient(to right, #e2e8f0 1px, transparent 1px),
      linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
  }
  .workspace-box.workspace-lines {
    height: ${heightMm}mm;
    background-image: repeating-linear-gradient(transparent, transparent 7.5mm, #cbd5e1 7.5mm, #cbd5e1 8mm);
    border-bottom: 1px solid #cbd5e1;
  }
  .workspace-box.workspace-blank {
    height: ${heightMm}mm;
    border: 1px dashed #cbd5e1;
  }
  .workspace-box.workspace-compact {
    height: 15mm;
    border-bottom: 1px solid #e2e8f0;
  }

  /* Sezione Soluzioni */
  .solutions-page {
    page-break-before: always;
    break-before: page;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px dashed #94a3b8;
  }
  .solutions-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .solutions-title { font-size: 1.35rem; font-weight: 800; color: #047857; }
  .solution-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1.25rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .solution-card-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #065f46;
  }
  .solution-final-box {
    background: #ffffff;
    border: 2px solid #10b981;
    border-radius: 6px;
    padding: 0.6rem;
    text-align: center;
    font-family: var(--font-math);
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0.5rem 0;
  }
  .solution-steps-list {
    margin: 0.5rem 0 0.5rem 1.2rem;
    font-size: 0.88rem;
  }
  .solution-step-item {
    margin-bottom: 0.5rem;
  }
  .step-label { font-weight: 600; color: #1e293b; }
  .step-desc { font-style: italic; color: #475569; }
  .step-eq {
    display: inline-block;
    background: #ffffff;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    margin-top: 2px;
    font-family: var(--font-math);
  }

  /* Stili matematici dedicati (compatibili con render.js) */
  .math-eq { display: inline-flex; align-items: center; font-family: var(--font-math); }
  .frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 .25rem; }
  .frac-num, .frac-den { padding: .1rem .35rem; }
  .frac-bar {
    display: block;
    width: 100%;
    height: 0 !important;
    min-height: 0 !important;
    border-top: 1.5px solid #000000 !important;
    border-bottom: none !important;
    background: transparent !important;
    margin: 2px 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .node-pow { display: inline-flex; align-items: baseline; }
  .pow-exp { font-size: .75em; vertical-align: super; line-height: 0; }
  .sub { font-size: .75em; vertical-align: sub; line-height: 0; }
  .math-radical {
    display: inline-flex;
    align-items: stretch;
    vertical-align: middle;
    position: relative;
    margin: 0 2px;
  }
  .radical-surd {
    position: absolute;
    left: 0;
    top: 0;
    width: .85em;
    height: 100%;
    overflow: visible;
    color: currentColor;
    display: block;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .radical-body {
    display: inline-flex;
    align-items: center;
    border-top: 1.5px solid #000000 !important;
    padding: 0.15rem 0.35rem 0.05rem 0.25rem;
    margin-left: .8em;
    font-family: var(--font-math);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .radical { display: inline-flex; align-items: stretch; margin: 0 2px; }
  .radical-sign { font-size: 1.3em; margin-right: 1px; }
  .radicand {
    border-top: 1.5px solid #000000 !important;
    padding: 2px 4px 0 2px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .op-plus, .op-minus, .op-times, .op-div, .eq-sign { margin: 0 .25rem; }

  /* Regole di stampa ottimizzate per foglio A4 */
  @media print {
    body { background: #ffffff !important; padding: 0 !important; }
    .print-page {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 10mm !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .no-print, .no-print-toolbar { display: none !important; }
    .exercise-item { page-break-inside: avoid !important; break-inside: avoid !important; }
    .solutions-page { page-break-before: always !important; break-before: page !important; }
    .workspace-box.workspace-grid,
    .workspace-box.workspace-lines {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .frac-bar {
      display: block !important;
      width: 100% !important;
      height: 0 !important;
      min-height: 0 !important;
      border-top: 1.5px solid #000000 !important;
      border-bottom: none !important;
      background: transparent !important;
      margin: 2px 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .radical-body,
    .radicand {
      border-top: 1.5px solid #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .radical-surd {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
</head>
<body>
<div class="no-print-toolbar no-print">
  <div class="toolbar-brand">\u{1F4C4} Scheda Didattica Formule Inverse</div>
  <div class="toolbar-actions">
    <button class="tb-btn tb-btn-primary" onclick="window.print()">\u{1F5A8}\uFE0F Stampa / Salva in PDF</button>
    <button class="tb-btn tb-btn-secondary" id="btn-tb-dl-latex">\u{1F4C4} Scarica LaTeX</button>
    <button class="tb-btn tb-btn-secondary" id="btn-tb-copy-latex">\u{1F4CB} Copia LaTeX</button>
    <button class="tb-btn tb-btn-secondary" onclick="window.close()">\u2715 Chiudi</button>
  </div>
</div>
`;
    } else {
      html += `<style>
  .print-page .frac-bar {
    display: block;
    width: 100%;
    height: 0 !important;
    min-height: 0 !important;
    border-top: 1.5px solid #000000 !important;
    border-bottom: none !important;
    background: transparent !important;
    margin: 2px 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-page .radical-body,
  .print-page .radicand {
    border-top: 1.5px solid #000000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @media print {
    .print-page .frac-bar {
      display: block !important;
      width: 100% !important;
      height: 0 !important;
      min-height: 0 !important;
      border-top: 1.5px solid #000000 !important;
      border-bottom: none !important;
      background: transparent !important;
      margin: 2px 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-page .radical-body,
    .print-page .radicand {
      border-top: 1.5px solid #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
`;
    }
    html += `<div class="print-page">
  <header class="sheet-header">
    <div class="sheet-title-group">
      <h1 class="sheet-title">${escapeHtml2(title)}</h1>
      <p class="sheet-school">${escapeHtml2(school)} \u2014 ${escapeHtml2(subject)}</p>
    </div>
`;
    if (docType === "test") {
      html += `    <table class="student-table" aria-label="Dati dello studente">
      <tr>
        <td style="width: 50%;"><strong>Cognome e Nome:</strong> <span class="fill-line"></span></td>
        <td style="width: 25%;"><strong>Classe:</strong> ${escapeHtml2(className) || '<span class="fill-line" style="min-width:60px;"></span>'}</td>
        <td style="width: 25%;"><strong>Data:</strong> ${escapeHtml2(date) || '<span class="fill-line" style="min-width:70px;"></span>'}</td>
      </tr>
      <tr>
        <td><strong>Docente:</strong> ${escapeHtml2(teacher) || '<span class="fill-line"></span>'}</td>
        <td colspan="2"><strong>Punteggio:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / <strong>${totalPoints} pt</strong> &nbsp;&nbsp;&nbsp; <strong>Voto:</strong></td>
      </tr>
    </table>
`;
    } else {
      html += `    <table class="student-table" aria-label="Intestazione">
      <tr>
        <td style="width: 60%;"><strong>Studente:</strong> <span class="fill-line"></span></td>
        <td style="width: 20%;"><strong>Classe:</strong> ${escapeHtml2(className) || '<span class="fill-line" style="min-width:50px;"></span>'}</td>
        <td style="width: 20%;"><strong>Data:</strong> ${escapeHtml2(date) || '<span class="fill-line" style="min-width:70px;"></span>'}</td>
      </tr>
    </table>
`;
    }
    html += `  </header>

  <div class="instructions-box">
    <strong>Istruzioni:</strong> Per ciascuna delle seguenti formule ricava la grandezza indicata applicando i principi di equivalenza. Mostra chiaramente ogni passaggio algebrico intermedio ed esplicita le condizioni di esistenza/validit\xE0 (denominatori $\\neq 0$, radicandi $\\ge 0$).
  </div>

  <main class="exercises-container">
`;
    exercises.forEach((ex) => {
      const renderedHtml = renderEquation(ex.parsedEquation, { interactive: false });
      html += `    <article class="exercise-item">
      <div class="exercise-header">
        <span class="exercise-num">Esercizio ${ex.index}: ${escapeHtml2(ex.name)}</span>
        <span class="exercise-points">${ex.points} pt</span>
      </div>
      <p class="exercise-prompt">
        Dalla formula sotto riportata, isola la grandezza: <strong class="target-badge">${escapeHtml2(ex.targetVarPretty)}</strong>
      </p>
      <div class="exercise-eq-box" aria-label="Formula">${renderedHtml}</div>
`;
      if (reqConditions && ex.conditions && ex.conditions.length > 0) {
        html += `      <div class="exercise-conditions">Condizioni di validit\xE0 iniziali: ${escapeHtml2(ex.conditions.join(", "))}</div>
`;
      }
      html += `      <div class="workspace-box workspace-${spaceType}" title="Spazio per lo svolgimento"></div>
    </article>
`;
    });
    html += `  </main>
`;
    if (solutions === "appendix") {
      html += `  <section class="solutions-page">
    <div class="solutions-header">
      <h2 class="solutions-title">Soluzioni e Guida alla Correzione (Docente)</h2>
      <p style="font-size: 0.9rem; color: #475569;">Svolgimenti passaggio per passaggio con principi di equivalenza</p>
    </div>
`;
      exercises.forEach((ex) => {
        const renderedFinal = ex.solution.finalEquation ? renderEquation(ex.solution.finalEquation, { interactive: false }) : `<code>${escapeHtml2(ex.solution.finalPretty || "")}</code>`;
        html += `    <div class="solution-card">
      <div class="solution-card-header">
        <span>Soluzione Esercizio ${ex.index}: ${escapeHtml2(ex.name)}</span>
        <span>${ex.points} pt</span>
      </div>
      <div class="solution-final-box">
        <strong>Formula ricavata:</strong> ${renderedFinal}
      </div>
`;
        if (ex.solution.steps && ex.solution.steps.length > 0) {
          html += `      <ol class="solution-steps-list">
`;
          ex.solution.steps.forEach((st) => {
            const renderedStep = st.afterEq ? renderEquation(st.afterEq, { interactive: false }) : escapeHtml2(st.prettyAfter || "");
            html += `        <li class="solution-step-item">
          <span class="step-label">${escapeHtml2(st.label)}:</span>
          ${st.description ? `<span class="step-desc">${escapeHtml2(st.description)}</span><br>` : ""}
          <div class="step-eq">${renderedStep}</div>
        </li>
`;
          });
          html += `      </ol>
`;
        }
        if (ex.solution.conditions && ex.solution.conditions.length > 0) {
          html += `      <div style="font-size: 0.84rem; color: #065f46; font-style: italic;">
        Condizioni di validit\xE0 maturate: ${escapeHtml2(ex.solution.conditions.join(", "))}
      </div>
`;
        }
        html += `    </div>
`;
      });
      html += `  </section>
`;
    }
    html += `</div>
`;
    if (standalone) {
      html += `</body>
</html>`;
    }
    return html;
  }
  function downloadWorksheetFile(filename, content, mimeType = "text/plain;charset=utf-8") {
    if (typeof window === "undefined" || !window.document) return false;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  }
  var activeWorksheetData = [];
  var activeLatexContent = "";
  var activeHtmlContent = "";
  function refreshWorksheetPreview(dom6, state6) {
    if (!dom6 || !dom6.worksheetModalBackdrop) return;
    const docType = dom6.worksheetDocType ? dom6.worksheetDocType.value : "test";
    const title = dom6.worksheetTitleInput ? dom6.worksheetTitleInput.value.trim() : "Verifica di Fisica: Formule Inverse";
    const school = dom6.worksheetSchoolInput ? dom6.worksheetSchoolInput.value.trim() : "Istituto d'Istruzione Superiore";
    const subject = dom6.worksheetSubjectInput ? dom6.worksheetSubjectInput.value.trim() : "Fisica";
    const className = dom6.worksheetClassInput ? dom6.worksheetClassInput.value.trim() : "";
    const teacher = dom6.worksheetTeacherInput ? dom6.worksheetTeacherInput.value.trim() : "";
    const source = dom6.worksheetSourceSelect ? dom6.worksheetSourceSelect.value : "topic";
    const topic = dom6.worksheetTopicSelect ? dom6.worksheetTopicSelect.value : "all";
    const count = dom6.worksheetCountInput ? parseInt(dom6.worksheetCountInput.value, 10) || 5 : 5;
    const difficulty = dom6.worksheetDifficultySelect ? dom6.worksheetDifficultySelect.value : "all";
    const points = dom6.worksheetPointsInput ? parseFloat(dom6.worksheetPointsInput.value) || 2 : 2;
    const spaceType = dom6.worksheetSpaceType ? dom6.worksheetSpaceType.value : "grid";
    const solutions = dom6.worksheetSolutionsSelect ? dom6.worksheetSolutionsSelect.value : "appendix";
    const randomizeTargets = dom6.worksheetRandomizeTargets ? dom6.worksheetRandomizeTargets.checked : true;
    const reqConditions = dom6.worksheetReqConditions ? dom6.worksheetReqConditions.checked : true;
    const currentFormula = state6 && state6.currentFormula ? state6.currentFormula : null;
    const currentTarget = state6 && state6.targetVar ? state6.targetVar : null;
    const exercises = buildWorksheetExercises({
      source,
      topic,
      difficulty,
      count,
      pointsPerExercise: points,
      randomizeTargets,
      requireConditions: reqConditions,
      currentFormula,
      currentTarget
    });
    activeWorksheetData = exercises;
    const options = {
      docType,
      title,
      school,
      subject,
      className,
      teacher,
      date: (/* @__PURE__ */ new Date()).toLocaleDateString("it-IT"),
      spaceType,
      spaceHeight: 4,
      solutions,
      reqConditions
    };
    activeLatexContent = generateLatexDocument(exercises, options);
    activeHtmlContent = generateHtmlWorksheet(exercises, options, true);
    if (dom6.worksheetSummaryCount) {
      dom6.worksheetSummaryCount.textContent = `${exercises.length} esercizi generati`;
    }
    if (dom6.worksheetSummaryPoints) {
      const totalPts = exercises.reduce((sum, ex) => sum + ex.points, 0);
      dom6.worksheetSummaryPoints.textContent = `Totale: ${totalPts} pt`;
    }
    if (dom6.worksheetSelectedList) {
      dom6.worksheetSelectedList.innerHTML = exercises.map((ex) => `
      <div class="worksheet-summary-item">
        <span class="summary-item-num">#${ex.index}</span>
        <div class="summary-item-info">
          <strong class="summary-item-name">${escapeHtml2(ex.name)}</strong>
          <span class="summary-item-eq"><code>${escapeHtml2(ex.formulaStr)}</code> &rarr; isola <strong>${escapeHtml2(ex.targetVarPretty)}</strong></span>
        </div>
        <span class="summary-item-pts">${ex.points} pt</span>
      </div>
    `).join("");
    }
    if (dom6.worksheetHtmlPreview) {
      dom6.worksheetHtmlPreview.innerHTML = generateHtmlWorksheet(exercises, options, false);
    }
    if (dom6.worksheetLatexCode) {
      dom6.worksheetLatexCode.value = activeLatexContent;
    }
  }
  function openWorksheetModal(dom6, state6) {
    if (!dom6 || !dom6.worksheetModalBackdrop) return;
    dom6.worksheetModalBackdrop.hidden = false;
    refreshWorksheetPreview(dom6, state6);
  }
  function closeWorksheetModal(dom6) {
    if (!dom6 || !dom6.worksheetModalBackdrop) return;
    dom6.worksheetModalBackdrop.hidden = true;
  }
  function initWorksheetExporter(dom6, state6) {
    if (!dom6) return;
    if (dom6.worksheetTopicSelect) {
      const existing = /* @__PURE__ */ new Set();
      FORMULAS.forEach((f) => {
        if (f.topic && !existing.has(f.topic)) {
          existing.add(f.topic);
          const opt = document.createElement("option");
          opt.value = f.topic;
          opt.textContent = f.topic.charAt(0).toUpperCase() + f.topic.slice(1);
          dom6.worksheetTopicSelect.appendChild(opt);
        }
      });
    }
    if (dom6.btnExportWorksheet) {
      dom6.btnExportWorksheet.addEventListener("click", () => {
        openWorksheetModal(dom6, state6);
      });
    }
    if (dom6.btnCloseWorksheetModal) {
      dom6.btnCloseWorksheetModal.addEventListener("click", () => closeWorksheetModal(dom6));
    }
    if (dom6.btnCloseWorksheet) {
      dom6.btnCloseWorksheet.addEventListener("click", () => closeWorksheetModal(dom6));
    }
    if (dom6.worksheetModalBackdrop) {
      dom6.worksheetModalBackdrop.addEventListener("click", (e) => {
        if (e.target === dom6.worksheetModalBackdrop) closeWorksheetModal(dom6);
      });
    }
    const inputsToWatch = [
      dom6.worksheetDocType,
      dom6.worksheetTitleInput,
      dom6.worksheetSchoolInput,
      dom6.worksheetSubjectInput,
      dom6.worksheetClassInput,
      dom6.worksheetTeacherInput,
      dom6.worksheetSourceSelect,
      dom6.worksheetTopicSelect,
      dom6.worksheetCountInput,
      dom6.worksheetDifficultySelect,
      dom6.worksheetPointsInput,
      dom6.worksheetSpaceType,
      dom6.worksheetSolutionsSelect,
      dom6.worksheetRandomizeTargets,
      dom6.worksheetReqConditions
    ];
    inputsToWatch.forEach((elem) => {
      if (elem) {
        elem.addEventListener("change", () => refreshWorksheetPreview(dom6, state6));
        if (elem.tagName === "INPUT" && elem.type === "text") {
          elem.addEventListener("input", () => refreshWorksheetPreview(dom6, state6));
        }
      }
    });
    if (dom6.btnTabPreviewHtml && dom6.btnTabPreviewLatex) {
      dom6.btnTabPreviewHtml.addEventListener("click", () => {
        dom6.btnTabPreviewHtml.classList.add("active");
        dom6.btnTabPreviewLatex.classList.remove("active");
        if (dom6.worksheetHtmlPreview) dom6.worksheetHtmlPreview.hidden = false;
        if (dom6.worksheetLatexCode) dom6.worksheetLatexCode.hidden = true;
      });
      dom6.btnTabPreviewLatex.addEventListener("click", () => {
        dom6.btnTabPreviewLatex.classList.add("active");
        dom6.btnTabPreviewHtml.classList.remove("active");
        if (dom6.worksheetHtmlPreview) dom6.worksheetHtmlPreview.hidden = true;
        if (dom6.worksheetLatexCode) dom6.worksheetLatexCode.hidden = false;
      });
    }
    if (dom6.btnPrintWorksheet) {
      dom6.btnPrintWorksheet.addEventListener("click", () => {
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.open();
          printWin.document.write(activeHtmlContent);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => {
            printWin.print();
          }, 350);
        } else {
          alert("Consenti i popup nel browser per aprire l'anteprima di stampa PDF.");
        }
      });
    }
    if (dom6.btnDownloadLatex) {
      dom6.btnDownloadLatex.addEventListener("click", () => {
        const filename = `scheda-formule-inverse-${Date.now()}.tex`;
        downloadWorksheetFile(filename, activeLatexContent, "text/x-tex;charset=utf-8");
      });
    }
    if (dom6.btnCopyLatex) {
      dom6.btnCopyLatex.addEventListener("click", () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(activeLatexContent).then(() => {
            const orig = dom6.btnCopyLatex.textContent;
            dom6.btnCopyLatex.textContent = "\u2713 Codice LaTeX Copiato!";
            setTimeout(() => {
              dom6.btnCopyLatex.textContent = orig;
            }, 2e3);
          });
        }
      });
    }
    if (dom6.btnDownloadHtml) {
      dom6.btnDownloadHtml.addEventListener("click", () => {
        const filename = `scheda-formule-inverse-${Date.now()}.html`;
        downloadWorksheetFile(filename, activeHtmlContent, "text/html;charset=utf-8");
      });
    }
  }

  // js/quiz.js
  var QUIZ_STORAGE_KEY = "formuleInverse.quizProgress";
  var DIFFICULTY_LEVELS = {
    easy: {
      id: "easy",
      name: "Base",
      label: "\u{1F7E2} Base (1-3 passaggi)",
      description: "Equazioni lineari e prodotti/frazioni dirette risolvibili con principi di equivalenza base.",
      minSteps: 1,
      maxSteps: 3,
      baseXp: 15,
      color: "#10b981"
    },
    medium: {
      id: "medium",
      name: "Intermedio",
      label: "\u{1F7E1} Intermedio (4-5 passaggi)",
      description: "Frazioni composte, somme algebriche e binomi con isolamento articolato.",
      minSteps: 4,
      maxSteps: 5,
      baseXp: 30,
      color: "#f59e0b"
    },
    hard: {
      id: "hard",
      name: "Avanzato",
      label: "\u{1F534} Avanzato (6+ passaggi)",
      description: "Formule avanzate con radici, potenze, m.c.m. o raccoglimenti a fattor comune.",
      minSteps: 6,
      maxSteps: 99,
      baseXp: 50,
      color: "#ef4444"
    }
  };
  function classifyFormulaDifficulty(formulaInput, targetVar) {
    const formulaStr = typeof formulaInput === "string" ? formulaInput : formulaInput.formula;
    const sol = solveFormulaSteps(formulaStr, targetVar);
    if (!sol || !sol.success) {
      return {
        level: "hard",
        steps: 99,
        solvable: false,
        solution: null
      };
    }
    const steps = sol.steps ? sol.steps.length : 0;
    let level = "easy";
    if (steps >= 6) {
      level = "hard";
    } else if (steps >= 4) {
      level = "medium";
    } else {
      level = "easy";
    }
    return {
      level,
      steps,
      solvable: true,
      solution: sol
    };
  }
  function getQuizFormulas(level = "all", topic = null) {
    const candidates = [];
    for (const f of FORMULAS) {
      if (topic && f.topic !== topic) continue;
      if (!f.isolate || f.isolate.length === 0) continue;
      let eq;
      try {
        eq = parseEquation(f.formula);
      } catch {
        continue;
      }
      for (const t of f.isolate) {
        if (isGoalReached(eq, t)) {
          continue;
        }
        const diff = classifyFormulaDifficulty(f.formula, t);
        if (!diff.solvable || diff.steps === 0) continue;
        if (level === "all" || diff.level === level) {
          candidates.push({
            formulaEntry: f,
            targetVar: t,
            optimalSteps: diff.steps,
            level: diff.level
          });
        }
      }
    }
    return candidates;
  }
  function getRandomQuizExercise(level = "all", topic = null) {
    let list = getQuizFormulas(level, topic);
    if (list.length === 0 && topic) {
      list = getQuizFormulas(level, null);
    }
    if (list.length === 0) {
      list = getQuizFormulas("all", null);
    }
    if (list.length === 0) {
      const fallbackFormula = FORMULAS[0];
      return {
        formulaEntry: fallbackFormula,
        targetVar: fallbackFormula.isolate[1] || "t",
        optimalSteps: 2,
        level: "easy"
      };
    }
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }
  function calculateStepEfficiency(optimalSteps, performedSteps) {
    const opt = Math.max(1, Number(optimalSteps) || 1);
    const perf = Math.max(0, Number(performedSteps) || 0);
    const efficiency = Math.max(
      10,
      Math.min(100, Math.round(opt / Math.max(opt, perf) * 100))
    );
    let stars = 1;
    let isOptimal = false;
    let label = "\u2B50 Risolto con passaggi aggiuntivi";
    if (perf <= opt) {
      stars = 3;
      isOptimal = true;
      label = "\u2B50\u2B50\u2B50 Perfetto! Mosse ottimali";
    } else if (perf <= opt + 2) {
      stars = 2;
      label = "\u2B50\u2B50 Molto buono! Percorso efficiente";
    } else {
      stars = 1;
      label = "\u2B50 Completato";
    }
    return {
      efficiency,
      stars,
      isOptimal,
      optimalSteps: opt,
      performedSteps: perf,
      label
    };
  }
  function calculateExerciseXp(level, stars, mistakesCount = 0, elapsedSeconds = 0) {
    const lvlConfig = DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS.easy;
    let xp = lvlConfig.baseXp;
    if (stars === 3) xp += 15;
    else if (stars === 2) xp += 5;
    if (mistakesCount === 0) xp += 5;
    if (elapsedSeconds > 0 && elapsedSeconds <= 45) xp += 5;
    return xp;
  }
  function getPlayerRank(totalXp = 0) {
    const xp = Math.max(0, Number(totalXp) || 0);
    const ranks = [
      { title: "Apprendista dei Principi", level: 1, minXp: 0, nextXp: 50, avatar: "\u{1F949}" },
      { title: "Praticante Algebrico", level: 2, minXp: 50, nextXp: 150, avatar: "\u{1F948}" },
      { title: "Esperto delle Formule", level: 3, minXp: 150, nextXp: 300, avatar: "\u{1F947}" },
      { title: "Maestro dell'Equivalenza", level: 4, minXp: 300, nextXp: 500, avatar: "\u{1F48E}" },
      { title: "Gran Maestro STEM", level: 5, minXp: 500, nextXp: 1e3, avatar: "\u{1F451}" }
    ];
    let current = ranks[0];
    for (const r of ranks) {
      if (xp >= r.minXp) current = r;
    }
    const range = current.nextXp - current.minXp;
    const currentInLevel = Math.max(0, xp - current.minXp);
    const progressPercent = Math.min(100, Math.round(currentInLevel / range * 100));
    return {
      title: current.title,
      level: current.level,
      avatar: current.avatar,
      currentXp: xp,
      minXp: current.minXp,
      nextXp: current.nextXp,
      progressPercent
    };
  }
  var MASTERY_BADGES = [
    {
      id: "first_win",
      title: "Primo Traguardo",
      icon: "\u{1F3AF}",
      description: "Completa con successo il tuo primo esercizio in modalit\xE0 Quiz.",
      category: "milestone",
      check: (stats) => stats.totalSolved >= 1
    },
    {
      id: "optimal_sniper",
      title: "Cecchino Algebrico",
      icon: "\u26A1",
      description: "Risolvi un esercizio con efficienza 100% (mosse ottimali).",
      category: "skill",
      check: (stats, res) => !!(res && res.stars === 3 && res.performedSteps <= res.optimalSteps)
    },
    {
      id: "flawless",
      title: "Mente Rigorosa",
      icon: "\u{1F6E1}\uFE0F",
      description: "Risolvi un esercizio senza commettere nessun errore di principio.",
      category: "skill",
      check: (stats, res) => !!(res && res.mistakesCount === 0)
    },
    {
      id: "easy_trio",
      title: "Basi d'Acciaio",
      icon: "\u{1F7E2}",
      description: "Completa 3 esercizi di livello Base.",
      category: "difficulty",
      check: (stats) => stats.solvedByLevel && stats.solvedByLevel.easy >= 3
    },
    {
      id: "medium_trio",
      title: "Architetto delle Formule",
      icon: "\u{1F7E1}",
      description: "Completa 3 esercizi di livello Intermedio.",
      category: "difficulty",
      check: (stats) => stats.solvedByLevel && stats.solvedByLevel.medium >= 3
    },
    {
      id: "hard_master",
      title: "Campione delle Inverse",
      icon: "\u{1F534}",
      description: "Completa 2 esercizi di livello Avanzato.",
      category: "difficulty",
      check: (stats) => stats.solvedByLevel && stats.solvedByLevel.hard >= 2
    },
    {
      id: "triple_three_stars",
      title: "Caccia alle Tre Stelle",
      icon: "\u2B50",
      description: "Ottieni 3 stelle (punteggio perfetto) in almeno 3 esercizi.",
      category: "mastery",
      check: (stats) => stats.perfectSolves >= 3
    },
    {
      id: "streak_3",
      title: "Inarrestabile (x3)",
      icon: "\u{1F525}",
      description: "Raggiungi una serie di 3 esercizi completati consecutivamente.",
      category: "streak",
      check: (stats) => stats.bestStreak >= 3
    },
    {
      id: "streak_5",
      title: "Dominio Totale (x5)",
      icon: "\u{1F30B}",
      description: "Raggiungi una serie di 5 esercizi completati consecutivamente.",
      category: "streak",
      check: (stats) => stats.bestStreak >= 5
    },
    {
      id: "speed_demon",
      title: "Risolutore Rapido",
      icon: "\u23F1\uFE0F",
      description: "Risolvi un esercizio in meno di 45 secondi.",
      category: "speed",
      check: (stats, res) => !!(res && res.elapsedSeconds > 0 && res.elapsedSeconds <= 45)
    },
    {
      id: "stem_explorer",
      title: "Esploratore STEM",
      icon: "\u{1F310}",
      description: "Completa esercizi in almeno 3 argomenti fisici o matematici diversi.",
      category: "exploration",
      check: (stats) => Array.isArray(stats.topicsExplored) && stats.topicsExplored.length >= 3
    },
    {
      id: "xp_centurion",
      title: "Club dei 100 XP",
      icon: "\u{1F4AF}",
      description: "Accumula almeno 100 Punti Esperienza nel Quiz.",
      category: "points",
      check: (stats) => stats.points >= 100
    }
  ];
  function checkBadgesToUnlock(stats, latestResult = null) {
    const newlyUnlocked = [];
    const currentBadges = stats.badges || {};
    for (const badge of MASTERY_BADGES) {
      if (currentBadges[badge.id] && currentBadges[badge.id].unlocked) {
        continue;
      }
      try {
        if (badge.check(stats, latestResult)) {
          newlyUnlocked.push(badge.id);
        }
      } catch (e) {
      }
    }
    return newlyUnlocked;
  }
  function getDefaultProgress() {
    return {
      totalSolved: 0,
      solvedByLevel: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      perfectSolves: 0,
      totalOptimalSteps: 0,
      totalPerformedSteps: 0,
      averageEfficiency: 100,
      streak: 0,
      bestStreak: 0,
      points: 0,
      topicsExplored: [],
      badges: {},
      recentHistory: []
    };
  }
  function getSafeStorage(customStorage) {
    if (customStorage) return customStorage;
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    return null;
  }
  function loadQuizProgress(customStorage = null) {
    const store = getSafeStorage(customStorage);
    if (!store) return getDefaultProgress();
    try {
      const raw = store.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return getDefaultProgress();
      const data = JSON.parse(raw);
      const def = getDefaultProgress();
      return {
        ...def,
        ...data,
        solvedByLevel: { ...def.solvedByLevel, ...data.solvedByLevel || {} },
        badges: { ...data.badges || {} },
        topicsExplored: Array.isArray(data.topicsExplored) ? data.topicsExplored : [],
        recentHistory: Array.isArray(data.recentHistory) ? data.recentHistory : []
      };
    } catch (err) {
      return getDefaultProgress();
    }
  }
  function saveQuizProgress(progress, customStorage = null) {
    const store = getSafeStorage(customStorage);
    if (!store) return false;
    try {
      store.setItem(QUIZ_STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (err) {
      return false;
    }
  }
  function resetQuizProgress(customStorage = null) {
    const store = getSafeStorage(customStorage);
    if (store) {
      try {
        store.removeItem(QUIZ_STORAGE_KEY);
      } catch (e) {
      }
    }
    return getDefaultProgress();
  }
  function recordQuizResult(progress, exerciseDetails, customStorage = null) {
    const p = progress ? JSON.parse(JSON.stringify(progress)) : getDefaultProgress();
    const d = exerciseDetails || {};
    const level = d.level || "easy";
    const optSteps = Math.max(1, Number(d.optimalSteps) || 1);
    const perfSteps = Math.max(0, Number(d.performedSteps) || 0);
    const mistakes = Math.max(0, Number(d.mistakesCount) || 0);
    const elapsed = Math.max(0, Number(d.elapsedSeconds) || 0);
    const topic = d.topic || "fisica";
    const effResult = calculateStepEfficiency(optSteps, perfSteps);
    const xpEarned = calculateExerciseXp(level, effResult.stars, mistakes, elapsed);
    p.totalSolved = (p.totalSolved || 0) + 1;
    p.solvedByLevel = p.solvedByLevel || { easy: 0, medium: 0, hard: 0 };
    p.solvedByLevel[level] = (p.solvedByLevel[level] || 0) + 1;
    if (effResult.stars === 3) {
      p.perfectSolves = (p.perfectSolves || 0) + 1;
    }
    p.totalOptimalSteps = (p.totalOptimalSteps || 0) + optSteps;
    p.totalPerformedSteps = (p.totalPerformedSteps || 0) + perfSteps;
    p.averageEfficiency = Math.round(
      p.totalOptimalSteps / Math.max(p.totalOptimalSteps, p.totalPerformedSteps) * 100
    );
    p.streak = (p.streak || 0) + 1;
    p.bestStreak = Math.max(p.bestStreak || 0, p.streak);
    p.points = (p.points || 0) + xpEarned;
    p.topicsExplored = Array.isArray(p.topicsExplored) ? p.topicsExplored : [];
    if (topic && !p.topicsExplored.includes(topic)) {
      p.topicsExplored.push(topic);
    }
    const resultForBadges = {
      ...d,
      level,
      optimalSteps: optSteps,
      performedSteps: perfSteps,
      mistakesCount: mistakes,
      elapsedSeconds: elapsed,
      stars: effResult.stars,
      efficiency: effResult.efficiency,
      isOptimal: effResult.isOptimal,
      xpEarned
    };
    const newlyUnlocked = checkBadgesToUnlock(p, resultForBadges);
    p.badges = p.badges || {};
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    for (const bId of newlyUnlocked) {
      p.badges[bId] = {
        unlocked: true,
        unlockedAt: nowIso
      };
    }
    p.recentHistory = Array.isArray(p.recentHistory) ? p.recentHistory : [];
    p.recentHistory.unshift({
      timestamp: nowIso,
      formulaId: d.formulaId || "",
      formulaName: d.formulaName || "",
      formulaStr: d.formulaStr || "",
      targetVar: d.targetVar || "",
      level,
      optimalSteps: optSteps,
      performedSteps: perfSteps,
      stars: effResult.stars,
      efficiency: effResult.efficiency,
      xpEarned
    });
    if (p.recentHistory.length > 20) {
      p.recentHistory = p.recentHistory.slice(0, 20);
    }
    saveQuizProgress(p, customStorage);
    return {
      updatedProgress: p,
      newlyUnlockedBadges: newlyUnlocked,
      xpEarned,
      stars: effResult.stars,
      efficiency: effResult.efficiency,
      isOptimal: effResult.isOptimal
    };
  }
  function initQuizManager(dom6, state6, handlers = {}) {
    let activeQuizExercise = null;
    let quizStartTime = null;
    let quizTimerInterval = null;
    let performedMoves = 0;
    let mistakesCount = 0;
    let selectedLevel = "easy";
    let selectedTopic = "";
    if (dom6.quizTopicSelect) {
      dom6.quizTopicSelect.innerHTML = '<option value="">Tutti gli argomenti</option>';
      TOPICS.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        dom6.quizTopicSelect.appendChild(opt);
      });
      dom6.quizTopicSelect.addEventListener("change", () => {
        selectedTopic = dom6.quizTopicSelect.value;
        startNewQuizExercise();
      });
    }
    const levelBtns = [
      { btn: dom6.quizLevelEasy, level: "easy" },
      { btn: dom6.quizLevelMedium, level: "medium" },
      { btn: dom6.quizLevelHard, level: "hard" },
      { btn: dom6.quizLevelAll, level: "all" }
    ];
    levelBtns.forEach(({ btn, level }) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        levelBtns.forEach((b) => b.btn && b.btn.classList.remove("active"));
        btn.classList.add("active");
        selectedLevel = level;
        startNewQuizExercise();
      });
    });
    if (dom6.quizBtnNew) {
      dom6.quizBtnNew.addEventListener("click", () => startNewQuizExercise());
    }
    if (dom6.quizBtnDashboard) {
      dom6.quizBtnDashboard.addEventListener("click", () => openDashboardModal());
    }
    if (dom6.btnQuizDashboard) {
      dom6.btnQuizDashboard.addEventListener("click", () => openDashboardModal());
    }
    if (dom6.quizBtnNextExercise) {
      dom6.quizBtnNextExercise.addEventListener("click", () => {
        closeCompletionModal();
        startNewQuizExercise();
      });
    }
    if (dom6.quizBtnRetryExercise) {
      dom6.quizBtnRetryExercise.addEventListener("click", () => {
        closeCompletionModal();
        retryCurrentQuizExercise();
      });
    }
    if (dom6.quizBtnViewStats) {
      dom6.quizBtnViewStats.addEventListener("click", () => {
        closeCompletionModal();
        openDashboardModal();
      });
    }
    if (dom6.quizBtnViewBoard) {
      dom6.quizBtnViewBoard.addEventListener("click", () => closeCompletionModal());
    }
    if (dom6.quizBtnCloseCompletion) {
      dom6.quizBtnCloseCompletion.addEventListener("click", () => closeCompletionModal());
    }
    if (dom6.quizBtnCloseDashboard) {
      dom6.quizBtnCloseDashboard.addEventListener("click", () => closeDashboardModal());
    }
    if (dom6.quizBtnCloseDashboardBottom) {
      dom6.quizBtnCloseDashboardBottom.addEventListener("click", () => closeDashboardModal());
    }
    if (dom6.quizBtnResetProgress) {
      dom6.quizBtnResetProgress.addEventListener("click", () => {
        if (confirm("Sei sicuro di voler azzerare tutti i progressi e i badge del Quiz? Questa azione non pu\xF2 essere annullata.")) {
          resetQuizProgress();
          renderDashboardModal();
        }
      });
    }
    if (dom6.quizCompletionModalBackdrop) {
      dom6.quizCompletionModalBackdrop.addEventListener("click", (e) => {
        if (e.target === dom6.quizCompletionModalBackdrop) closeCompletionModal();
      });
    }
    if (dom6.quizDashboardBackdrop) {
      dom6.quizDashboardBackdrop.addEventListener("click", (e) => {
        if (e.target === dom6.quizDashboardBackdrop) closeDashboardModal();
      });
    }
    function startTimer() {
      stopTimer();
      quizStartTime = Date.now();
      updateTimerDisplay();
      quizTimerInterval = setInterval(updateTimerDisplay, 1e3);
    }
    function stopTimer() {
      if (quizTimerInterval) {
        clearInterval(quizTimerInterval);
        quizTimerInterval = null;
      }
    }
    function updateTimerDisplay() {
      if (!dom6.quizTimer || !quizStartTime) return;
      const elapsed = Math.floor((Date.now() - quizStartTime) / 1e3);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const secs = String(elapsed % 60).padStart(2, "0");
      dom6.quizTimer.textContent = `\u23F1\uFE0F ${mins}:${secs}`;
    }
    function updateQuizHud() {
      if (!dom6.quizHud) return;
      const isQuizMode = state6.mode === "quiz";
      dom6.quizHud.hidden = !isQuizMode;
      if (!isQuizMode) return;
      if (activeQuizExercise) {
        const lvlConfig = DIFFICULTY_LEVELS[activeQuizExercise.level] || DIFFICULTY_LEVELS.easy;
        if (dom6.quizCurrentLevel) {
          dom6.quizCurrentLevel.textContent = `Livello: ${lvlConfig.name}`;
          dom6.quizCurrentLevel.style.borderColor = lvlConfig.color;
        }
        if (dom6.quizMovesCount) dom6.quizMovesCount.textContent = String(performedMoves);
        if (dom6.quizOptimalCount) dom6.quizOptimalCount.textContent = String(activeQuizExercise.optimalSteps);
        const eff = calculateStepEfficiency(activeQuizExercise.optimalSteps, performedMoves);
        if (dom6.quizEfficiencyBadge) {
          dom6.quizEfficiencyBadge.textContent = `${eff.efficiency}% ${"\u2B50".repeat(eff.stars)}`;
        }
      }
    }
    function startNewQuizExercise() {
      const exercise = getRandomQuizExercise(selectedLevel, selectedTopic || null);
      activeQuizExercise = exercise;
      performedMoves = 0;
      mistakesCount = 0;
      startTimer();
      updateQuizHud();
      if (handlers.loadFormula) {
        handlers.loadFormula(exercise.formulaEntry, exercise.targetVar);
      }
    }
    function retryCurrentQuizExercise() {
      if (!activeQuizExercise) {
        startNewQuizExercise();
        return;
      }
      performedMoves = 0;
      mistakesCount = 0;
      startTimer();
      updateQuizHud();
      if (handlers.loadFormula) {
        handlers.loadFormula(activeQuizExercise.formulaEntry, activeQuizExercise.targetVar);
      }
    }
    function onMoveExecuted(isValid) {
      if (state6.mode !== "quiz") return;
      if (isValid) {
        performedMoves++;
      } else {
        mistakesCount++;
      }
      updateQuizHud();
    }
    function onGoalReached() {
      if (state6.mode !== "quiz" || !activeQuizExercise) return;
      if (performedMoves === 0) return;
      stopTimer();
      const elapsed = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1e3) : 0;
      const currentProgress = loadQuizProgress();
      const exerciseDetails = {
        formulaId: activeQuizExercise.formulaEntry.id,
        formulaName: activeQuizExercise.formulaEntry.name,
        formulaStr: activeQuizExercise.formulaEntry.formula,
        targetVar: activeQuizExercise.targetVar,
        level: activeQuizExercise.level,
        topic: activeQuizExercise.formulaEntry.topic,
        optimalSteps: activeQuizExercise.optimalSteps,
        performedSteps: performedMoves,
        mistakesCount,
        elapsedSeconds: elapsed,
        finalEq: state6 && state6.currentEq ? clone(state6.currentEq) : null
      };
      const res = recordQuizResult(currentProgress, exerciseDetails);
      showCompletionModal(res, exerciseDetails);
    }
    function showCompletionModal(result, details) {
      if (!dom6.quizCompletionModalBackdrop) return;
      if (dom6.quizCompletionStars) {
        dom6.quizCompletionStars.textContent = "\u2B50".repeat(result.stars);
      }
      if (dom6.quizCompletionTitle) {
        dom6.quizCompletionTitle.textContent = result.stars === 3 ? "\u{1F3C6} Risoluzione Perfetta!" : result.stars === 2 ? "\u{1F389} Ottimo Lavoro!" : "\u2713 Esercizio Completato!";
      }
      if (dom6.quizCompletionMsg) {
        const varP = prettyVar(details.targetVar);
        dom6.quizCompletionMsg.textContent = `Hai isolato ${varP} in ${details.formulaName}.`;
      }
      if (dom6.quizCompletionFormula) {
        const eqToRender = details.finalEq || state6 && state6.currentEq;
        if (eqToRender) {
          dom6.quizCompletionFormula.innerHTML = renderEquation(eqToRender, {
            interactive: false,
            targetVar: details.targetVar
          });
          dom6.quizCompletionFormula.setAttribute("aria-label", `Formula finale ricavata: ${toPretty(eqToRender, 0)}`);
        }
      }
      if (dom6.quizCompletionStats) {
        dom6.quizCompletionStats.innerHTML = `
        <div class="completion-stat-row">
          <span>Mosse eseguite:</span>
          <strong>${details.performedSteps} (su ${details.optimalSteps} ottimali)</strong>
        </div>
        <div class="completion-stat-row">
          <span>Efficienza algebrica:</span>
          <strong class="${result.stars === 3 ? "text-success" : ""}">${result.efficiency}%</strong>
        </div>
        <div class="completion-stat-row">
          <span>Tempo impiegato:</span>
          <strong>${details.elapsedSeconds}s</strong>
        </div>
        <div class="completion-stat-row">
          <span>Punti Guadagnati:</span>
          <strong class="text-primary">+${result.xpEarned} XP</strong>
        </div>
      `;
      }
      if (dom6.quizCompletionBadges) {
        if (result.newlyUnlockedBadges && result.newlyUnlockedBadges.length > 0) {
          dom6.quizCompletionBadges.hidden = false;
          const badgesHtml = result.newlyUnlockedBadges.map((bId) => {
            const badgeObj = MASTERY_BADGES.find((b) => b.id === bId);
            if (!badgeObj) return "";
            return `
            <div class="unlocked-badge-celebration">
              <span class="unlocked-badge-icon">${badgeObj.icon}</span>
              <div class="unlocked-badge-info">
                <strong>Nuovo Badge Sbloccato: ${badgeObj.title}!</strong>
                <p>${badgeObj.description}</p>
              </div>
            </div>
          `;
          }).join("");
          dom6.quizCompletionBadges.innerHTML = `
          <div class="unlocked-badges-banner">
            ${badgesHtml}
          </div>
        `;
        } else {
          dom6.quizCompletionBadges.hidden = true;
          dom6.quizCompletionBadges.innerHTML = "";
        }
      }
      dom6.quizCompletionModalBackdrop.hidden = false;
    }
    function closeCompletionModal() {
      if (dom6.quizCompletionModalBackdrop) {
        dom6.quizCompletionModalBackdrop.hidden = true;
      }
    }
    function openDashboardModal() {
      renderDashboardModal();
      if (dom6.quizDashboardBackdrop) {
        dom6.quizDashboardBackdrop.hidden = false;
      }
    }
    function closeDashboardModal() {
      if (dom6.quizDashboardBackdrop) {
        dom6.quizDashboardBackdrop.hidden = true;
      }
    }
    function renderDashboardModal() {
      const progress = loadQuizProgress();
      const rank = getPlayerRank(progress.points);
      if (dom6.quizRankTitle) dom6.quizRankTitle.textContent = rank.title;
      if (dom6.quizRankLevel) dom6.quizRankLevel.textContent = `Livello ${rank.level}`;
      if (dom6.quizRankAvatar) dom6.quizRankAvatar.textContent = rank.avatar;
      if (dom6.quizXpText) dom6.quizXpText.textContent = `${rank.currentXp} XP`;
      if (dom6.quizXpBar) dom6.quizXpBar.style.width = `${rank.progressPercent}%`;
      if (dom6.quizStatTotal) dom6.quizStatTotal.textContent = String(progress.totalSolved || 0);
      if (dom6.quizStatEasy) dom6.quizStatEasy.textContent = String(progress.solvedByLevel && progress.solvedByLevel.easy || 0);
      if (dom6.quizStatMedium) dom6.quizStatMedium.textContent = String(progress.solvedByLevel && progress.solvedByLevel.medium || 0);
      if (dom6.quizStatHard) dom6.quizStatHard.textContent = String(progress.solvedByLevel && progress.solvedByLevel.hard || 0);
      if (dom6.quizStatEfficiency) dom6.quizStatEfficiency.textContent = `${progress.averageEfficiency || 100}%`;
      if (dom6.quizStatStreak) dom6.quizStatStreak.textContent = `${progress.bestStreak || 0} \u{1F525}`;
      if (dom6.quizBadgesGrid) {
        const unlockedCount = Object.values(progress.badges || {}).filter((b) => b && b.unlocked).length;
        if (dom6.quizBadgesCountBadge) {
          dom6.quizBadgesCountBadge.textContent = `${unlockedCount} / ${MASTERY_BADGES.length} Sbloccati`;
        }
        dom6.quizBadgesGrid.innerHTML = MASTERY_BADGES.map((b) => {
          const isUnlocked = progress.badges && progress.badges[b.id] && progress.badges[b.id].unlocked;
          const cls = isUnlocked ? "quiz-badge-card unlocked" : "quiz-badge-card locked";
          const dateStr = isUnlocked && progress.badges[b.id].unlockedAt ? new Date(progress.badges[b.id].unlockedAt).toLocaleDateString("it-IT") : "Bloccato";
          return `
          <div class="${cls}">
            <div class="badge-icon-box">${b.icon}</div>
            <div class="badge-content-box">
              <strong class="badge-title">${b.title}</strong>
              <p class="badge-desc">${b.description}</p>
              <span class="badge-status-tag">${isUnlocked ? "\u2713 Sbloccato (" + dateStr + ")" : "\u{1F512} Da sbloccare"}</span>
            </div>
          </div>
        `;
        }).join("");
      }
      if (dom6.quizHistoryList) {
        if (!progress.recentHistory || progress.recentHistory.length === 0) {
          dom6.quizHistoryList.innerHTML = '<li class="history-empty">Nessun esercizio completato finora.</li>';
        } else {
          dom6.quizHistoryList.innerHTML = progress.recentHistory.map((h) => {
            const starsStr = "\u2B50".repeat(h.stars);
            return `
            <li class="quiz-history-item">
              <div class="quiz-history-head">
                <span class="history-formula-name"><strong>${h.formulaName || h.formulaStr}</strong> (Isola ${prettyVar(h.targetVar)})</span>
                <span class="history-stars">${starsStr}</span>
              </div>
              <div class="quiz-history-details">
                <span>Livello: <em>${h.level}</em></span>
                <span>Mosse: <strong>${h.performedSteps}/${h.optimalSteps}</strong></span>
                <span>Efficienza: <strong>${h.efficiency}%</strong></span>
                <span class="text-primary">+${h.xpEarned} XP</span>
              </div>
            </li>
          `;
          }).join("");
        }
      }
    }
    function setQuizModeActive(active) {
      if (active) {
        if (!activeQuizExercise) {
          startNewQuizExercise();
        } else {
          startTimer();
          updateQuizHud();
        }
      } else {
        stopTimer();
        updateQuizHud();
        closeCompletionModal();
        closeDashboardModal();
      }
    }
    return {
      startNewQuizExercise,
      retryCurrentQuizExercise,
      onMoveExecuted,
      onGoalReached,
      setQuizModeActive,
      openDashboardModal,
      closeDashboardModal,
      closeCompletionModal,
      getActiveExercise: () => activeQuizExercise
    };
  }

  // js/ui-history.js
  var dom = null;
  var state = null;
  var ctx = null;
  function escapeHtml3(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }
  function escapeLatexComment(s) {
    return (s || "").replace(/([&%$#_{}~^\\])/g, "\\$1");
  }
  function initHistory(domRefs, appState, appCtx) {
    dom = domRefs;
    state = appState;
    ctx = appCtx;
    bindHistoryEvents();
  }
  function bindHistoryEvents() {
    if (dom.btnUndo) dom.btnUndo.addEventListener("click", undo);
    if (dom.btnRedo) dom.btnRedo.addEventListener("click", redo);
    if (dom.btnReset) dom.btnReset.addEventListener("click", resetExercise);
    if (dom.btnCopySteps) dom.btnCopySteps.addEventListener("click", copyStepsText);
    if (dom.btnCopyStepsLatex) dom.btnCopyStepsLatex.addEventListener("click", copyStepsLatex);
  }
  function pushHistory(entry, isInitial = false, isFailed = false) {
    if (!state) return;
    if (!isInitial && state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    entry.timestamp = Date.now();
    entry.failed = !!isFailed;
    state.history.push(entry);
    state.historyIndex = state.history.length - 1;
    renderHistory();
    updateHistoryButtons();
    if (!isInitial && state.quizManager) {
      state.quizManager.onMoveExecuted(!isFailed);
    }
  }
  function renderHistory() {
    if (!dom || !dom.historyList || !state) return;
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
    if (ctx && ctx.cancelCompoundFractionAnimation) ctx.cancelCompoundFractionAnimation();
    if (i < 0 || i >= state.history.length) return;
    if (state.history[i].failed) {
      if (ctx && ctx.showMessage) ctx.showMessage("Questo \xE8 un tentativo non valido: l'equazione non \xE8 cambiata.", "info");
      return;
    }
    state.historyIndex = i;
    state.currentEq = clone(state.history[i].equation);
    state.conditions = collectConditionsUpTo(i);
    state.selectedId = null;
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    if (ctx && ctx.updateObjective) ctx.updateObjective();
    if (ctx && ctx.renderEquationView) ctx.renderEquationView();
    renderHistory();
    updateHistoryButtons();
    if (i > 0) {
      const h = state.history[i];
      const rule = h.ruleId ? Object.values(RULES).find((r) => r.id === h.ruleId) : null;
      if (ctx && ctx.showRulePanel) {
        ctx.showRulePanel(rule || { name: h.ruleName, principle: h.rulePrinciple }, { steps: h.steps, conditions: h.conditions, note: h.note }, state.currentEq);
      }
    } else {
      if (ctx && ctx.updateRulePanelInitial) ctx.updateRulePanelInitial(state.baseFormula);
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
  function undo() {
    if (!state) return;
    let i = state.historyIndex - 1;
    while (i >= 0 && state.history[i].failed) i--;
    if (i < 0) {
      if (ctx && ctx.showMessage) ctx.showMessage("Non ci sono trasformazioni da annullare.", "info");
      return;
    }
    goToHistory(i);
  }
  function redo() {
    if (!state) return;
    let i = state.historyIndex + 1;
    while (i < state.history.length && state.history[i].failed) i++;
    if (i >= state.history.length) {
      if (ctx && ctx.showMessage) ctx.showMessage("Non ci sono trasformazioni da ripristinare.", "info");
      return;
    }
    goToHistory(i);
  }
  function resetExercise() {
    if (ctx && ctx.cancelCompoundFractionAnimation) ctx.cancelCompoundFractionAnimation();
    if (!state || !state.startEq) return;
    if (ctx && ctx.playSoundClick) ctx.playSoundClick();
    if (ctx && ctx.dismissDidacticBubble) ctx.dismissDidacticBubble();
    if (ctx && ctx.clearSelection) ctx.clearSelection();
    if (ctx && ctx.clearPreview) ctx.clearPreview();
    if (state.baseFormula && state.targetVar && ctx && ctx.loadFormula) {
      ctx.loadFormula(state.baseFormula, state.targetVar);
      if (ctx.showMessage) ctx.showMessage("Esercizio ricominciato dall'inizio.", "info");
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
    if (ctx && ctx.updateObjective) ctx.updateObjective();
    if (ctx && ctx.renderEquationView) ctx.renderEquationView();
    if (state.baseFormula && ctx && ctx.updateRulePanelInitial) ctx.updateRulePanelInitial(state.baseFormula);
    if (ctx && ctx.clearMessage) ctx.clearMessage();
    if (ctx && ctx.showMessage) ctx.showMessage("Esercizio ricominciato dall'inizio.", "info");
  }
  function updateHistoryButtons() {
    if (!dom || !dom.btnUndo || !dom.btnRedo || !state) return;
    let prev = state.historyIndex - 1;
    while (prev >= 0 && state.history[prev].failed) prev--;
    let next = state.historyIndex + 1;
    while (next < state.history.length && state.history[next].failed) next++;
    dom.btnUndo.disabled = prev < 0;
    dom.btnRedo.disabled = next >= state.history.length;
  }
  function copyStepsText() {
    if (!state || state.history.length === 0) return;
    const lines = state.history.filter((h) => !h.failed).map((h, i) => `${i === 0 ? "Partenza" : "Passo " + i}: ${toPretty(h.equation, 0)} (${h.ruleName})`);
    const text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (ctx && ctx.showMessage) ctx.showMessage(`${lines.length} passaggi copiati negli appunti!`, "success");
      }).catch(() => {
        prompt("Copia i passaggi:", text);
      });
    } else {
      prompt("Copia i passaggi:", text);
    }
  }
  function copyStepsLatex() {
    if (!state || state.history.length === 0) return;
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
        if (ctx && ctx.showMessage) ctx.showMessage(`Svolgimento LaTeX (align*) copiato negli appunti!`, "success");
      }).catch(() => {
        prompt("Copia lo svolgimento LaTeX:", block);
      });
    } else {
      prompt("Copia lo svolgimento LaTeX:", block);
    }
  }

  // js/ui-modals.js
  var dom2 = null;
  var state2 = null;
  var ctx2 = null;
  var bubbleTimeout = null;
  function escapeHtml4(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }
  function triviallyIsolated(formulaStr, v) {
    const parts = formulaStr.split("=");
    if (parts.length !== 2) return false;
    return parts[0].trim() === v;
  }
  function initModals(domRefs, appState, appCtx) {
    dom2 = domRefs;
    state2 = appState;
    ctx2 = appCtx;
    bindEditorEvents();
    bindLatexEvents();
    bindStorageEvents();
    bindBubbleEvents();
    renderMyFormulas();
  }
  function bindBubbleEvents() {
    if (dom2.btnCloseBubble) dom2.btnCloseBubble.addEventListener("click", dismissDidacticBubble);
    if (dom2.btnBubbleOk) {
      dom2.btnBubbleOk.addEventListener("click", () => {
        if (ctx2 && ctx2.playSoundClick) ctx2.playSoundClick();
        dismissDidacticBubble();
      });
    }
  }
  function showDidacticBubble({ error, hint, action }) {
    if (!dom2 || !dom2.didacticBubbleAnchor) return;
    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
      bubbleTimeout = null;
    }
    const diag = diagnoseStudentMisconception(error, hint, action);
    const badgeText = diag.badge || "Principio di Equivalenza";
    const ruleReminder = diag.ruleReminder || "Ricorda di applicare correttamente i principi di equivalenza delle equazioni.";
    const explanationText = diag.explanation || error || "Operazione non consentita.";
    const adviceText = diag.advice || hint || "";
    if (dom2.bubbleBadge) dom2.bubbleBadge.textContent = badgeText;
    if (dom2.bubbleMessage) dom2.bubbleMessage.textContent = explanationText;
    if (dom2.bubbleHintBox && dom2.bubbleHintText) {
      if (adviceText) {
        dom2.bubbleHintText.textContent = adviceText;
        dom2.bubbleHintBox.hidden = false;
      } else {
        dom2.bubbleHintBox.hidden = true;
      }
    }
    if (dom2.bubbleFooterRule) dom2.bubbleFooterRule.textContent = ruleReminder;
    dom2.didacticBubbleAnchor.hidden = false;
    if (dom2.didacticBubble) dom2.didacticBubble.classList.remove("bubble-closing");
    bubbleTimeout = setTimeout(() => {
      dismissDidacticBubble();
    }, 9e3);
  }
  function dismissDidacticBubble() {
    if (!dom2 || !dom2.didacticBubbleAnchor || dom2.didacticBubbleAnchor.hidden) return;
    if (bubbleTimeout) {
      clearTimeout(bubbleTimeout);
      bubbleTimeout = null;
    }
    if (dom2.didacticBubble) {
      dom2.didacticBubble.classList.add("bubble-closing");
      setTimeout(() => {
        if (dom2.didacticBubbleAnchor) dom2.didacticBubbleAnchor.hidden = true;
        if (dom2.didacticBubble) dom2.didacticBubble.classList.remove("bubble-closing");
      }, 220);
    } else {
      dom2.didacticBubbleAnchor.hidden = true;
    }
  }
  function showHelp() {
    if (!dom2 || !dom2.modalTitle) return;
    dom2.modalTitle.textContent = "Guida rapida";
    dom2.modalBody.innerHTML = `
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
    dom2.modalActions.innerHTML = '<button class="btn btn-secondary" type="button" data-close-help>Chiudi</button>';
    dom2.modalActions.querySelector("[data-close-help]").addEventListener("click", () => {
      dom2.modalBackdrop.hidden = true;
    });
    dom2.modalBackdrop.hidden = false;
  }
  function copyLatexFormula() {
    if (!state2 || !state2.currentEq) return;
    const latexStr = toLatex(state2.currentEq);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(latexStr).then(() => {
        if (ctx2 && ctx2.showMessage) ctx2.showMessage(`Formula LaTeX copiata negli appunti: "${latexStr}"`, "success");
      }).catch(() => {
        prompt("Copia il codice LaTeX:", latexStr);
      });
    } else {
      prompt("Copia il codice LaTeX:", latexStr);
    }
  }
  function bindEditorEvents() {
    if (dom2.btnLoadCustom) dom2.btnLoadCustom.addEventListener("click", loadCustomFormula);
    if (dom2.customFormula) {
      dom2.customFormula.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loadCustomFormula();
      });
    }
  }
  function loadCustomFormula() {
    if (!dom2.customFormula || !dom2.customTarget) return;
    const text = dom2.customFormula.value.trim();
    const target = dom2.customTarget.value.trim();
    if (dom2.customError) dom2.customError.hidden = true;
    if (!text) {
      showCustomError("Inserisci una formula.");
      return;
    }
    let eq;
    try {
      eq = parseEquation(text);
    } catch (e) {
      showCustomError("Errore di sintassi: " + e.message);
      return;
    }
    const vars = collectVars(eq);
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
      const L = unwrap(eq.left);
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
    if (ctx2 && ctx2.loadFormula) {
      ctx2.loadFormula({
        id: "custom-" + Date.now(),
        topic: "formula personalizzata",
        name: "formula personalizzata",
        formula: text,
        isolate: [...vars],
        conditions: [],
        difficulty: 3,
        notes: "Formula inserita manualmente."
      }, t);
    }
    if (multipleSpecified) {
      if (ctx2 && ctx2.showMessage) {
        ctx2.showMessage(`\xC8 possibile isolare una sola grandezza alla volta: impostato obiettivo su "${prettyVar(t)}". Puoi cambiare grandezza da isolare in qualsiasi momento dall'interfaccia!`, "info");
      }
    } else {
      if (ctx2 && ctx2.showMessage) {
        ctx2.showMessage(`Formula personalizzata caricata. Obiettivo: isolare ${prettyVar(t)}.`, "success");
      }
    }
  }
  function showCustomError(msg) {
    if (dom2.customError) {
      dom2.customError.hidden = false;
      dom2.customError.textContent = msg;
    }
  }
  function bindLatexEvents() {
    if (dom2.btnLatexPreview) dom2.btnLatexPreview.addEventListener("click", previewLatex);
    if (dom2.btnLatexSave) dom2.btnLatexSave.addEventListener("click", saveLatex);
    if (dom2.latexInput) {
      dom2.latexInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          previewLatex();
        }
      });
    }
  }
  function clearLatexError() {
    if (dom2.latexError) {
      dom2.latexError.hidden = true;
      dom2.latexError.textContent = "";
    }
  }
  function showLatexError(msg) {
    if (dom2.latexError) {
      dom2.latexError.hidden = false;
      dom2.latexError.textContent = msg;
    }
  }
  function previewLatex() {
    clearLatexError();
    const raw = (dom2.latexInput.value || "").trim();
    if (!raw) {
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
      if (dom2.latexPreview) dom2.latexPreview.hidden = true;
      return null;
    }
    if (dom2.latexPreview) {
      dom2.latexPreview.hidden = false;
      let mathHtml = "";
      try {
        mathHtml = renderEquation(parseEquation(syntax), {});
      } catch (e) {
        mathHtml = escapeHtml4(syntax);
      }
      dom2.latexPreview.innerHTML = `<span class="conv-label">Sintassi per l'editor</span><div class="conv-code">` + escapeHtml4(syntax) + '</div><span class="conv-label" style="margin-top:.5rem">Anteprima</span><div class="latex-math-preview">' + mathHtml + "</div>";
    }
    return syntax;
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
    const name = (dom2.latexName.value || "").trim() || "formula da LaTeX";
    const targetRaw = (dom2.latexTarget.value || "").trim();
    let eq;
    try {
      eq = parseEquation(syntax);
    } catch (e) {
      showLatexError("Errore di sintassi: " + e.message);
      return;
    }
    const vars = collectVars(eq);
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
        latex: (dom2.latexInput.value || "").trim(),
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
    dom2.latexInput.value = "";
    dom2.latexName.value = "";
    dom2.latexTarget.value = "";
    if (dom2.latexPreview) dom2.latexPreview.hidden = true;
    if (ctx2 && ctx2.showMessage) ctx2.showMessage(`Formula "${name}" salvata nell'archivio.`, "success");
  }
  function bindStorageEvents() {
    if (dom2.btnExportFormulas) dom2.btnExportFormulas.addEventListener("click", exportFormulas);
    if (dom2.btnImportFormulas) dom2.btnImportFormulas.addEventListener("click", importFormulas);
    if (dom2.btnClearFormulas) dom2.btnClearFormulas.addEventListener("click", clearFormulas);
  }
  function clearStorageError() {
    if (dom2.storageError) {
      dom2.storageError.hidden = true;
      dom2.storageError.textContent = "";
    }
  }
  function showStorageError(msg) {
    if (dom2.storageError) {
      dom2.storageError.hidden = false;
      dom2.storageError.textContent = msg;
    }
  }
  function renderMyFormulas() {
    const list = getUserFormulas();
    if (dom2.myFormulasCount) {
      dom2.myFormulasCount.textContent = list.length === 0 ? "Nessuna formula salvata. Importa da LaTeX o salva una formula personalizzata." : `${list.length} formula/e nell'archivio (persistente su questo dispositivo).`;
    }
    if (!dom2.myFormulasList) return;
    dom2.myFormulasList.innerHTML = "";
    if (list.length === 0) {
      dom2.myFormulasList.innerHTML = '<p class="placeholder">Archivio vuoto.</p>';
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
        mathHtml = escapeHtml4(f.formula);
      }
      card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml4(f.topic || "Le mie formule")}</span>
        <button class="icon-btn" type="button" title="Elimina" aria-label="Elimina formula">\u2715</button>
      </div>
      <div class="formula-name">${escapeHtml4(f.name)}</div>
      <div class="formula-math">${mathHtml}</div>
      ${f.isolate && f.isolate.length ? `<div class="formula-isolate">Isola: ${f.isolate.map((v) => prettyVar(v)).join(", ")}</div>` : ""}
    `;
      const load = () => {
        const cands = (f.isolate || []).filter((v) => !triviallyIsolated(f.formula, v));
        const tgt = (cands.length ? cands : f.isolate || [])[0];
        const vars = [...collectVars(parseEquation(f.formula))];
        const target = tgt || vars[0];
        if (ctx2 && ctx2.loadFormula) {
          ctx2.loadFormula({
            id: f.id,
            topic: f.topic,
            name: f.name,
            formula: f.formula,
            isolate: f.isolate && f.isolate.length ? f.isolate : vars,
            conditions: f.conditions || [],
            difficulty: f.difficulty || 3,
            notes: f.notes || ""
          }, target);
        }
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
          if (ctx2 && ctx2.showMessage) ctx2.showMessage("Formula eliminata dall'archivio.", "info");
        }
      });
      dom2.myFormulasList.appendChild(card);
    }
  }
  function exportFormulas() {
    clearStorageError();
    const json = exportUserFormulasJSON();
    if (dom2.jsonArea) {
      dom2.jsonArea.hidden = false;
      dom2.jsonArea.value = json;
      dom2.jsonArea.focus();
      dom2.jsonArea.select();
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
    if (ctx2 && ctx2.showMessage) ctx2.showMessage("Archivio esportato (JSON nell'area e file scaricato).", "success");
  }
  function importFormulas() {
    clearStorageError();
    if (!dom2.jsonArea) return;
    if (dom2.jsonArea.hidden) {
      dom2.jsonArea.hidden = false;
      dom2.jsonArea.focus();
      if (ctx2 && ctx2.showMessage) ctx2.showMessage(`Incolla il JSON nell'area e premi di nuovo "Importa JSON".`, "info");
      return;
    }
    const json = dom2.jsonArea.value.trim();
    if (!json) {
      showStorageError("Incolla prima un JSON da importare.");
      return;
    }
    try {
      const added = importUserFormulasJSON(json);
      renderMyFormulas();
      if (ctx2 && ctx2.showMessage) ctx2.showMessage(`${added} formula/e importate nell'archivio.`, "success");
    } catch (e) {
      showStorageError(e.message);
    }
  }
  function clearFormulas() {
    clearStorageError();
    if (!window.confirm("Svuotare l'archivio delle formule salvate? Operazione non annullabile.")) return;
    clearUserFormulas();
    renderMyFormulas();
    if (ctx2 && ctx2.showMessage) ctx2.showMessage("Archivio svuotato.", "info");
  }

  // js/ui-numpad.js
  var dom3 = null;
  var state3 = null;
  var ctx3 = null;
  function initNumpad(domRefs, appState, appCtx) {
    dom3 = domRefs;
    state3 = appState;
    ctx3 = appCtx;
    if (dom3.btnMirror) dom3.btnMirror.addEventListener("click", applyMirrorRule);
    if (dom3.btnReciprocal) dom3.btnReciprocal.addEventListener("click", applyReciprocalRule);
    if (dom3.btnDistribute) dom3.btnDistribute.addEventListener("click", applyDistributeRule);
    if (dom3.btnFactorCommon) dom3.btnFactorCommon.addEventListener("click", applyFactorCommonRule);
    if (dom3.btnCommonDenom) dom3.btnCommonDenom.addEventListener("click", applyCommonDenominatorRule);
    if (dom3.btnChangeSign) dom3.btnChangeSign.addEventListener("click", applyChangeSignRule);
  }
  function renderKeypad() {
    if (!dom3 || !dom3.keypadOps || !dom3.keypadOperands || !state3) return;
    dom3.keypadOps.innerHTML = "";
    for (const op of KEYPAD_OPERATIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-op" + (state3.keypadOp === op.id ? " active" : "");
      btn.dataset.op = op.id;
      btn.textContent = op.label;
      btn.title = op.title;
      btn.setAttribute("aria-label", op.title);
      btn.setAttribute("aria-pressed", state3.keypadOp === op.id ? "true" : "false");
      btn.disabled = !state3.currentEq;
      btn.addEventListener("click", () => handleKeypadOpClick(op));
      dom3.keypadOps.appendChild(btn);
    }
    dom3.keypadOperands.innerHTML = "";
    if (!state3.currentEq) {
      dom3.keypadOperands.innerHTML = '<p class="placeholder small">Carica una formula per usare il tastierino.</p>';
      updateKeypadHint();
      return;
    }
    const { letters, numbers } = equationKeypadTokens(state3.currentEq);
    for (const name of letters) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-operand keypad-letter";
      btn.textContent = prettyVar(name);
      btn.title = `Applica ${name}`;
      btn.addEventListener("click", () => handleKeypadOperandClick(name));
      dom3.keypadOperands.appendChild(btn);
    }
    for (const value of numbers) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-operand keypad-number";
      btn.textContent = String(value);
      btn.title = `Applica ${value}`;
      btn.addEventListener("click", () => handleKeypadOperandClick(String(value)));
      dom3.keypadOperands.appendChild(btn);
    }
    const custom = document.createElement("span");
    custom.className = "keypad-custom";
    custom.innerHTML = `<input class="keypad-custom-value" type="text" inputmode="numeric" placeholder="n" aria-label="Altro numero o grandezza" size="3"><button type="button" class="btn-mini keypad-custom-apply" title="Applica all'equazione">Applica</button>`;
    dom3.keypadOperands.appendChild(custom);
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
    if (!dom3 || !dom3.keypadHint || !state3) return;
    if (!state3.currentEq) {
      dom3.keypadHint.textContent = "Carica una formula per usare il tastierino.";
      return;
    }
    if (!state3.keypadOp) {
      dom3.keypadHint.textContent = "Scegli un'operazione: verr\xE0 applicata a entrambi i membri.";
      return;
    }
    const op = KEYPAD_OPERATIONS.find((o) => o.id === state3.keypadOp);
    dom3.keypadHint.textContent = op && !op.needsOperand ? `Premi di nuovo per applicare ${op.label} a entrambi i membri.` : `Operazione ${op ? op.label : ""} scelta: ora tocca una grandezza o un numero.`;
  }
  function handleKeypadOpClick(op) {
    if (!state3 || !state3.currentEq) return;
    if (state3.keypadOp === op.id) {
      if (op.needsOperand) {
        state3.keypadOp = null;
        renderKeypad();
        return;
      }
      applyKeypadMove(op.id, null, null);
      return;
    }
    state3.keypadOp = op.id;
    renderKeypad();
    if (!op.needsOperand) applyKeypadMove(op.id, null, null);
  }
  function handleKeypadOperandClick(text) {
    if (!state3 || !state3.currentEq) return;
    if (!state3.keypadOp) {
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("Prima scegli un'operazione nel tastierino, poi la grandezza o il numero.", "info");
      return;
    }
    applyKeypadMove(state3.keypadOp, parseOperand(text), text);
  }
  function applyKeypadMove(opId, operandNode, operandText) {
    const op = KEYPAD_OPERATIONS.find((o) => o.id === opId);
    const label = op ? op.label : opId;
    const before = state3.currentEq;
    const res = applyKeypadOperation(before, opId, operandNode, operandText, state3.targetVar);
    if (!res.ok) {
      state3.keypadOp = null;
      renderKeypad();
      if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
      if (ctx3 && ctx3.animateOperationBadge) ctx3.animateOperationBadge(label, operandText);
      if (ctx3 && ctx3.showInvalidMove) ctx3.showInvalidMove(res.error, res.hint, { label: `Applica ${label} a entrambi i membri` });
      return;
    }
    const newEq = res.equation;
    if (equivalentEq(newEq, before)) {
      state3.keypadOp = null;
      renderKeypad();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    if (opId === "add" || opId === "sub") {
      if (ctx3 && ctx3.playSoundTransport) ctx3.playSoundTransport();
    } else {
      if (ctx3 && ctx3.playSoundFraction) ctx3.playSoundFraction();
    }
    state3.currentEq = newEq;
    state3.conditions = mergeConditions(state3.conditions, res.conditions || []);
    state3.selectedId = null;
    state3.keypadOp = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const ruleName = `Applica ${label}${operandText ? " " + prettyVar(operandText) : ""} a entrambi i membri`;
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
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
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.showRulePanel) {
      ctx3.showRulePanel(
        { name: ruleName, principle: res.steps && res.steps.length ? res.steps.join(" ") : "", explanation: null },
        { steps: res.steps || [], conditions: res.conditions || [], note: res.note || null },
        newEq
      );
    }
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.animateOperationBadge) ctx3.animateOperationBadge(label, operandText);
    if (ctx3 && ctx3.showMessage) {
      ctx3.showMessage(`\u2713 ${ruleName}.`, "success");
      if (res.note) ctx3.showMessage(res.note, "info");
    }
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    } else if (state3.mode === "auto" && ctx3 && ctx3.showAutoMode) {
      ctx3.showAutoMode();
    }
  }
  function applyMirrorRule() {
    if (!state3 || !state3.currentEq) return;
    const newEq = Eq(clone(state3.currentEq.right), clone(state3.currentEq.left));
    const onDone = () => {
      state3.currentEq = newEq;
      state3.selectedId = null;
      if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
      const rule = {
        id: "swapSides",
        name: "Regola dello specchio (scambio membri)",
        principle: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
        explanation: "scambioMembri"
      };
      if (ctx3 && ctx3.pushHistory) {
        ctx3.pushHistory({
          equation: clone(newEq),
          ruleName: rule.name,
          rulePrinciple: rule.principle,
          ruleId: "swapSides",
          steps: ["Scambio i due membri dell'equazione (propriet\xE0 simmetrica: A = B \u2194 B = A)."],
          conditions: state3.conditions.slice(),
          explanationKey: "scambioMembri",
          note: null,
          verified: true
        }, false);
      }
      if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
      if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
      if (ctx3 && ctx3.showRulePanel) {
        ctx3.showRulePanel(rule, { steps: ["Scambio i due membri per la propriet\xE0 simmetrica."], conditions: [] }, newEq);
      }
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("\u{1FA9E} Regola dello specchio applicata: se A = B allora B = A!", "success");
      if (state3.goalReached) {
        if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
        if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
        if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
      }
    };
    if (ctx3 && ctx3.animateMirrorSwap) {
      ctx3.animateMirrorSwap(state3.currentEq, newEq, onDone);
    } else {
      onDone();
    }
  }
  function applyReciprocalRule() {
    if (!state3 || !state3.currentEq) return;
    if (ctx3 && ctx3.playSoundFraction) ctx3.playSoundFraction();
    const eq = state3.currentEq;
    const res = reciprocalEquation(eq);
    if (!res.ok) {
      if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
      if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
      if (ctx3 && ctx3.showInvalidMove) ctx3.showInvalidMove(res.error, res.hint, { label: "Regola dei reciproci" });
      return;
    }
    const newEq = res.newEq;
    if (equivalentEq(newEq, eq)) {
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    state3.currentEq = newEq;
    state3.selectedId = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const rule = {
      id: "reciprocal",
      name: "Regola dei reciproci (inversione dei membri)",
      principle: "Propriet\xE0 dell'inversione: se A = B allora 1/A = 1/B; in una proporzione A/B = C/D si ottiene B/A = D/C.",
      explanation: "reciprocal-both"
    };
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
        equation: clone(newEq),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "reciprocal",
        steps: [`Calcolo il reciproco di entrambi i membri: ${toPretty(eq, 0)} \u2192 ${toPretty(newEq, 0)}.`],
        conditions: state3.conditions.slice(),
        explanationKey: "reciprocal-both",
        note: null,
        verified: true
      }, false);
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.showRulePanel) ctx3.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.showMessage) ctx3.showMessage("\u{1F501} Regola dei reciproci applicata a entrambi i membri!", "success");
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    } else if (state3.mode === "auto" && ctx3 && ctx3.showAutoMode) {
      ctx3.showAutoMode();
    }
  }
  function applyDistributeRule() {
    if (!state3 || !state3.currentEq) return;
    const eq = state3.currentEq;
    const leftDist = canDistribute(eq.left);
    const rightDist = canDistribute(eq.right);
    if (!leftDist && !rightDist) {
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("Non ci sono parentesi (prodotti, potenze o frazioni) da sviluppare.", "info");
      return;
    }
    let chosenSide = null;
    if (state3.selectedId) {
      if (state3.selectedId.startsWith("left") && leftDist) chosenSide = "left";
      else if (state3.selectedId.startsWith("right") && rightDist) chosenSide = "right";
      else {
        const selInfo = analyseElementId(state3.selectedId);
        if (selInfo && selInfo.side) {
          if (selInfo.side === "left" && leftDist) chosenSide = "left";
          if (selInfo.side === "right" && rightDist) chosenSide = "right";
        }
      }
    }
    if (!chosenSide) {
      const targetLeft = hasDistributableSum(eq.left, state3.targetVar);
      const targetRight = hasDistributableSum(eq.right, state3.targetVar);
      if (targetRight && !targetLeft && rightDist) chosenSide = "right";
      else if (targetLeft && !targetRight && leftDist) chosenSide = "left";
      else if (rightDist && !leftDist) chosenSide = "right";
      else if (leftDist && !rightDist) chosenSide = "left";
      else chosenSide = "right";
    }
    if (ctx3 && ctx3.playSoundTransport) ctx3.playSoundTransport();
    const res = applyRule(RULES.distribute, eq, { side: chosenSide });
    if (!res.ok) {
      if (ctx3 && ctx3.showInvalidMove) ctx3.showInvalidMove(res.error, res.hint);
      return;
    }
    state3.currentEq = res.equation;
    state3.selectedId = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const rule = RULES.distribute;
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
        equation: clone(res.equation),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "distribute",
        steps: [`Sviluppo le parentesi con la propriet\xE0 distributiva al ${chosenSide === "left" ? "primo" : "secondo"} membro: ${toPretty(eq, 0)} \u2192 ${toPretty(res.equation, 0)}.`],
        conditions: state3.conditions.slice(),
        explanationKey: "distribute",
        note: null,
        verified: true
      }, false);
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.showRulePanel) {
      ctx3.showRulePanel(rule, { steps: ["Sviluppate le parentesi con la propriet\xE0 distributiva"], conditions: [] }, res.equation);
    }
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.showMessage) ctx3.showMessage("\u{1F4E6} Propriet\xE0 distributiva applicata: parentesi sviluppate!", "success");
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    } else if (state3.mode === "auto" && ctx3 && ctx3.showAutoMode) {
      ctx3.showAutoMode();
    }
  }
  function applyFactorCommonRule() {
    if (!state3 || !state3.currentEq) return;
    const eq = state3.currentEq;
    const targetSide = whichSideHas(eq, state3.targetVar) || "right";
    const sidesToCheck = targetSide === "both" ? ["right", "left"] : [targetSide, targetSide === "left" ? "right" : "left"];
    let foundSide = null;
    let commonNode = null;
    for (const s of sidesToCheck) {
      const member = s === "left" ? eq.left : eq.right;
      const common = findCommonFactor(member, state3.targetVar);
      if (common) {
        foundSide = s;
        commonNode = common;
        break;
      }
    }
    if (!commonNode) {
      for (const s of sidesToCheck) {
        const member = s === "left" ? eq.left : eq.right;
        const common = findCommonFactor(member, null);
        if (common) {
          foundSide = s;
          commonNode = common;
          break;
        }
      }
    }
    if (!commonNode) {
      const member = targetSide === "left" ? eq.left : eq.right;
      if (hasTrigConflict(member, state3.targetVar)) {
        if (ctx3 && ctx3.showMessage) {
          ctx3.showMessage(`\u26A0\uFE0F Non \xE8 possibile raccogliere ${prettyVar(state3.targetVar)} a fattor comune: ${prettyVar(state3.targetVar)} \xE8 l'argomento di funzioni trigonometriche distinte (sin e cos), non un fattore moltiplicativo.`, "warning");
        }
        return;
      }
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("Nessun fattore comune trovato da raccogliere tra tutti i termini del membro.", "info");
      return;
    }
    if (ctx3 && ctx3.playSoundTransport) ctx3.playSoundTransport();
    const commonText = toPretty(commonNode, 0);
    const res = applyRule(RULES.factorCommon, eq, { side: foundSide, common: commonNode, commonText });
    if (!res.ok) {
      if (ctx3 && ctx3.showInvalidMove) ctx3.showInvalidMove(res.error, res.hint);
      return;
    }
    state3.currentEq = res.equation;
    state3.selectedId = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const rule = RULES.factorCommon;
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
        equation: clone(res.equation),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "factorCommon",
        steps: [`Raccolgo ${commonText} a fattor comune al ${foundSide === "left" ? "primo" : "secondo"} membro: ${toPretty(eq, 0)} \u2192 ${toPretty(res.equation, 0)}.`],
        conditions: state3.conditions.slice(),
        explanationKey: null,
        note: null,
        verified: true
      }, false);
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.showRulePanel) {
      ctx3.showRulePanel(rule, { steps: [`Raccolto ${commonText} a fattor comune`], conditions: [] }, res.equation);
    }
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F9E9} Raccoglimento a fattor comune applicato: ${commonText} messo in evidenza!`, "success");
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    } else if (state3.mode === "auto" && ctx3 && ctx3.showAutoMode) {
      ctx3.showAutoMode();
    }
  }
  function applyCommonDenominatorRule() {
    if (!state3 || !state3.currentEq) return;
    const eq = state3.currentEq;
    let chosenSide = null;
    if (state3.selectedId) {
      if (state3.selectedId.startsWith("left")) chosenSide = "left";
      else if (state3.selectedId.startsWith("right")) chosenSide = "right";
    }
    const res = reduceEquationToCommonDenominator(eq, chosenSide);
    if (!res.ok) {
      if (ctx3 && ctx3.showInvalidMove) ctx3.showInvalidMove(res.error, res.hint, { label: "Minimo comune multiplo (m.c.m.)" });
      return;
    }
    const newEq = res.newEq;
    if (equivalentEq(newEq, eq)) {
      if (ctx3 && ctx3.showMessage) ctx3.showMessage("L'equazione \xE8 gi\xE0 espressa a denominatore comune.", "info");
      return;
    }
    if (ctx3 && ctx3.playSoundFraction) ctx3.playSoundFraction();
    if (dom3.equationDisplay) {
      dom3.equationDisplay.classList.add("sign-flip-pulse");
      setTimeout(() => {
        if (dom3.equationDisplay) dom3.equationDisplay.classList.remove("sign-flip-pulse");
      }, 450);
    }
    state3.currentEq = newEq;
    state3.selectedId = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const rule = RULES.commonDenom;
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
        equation: clone(newEq),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "common-denom",
        steps: res.steps,
        conditions: state3.conditions.slice(),
        explanationKey: "common-denom",
        note: null,
        verified: true
      }, false);
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.showRulePanel) ctx3.showRulePanel(rule, { steps: res.steps, conditions: [] }, newEq);
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.showMessage) ctx3.showMessage("\u{1F9EE} Frazioni ridotte a denominatore comune (m.c.m.) in un'unica frazione!", "success");
    if (state3.targetVar && isolatedSide(newEq.right, state3.targetVar) && !collectVars(newEq.left).has(state3.targetVar)) {
      const swapped = Eq(newEq.right, newEq.left);
      setTimeout(() => {
        if (ctx3 && ctx3.animateMirrorSwap) {
          ctx3.animateMirrorSwap(newEq, swapped, () => {
            state3.currentEq = swapped;
            if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
            if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
          });
        }
      }, 200);
    }
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    } else if (state3.mode === "auto" && ctx3 && ctx3.showAutoMode) {
      ctx3.showAutoMode();
    }
  }
  function applyChangeSignRule() {
    if (!state3 || !state3.currentEq) return;
    if (ctx3 && ctx3.playSoundTransport) ctx3.playSoundTransport();
    const eq = state3.currentEq;
    const newEq = Eq(negateExpr(eq.left), negateExpr(eq.right));
    state3.currentEq = newEq;
    state3.selectedId = null;
    if (ctx3 && ctx3.clearPreview) ctx3.clearPreview();
    const rule = {
      id: "changeSign",
      name: "Regola del cambio di segno",
      principle: "Secondo principio di equivalenza: moltiplicando entrambi i membri per \u22121, tutti i segni si invertono (+ \u2194 \u2212).",
      explanation: null
    };
    if (ctx3 && ctx3.pushHistory) {
      ctx3.pushHistory({
        equation: clone(newEq),
        ruleName: rule.name,
        rulePrinciple: rule.principle,
        ruleId: "changeSign",
        steps: [`Moltiplico entrambi i membri per \u22121: ${toPretty(eq, 0)} \u2192 ${toPretty(newEq, 0)}.`],
        conditions: state3.conditions.slice(),
        explanationKey: null,
        note: null,
        verified: true
      }, false);
    }
    const isTargetIsolatedOnRight = isolatedSide(newEq.right, state3.targetVar);
    if (isTargetIsolatedOnRight) {
      if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
      if (ctx3 && ctx3.flashSignChanged) ctx3.flashSignChanged();
      if (ctx3 && ctx3.showRulePanel) ctx3.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
      if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\xB1 Cambio segno applicato: ${prettyVar(state3.targetVar)} \xE8 ora positivo!`, "info");
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state3.currentEq, state3.targetVar);
        if (flipped !== state3.currentEq) {
          const onSwapDone = () => {
            state3.currentEq = flipped;
            state3.goalReached = true;
            if (ctx3 && ctx3.pushHistory) {
              ctx3.pushHistory({
                equation: clone(flipped),
                ruleName: "Regola dello specchio (scambio membri)",
                rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
                ruleId: "swapSides",
                steps: ["Scambio i due membri per la propriet\xE0 simmetrica: la grandezza cercata \xE8 al primo membro."],
                conditions: state3.conditions.slice(),
                explanationKey: "scambioMembri",
                note: null,
                verified: true
              }, false);
            }
            if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
            if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
            if (ctx3 && ctx3.showRulePanel) {
              ctx3.showRulePanel({
                id: "swapSides",
                name: "Regola dello specchio (scambio membri)",
                principle: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A."
              }, { steps: ["Scambio i due membri dell'equazione per la propriet\xE0 simmetrica."], conditions: [] }, flipped);
            }
            if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
            if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
            if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
            if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
          };
          if (ctx3 && ctx3.animateMirrorSwap) {
            ctx3.animateMirrorSwap(state3.currentEq, flipped, onSwapDone);
          } else {
            onSwapDone();
          }
        } else {
          if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
          if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
        }
      }, 450);
      return;
    }
    if (ctx3 && ctx3.updateObjective) ctx3.updateObjective();
    if (ctx3 && ctx3.renderEquationView) ctx3.renderEquationView();
    if (ctx3 && ctx3.flashSignChanged) ctx3.flashSignChanged();
    if (ctx3 && ctx3.showRulePanel) ctx3.showRulePanel(rule, { steps: [rule.principle], conditions: [] }, newEq);
    if (ctx3 && ctx3.clearMessage) ctx3.clearMessage();
    if (ctx3 && ctx3.showMessage) ctx3.showMessage("\xB1 Regola del cambio di segno applicata: tutti i segni invertiti!", "success");
    if (state3.goalReached) {
      if (ctx3 && ctx3.checkAndAnimateCompoundFraction && ctx3.checkAndAnimateCompoundFraction()) return;
      if (ctx3 && ctx3.playSuccessChime) ctx3.playSuccessChime();
      if (ctx3 && ctx3.spawnVictoryConfetti) ctx3.spawnVictoryConfetti();
      if (ctx3 && ctx3.showMessage) ctx3.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state3.targetVar)} \xE8 isolata!`, "success");
    }
  }

  // js/ui-canvas.js
  var dom4 = null;
  var state4 = null;
  var ctx4 = null;
  var _neutralCleanupTimer = null;
  var _isMirrorSwapping = false;
  var _currentMirrorAnims = [];
  function initCanvas(domRefs, appState, appCtx) {
    dom4 = domRefs;
    state4 = appState;
    ctx4 = appCtx;
    if (dom4.btnCross) dom4.btnCross.addEventListener("click", () => toggleCrossMode());
    bindCrossDrag();
    initDragArrow();
  }
  function renderEquationView() {
    if (!state4 || !dom4 || !dom4.equationDisplay) return;
    state4.clickDragToken = null;
    dom4.equationDisplay.classList.remove("is-dragging-equation", "is-click-drag-mode");
    hideDragArrow();
    if (!state4.currentEq) {
      dom4.equationDisplay.innerHTML = '<p class="placeholder">Nessuna equazione caricata.</p>';
      if (dom4.latexLiveCode) dom4.latexLiveCode.textContent = "";
      if (ctx4 && ctx4.renderKeypad) ctx4.renderKeypad();
      return;
    }
    dom4.equationDisplay.innerHTML = renderEquation(state4.currentEq, {
      selectedId: state4.selectedId,
      targetVar: state4.targetVar,
      interactive: true,
      showImplicitDen: state4.showImplicitDen
    });
    if (dom4.latexLiveCode) {
      dom4.latexLiveCode.textContent = toLatex(state4.currentEq);
    }
    attachEquationHandlers();
    setupEquationDragAndDrop(dom4.equationDisplay, {
      getCurrentEquation: () => state4.currentEq,
      onApplyMove: applyDragResult
    });
    attachDropzoneClickHandlers();
    if (ctx4 && ctx4.renderConditions) ctx4.renderConditions();
    if (ctx4 && ctx4.renderKeypad) ctx4.renderKeypad();
    const card = dom4.equationDisplay ? dom4.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.toggle("is-auto-mode", state4.mode === "auto");
    if (state4.mode === "auto") {
      const hintBadge = document.querySelector(".drag-hint-badge");
      const hintText = document.querySelector(".drag-hint-text");
      if (hintBadge && hintText) {
        hintBadge.textContent = "\u26A1 Modalit\xE0 Automatica";
        hintText.innerHTML = "<strong>Fai clic ovunque con il mouse</strong> (sull'equazione o sul pulsante) per eseguire il passaggio con la giustificazione della regola!";
      }
    }
    if (state4.currentEq) {
      announceMathLive(`Equazione attiva: ${verbalizeEquation(state4.currentEq)}`);
    }
    scheduleNeutralCleanup();
  }
  function scheduleNeutralCleanup() {
    if (_neutralCleanupTimer) clearTimeout(_neutralCleanupTimer);
    _neutralCleanupTimer = setTimeout(() => {
      if (!state4 || !state4.currentEq) return;
      const cleaned = stripNeutrals(state4.currentEq);
      if (!structurallyEqual(cleaned, state4.currentEq)) {
        const wraps = dom4.equationDisplay ? dom4.equationDisplay.querySelectorAll(".neutral-fade-wrap") : [];
        if (wraps.length > 0) {
          wraps.forEach((w) => {
            w.classList.add("var-exploding");
            spawnVariableExplosion(w, "gold");
          });
          setTimeout(() => {
            state4.currentEq = cleaned;
            renderEquationView();
          }, 400);
        } else {
          state4.currentEq = cleaned;
          renderEquationView();
        }
      }
    }, 1600);
  }
  function enterClickDragMode(tokenEl) {
    const varName = tokenEl.dataset.varName;
    if (!varName || !state4.currentEq) return;
    state4.clickDragToken = {
      varName,
      fromSide: tokenEl.dataset.side,
      fromSlot: tokenEl.dataset.slot || "num",
      nodeType: tokenEl.dataset.nodeType || "Var"
    };
    tokenEl.classList.add("token-in-flight");
    dom4.equationDisplay.classList.add("is-dragging-equation", "is-click-drag-mode");
    highlightDropzones(dom4.equationDisplay, state4.clickDragToken);
    if (ctx4 && ctx4.showMessage) {
      ctx4.showMessage(`"${prettyVar(varName)}" selezionato \u2014 clicca la destinazione (denominatore o membro opposto) per applicare il trasporto, oppure scegli un'operazione in basso. Riclicca per annullare.`, "info");
    }
    const foundEl = findElement(state4.currentEq, tokenEl.dataset.id);
    if (foundEl) {
      state4.selectedId = tokenEl.dataset.id;
      const actions = availableActions(state4.currentEq, foundEl, state4.targetVar);
      if (ctx4 && ctx4.renderActions) ctx4.renderActions(foundEl, actions);
    }
  }
  function exitClickDragMode() {
    state4.clickDragToken = null;
    if (dom4.equationDisplay) {
      dom4.equationDisplay.classList.remove("is-dragging-equation", "is-click-drag-mode");
      dom4.equationDisplay.querySelectorAll(".token-in-flight").forEach((el) => el.classList.remove("token-in-flight"));
      clearDropzonesHighlight(dom4.equationDisplay);
    }
    hideDragArrow();
  }
  function applyClickDragToDropzone(dz) {
    if (!state4.clickDragToken) return;
    const drag = state4.clickDragToken;
    const tokenEl = dom4.equationDisplay ? dom4.equationDisplay.querySelector(".token-in-flight") : null;
    const sourceRect = tokenEl ? tokenEl.getBoundingClientRect() : null;
    const targetRect = dz.getBoundingClientRect();
    const tokenText = drag.varName;
    exitClickDragMode();
    const result = applyDragMove({
      currentEq: state4.currentEq,
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
    if (!dom4.equationDisplay) return;
    dom4.equationDisplay.querySelectorAll(".math-node").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (wasRecentTouchDrag()) return;
        if (state4.mode === "auto") {
          if (ctx4 && ctx4.executeNextAutoStep) ctx4.executeNextAutoStep();
          return;
        }
        if (state4.crossMode) {
          crossPickToken(el.dataset.id, el);
          return;
        }
        if (el.classList.contains("draggable-token") && el.dataset.varName) {
          if (state4.clickDragToken) {
            if (el.classList.contains("token-in-flight")) {
              exitClickDragMode();
              return;
            }
            if (el.dataset.side === state4.clickDragToken.fromSide) {
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
        if (state4.clickDragToken) {
          const dz = el.closest(".dropzone");
          if (dz && dz.dataset.side && dz.dataset.side !== state4.clickDragToken.fromSide) {
            applyClickDragToDropzone(dz);
            return;
          }
          exitClickDragMode();
          return;
        }
        if (ctx4 && ctx4.selectElement) ctx4.selectElement(el.dataset.id);
      });
      const rawVal = el.dataset.varName || (el.textContent || "").trim();
      const verbal = verbalizeVar(rawVal) || rawVal;
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", "Elemento: " + verbal);
      if (el.classList.contains("draggable-token")) {
        el.setAttribute("aria-roledescription", "termine matematico trascinabile");
      }
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (state4.mode === "auto") {
            if (ctx4 && ctx4.executeNextAutoStep) ctx4.executeNextAutoStep();
            return;
          }
          if (state4.crossMode) crossPickToken(el.dataset.id, el);
          else if (ctx4 && ctx4.selectElement) ctx4.selectElement(el.dataset.id);
        }
      });
    });
  }
  function attachDropzoneClickHandlers() {
    if (!dom4.equationDisplay) return;
    dom4.equationDisplay.querySelectorAll(".dropzone").forEach((dz) => {
      dz.addEventListener("click", (e) => {
        if (state4.mode === "auto") {
          if (ctx4 && ctx4.executeNextAutoStep) ctx4.executeNextAutoStep();
          return;
        }
        if (!state4.clickDragToken) return;
        if (dz.dataset.side === state4.clickDragToken.fromSide) {
          if (state4.clickDragToken.fromSlot === "num" && dz.dataset.slot === "den") {
            const oppMember = state4.clickDragToken.fromSide === "right" ? "primo membro (sotto la linea di frazione a sinistra)" : "secondo membro (sotto la linea di frazione a destra)";
            if (ctx4 && ctx4.showMessage) {
              ctx4.showMessage(`Non puoi spostare "${prettyVar(state4.clickDragToken.varName)}" al denominatore dello stesso membro! Per il 2\xB0 principio di equivalenza, se dividi per esso va al denominatore del membro OPPOSTO (${oppMember}).`, "warning");
            }
          } else {
            if (ctx4 && ctx4.showMessage) {
              ctx4.showMessage(`Trascina o clicca sul membro opposto per applicare la regola del trasporto!`, "info");
            }
          }
          flashTokenRejected(state4.clickDragToken.varName, state4.clickDragToken.fromSide);
          return;
        }
        e.stopPropagation();
        applyClickDragToDropzone(dz);
      });
      dz.addEventListener("mouseenter", () => {
        if (!state4.clickDragToken) return;
        const tokenEl = dom4.equationDisplay.querySelector(".token-in-flight");
        if (!tokenEl) return;
        const crossesMember = dz.dataset.side !== state4.clickDragToken.fromSide;
        updateDragArrow(tokenEl, dz, crossesMember);
      });
      dz.addEventListener("mouseleave", () => {
        if (state4.clickDragToken) hideDragArrow();
      });
    });
  }
  function flashTokenRejected(varName, side) {
    if (!varName || !dom4.equationDisplay) return;
    const el = dom4.equationDisplay.querySelector(`[data-var-name="${CSS.escape(varName)}"][data-side="${side}"]`);
    if (!el) return;
    el.classList.remove("token-rejected");
    void el.offsetWidth;
    el.classList.add("token-rejected");
    setTimeout(() => el.classList.remove("token-rejected"), 600);
  }
  function highlightLandedToken(varName, side) {
    if (!dom4.equationDisplay || !varName) return;
    const tokens = dom4.equationDisplay.querySelectorAll(`.draggable-token[data-side="${side}"]`);
    for (const t of tokens) {
      if (t.dataset.varName === varName || t.textContent.trim() === varName) {
        t.classList.add("token-landing-glow");
        setTimeout(() => t.classList.remove("token-landing-glow"), 600);
        break;
      }
    }
  }
  function flashSignChanged() {
    if (!dom4.equationDisplay) return;
    dom4.equationDisplay.querySelectorAll(".draggable-token, .node-target, .op").forEach((el) => {
      el.classList.add("sign-flip-pulse");
    });
    setTimeout(() => {
      if (dom4.equationDisplay) {
        dom4.equationDisplay.querySelectorAll(".sign-flip-pulse").forEach((el) => el.classList.remove("sign-flip-pulse"));
      }
    }, 700);
  }
  function animateOperationBadge(label, operandText) {
    if (!dom4.equationDisplay) return;
    const card = dom4.equationDisplay.closest(".equation-display-card") || dom4.equationDisplay;
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
    cleanupTouchDrag(dom4.equationDisplay);
    if (typeof document !== "undefined") {
      document.querySelectorAll(".flying-math-token, .op-anim-badge").forEach((el) => el.remove());
    }
    if (dom4.crossDissolveLayer) {
      dom4.crossDissolveLayer.innerHTML = "";
    }
  }
  function animateMirrorSwap(fromEq, toEq, onComplete) {
    if (_isMirrorSwapping) {
      if (onComplete) onComplete();
      return;
    }
    const memberL = dom4.equationDisplay ? dom4.equationDisplay.querySelector(".math-member-left") : null;
    const memberR = dom4.equationDisplay ? dom4.equationDisplay.querySelector(".math-member-right") : null;
    const eqSign = dom4.equationDisplay ? dom4.equationDisplay.querySelector(".eq-sign") : null;
    if (!memberL || !memberR) {
      if (onComplete) onComplete();
      return;
    }
    _isMirrorSwapping = true;
    if (ctx4 && ctx4.playSoundTransport) ctx4.playSoundTransport();
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
    document.querySelectorAll(".flying-math-token").forEach((el) => el.remove());
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
    let finished = false;
    let fallbackTimer = null;
    const done = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
      if (onComplete) onComplete();
    };
    fallbackTimer = setTimeout(done, 520);
    if (typeof flyer.animate === "function") {
      const anim = flyer.animate([
        { transform: "translate(0px, 0px) scale(1)", opacity: 0.95 },
        { transform: `translate(${midX}px, ${arcY}px) scale(1.25)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0.95 }
      ], {
        duration: 440,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      });
      anim.onfinish = done;
      anim.oncancel = done;
    } else {
      done();
    }
  }
  function toggleCrossMode(force) {
    state4.crossMode = typeof force === "boolean" ? force : !state4.crossMode;
    state4.crossPicked = [];
    if (dom4.btnCross) {
      dom4.btnCross.classList.toggle("active", state4.crossMode);
      dom4.btnCross.setAttribute("aria-pressed", state4.crossMode ? "true" : "false");
    }
    if (dom4.crossLayer) {
      dom4.crossLayer.hidden = !state4.crossMode;
    }
    const card = dom4.equationDisplay ? dom4.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.toggle("cross-mode", state4.crossMode);
    clearCrossMarks();
    if (state4.crossMode) {
      if (ctx4 && ctx4.showMessage) {
        ctx4.showMessage("\u2715/ Semplificazione attiva \u2014 clicca due elementi da eliminare (fattori num./den., termini opposti o stessa grandezza su entrambi i membri).", "info");
      }
    }
  }
  function clearCrossMarks() {
    if (!dom4.equationDisplay) return;
    dom4.equationDisplay.querySelectorAll(".cross-marked").forEach((el) => el.classList.remove("cross-marked"));
  }
  function crossPickToken(id, element) {
    if (!state4.currentEq || !id) return;
    const already = state4.crossPicked.indexOf(id);
    if (already >= 0) {
      state4.crossPicked.splice(already, 1);
      if (element) element.classList.remove("cross-marked");
      if (state4.crossPicked.length === 0 && ctx4 && ctx4.clearPreview) ctx4.clearPreview();
      return;
    }
    state4.crossPicked.push(id);
    if (element) element.classList.add("cross-marked");
    if (state4.crossPicked.length < 2) {
      if (ctx4 && ctx4.showMessage) ctx4.showMessage("Primo elemento selezionato \u2014 ora scegli il secondo da semplificare.", "info");
      return;
    }
    const [idA, idB] = state4.crossPicked;
    const res = crossCancel(state4.currentEq, idA, idB);
    if (!res.ok) {
      state4.crossPicked = [];
      clearCrossMarks();
      flashCrossError();
      if (ctx4 && ctx4.showInvalidMove) ctx4.showInvalidMove(res.error, res.hint, { label: "Semplificazione" });
      return;
    }
    dissolveThenApplyCross(idA, idB, res);
  }
  function spawnVariableExplosion(el, colorScheme = "neon") {
    const layer = dom4.crossDissolveLayer;
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
  function findCancellableDomElements(action) {
    if (!dom4 || !dom4.equationDisplay || !action) return [];
    if (action.ruleKey !== "cancelFactor" && action.id !== "cancel-factor") return [];
    let denText = "";
    try {
      const actCtx = action.build ? action.build({}) : {};
      denText = (actCtx.denText || "").trim();
    } catch {
    }
    if (!denText) return [];
    const found = [];
    dom4.equationDisplay.querySelectorAll(".math-node").forEach((el) => {
      const txt = (el.textContent || "").trim();
      if (txt === denText || el.dataset.varName === denText) {
        found.push(el);
      }
    });
    return found;
  }
  function spawnVictoryConfetti() {
    const layer = dom4.crossDissolveLayer;
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
  function dissolveThenApplyCross(idA, idB, res) {
    clearCrossMarks();
    if (ctx4 && ctx4.clearPreview) ctx4.clearPreview();
    if (ctx4 && ctx4.playSoundExplosion) ctx4.playSoundExplosion();
    const elA = dom4.equationDisplay.querySelector(`[data-id="${CSS.escape(idA)}"]`);
    const elB = dom4.equationDisplay.querySelector(`[data-id="${CSS.escape(idB)}"]`);
    [elA, elB].forEach((el) => {
      if (el) {
        el.classList.add("cross-dissolving", "var-exploding");
        spawnVariableExplosion(el);
      }
    });
    setTimeout(() => {
      state4.currentEq = res.newEq;
      state4.conditions = mergeConditions(state4.conditions, res.conditions || []);
      state4.selectedId = null;
      state4.crossPicked = [];
      if (ctx4 && ctx4.pushHistory) {
        ctx4.pushHistory({
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
      }
      if (ctx4 && ctx4.updateObjective) ctx4.updateObjective();
      renderEquationView();
      if (ctx4 && ctx4.showRulePanel) {
        ctx4.showRulePanel(
          { name: res.ruleName, principle: res.rulePrinciple, explanation: null },
          { steps: [`Elimino ${res.cancelled}.`], conditions: res.conditions || [] },
          res.newEq
        );
      }
      if (ctx4 && ctx4.clearMessage) ctx4.clearMessage();
      if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u2713 ${res.ruleName}.`, "success");
      toggleCrossMode(false);
      if (state4.goalReached) {
        if (checkAndAnimateCompoundFraction()) return;
        if (ctx4 && ctx4.playSuccessChime) ctx4.playSuccessChime();
        spawnVictoryConfetti();
        if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state4.targetVar)} \xE8 isolata!`, "success");
      } else if (state4.mode === "auto" && ctx4 && ctx4.showAutoMode) {
        ctx4.showAutoMode();
      }
    }, 460);
  }
  function flashCrossError() {
    const card = dom4.equationDisplay ? dom4.equationDisplay.closest(".equation-display-card") : null;
    if (!card) return;
    card.classList.remove("cross-error");
    void card.offsetWidth;
    card.classList.add("cross-error");
    setTimeout(() => card.classList.remove("cross-error"), 500);
  }
  function bindCrossDrag() {
    const handle = dom4.crossHandle;
    if (!handle) return;
    let dragging = false;
    const tokenUnder = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const node = el.closest(".math-node");
      if (!node || !dom4.equationDisplay.contains(node)) return null;
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
      dom4.equationDisplay.querySelectorAll(".cross-hover").forEach((el) => el.classList.remove("cross-hover"));
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
    const cancelCrossDrag = () => {
      dragging = false;
      handle.classList.remove("dragging");
      highlight(null);
      handle.style.left = "";
      handle.style.top = "";
    };
    handle.addEventListener("pointercancel", cancelCrossDrag);
    handle.addEventListener("lostpointercapture", cancelCrossDrag);
    handle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (ctx4 && ctx4.showMessage) ctx4.showMessage("Usa Tab per raggiungere un fattore e Invio per sceglierlo.", "info");
      }
    });
  }
  function applyDragResult(result, meta = {}) {
    if (!result || state4.isAnimatingCompoundFraction) return;
    if (!result.ok) {
      if (ctx4 && ctx4.clearPreview) ctx4.clearPreview();
      const card = dom4.equationDisplay.closest(".equation-display-card") || dom4.equationDisplay;
      card.classList.remove("cross-error");
      void card.offsetWidth;
      card.classList.add("cross-error");
      setTimeout(() => card.classList.remove("cross-error"), 500);
      if (ctx4 && ctx4.showInvalidMove) {
        ctx4.showInvalidMove(result.error, "Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.", { label: result.ruleName || "Trasporto" });
      }
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
    if (result.principle === "first") {
      if (ctx4 && ctx4.playSoundTransport) ctx4.playSoundTransport();
    } else {
      if (ctx4 && ctx4.playSoundFraction) ctx4.playSoundFraction();
    }
    if (ctx4 && ctx4.dismissDidacticBubble) ctx4.dismissDidacticBubble();
    if (ctx4 && ctx4.clearPreview) ctx4.clearPreview();
    const nextEq = result.newEq;
    state4.conditions = mergeConditions(state4.conditions, result.conditions || []);
    state4.selectedId = null;
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
    const isTargetIsolatedOnRight = isolatedSide(nextEq.right, state4.targetVar);
    if (isTargetIsolatedOnRight) {
      state4.currentEq = nextEq;
      renderEquationView();
      highlightLandedToken(meta.varName, meta.targetSide);
      if (ctx4 && ctx4.showRulePanel) ctx4.showRulePanel(pseudoRule, pseudoResult, nextEq);
      if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u2713 ${result.ruleName}!`, "success");
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state4.currentEq, state4.targetVar);
        if (flipped !== state4.currentEq) {
          animateMirrorSwap(state4.currentEq, flipped, () => {
            state4.currentEq = flipped;
            state4.goalReached = true;
            if (ctx4 && ctx4.pushHistory) {
              ctx4.pushHistory({
                equation: clone(flipped),
                ruleName: "Regola dello specchio (scambio membri)",
                rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
                ruleId: "swapSides",
                steps: ["Scambio i due membri per la propriet\xE0 simmetrica: la grandezza cercata \xE8 al primo membro."],
                conditions: state4.conditions.slice(),
                explanationKey: "scambioMembri",
                note: null,
                verified: true
              }, false);
            }
            if (ctx4 && ctx4.updateObjective) ctx4.updateObjective();
            renderEquationView();
            if (checkAndAnimateCompoundFraction()) return;
            if (ctx4 && ctx4.playSuccessChime) ctx4.playSuccessChime();
            spawnVictoryConfetti();
            if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state4.targetVar)} \xE8 isolata con successo!`, "success");
          });
        }
      }, 450);
      return;
    }
    state4.currentEq = nextEq;
    if (ctx4 && ctx4.pushHistory) {
      ctx4.pushHistory({
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
    }
    if (ctx4 && ctx4.updateObjective) ctx4.updateObjective();
    renderEquationView();
    highlightLandedToken(meta.varName, meta.targetSide);
    if (ctx4 && ctx4.showRulePanel) ctx4.showRulePanel(pseudoRule, pseudoResult, result.newEq);
    if (ctx4 && ctx4.clearMessage) ctx4.clearMessage();
    if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u2713 ${result.ruleName}!`, "success");
    if (state4.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      if (ctx4 && ctx4.playSuccessChime) ctx4.playSuccessChime();
      if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state4.targetVar)} \xE8 isolata con successo!`, "success");
    } else if (state4.mode === "auto" && ctx4 && ctx4.showAutoMode) {
      ctx4.showAutoMode();
    }
  }
  function cancelCompoundFractionAnimation() {
    if (state4 && state4.compoundAnimTimers && state4.compoundAnimTimers.length) {
      for (const t of state4.compoundAnimTimers) clearTimeout(t);
      state4.compoundAnimTimers = [];
    }
    if (state4) state4.isAnimatingCompoundFraction = false;
    if (dom4 && dom4.equationDisplay) {
      dom4.equationDisplay.classList.remove("compound-anim-step1", "compound-anim-step2", "compound-anim-step3");
    }
    if (dom4 && dom4.compoundFractionBanner) {
      dom4.compoundFractionBanner.hidden = true;
    }
  }
  function checkAndAnimateCompoundFraction(onComplete) {
    if (!state4 || state4.isAnimatingCompoundFraction) return false;
    if (!state4.currentEq || !state4.targetVar) return false;
    if (!isGoalReached(state4.currentEq, state4.targetVar)) return false;
    const steps = getCompoundFractionSteps(state4.currentEq, state4.targetVar);
    if (!steps) return false;
    startCompoundFractionAnimation(steps, onComplete);
    return true;
  }
  function startCompoundFractionAnimation(steps, onComplete) {
    cancelCompoundFractionAnimation();
    state4.isAnimatingCompoundFraction = true;
    if (dom4.completionBanner) dom4.completionBanner.hidden = true;
    if (dom4.compoundFractionBanner) {
      dom4.compoundFractionBanner.hidden = false;
      if (dom4.compoundFractionStepBadge) dom4.compoundFractionStepBadge.textContent = "Passaggio 1 di 2";
      if (dom4.compoundFractionTitle) dom4.compoundFractionTitle.textContent = "Frazione di frazione rilevata";
      if (dom4.compoundFractionMsg) {
        dom4.compoundFractionMsg.textContent = "La formula presenta una frazione al denominatore. Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa).";
      }
    }
    if (dom4.equationDisplay) {
      dom4.equationDisplay.classList.remove("compound-anim-step2", "compound-anim-step3");
      dom4.equationDisplay.classList.add("compound-anim-step1");
    }
    state4.currentEq = steps.step1Eq;
    renderEquationView();
    if (ctx4 && ctx4.updateObjective) ctx4.updateObjective();
    const t1 = setTimeout(() => {
      if (!state4.isAnimatingCompoundFraction) return;
      if (ctx4 && ctx4.playSoundFraction) ctx4.playSoundFraction();
      state4.currentEq = steps.step2Eq;
      renderEquationView();
      if (dom4.compoundFractionBanner) {
        if (dom4.compoundFractionStepBadge) dom4.compoundFractionStepBadge.textContent = "Passaggio 2 di 2";
        if (dom4.compoundFractionTitle) dom4.compoundFractionTitle.textContent = "Inversione del denominatore";
        if (dom4.compoundFractionMsg) {
          dom4.compoundFractionMsg.textContent = "Moltiplichiamo il numeratore per la frazione reciproca del denominatore: la frazione si capovolge.";
        }
      }
      if (dom4.equationDisplay) {
        dom4.equationDisplay.classList.remove("compound-anim-step1");
        dom4.equationDisplay.classList.add("compound-anim-step2");
      }
      const t2 = setTimeout(() => {
        if (!state4.isAnimatingCompoundFraction) return;
        if (ctx4 && ctx4.playSuccessChime) ctx4.playSuccessChime();
        spawnVictoryConfetti();
        state4.currentEq = steps.step3Eq;
        state4.isAnimatingCompoundFraction = false;
        renderEquationView();
        const rule = {
          name: "Semplificazione frazione di frazione",
          principle: "Dividere per una frazione equivale a moltiplicare per la sua reciproca (inversa): a / (b/c) = (a \xB7 c) / b.",
          explanation: null
        };
        if (ctx4 && ctx4.pushHistory) {
          ctx4.pushHistory({
            equation: clone(steps.step3Eq),
            ruleName: rule.name,
            rulePrinciple: rule.principle,
            ruleId: "compound_frac_simplify",
            steps: [
              `Frazione di frazione rilevata: ${steps.step1Pretty}`,
              `Moltiplicazione per la reciproca: ${steps.step2Pretty}`,
              `Frazione normale semplificata: ${steps.step3Pretty}`
            ],
            conditions: (state4.conditions || []).slice(),
            explanationKey: null,
            note: "Semplificazione automatica frazione di frazione",
            verified: true
          }, false);
        }
        if (dom4.compoundFractionBanner) {
          if (dom4.compoundFractionStepBadge) dom4.compoundFractionStepBadge.textContent = "Completato \u2713";
          if (dom4.compoundFractionTitle) dom4.compoundFractionTitle.textContent = "Frazione normale ottenuta!";
          if (dom4.compoundFractionMsg) {
            dom4.compoundFractionMsg.textContent = `Formula finale semplificata: ${steps.step3Pretty}.`;
          }
        }
        if (dom4.equationDisplay) {
          dom4.equationDisplay.classList.remove("compound-anim-step2");
          dom4.equationDisplay.classList.add("compound-anim-step3");
        }
        if (ctx4 && ctx4.updateObjective) ctx4.updateObjective();
        if (ctx4 && ctx4.showMessage) ctx4.showMessage(`\u{1F389} Frazione di frazione semplificata! Formula inversa finale ricavata con successo.`, "success");
        const t3 = setTimeout(() => {
          if (dom4.compoundFractionBanner) dom4.compoundFractionBanner.hidden = true;
          if (dom4.equationDisplay) dom4.equationDisplay.classList.remove("compound-anim-step3");
          if (typeof onComplete === "function") onComplete();
        }, 3200);
        state4.compoundAnimTimers.push(t3);
      }, 2500);
      state4.compoundAnimTimers.push(t2);
    }, 2200);
    state4.compoundAnimTimers.push(t1);
  }

  // js/app.js
  var state5 = {
    baseFormula: null,
    startEq: null,
    currentEq: null,
    targetVar: null,
    conditions: [],
    history: [],
    historyIndex: -1,
    mode: "free",
    quizManager: null,
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
  var dom5 = {
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
    btnExportWorksheet: $("#btn-export-worksheet"),
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
    btnHelp: $("#btn-help"),
    btnContrast: $("#btn-contrast"),
    btnTheme: $("#btn-theme"),
    btnLimMode: $("#btn-lim-mode"),
    btnSpeakEquation: $("#btn-speak-equation"),
    mathLiveVerbalizer: $("#math-live-verbalizer"),
    mathLiveAlert: $("#math-live-alert"),
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
    calcErrorNotice: $("#calc-error-notice"),
    mobileNavBar: $("#mobile-nav-bar"),
    // --- Esportatore Schede Didattiche e Verifiche Docenti ---
    worksheetModalBackdrop: $("#worksheet-modal-backdrop"),
    worksheetModalTitle: $("#worksheet-modal-title"),
    btnCloseWorksheetModal: $("#btn-close-worksheet-modal"),
    worksheetDocType: $("#worksheet-doc-type"),
    worksheetTitleInput: $("#worksheet-title-input"),
    worksheetSchoolInput: $("#worksheet-school-input"),
    worksheetSubjectInput: $("#worksheet-subject-input"),
    worksheetClassInput: $("#worksheet-class-input"),
    worksheetTeacherInput: $("#worksheet-teacher-input"),
    worksheetSourceSelect: $("#worksheet-source-select"),
    worksheetTopicGroup: $("#worksheet-topic-group"),
    worksheetTopicSelect: $("#worksheet-topic-select"),
    worksheetCountInput: $("#worksheet-count-input"),
    worksheetDifficultySelect: $("#worksheet-difficulty-select"),
    worksheetPointsInput: $("#worksheet-points-input"),
    worksheetRandomizeTargets: $("#worksheet-randomize-targets"),
    worksheetReqConditions: $("#worksheet-req-conditions"),
    worksheetSpaceType: $("#worksheet-space-type"),
    worksheetSolutionsSelect: $("#worksheet-solutions-select"),
    worksheetSummaryCount: $("#worksheet-summary-count"),
    worksheetSummaryPoints: $("#worksheet-summary-points"),
    worksheetSelectedList: $("#worksheet-selected-list"),
    btnTabPreviewHtml: $("#btn-tab-preview-html"),
    btnTabPreviewLatex: $("#btn-tab-preview-latex"),
    worksheetHtmlPreview: $("#worksheet-html-preview"),
    worksheetLatexCode: $("#worksheet-latex-code"),
    btnPrintWorksheet: $("#btn-print-worksheet"),
    btnDownloadLatex: $("#btn-download-latex"),
    btnCopyLatex: $("#btn-copy-latex"),
    btnDownloadHtml: $("#btn-download-html"),
    btnCloseWorksheet: $("#btn-close-worksheet"),
    // --- Modalità Eserciziario / Quiz Interattivo & Badge ---
    btnModeQuiz: $("#btn-mode-quiz"),
    btnQuizDashboard: $("#btn-quiz-dashboard"),
    quizHud: $("#quiz-hud"),
    quizCurrentLevel: $("#quiz-current-level"),
    quizTimer: $("#quiz-timer"),
    quizBtnNew: $("#quiz-btn-new"),
    quizBtnDashboard: $("#quiz-btn-dashboard"),
    quizLevelEasy: $("#quiz-level-easy"),
    quizLevelMedium: $("#quiz-level-medium"),
    quizLevelHard: $("#quiz-level-hard"),
    quizLevelAll: $("#quiz-level-all"),
    quizTopicSelect: $("#quiz-topic-select"),
    quizMovesCount: $("#quiz-moves-count"),
    quizOptimalCount: $("#quiz-optimal-count"),
    quizEfficiencyBadge: $("#quiz-efficiency-badge"),
    quizCompletionModalBackdrop: $("#quiz-completion-modal-backdrop"),
    quizCompletionModal: $("#quiz-completion-modal"),
    quizCompletionIcon: $("#quiz-completion-icon"),
    quizCompletionStars: $("#quiz-completion-stars"),
    quizCompletionTitle: $("#quiz-completion-title"),
    quizCompletionMsg: $("#quiz-completion-msg"),
    quizCompletionFormulaCard: $("#quiz-completion-formula-card"),
    quizCompletionFormula: $("#quiz-completion-formula"),
    quizCompletionStats: $("#quiz-completion-stats"),
    quizCompletionBadges: $("#quiz-completion-badges"),
    quizBtnRetryExercise: $("#quiz-btn-retry-exercise"),
    quizBtnViewStats: $("#quiz-btn-view-stats"),
    quizBtnViewBoard: $("#quiz-btn-view-board"),
    quizBtnNextExercise: $("#quiz-btn-next-exercise"),
    quizBtnCloseCompletion: $("#quiz-btn-close-completion"),
    quizDashboardBackdrop: $("#quiz-dashboard-backdrop"),
    quizDashboardModal: $("#quiz-dashboard-modal"),
    quizDashboardTitle: $("#quiz-dashboard-title"),
    quizBtnCloseDashboard: $("#quiz-btn-close-dashboard"),
    quizRankAvatar: $("#quiz-rank-avatar"),
    quizRankTitle: $("#quiz-rank-title"),
    quizRankLevel: $("#quiz-rank-level"),
    quizXpText: $("#quiz-xp-text"),
    quizXpBar: $("#quiz-xp-bar"),
    quizStatTotal: $("#quiz-stat-total"),
    quizStatEasy: $("#quiz-stat-easy"),
    quizStatMedium: $("#quiz-stat-medium"),
    quizStatHard: $("#quiz-stat-hard"),
    quizStatEfficiency: $("#quiz-stat-efficiency"),
    quizStatStreak: $("#quiz-stat-streak"),
    quizBadgesCountBadge: $("#quiz-badges-count-badge"),
    quizBadgesGrid: $("#quiz-badges-grid"),
    quizHistoryList: $("#quiz-history-list"),
    quizBtnResetProgress: $("#quiz-btn-reset-progress"),
    quizBtnCloseDashboardBottom: $("#quiz-btn-close-dashboard-bottom")
  };
  var appContext = {
    loadFormula,
    updateObjective,
    updateRulePanelInitial,
    showRulePanel,
    showAutoMode,
    executeNextAutoStep,
    clearPreview,
    clearSelection,
    selectElement,
    renderActions,
    renderConditions,
    renderEquationView,
    renderKeypad,
    pushHistory,
    renderHistory,
    undo,
    redo,
    resetExercise,
    showMessage,
    clearMessage,
    showInvalidMove,
    showDidacticBubble,
    dismissDidacticBubble,
    playSoundClick,
    playSoundTransport,
    playSoundFraction,
    playSoundExplosion,
    playSoundInvalid,
    playSuccessChime,
    animateOperationBadge,
    animateMirrorSwap,
    flashSignChanged,
    spawnVictoryConfetti,
    checkAndAnimateCompoundFraction,
    cancelCompoundFractionAnimation,
    cancelActiveSwapAnimations
  };
  function init() {
    initTheme();
    populateTopics();
    renderLibrary();
    bindLibraryEvents();
    initCanvas(dom5, state5, appContext);
    initNumpad(dom5, state5, appContext);
    initHistory(dom5, state5, appContext);
    initModals(dom5, state5, appContext);
    bindWorkAreaEvents();
    bindModeEvents();
    bindGlobalEvents();
    if (dom5.crossLayer) dom5.crossLayer.hidden = true;
    initPwa();
    initMobileNav();
    initWorksheetExporter(dom5, state5);
    state5.quizManager = initQuizManager(dom5, state5, { loadFormula });
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
      if (dom5.btnInstallPwa && !isStandalone) {
        dom5.btnInstallPwa.style.display = "inline-flex";
      }
    });
    if (dom5.btnInstallPwa) {
      dom5.btnInstallPwa.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        dom5.btnInstallPwa.style.display = "none";
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
      if (dom5.btnInstallPwa) dom5.btnInstallPwa.style.display = "none";
      deferredInstallPrompt = null;
      showMessage('\u{1F389} "Formule Inverse" \xE8 ora installata sul tuo dispositivo!', "success");
    });
  }
  function initMobileNav() {
    if (!dom5.mobileNavBar) return;
    const items = dom5.mobileNavBar.querySelectorAll(".mobile-nav-item");
    if (!items.length) return;
    function setActive(targetId) {
      items.forEach((btn) => {
        if (btn.dataset.jump === targetId) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.jump;
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          setActive(targetId);
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    const sectionIds = ["library-panel", "equation-display-card", "history-panel", "numerical-calc-card"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const observer = new IntersectionObserver((entries) => {
        let mostVisible = null;
        let maxRatio = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisible = entry.target;
          }
        });
        if (mostVisible) {
          setActive(mostVisible.id);
        }
      }, {
        root: null,
        threshold: [0.1, 0.3, 0.6],
        rootMargin: "-50px 0px -100px 0px"
      });
      sections.forEach((s) => observer.observe(s));
    }
  }
  var parsedFormulaCache = /* @__PURE__ */ new Map();
  function parseFormulaCached(formulaStr) {
    if (!parsedFormulaCache.has(formulaStr)) {
      parsedFormulaCache.set(formulaStr, parseEquation(formulaStr));
    }
    return parsedFormulaCache.get(formulaStr);
  }
  function populateTopics() {
    if (!dom5.libraryTopic) return;
    dom5.libraryTopic.innerHTML = '<option value="">Tutti gli argomenti</option>';
    for (const t of TOPICS) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      dom5.libraryTopic.appendChild(opt);
    }
  }
  function renderLibrary() {
    const topic = dom5.libraryTopic ? dom5.libraryTopic.value : "";
    const search = dom5.librarySearch ? dom5.librarySearch.value.trim() : "";
    const difficulty = dom5.libraryDifficulty ? dom5.libraryDifficulty.value : "";
    const list = filterFormulas({ topic, search, difficulty });
    if (topic && search && list.length > 0 && list.some((f) => f.topic !== topic)) {
      if (dom5.libraryTopic) dom5.libraryTopic.value = "";
    }
    if (dom5.libraryCountBadge) {
      dom5.libraryCountBadge.textContent = list.length + (list.length === 1 ? " formula" : " formule");
    }
    dom5.libraryList.innerHTML = "";
    if (list.length === 0) {
      dom5.libraryList.innerHTML = '<p class="placeholder">Nessuna formula trovata per i filtri selezionati.</p>';
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
        mathHtml = escapeHtml5(f.formula);
      }
      card.innerHTML = `
      <div class="formula-card-head">
        <span class="formula-topic">${escapeHtml5(f.topic)}</span>
        <span class="formula-diff" title="Difficolt\xE0 ${f.difficulty}/5">${dif}</span>
      </div>
      <div class="formula-name">${escapeHtml5(f.name)}</div>
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
      dom5.libraryList.appendChild(card);
    }
  }
  function openPickTargetModal(formulaEntry) {
    if (!dom5.pickTargetBackdrop) {
      loadFormula(formulaEntry, formulaEntry.isolate[0]);
      return;
    }
    dom5.pickTargetFormulaName.textContent = formulaEntry.name;
    try {
      dom5.pickTargetFormulaPreview.innerHTML = renderEquation(parseFormulaCached(formulaEntry.formula), {});
    } catch {
      dom5.pickTargetFormulaPreview.textContent = formulaEntry.formula;
    }
    dom5.pickTargetButtons.innerHTML = "";
    formulaEntry.isolate.forEach((v) => {
      const btn = document.createElement("button");
      btn.className = "pick-target-btn";
      btn.type = "button";
      btn.innerHTML = `<span>${escapeHtml5(prettyVar(v))}</span><small>ricava ${escapeHtml5(prettyVar(v))}</small>`;
      btn.addEventListener("click", () => {
        dom5.pickTargetBackdrop.hidden = true;
        loadFormula(formulaEntry, v);
      });
      dom5.pickTargetButtons.appendChild(btn);
    });
    dom5.pickTargetBackdrop.hidden = false;
  }
  function loadFormula(formulaEntry, targetVar) {
    cancelCompoundFractionAnimation();
    cancelActiveSwapAnimations();
    dismissDidacticBubble();
    state5.baseFormula = formulaEntry;
    let eq;
    try {
      eq = parseEquation(formulaEntry.formula);
    } catch (e) {
      showMessage("Impossibile caricare la formula: " + e.message, "error");
      return;
    }
    state5.startEq = clone(eq);
    state5.currentEq = clone(eq);
    state5.targetVar = targetVar;
    state5.conditions = (formulaEntry.conditions || []).slice();
    state5.history = [];
    state5.historyIndex = -1;
    state5.selectedId = null;
    state5.pendingMove = null;
    state5.goalReached = false;
    state5.keypadOp = null;
    toggleCrossMode(false);
    clearPreview();
    pushHistory({
      equation: clone(eq),
      ruleName: "Formula di partenza",
      rulePrinciple: formulaEntry.formula,
      steps: [],
      conditions: state5.conditions.slice(),
      explanationKey: null,
      note: formulaEntry.hypotheses || null,
      verified: true
    }, true);
    updateObjective();
    renderEquationView();
    updateRulePanelInitial(formulaEntry);
    clearMessage();
    showMessage(`Formula "${formulaEntry.name}" caricata. Obiettivo: isolare ${prettyVar(targetVar)}.`, "info");
    renderLibrary();
    if (state5.mode === "auto") {
      showAutoMode();
    }
  }
  function setTargetVar(v) {
    state5.targetVar = v;
    dismissDidacticBubble();
    updateObjective();
    renderEquationView();
    clearMessage();
    if (state5.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(v)} \xE8 gi\xE0 isolata!`, "success");
    } else {
      showMessage(`\u{1F3AF} Nuovo obiettivo impostato: isolare ${prettyVar(v)}.`, "info");
    }
  }
  function bindLibraryEvents() {
    if (dom5.librarySearch) {
      dom5.librarySearch.addEventListener("input", renderLibrary);
      dom5.librarySearch.addEventListener("search", renderLibrary);
    }
    if (dom5.libraryTopic) dom5.libraryTopic.addEventListener("change", renderLibrary);
    if (dom5.libraryDifficulty) dom5.libraryDifficulty.addEventListener("change", renderLibrary);
    if (dom5.btnRandom) {
      dom5.btnRandom.addEventListener("click", () => {
        const { id, target } = randomExercise();
        loadFormula(getFormulaById(id), target);
      });
    }
  }
  function selectElement(id) {
    if (!state5.currentEq) return;
    state5.selectedId = id;
    clearPreview();
    renderEquationView();
    const element = findElement(state5.currentEq, id);
    if (!element) {
      dom5.actionHint.textContent = "Elemento non trovato.";
      dom5.actionButtons.innerHTML = "";
      return;
    }
    const actions = availableActions(state5.currentEq, element, state5.targetVar);
    renderActions(element, actions);
  }
  function renderActions(element, specificActions) {
    dom5.actionButtons.innerHTML = "";
    const el = findElement(state5.currentEq, state5.selectedId);
    dom5.actionHint.textContent = `Selezionato: "${el ? el.pretty : ""}" (${roleLabel(el ? el.role : "")}). Operazioni disponibili:`;
    const all = [...specificActions];
    for (const g of globalActions(state5.currentEq, state5.targetVar)) {
      if (!all.find((a) => a.id === g.id)) all.push(g);
    }
    addValueOps(all, element);
    if (all.length === 0) {
      dom5.actionButtons.innerHTML = '<p class="placeholder small">Nessuna operazione diretta su questo elemento. Prova a selezionare un fattore, un termine o un denominatore.</p>';
      return;
    }
    for (const action of all) {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.type = "button";
      btn.innerHTML = `<span class="action-label">${escapeHtml5(action.label)}</span>
      <span class="action-desc">${escapeHtml5(action.description || "")}</span>`;
      btn.addEventListener("click", () => previewAction(action));
      dom5.actionButtons.appendChild(btn);
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
    const res = performAction(state5.currentEq, action);
    if (!res.ok) {
      showInvalidMove(res.error, res.hint, action);
      return;
    }
    if (equivalentEq(res.equation, state5.currentEq)) {
      showMessage("Questa operazione non cambia l'equazione: prova un'altra trasformazione.", "info");
      return;
    }
    state5.pendingMove = { action, result: res };
    showPreview(action, res);
  }
  function showPreview(action, res) {
    dom5.previewBox.hidden = false;
    dom5.previewText.innerHTML = `Anteprima: <span class="preview-eq">${escapeHtml5(toPretty(res.equation, 0))}</span> \u2014 regola: <em>${escapeHtml5(action.label)}</em>`;
    dom5.btnConfirm.focus();
  }
  function clearPreview() {
    state5.pendingMove = null;
    dom5.previewBox.hidden = true;
    dom5.previewText.innerHTML = "";
  }
  function confirmMove() {
    if (!state5.pendingMove) return;
    if (state5.pendingMove.kind === "cross") {
      const { idA, idB, result: result2 } = state5.pendingMove;
      state5.pendingMove = null;
      dissolveThenApplyCross(idA, idB, result2);
      return;
    }
    if (state5.pendingMove.kind === "drag") {
      const res = state5.pendingMove.result;
      if (!res.ok) {
        clearPreview();
        showInvalidMove(res.error, "Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.", { label: res.ruleName || "Trasporto" });
        return;
      }
      state5.currentEq = res.newEq;
      state5.conditions = mergeConditions(state5.conditions, res.conditions || []);
      state5.selectedId = null;
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
      if (state5.goalReached) {
        if (checkAndAnimateCompoundFraction()) return;
        playSuccessChime();
        spawnVictoryConfetti();
        showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata con successo!`, "success");
      }
      return;
    }
    const { action, result } = state5.pendingMove;
    playSoundForRule(action.ruleKey);
    state5.currentEq = result.equation;
    state5.conditions = mergeConditions(state5.conditions, result.conditions || []);
    state5.selectedId = null;
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
    showRulePanel(rule, result, state5.currentEq);
    clearMessage();
    if (state5.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo lavoro! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata con successo!`, "success");
    } else if (state5.mode === "auto") {
      showAutoMode();
    }
  }
  function cancelPreview() {
    clearPreview();
    clearCrossMarks();
    state5.crossPicked = [];
    renderEquationView();
  }
  function clearSelection() {
    state5.selectedId = null;
    if (state5.clickDragToken) exitClickDragMode();
    if (dom5.actionButtons && state5.mode === "free") dom5.actionButtons.innerHTML = "";
    if (dom5.actionHint && state5.mode === "free") {
      dom5.actionHint.textContent = "Seleziona un elemento dell'equazione per vedere le operazioni disponibili.";
    }
  }
  function showRulePanel(rule, result, afterEq) {
    const ex = rule ? getExplanation(rule.explanation) : null;
    let html = `<div class="rule-name">\u{1F4DC} ${escapeHtml5(rule ? rule.name : "Trasformazione")}</div>`;
    if (ex) {
      html += `<div class="rule-section"><strong>\u{1F4A1} Spiegazione intuitiva</strong><p>${escapeHtml5(ex.intuitiva)}</p></div>`;
      html += `<div class="rule-section"><strong>\u2696\uFE0F Principio di equivalenza</strong><p>${escapeHtml5(ex.principio)}</p></div>`;
      html += `<div class="rule-section"><strong>\u{1F3AF} Perch\xE9 \xE8 corretta</strong><p>${escapeHtml5(ex.perche)}</p></div>`;
    } else if (rule && rule.principle) {
      html += `<div class="rule-section"><strong>\u2696\uFE0F Principio matematico</strong><p>${escapeHtml5(rule.principle)}</p></div>`;
    }
    if (result.steps && result.steps.length) {
      html += `<div class="rule-section"><strong>\u2699\uFE0F Operazione svolta</strong><ul class="steps-list">${result.steps.map((s) => `<li>${escapeHtml5(s)}</li>`).join("")}</ul></div>`;
    }
    html += `<div class="rule-section rule-eq"><strong>\u{1F4D0} Equazione dopo</strong><div class="rule-math">${renderEquation(afterEq, {})}</div></div>`;
    if (result.conditions && result.conditions.length) {
      html += `<div class="rule-section conditions"><strong>\u{1F50D} Condizioni di validit\xE0 richieste</strong><ul>${result.conditions.map((c) => `<li>${escapeHtml5(c)}</li>`).join("")}</ul></div>`;
    }
    if (ex && ex.attenzione && ex.attenzione.length) {
      html += `<div class="rule-section warning"><strong>\u26A0\uFE0F Attenzione</strong><ul>${ex.attenzione.map((c) => `<li>${escapeHtml5(c)}</li>`).join("")}</ul></div>`;
    }
    if (result.note) {
      html += `<div class="rule-section warning"><p>${escapeHtml5(result.note)}</p></div>`;
    }
    dom5.rulePanel.innerHTML = html;
  }
  function updateRulePanelInitial(formulaEntry) {
    dom5.rulePanel.innerHTML = `
    <div class="rule-name">Formula di partenza</div>
    <div class="rule-section"><strong>${escapeHtml5(formulaEntry.name)}</strong>
      <div class="rule-math">${renderEquation(state5.startEq, {})}</div></div>
    ${formulaEntry.notes ? `<div class="rule-section"><p>${escapeHtml5(formulaEntry.notes)}</p></div>` : ""}
    ${formulaEntry.hypotheses ? `<div class="rule-section"><strong>Ipotesi</strong><p>${escapeHtml5(formulaEntry.hypotheses)}</p></div>` : ""}
    <div class="rule-section"><p>Seleziona un elemento nell'area di lavoro per iniziare a ricavare la formula inversa.</p></div>
  `;
  }
  function showInvalidMove(error, hint, action) {
    playSoundInvalid();
    const diag = diagnoseStudentMisconception(error, hint, action);
    const parts = [];
    parts.push("Mossa non valida: " + error);
    if (diag.advice || hint) parts.push("Suggerimento: " + (diag.advice || hint));
    if (action) parts.push("Regola tentata: " + action.label);
    showMessage(parts.join(" "), "error");
    showDidacticBubble({ error, hint: diag.advice || hint, action });
    pushHistory({
      equation: clone(state5.currentEq),
      ruleName: "Tentativo non valido: " + (diag.badge || "Errore"),
      rulePrinciple: diag.ruleReminder || "",
      steps: [action ? action.label : ""],
      conditions: [],
      explanationKey: null,
      note: error,
      verified: false
    }, false, true);
  }
  var _lastAnnouncedSolvedEq = false;
  function updateObjective() {
    const f = state5.baseFormula;
    const t = prettyVar(state5.targetVar);
    dom5.objectiveText.textContent = f ? `ricavare ${t} \u2014 ${f.name} (${f.formula})` : `ricavare ${t}`;
    state5.goalReached = isGoalReached(state5.currentEq, state5.targetVar);
    if (state5.goalReached && state5.currentEq && state5.currentEq.type === "Eq") {
      const flipped = ensureTargetOnFirstMember(state5.currentEq, state5.targetVar);
      if (flipped !== state5.currentEq) {
        state5.currentEq = flipped;
        if (dom5.equationDisplay) {
          dom5.equationDisplay.innerHTML = renderEquation(state5.currentEq, {
            selectedId: state5.selectedId,
            targetVar: state5.targetVar,
            interactive: true,
            showImplicitDen: state5.showImplicitDen
          });
          if (dom5.latexLiveCode) dom5.latexLiveCode.textContent = toLatex(state5.currentEq);
        }
      }
    }
    const resSide = state5.currentEq && state5.currentEq.type === "Eq" ? isolatedSide(state5.currentEq.left, state5.targetVar) ? state5.currentEq.right : isolatedSide(state5.currentEq.right, state5.targetVar) ? state5.currentEq.left : null : null;
    const hasCompound = hasCompoundFraction(resSide);
    const isFullySolved = state5.goalReached && !hasCompound && !state5.isAnimatingCompoundFraction;
    if (isFullySolved && !_lastAnnouncedSolvedEq) {
      _lastAnnouncedSolvedEq = true;
      const verbal = verbalizeEquation(state5.currentEq);
      announceMathLive(`Obiettivo raggiunto! La grandezza ${verbalizeVar(state5.targetVar)} \xE8 isolata: ${verbal}`, true);
    } else if (!isFullySolved) {
      _lastAnnouncedSolvedEq = false;
    }
    dom5.objectiveStatus.hidden = false;
    if (state5.isAnimatingCompoundFraction) {
      dom5.objectiveStatus.textContent = "\u26A1 Semplificazione...";
      dom5.objectiveStatus.className = "status-badge status-progress";
      dom5.objectiveBox.classList.remove("objective-done");
    } else {
      dom5.objectiveStatus.textContent = isFullySolved ? "\u2713 Raggiunto" : "\u25CF In corso";
      dom5.objectiveStatus.className = "status-badge " + (isFullySolved ? "status-success" : "status-progress");
      dom5.objectiveBox.classList.toggle("objective-done", isFullySolved);
    }
    if (dom5.btnRetryExercise) dom5.btnRetryExercise.hidden = !state5.startEq;
    if (dom5.completionBanner) {
      dom5.completionBanner.hidden = !isFullySolved;
      if (isFullySolved) {
        if (dom5.completionTitle) dom5.completionTitle.textContent = `\u{1F3C6} Ottimo lavoro! Hai isolato ${t}`;
        if (dom5.completionSubtitle) {
          dom5.completionSubtitle.textContent = `Formula inversa ricavata con successo: ${toPretty(state5.currentEq, 0)}.`;
        }
        if (state5.mode === "quiz" && state5.quizManager) {
          state5.quizManager.onGoalReached();
        }
      }
    }
    if (dom5.objectiveTargetPicker && f && f.isolate) {
      dom5.objectiveTargetPicker.hidden = false;
      dom5.targetChips.innerHTML = "";
      f.isolate.forEach((v) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "target-chip" + (v === state5.targetVar ? " active" : "");
        chip.textContent = prettyVar(v);
        chip.title = `Imposta come obiettivo: isola ${prettyVar(v)}`;
        chip.addEventListener("click", () => setTargetVar(v));
        dom5.targetChips.appendChild(chip);
      });
    } else if (dom5.objectiveTargetPicker) {
      dom5.objectiveTargetPicker.hidden = true;
    }
    updateNumericalCalculator();
  }
  function renderConditions() {
    if (state5.conditions.length === 0) {
      dom5.conditionsBox.hidden = true;
      return;
    }
    dom5.conditionsBox.hidden = false;
    dom5.conditionsList.innerHTML = state5.conditions.map((c) => `<li>${escapeHtml5(c)}</li>`).join("");
  }
  function getSolvedExpression() {
    if (!state5.currentEq || !state5.targetVar) return null;
    const leftRaw = unwrap(state5.currentEq.left);
    const rightRaw = unwrap(state5.currentEq.right);
    if (isVar(leftRaw) && leftRaw.name === state5.targetVar) {
      return rightRaw;
    }
    if (isVar(rightRaw) && rightRaw.name === state5.targetVar) {
      return leftRaw;
    }
    return null;
  }
  function updateNumericalCalculator() {
    if (!dom5.numericalCalcCard) return;
    if (!state5.goalReached) {
      dom5.numericalCalcCard.hidden = true;
      return;
    }
    const solvedExpr = getSolvedExpression();
    if (!solvedExpr) {
      dom5.numericalCalcCard.hidden = true;
      return;
    }
    dom5.numericalCalcCard.hidden = false;
    const targetInfo = getQuantityInfo(state5.targetVar, state5.baseFormula);
    if (dom5.calcTargetVar) dom5.calcTargetVar.textContent = prettyVar(state5.targetVar);
    if (dom5.calcFinalUnit) dom5.calcFinalUnit.textContent = targetInfo.unit;
    const freeVars = Array.from(collectVars(solvedExpr)).filter(
      (v) => v !== state5.targetVar && v !== "pi" && v !== "\u03C0" && v !== "e" && v !== "\xB1"
    );
    renderCalculatorInputs(freeVars, solvedExpr);
  }
  function hasPmSign(node) {
    node = unwrap(node);
    if (!node) return false;
    if (node.type === "Add" && node.args.length === 2) {
      const first = unwrap(node.args[0]);
      if (first.type === "Var" && first.name === "\xB1") return true;
    }
    return false;
  }
  function renderCalculatorInputs(freeVars, solvedExpr) {
    if (!dom5.calcInputsGrid) return;
    dom5.calcInputsGrid.innerHTML = "";
    if (freeVars.length === 0) {
      const evalRes = evalWithEnv(solvedExpr, {});
      const formatted = evalRes.ok ? formatResultNumber(evalRes.value) : "\u2014";
      const withPm = hasPmSign(solvedExpr);
      const displayVal = evalRes.ok && withPm ? `\xB1 ${formatted}` : formatted;
      if (dom5.calcFinalNumber) dom5.calcFinalNumber.textContent = displayVal;
      if (dom5.calcStepFormula) dom5.calcStepFormula.textContent = `${prettyVar(state5.targetVar)} = ${displayVal}`;
      return;
    }
    freeVars.forEach((v) => {
      const qInfo = getQuantityInfo(v, state5.baseFormula);
      const item = document.createElement("div");
      item.className = "calc-input-item";
      item.innerHTML = `
      <div class="calc-input-meta">
        <span class="calc-input-symbol">${prettyVar(v)}</span>
        <span class="calc-input-label" title="${escapeHtml5(qInfo.name)}">${escapeHtml5(qInfo.name)}</span>
      </div>
      <div class="calc-input-row">
        <input type="number" step="any" class="calc-num-input" data-var="${escapeHtml5(v)}" placeholder="0" />
        <span class="calc-unit-badge">${escapeHtml5(qInfo.unit)}</span>
      </div>
    `;
      const input = item.querySelector(".calc-num-input");
      input.addEventListener("input", () => runNumericalCalculation(solvedExpr));
      dom5.calcInputsGrid.appendChild(item);
    });
    populateCalculatorSamples(freeVars, solvedExpr);
  }
  function populateCalculatorSamples(freeVars, solvedExpr) {
    if (!dom5.calcInputsGrid) return;
    const inputs = dom5.calcInputsGrid.querySelectorAll(".calc-num-input");
    inputs.forEach((input) => {
      const v = input.dataset.var;
      const qInfo = getQuantityInfo(v, state5.baseFormula);
      input.value = qInfo.sample !== void 0 ? qInfo.sample : 1;
    });
    runNumericalCalculation(solvedExpr);
  }
  function resetCalculatorInputs(solvedExpr) {
    if (!dom5.calcInputsGrid) return;
    const inputs = dom5.calcInputsGrid.querySelectorAll(".calc-num-input");
    inputs.forEach((input) => {
      input.value = "";
    });
    runNumericalCalculation(solvedExpr);
  }
  function runNumericalCalculation(solvedExpr) {
    if (!dom5.calcInputsGrid) return;
    const inputs = dom5.calcInputsGrid.querySelectorAll(".calc-num-input");
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
    const targetInfo = getQuantityInfo(state5.targetVar, state5.baseFormula);
    if (anyEmpty) {
      if (dom5.calcFinalNumber) dom5.calcFinalNumber.textContent = "\u2014";
      if (dom5.calcStepFormula) dom5.calcStepFormula.textContent = "Inserisci tutte le grandezze per visualizzare il calcolo numerico.";
      if (dom5.calcErrorNotice) dom5.calcErrorNotice.hidden = true;
      return;
    }
    const evalRes = evalWithEnv(solvedExpr, env);
    if (evalRes.ok) {
      const formatted = formatResultNumber(evalRes.value);
      const withPm = hasPmSign(solvedExpr);
      const displayVal = withPm ? `\xB1 ${formatted}` : formatted;
      if (dom5.calcFinalNumber) dom5.calcFinalNumber.textContent = displayVal;
      if (dom5.calcErrorNotice) dom5.calcErrorNotice.hidden = true;
      try {
        const substitutedAst = substituteVarsInAst(solvedExpr, env);
        const substitutedHtml = renderNode(substitutedAst, "calc-step", { interactive: false });
        if (dom5.calcStepFormula) {
          dom5.calcStepFormula.innerHTML = `
          <span class="calc-step-var">${prettyVar(state5.targetVar)}</span>
          <span class="calc-step-eq">=</span>
          <span class="calc-step-expr">${substitutedHtml}</span>
          <span class="calc-step-eq">=</span>
          <strong>${displayVal}</strong>
          <span class="calc-step-unit">${targetInfo.unit}</span>
        `;
        }
      } catch {
        if (dom5.calcStepFormula) {
          dom5.calcStepFormula.textContent = `${prettyVar(state5.targetVar)} = ${displayVal} ${targetInfo.unit}`;
        }
      }
    } else {
      if (dom5.calcFinalNumber) dom5.calcFinalNumber.textContent = "Non calcolabile";
      if (dom5.calcErrorNotice) {
        dom5.calcErrorNotice.textContent = `\u26A0\uFE0F Impossibile completare il calcolo: ${evalRes.error || "Errore nei valori numerici"}`;
        dom5.calcErrorNotice.hidden = false;
      }
      if (dom5.calcStepFormula) dom5.calcStepFormula.textContent = "Verifica i valori inseriti.";
    }
  }
  function copyCalculatorResult() {
    const val = dom5.calcFinalNumber ? dom5.calcFinalNumber.textContent.trim() : "";
    const unit = dom5.calcFinalUnit ? dom5.calcFinalUnit.textContent.trim() : "";
    const target = prettyVar(state5.targetVar);
    if (!val || val === "\u2014" || val === "Non calcolabile") {
      showMessage("Nessun valore valido da copiare.", "warning");
      return;
    }
    const text = `${target} = ${val} ${unit}`;
    navigator.clipboard.writeText(text).then(() => {
      const oldText = dom5.btnCopyCalcResult.textContent;
      dom5.btnCopyCalcResult.textContent = "\u2713 Copiato!";
      setTimeout(() => {
        if (dom5.btnCopyCalcResult) dom5.btnCopyCalcResult.textContent = oldText;
      }, 1800);
      showMessage(`Copiato negli appunti: ${text}`, "success");
    }).catch(() => {
      showMessage(`Risultato: ${text}`, "info");
    });
  }
  function showMessage(text, kind) {
    dom5.messageBox.hidden = false;
    dom5.messageBox.textContent = text;
    dom5.messageBox.className = "message-box message-" + (kind || "info");
  }
  function clearMessage() {
    dom5.messageBox.hidden = true;
    dom5.messageBox.textContent = "";
    dom5.messageBox.className = "message-box";
  }
  function retryCurrentExercise() {
    cancelCompoundFractionAnimation();
    playSoundClick();
    dismissDidacticBubble();
    clearSelection();
    clearPreview();
    if (state5.baseFormula && state5.targetVar) {
      loadFormula(state5.baseFormula, state5.targetVar);
      showMessage(`\u{1F504} Esercizio riavviato! Riprova a ricavare ${prettyVar(state5.targetVar)}.`, "info");
    } else if (state5.startEq && state5.targetVar) {
      loadFormula({
        id: "custom-" + Date.now(),
        topic: "formula personalizzata",
        name: "formula personalizzata",
        formula: toPretty(state5.startEq, 0),
        isolate: [state5.targetVar],
        conditions: state5.conditions ? state5.conditions.slice() : [],
        difficulty: 3
      }, state5.targetVar);
      showMessage(`\u{1F504} Esercizio riavviato! Riprova a ricavare ${prettyVar(state5.targetVar)}.`, "info");
    } else if (state5.startEq) {
      resetExercise();
    }
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
        state5.mode = btn.dataset.mode;
        if (dom5.btnModeQuiz) {
          dom5.btnModeQuiz.classList.remove("active");
          dom5.btnModeQuiz.setAttribute("aria-pressed", "false");
        }
        if (state5.quizManager) {
          state5.quizManager.setQuizModeActive(false);
        }
        const modeDesc = {
          free: "\u{1F513} Modalit\xE0 Libera: interagisci liberamente trascinando variabili e applicando operazioni.",
          auto: "\u26A1 Modalit\xE0 Automatica: a ogni clic del mouse il programma esegue una operazione giustificando la regola."
        };
        showMessage(modeDesc[state5.mode] || "", "info");
        const card = dom5.equationDisplay ? dom5.equationDisplay.closest(".equation-display-card") : null;
        if (card) card.classList.toggle("is-auto-mode", state5.mode === "auto");
        if (state5.mode === "auto") {
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
    if (dom5.btnModeQuiz) {
      dom5.btnModeQuiz.addEventListener("click", () => {
        const isCurrentlyQuiz = state5.mode === "quiz";
        if (isCurrentlyQuiz) {
          state5.mode = "free";
          dom5.btnModeQuiz.classList.remove("active");
          dom5.btnModeQuiz.setAttribute("aria-pressed", "false");
          document.querySelectorAll(".mode-btn").forEach((b) => {
            const isFree = b.dataset.mode === "free";
            b.classList.toggle("active", isFree);
            b.setAttribute("aria-pressed", isFree ? "true" : "false");
          });
          if (state5.quizManager) state5.quizManager.setQuizModeActive(false);
          const card = dom5.equationDisplay ? dom5.equationDisplay.closest(".equation-display-card") : null;
          if (card) card.classList.remove("is-auto-mode");
          const hintBadge = document.querySelector(".drag-hint-badge");
          const hintText = document.querySelector(".drag-hint-text");
          if (hintBadge && hintText) {
            hintBadge.textContent = "\u2728 Modalit\xE0 Libera";
            hintText.innerHTML = "Trascina una variabile dall'altra parte dell'uguale: rilasciala <strong>sotto la linea di frazione</strong> per dividere, o al numeratore per moltiplicare!";
          }
          renderEquationView();
          clearSelection();
          showMessage("Modalit\xE0 Quiz disattivata. Tornato in Modalit\xE0 Libera.", "info");
        } else {
          state5.mode = "quiz";
          dom5.btnModeQuiz.classList.add("active");
          dom5.btnModeQuiz.setAttribute("aria-pressed", "true");
          document.querySelectorAll(".mode-btn").forEach((b) => {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
          });
          if (state5.quizManager) state5.quizManager.setQuizModeActive(true);
          const card = dom5.equationDisplay ? dom5.equationDisplay.closest(".equation-display-card") : null;
          if (card) card.classList.remove("is-auto-mode");
          const hintBadge = document.querySelector(".drag-hint-badge");
          const hintText = document.querySelector(".drag-hint-text");
          if (hintBadge && hintText) {
            hintBadge.textContent = "\u{1F3AF} Modalit\xE0 Quiz";
            hintText.innerHTML = "Risolvi l'esercizio nel <strong>minor numero di passaggi possibile</strong>. Trascina variabili o usa le operazioni!";
          }
          renderEquationView();
          clearSelection();
          showMessage("\u{1F3AF} Modalit\xE0 Eserciziario / Quiz attivata! Risolvi le formule con la massima efficienza algebrica.", "info");
        }
      });
    }
  }
  var _isAutoStepping = false;
  function executeNextAutoStep() {
    if (_isAutoStepping) return;
    _isAutoStepping = true;
    setTimeout(() => {
      _isAutoStepping = false;
    }, 250);
    if (!state5.currentEq) {
      showMessage("Seleziona prima una formula dalla libreria per iniziare.", "info");
      return;
    }
    if (state5.goalReached) {
      playSuccessChime();
      showMessage(`\u{1F389} Obiettivo gi\xE0 raggiunto! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata.`, "success");
      return;
    }
    const sug = suggestNextStep(state5.currentEq, state5.targetVar);
    if (!sug.found) {
      showMessage(sug.message || "Nessun ulteriore passaggio automatico trovato.", "info");
      return;
    }
    const res = performAction(state5.currentEq, sug.action, { target: state5.targetVar });
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
    state5.conditions = mergeConditions(state5.conditions, res.conditions || []);
    state5.selectedId = null;
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
    const isTargetOnRight = isolatedSide(nextEq.right, state5.targetVar);
    if (isTargetOnRight) {
      state5.currentEq = nextEq;
      renderEquationView();
      showRulePanel(rule, res, state5.currentEq);
      animateOperationBadge(sug.action.label, sug.action.operandText);
      clearMessage();
      setTimeout(() => {
        const flipped = ensureTargetOnFirstMember(state5.currentEq, state5.targetVar);
        animateMirrorSwap(state5.currentEq, flipped, () => {
          state5.currentEq = flipped;
          state5.goalReached = true;
          pushHistory({
            equation: clone(flipped),
            ruleName: "Regola dello specchio (scambio membri)",
            rulePrinciple: "Propriet\xE0 simmetrica dell'uguaglianza: se A = B allora B = A.",
            ruleId: "swapSides",
            steps: ["Scambio i due membri per la propriet\xE0 simmetrica."],
            conditions: state5.conditions.slice(),
            explanationKey: "scambioMembri",
            note: null,
            verified: true
          }, false);
          updateObjective();
          renderEquationView();
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata con successo!`, "success");
          showAutoMode();
        });
      }, 450);
      return;
    }
    if (sug.action.ruleKey === "swapSides") {
      animateMirrorSwap(state5.currentEq, nextEq, () => {
        state5.currentEq = nextEq;
        state5.goalReached = isGoalReached(state5.currentEq, state5.targetVar);
        updateObjective();
        renderEquationView();
        showRulePanel(rule, res, state5.currentEq);
        animateOperationBadge(sug.action.label, sug.action.operandText);
        clearMessage();
        if (state5.goalReached) {
          if (checkAndAnimateCompoundFraction()) return;
          playSuccessChime();
          spawnVictoryConfetti();
          showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata con successo! Regola: ${rule.name}`, "success");
        } else {
          showMessage(`\u2713 ${sug.action.label}: ${sug.reason || rule.principle}`, "success");
        }
        showAutoMode();
      });
      return;
    }
    state5.currentEq = nextEq;
    state5.goalReached = isGoalReached(state5.currentEq, state5.targetVar);
    updateObjective();
    renderEquationView();
    showRulePanel(rule, res, state5.currentEq);
    animateOperationBadge(sug.action.label, sug.action.operandText);
    clearMessage();
    if (state5.goalReached) {
      if (checkAndAnimateCompoundFraction()) return;
      playSuccessChime();
      spawnVictoryConfetti();
      showMessage(`\u{1F389} Ottimo! La grandezza ${prettyVar(state5.targetVar)} \xE8 isolata con successo! Regola: ${rule.name}`, "success");
    } else {
      showMessage(`\u2713 ${sug.action.label}: ${sug.reason || rule.principle}`, "success");
    }
    showAutoMode();
  }
  function showAutoMode() {
    if (!state5.currentEq) return;
    const card = dom5.equationDisplay ? dom5.equationDisplay.closest(".equation-display-card") : null;
    if (card) card.classList.add("is-auto-mode");
    const hintBadge = document.querySelector(".drag-hint-badge");
    const hintText = document.querySelector(".drag-hint-text");
    if (hintBadge && hintText) {
      hintBadge.textContent = "\u26A1 Modalit\xE0 Automatica";
      hintText.innerHTML = "<strong>Fai clic ovunque con il mouse</strong> (sull'equazione o sul pulsante in basso) per eseguire il passaggio successivo!";
    }
    if (state5.goalReached) {
      if (dom5.actionHint) dom5.actionHint.textContent = "Modalit\xE0 Automatica:";
      if (dom5.actionButtons) {
        dom5.actionButtons.innerHTML = `
        <div class="auto-mode-finished">
          <div class="auto-success-header">\u{1F389} Formula isolata con successo!</div>
          <p>La grandezza <strong>${prettyVar(state5.targetVar)}</strong> \xE8 stata completamente isolata. Puoi cambiare la grandezza da isolare in alto o selezionare un'altra formula dalla libreria.</p>
        </div>
      `;
      }
      return;
    }
    const sug = suggestNextStep(state5.currentEq, state5.targetVar);
    const roadmap = computeRoadmap(state5.currentEq, state5.targetVar);
    if (dom5.actionHint) {
      dom5.actionHint.textContent = `Modalit\xE0 Automatica \u2014 A ogni clic del mouse il programma esegue un'operazione (${roadmap.length} passaggi stimati):`;
    }
    if (!dom5.actionButtons) return;
    dom5.actionButtons.innerHTML = "";
    if (!sug.found) {
      dom5.actionButtons.innerHTML = `<p class="placeholder small">${escapeHtml5(sug.message || "Nessuna sequenza automatica diretta trovata per questa formula.")}</p>`;
      return;
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "action-btn auto-step-btn";
    nextBtn.type = "button";
    nextBtn.innerHTML = `
    <span class="action-label">\u{1F5B1}\uFE0F Fai clic per eseguire: ${escapeHtml5(sug.action.label)}</span>
    <span class="action-desc"><strong>Giustificazione della regola:</strong> ${escapeHtml5(sug.reason || sug.action.description || "")}</span>
  `;
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      executeNextAutoStep();
    });
    dom5.actionButtons.appendChild(nextBtn);
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
              <strong>${escapeHtml5(s.action.label)}</strong>
              <p>${escapeHtml5(s.reason || s.action.description || "")}</p>
            </div>
          </li>
        `).join("")}
      </ol>
    `;
      dom5.actionButtons.appendChild(roadmapCard);
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
    if (!state5.currentEq) return;
    if (state5.goalReached) {
      showMessage("Obiettivo gi\xE0 raggiunto! La grandezza " + prettyVar(state5.targetVar) + " \xE8 gi\xE0 isolata.", "success");
      return;
    }
    const sug = suggestNextStep(state5.currentEq, state5.targetVar);
    if (!sug.found) {
      showMessage(sug.message || "Nessun suggerimento disponibile per questo stato.", "info");
      return;
    }
    previewAction(sug.action);
    showMessage("\u{1F4A1} Passo consigliato: " + sug.reason, "info");
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
      const actx = _audioCtx();
      if (!actx) return;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, actx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 0.28);
      gain.gain.setValueAtTime(1e-4, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, actx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(actx.currentTime);
      osc.stop(actx.currentTime + 0.35);
    } catch {
    }
  }
  function playSoundFraction() {
    try {
      const actx = _audioCtx();
      if (!actx) return;
      [[440, 0, 0.15], [880, 0.02, 0.12]].forEach(([freq, delay, dur]) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.14, actx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + delay + dur);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + delay);
        osc.stop(actx.currentTime + delay + dur);
      });
    } catch {
    }
  }
  function playSoundInvalid() {
    try {
      const actx = _audioCtx();
      if (!actx) return;
      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const gain = actx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(200, actx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.35);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(213, actx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(64, actx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.18, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + 0.38);
      [osc1, osc2].forEach((o) => {
        o.connect(gain);
        o.start(actx.currentTime);
        o.stop(actx.currentTime + 0.4);
      });
      gain.connect(actx.destination);
    } catch {
    }
  }
  function playSoundClick() {
    try {
      const actx = _audioCtx();
      if (!actx) return;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, actx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(actx.currentTime);
      osc.stop(actx.currentTime + 0.08);
    } catch {
    }
  }
  function playSoundExplosion() {
    try {
      const actx = _audioCtx();
      if (!actx) return;
      const sr = actx.sampleRate;
      const dur = 0.55;
      const buf = actx.createBuffer(1, sr * dur, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = actx.createBufferSource();
      noise.buffer = buf;
      const filt = actx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(1200, actx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.45);
      const noiseGain = actx.createGain();
      noiseGain.gain.setValueAtTime(0.55, actx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + 0.5);
      noise.connect(filt);
      filt.connect(noiseGain);
      noiseGain.connect(actx.destination);
      noise.start(actx.currentTime);
      noise.stop(actx.currentTime + dur);
      const sub = actx.createOscillator();
      const subGain = actx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(140, actx.currentTime);
      sub.frequency.exponentialRampToValueAtTime(32, actx.currentTime + 0.4);
      subGain.gain.setValueAtTime(0.5, actx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + 0.45);
      sub.connect(subGain);
      subGain.connect(actx.destination);
      sub.start(actx.currentTime);
      sub.stop(actx.currentTime + 0.48);
      const click = actx.createOscillator();
      const clickGain = actx.createGain();
      click.type = "triangle";
      click.frequency.setValueAtTime(1800, actx.currentTime);
      click.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.035);
      clickGain.gain.setValueAtTime(0.4, actx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + 0.04);
      click.connect(clickGain);
      clickGain.connect(actx.destination);
      click.start(actx.currentTime);
      click.stop(actx.currentTime + 0.05);
    } catch {
    }
  }
  var _FIRST_PRINCIPLE = /* @__PURE__ */ new Set(["moveTerm", "addBoth", "subBoth", "swapSides"]);
  function playSoundForRule(ruleKey) {
    if (_FIRST_PRINCIPLE.has(ruleKey)) playSoundTransport();
    else playSoundFraction();
  }
  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const actx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, actx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(1e-4, actx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + idx * 0.1);
        osc.stop(actx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {
    }
  }
  function bindWorkAreaEvents() {
    const eqCard = dom5.equationDisplay ? dom5.equationDisplay.closest(".equation-display-card") : null;
    if (eqCard) {
      eqCard.addEventListener("click", (e) => {
        if (state5.mode !== "auto") return;
        if (e.target.closest(".cross-layer, .didactic-bubble-anchor, .btn-mini, .close-btn, button")) return;
        executeNextAutoStep();
      });
    }
    dom5.equationDisplay.addEventListener("click", (e) => {
      if (state5.mode === "auto") {
        executeNextAutoStep();
        return;
      }
      if (e.target === dom5.equationDisplay) clearSelection();
    });
    dom5.btnConfirm.addEventListener("click", confirmMove);
    dom5.btnCancel.addEventListener("click", cancelPreview);
    if (dom5.btnCopyLatexInline) dom5.btnCopyLatexInline.addEventListener("click", copyLatexFormula);
    if (dom5.btnQuickHint) dom5.btnQuickHint.addEventListener("click", triggerQuickHint);
    if (dom5.btnRetryExercise) dom5.btnRetryExercise.addEventListener("click", retryCurrentExercise);
    if (dom5.completionRetry) dom5.btnCompletionRetry.addEventListener("click", retryCurrentExercise);
    if (dom5.btnCompletionNext) {
      dom5.btnCompletionNext.addEventListener("click", () => {
        playSoundClick();
        if (state5.mode === "quiz" && state5.quizManager) {
          state5.quizManager.startNewQuizExercise();
        } else {
          const { id, target } = randomExercise();
          loadFormula(getFormulaById(id), target);
        }
      });
    }
    if (dom5.btnCalcSample) {
      dom5.btnCalcSample.addEventListener("click", () => {
        playSoundClick();
        const solvedExpr = getSolvedExpression();
        if (!solvedExpr) return;
        const freeVars = Array.from(collectVars(solvedExpr)).filter(
          (v) => v !== state5.targetVar && v !== "pi" && v !== "\u03C0" && v !== "e" && v !== "\xB1"
        );
        populateCalculatorSamples(freeVars, solvedExpr);
      });
    }
    if (dom5.btnCalcReset) {
      dom5.btnCalcReset.addEventListener("click", () => {
        playSoundClick();
        const solvedExpr = getSolvedExpression();
        if (!solvedExpr) return;
        resetCalculatorInputs(solvedExpr);
      });
    }
    if (dom5.btnCopyCalcResult) {
      dom5.btnCopyCalcResult.addEventListener("click", copyCalculatorResult);
    }
  }
  function bindGlobalEvents() {
    dom5.btnHelp.addEventListener("click", showHelp);
    dom5.btnContrast.addEventListener("click", toggleContrast);
    if (dom5.btnTheme) dom5.btnTheme.addEventListener("click", toggleTheme);
    if (dom5.btnLimMode) {
      dom5.btnLimMode.addEventListener("click", () => {
        const isLim = document.body.classList.toggle("lim-mode");
        if (dom5.equationDisplay) dom5.equationDisplay.classList.toggle("lim-mode", isLim);
        dom5.btnLimMode.setAttribute("aria-pressed", isLim ? "true" : "false");
        dom5.btnLimMode.classList.toggle("active", isLim);
        announceMathLive(isLim ? "Modalit\xE0 Lavagna Interattiva LIM attivata: calibrazione stilo e zone di tocco estese abilitate" : "Modalit\xE0 LIM disattivata");
      });
    }
    if (dom5.btnSpeakEquation) {
      dom5.btnSpeakEquation.addEventListener("click", () => {
        if (!state5.currentEq) {
          announceMathLive("Nessuna equazione caricata da leggere");
          return;
        }
        const text = verbalizeEquation(state5.currentEq);
        announceMathLive(`Lettura formula: ${text}`);
        dom5.btnSpeakEquation.setAttribute("aria-pressed", "true");
        speakMath(text, () => {
          if (dom5.btnSpeakEquation) dom5.btnSpeakEquation.setAttribute("aria-pressed", "false");
        });
      });
    }
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.close).hidden = true;
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (dom5.quizCompletionModalBackdrop && !dom5.quizCompletionModalBackdrop.hidden) {
          dom5.quizCompletionModalBackdrop.hidden = true;
          return;
        }
        if (dom5.quizDashboardBackdrop && !dom5.quizDashboardBackdrop.hidden) {
          dom5.quizDashboardBackdrop.hidden = true;
          return;
        }
        if (dom5.worksheetModalBackdrop && !dom5.worksheetModalBackdrop.hidden) {
          dom5.worksheetModalBackdrop.hidden = true;
          return;
        }
        if (!dom5.modalBackdrop.hidden) {
          dom5.modalBackdrop.hidden = true;
          return;
        }
        if (state5.pendingMove) cancelPreview();
        else if (state5.clickDragToken) exitClickDragMode();
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
    dom5.btnContrast.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      document.documentElement.setAttribute("data-contrast", "high");
      announceMathLive("Modalit\xE0 Alto Contrasto WCAG AAA attivata");
    } else {
      document.documentElement.removeAttribute("data-contrast");
      announceMathLive("Modalit\xE0 Alto Contrasto disattivata");
    }
  }
  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    try {
      localStorage.setItem("formuleInverse.theme", isDark ? "dark" : "light");
    } catch (e) {
    }
    if (dom5.btnTheme) {
      dom5.btnTheme.textContent = isDark ? "\u2600\uFE0F Modalit\xE0 chiara" : "\u{1F319} Modalit\xE0 scura";
    }
  }
  function initTheme() {
    try {
      const saved = localStorage.getItem("formuleInverse.theme");
      if (saved === "dark" || !saved && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark-theme");
        if (dom5.btnTheme) dom5.btnTheme.textContent = "\u2600\uFE0F Modalit\xE0 chiara";
      }
    } catch (e) {
    }
  }
  function escapeHtml5(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
