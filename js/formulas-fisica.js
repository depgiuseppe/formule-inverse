// formulas-fisica.js — Voci aggiuntive: Formulario completo di Fisica (quinquennio).
//
// Stesso formato di formulas.js. Le variabili usano la sintassi dell'editor:
// lettere/cifre/'_', operatori + - * / ^, funzione sqrt(...).
// Nomi greci mappati: lam (λ), rho (ρ), mu (μ), theta (θ), omega (ω),
// alpha (α), eps / eps0 (ε, ε0), eta (η), nu (ν), phi (φ), gamma (γ), tau (τ).

export const FORMULAS_FISICA = [
  // ============================ CINEMATICA ============================
  {
    id: 'x-legge-oraria-mru', topic: 'cinematica', name: 'legge oraria (moto uniforme)',
    formula: 'x = x0 + v*t', isolate: ['x', 'x0', 'v', 't'], difficulty: 2,
    conditions: [],
    hypotheses: 'Moto rettilineo uniforme (velocità costante).',
  },
  {
    id: 's-vt-half-at2', topic: 'cinematica', name: 'legge oraria (moto accelerato)',
    formula: 'x = x0 + v0*t + 1/2*a*t^2', isolate: ['x', 'x0', 'v0', 'a', 't'], difficulty: 4,
    conditions: [],
    hypotheses: 'Moto rettilineo uniformemente accelerato.',
  },
  {
    id: 'v-quadrata', topic: 'cinematica', name: 'relazione spazio-velocità (senza tempo)',
    formula: 'v^2 = v0^2 + 2*a*s', isolate: ['v', 'v0', 'a', 's'], difficulty: 4,
    conditions: [],
    notes: 'Per isolare v serve la radice quadrata e il segno ±.',
  },
  {
    id: 's-vmedia', topic: 'cinematica', name: 'spazio medio (velocità media)',
    formula: 's = (v0 + v)/2*t', isolate: ['s', 'v0', 'v', 't'], difficulty: 3,
    conditions: [],
    hypotheses: 'Accelerazione costante.',
  },
  {
    id: 'h-max-lancio', topic: 'cinematica', name: 'altezza massima (lancio verticale)',
    formula: 'h = v0^2/(2*g)', isolate: ['h', 'v0', 'g'], difficulty: 3,
    conditions: ['g ≠ 0'],
    hypotheses: 'Lancio verticale verso l\'alto, attrito dell\'aria trascurabile.',
  },
  {
    id: 't-salita', topic: 'cinematica', name: 'tempo di salita',
    formula: 't = v0/g', isolate: ['t', 'v0', 'g'], difficulty: 2,
    conditions: ['g ≠ 0'],
    hypotheses: 'Lancio verticale verso l\'alto.',
  },
  {
    id: 't-volo-vert', topic: 'cinematica', name: 'tempo di volo (da terra a terra)',
    formula: 't = (2*v0)/g', isolate: ['t', 'v0', 'g'], difficulty: 2,
    conditions: ['g ≠ 0'],
    hypotheses: 'Lancio verticale da terra e ritorno al suolo.',
  },
  {
    id: 't-volo-orizz', topic: 'cinematica', name: 'tempo di volo (lancio orizzontale)',
    formula: 't = sqrt((2*h)/g)', isolate: ['t', 'h', 'g'], difficulty: 3,
    conditions: ['h ≥ 0', 'g ≠ 0'],
    hypotheses: 'Lancio orizzontale da altezza h.',
  },
  {
    id: 'gittata-orizz', topic: 'cinematica', name: 'gittata (lancio orizzontale)',
    formula: 'x = v0*sqrt((2*h)/g)', isolate: ['x', 'v0', 'h', 'g'], difficulty: 4,
    conditions: ['h ≥ 0', 'g ≠ 0'],
  },
  {
    id: 'v0x', topic: 'cinematica', name: 'componente orizzontale della velocità iniziale',
    formula: 'v0x = v0*cos(theta)', isolate: ['v0x', 'v0', 'theta'], difficulty: 3,
    conditions: [],
    hypotheses: 'Lancio obliquo con angolo theta rispetto all\'orizzontale.',
  },
  {
    id: 'v0y', topic: 'cinematica', name: 'componente verticale della velocità iniziale',
    formula: 'v0y = v0*sin(theta)', isolate: ['v0y', 'v0', 'theta'], difficulty: 3,
    conditions: [],
    hypotheses: 'Lancio obliquo con angolo theta rispetto all\'orizzontale.',
  },
  {
    id: 't-salita-obliquo', topic: 'cinematica', name: 'tempo per l\'altezza massima (proiettile)',
    formula: 't = (v0*sin(theta))/g', isolate: ['t', 'v0', 'theta', 'g'], difficulty: 3,
    conditions: ['g ≠ 0'],
  },
  {
    id: 'ymax-obliquo', topic: 'cinematica', name: 'altezza massima (proiettile)',
    formula: 'y = (v0^2*sin(theta)^2)/(2*g)', isolate: ['y', 'v0', 'theta', 'g'], difficulty: 4,
    conditions: ['g ≠ 0'],
  },
  {
    id: 'gittata-proiettile', topic: 'cinematica', name: 'gittata (proiettile, piano orizzontale)',
    formula: 'R = (v0^2*sin(2*theta))/g', isolate: ['R', 'v0', 'theta', 'g'], difficulty: 4,
    conditions: ['g ≠ 0'],
    hypotheses: 'Lancio obliquo e ritorno alla stessa quota.',
  },
  {
    id: 'omega-mcu', topic: 'cinematica', name: 'velocità angolare (moto circolare uniforme)',
    formula: 'omega = (2*pi)/T', isolate: ['omega', 'T'], difficulty: 3,
    conditions: ['T ≠ 0'],
  },
  {
    id: 'omega-f', topic: 'cinematica', name: 'velocità angolare (dalla frequenza)',
    formula: 'omega = 2*pi*f', isolate: ['omega', 'f'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'v-omega-r', topic: 'cinematica', name: 'velocità tangenziale (moto circolare)',
    formula: 'v = omega*r', isolate: ['v', 'omega', 'r'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'ac-v2r', topic: 'cinematica', name: 'accelerazione centripeta',
    formula: 'ac = v^2/r', isolate: ['ac', 'v', 'r'], difficulty: 3,
    conditions: ['r ≠ 0'],
  },
  {
    id: 'ac-omega2r', topic: 'cinematica', name: 'accelerazione centripeta (velocità angolare)',
    formula: 'ac = omega^2*r', isolate: ['ac', 'omega', 'r'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'at-alpha-r', topic: 'cinematica', name: 'accelerazione tangenziale (moto circolare accelerato)',
    formula: 'at = alpha*r', isolate: ['at', 'alpha', 'r'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'theta-legge-oraria', topic: 'cinematica', name: 'legge oraria angolare',
    formula: 'theta = theta0 + omega0*t + 1/2*alpha*t^2', isolate: ['theta', 'theta0', 'omega0', 'alpha', 't'], difficulty: 5,
    conditions: [],
    hypotheses: 'Moto circolare uniformemente accelerato.',
  },
  {
    id: 'mas-legge-oraria', topic: 'cinematica', name: 'legge oraria (moto armonico semplice)',
    formula: 'x = A*cos(omega*t + phi)', isolate: ['x', 'A', 'omega', 't', 'phi'], difficulty: 5,
    conditions: [],
    hypotheses: 'Moto armonico semplice.',
  },
  {
    id: 'mas-velocita', topic: 'cinematica', name: 'velocità (moto armonico semplice)',
    formula: 'v = -A*omega*sin(omega*t + phi)', isolate: ['v', 'A', 'omega', 't', 'phi'], difficulty: 5,
    conditions: [],
  },
  {
    id: 'mas-accelerazione', topic: 'cinematica', name: 'accelerazione (moto armonico semplice)',
    formula: 'a = -omega^2*x', isolate: ['a', 'omega', 'x'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'omega-molla', topic: 'cinematica', name: 'pulsazione massa-molla',
    formula: 'omega = sqrt(k/m)', isolate: ['omega', 'k', 'm'], difficulty: 3,
    conditions: ['m ≠ 0', 'k ≥ 0'],
  },
  {
    id: 'T-molla', topic: 'cinematica', name: 'periodo massa-molla',
    formula: 'T = 2*pi*sqrt(m/k)', isolate: ['T', 'm', 'k'], difficulty: 4,
    conditions: ['k ≠ 0', 'm ≥ 0'],
  },
  {
    id: 'T-pendolo', topic: 'cinematica', name: 'periodo del pendolo semplice',
    formula: 'T = 2*pi*sqrt(l/g)', isolate: ['T', 'l', 'g'], difficulty: 4,
    conditions: ['g ≠ 0', 'l ≥ 0'],
    hypotheses: 'Piccole oscillazioni.',
  },

  // ============================ DINAMICA ============================
  {
    id: 'F2-ma', topic: 'dinamica', name: 'secondo principio (due forze)',
    formula: 'F1 + F2 = m*a', isolate: ['F1', 'F2', 'm', 'a'], difficulty: 3,
    conditions: [],
    notes: 'Seconda legge di Newton nel caso di due forze applicate.',
  },
  {
    id: 'attrito-statico', topic: 'dinamica', name: 'attrito statico massimo',
    formula: 'fs = mu*N', isolate: ['fs', 'mu', 'N'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'piano-parallela', topic: 'dinamica', name: 'componente del peso parallela al piano',
    formula: 'Fp = m*g*sin(theta)', isolate: ['Fp', 'm', 'g', 'theta'], difficulty: 3,
    conditions: [],
    hypotheses: 'Piano inclinato di angolo theta.',
  },
  {
    id: 'piano-perp', topic: 'dinamica', name: 'componente del peso perpendicolare al piano',
    formula: 'Fp = m*g*cos(theta)', isolate: ['Fp', 'm', 'g', 'theta'], difficulty: 3,
    conditions: [],
    hypotheses: 'Piano inclinato di angolo theta.',
  },
  {
    id: 'piano-accel', topic: 'dinamica', name: 'accelerazione su piano inclinato (senza attrito)',
    formula: 'a = g*sin(theta)', isolate: ['a', 'g', 'theta'], difficulty: 3,
    conditions: [],
  },

  // ================= LAVORO, ENERGIA E POTENZA =================
  {
    id: 'L-do-dp', topic: 'lavoro, energia e potenza', name: 'lavoro (forza e spostamento)',
    formula: 'W = F*s*cos(theta)', isolate: ['W', 'F', 's', 'theta'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'P-Fv', topic: 'lavoro, energia e potenza', name: 'potenza istantanea',
    formula: 'P = F*v', isolate: ['P', 'F', 'v'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'teorema-ec', topic: 'lavoro, energia e potenza', name: 'teorema dell\'energia cinetica',
    formula: 'W = 1/2*m*v^2 - 1/2*m*v0^2', isolate: ['W', 'm', 'v', 'v0'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'Uel', topic: 'lavoro, energia e potenza', name: 'energia potenziale elastica',
    formula: 'U = 1/2*k*x^2', isolate: ['U', 'k', 'x'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'conserv-energia', topic: 'lavoro, energia e potenza', name: 'conservazione dell\'energia meccanica',
    formula: 'Ec1 + Ep1 = Ec2 + Ep2', isolate: ['Ec1', 'Ep1', 'Ec2', 'Ep2'], difficulty: 4,
    conditions: [],
    hypotheses: 'Solo forze conservative.',
  },

  // ==================== QUANTITÀ DI MOTO E URTI ====================
  {
    id: 'q-mv', topic: 'quantità di moto e urti', name: 'quantità di moto',
    formula: 'p = m*v', isolate: ['p', 'm', 'v'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'impulso', topic: 'quantità di moto e urti', name: 'impulso di una forza',
    formula: 'J = F*t', isolate: ['J', 'F', 't'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'impulso-dp', topic: 'quantità di moto e urti', name: 'teorema dell\'impulso (variazione q.d.m.)',
    formula: 'J = m*v - m*v0', isolate: ['J', 'm', 'v', 'v0'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'conserv-qdm', topic: 'quantità di moto e urti', name: 'conservazione della quantità di moto',
    formula: 'm1*v1 = m2*v2', isolate: ['m1', 'v1', 'm2', 'v2'], difficulty: 3,
    conditions: [],
    hypotheses: 'Sistema isolato.',
  },
  {
    id: 'urto-anelastico', topic: 'quantità di moto e urti', name: 'urto completamente anelastico',
    formula: 'V = (m1*v1 + m2*v2)/(m1 + m2)', isolate: ['V', 'm1', 'v1', 'm2', 'v2'], difficulty: 4,
    conditions: ['m1 + m2 ≠ 0'],
  },
  {
    id: 'cm-due-corpi', topic: 'quantità di moto e urti', name: 'centro di massa (due corpi)',
    formula: 'xcm = (m1*x1 + m2*x2)/(m1 + m2)', isolate: ['xcm', 'm1', 'x1', 'm2', 'x2'], difficulty: 4,
    conditions: ['m1 + m2 ≠ 0'],
  },

  // ==================== CORPO RIGIDO E GRAVITAZIONE ====================
  {
    id: 'momento-forza', topic: 'corpo rigido e gravitazione', name: 'momento di una forza',
    formula: 'M = r*F*sin(theta)', isolate: ['M', 'r', 'F', 'theta'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'tau-Ialpha', topic: 'corpo rigido e gravitazione', name: 'equazione della dinamica rotazionale',
    formula: 'tau = I*alpha', isolate: ['tau', 'I', 'alpha'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'momento-inerzia', topic: 'corpo rigido e gravitazione', name: 'momento di inerzia (punti discreti)',
    formula: 'I = m1*r1^2 + m2*r2^2', isolate: ['I', 'm1', 'r1', 'm2', 'r2'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'steiner', topic: 'corpo rigido e gravitazione', name: 'teorema di Huygens-Steiner',
    formula: 'I = Icm + M*d^2', isolate: ['I', 'Icm', 'M', 'd'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'Ec-rot', topic: 'corpo rigido e gravitazione', name: 'energia cinetica rotazionale',
    formula: 'Ec = 1/2*I*omega^2', isolate: ['Ec', 'I', 'omega'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'conserv-L', topic: 'corpo rigido e gravitazione', name: 'conservazione del momento angolare',
    formula: 'I1*omega1 = I2*omega2', isolate: ['I1', 'omega1', 'I2', 'omega2'], difficulty: 4,
    conditions: [],
    hypotheses: 'Momento delle forze esterne nullo.',
  },
  {
    id: 'grav-universale', topic: 'corpo rigido e gravitazione', name: 'legge di gravitazione universale',
    formula: 'F = G*(m1*m2)/r^2', isolate: ['F', 'G', 'm1', 'm2', 'r'], difficulty: 4,
    conditions: ['r ≠ 0'],
  },
  {
    id: 'g-superficie', topic: 'corpo rigido e gravitazione', name: 'accelerazione di gravità sulla superficie',
    formula: 'g = G*M/R^2', isolate: ['g', 'G', 'M', 'R'], difficulty: 4,
    conditions: ['R ≠ 0'],
  },
  {
    id: 'U-gravit', topic: 'corpo rigido e gravitazione', name: 'energia potenziale gravitazionale universale',
    formula: 'U = -G*(M*m)/r', isolate: ['U', 'G', 'M', 'm', 'r'], difficulty: 5,
    conditions: ['r ≠ 0'],
  },
  {
    id: 'v-orbitale', topic: 'corpo rigido e gravitazione', name: 'velocità orbitale (orbita circolare)',
    formula: 'v = sqrt(G*M/r)', isolate: ['v', 'G', 'M', 'r'], difficulty: 4,
    conditions: ['r ≠ 0', 'G*M/r ≥ 0'],
  },
  {
    id: 'v-fuga', topic: 'corpo rigido e gravitazione', name: 'velocità di fuga',
    formula: 'v = sqrt((2*G*M)/R)', isolate: ['v', 'G', 'M', 'R'], difficulty: 4,
    conditions: ['R ≠ 0'],
  },
  {
    id: 'keplero-3', topic: 'corpo rigido e gravitazione', name: 'terza legge di Keplero',
    formula: 'T^2/a^3 = (4*pi^2)/(G*M)', isolate: ['T', 'a', 'G', 'M'], difficulty: 5,
    conditions: ['a ≠ 0', 'G*M ≠ 0'],
  },

  // ==================== PRESSIONE E FLUIDOSTATICA ====================
  {
    id: 'stevino', topic: 'pressione e fluidostatica', name: 'legge di Stevino (pressione totale)',
    formula: 'p = p0 + rho*g*h', isolate: ['p', 'p0', 'rho', 'g', 'h'], difficulty: 3,
    conditions: [],
    hypotheses: 'Legge di Stevino con pressione atmosferica superficiale p0.',
    tags: ['stevino', 'stevin', 'pressione atmosferica', 'idrostatica', 'profondita', 'sub', 'fondale'],
  },
  {
    id: 'pascal', topic: 'pressione e fluidostatica', name: 'principio di Pascal (torchio idraulico)',
    formula: 'F1/A1 = F2/A2', isolate: ['F1', 'A1', 'F2', 'A2'], difficulty: 3,
    conditions: ['A1 ≠ 0', 'A2 ≠ 0'],
    tags: ['pascal', 'torchio idraulico', 'freni', 'pistone', 'pressione'],
  },
  {
    id: 'galleggia', topic: 'pressione e fluidostatica', name: 'condizione di galleggiamento (Archimede)',
    formula: 'rho_corpo/rho_fluido = V_imm/V_tot', isolate: ['rho_corpo', 'rho_fluido', 'V_imm', 'V_tot'], difficulty: 4,
    conditions: ['rho_fluido ≠ 0', 'V_tot ≠ 0'],
    hypotheses: 'Principio di Archimede applicato all\'equilibrio di galleggiamento.',
    tags: ['archimede', 'galleggiamento', 'galleggia', 'iceberg', 'volume immerso', 'spinta'],
  },

  // ============================ IDRODINAMICA ============================
  {
    id: 'portata', topic: 'idrodinamica', name: 'portata volumetrica',
    formula: 'Q = A*v', isolate: ['Q', 'A', 'v'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'continuita', topic: 'idrodinamica', name: 'equazione di continuità',
    formula: 'A1*v1 = A2*v2', isolate: ['A1', 'v1', 'A2', 'v2'], difficulty: 3,
    conditions: [],
    hypotheses: 'Fluido incomprimibile.',
  },
  {
    id: 'bernoulli', topic: 'idrodinamica', name: 'teorema di Bernoulli',
    formula: 'p + 1/2*rho*v^2 + rho*g*z = cost', isolate: ['p', 'rho', 'v', 'g', 'z', 'cost'], difficulty: 5,
    conditions: [],
    hypotheses: 'Fluido ideale, regime stazionario.',
  },
  {
    id: 'torricelli', topic: 'idrodinamica', name: 'legge di Torricelli',
    formula: 'v = sqrt(2*g*h)', isolate: ['v', 'g', 'h'], difficulty: 3,
    conditions: ['h ≥ 0'],
  },
  {
    id: 'poiseuille', topic: 'idrodinamica', name: 'legge di Poiseuille',
    formula: 'Q = (pi*r^4*(p1 - p2))/(8*eta*L)', isolate: ['Q', 'r', 'p1', 'p2', 'eta', 'L'], difficulty: 5,
    conditions: ['eta ≠ 0', 'L ≠ 0'],
    hypotheses: 'Regime laminare, fluido viscoso.',
  },

  // ============================ TERMOLOGIA ============================
  {
    id: 'dilatazione-lineare-completa', topic: 'termologia', name: 'dilatazione termica lineare',
    formula: 'l = l0 + lam*L0*(T - T0)', isolate: ['l', 'l0', 'lam', 'L0', 'T', 'T0'], difficulty: 3,
    conditions: [],
    hypotheses: 'Solido isotropo; l0 (o L0) lunghezza iniziale, lam coeff. di dilatazione termica.',
    notes: 'Dilatazione termica lineare: l = l₀ + λ·L₀·(T − T₀).',
  },
  {
    id: 'dilatazione-vol', topic: 'termologia', name: 'dilatazione volumetrica',
    formula: 'dV = alpha*V0*dT', isolate: ['dV', 'alpha', 'V0', 'dT'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'capacita-termica', topic: 'termologia', name: 'capacità termica',
    formula: 'C = m*c', isolate: ['C', 'm', 'c'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'calore-latente', topic: 'termologia', name: 'calore latente di transizione',
    formula: 'Q = L*m', isolate: ['Q', 'L', 'm'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'boyle', topic: 'termologia', name: 'legge di Boyle (isoterma)',
    formula: 'p1*V1 = p2*V2', isolate: ['p1', 'V1', 'p2', 'V2'], difficulty: 3,
    conditions: [],
    hypotheses: 'Trasformazione isoterma di un gas.',
  },
  {
    id: 'gaylussac', topic: 'termologia', name: 'legge di Gay-Lussac (isobara)',
    formula: 'V1/T1 = V2/T2', isolate: ['V1', 'T1', 'V2', 'T2'], difficulty: 3,
    conditions: ['T1 ≠ 0', 'T2 ≠ 0'],
  },
  {
    id: 'charles', topic: 'termologia', name: 'legge di Charles (isocora)',
    formula: 'p1/T1 = p2/T2', isolate: ['p1', 'T1', 'p2', 'T2'], difficulty: 3,
    conditions: ['T1 ≠ 0', 'T2 ≠ 0'],
  },
  {
    id: 'equilibrio-termico', topic: 'termologia', name: 'temperatura di equilibrio termico',
    formula: 'Te = (m1*c1*T1 + m2*c2*T2)/(m1*c1 + m2*c2)', isolate: ['Te', 'm1', 'c1', 'T1', 'm2', 'c2', 'T2'], difficulty: 5,
    conditions: ['m1*c1 + m2*c2 ≠ 0'],
  },

  // ============================ TERMODINAMICA ============================
  {
    id: 'equipartizione', topic: 'termodinamica', name: 'energia interna (equipartizione)',
    formula: 'U = f/2*n*R*T', isolate: ['U', 'f', 'n', 'R', 'T'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'mayer', topic: 'termodinamica', name: 'relazione di Mayer',
    formula: 'Cp - Cv = R', isolate: ['Cp', 'Cv', 'R'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'primo-principio', topic: 'termodinamica', name: 'primo principio della termodinamica',
    formula: 'dU = Q - W', isolate: ['dU', 'Q', 'W'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'lavoro-isobaro', topic: 'termodinamica', name: 'lavoro termodinamico isobaro',
    formula: 'W = p*dV', isolate: ['W', 'p', 'dV'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'rendimento-carnot', topic: 'termodinamica', name: 'rendimento di Carnot',
    formula: 'eta = 1 - Tc/Th', isolate: ['eta', 'Tc', 'Th'], difficulty: 4,
    conditions: ['Th ≠ 0'],
    hypotheses: 'Macchina reversibile tra due sorgenti.',
  },
  {
    id: 'lavoro-isoterma', topic: 'termodinamica', name: 'lavoro in isoterma reversibile',
    formula: 'W = n*R*T*ln(V2/V1)', isolate: ['W', 'n', 'R', 'T', 'V2', 'V1'], difficulty: 5,
    conditions: ['V1 ≠ 0'],
  },

  // ============================ ONDE E ACUSTICA ============================
  {
    id: 'onda-v-lam-f', topic: 'onde e acustica', name: 'velocità di propagazione dell\'onda (suono e luce)',
    formula: 'v = lam*f', isolate: ['v', 'lam', 'f'], difficulty: 2,
    conditions: [],
    hypotheses: 'Relazione fondamentale tra velocità dell\'onda sonora o elettromagnetica, lunghezza d\'onda e frequenza.',
    tags: ['suono', 'onda', 'acustica', 'velocita del suono', 'lunghezza d onda', 'frequenza'],
  },
  {
    id: 'onda-periodo-frequenza', topic: 'onde e acustica', name: 'relazione frequenza-periodo sonoro',
    formula: 'f = 1/T', isolate: ['f', 'T'], difficulty: 1,
    conditions: ['T ≠ 0'],
    hypotheses: 'Frequenza sonora come inverso del periodo di oscillazione T.',
    tags: ['suono', 'onda', 'acustica', 'frequenza', 'periodo', 'tempo'],
  },
  {
    id: 'onda-v-lam-T', topic: 'onde e acustica', name: 'velocità d\'onda in funzione del periodo',
    formula: 'v = lam/T', isolate: ['v', 'lam', 'T'], difficulty: 2,
    conditions: ['T ≠ 0'],
    hypotheses: 'Velocità di propagazione del suono calcolata a partire dal periodo T.',
    tags: ['suono', 'onda', 'acustica', 'velocita', 'periodo', 'lunghezza d onda'],
  },
  {
    id: 'doppler-avvicinamento-sorgente', topic: 'onde e acustica', name: 'effetto Doppler (sorgente sonora in avvicinamento)',
    formula: 'fp = (f*v)/(v - vs)', isolate: ['fp', 'f', 'v', 'vs'], difficulty: 4,
    conditions: ['v - vs ≠ 0'],
    hypotheses: 'Sorgente sonora in avvicinamento verso osservatore fermo. v = velocità del suono nell\'aria, vs = velocità sorgente, f = frequenza emessa, fp = frequenza percepita.',
    tags: ['doppler', 'suono', 'effetto doppler', 'acustica', 'sorgente in moto', 'ambulanza', 'avvicinamento', 'frequenza'],
  },
  {
    id: 'doppler-allontanamento-sorgente', topic: 'onde e acustica', name: 'effetto Doppler (sorgente sonora in allontanamento)',
    formula: 'fp = (f*v)/(v + vs)', isolate: ['fp', 'f', 'v', 'vs'], difficulty: 4,
    conditions: [],
    hypotheses: 'Sorgente sonora che si allontana dall\'osservatore fermo. La frequenza percepita fp diminuisce rispetto alla frequenza emessa f.',
    tags: ['doppler', 'suono', 'effetto doppler', 'acustica', 'sorgente in moto', 'sirena', 'allontanamento', 'frequenza'],
  },
  {
    id: 'doppler-avvicinamento-osservatore', topic: 'onde e acustica', name: 'effetto Doppler (osservatore in avvicinamento)',
    formula: 'fp = f*(v + vo)/v', isolate: ['fp', 'f', 'v', 'vo'], difficulty: 3,
    conditions: ['v ≠ 0'],
    hypotheses: 'Osservatore in moto con velocità vo verso una sorgente sonora ferma.',
    tags: ['doppler', 'suono', 'effetto doppler', 'acustica', 'osservatore in moto', 'avvicinamento'],
  },
  {
    id: 'doppler-allontanamento-osservatore', topic: 'onde e acustica', name: 'effetto Doppler (osservatore in allontanamento)',
    formula: 'fp = f*(v - vo)/v', isolate: ['fp', 'f', 'v', 'vo'], difficulty: 3,
    conditions: ['v ≠ 0'],
    hypotheses: 'Osservatore in allontanamento con velocità vo dalla sorgente sonora ferma.',
    tags: ['doppler', 'suono', 'effetto doppler', 'acustica', 'osservatore in moto', 'allontanamento'],
  },
  {
    id: 'eco-suono', topic: 'onde e acustica', name: 'eco e sonar (riflessione del suono)',
    formula: '2*d = v*t', isolate: ['d', 'v', 't'], difficulty: 2,
    conditions: [],
    hypotheses: 'Onda sonora che compie il percorso di andata e ritorno (2*d) a velocità v nel tempo totale t.',
    tags: ['suono', 'eco', 'sonar', 'acustica', 'riflessione', 'distanza ostacolo', 'tempo di ritorno'],
  },
  {
    id: 'intensita-sonora', topic: 'onde e acustica', name: 'intensità sonora (onda sferica)',
    formula: 'I = P/(4*pi*r^2)', isolate: ['I', 'P', 'r'], difficulty: 4,
    conditions: ['r ≠ 0'],
    hypotheses: 'Intensità I dell\'onda sonora a distanza r da sorgente puntiforme isotropa di potenza acustica P.',
    tags: ['suono', 'intensita sonora', 'acustica', 'decibel', 'potenza acustica', 'propagazione', 'sfera'],
  },
  {
    id: 'battimenti-sonori', topic: 'onde e acustica', name: 'frequenza dei battimenti sonori',
    formula: 'fb = f1 - f2', isolate: ['fb', 'f1', 'f2'], difficulty: 1,
    conditions: [],
    hypotheses: 'Battimenti sonori percepiti per sovrapposizione di due onde di frequenze vicine f1 > f2.',
    tags: ['suono', 'battimenti', 'acustica', 'interferenza', 'accordatore', 'frequenze'],
  },
  {
    id: 'canne-organo-aperte', topic: 'onde e acustica', name: 'frequenza fondamentale di una canna d\'organo aperta',
    formula: 'f = v/(2*L)', isolate: ['f', 'v', 'L'], difficulty: 2,
    conditions: ['L ≠ 0'],
    hypotheses: 'Tubo o canna sonora aperta a entrambe le estremità di lunghezza L. v = velocità del suono nell\'aria.',
    tags: ['suono', 'canne d organo', 'tubo sonoro', 'acustica', 'musica', 'risonanza'],
  },
  {
    id: 'corda-armonica', topic: 'onde e acustica', name: 'legge di Mersenne (corda vibrante)',
    formula: 'f = (1/(2*L))*sqrt(T/mu)', isolate: ['f', 'L', 'T', 'mu'], difficulty: 5,
    conditions: ['L ≠ 0', 'mu ≠ 0'],
    hypotheses: 'Frequenza della nota fondamentale emessa da una corda di lunghezza L tesa con forza T e densità lineare mu.',
    tags: ['suono', 'mersenne', 'corda vibrante', 'chitarra', 'musica', 'acustica', 'tensione'],
  },

  // ============================ ELETTROSTATICA ============================
  {
    id: 'coulomb', topic: 'elettrostatica', name: 'legge di Coulomb',
    formula: 'F = (1/(4*pi*eps0))*(q1*q2)/r^2', isolate: ['F', 'q1', 'q2', 'r', 'eps0'], difficulty: 5,
    conditions: ['r ≠ 0', 'eps0 ≠ 0'],
  },
  {
    id: 'campo-carica', topic: 'elettrostatica', name: 'campo elettrico di una carica puntiforme',
    formula: 'E = (1/(4*pi*eps0))*q/r^2', isolate: ['E', 'q', 'r', 'eps0'], difficulty: 5,
    conditions: ['r ≠ 0', 'eps0 ≠ 0'],
  },
  {
    id: 'forza-campo', topic: 'elettrostatica', name: 'forza su una carica in campo elettrico',
    formula: 'F = q*E', isolate: ['F', 'q', 'E'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'gauss-elettrico', topic: 'elettrostatica', name: 'legge di Gauss (flusso del campo elettrico)',
    formula: 'Phi = q/eps0', isolate: ['Phi', 'q', 'eps0'], difficulty: 5,
    conditions: ['eps0 ≠ 0'],
  },
  {
    id: 'energia-coulomb', topic: 'elettrostatica', name: 'energia potenziale elettrostatica',
    formula: 'U = (1/(4*pi*eps0))*(q1*q2)/r', isolate: ['U', 'q1', 'q2', 'r', 'eps0'], difficulty: 5,
    conditions: ['r ≠ 0', 'eps0 ≠ 0'],
  },
  {
    id: 'potenziale-carica', topic: 'elettrostatica', name: 'potenziale elettrico di una carica',
    formula: 'V = (1/(4*pi*eps0))*q/r', isolate: ['V', 'q', 'r', 'eps0'], difficulty: 5,
    conditions: ['r ≠ 0', 'eps0 ≠ 0'],
  },
  {
    id: 'E-dV-d', topic: 'elettrostatica', name: 'campo elettrico uniforme (relazione con la tensione)',
    formula: 'E = V/d', isolate: ['E', 'V', 'd'], difficulty: 3,
    conditions: ['d ≠ 0'],
  },
  {
    id: 'capacita-cond', topic: 'elettrostatica', name: 'capacità di un condensatore',
    formula: 'C = Q/V', isolate: ['C', 'Q', 'V'], difficulty: 3,
    conditions: ['V ≠ 0'],
  },
  {
    id: 'energia-condensatore', topic: 'elettrostatica', name: 'energia immagazzinata in un condensatore',
    formula: 'U = 1/2*C*V^2', isolate: ['U', 'C', 'V'], difficulty: 4,
    conditions: [],
  },

  // ============================ MAGNETOSTATICA ============================
  {
    id: 'lorentz', topic: 'magnetostatica', name: 'forza di Lorentz',
    formula: 'F = q*v*B*sin(theta)', isolate: ['F', 'q', 'v', 'B', 'theta'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'raggio-lorentz', topic: 'magnetostatica', name: 'raggio di curvatura (carica in campo magnetico)',
    formula: 'r = (m*v)/(q*B)', isolate: ['r', 'm', 'v', 'q', 'B'], difficulty: 4,
    conditions: ['q ≠ 0', 'B ≠ 0'],
  },
  {
    id: 'laplace', topic: 'magnetostatica', name: 'forza di Laplace',
    formula: 'F = I*L*B*sin(theta)', isolate: ['F', 'I', 'L', 'B', 'theta'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'biot-savart', topic: 'magnetostatica', name: 'campo magnetico di un filo rettilineo',
    formula: 'B = (mu0*I)/(2*pi*r)', isolate: ['B', 'mu0', 'I', 'r'], difficulty: 4,
    conditions: ['r ≠ 0'],
  },
  {
    id: 'bobina-centro', topic: 'magnetostatica', name: 'campo magnetico al centro di una spira',
    formula: 'B = (mu0*I)/(2*R)', isolate: ['B', 'mu0', 'I', 'R'], difficulty: 4,
    conditions: ['R ≠ 0'],
  },
  {
    id: 'solenoide', topic: 'magnetostatica', name: 'campo magnetico in un solenoide',
    formula: 'B = mu0*(N/L)*I', isolate: ['B', 'mu0', 'N', 'L', 'I'], difficulty: 4,
    conditions: ['L ≠ 0'],
  },

  // ============================ CIRCUITI ELETTRICI ============================
  {
    id: 'ohm-2-fis', topic: 'circuiti elettrici', name: 'seconda legge di Ohm',
    formula: 'R = rho*L/A', isolate: ['R', 'rho', 'L', 'A'], difficulty: 3,
    conditions: ['A ≠ 0'],
  },
  {
    id: 'resistivita-temp', topic: 'circuiti elettrici', name: 'resistività in funzione della temperatura',
    formula: 'rho = rho0*(1 + alpha*dT)', isolate: ['rho', 'rho0', 'alpha', 'dT'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'potenza-joule', topic: 'circuiti elettrici', name: 'potenza ed effetto Joule',
    formula: 'P = R*I^2', isolate: ['P', 'R', 'I'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'resistori-serie', topic: 'circuiti elettrici', name: 'resistori in serie',
    formula: 'Req = R1 + R2', isolate: ['Req', 'R1', 'R2'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'resistori-parallelo', topic: 'circuiti elettrici', name: 'resistori in parallelo',
    formula: '1/R_eq = 1/R_1 + 1/R_2', isolate: ['R_eq', 'R_1', 'R_2'], difficulty: 3,
    aliases: ['1/Req = 1/R1 + 1/R2', 'Req = (R1*R2)/(R1 + R2)'],
    conditions: ['R_eq ≠ 0', 'R_1 ≠ 0', 'R_2 ≠ 0'],
    hypotheses: 'Due resistori collegati in parallelo; la tensione è uguale ai capi di entrambi.',
    notes: 'Formula fondamentale dei resistori in parallelo. Si usa il minimo comune multiplo (m.c.m.) per sommare le frazioni e poi la regola del reciproco per isolare l\'incognita.',
  },
  {
    id: 'resistori-parallelo-equivalente', topic: 'circuiti elettrici', name: 'resistori in parallelo (formula ridotta)',
    formula: 'Req = (R1*R2)/(R1 + R2)', isolate: ['Req', 'R1', 'R2'], difficulty: 3,
    conditions: ['R1 + R2 ≠ 0'],
    notes: 'Forma a frazione singola della resistenza equivalente di due resistori in parallelo.',
  },
  {
    id: 'condensatori-parallelo', topic: 'circuiti elettrici', name: 'condensatori in parallelo',
    formula: 'Ceq = C1 + C2', isolate: ['Ceq', 'C1', 'C2'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'condensatori-serie', topic: 'circuiti elettrici', name: 'condensatori in serie',
    formula: '1/C_eq = 1/C_1 + 1/C_2', isolate: ['C_eq', 'C_1', 'C_2'], difficulty: 3,
    aliases: ['1/Ceq = 1/C1 + 1/C2', 'Ceq = (C1*C2)/(C1 + C2)'],
    conditions: ['C_eq ≠ 0', 'C_1 ≠ 0', 'C_2 ≠ 0'],
    notes: 'Formula fondamentale per due condensatori in serie.',
  },
  {
    id: 'condensatori-serie-equivalente', topic: 'circuiti elettrici', name: 'condensatori in serie (formula ridotta)',
    formula: 'Ceq = (C1*C2)/(C1 + C2)', isolate: ['Ceq', 'C1', 'C2'], difficulty: 3,
    conditions: ['C1 + C2 ≠ 0'],
  },
  {
    id: 'rc-costante', topic: 'circuiti elettrici', name: 'costante di tempo RC',
    formula: 'tau = R*C', isolate: ['tau', 'R', 'C'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'rl-costante', topic: 'circuiti elettrici', name: 'costante di tempo RL',
    formula: 'tau = L/R', isolate: ['tau', 'L', 'R'], difficulty: 2,
    conditions: ['R ≠ 0'],
  },
  {
    id: 'valori-efficaci', topic: 'circuiti elettrici', name: 'valore efficace (tensione alternata)',
    formula: 'Veff = Vmax/sqrt(2)', isolate: ['Veff', 'Vmax'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'reattanza-ind', topic: 'circuiti elettrici', name: 'reattanza induttiva',
    formula: 'XL = omega*L', isolate: ['XL', 'omega', 'L'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'reattanza-cap', topic: 'circuiti elettrici', name: 'reattanza capacitiva',
    formula: 'XC = 1/(omega*C)', isolate: ['XC', 'omega', 'C'], difficulty: 3,
    conditions: ['omega ≠ 0', 'C ≠ 0'],
  },
  {
    id: 'impedenza-rlc', topic: 'circuiti elettrici', name: 'impedenza di un circuito RLC in serie',
    formula: 'Z = sqrt(R^2 + (XL - XC)^2)', isolate: ['Z', 'R', 'XL', 'XC'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'risonanza-rlc', topic: 'circuiti elettrici', name: 'frequenza di risonanza RLC',
    formula: 'f0 = 1/(2*pi*sqrt(L*C))', isolate: ['f0', 'L', 'C'], difficulty: 5,
    conditions: ['L ≠ 0', 'C ≠ 0'],
  },
  {
    id: 'potenza-media-ac', topic: 'circuiti elettrici', name: 'potenza media in corrente alternata',
    formula: 'P = Veff*Ieff*cos(phi)', isolate: ['P', 'Veff', 'Ieff', 'phi'], difficulty: 4,
    conditions: [],
  },

  // ============================ ELETTROMAGNETISMO ============================
  {
    id: 'flusso-magnetico', topic: 'elettromagnetismo', name: 'flusso del campo magnetico',
    formula: 'PhiB = B*A*cos(theta)', isolate: ['PhiB', 'B', 'A', 'theta'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'faraday', topic: 'elettromagnetismo', name: 'legge di Faraday-Neumann-Lenz',
    formula: 'fem = PhiB/t', isolate: ['fem', 'PhiB', 't'], difficulty: 4,
    conditions: ['t ≠ 0'],
    notes: 'Forma semplificata con il flusso medio; la forma completa usa la derivata.',
  },
  {
    id: 'fem-cinetica', topic: 'elettromagnetismo', name: 'forza elettromotrice cinetica',
    formula: 'fem = B*L*v', isolate: ['fem', 'B', 'L', 'v'], difficulty: 3,
    conditions: [],
    hypotheses: 'Sbarra conduttrice in moto in campo magnetico uniforme.',
  },
  {
    id: 'autoinduzione', topic: 'elettromagnetismo', name: 'flusso di autoinduzione',
    formula: 'PhiB = L*I', isolate: ['PhiB', 'L', 'I'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'energia-induttanza', topic: 'elettromagnetismo', name: 'energia immagazzinata in un\'induttanza',
    formula: 'U = 1/2*L*I^2', isolate: ['U', 'L', 'I'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'densita-energia', topic: 'elettromagnetismo', name: 'densità di energia del campo elettrico',
    formula: 'u = 1/2*eps0*E^2', isolate: ['u', 'eps0', 'E'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'corrente-spostamento', topic: 'elettromagnetismo', name: 'corrente di spostamento di Maxwell',
    formula: 'Id = eps0*PhiE/t', isolate: ['Id', 'eps0', 'PhiE', 't'], difficulty: 5,
    conditions: ['t ≠ 0'],
  },
  {
    id: 'velocita-luce', topic: 'elettromagnetismo', name: 'velocità della luce nel vuoto (Maxwell)',
    formula: 'c = 1/sqrt(eps0*mu0)', isolate: ['c', 'eps0', 'mu0'], difficulty: 4,
    conditions: ['eps0 ≠ 0', 'mu0 ≠ 0'],
  },
  {
    id: 'onda-E-B', topic: 'elettromagnetismo', name: 'relazione d\'onda tra campo elettrico e magnetico',
    formula: 'E = c*B', isolate: ['E', 'c', 'B'], difficulty: 3,
    conditions: [],
  },

  // ============================ OTTICA ============================
  {
    id: 'indice-rifrazione', topic: 'ottica', name: 'indice di rifrazione',
    formula: 'n = c/v', isolate: ['n', 'c', 'v'], difficulty: 2,
    conditions: ['v ≠ 0'],
  },
  {
    id: 'snell', topic: 'ottica', name: 'legge di Snell (rifrazione)',
    formula: 'n1*sin(theta1) = n2*sin(theta2)', isolate: ['n1', 'theta1', 'n2', 'theta2'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'angolo-limite', topic: 'ottica', name: 'angolo limite (riflessione totale)',
    formula: 'sin(thetaL) = n2/n1', isolate: ['thetaL', 'n1', 'n2'], difficulty: 4,
    conditions: ['n1 ≠ 0'],
    hypotheses: 'Passaggio da mezzo più denso a meno denso.',
  },
  {
    id: 'lenti-sottili', topic: 'ottica', name: 'equazione dei punti coniugati (lenti sottili)',
    formula: '1/f = 1/p + 1/q', isolate: ['f', 'p', 'q'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'ingrandimento', topic: 'ottica', name: 'ingrandimento trasversale',
    formula: 'G = -q/p', isolate: ['G', 'q', 'p'], difficulty: 3,
    conditions: ['p ≠ 0'],
  },
  {
    id: 'young-massimi', topic: 'ottica', name: 'interferenza di Young (massimi)',
    formula: 'd*sin(theta) = k*lam', isolate: ['d', 'theta', 'k', 'lam'], difficulty: 5,
    conditions: [],
    hypotheses: 'Esperimento delle due fenditure.',
  },

  // ============================ RELATIVITÀ ============================
  {
    id: 'fattore-lorentz', topic: 'relatività', name: 'fattore di Lorentz',
    formula: 'gamma = 1/sqrt(1 - v^2/c^2)', isolate: ['gamma', 'v', 'c'], difficulty: 5,
    conditions: ['c ≠ 0', '1 - v^2/c^2 ≥ 0'],
  },
  {
    id: 'dilatazione-tempi', topic: 'relatività', name: 'dilatazione dei tempi',
    formula: 'dt = gamma*dt0', isolate: ['dt', 'gamma', 'dt0'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'contrazione-lunghezze', topic: 'relatività', name: 'contrazione delle lunghezze',
    formula: 'L = L0/gamma', isolate: ['L', 'L0', 'gamma'], difficulty: 4,
    conditions: ['gamma ≠ 0'],
  },
  {
    id: 'composizione-velocita', topic: 'relatività', name: 'composizione relativistica delle velocità',
    formula: 'u = (u1 + v)/(1 + (u1*v)/c^2)', isolate: ['u', 'u1', 'v', 'c'], difficulty: 5,
    conditions: ['c ≠ 0', '1 + (u1*v)/c^2 ≠ 0'],
    hypotheses: 'Somma relativistica di velocità in una dimensione.',
  },
  {
    id: 'qdm-relativistica', topic: 'relatività', name: 'quantità di moto relativistica',
    formula: 'p = gamma*m*v', isolate: ['p', 'gamma', 'm', 'v'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'energia-riposo', topic: 'relatività', name: 'energia a riposo',
    formula: 'E0 = m*c^2', isolate: ['E0', 'm', 'c'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'energia-relativistica', topic: 'relatività', name: 'energia totale relativistica',
    formula: 'E = gamma*m*c^2', isolate: ['E', 'gamma', 'm', 'c'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'invariante-energia-impulso', topic: 'relatività', name: 'invariante energia-impulso',
    formula: 'E^2 - (p*c)^2 = (m*c^2)^2', isolate: ['E', 'p', 'c', 'm'], difficulty: 5,
    conditions: [],
  },

  // ============================ FISICA MODERNA ============================
  {
    id: 'planck-einstein', topic: 'fisica moderna', name: 'energia del fotone (Planck-Einstein)',
    formula: 'E = h*nu', isolate: ['E', 'h', 'nu'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'fotoelettrico', topic: 'fisica moderna', name: 'effetto fotoelettrico (energia cinetica massima)',
    formula: 'Ek = h*nu - W0', isolate: ['Ek', 'h', 'nu', 'W0'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'compton', topic: 'fisica moderna', name: 'effetto Compton (spostamento di lunghezza d\'onda)',
    formula: 'dlam = (h/(m*c))*(1 - cos(theta))', isolate: ['dlam', 'h', 'm', 'c', 'theta'], difficulty: 5,
    conditions: ['m ≠ 0', 'c ≠ 0'],
  },
  {
    id: 'de-broglie', topic: 'fisica moderna', name: 'lunghezza d\'onda di De Broglie',
    formula: 'lam = h/(m*v)', isolate: ['lam', 'h', 'm', 'v'], difficulty: 4,
    conditions: ['m ≠ 0', 'v ≠ 0'],
  },
  {
    id: 'bohr-raggio', topic: 'fisica moderna', name: 'raggio delle orbite di Bohr',
    formula: 'rn = n^2*r1', isolate: ['rn', 'n', 'r1'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'bohr-energia', topic: 'fisica moderna', name: 'livelli energetici di Bohr',
    formula: 'En = -E1/n^2', isolate: ['En', 'E1', 'n'], difficulty: 4,
    conditions: ['n ≠ 0'],
  },

  // ============================ ASTROFISICA E LEGGI DI KEPLERO ============================
  {
    id: 'legge-hubble', topic: 'astrofisica', name: 'legge di Hubble (espansione cosmica)',
    formula: 'v = H0*d', isolate: ['v', 'H0', 'd'], difficulty: 2,
    conditions: ['d > 0'],
    hypotheses: 'Universo omogeneo e isotropo su larga scala; H0 è la costante di Hubble.',
    latex: 'v = H_0 \\cdot d',
  },
  {
    id: 'raggio-schwarzschild', topic: 'astrofisica', name: 'raggio di Schwarzschild (buco nero statico)',
    formula: 'Rs = (2*G*M)/c^2', isolate: ['Rs', 'G', 'M', 'c'], difficulty: 4,
    conditions: ['c ≠ 0'],
    hypotheses: 'Relatività generale; buco nero a simmetria sferica non rotante.',
    latex: 'R_s = \\frac{2 \\cdot G \\cdot M}{c^2}',
  },
  {
    id: 'luminosita-stellare', topic: 'astrofisica', name: 'luminosità stellare (Stefan-Boltzmann)',
    formula: 'L = 4*pi*R^2*sigma*T^4', isolate: ['L', 'R', 'sigma', 'T'], difficulty: 4,
    conditions: ['R > 0', 'T > 0'],
    hypotheses: 'Stella considerata corpo nero sferico di raggio R e temperatura superficiale T.',
    latex: 'L = 4 \\cdot \\pi \\cdot R^2 \\cdot \\sigma \\cdot T^4',
  },
  {
    id: 'legge-wien', topic: 'astrofisica', name: 'legge dello spostamento di Wien',
    formula: 'lam_max*T = b', isolate: ['lam_max', 'T', 'b'], difficulty: 2,
    conditions: ['T > 0'],
    hypotheses: 'Emissione di corpo nero; b è la costante dello spostamento di Wien.',
    latex: '\\lambda_{\\text{max}} \\cdot T = b',
  },
  {
    id: 'redshift-astronomico', topic: 'astrofisica', name: 'parametro di redshift cosmologico (z)',
    formula: 'z = (lam - lam0)/lam0', isolate: ['z', 'lam', 'lam0'], difficulty: 3,
    conditions: ['lam0 > 0'],
    hypotheses: 'lam è la lunghezza d\'onda osservata, lam0 quella emessa a riposo dalla sorgente.',
    latex: 'z = \\frac{\\lambda - \\lambda_0}{\\lambda_0}',
  },
  {
    id: 'luminosita-eddington', topic: 'astrofisica', name: 'luminosità limite di Eddington',
    formula: 'L_edd = (4*pi*G*M*c)/kappa', isolate: ['L_edd', 'G', 'M', 'c', 'kappa'], difficulty: 4,
    conditions: ['kappa ≠ 0'],
    hypotheses: 'Equilibrio idrostatico tra spinta di radiazione e attrazione gravitazionale.',
    latex: 'L_{\\text{edd}} = \\frac{4 \\cdot \\pi \\cdot G \\cdot M \\cdot c}{\\kappa}',
  },
  {
    id: 'energia-orbitale-keplero', topic: 'astrofisica', name: 'energia orbitale (orbita ellittica)',
    formula: 'E = -(G*M*m)/(2*a)', isolate: ['E', 'G', 'M', 'm', 'a'], difficulty: 4,
    conditions: ['a > 0'],
    hypotheses: 'Moto in campo gravitazionale centrale newtoniano con semiasse maggiore a.',
    latex: 'E = -\\frac{G \\cdot M \\cdot m}{2 \\cdot a}',
  },
  {
    id: 'keplero-3-masse', topic: 'astrofisica', name: 'terza legge di Keplero generalizzata (due corpi)',
    formula: 'T^2 = (4*pi^2*a^3)/(G*(M1 + M2))', isolate: ['T', 'a', 'G', 'M1', 'M2'], difficulty: 5,
    conditions: ['G*(M1 + M2) ≠ 0'],
    hypotheses: 'Due masse M1 e M2 in moto orbitale attorno al baricentro comune.',
    latex: 'T^2 = \\frac{4 \\cdot \\pi^2 \\cdot a^3}{G \\cdot (M_1 + M_2)}',
  },
  {
    id: 'equazione-vis-viva', topic: 'astrofisica', name: 'equazione vis-viva (velocità orbitale)',
    formula: 'v^2 = G*M*(2/r - 1/a)', isolate: ['v', 'G', 'M', 'r', 'a'], difficulty: 5,
    conditions: ['r > 0', 'a > 0'],
    hypotheses: 'Conservazione dell\'energia in orbita ellittica kepleriana attorno alla massa centrale M.',
    latex: 'v^2 = G \\cdot M \\cdot \\left(\\frac{2}{r} - \\frac{1}{a}\\right)',
  },
  {
    id: 'velocita-areale-keplero', topic: 'astrofisica', name: 'velocità areale (seconda legge di Keplero)',
    formula: 'v_area = L/(2*m)', isolate: ['v_area', 'L', 'm'], difficulty: 3,
    conditions: ['m ≠ 0'],
    hypotheses: 'Moto sotto forza centrale con conservazione del momento angolare L.',
    latex: 'v_{\\text{area}} = \\frac{L}{2 \\cdot m}',
  },

  // ============================ OTTICA ONDULATORIA ============================
  {
    id: 'young-frange', topic: 'ottica', name: 'interfrangia di Young (doppia fenditura)',
    formula: 'Delta_y = (lam*L)/d', isolate: ['Delta_y', 'lam', 'L', 'd'], difficulty: 3,
    conditions: ['d ≠ 0'],
    hypotheses: 'Interferenza a due fenditure con distanza schermo L molto maggiore del passo d.',
    latex: '\\Delta y = \\frac{\\lambda \\cdot L}{d}',
  },
  {
    id: 'diffrazione-singola-fenditura', topic: 'ottica', name: 'diffrazione da singola fenditura (minimi)',
    formula: 'a*sin(theta) = m*lam', isolate: ['a', 'theta', 'm', 'lam'], difficulty: 4,
    conditions: ['a > 0'],
    hypotheses: 'Minimi di diffrazione da fenditura lineare di larghezza a; m intero non nullo.',
    latex: 'a \\cdot \\sin(\\theta) = m \\cdot \\lambda',
  },
  {
    id: 'reticolo-diffrazione', topic: 'ottica', name: 'reticolo di diffrazione (massimi principali)',
    formula: 'd*sin(theta) = m*lam', isolate: ['d', 'theta', 'm', 'lam'], difficulty: 4,
    conditions: ['d > 0'],
    hypotheses: 'Passo del reticolo d; m è l\'ordine del massimo di interferenza.',
    latex: 'd \\cdot \\sin(\\theta) = m \\cdot \\lambda',
  },
  {
    id: 'criterio-rayleigh', topic: 'ottica', name: 'criterio di Rayleigh (risoluzione angolare)',
    formula: 'theta = (1.22*lam)/D', isolate: ['theta', 'lam', 'D'], difficulty: 3,
    conditions: ['D > 0'],
    hypotheses: 'Diffrazione da apertura circolare di diametro D (disco di Airy).',
    latex: '\\theta = \\frac{1.22 \\cdot \\lambda}{D}',
  },
  {
    id: 'legge-malus', topic: 'ottica', name: 'legge di Malus (polarizzazione)',
    formula: 'I = I0*cos(theta)^2', isolate: ['I', 'I0', 'theta'], difficulty: 4,
    conditions: [],
    hypotheses: 'Luce polarizzata linearmente incidente con intensità I0 su filtro analizzatore inclinato di theta.',
    latex: 'I = I_0 \\cdot \\cos^2(\\theta)',
  },
  {
    id: 'legge-brewster', topic: 'ottica', name: 'angolo di Brewster (polarizzazione per riflessione)',
    formula: 'tan(thetaB) = n2/n1', isolate: ['thetaB', 'n2', 'n1'], difficulty: 4,
    conditions: ['n1 ≠ 0'],
    hypotheses: 'Raggio riflesso totalmente polarizzato ortogonalmente al piano di incidenza.',
    latex: '\\tan(\\theta_B) = \\frac{n_2}{n_1}',
  },
  {
    id: 'lamine-sottili-interferenza', topic: 'ottica', name: 'interferenza su lamine sottili (cammino ottico)',
    formula: '2*n*d = m*lam', isolate: ['n', 'd', 'm', 'lam'], difficulty: 3,
    conditions: ['n ≥ 1'],
    hypotheses: 'Riflessione quasi normale su pellicola di spessore d e indice di rifrazione n.',
    latex: '2 \\cdot n \\cdot d = m \\cdot \\lambda',
  },

  // ============================ CHIMICA GENERALE ============================
  // --- Gas Ideali e Reali ---
  {
    id: 'gas-van-der-waals', topic: 'chimica', name: 'equazione di Van der Waals (gas reali)',
    formula: '(p + (a*n^2)/V^2)*(V - n*b) = n*R*T', isolate: ['p', 'V', 'n', 'R', 'T', 'a', 'b'], difficulty: 5,
    conditions: ['V > n*b', 'V ≠ 0'],
    hypotheses: 'Gas reale con attrazione molecolare (parametro a) e volume proprio (covolume b).',
    latex: '\\left(p + \\frac{a \\cdot n^2}{V^2}\\right) \\cdot (V - n \\cdot b) = n \\cdot R \\cdot T',
  },
  {
    id: 'densita-gas-ideali', topic: 'chimica', name: 'densità di un gas ideale',
    formula: 'rho = (p*M)/(R*T)', isolate: ['rho', 'p', 'M', 'R', 'T'], difficulty: 3,
    conditions: ['R ≠ 0', 'T > 0'],
    hypotheses: 'M è la massa molare del gas, p la pressione e T la temperatura assoluta.',
    latex: '\\rho = \\frac{p \\cdot M}{R \\cdot T}',
  },
  {
    id: 'legge-graham', topic: 'chimica', name: 'legge di Graham (velocità di effusione)',
    formula: 'v1/v2 = sqrt(M2/M1)', isolate: ['v1', 'v2', 'M1', 'M2'], difficulty: 4,
    conditions: ['v2 ≠ 0', 'M1 > 0'],
    hypotheses: 'Rapporto di effusione tra due gas con masse molari M1 e M2 a pari T e p.',
    latex: '\\frac{v_1}{v_2} = \\sqrt{\\frac{M_2}{M_1}}',
  },
  {
    id: 'legge-dalton', topic: 'chimica', name: 'legge di Dalton (pressione parziale)',
    formula: 'Pi = xi*P_tot', isolate: ['Pi', 'xi', 'P_tot'], difficulty: 2,
    conditions: ['P_tot > 0'],
    hypotheses: 'xi è la frazione molare del componente i-esimo in una miscela ideale di gas.',
    latex: 'P_i = \\chi_i \\cdot P_{\\text{tot}}',
  },

  // --- Equilibri Acido-Base e pH ---
  {
    id: 'ph-poh-relazione', topic: 'chimica', name: 'relazione tra pH e pOH',
    formula: 'pH + pOH = 14', isolate: ['pH', 'pOH'], difficulty: 2,
    conditions: [],
    hypotheses: 'Soluzione acquosa a 25°C (298.15 K), dove Kw = 1.0e-14 e pKw = 14.',
    latex: '\\text{pH} + \\text{pOH} = 14',
  },
  {
    id: 'prodotto-ionico-acqua', topic: 'chimica', name: 'prodotto ionico dell\'acqua (Kw)',
    formula: 'Kw = H*OH', isolate: ['Kw', 'H', 'OH'], difficulty: 2,
    conditions: ['H > 0', 'OH > 0'],
    hypotheses: 'H e OH rappresentano le concentrazioni molari [H+] e [OH-].',
    latex: 'K_w = [\\text{H}^+] \\cdot [\\text{OH}^-]',
  },
  {
    id: 'costante-dissociazione-acida', topic: 'chimica', name: 'costante di dissociazione acida (Ka)',
    formula: 'Ka = (H*A)/HA', isolate: ['Ka', 'H', 'A', 'HA'], difficulty: 3,
    conditions: ['HA > 0'],
    hypotheses: 'Equilibrio acido debole HA <=> H+ + A-; A rappresenta la base coniugata.',
    latex: 'K_a = \\frac{[\\text{H}^+] \\cdot [\\text{A}^-]}{[\\text{HA}]}',
  },
  {
    id: 'costante-dissociazione-basica', topic: 'chimica', name: 'costante di dissociazione basica (Kb)',
    formula: 'Kb = (OH*BH)/B', isolate: ['Kb', 'OH', 'BH', 'B'], difficulty: 3,
    conditions: ['B > 0'],
    hypotheses: 'Equilibrio base debole B + H2O <=> BH+ + OH-; BH è l\'acido coniugato.',
    latex: 'K_b = \\frac{[\\text{OH}^-] \\cdot [\\text{BH}^+]}{[\\text{B}]}',
  },
  {
    id: 'henderson-hasselbalch', topic: 'chimica', name: 'equazione di Henderson-Hasselbalch (tampone acido)',
    formula: 'pH = pKa + ln(A/HA)/ln(10)', isolate: ['pH', 'pKa', 'A', 'HA'], difficulty: 4,
    conditions: ['HA > 0', 'A > 0'],
    hypotheses: 'Soluzione tampone formata da acido debole HA e base coniugata A-.',
    latex: '\\text{pH} = \\text{p}K_a + \\frac{\\ln([\\text{A}^-]/[\\text{HA}])}{\\ln(10)}',
  },

  // --- Elettrochimica ed Equazione di Nernst ---
  {
    id: 'nernst-generale', topic: 'chimica', name: 'equazione di Nernst (potenziale di cella)',
    formula: 'E = E0 - ((R*T)/(z*F))*ln(Q)', isolate: ['E', 'E0', 'R', 'T', 'z', 'F', 'Q'], difficulty: 5,
    conditions: ['z ≠ 0', 'F ≠ 0', 'Q > 0'],
    hypotheses: 'Potenziale di riduzione reale con quoziente di reazione Q e z elettroni scambiati.',
    latex: 'E = E_0 - \\frac{R \\cdot T}{z \\cdot F} \\cdot \\ln(Q)',
  },
  {
    id: 'nernst-298k', topic: 'chimica', name: 'equazione di Nernst a 25°C (298 K)',
    formula: 'E = E0 - (0.0257/z)*ln(Q)', isolate: ['E', 'E0', 'z', 'Q'], difficulty: 4,
    conditions: ['z ≠ 0', 'Q > 0'],
    hypotheses: 'Condizioni standard a 298.15 K con fattore RT/F = 0.0257 V.',
    latex: 'E = E_0 - \\frac{0.0257}{z} \\cdot \\ln(Q)',
  },
  {
    id: 'gibbs-fem', topic: 'chimica', name: 'relazione tra energia libera di Gibbs e f.e.m.',
    formula: 'Delta_G = -z*F*E', isolate: ['Delta_G', 'z', 'F', 'E'], difficulty: 3,
    conditions: ['z ≠ 0', 'F ≠ 0'],
    hypotheses: 'Lavoro elettrico reversibile in cella elettrochimica; F è la costante di Faraday.',
    latex: '\\Delta G = -z \\cdot F \\cdot E',
  },

  // --- Molarità, Soluzioni e Proprietà Colligative ---
  {
    id: 'molarita', topic: 'chimica', name: 'molarità (concentrazione molare)',
    formula: 'M = n/V', isolate: ['M', 'n', 'V'], difficulty: 2,
    conditions: ['V > 0'],
    hypotheses: 'n è il numero di moli di soluto, V il volume della soluzione in litri (o m³).',
    latex: 'M = \\frac{n}{V}',
  },
  {
    id: 'moli-massa-molare', topic: 'chimica', name: 'relazione tra moli e massa molare',
    formula: 'n = m/MM', isolate: ['n', 'm', 'MM'], difficulty: 2,
    conditions: ['MM > 0'],
    hypotheses: 'm è la massa del soluto, MM la sua massa molare.',
    latex: 'n = \\frac{m}{MM}',
  },
  {
    id: 'diluizione-soluzione', topic: 'chimica', name: 'legge di diluizione delle soluzioni',
    formula: 'M1*V1 = M2*V2', isolate: ['M1', 'V1', 'M2', 'V2'], difficulty: 3,
    conditions: ['M2 ≠ 0', 'V2 ≠ 0'],
    hypotheses: 'Aggiunta di solo solvente: la quantità di soluto disciolto si conserva.',
    latex: 'M_1 \\cdot V_1 = M_2 \\cdot V_2',
  },
  {
    id: 'molalita', topic: 'chimica', name: 'molalità della soluzione',
    formula: 'm_mol = n/m_solv', isolate: ['m_mol', 'n', 'm_solv'], difficulty: 2,
    conditions: ['m_solv > 0'],
    hypotheses: 'm_solv è la massa del solo solvente (in kg).',
    latex: 'm_{\\text{mol}} = \\frac{n}{m_{\\text{solv}}}',
  },
  {
    id: 'pressione-osmotica', topic: 'chimica', name: 'pressione osmotica (van \'t Hoff)',
    formula: 'Pi = i*M*R*T', isolate: ['Pi', 'i', 'M', 'R', 'T'], difficulty: 3,
    conditions: ['T > 0'],
    hypotheses: 'Soluzione diluita; i è il coefficiente di van \'t Hoff (fattore di ionizzazione).',
    latex: '\\Pi = i \\cdot M \\cdot R \\cdot T',
  },
  {
    id: 'legge-raoult', topic: 'chimica', name: 'legge di Raoult (tensione di vapore)',
    formula: 'P1 = x1*P0', isolate: ['P1', 'x1', 'P0'], difficulty: 2,
    conditions: ['0 ≤ x1 ≤ 1'],
    hypotheses: 'Soluzione ideale con soluto non volatile; P0 è la tensione di vapore del solvente puro.',
    latex: 'P_1 = x_1 \\cdot P_0',
  },
];
