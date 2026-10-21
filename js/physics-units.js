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
  F1: { name: 'Forza 1', unit: 'N', sample: 20 },
  F2: { name: 'Forza 2', unit: 'N', sample: 40 },
  fs: { name: 'Forza di attrito statico massimo', unit: 'N', sample: 15 },
  k: { name: 'Costante elastica', unit: 'N/m', sample: 250 },
  mu: { name: 'Coefficiente di attrito', unit: 'adimensionale', sample: 0.25 },
  p: { name: 'Pressione / Quantità di moto', unit: 'Pa', sample: 101325 },
  p0: { name: 'Pressione atmosferica iniziale', unit: 'Pa', sample: 101325 },
  p1: { name: 'Pressione stato 1', unit: 'Pa', sample: 100000 },
  p2: { name: 'Pressione stato 2', unit: 'Pa', sample: 200000 },
  G: { name: 'Costante di gravitazione universale', unit: 'N·m²/kg²', sample: 6.674e-11 },

  // --- Lavoro, Energia, Potenza ---
  E: { name: 'Energia totale', unit: 'J', sample: 600 },
  Ec: { name: 'Energia cinetica', unit: 'J', sample: 400 },
  E_c: { name: 'Energia cinetica', unit: 'J', sample: 400 },
  Ek: { name: 'Energia cinetica', unit: 'J', sample: 400 },
  E_k: { name: 'Energia cinetica', unit: 'J', sample: 400 },
  Ep: { name: 'Energia potenziale', unit: 'J', sample: 200 },
  E_p: { name: 'Energia potenziale', unit: 'J', sample: 200 },
  Em: { name: 'Energia meccanica', unit: 'J', sample: 600 },
  E_m: { name: 'Energia meccanica', unit: 'J', sample: 600 },
  Ec1: { name: 'Energia cinetica iniziale', unit: 'J', sample: 300 },
  E_c1: { name: 'Energia cinetica iniziale', unit: 'J', sample: 300 },
  Ec2: { name: 'Energia cinetica finale', unit: 'J', sample: 500 },
  E_c2: { name: 'Energia cinetica finale', unit: 'J', sample: 500 },
  Ep1: { name: 'Energia potenziale iniziale', unit: 'J', sample: 200 },
  E_p1: { name: 'Energia potenziale iniziale', unit: 'J', sample: 200 },
  Ep2: { name: 'Energia potenziale finale', unit: 'J', sample: 100 },
  E_p2: { name: 'Energia potenziale finale', unit: 'J', sample: 100 },
  E0: { name: 'Energia a riposo', unit: 'J', sample: 9e16 },
  E_0: { name: 'Energia a riposo', unit: 'J', sample: 9e16 },
  E1: { name: 'Energia stato fondamentale (Bohr)', unit: 'J', sample: 2.18e-18 },
  E_1: { name: 'Energia stato fondamentale (Bohr)', unit: 'J', sample: 2.18e-18 },
  En: { name: 'Livello energetico (Bohr)', unit: 'J', sample: 5.45e-19 },
  E_n: { name: 'Livello energetico (Bohr)', unit: 'J', sample: 5.45e-19 },
  U: { name: 'Energia potenziale / interna', unit: 'J', sample: 350 },
  Uel: { name: 'Energia potenziale elastica', unit: 'J', sample: 150 },
  U_el: { name: 'Energia potenziale elastica', unit: 'J', sample: 150 },
  Ug: { name: 'Energia potenziale gravitazionale', unit: 'J', sample: 250 },
  U_g: { name: 'Energia potenziale gravitazionale', unit: 'J', sample: 250 },
  dU: { name: 'Variazione di energia interna', unit: 'J', sample: 500 },
  Delta_U: { name: 'Variazione di energia interna', unit: 'J', sample: 500 },
  Delta_E: { name: 'Variazione di energia', unit: 'J', sample: 300 },
  Delta_Ec: { name: 'Variazione di energia cinetica', unit: 'J', sample: 250 },
  Delta_Ep: { name: 'Variazione di energia potenziale', unit: 'J', sample: 250 },
  W: { name: 'Lavoro', unit: 'J', sample: 240 },
  W0: { name: 'Lavoro di estrazione', unit: 'J', sample: 3.2e-19 },
  W_0: { name: 'Lavoro di estrazione', unit: 'J', sample: 3.2e-19 },
  Lu: { name: 'Lavoro utile', unit: 'J', sample: 800 },
  Lt: { name: 'Lavoro totale assorbito', unit: 'J', sample: 1000 },
  Q: { name: 'Calore / Carica', unit: 'J', sample: 1200 },
  P: { name: 'Potenza', unit: 'W', sample: 1500 },
  u: { name: 'Densità di energia', unit: 'J/m³', sample: 0.05 },
  J: { name: 'Impulso della forza', unit: 'N·s', sample: 40 },

  // --- Geometria e Statica ---
  A: { name: 'Area / Superficie', unit: 'm²', sample: 1.5 },
  A1: { name: 'Area sezione 1', unit: 'm²', sample: 0.5 },
  A_1: { name: 'Area sezione 1', unit: 'm²', sample: 0.5 },
  A2: { name: 'Area sezione 2', unit: 'm²', sample: 2.0 },
  A_2: { name: 'Area sezione 2', unit: 'm²', sample: 2.0 },
  S: { name: 'Superficie / Sezione', unit: 'm²', sample: 2 },
  b: { name: 'Base', unit: 'm', sample: 4 },
  ip: { name: 'Ipotenusa', unit: 'm', sample: 5 },
  c1: { name: 'Cateto 1', unit: 'm', sample: 3 },
  c2: { name: 'Cateto 2', unit: 'm', sample: 4 },
  z: { name: 'Quota geodetica / Quota z', unit: 'm', sample: 10 },
  xcm: { name: 'Posizione centro di massa', unit: 'm', sample: 2 },
  x1: { name: 'Posizione corpo 1', unit: 'm', sample: 1 },
  x2: { name: 'Posizione corpo 2', unit: 'm', sample: 3 },
  r1: { name: 'Raggio 1', unit: 'm', sample: 2 },
  r2: { name: 'Raggio 2', unit: 'm', sample: 4 },
  rn: { name: 'Raggio orbita di Bohr', unit: 'm', sample: 5.29e-11 },
  Icm: { name: "Momento d'inerzia baricentrico", unit: 'kg·m²', sample: 0.5 },
  I1: { name: "Momento d'inerzia 1", unit: 'kg·m²', sample: 0.2 },
  I2: { name: "Momento d'inerzia 2", unit: 'kg·m²', sample: 0.8 },
  tau: { name: 'Momento torcente / Costante di tempo', unit: 'N·m', sample: 20 },
  v1: { name: 'Velocità 1', unit: 'm/s', sample: 10 },
  v_1: { name: 'Velocità 1', unit: 'm/s', sample: 10 },
  v2: { name: 'Velocità 2', unit: 'm/s', sample: 20 },
  v_2: { name: 'Velocità 2', unit: 'm/s', sample: 20 },
  u1: { name: 'Velocità relativistica 1', unit: 'm/s', sample: 1.5e8 },

  // --- Termodinamica e Fluidi ---
  V: { name: 'Volume / Tensione', unit: 'm³', sample: 0.05 },
  V0: { name: 'Volume iniziale', unit: 'm³', sample: 0.02 },
  V1: { name: 'Volume stato 1', unit: 'm³', sample: 0.02 },
  V2: { name: 'Volume stato 2', unit: 'm³', sample: 0.04 },
  V_imm: { name: 'Volume immerso', unit: 'm³', sample: 0.008 },
  V_tot: { name: 'Volume totale', unit: 'm³', sample: 0.01 },
  dV: { name: 'Variazione di volume', unit: 'm³', sample: 0.01 },
  rho: { name: 'Densità', unit: 'kg/m³', sample: 1000 },
  rho_corpo: { name: 'Densità del solido/corpo', unit: 'kg/m³', sample: 800 },
  rho_fluido: { name: 'Densità del fluido/liquido', unit: 'kg/m³', sample: 1000 },
  c: { name: 'Calore specifico', unit: 'J/(kg·K)', sample: 4186 },
  cs: { name: 'Calore specifico', unit: 'J/(kg·K)', sample: 900 },
  lambda: { name: 'Calore latente / Lunghezza d\'onda', unit: 'J/kg', sample: 333500 },
  lam: { name: 'Lunghezza d\'onda', unit: 'm', sample: 0.02 },
  dlam: { name: 'Spostamento Compton', unit: 'm', sample: 2.43e-12 },
  n: { name: 'Numero di moli', unit: 'mol', sample: 2 },
  Delta_T: { name: 'Variazione di temperatura', unit: 'K', sample: 15 },
  dT: { name: 'Variazione di temperatura', unit: 'K', sample: 15 },
  T0: { name: 'Temperatura iniziale', unit: 'K', sample: 273.15 },
  T1: { name: 'Temperatura stato 1', unit: 'K', sample: 300 },
  T2: { name: 'Temperatura stato 2', unit: 'K', sample: 350 },
  Te: { name: 'Temperatura di equilibrio termico', unit: 'K', sample: 310 },
  Tc: { name: 'Temperatura sorgente fredda', unit: 'K', sample: 290 },
  Th: { name: 'Temperatura sorgente calda', unit: 'K', sample: 450 },
  L0: { name: 'Lunghezza iniziale', unit: 'm', sample: 10 },
  l0: { name: 'Lunghezza iniziale', unit: 'm', sample: 10 },
  dl: { name: 'Allungamento / Variazione lunghezza', unit: 'm', sample: 0.005 },
  Delta_l: { name: 'Allungamento / Variazione lunghezza', unit: 'm', sample: 0.005 },
  Cp: { name: 'Calore molare a pressione costante', unit: 'J/(mol·K)', sample: 29.1 },
  Cv: { name: 'Calore molare a volume costante', unit: 'J/(mol·K)', sample: 20.8 },
  cost: { name: 'Costante di Bernoulli', unit: 'Pa', sample: 101325 },

  // --- Onde, Suono e Acustica ---
  f: { name: 'Frequenza', unit: 'Hz', sample: 440 },
  fp: { name: 'Frequenza percepita (Doppler)', unit: 'Hz', sample: 480 },
  vs: { name: 'Velocità della sorgente sonora', unit: 'm/s', sample: 25 },
  vo: { name: "Velocità dell'osservatore", unit: 'm/s', sample: 15 },
  fb: { name: 'Frequenza di battimento', unit: 'Hz', sample: 4 },
  f1: { name: 'Frequenza sorgente 1', unit: 'Hz', sample: 440 },
  f2: { name: 'Frequenza sorgente 2', unit: 'Hz', sample: 444 },
  f0: { name: 'Frequenza di risonanza', unit: 'Hz', sample: 1000 },
  nu: { name: 'Frequenza del fotone', unit: 'Hz', sample: 6e14 },
  omega: { name: 'Velocità angolare', unit: 'rad/s', sample: 6.28 },
  omega0: { name: 'Velocità angolare iniziale', unit: 'rad/s', sample: 0 },
  omega1: { name: 'Velocità angolare 1', unit: 'rad/s', sample: 3.14 },
  omega2: { name: 'Velocità angolare 2', unit: 'rad/s', sample: 6.28 },
  theta: { name: 'Angolo', unit: 'rad', sample: 0.5236 },
  theta0: { name: 'Angolo iniziale', unit: 'rad', sample: 0 },
  theta1: { name: 'Angolo di incidenza', unit: 'rad', sample: 0.5236 },
  theta2: { name: 'Angolo di rifrazione', unit: 'rad', sample: 0.3398 },
  thetaL: { name: 'Angolo limite', unit: 'rad', sample: 0.7297 },
  alpha: { name: 'Accelerazione angolare / Angolo', unit: 'rad/s²', sample: 1.5 },
  phi: { name: 'Fase / Angolo', unit: 'rad', sample: 0 },

  // --- Ottica e Relatività ---
  n1: { name: 'Indice di rifrazione mezzo 1', unit: 'adimensionale', sample: 1.0 },
  n2: { name: 'Indice di rifrazione mezzo 2', unit: 'adimensionale', sample: 1.5 },
  gamma: { name: 'Fattore di Lorentz', unit: 'adimensionale', sample: 1.25 },
  dt: { name: 'Tempo relativistico / intervallo', unit: 's', sample: 5 },
  dt0: { name: 'Tempo proprio', unit: 's', sample: 4 },

  // --- Elettromagnetismo ---
  I: { name: 'Intensità di corrente', unit: 'A', sample: 2.5 },
  i: { name: 'Intensità di corrente', unit: 'A', sample: 1.2 },
  Ieff: { name: 'Corrente efficace alternata', unit: 'A', sample: 5 },
  Id: { name: 'Corrente di spostamento', unit: 'A', sample: 0.05 },
  q: { name: 'Carica elettrica', unit: 'C', sample: 0.005 },
  q1: { name: 'Carica 1', unit: 'C', sample: 0.002 },
  q2: { name: 'Carica 2', unit: 'C', sample: 0.004 },
  B: { name: 'Induzione magnetica (campo B)', unit: 'T', sample: 0.5 },
  Phi: { name: 'Flusso del campo elettrico', unit: 'N·m²/C', sample: 50 },
  PhiE: { name: 'Flusso del campo elettrico', unit: 'N·m²/C', sample: 50 },
  PhiB: { name: 'Flusso del campo magnetico', unit: 'Wb', sample: 0.02 },
  fem: { name: 'Forza elettromotrice (f.e.m.)', unit: 'V', sample: 12 },
  C: { name: 'Capacità elettrica', unit: 'F', sample: 0.0001 },
  Delta_V: { name: 'Differenza di potenziale', unit: 'V', sample: 12 },
  Veff: { name: 'Tensione efficace alternata', unit: 'V', sample: 230 },
  Vmax: { name: 'Tensione di picco / massima', unit: 'V', sample: 325 },
  Req: { name: 'Resistenza equivalente', unit: 'Ω', sample: 20 },
  R_eq: { name: 'Resistenza equivalente', unit: 'Ω', sample: 20 },
  R1: { name: 'Resistenza 1', unit: 'Ω', sample: 30 },
  R_1: { name: 'Resistenza 1', unit: 'Ω', sample: 30 },
  R2: { name: 'Resistenza 2', unit: 'Ω', sample: 60 },
  R_2: { name: 'Resistenza 2', unit: 'Ω', sample: 60 },
  XL: { name: 'Reattanza induttiva', unit: 'Ω', sample: 50 },
  XC: { name: 'Reattanza capacitiva', unit: 'Ω', sample: 30 },
  Z: { name: 'Impedenza circuito RLC', unit: 'Ω', sample: 60 },
  Ceq: { name: 'Capacità equivalente', unit: 'F', sample: 0.00005 },
  C_eq: { name: 'Capacità equivalente', unit: 'F', sample: 0.00005 },
  C1: { name: 'Capacità 1', unit: 'F', sample: 0.0001 },
  C_1: { name: 'Capacità 1', unit: 'F', sample: 0.0001 },
  C2: { name: 'Capacità 2', unit: 'F', sample: 0.0001 },
  C_2: { name: 'Capacità 2', unit: 'F', sample: 0.0001 },
  eps0: { name: 'Costante dielettrica del vuoto', unit: 'F/m', sample: 8.854e-12 },
  eps: { name: 'Costante dielettrica', unit: 'F/m', sample: 1.77e-11 },
  mu0: { name: 'Permeabilità magnetica del vuoto', unit: 'T·m/A', sample: 1.256e-6 },
  rho0: { name: 'Resistività a 0°C', unit: 'Ω·m', sample: 1.68e-8 },
};

