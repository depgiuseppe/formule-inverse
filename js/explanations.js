// explanations.js — Spiegazioni didattiche associate alle regole.
//
// Ogni voce fornisce:
//   nome        : nome della regola (per il pannello C)
//   intuitiva   : spiegazione intuitiva
//   principio   : principio di equivalenza da cui deriva
//   perche      : perché la trasformazione è corretta
//   attenzione  : condizioni di validità / avvertenze (array o stringa)

export const EXPLANATIONS = {
  'add-both': {
    nome: 'Aggiunta della stessa quantità a entrambi i membri',
    intuitiva:
      'Se due quantità sono uguali, aggiungendo la stessa cosa sia a destra che a sinistra l\'uguaglianza resta vera. È come mettere lo stesso peso su entrambi i piatti di una bilancia in equilibrio: la bilancia resta in equilibrio.',
    principio: 'Primo principio di equivalenza: se A = B allora A + C = B + C.',
    perche:
      'L\'operazione viene eseguita su ENTRAMBI i membri con la stessa quantità C, quindi i due membri restano uguali.',
    attenzione: [],
  },

  'sub-both': {
    nome: 'Sottrazione della stessa quantità da entrambi i membri',
    intuitiva:
      'Se togli la stessa quantità da entrambi i piatti di una bilancia in equilibrio, l\'equilibrio non cambia.',
    principio: 'Primo principio di equivalenza: se A = B allora A − C = B − C.',
    perche:
      'La stessa quantità C è sottratta a entrambi i membri: l\'uguaglianza è preservata.',
    attenzione: [
      'Questa è la giustificazione corretta del cosiddetto "trasporto con cambiamento di segno": non sposti fisicamente il termine, sommi il suo opposto a entrambi i membri.',
    ],
  },

  'mul-both': {
    nome: 'Moltiplicazione di entrambi i membri per la stessa quantità',
    intuitiva:
      'Moltiplicare entrambi i membri per lo stesso numero è come ingrandire (o ridurre) allo stesso modo entrambi i piatti della bilancia: l\'uguaglianza resta.',
    principio: 'Secondo principio di equivalenza: se A = B allora A·C = B·C.',
    perche:
      'Entrambi i membri sono moltiplicati per la stessa quantità C, quindi restano uguali.',
    attenzione: [
      'Moltiplicare per 0 è lecito ma distrugge l\'informazione (si ottiene 0 = 0): non è utile, perciò l\'app lo impedisce.',
    ],
  },

  'div-both': {
    nome: 'Divisione di entrambi i membri per la stessa quantità',
    intuitiva:
      'Dividere entrambi i membri per la stessa quantità non nulla riduce allo stesso modo i due piatti: l\'uguaglianza resta.',
    principio: 'Secondo principio di equivalenza: se A = B e C ≠ 0 allora A/C = B/C.',
    perche:
      'La stessa divisione per C ≠ 0 è applicata a entrambi i membri. La condizione C ≠ 0 è essenziale: non si divide per zero.',
    attenzione: [
      'La condizione C ≠ 0 deve essere esplicitata. Se C è una variabile, va dichiarata diversa da zero (o si discussi il caso C = 0 separatamente).',
    ],
  },

  'move-term': {
    nome: 'Trasporto di un termine additivo (cambiamento di segno)',
    intuitiva:
      'Un termine che è aggiunto ("+a") può passare dall\'altra parte "cambiando segno" ("−a") perché togli "a" da entrambi i membri.',
    principio: 'Primo principio di equivalenza (somma dell\'opposto a entrambi i membri).',
    perche:
      'Portare un termine dall\'altra parte NON è uno spostamento fisico: equivale a sommare l\'opposto del termine a entrambi i membri.',
    attenzione: [
      'Vale SOLO per termini additivi (ognuno preceduto da + o −), non per i fattori che moltiplicano l\'intero membro.',
    ],
  },

  'move-factor': {
    nome: 'Trasporto di un fattore (divisione per il fattore)',
    intuitiva:
      'Un fattore che moltiplica tutto un membro può "passare dall\'altra parte" come divisore: è la stessa idea del "trasporto di fattori".',
    principio: 'Secondo principio di equivalenza (divisione di entrambi i membri per il fattore).',
    perche:
      'Dividiamo entrambi i membri per lo stesso fattore. Serve che il fattore sia diverso da zero.',
    attenzione: [
      'Puoi trasportare solo fattori che moltiplicano l\'INTERO membro: non i termini di una somma.',
      'La condizione di validità richiede che il fattore sia ≠ 0.',
    ],
  },

  'cross-multiply': {
    nome: 'Moltiplicazione incrociata (proporzioni)',
    intuitiva:
      'In una proporzione a/b = c/d "i prodotti in croce" sono uguali: a·d = b·c. Si ottiene moltiplicando entrambi i membri per b·d.',
    principio: 'Secondo principio di equivalenza, moltiplicando per il prodotto dei denominatori.',
    perche:
      'Moltiplicando entrambi i membri per b·d (≠ 0) le frazioni si semplificano e restano i prodotti in croce.',
    attenzione: [
      'Si applica SOLO se entrambi i membri sono frazioni (rapporti).',
      'Richiede denominatori non nulli: b ≠ 0 e d ≠ 0.',
    ],
  },

  'swap-sides': {
    nome: 'Scambio dei membri (proprietà simmetrica)',
    intuitiva: 'L\'uguaglianza è simmetrica: se "una cosa = un\'altra", vale anche il contrario.',
    principio: 'Proprietà simmetrica dell\'uguaglianza: se A = B allora B = A.',
    perche: 'Non cambia il contenuto informativo, solo l\'ordine con cui si leggono i due membri.',
    attenzione: [
      'Da non confondere con l\'inversione di una frazione (scambio tra numeratore e denominatore) né con il cambiamento di segno di un termine.',
    ],
  },

  'reciprocal-both': {
    nome: 'Reciproco di entrambi i membri',
    intuitiva: 'Se due quantità non nulle sono uguali, anche i loro reciproci sono uguali (riempi "1 diviso" su entrambi i lati).',
    principio: 'Si applica la funzione reciproco x ↦ 1/x (definita per x ≠ 0) a entrambi i membri.',
    perche: 'La funzione reciproco è iniettiva sul dominio dei numeri non nulli: applicata a entrambi i membri conserva l\'uguaglianza.',
    attenzione: ['Richiede che entrambi i membri siano ≠ 0.'],
  },

  'invert-proportion': {
    nome: 'Inversione di una proporzione',
    intuitiva: 'In una proporzione puoi scambiare numeratore e denominatore, purché lo faccia su ENTRAMBI i rapporti.',
    principio: 'Applicazione della proprietà: se a/b = c/d con a,b,c,d ≠ 0 allora b/a = d/c.',
    perche: 'Equivale a prendere il reciproco di entrambi i membri, che sono rapporti non nulli.',
    attenzione: [
      'NON si inverte mai un solo membro: si perderebbe l\'uguaglianza.',
      'Servono condizioni di non nullità su tutti i numeratori e denominatori.',
    ],
  },

  'sqrt-both': {
    nome: 'Estrazione di una radice di indice PARI di entrambi i membri',
    intuitiva: 'Se x² = k (o più in generale x^(2m) = k), allora x è una radice di indice pari di k — ma con DUE possibilità di segno, perché sia x sia −x, elevati a un esponente pari, danno lo stesso k.',
    principio: 'Applicazione a entrambi i membri della radice di indice pari n = 2m (definita per radicandi ≥ 0 nel campo reale), ricordando che ⁿ√(xⁿ) = |x| quando n è pari.',
    perche: 'Poiché ⁿ√(xⁿ) = |x| = ±x per n pari, la soluzione corretta include sia il segno + sia il segno −: il segno ± non va eliminato.',
    attenzione: [
      'Indice PARI: il radicando deve essere ≥ 0 (nel campo reale): condizione necessaria.',
      'Il segno ± è matematicamente necessario: non va soppresso.',
      'Se la quantità cercata è per sua natura positiva (lunghezza, massa, tempo, una frequenza, …), scegli il segno + per eliminare l\'ambiguità: la scelta va motivata in base al significato fisico.',
    ],
  },

  'root-odd': {
    nome: 'Estrazione di una radice di indice DISPARI (es. cubica) di entrambi i membri',
    intuitiva: 'Se x³ = k, allora x = ∛k. Una radice di indice dispari è definita per OGNI valore di k, positivo o negativo, e restituisce un solo risultato.',
    principio: 'Applicazione della funzione radice n-esima con n dispari (definita su tutto ℝ) a entrambi i membri: se A = B allora ⁿ√A = ⁿ√B.',
    perche: 'La funzione radice di indice dispari è strettamente crescente e iniettiva su ℝ: conserva l\'uguaglianza e non introduce ambiguità di segno.',
    attenzione: [
      'Indice DISPARI: NESSUNA condizione di segno, il radicando può essere positivo, negativo o nullo.',
      'NON si introduce il segno ±: la radice di indice dispari è unica.',
    ],
  },

  'pow-both': {
    nome: 'Elevazione di entrambi i membri a una potenza',
    intuitiva: 'Se due quantità sono uguali, elevandole allo stesso esponente restano uguali.',
    principio: 'Se A = B allora A^n = B^n.',
    perche: 'La potenza con esponente fisso è una funzione ben definita: applicarla a entrambi i membri conserva l\'uguaglianza.',
    attenzione: [
      'Elevare a un esponente PARI non è iniettivo: può introdurre soluzioni estranee (ad es. da x = 3 si ottiene x² = 9, che ammette anche x = −3).',
      'Le soluzioni trovate vanno quindi sempre ricontrollate.',
    ],
  },

  'distribute': {
    nome: 'Proprietà distributiva',
    intuitiva: 'Un fattore che moltiplica una somma si può "distribuire" su ciascun addendo: a(x + b) = ax + ab.',
    principio: 'Proprietà distributiva del prodotto rispetto alla somma.',
    perche: 'È un\'identità algebrica: vale per ogni valore delle lettere, senza condizioni aggiuntive.',
    attenzione: [],
  },

  'factor-common': {
    nome: 'Raccoglimento a fattor comune',
    intuitiva: 'Se tutti i termini hanno un fattore in comune, puoi "raccoglierlo": ax + ab = a(x + b).',
    principio: 'Procedimento inverso della proprietà distributiva.',
    perche: 'Raccogliere è l\'operazione inversa del distribuire: il risultato è identicamente uguale.',
    attenzione: [
      'Il fattore raccolto deve comparire in TUTTI i termini del membro.',
    ],
  },

  'cancel-factor': {
    nome: 'Cancellazione di un fattore comune tra frazione e prodotto',
    intuitiva: 'Se una frazione A/B è moltiplicata per lo stesso fattore B, il fattore B "si cancella" tra numeratore e denominatore e resta A: (A/B)·B = A.',
    principio: 'Semplificazione di un fattore comune: (A/B)·B = A·(B/B) = A, lecita purché B ≠ 0.',
    perche: 'Il fattore B compare sia al denominatore della frazione sia come fattore esterno; il loro rapporto è B/B = 1 (con B ≠ 0). È la stessa idea della moltiplicazione incrociata in una proporzione.',
    attenzione: [
      'La semplificazione è lecita SOLO se il fattore cancellato è ≠ 0.',
      'Attenzione: si può cancellare un fattore con un fattore (un prodotto), MAI un fattore con un termine di una somma.',
    ],
  },

  'invert-function': {
    nome: 'Applicazione della funzione inversa a entrambi i membri',
    intuitiva: 'Se una funzione è applicata a una quantità (per esempio sin(θ) o ln(x)), per "liberare" l\'argomento si applica la funzione inversa a ENTRAMBI i membri: da sin(θ) = k segue θ = sin⁻¹(k). È lo stesso principio del trasporto, ma con le funzioni al posto di +, −, ·, /.',
    principio: 'Se A = B e f è una funzione iniettiva sul ramo considerato, allora f⁻¹(A) = f⁻¹(B).',
    perche: 'La funzione inversa "annulla" l\'effetto della funzione: f⁻¹(f(x)) = x sul ramo principale. La funzione deve essere iniettiva su quel ramo, altrimenti la soluzione non è unica.',
    attenzione: [
      'La funzione deve essere invertibile sul ramo considerato: sin, cos, tan e ln lo sono solo su un opportuno intervallo (ramo principale).',
      'L\'argomento della funzione inversa deve appartenere al dominio: per sin⁻¹ e cos⁻¹ serve un valore in [−1, 1]; per ln l\'argomento deve essere > 0.',
      'L\'inversa restituisce la soluzione nel RAMO PRINCIPALE. Poiché le funzioni trigonometriche sono periodiche, possono esistere altre soluzioni: vanno discusse separatamente.',
    ],
  },
};

