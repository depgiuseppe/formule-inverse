// formulas.js — Libreria delle formule didattiche.
//
// Ogni voce:
//   id         : identificatore
//   topic      : argomento (cinematica, dinamica, ...)
//   name       : nome della grandezza espressa (cosa rappresenta il membro di sinistra)
//   formula    : stringa in sintassi dell'editor (es. "v = s/t")
//   isolate    : array di grandezze isolabili (per la scelta dell'obiettivo)
//   conditions : condizioni di validità iniziali (array di stringhe)
//   difficulty : 1..5
//   hypotheses : eventuali ipotesi fisiche (stringa)
//   notes      : note didattiche

import { FORMULAS_FISICA } from './formulas-fisica.js';

export const TOPICS = [
  'cinematica',
  'dinamica',
  'lavoro, energia e potenza',
  'quantità di moto e urti',
  'corpo rigido e gravitazione',
  'pressione e fluidostatica',
  'idrodinamica',
  'termologia',
  'termodinamica',
  'onde e acustica',
  'elettricità',
  'elettrostatica',
  'magnetostatica',
  'circuiti elettrici',
  'elettromagnetismo',
  'ottica',
  'relatività',
  'fisica moderna',
  'astrofisica',
  'chimica',
  'geometria',
  'proporzionalità',
  'algebra',
];