/**
 * Risolve la denominazione e l'unità di misura in base al simbolo e al contesto della formula.
 */
export function getQuantityInfo(symbol, formulaEntry = null) {
  if (symbol === '±') {
    return { name: 'Segno ±', unit: '', sample: 1 };
  }

  const topic = (formulaEntry && formulaEntry.topic) ? formulaEntry.topic.toLowerCase() : '';
  const formulaId = (formulaEntry && formulaEntry.id) ? formulaEntry.id.toLowerCase() : '';

  // Context-specific overrides
  if (symbol === 'N') {
    if (formulaId.includes('solenoide') || topic.includes('elettr') || topic.includes('magnet')) {
      return { name: 'Numero di spire', unit: 'spire', sample: 500 };
    }
    return { name: 'Reazione normale vincolare', unit: 'N', sample: 49.05 };
  }

  if (symbol === 'eta') {
    if (formulaId.includes('poiseuille') || topic.includes('fluid')) {
      return { name: 'Viscosità dinamica', unit: 'Pa·s', sample: 0.001 };
    }
    return { name: 'Rendimento', unit: 'adimensionale', sample: 0.4 };
  }

  if (symbol === 'tau') {
    if (formulaId.includes('rc') || formulaId.includes('rl') || topic.includes('elettr')) {
      return { name: 'Costante di tempo', unit: 's', sample: 0.002 };
    }
    return { name: 'Momento torcente (coppia)', unit: 'N·m', sample: 20 };
  }

  if (symbol === 'c1' || symbol === 'c2') {
    if (formulaId.includes('termico') || topic.includes('termo')) {
      return { name: symbol === 'c1' ? 'Calore specifico sostanza 1' : 'Calore specifico sostanza 2', unit: 'J/(kg·K)', sample: 4186 };
    }
    return { name: symbol === 'c1' ? 'Cateto 1' : 'Cateto 2', unit: 'm', sample: symbol === 'c1' ? 3 : 4 };
  }

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

  // Ricerca esatta nel catalogo
  if (PHYSICAL_QUANTITIES[symbol]) {
    return { ...PHYSICAL_QUANTITIES[symbol] };
  }

  // Ricerca con normalizzazione dell'underscore (es. E_c -> Ec, v_1 -> v1)
  const normalized = symbol.replace(/_/g, '');
  if (PHYSICAL_QUANTITIES[normalized]) {
    return { ...PHYSICAL_QUANTITIES[normalized] };
  }

  // Riconoscimento intelligente dei prefissi Delta e d
  if (symbol.startsWith('Delta_') || symbol.startsWith('d')) {
    const baseSym = symbol.startsWith('Delta_') ? symbol.slice(6) : symbol.slice(1);
    if (PHYSICAL_QUANTITIES[baseSym]) {
      const baseInfo = PHYSICAL_QUANTITIES[baseSym];
      return {
        name: `Variazione di ${baseInfo.name.toLowerCase()}`,
        unit: baseInfo.unit,
        sample: baseInfo.sample !== undefined ? Math.max(1, Math.round(baseInfo.sample * 0.2)) : 5,
      };
    }
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