// Spiegazione per una mossa non valida: messaggi chiari e non punitivi.
export const INVALID_EXPLANATIONS = {
  'cancel-additive':
    'Non puoi semplificare un fattore con un termine di una somma. In (x + 3)/x il termine "x + 3" è una SOMMA, non un prodotto: "x" non è un fattore dell\'intero numeratore. Potresti eventualmente riscrivere il numeratore come somma di frazioni (x/x + 3/x), mantenendo la condizione x ≠ 0.',
  'divide-by-unknown':
    'Hai provato a dividere per una variabile senza garantire che sia diversa da zero. Prima devi esplicitare la condizione di validità (ad es. b ≠ 0), oppure discutere separatamente il caso in cui quella variabile sia zero.',
  'invert-one-side':
    'Hai invertito un solo membro: l\'uguaglianza non è più valida. L\'inversione (numeratore ↔ denominatore) va fatta su ENTRAMBI i membri.',
  'drop-pm':
    'Il segno ± non può essere eliminato quando risolvi x² = a: sia x = +√a sia x = −√a soddisfano l\'equazione. Sopprimerlo significa perdere una soluzione.',
  'cancel-nullable':
    'Hai semplificato un fattore che potrebbe essere nullo. La semplificazione è lecita solo sotto la condizione che quel fattore sia ≠ 0: specifica la condizione o discuti il caso a parte.',
  'cross-not-proportion':
    'Non puoi applicare la moltiplicazione incrociata: l\'espressione non è una proporzione (entrambi i membri non sono rapporti). La regola "in croce" vale solo per a/b = c/d.',
  'sqrt-domain':
    'Non puoi estrarre la radice quadrata se il radicando può essere negativo nel campo reale. Aggiungi la condizione radicando ≥ 0.',
  'inverse-domain':
    'Non puoi applicare la funzione inversa così: l\'argomento deve appartenere al dominio dell\'inversa. Per sin⁻¹ e cos⁻¹ serve un valore in [−1, 1]; per ln serve un argomento > 0.',
  'inverse-not-injective':
    'La funzione non è invertibile su tutto il suo dominio: sin, cos e tan lo sono solo su un ramo principale. Applicando l\'inversa si ottiene la soluzione in quel ramo, ma possono esistere altre soluzioni (periodicità).',
  'plausible-but-wrong':
    'Attenzione: una formula che "sembra giusta" non è necessariamente equivalente. L\'app verifica la trasformazione simbolicamente, non solo l\'aspetto.',
  'syntax':
    'La formula contiene un errore di sintassi o un elemento non supportato. Controlla l\'espressione inserita.',
  'zero-denominator':
    'La formula contiene un denominatore identicamente nullo: non è una formula valida.',
};

