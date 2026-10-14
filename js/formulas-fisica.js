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
    formula: 'x = x0 + v0*t + (1/2)*a*t^2', isolate: ['x', 'x0', 'v0', 'a', 't'], difficulty: 4,
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
    formula: 's = ((v0 + v)/2)*t', isolate: ['s', 'v0', 'v', 't'], difficulty: 3,
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
    formula: 'theta = theta0 + omega0*t + (1/2)*alpha*t^2', isolate: ['theta', 'theta0', 'omega0', 'alpha', 't'], difficulty: 5,
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
  {
    id: 'piano-accel-attrito', topic: 'dinamica', name: 'accelerazione in discesa (con attrito)',
    formula: 'a = g*(sin(theta) - mu*cos(theta))', isolate: ['a', 'g', 'theta', 'mu'], difficulty: 4,
    conditions: [],
    hypotheses: 'Piano inclinato con attrito dinamico.',
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
    formula: 'W = (1/2)*m*v^2 - (1/2)*m*v0^2', isolate: ['W', 'm', 'v', 'v0'], difficulty: 4,
    conditions: [],
  },
  {
    id: 'Uel', topic: 'lavoro, energia e potenza', name: 'energia potenziale elastica',
    formula: 'U = (1/2)*k*x^2', isolate: ['U', 'k', 'x'], difficulty: 3,
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
    formula: 'Ec = (1/2)*I*omega^2', isolate: ['Ec', 'I', 'omega'], difficulty: 3,
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
    id: 'stevino', topic: 'pressione e fluidostatica', name: 'legge di Stevino',
    formula: 'p = p0 + rho*g*h', isolate: ['p', 'p0', 'rho', 'g', 'h'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'pascal', topic: 'pressione e fluidostatica', name: 'principio di Pascal (torchio idraulico)',
    formula: 'F1/A1 = F2/A2', isolate: ['F1', 'A1', 'F2', 'A2'], difficulty: 3,
    conditions: ['A1 ≠ 0', 'A2 ≠ 0'],
  },
  {
    id: 'galleggia', topic: 'pressione e fluidostatica', name: 'condizione di galleggiamento',
    formula: 'rho_corpo/rho_fluido = V_imm/V_tot', isolate: ['rho_corpo', 'rho_fluido', 'V_imm', 'V_tot'], difficulty: 4,
    conditions: ['rho_fluido ≠ 0', 'V_tot ≠ 0'],
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
    formula: 'p + (1/2)*rho*v^2 + rho*g*z = cost', isolate: ['p', 'rho', 'v', 'g', 'z', 'cost'], difficulty: 5,
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
    formula: 'U = (f/2)*n*R*T', isolate: ['U', 'f', 'n', 'R', 'T'], difficulty: 4,
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
    formula: 'U = (1/2)*C*V^2', isolate: ['U', 'C', 'V'], difficulty: 4,
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
    formula: 'Req = (R1*R2)/(R1 + R2)', isolate: ['Req', 'R1', 'R2'], difficulty: 3,
    conditions: ['R1 + R2 ≠ 0'],
  },
  {
    id: 'condensatori-parallelo', topic: 'circuiti elettrici', name: 'condensatori in parallelo',
    formula: 'Ceq = C1 + C2', isolate: ['Ceq', 'C1', 'C2'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'condensatori-serie', topic: 'circuiti elettrici', name: 'condensatori in serie',
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
    formula: 'U = (1/2)*L*I^2', isolate: ['U', 'L', 'I'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'densita-energia', topic: 'elettromagnetismo', name: 'densità di energia del campo elettrico',
    formula: 'u = (1/2)*eps0*E^2', isolate: ['u', 'eps0', 'E'], difficulty: 4,
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
];
