// physics-units.js — Catalogo delle grandezze fisiche del Sistema Internazionale (SI),
// con unità di misura, denominazioni didattiche e valori numerici realistici di esempio.

import { prettyVar } from './render.js';

export const PHYSICAL_QUANTITIES = {
  // --- Cinematica e Geometria ---
  s: { name: 'Spazio / Distanza percorsa', unit: 'm', sample: 100 },
  s0: { name: 'Posizione iniziale', unit: 'm', sample: 0 },
  x: { name: 'Posizione / Coordinata', unit: 'm', sample: 50 },
  x0: { name: 'Posizione iniziale', unit: 'm', sample: 0 },
  y: { name: 'Altezza / Ordinata', unit: 'm', sample: 20 },
  y0: { name: 'Altezza iniziale', unit: 'm', sample: 0 },
  h: { name: 'Altezza', unit: 'm', sample: 25 },
  d: { name: 'Distanza / Spessore', unit: 'm', sample: 10 },
  r: { name: 'Raggio', unit: 'm', sample: 5 },
  R: { name: 'Raggio / Resistenza', unit: 'm', sample: 10 }, // overridden by topic
  l: { name: 'Lunghezza', unit: 'm', sample: 2 },
  L: { name: 'Lunghezza / Lavoro', unit: 'm', sample: 4 },
  Delta_s: { name: 'Spostamento', unit: 'm', sample: 80 },
  Delta_x: { name: 'Spostamento', unit: 'm', sample: 60 },

  // --- Tempo ---
  t: { name: 'Tempo / Istante', unit: 's', sample: 4 },
  t0: { name: 'Istante iniziale', unit: 's', sample: 0 },
  Delta_t: { name: 'Intervallo di tempo', unit: 's', sample: 5 },
  T: { name: 'Periodo / Temperatura', unit: 's', sample: 2 },

  // --- Velocità e Accelerazione ---
  v: { name: 'Velocità', unit: 'm/s', sample: 20 },
  v0: { name: 'Velocità iniziale', unit: 'm/s', sample: 15 },
  v_f: { name: 'Velocità finale', unit: 'm/s', sample: 30 },
  v0x: { name: 'Componente orizzontale velocità', unit: 'm/s', sample: 12 },
  v0y: { name: 'Componente verticale velocità', unit: 'm/s', sample: 16 },
  vm: { name: 'Velocità media', unit: 'm/s', sample: 25 },
  a: { name: 'Accelerazione', unit: 'm/s²', sample: 2 },
  ac: { name: 'Accelerazione centripeta', unit: 'm/s²', sample: 4 },
  at: { name: 'Accelerazione tangenziale', unit: 'm/s²', sample: 1.5 },
  g: { name: 'Accelerazione di gravità', unit: 'm/s²', sample: 9.81 },

  // --- Dinamica e Forze ---
  m: { name: 'Massa', unit: 'kg', sample: 5 },
  M: { name: 'Massa maggiore', unit: 'kg', sample: 50 },
  m1: { name: 'Massa 1', unit: 'kg', sample: 2 },
  m2: { name: 'Massa 2', unit: 'kg', sample: 8 },
  F: { name: 'Forza', unit: 'N', sample: 40 },
  Fp: { name: 'Forza peso', unit: 'N', sample: 49.05 },
  Fe: { name: 'Forza elastica', unit: 'N', sample: 30 },
  Fa: { name: 'Forza di attrito', unit: 'N', sample: 10 },
  Fc: { name: 'Forza centripeta', unit: 'N', sample: 25 },
  k: { name: 'Costante elastica', unit: 'N/m', sample: 250 },
  mu: { name: 'Coefficiente di attrito', unit: 'adimensionale', sample: 0.25 },
  p: { name: 'Pressione / Quantità di moto', unit: 'Pa', sample: 101325 },

  // --- Lavoro, Energia, Potenza ---
  E: { name: 'Energia totale', unit: 'J', sample: 600 },
  Ek: { name: 'Energia cinetica', unit: 'J', sample: 400 },
  Ep: { name: 'Energia potenziale', unit: 'J', sample: 200 },
  U: { name: 'Energia potenziale / interna', unit: 'J', sample: 350 },
  W: { name: 'Lavoro', unit: 'J', sample: 240 },
  Q: { name: 'Calore / Carica', unit: 'J', sample: 1200 },
  P: { name: 'Potenza', unit: 'W', sample: 1500 },

  // --- Termodinamica e Fluidi ---
  V: { name: 'Volume / Tensione', unit: 'm³', sample: 0.05 },
  rho: { name: 'Densità', unit: 'kg/m³', sample: 1000 },
  c: { name: 'Calore specifico', unit: 'J/(kg·K)', sample: 4186 },
  cs: { name: 'Calore specifico', unit: 'J/(kg·K)', sample: 900 },
  lambda: { name: 'Calore latente / Lunghezza d\'onda', unit: 'J/kg', sample: 333500 },
  lam: { name: 'Lunghezza d\'onda', unit: 'm', sample: 0.02 },
  n: { name: 'Numero di moli', unit: 'mol', sample: 2 },
  Delta_T: { name: 'Variazione di temperatura', unit: 'K', sample: 15 },

  // --- Onde, Suono e Acustica ---
  f: { name: 'Frequenza', unit: 'Hz', sample: 440 },
  fp: { name: 'Frequenza percepita (Doppler)', unit: 'Hz', sample: 480 },
  vs: { name: 'Velocità della sorgente sonora', unit: 'm/s', sample: 25 },
  vo: { name: "Velocità dell'osservatore", unit: 'm/s', sample: 15 },
  fb: { name: 'Frequenza di battimento', unit: 'Hz', sample: 4 },
  f1: { name: 'Frequenza sorgente 1', unit: 'Hz', sample: 440 },
  f2: { name: 'Frequenza sorgente 2', unit: 'Hz', sample: 444 },
  omega: { name: 'Velocità angolare', unit: 'rad/s', sample: 6.28 },
  theta: { name: 'Angolo', unit: 'rad', sample: 0.5236 },
  alpha: { name: 'Accelerazione angolare / Angolo', unit: 'rad/s²', sample: 1.5 },
  phi: { name: 'Fase / Angolo', unit: 'rad', sample: 0 },

  // --- Elettromagnetismo ---
  I: { name: 'Intensità di corrente', unit: 'A', sample: 2.5 },
  i: { name: 'Intensità di corrente', unit: 'A', sample: 1.2 },
  q: { name: 'Carica elettrica', unit: 'C', sample: 0.005 },
  q1: { name: 'Carica 1', unit: 'C', sample: 0.002 },
  q2: { name: 'Carica 2', unit: 'C', sample: 0.004 },
  B: { name: 'Induzione magnetica (campo B)', unit: 'T', sample: 0.5 },
  C: { name: 'Capacità elettrica', unit: 'F', sample: 0.0001 },
  Delta_V: { name: 'Differenza di potenziale', unit: 'V', sample: 12 },
  Req: { name: 'Resistenza equivalente', unit: 'Ω', sample: 20 },
  R_eq: { name: 'Resistenza equivalente', unit: 'Ω', sample: 20 },
  R1: { name: 'Resistenza 1', unit: 'Ω', sample: 30 },
  R_1: { name: 'Resistenza 1', unit: 'Ω', sample: 30 },
  R2: { name: 'Resistenza 2', unit: 'Ω', sample: 60 },
  R_2: { name: 'Resistenza 2', unit: 'Ω', sample: 60 },
  Ceq: { name: 'Capacità equivalente', unit: 'F', sample: 0.00005 },
  C_eq: { name: 'Capacità equivalente', unit: 'F', sample: 0.00005 },
  C1: { name: 'Capacità 1', unit: 'F', sample: 0.0001 },
  C_1: { name: 'Capacità 1', unit: 'F', sample: 0.0001 },
  C2: { name: 'Capacità 2', unit: 'F', sample: 0.0001 },
  C_2: { name: 'Capacità 2', unit: 'F', sample: 0.0001 },
};

