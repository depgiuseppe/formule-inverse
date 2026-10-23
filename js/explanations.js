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
      'Vale SOLO per termini additivi liberi (ognuno preceduto da + o − al livello del membro), mai per fattori moltiplicativi.',
      'Non puoi trasportare direttamente un addendo racchiuso dentro una parentesi moltiplicata o bloccato al numeratore di una frazione: devi prima liberare la parentesi o eliminare il denominatore.',
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
      'Puoi trasportare solo fattori che moltiplicano l\'INTERO membro: MAI i singoli termini di una somma.',
      'La condizione di validità richiede che il fattore sia ≠ 0 (la divisione per zero non è definita).',
      'Confusione comune: non cambiare il segno di un fattore quando lo porti al denominatore! Il cambio di segno vale solo per il 1° principio (addendi).',
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
    attenzione: [
      'Richiede che entrambi i membri siano ≠ 0.',
      'Attenzione all\'errore classico: il reciproco di una somma NON è la somma dei reciproci! 1/(A + B) ≠ 1/A + 1/B.',
      'Se un membro contiene una somma di frazioni (come 1/R₁ + 1/R₂), calcola PRIMA il minimo comune multiplo (m.c.m.) per ridurla a un\'unica frazione, e SOLO DOPO applica il reciproco.',
    ],
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
      'Attenzione fondamentale: si può cancellare un fattore con un fattore (un prodotto), MAI un addendo di una somma con il denominatore! In (x + y)/x la x non è un fattore comune.',
    ],
  },

  'common-denom': {
    nome: 'Minimo comune multiplo (m.c.m.) e denominatore comune',
    intuitiva:
      'Per sommare o sottrarre frazioni con denominatori diversi, bisogna prima portarle allo stesso denominatore comune (m.c.m.). Una volta che le frazioni hanno lo stesso denominatore, puoi sommare i numeratori ottenendo un\'unica frazione su cui è possibile applicare il reciproco o la moltiplicazione incrociata.',
    principio:
      'Proprietà invariantiva delle frazioni (moltiplicando numeratore e denominatore per una stessa quantità non nulla il valore non cambia): A/B + C/D = (A·D)/(B·D) + (B·C)/(B·D) = (A·D + B·C)/(B·D).',
    perche:
      'Non si possono sommare direttamente parti frazionarie eterogenee: il denominatore comune esprime ciascun termine nella stessa partizione, rendendo i numeratori direttamente sommabili in un unico rapporto.',
    attenzione: [
      'Passo fondamentale prima della regola dei reciproci: se hai 1/R = 1/R₁ + 1/R₂, NON puoi invertire i singoli addendi (R ≠ R₁ + R₂)! Devi prima calcolare il denominatore comune.',
      'Tutti i denominatori devono essere non nulli (condizioni di esistenza).',
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

// ---------------------------------------------------------------------------
// Modelli pedagogici degli errori più frequenti degli studenti (Misconceptions)
// ---------------------------------------------------------------------------
export const STUDENT_MISCONCEPTIONS = {
  'illegal-sum-cancellation': {
    id: 'illegal-sum-cancellation',
    titolo: 'Cancellazione illecita su una somma (Somma vs Prodotto)',
    badge: 'Semplificazione Illecita (Somma vs Prodotto)',
    principio: 'Proprietà distributiva della divisione: (A + B)/C = A/C + B/C ≠ A + B/C.',
    spiegazione:
      'Non puoi semplificare un termine che fa parte di una somma con il denominatore. In algebra si possono semplificare solo fattori che moltiplicano l\'INTERO numeratore e l\'INTERO denominatore, MAI singoli addendi!',
    controesempio:
      'Considera numeri semplici: (2 + 6)/2 = 8/2 = 4. Se cancellassi il "2" tra numeratore e denominatore otterresti 6 (oppure 1 + 6 = 7), entrambi palesemente errati! La frazione significa (2/2) + (6/2) = 1 + 3 = 4.',
    come_risolvere:
      'Per semplificare, raccogli prima il fattore comune a TUTTI i termini del numeratore (es. (2·a + 2·b)/2 = 2·(a + b)/2 = a + b), oppure separa la frazione nella somma di due frazioni distinte.',
    regola_guida:
      'Si semplificano solo fattori di prodotti (a·b/a = b), MAI addendi di somme ((a + b)/a ≠ b)!',
  },

  'missing-common-denom-reciprocal': {
    id: 'missing-common-denom-reciprocal',
    titolo: 'Mancato denominatore comune prima del reciproco',
    badge: 'Frazioni e Reciproci (m.c.m. necessario)',
    principio: 'Non linearità del reciproco: 1/(A + B) ≠ 1/A + 1/B.',
    spiegazione:
      'Il reciproco di una somma NON è la somma dei reciproci! Applicare la regola dei reciproci termine a termine (pensando che 1/R₁ + 1/R₂ diventi R₁ + R₂) è un errore concettuale grave.',
    controesempio:
      'Esempio numerico: 1/2 + 1/2 = 1 (il cui reciproco è 1). Se capovolgessi i singoli addendi otterresti 2 + 2 = 4, che è quattro volte il risultato corretto! Nella formula dei resistori in parallelo: 1/Req = 1/R1 + 1/R2 non dà affatto Req = R1 + R2.',
    come_risolvere:
      'Calcola prima il minimo comune multiplo (m.c.m.) per sommare le frazioni in un unico rapporto: 1/R₁ + 1/R₂ = (R₂ + R₁)/(R₁·R₂). Solo quando entrambi i membri sono frazioni singole puoi capovolgerli con la regola dei reciproci: Req = (R₁·R₂)/(R₁ + R₂).',
    regola_guida:
      'Usa il tasto "🧮 Denominatore comune (m.c.m.)" per unire le frazioni prima di applicare il reciproco!',
  },

  'invalid-transposition-factor-as-term': {
    id: 'invalid-transposition-factor-as-term',
    titolo: 'Trasporto errato di un fattore con cambio di segno (confusione 1° e 2° principio)',
    badge: '1° vs 2° Principio (Fattori vs Addendi)',
    principio: 'Secondo principio di equivalenza (divisione per grandezze moltiplicate).',
    spiegazione:
      'Hai provato a spostare una grandezza moltiplicativa cambiando segno (+ ↔ −). Il cambio di segno vale solo per gli addendi sommati o sottratti (1° principio), non per grandezze legate da moltiplicazione!',
    controesempio:
      'In F = m·a, se sottraessi "a" otterresti F − a = m·a − a, non m isolata. In 3·x = 12, sottraendo 3 otterresti 3x − 3 = 9, non x = 9. La soluzione corretta è x = 12/3 = 4.',
    come_risolvere:
      'Per annullare una moltiplicazione devi applicare l\'operazione inversa: dividi entrambi i membri per quel fattore (2° principio). Trascinalo sotto la linea di frazione del membro opposto.',
    regola_guida:
      'I termini sommati si trasportano cambiando segno (+ ↔ −), i fattori moltiplicati si trasportano dividendo (· ↔ /)!',
  },

  'invalid-transposition-term-as-factor': {
    id: 'invalid-transposition-term-as-factor',
    titolo: 'Tentativo di dividere per un addendo di una somma',
    badge: '1° vs 2° Principio (Addendi vs Fattori)',
    principio: 'Primo principio di equivalenza (trasporto con cambiamento di segno).',
    spiegazione:
      'Non puoi dividere per una grandezza che fa parte di una somma con altri termini. La divisione agisce sull\'INTERO membro: dividere solo un pezzo violerebbe l\'uguaglianza.',
    controesempio:
      'In v = v₀ + a·t, se dividessi per v₀ otterresti v/v₀ = 1 + (a·t)/v₀, non a·t isolata! In x + 5 = 10, dividendo per 5 avresti x/5 + 1 = 2, non x = 2.',
    come_risolvere:
      'Trascina l\'addendo nello slot ± accanto al membro opposto per trasportarlo con cambio di segno (+v₀ diventa −v₀): v − v₀ = a·t. Solo quando la variabile moltiplicata è isolata potrai dividere per i suoi fattori.',
    regola_guida:
      'Se una grandezza è sommata, spostala all\'altro membro cambiando segno con il 1° principio!',
  },

  'invalid-transposition-parenthesis-blocked': {
    id: 'invalid-transposition-parenthesis-blocked',
    titolo: 'Addendo bloccato dentro parentesi moltiplicate',
    badge: 'Precedenza Operazioni (Parentesi moltiplicate)',
    principio: 'Gerarchia delle operazioni e proprietà distributiva k·(A + B) = k·A + k·B.',
    spiegazione:
      'Non puoi trasportare direttamente un termine racchiuso tra parentesi moltiplicate per un fattore esterno (es. "v₀" in F = k·(v − v₀)). La moltiplicazione esterna vincola tutti i termini all\'interno.',
    controesempio:
      'In 2·(x + 3) = 10, se spostassi il 3 come 10 − 3 = 7 otterresti 2x = 7 (x = 3.5), mentre l\'equazione originale è verificata per x = 2 (infatti 2·(2 + 3) = 10)!',
    come_risolvere:
      'Hai due opzioni lecite: ① dividere prima entrambi i membri per il fattore moltiplicativo esterno (liberando la parentesi), oppure ② applicare la proprietà distributiva per sciogliere la parentesi e poi trasportare il termine.',
    regola_guida:
      'Prima libera la parentesi dividendo per il fattore esterno o distribuendo, poi trasporta i singoli addendi!',
  },

  'invalid-transposition-fraction-blocked': {
    id: 'invalid-transposition-fraction-blocked',
    titolo: 'Addendo bloccato al numeratore di una frazione',
    badge: 'Precedenza Operazioni (Linea di frazione)',
    principio: 'La linea di frazione funge da parentesi: (A + B)/C.',
    spiegazione:
      'Non puoi trasportare con cambio di segno un termine che si trova al numeratore di una frazione (es. "s₀" in v = (s − s₀)/t). L\'intero numeratore è vincolato dalla divisione per il denominatore.',
    controesempio:
      'In (x + 6)/2 = 5, se trasportassi il 6 otterresti x/2 = 5 − 6 = −1 (x = −2), mentre moltiplicando prima per 2 si ha x + 6 = 10 → x = 4!',
    come_risolvere:
      'Elimina prima il denominatore moltiplicando entrambi i membri per esso (2° principio): v·t = s − s₀. Successivamente potrai trasportare il termine con il 1° principio.',
    regola_guida:
      'Trascina prima il denominatore all\'altro membro per moltiplicare, poi trasporta l\'addendo con cambio di segno!',
  },

  'invalid-transposition-same-side': {
    id: 'invalid-transposition-same-side',
    titolo: 'Spostamento all\'interno dello stesso membro',
    badge: 'Principi di Equivalenza (Ambo i membri)',
    principio: 'Definizione di equazione: uguaglianza tra due membri.',
    spiegazione:
      'La regola del trasporto e i principi di equivalenza servono a trasferire quantità da un piatto all\'altro della bilancia (oltre l\'uguale). Muovere un elemento all\'interno dello stesso piatto non applica i principi di equivalenza.',
    controesempio:
      'Spostare una grandezza al denominatore dello stesso membro trasformerebbe A in 1/A senza modificare l\'altro membro: l\'uguaglianza non sarebbe più vera.',
    come_risolvere:
      'Trascina la grandezza oltre il segno di uguale (=), rilasciandola sul membro opposto (sotto la frazione per dividere o nello slot ± per trasportare il termine).',
    regola_guida:
      'Trascina sempre la grandezza oltre l\'uguale (=) per operare sul membro opposto!',
  },

  'invalid-transposition-sign-error': {
    id: 'invalid-transposition-sign-error',
    titolo: 'Mancato cambiamento di segno nel trasporto',
    badge: '1° Principio (Regola dei Segni)',
    principio: 'Primo principio di equivalenza (somma dell\'opposto).',
    spiegazione:
      'Quando sposti un termine additivo all\'altro membro, devi cambiare il suo segno (+ diventa −, − diventa +). Trasportare non è un semplice spostamento: equivale a togliere o aggiungere la stessa quantità su entrambi i piatti.',
    controesempio:
      'Se x + 3 = 7, togliendo 3 da ambo i piatti abbiamo x + 3 − 3 = 7 − 3, quindi x = 7 − 3 = 4. Scrivere x = 7 + 3 = 10 violerebbe l\'equilibrio di partenza!',
    come_risolvere:
      'Ricorda: ciò che è addizionato (+) a un membro passa all\'altro membro sottratto (−), e ciò che è sottratto (−) passa addizionato (+).',
    regola_guida:
      'Regola del trasporto (1° principio): oltrepassando l\'uguale, il termine inverte sempre il segno!',
  },
};

// Spiegazione per una mossa non valida: messaggi chiari, non punitivi ed educativi.
export const INVALID_EXPLANATIONS = {
  'cancel-additive':
    'Non puoi semplificare un fattore con un termine di una somma. In (x + 3)/x il termine "x + 3" è una SOMMA, non un prodotto: "x" non è un fattore dell\'intero numeratore. Potresti eventualmente riscrivere il numeratore come somma di frazioni (x/x + 3/x), mantenendo la condizione x ≠ 0.',
  'cancel-across-sum':
    'Cancellazione illecita su una somma: in una frazione puoi semplificare solo fattori che moltiplicano l\'INTERO numeratore e l\'INTERO denominatore, MAI singoli addendi! Ad esempio in (a + b)/a non puoi cancellare la "a" perché fa parte della somma (a + b). Raccogli prima a fattor comune se possibile, oppure separa in a/a + b/a.',
  'missing-common-denom':
    'Il reciproco di una somma NON è la somma dei reciproci: 1/(A + B) ≠ 1/A + 1/B. In presenza di somme di frazioni (es. 1/R₁ + 1/R₂), devi prima calcolare il minimo comune multiplo (m.c.m.) per ottenere un\'unica frazione: solo allora potrai capovolgere i due membri.',
  'move-factor-as-term':
    'Hai provato a trasportare un fattore moltiplicativo con cambio di segno (+ ↔ −). Per il 2° principio di equivalenza, i fattori che moltiplicano l\'intero membro si trasportano dividendo (rilasciandoli al denominatore del membro opposto), non sottraendoli!',
  'move-term-as-factor':
    'Non puoi dividere per un addendo finché fa parte di una somma con altri termini. Per il 1° principio di equivalenza, gli addendi sommati si trasportano cambiando segno (+ ↔ −), rilasciandoli nello slot ± accanto al membro opposto.',
  'move-term-in-parenthesis':
    'Questo termine si trova all\'interno di una parentesi moltiplicata per un fattore esterno. Devi prima dividere entrambi i membri per il fattore esterno (oppure distribuire la moltiplicazione) prima di poter trasportare il singolo addendo.',
  'move-term-in-fraction':
    'Questo termine si trova al numeratore di una frazione. La linea di frazione vincola l\'intera somma: devi prima eliminare il denominatore moltiplicando entrambi i membri per esso.',
  'move-same-side':
    'Non puoi spostare una grandezza all\'interno dello stesso membro: per applicare i principi di equivalenza e isolare l\'incognita devi operare attraverso il segno di uguale (=) sul membro opposto.',
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

export function getInvalidExplanation(key) {
  return INVALID_EXPLANATIONS[key] || null;
}

export function getMisconception(keyOrId) {
  return STUDENT_MISCONCEPTIONS[keyOrId] || null;
}

// ---------------------------------------------------------------------------
// Diagnosi pedagogica degli errori dello studente:
// riconosce i misconception patterns e restituisce spiegazioni chiare e costruttive.
// ---------------------------------------------------------------------------
export function diagnoseStudentMisconception(errorText = '', hintText = '', action = null) {
  const errLow = String(errorText || '').toLowerCase();
  const hintLow = String(hintText || '').toLowerCase();
  const actLabel = action && action.label ? String(action.label).toLowerCase() : '';

  // 1. Cancellazione illecita su somme
  if (
    errLow.includes('cancellazione illecita') ||
    errLow.includes('semplificare un fattore con un termine di una somma') ||
    errLow.includes('non puoi semplificare un addendo') ||
    errLow.includes('non è un fattore comune') ||
    errLow.includes('semplificazione riguarda solo i fattori') ||
    errLow.includes('due fattori nella stessa posizione') ||
    (errLow.includes('semplific') && errLow.includes('somma'))
  ) {
    const m = STUDENT_MISCONCEPTIONS['illegal-sum-cancellation'];
    return {
      category: 'illegal-sum-cancellation',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText.length > 50 ? errorText : m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 2. Mancato denominatore comune prima del reciproco
  if (
    errLow.includes('reciproco di una somma') ||
    errLow.includes('non è la somma dei reciproci') ||
    errLow.includes('1/(a/b + c/d)') ||
    actLabel.includes('reciproc') ||
    (errLow.includes('reciproco') && (errLow.includes('somma') || errLow.includes('m.c.m.')))
  ) {
    const m = STUDENT_MISCONCEPTIONS['missing-common-denom-reciprocal'];
    return {
      category: 'missing-common-denom-reciprocal',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 3. Trasposizioni non valide: Addendo bloccato in parentesi moltiplicata
  if (
    errLow.includes("all'interno della parentesi") ||
    errLow.includes('parentesi (') ||
    errLow.includes('moltiplicata per')
  ) {
    const m = STUDENT_MISCONCEPTIONS['invalid-transposition-parenthesis-blocked'];
    return {
      category: 'invalid-transposition-parenthesis-blocked',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 4. Trasposizioni non valide: Addendo bloccato al numeratore di frazione
  if (
    errLow.includes('al numeratore della frazione') ||
    errLow.includes('finché si trova al numeratore') ||
    errLow.includes('eliminare la frazione')
  ) {
    const m = STUDENT_MISCONCEPTIONS['invalid-transposition-fraction-blocked'];
    return {
      category: 'invalid-transposition-fraction-blocked',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 5. Trasposizioni non valide: Fattore moltiplicativo trasportato come addendo
  if (
    errLow.includes('è un fattore che moltiplica') ||
    errLow.includes('non è un termine additivo') ||
    errLow.includes('non è un additivo di quel membro')
  ) {
    const m = STUDENT_MISCONCEPTIONS['invalid-transposition-factor-as-term'];
    return {
      category: 'invalid-transposition-factor-as-term',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 6. Trasposizioni non valide: Addendo diviso come fattore
  if (
    errLow.includes('finché fa parte di una somma') ||
    errLow.includes('non puoi dividere per') ||
    errLow.includes('non è un fattore moltiplicativo') ||
    errLow.includes('puoi dividere solo per fattori che moltiplicano')
  ) {
    const m = STUDENT_MISCONCEPTIONS['invalid-transposition-term-as-factor'];
    return {
      category: 'invalid-transposition-term-as-factor',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 7. Trasposizioni non valide: Stesso membro
  if (
    errLow.includes('stesso membro') ||
    errLow.includes("dall'altra parte dell'uguale")
  ) {
    const m = STUDENT_MISCONCEPTIONS['invalid-transposition-same-side'];
    return {
      category: 'invalid-transposition-same-side',
      badge: m.badge,
      title: m.titolo,
      explanation: errorText || m.spiegazione,
      counterexample: m.controesempio,
      advice: hintText || m.come_risolvere,
      ruleReminder: m.regola_guida,
      principio: m.principio,
    };
  }

  // 8. Condizione di esistenza / divisione per zero
  if (
    errLow.includes('zero') ||
    errLow.includes('≠ 0') ||
    errLow.includes('nullo')
  ) {
    return {
      category: 'zero-division',
      badge: 'Condizione di Esistenza (≠ 0)',
      title: 'Divisione per zero o termine nullo',
      explanation: errorText || 'La divisione per zero non è un\'operazione definita nei numeri reali.',
      counterexample: 'Non esiste alcun numero x tale che x · 0 = 1.',
      advice: hintText || 'Assicurati che la quantità per cui dividi sia diversa da zero.',
      ruleReminder: 'Attenzione: non è consentito dividere per zero o per quantità nulle!',
      principio: 'Definizione di divisione in algebra reale.',
    };
  }

  // 9. Fallback generico
  return {
    category: 'general',
    badge: 'Principio di Equivalenza',
    title: 'Operazione non valida',
    explanation: errorText || 'Questa operazione non conserva l\'uguaglianza tra i due membri.',
    counterexample: '',
    advice: hintText || 'Verifica di aver applicato correttamente il primo o secondo principio di equivalenza.',
    ruleReminder: 'Ricorda di eseguire trasformazioni che conservano sempre l\'uguaglianza tra i due membri dell\'equazione.',
    principio: 'Principi di equivalenza delle equazioni.',
  };
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
