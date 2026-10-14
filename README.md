# ⚡ Laboratorio di Formule Inverse

Un'applicazione web didattica e interattiva progettata come **laboratorio-gioco matematico** per imparare a ricavare le formule inverse di Fisica e Matematica attraverso l'applicazione rigorosa dei **principi di equivalenza**.

L'applicazione consente di manipolare le equazioni in modo visuale e intuitivo: ogni lettera, esponente o termine composto è un elemento interattivo che può essere trascinato tra i membri, invertito o trasformato, ricevendo feedback didattico immediato su ogni mossa.

---

## 🎯 Scopo e Filosofia Didattica

Molti studenti imparano a ricavare le formule inverse tramite scorciatoie mnemoniche errate ("sposto di là e cambio segno", "porto sotto", "capovolgo tutto"), senza comprendere i principi algebrici sottostanti. 

Lo scopo di questo laboratorio è trasformare l'algebra in un'esperienza **tangibile, visiva e verificabile**:
- **Manipolazione diretta (Drag & Drop):** gli studenti muovono fisicamente variabili e termini da un membro all'altro.
- **Rigorosità algebrica:** ogni operazione viene convalidata in base al **Primo** e **Secondo Principio di Equivalenza** e alle proprietà delle proporzioni.
- **Feedback educativo immediato:** se una mossa è errata (es. sottrarre un fattore moltiplicativo o capovolgere gli addendi di una somma), l'app non si blocca ma spiega *perché* quella mossa è matematicamente illecita.
- **Supporto studenti e docenti:** ideale per lezioni interattive su LIM, studio individuale su tablet/PC e preparazione per verifiche di fisica e matematica.

---

## ✨ Funzionalità Principali

### 1. Interazione Drag & Drop Intelligente
- **Spostamento immediato senza ostacoli:** rilasciando un elemento in una zona di rilascio, la trasformazione viene valutata e applicata all'istante, con spiegazione della regola applicata.
- **Spostamento al denominatore (Divisione):** trascina un fattore moltiplicativo sotto la linea di frazione del membro opposto per dividere entrambi i membri per quella quantità (secondo principio).
- **Spostamento al numeratore (Moltiplicazione):** trascina una grandezza dal denominatore al numeratore dell'altro membro per moltiplicare entrambi i membri.
- **Spostamento accanto (Regola del trasporto con cambio di segno):** trascina un termine additivo nello slot `± sposta termine` accanto all'altro membro per sommare o sottrarre la quantità (primo principio).

### 2. Selezione Singola Lettera vs Intero Gruppo / Termine Composto
- In espressioni con prodotti additivi (es. $P = p_0 + d \cdot g \cdot h$ o $J = m \cdot v - m \cdot v_0$), ogni lettera ha la propria casella autonoma ed è racchiusa in un contenitore di gruppo `📦`.
- **Avvicinando il mouse:**
  - Posizionandosi sulla **singola lettera** (es. `d`), si seleziona e trascina solo quella lettera.
  - Posizionandosi sull'**intero gruppo** (es. `d·g·h` o `m·v0`), si seleziona e trascina l'intero blocco moltiplicativo dall'altra parte dell'uguale con cambio di segno ($P - d \cdot g \cdot h = p_0$).

### 3. Denominatori Sottintesi Dinamici
- A riposo l'equazione mantiene un aspetto pulito e naturale (senza righe o `/1` superflui).
- **Durante il trascinamento:** muovendo il mouse verso il basso del membro opposto, la linea di frazione dinamica e lo slot `÷ rilascia al denominatore` compaiono automaticamente sotto il cursore.
- Rilasciando la variabile, la frazione viene creata all'istante; annullando il drag, il denominatore scompare.

### 4. Spostamento di Potenze come Blocco Unico ($t^2$, $v^2$)
- Le potenze possono essere afferrate e trasportate come entità unica (es. dividere per $v^2$ in $2 E_c = m \cdot v^2 \implies \frac{2 E_c}{v^2} = m$).

### 5. 🪞 Regola dello Specchio ($A = B \leftrightarrow B = A$)
- Pulsante dedicato nella barra strumenti dell'area di lavoro per scambiare istantaneamente i due membri dell'equazione sfruttando la **proprietà simmetrica dell'uguaglianza**.

### 6. 🔄 Rotazione Frazioni & Regola dei Reciproci
- Ogni singola frazione presenta un pulsante `🔄` per capovolgere numeratore e denominatore.
- **Verifica didattica alla conferma:**
  - In una **proporzione** ($\frac{A}{B} = \frac{C}{D}$): capovolgendo entrambi i membri si ottiene $\frac{B}{A} = \frac{D}{C}$ (mossa confermata e valida). Capovolgendo solo un membro, l'app segnala l'errore di bilanciamento.
  - In una **somma di frazioni** ($\frac{A}{B} + \frac{C}{D} = \frac{E}{F}$): capovolgendo tutti i termini, l'app spiega il fondamentale errore didattico: *il reciproco di una somma NON è la somma dei reciproci* ($\frac{1}{A/B + C/D} \neq \frac{B}{A} + \frac{D}{C}$), insegnando che occorre prima trovare il denominatore comune.