/**
 * Risolve la denominazione e l'unità di misura in base al simbolo e al contesto della formula.
 */
export function getQuantityInfo(symbol, formulaEntry = null) {
  const topic = (formulaEntry && formulaEntry.topic) ? formulaEntry.topic.toLowerCase() : '';
  const formulaId = (formulaEntry && formulaEntry.id) ? formulaEntry.id.toLowerCase() : '';

  // Context-specific overrides
  if (['R', 'Req', 'R_eq', 'R1', 'R_1', 'R2', 'R_2'].includes(symbol)) {
    if (topic.includes('elettricita') || topic.includes('circuito') || topic.includes('elettromagnetismo') || formulaId.includes('ohm') || formulaId.includes('resistor')) {
      return { name: 'Resistenza elettrica', unit: 'Ω', sample: 10 };
    }
  }

  if (['C', 'Ceq', 'C_eq', 'C1', 'C_1', 'C2', 'C_2'].includes(symbol)) {
    if (topic.includes('elettricita') || topic.includes('circuito') || topic.includes('condensator')) {
      return { name: 'Capacità elettrica', unit: 'F', sample: 0.0001 };
    }
  }

  if (symbol === 'V' || symbol === 'Delta_V') {
    if (topic.includes('elettricita') || topic.includes('circuito') || topic.includes('elettromagnetismo') || formulaId.includes('ohm')) {
      return { name: 'Differenza di potenziale (tensione)', unit: 'V', sample: 12 };
    }
    if (topic.includes('termo') || topic.includes('fluid') || formulaId.includes('gas') || formulaId.includes('boyle')) {
      return { name: 'Volume', unit: 'm³', sample: 0.04 };
    }
  }

  if (symbol === 'T') {
    if (topic.includes('termo') || formulaId.includes('gas') || formulaId.includes('calor')) {
      return { name: 'Temperatura assoluta', unit: 'K', sample: 300 };
    }
    return { name: 'Periodo di oscillazione', unit: 's', sample: 2 };
  }

  if (symbol === 'Q') {
    if (topic.includes('elettr') || formulaId.includes('coulomb') || formulaId.includes('condensatore')) {
      return { name: 'Carica elettrica', unit: 'C', sample: 0.02 };
    }
    return { name: 'Quantità di calore', unit: 'J', sample: 1000 };
  }

  if (symbol === 'p') {
    if (formulaId.includes('quantita-di-moto') || topic.includes('urti')) {
      return { name: 'Quantità di moto', unit: 'kg·m/s', sample: 25 };
    }
    return { name: 'Pressione', unit: 'Pa', sample: 101325 };
  }

  if (symbol === 'k') {
    if (topic.includes('elettr') || formulaId.includes('coulomb')) {
      return { name: 'Costante di Coulomb', unit: 'N·m²/C²', sample: 8.99e9 };
    }
    return { name: 'Costante elastica', unit: 'N/m', sample: 200 };
  }

  if (symbol === 'I') {
    if (topic.includes('suono') || topic.includes('onde') || topic.includes('acust')) {
      return { name: 'Intensità sonora', unit: 'W/m²', sample: 0.001 };
    }
  }

  if (PHYSICAL_QUANTITIES[symbol]) {
    return { ...PHYSICAL_QUANTITIES[symbol] };
  }

  // Fallback didattico
  return {
    name: `Grandezza ${prettyVar(symbol)}`,
    unit: 'u.m.',
    sample: 5,
  };
}

/**
 * Formatta un numero reale per l'output didattico:
 * - Se intero: stampa intero (es. 42)
 * - Se decimale finito: massimo 4 cifre significative
 * - Se molto grande (>= 1e5) o molto piccolo (< 0.001): notazione scientifica
 */
export function formatResultNumber(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (Math.abs(val) === 0) return '0';

  const absVal = Math.abs(val);

  if (absVal >= 1e5 || absVal < 0.001) {
    return val.toExponential(3).replace('e+', ' × 10^').replace('e-', ' × 10^-');
  }

  // Intero
  if (Number.isInteger(val)) {
    return String(val);
  }

  // Decimale con arrotondamento fino a 4 cifre
  const rounded = parseFloat(val.toFixed(4));
  return String(rounded);
}