export const FORMULAS = [
  // --- CINEMATICA ---
  {
    id: 'v-st', topic: 'cinematica', name: 'velocità (moto uniforme)',
    formula: 'v = s/t', isolate: ['v', 's', 't'], difficulty: 1,
    conditions: ['t ≠ 0'],
    hypotheses: 'Moto rettilineo uniforme; t è l\'intervallo di tempo.',
    notes: 'Formula fondamentale del moto uniforme.',
  },
  {
    id: 's-vt', topic: 'cinematica', name: 'spazio percorso',
    formula: 's = v*t', isolate: ['s', 'v', 't'], difficulty: 1,
    conditions: [],
    notes: 'Prodotto diretto: le inverse richiedono una divisione.',
  },
  {
    id: 'a-dvdt', topic: 'cinematica', name: 'accelerazione',
    formula: 'a = (v - v0)/t', isolate: ['a', 'v', 'v0', 't'], difficulty: 2,
    conditions: ['t ≠ 0'],
    hypotheses: 'Moto uniformemente accelerato.',
  },
  {
    id: 'v-at', topic: 'cinematica', name: 'velocità (da accelerazione)',
    formula: 'v = v0 + a*t', isolate: ['v', 'v0', 'a', 't'], difficulty: 2,
    conditions: [],
  },
  {
    id: 's-half-at2', topic: 'cinematica', name: 'spazio (moto accelerato, da fermo)',
    formula: 's = 1/2*a*t^2', isolate: ['s', 'a', 't'], difficulty: 3,
    conditions: [],
    hypotheses: 'Velocità iniziale nulla.',
  },

  // --- DINAMICA ---
  {
    id: 'F-ma', topic: 'dinamica', name: 'forza (secondo principio)',
    formula: 'F = m*a', isolate: ['F', 'm', 'a'], difficulty: 1,
    conditions: [],
    notes: 'Seconda legge di Newton.',
  },
  {
    id: 'P-mg', topic: 'dinamica', name: 'forza peso',
    formula: 'P = m*g', isolate: ['P', 'm', 'g'], difficulty: 1,
    conditions: [],
    hypotheses: 'g ≈ 9,81 m/s² (accelerazione di gravità).',
  },
  {
    id: 'Fmu', topic: 'dinamica', name: 'forza di attrito',
    formula: 'Fa = mu*N', isolate: ['Fa', 'mu', 'N'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'F-el', topic: 'dinamica', name: 'forza elastica (Hooke)',
    formula: 'F = k*x', isolate: ['F', 'k', 'x'], difficulty: 2,
    conditions: [],
    hypotheses: 'Legge di Hooke, entro il limite di elasticità.',
  },

  // --- LAVORO, ENERGIA, POTENZA ---
  {
    id: 'L-Fs', topic: 'lavoro, energia e potenza', name: 'lavoro',
    formula: 'L = F*s', isolate: ['L', 'F', 's'], difficulty: 1,
    conditions: [],
  },
  {
    id: 'P-Lt', topic: 'lavoro, energia e potenza', name: 'potenza',
    formula: 'P = L/t', isolate: ['P', 'L', 't'], difficulty: 2,
    conditions: ['t ≠ 0'],
  },
  {
    id: 'Ec', topic: 'lavoro, energia e potenza', name: 'energia cinetica',
    formula: 'Ec = 1/2*m*v^2', isolate: ['Ec', 'm', 'v'], difficulty: 3,
    conditions: [],
    notes: 'Per ricavare v serve la radice quadrata e il segno ±.',
  },
  {
    id: 'Ep', topic: 'lavoro, energia e potenza', name: 'energia potenziale gravitazionale',
    formula: 'Ep = m*g*h', isolate: ['Ep', 'm', 'g', 'h'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'eta', topic: 'lavoro, energia e potenza', name: 'rendimento',
    formula: 'eta = Lu/Lt', isolate: ['eta', 'Lu', 'Lt'], difficulty: 2,
    conditions: ['Lt ≠ 0'],
  },

  // --- PRESSIONE E FLUIDOSTATICA ---
  {
    id: 'p-FS', topic: 'pressione e fluidostatica', name: 'pressione',
    formula: 'p = F/S', isolate: ['p', 'F', 'S'], difficulty: 1,
    conditions: ['S ≠ 0'],
  },
  {
    id: 'rho-mV', topic: 'pressione e fluidostatica', name: 'densità',
    formula: 'rho = m/V', isolate: ['rho', 'm', 'V'], difficulty: 2,
    conditions: ['V ≠ 0'],
  },
  {
    id: 'ph-rhoghh', topic: 'pressione e fluidostatica', name: 'pressione idrostatica (legge di Stevino)',
    formula: 'p = rho*g*h', isolate: ['p', 'rho', 'g', 'h'], difficulty: 2,
    conditions: [],
    hypotheses: 'Legge di Stevino: la pressione idrostatica dipende dalla densità del fluido, da g e dalla profondità h.',
    notes: 'Legge di Stevino per fluidi incomprimibili.',
    tags: ['stevino', 'stevin', 'idrostatica', 'pressione', 'fluido', 'liquido', 'profondita', 'colonna'],
  },
  {
    id: 'legge-archimede', topic: 'pressione e fluidostatica', name: 'spinta di Archimede (principio di Archimede)',
    formula: 'S = rho*g*V', isolate: ['S', 'rho', 'g', 'V'], difficulty: 3,
    conditions: [],
    hypotheses: 'Principio di Archimede: la spinta verso l\'alto è pari al peso del volume di fluido spostato.',
    notes: 'Principio di Archimede per corpi immersi in un fluido.',
    tags: ['archimede', 'spinta', 'galleggiamento', 'idrostatica', 'peso apparente', 'volume immerso', 'fluido', 'densita'],
  },

  // --- ELETTRICITÀ ---
  {
    id: 'V-RI', topic: 'elettricità', name: 'differenza di potenziale',
    formula: 'V = R*I', isolate: ['V', 'R', 'I'], difficulty: 1,
    conditions: [],
    notes: 'Prima legge di Ohm.',
  },
  {
    id: 'P-VI', topic: 'elettricità', name: 'potenza elettrica',
    formula: 'P = V*I', isolate: ['P', 'V', 'I'], difficulty: 1,
    conditions: [],
  },
  {
    id: 'I-qt', topic: 'elettricità', name: 'intensità di corrente',
    formula: 'I = q/t', isolate: ['I', 'q', 't'], difficulty: 2,
    conditions: ['t ≠ 0'],
  },
  {
    id: 'R-rhoLS', topic: 'elettricità', name: 'seconda legge di Ohm',
    formula: 'R = (rho*L)/S', isolate: ['R', 'rho', 'L', 'S'], difficulty: 3,
    conditions: ['S ≠ 0'],
  },
  {
    id: 'capacita', topic: 'elettricità', name: 'capacità di un condensatore piano',
    formula: 'C = (eps*S)/d', isolate: ['C', 'eps', 'S', 'd'], difficulty: 4,
    conditions: ['d ≠ 0'],
  },

  // --- TERMOLOGIA ---
  {
    id: 'Q-cmtd', topic: 'termologia', name: 'calore (equilibrio termico)',
    formula: 'Q = c*m*dT', isolate: ['Q', 'c', 'm', 'dT'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'dilatazione', topic: 'termologia', name: 'dilatazione lineare',
    formula: 'dl = lam*L0*dT', isolate: ['dl', 'lam', 'L0', 'dT'], difficulty: 3,
    conditions: [],
  },
  {
    id: 'gas-perfetti', topic: 'termologia', name: 'legge dei gas perfetti',
    formula: 'p*V = n*R*T', isolate: ['p', 'V', 'n', 'R', 'T'], difficulty: 4,
    conditions: [],
    hypotheses: 'Gas perfetto.',
  },

  // --- GEOMETRIA ---
  {
    id: 'A-bh', topic: 'geometria', name: 'area del rettangolo',
    formula: 'A = b*h', isolate: ['A', 'b', 'h'], difficulty: 1,
    conditions: [],
  },
  {
    id: 'C-2pir', topic: 'geometria', name: 'circonferenza',
    formula: 'C = 2*pi*r', isolate: ['C', 'r'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'A-pir2', topic: 'geometria', name: 'area del cerchio',
    formula: 'A = pi*r^2', isolate: ['A', 'r'], difficulty: 3,
    conditions: ['r ≥ 0'],
    notes: 'Per ricavare r serve la radice quadrata; r ≥ 0 per significato geometrico.',
  },
  {
    id: 'A-bh2', topic: 'geometria', name: 'area del triangolo',
    formula: 'A = (b*h)/2', isolate: ['A', 'b', 'h'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'V-prisma', topic: 'geometria', name: 'volume del parallelepipedo',
    formula: 'V = a*b*c', isolate: ['V', 'a', 'b', 'c'], difficulty: 2,
    conditions: [],
  },
  {
    id: 'pitagora', topic: 'geometria', name: 'teorema di Pitagora',
    formula: 'ip = sqrt(c1^2 + c2^2)', isolate: ['ip', 'c1', 'c2'], difficulty: 4,
    conditions: ['c1^2 + c2^2 ≥ 0'],
  },

  // --- PROPORZIONALITÀ ---
  {
    id: 'prop', topic: 'proporzionalità', name: 'proporzione',
    formula: 'a/b = c/d', isolate: ['a', 'b', 'c', 'd'], difficulty: 3,
    conditions: ['b ≠ 0', 'd ≠ 0'],
    notes: 'Ideale per la moltiplicazione incrociata e l\'inversione.',
  },
  {
    id: 'proporz-dir', topic: 'proporzionalità', name: 'proporzionalità diretta',
    formula: 'y = k*x', isolate: ['y', 'k', 'x'], difficulty: 1,
    conditions: [],
  },
  {
    id: 'proporz-inv', topic: 'proporzionalità', name: 'proporzionalità inversa',
    formula: 'y = k/x', isolate: ['y', 'k', 'x'], difficulty: 2,
    conditions: ['x ≠ 0'],
  },

  // --- ALGEBRA ---
  {
    id: 'alg-lin', topic: 'algebra', name: 'equazione lineare',
    formula: 'x + a = b', isolate: ['x'], difficulty: 2,
    conditions: [],
    notes: 'Esempio dei principi di equivalenza con termini additivi.',
  },
  {
    id: 'alg-prod', topic: 'algebra', name: 'prodotto',
    formula: 'a = b*c', isolate: ['a', 'b', 'c'], difficulty: 1,
    conditions: [],
  },
  {
    id: 'alg-distr', topic: 'algebra', name: 'equazione con parentesi',
    formula: 'a*(x + b) = c', isolate: ['x'], difficulty: 4,
    conditions: ['a ≠ 0'],
    notes: 'Richiede distribuzione o raccoglimento.',
  },
  {
    id: 'alg-quadrato', topic: 'algebra', name: 'quadrato',
    formula: 'y = a*x^2', isolate: ['y', 'a', 'x'], difficulty: 4,
    conditions: ['a ≠ 0'],
    notes: 'Per isolare x: divisione per a, poi radice quadrata con segno ±.',
  },
  {
    id: 'alg-multi', topic: 'algebra', name: 'formula a più fattori',
    formula: 'z = a*b/c', isolate: ['z', 'a', 'b', 'c'], difficulty: 3,
    conditions: ['c ≠ 0'],
  },

  // --- Formulario completo di Fisica (quinquennio): voci aggiuntive ---
  ...FORMULAS_FISICA,
];

// Indice per id
const BY_ID = Object.fromEntries(FORMULAS.map((f) => [f.id, f]));

export function getFormulaById(id) {
  return BY_ID[id] || null;
}

// Dizionario semantico di sinonimi, scienziati e argomenti per ricerca flessibile
const SEARCH_SYNONYMS = {
  stevino: ['stevino', 'stevin', 'idrostatica', 'pressione idrostatica', 'profondita', 'liquido', 'fluido', 'p0'],
  archimede: ['archimede', 'spinta', 'galleggiamento', 'galleggia', 'galleggiare', 'peso apparente', 'volume immerso', 'fluido'],
  suono: ['suono', 'acustica', 'sonoro', 'sonora', 'sonori', 'sonore', 'acustico', 'acustici', 'acustiche', 'doppler', 'eco', 'sonar', 'rumore', 'decibel', 'battimenti', 'canna d organo', 'canne d organo', 'corda vibrante', 'mersenne', 'frequenza', 'lunghezza d onda', 'onda sonora', 'onde sonore', 'velocita del suono'],
  acustica: ['suono', 'acustica', 'sonoro', 'sonora', 'doppler', 'eco', 'sonar', 'frequenza sonora', 'decibel'],
  doppler: ['doppler', 'effetto doppler', 'suono', 'sorgente in moto', 'osservatore in moto', 'ambulanza', 'sirena', 'frequenza percepita'],
  eco: ['eco', 'sonar', 'riflessione', 'suono', 'acustica', 'distanza ostacolo'],
  newton: ['newton', 'seconda legge', 'terza legge', 'dinamica', 'forza', 'gravitazione'],
  hooke: ['hooke', 'molla', 'elastica', 'elasticita', 'allungamento'],
  ohm: ['ohm', 'resistenza', 'resistivita', 'circuiti', 'differenza di potenziale'],
  coulomb: ['coulomb', 'elettrostatica', 'carica elettrica'],
  joule: ['joule', 'effetto joule', 'calore'],
  torricelli: ['torricelli', 'efflusso', 'caduta libera'],
  keplero: ['keplero', 'kepler', 'orbita', 'periodo orbitale', 'pianeti', 'vis-viva', 'velocita areale', 'semiasse'],
  snell: ['snell', 'rifrazione', 'ottica', 'indice di rifrazione'],
  bernoulli: ['bernoulli', 'idrodinamica', 'fluido in moto'],
  pascal: ['pascal', 'torchio idraulico', 'pistone'],
  lorentz: ['lorentz', 'relativita', 'forza di lorentz'],
  faraday: ['faraday', 'neumann', 'lenz', 'induzione', 'flusso magnetico'],
  ampere: ['ampere', 'biot savart', 'campo magnetico'],
  carnot: ['carnot', 'rendimento', 'macchina termica'],
  onda: ['onda', 'onde', 'propagazione', 'lunghezza d onda', 'frequenza', 'periodo', 'suono'],
  onde: ['onda', 'onde', 'propagazione', 'lunghezza d onda', 'frequenza', 'periodo', 'suono'],
  hubble: ['hubble', 'recessione', 'espansione', 'galassia', 'galassie', 'redshift', 'costante di hubble'],
  astrofisica: ['astrofisica', 'astronomia', 'stella', 'stelle', 'buco nero', 'schwarzschild', 'eddington', 'wien', 'stefan boltzmann'],
  diffrazione: ['diffrazione', 'reticolo', 'singola fenditura', 'rayleigh', 'frange', 'disco di airy'],
  interferenza: ['interferenza', 'young', 'doppia fenditura', 'lamine sottili', 'frangia', 'frange'],
  chimica: ['chimica', 'moli', 'molarita', 'gas ideali', 'van der waals', 'ph', 'poh', 'nernst', 'soluzione', 'tampone'],
  nernst: ['nernst', 'elettrodo', 'potenziale standard', 'elettrochimica', 'pila', 'redox', 'faraday'],
  ph: ['ph', 'poh', 'acido', 'base', 'dissociazione', 'ka', 'kb', 'kw', 'henderson', 'hasselbalch', 'tampone'],
  molarita: ['molarita', 'concentrazione', 'diluizione', 'molalita', 'soluzione', 'soluto', 'solvente'],
  gas: ['gas', 'gas perfetti', 'gas ideali', 'gas reali', 'van der waals', 'dalton', 'graham', 'effusione'],
};

const STOP_WORDS = new Set([
  'di', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'da', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
  'in', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'con', 'su', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
  'per', 'tra', 'fra', 'il', 'lo', 'la', 'i', 'gli', 'le',
  'un', 'uno', 'una', 'd', 'l'
]);

function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti/diacritici (es. velocità -> velocita)
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchCorpus(f) {
  const parts = [
    f.id || '',
    f.name || '',
    f.formula || '',
    f.topic || '',
    ...(f.isolate || []),
    f.hypotheses || '',
    f.notes || '',
    ...(f.tags || []),
    ...(f.aliases || []),
    ...(f.keywords || []),
  ];
  return normalizeText(parts.join(' '));
}

// Filtra per argomento, difficoltà e testo di ricerca con tolleranza semantica.
export function filterFormulas({ topic, search, difficulty } = {}) {
  const normSearch = normalizeText(search);
  const rawTokens = normSearch ? normSearch.split(' ').filter(Boolean) : [];
  const filteredTokens = rawTokens.filter((t) => !STOP_WORDS.has(t));
  const searchTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;

  const matchesFormula = (f) => {
    if (difficulty && String(f.difficulty) !== String(difficulty)) return false;

    if (searchTokens.length > 0) {
      const corpus = buildSearchCorpus(f);
      const allTokensMatch = searchTokens.every((token) => {
        if (corpus.includes(token)) return true;

        // Verifica sinonimi associati al token ricercato
        const synonyms = SEARCH_SYNONYMS[token];
        if (synonyms && synonyms.some((syn) => corpus.includes(normalizeText(syn)))) {
          return true;
        }

        // Verifica se il topic corrisponde
        if (token === 'suono' && (f.topic === 'onde e acustica' || f.topic === 'onde e suono' || corpus.includes('suono') || corpus.includes('acustic') || corpus.includes('doppler'))) {
          return true;
        }
        if (token === 'acustica' && (f.topic === 'onde e acustica' || f.topic === 'onde e suono' || corpus.includes('suono') || corpus.includes('acustic'))) {
          return true;
        }

        return false;
      });

      if (!allTokensMatch) return false;
    }
    return true;
  };

  // Se è specificato un argomento filtro:
  if (topic) {
    const inTopicList = FORMULAS.filter((f) => f.topic === topic && matchesFormula(f));
    // Se la ricerca testuale produce 0 risultati nel topic selezionato ma trova formule altrove,
    // esegui fallback globale per non bloccare l'utente su un dropdown impostato in precedenza
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

// Sceglie un esercizio casuale. Evita di chiedere di isolare una grandezza
// che è già da sola al primo membro "senza lavoro" solo quando non c'è altro:
// qui selezioniamo sempre un obiettivo che NON è banalmente isolato in partenza
// (tranne che per formule con un solo isolabile).
export function randomExercise() {
  const f = FORMULAS[Math.floor(Math.random() * FORMULAS.length)];
  // scegli un obiettivo isolabile
  const candidates = f.isolate.filter((v) => {
    // escludi se la grandezza è già da sola su un membro (forma l = var)
    return !formulaTriviallyIsolates(f.formula, v);
  });
  const pool = candidates.length ? candidates : f.isolate;
  const target = pool[Math.floor(Math.random() * pool.length)];
  return { id: f.id, target };
}

// Controllo euristico: la formula è già della forma "<var> = ..." per quella var?
function formulaTriviallyIsolates(formulaStr, v) {
  const m = formulaStr.split('=');
  if (m.length !== 2) return false;
  const left = m[0].trim();
  return left === v;
}

// Esercizi raggruppati per livello di difficoltà (per la pratica progressiva).
// Ritorna { 1: [{formula, target}, ...], 2: [...], ... }
export function exercisesByLevel() {
  const levels = {};
  for (const f of FORMULAS) {
    const lvl = f.difficulty || 1;
    if (!levels[lvl]) levels[lvl] = [];
    for (const t of f.isolate) {
      levels[lvl].push({ formula: f, target: t });
    }
  }
  return levels;
}

// Numero totale di esercizi disponibili (una coppia formula+obiettivo ciascuno).
export function totalExerciseCount() {
  return FORMULAS.reduce((sum, f) => sum + f.isolate.length, 0);
}