### 7. Scelta della Grandezza da Ricavare all'Avvio
- Cliccando su una formula nella libreria si apre una modale interattiva con pulsanti grandi per selezionare quale grandezza isolare.
- Nelle card della libreria sono presenti chip diretti (`Isola: [s] [a] [t]`) per avviare l'esercizio con 1 click.
- Nel box **Obiettivo** in alto, una barra di chip consente di cambiare la grandezza obiettivo in qualunque momento durante lo svolgimento.

### 8. Tipografia Matematica Scientifica & Radici Scalabili
- Utilizzo del font scientifico **STIX Two Text** (standard IEEE/AMS per pubblicazioni matematiche).
- Variabili in corsivo matematico con pedici e apici formattati con tag HTML nativi (`<sub>` e `<sup>`) allineati sulla baseline (nessun underscore o carattere deformato).
- **Radici quadrate scalabili in stile LaTeX:** realizzate con simbolo SVG vettoriale a tratto costante (`vector-effect="non-scaling-stroke"`) e vinculum continuo che si adatta dinamicamente a qualsiasi altezza del radicando (frazioni, potenze, polinomi).

### 9. Integrazione LaTeX Completa
- **Barra Live LaTeX:** sotto l'equazione viene mostrato in tempo reale il codice LaTeX standard della formula corrente, aggiornato ad ogni passaggio.
- **Pulsante 📐 Copia LaTeX:** copia istantaneamente negli appunti la formula corrente in sintassi LaTeX pulita (es. `v = \frac{s}{t}`).
- **Pulsante 📐 Copia LaTeX nella Cronologia:** esporta l'intera sequenza dei passaggi formattata per blocchi `\begin{align*} ... \end{align*}` pronta per Overleaf, Notion o tesi di laurea.
- **Importazione da LaTeX:** campo dedicato nella libreria per incollare formule scritte in LaTeX e convertirle in formule interattive.

### 10. Modalità di Interazione
- **Modalità Libera:** esplorazione autonoma e sperimentazione con selezione elementi e drag & drop.
- **Modalità Guidata:** suggerisce passo dopo passo la trasformazione migliore per isolare l'incognita selezionata.
- **Modalità Multi-operazione:** genera una roadmap visuale con tutti i passaggi necessari ed include la funzione **Risolvi tutto automaticamente** con animazione dei passaggi.

### 11. Libreria di oltre 170 Formule di Fisica
Copre l'intero programma del quinquennio scolastico e universitario di base:
- **Cinematica:** moto uniforme, uniformemente accelerato, circolare, armonico.
- **Dinamica & Gravitazione:** principi della dinamica, attrito, forza elastica, gravitazione universale, moto dei pianeti.
- **Lavoro & Energia:** energia cinetica, potenziale, conservazione dell'energia, potenza.
- **Fluidi:** densità, pressione, legge di Stevino, principio di Archimede, portata, equazione di Bernoulli.
- **Termodinamica:** dilatazione termica, calorimetria, equazione dei gas perfetti, primo e secondo principio, rendimento.
- **Elettromagnetismo & Circuiti:** legge di Coulomb, campo elettrico, potenziale, capacità (serie/parallelo), leggi di Ohm, effetto Joule, induzione magnetica.
- **Onde, Ottica & Fisica Moderna:** legge dei punti coniugati, rifrazione di Snell, effetto fotoelettrico, equivalenza massa-energia ($E = mc^2$).
- Filtro combinato per **Argomento**, **Difficoltà (1-5 stelle)** e **Ricerca testuale rapida**.

### 12. Gestione Cronologia, Undo/Redo & Audio Chime
- Cronologia completa di ogni passaggio con data/ora e indicazione di controllo matematico superato (`✓`) o mossa rifiutata (`✗`).
- Possibilità di cliccare su qualsiasi passaggio passato per riprendere da quel punto.
- Tasti **↶ Annulla** (`Ctrl+Z`), **↷ Ripristina** (`Ctrl+Y`) e **↺ Ricomincia**.
- Segnale acustico armonico polifonico (generato via Web Audio API) al raggiungimento dell'obiettivo.
- Supporto **Dark Mode** nativo con persistenza in `localStorage` e modalità **Alto Contrasto**.

---

## 📂 Struttura del Progetto