export function getExplanation(key) {
  return EXPLANATIONS[key] || null;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Compositore del pannello "Regola applicata" (area C).
// Riceve l'id della regola e i dati del passaggio:
//   { beforeText, afterText, steps, conditions, note }
// ---------------------------------------------------------------------------
export function buildRulePanel(ruleId, data = {}) {
  const { beforeText = '', afterText = '', steps = [], conditions, note } = data;
  const ex = EXPLANATIONS[ruleId];
  if (!ex) {
    return {
      title: 'Trasformazione applicata',
      html: `<dl class="rule-dl">
        ${beforeText ? `<dt>Prima</dt><dd class="math-line">${escapeHtml(beforeText)}</dd>` : ''}
        ${afterText ? `<dt>Dopo</dt><dd class="math-line">${escapeHtml(afterText)}</dd>` : ''}
      </dl>`,
    };
  }
  const cond = (conditions && conditions.length ? conditions : ex.attenzione) || [];
  const condList = cond.filter(Boolean);

  return {
    title: ex.nome,
    html: `
      <dl class="rule-dl">
        <dt>Regola</dt>
        <dd>${escapeHtml(ex.nome)}</dd>

        ${beforeText ? `<dt>Prima</dt>
        <dd class="math-line">${escapeHtml(beforeText)}</dd>` : ''}

        ${steps && steps.length ? `<dt>Operazione</dt>
        <dd class="math-line">${steps.map((s) => escapeHtml(s)).join('<br>')}</dd>` : ''}

        ${afterText ? `<dt>Dopo</dt>
        <dd class="math-line">${escapeHtml(afterText)}</dd>` : ''}

        <dt>Spiegazione</dt>
        <dd>${escapeHtml(ex.intuitiva)}</dd>

        <dt>Principio di equivalenza</dt>
        <dd>${escapeHtml(ex.principio)}</dd>

        <dt>Perché è corretto</dt>
        <dd>${escapeHtml(ex.perche)}</dd>

        <dt>Condizioni di validità</dt>
        <dd>${condList.length ? condList.map((c) => escapeHtml(c)).join('<br>') : 'nessuna condizione particolare'}</dd>
      </dl>
      ${note ? `<p class="rule-note">${escapeHtml(note)}</p>` : ''}
    `,
  };
}