```
.
├── index.html              # Interfaccia utente principale accessibile (HTML5 / WAI-ARIA)
├── styles.css              # Design system moderno, tipografia STIX Two, Dark Mode e layout
├── package.json            # Script di avvio, build e metadati
├── README.md               # Documentazione dettagliata dell'applicazione
├── js/
│   ├── app.js              # Controller dell'app, gestione stato, eventi UI e cronologia
│   ├── ast.js              # Definizione dell'AST (Abstract Syntax Tree), toPretty e toLatex
│   ├── parser.js           # Parser di equazioni ed espressioni matematiche
│   ├── rules.js            # Implementazione rigorosa dei principi di equivalenza
│   ├── algebra.js          # Motore algebrico: enumerazione nodi, azioni lecite, roadmap
│   ├── render.js           # Renderizzatore HTML/SVG delle formule e delle componenti interattive
│   ├── dragdrop.js         # Motore Drag & Drop (trasporto termini, fattori, gruppi e frazioni)
│   ├── formulas.js         # Libreria formule base e gestione argomenti
│   ├── formulas-fisica.js  # Formulario avanzato di fisica del quinquennio
│   ├── formula-db.js       # Archivio locale localStorage, import/export JSON e parser LaTeX
│   ├── explanations.js     # Spiegazioni didattiche intuitive e formali per ciascuna regola
│   ├── tests.js            # Suite completa di 39 test automatici interni
│   └── bundle.js           # Bundle standalone compilato per esecuzione offline immediata
└── scripts/
    ├── bundle.mjs          # Script di compilazione bundle con esbuild
    ├── run-tests.mjs       # Script Node per eseguire i test unitari da terminale
    └── test-drag.mjs       # Test automatici per il motore di Drag & Drop
```

---

## 🚀 Guida all'Uso e Installazione

### 1. Utilizzo Diretto Offline (Senza Installazione)
Grazie al bundle standalone incluso in `js/bundle.js`, non è necessario installare Node.js né avviare server web:
- Fai doppio clic su `index.html` per aprirlo direttamente nel tuo browser preferito (**Brave**, Chrome, Safari, Edge, Firefox).
- Funziona al 100% offline, anche senza connessione internet e senza blocchi CORS su protocollo `file://`.

### 2. Avvio con Server Locale (Opzionale)
Se disponi di Node.js:
```bash
# Avvio rapido con server locale
npm start
```
Oppure tramite Python:
```bash
python3 -m http.server 3000
```
Apri il browser all'indirizzo `http://localhost:3000`.

### 3. Esecuzione dei Test Unitari
Per verificare la correttezza del parser, delle regole algebriche, della generazione LaTeX e del Drag & Drop:
```bash
npm test
```
È possibile verificare i test anche direttamente dall'applicazione cliccando sul pulsante **"Esegui test automatici"** nell'header.

### 4. Compilazione del Bundle
Se apporti modifiche ai singoli moduli ES in `js/`:
```bash
npm run build
```
Lo script utilizza `esbuild` per rigenerare in pochi millisecondi il file `js/bundle.js`.

---

## 💡 Esempi di Risoluzione Pratica

### Esempio 1: Ricavare il tempo $t$ da $v = \frac{s}{t}$
1. **Formula iniziale:** $v = \frac{s}{t}$, obiettivo $t$.
2. **Passo 1 (Drag dal denominatore):** Trascina la lettera $t$ dal denominatore destro al membro sinistro $\implies v \cdot t = s$.
3. **Passo 2 (Drag al denominatore):** Trascina la lettera $v$ da sinistra al denominatore destro $\implies t = \frac{s}{v}$.
4. **Risultato:** $t$ è isolata! Suono di successo e formula completata in 2 passaggi.

---

### Esempio 2: Ricavare la velocità $v$ da $E_c = \frac{1}{2} m v^2$
1. **Formula iniziale:** $E_c = \frac{1}{2} \cdot m \cdot v^2$, obiettivo $v$.
2. **Passo 1 (Drag del 2):** Trascina il numero $2$ dal denominatore di $\frac{1}{2}$ al membro sinistro $\implies 2 \cdot E_c = m \cdot v^2$.
3. **Passo 2 (Drag della massa $m$):** Trascina la lettera $m$ da destra al denominatore di sinistra $\implies \frac{2 \cdot E_c}{m} = v^2$.
4. **Passo 3 (Estrazione radice):** Clicca su $v^2$ e seleziona *"Estrai radice quadrata"* $\implies v = \sqrt{\frac{2 \cdot E_c}{m}}$.

---

### Esempio 3: Ricavare la pressione $p_0$ da $P = p_0 + d \cdot g \cdot h$
1. **Formula iniziale:** $P = p_0 + d \cdot g \cdot h$, obiettivo $p_0$.
2. **Passo 1 (Drag dell'intero gruppo $d \cdot g \cdot h$):** Avvicina il mouse al termine $d \cdot g \cdot h$, afferra la casella dell'intero blocco `📦` e trascinalo a sinistra nello slot `± sposta termine` $\implies P - d \cdot g \cdot h = p_0$.
3. **Passo 2 (Regola dello specchio):** Clicca su **🪞 Regola dello specchio** $\implies p_0 = P - d \cdot g \cdot h$.
4. **Risultato:** $p_0$ è isolata con il segno corretto.

---

## 🛡️ Licenza

Rilasciato sotto licenza [MIT](LICENSE). Libero per uso didattico, personale e commerciale.
