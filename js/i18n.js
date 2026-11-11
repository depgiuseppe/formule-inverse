// js/i18n.js — Modulo di internazionalizzazione (i18n bilingue Italiano 🇮🇹 / Inglese 🇬🇧)
// per il Laboratorio di Formule Inverse (CLIL e contesti internazionali).
// Architettura modulare reattiva con interpolazione di parametri {name}, persistenza
// automatica in localStorage e fallback robusto all'italiano come predefinito.

export const SUPPORTED_LANGUAGES = ['it', 'en'];
export const DEFAULT_LANGUAGE = 'it';
export const STORAGE_KEY = 'afi_language';

export const DICTIONARY = {
  it: {
    app: {
      title: 'Laboratorio di Formule Inverse',
      subtitle: 'Impara a ricavare le formule inverse applicando i principi di equivalenza in modo rigoroso e interattivo',
      brand: '⚡ Fisica & Matematica',
    },
    header: {
      quiz_dashboard: '🏆 Quiz & Badge',
      quiz_dashboard_title: 'Apri Dashboard Quiz e Badge di Maestria',
      install_pwa: '📲 Installa App',
      install_pwa_title: "Installa l'applicazione sul tuo dispositivo Android",
      theme_dark: '🌙 Modalità scura',
      theme_light: '☀️ Modalità chiara',
      theme_aria: 'Cambia tema chiaro/scuro',
      contrast: 'Alto contrasto',
      lim_mode: '🖊️ Modalità LIM',
      lim_mode_title: 'Modalità Lavagna Interattiva (LIM): calibrazione stilo e tocco ad alta precisione',
      manim_on: '🎬 Manim ON',
      manim_off: '🎬 Manim OFF',
      manim_title: 'Animazione didattica stile Manim (TransformMatchingTex): mostra visivamente gli spostamenti dei termini',
      help: 'Guida rapida',
      lang_toggle_label: "Lingua: Italiano (clicca per passare all'inglese)",
      lang_toggle_title: "Passa a Inglese / Switch to English (IT/EN)",
    },
    library: {
      heading: 'A. Libreria delle formule',
      count_single: '{n} formula',
      count_plural: '{n} formule',
      search_label: 'Cerca',
      search_placeholder: 'es. stevino, archimede, suono, doppler, ohm...',
      search_aria: 'Cerca formula',
      topic_label: 'Argomento',
      topic_aria: 'Filtra per argomento',
      all_topics: 'Tutti gli argomenti',
      diff_label: 'Difficoltà',
      diff_aria: 'Filtra per difficoltà',
      diff_all: 'Tutti i livelli',
      diff_1: '★☆☆☆☆ Livello 1 (Base)',
      diff_2: '★★☆☆☆ Livello 2 (Medio)',
      diff_3: '★★★☆☆ Livello 3 (Intermedio)',
      diff_4: '★★★★☆ Livello 4 (Avanzato)',
      diff_5: '★★★★★ Livello 5 (Esperto)',
      random_btn: '🎲 Esercizio casuale',
      custom_toggle: '➕ Inserisci formula personalizzata',
      custom_label: 'Formula (sintassi: v = s/t)',
      custom_placeholder: 'es. F = m*a oppure E = m*c^2',
      custom_load: 'Carica formula',
      latex_toggle: '📐 Inserisci formula in codice LaTeX',
      latex_label: 'Codice LaTeX (sintassi: v = \\frac{s}{t})',
      latex_placeholder: 'es. F = G \\frac{m_1 m_2}{r^2} oppure E = m c^2',
      latex_preview: 'Anteprima conversione',
      latex_save: "Salva nell'archivio",
      my_formulas_toggle: '📂 Le mie formule salvate',
      export_json: 'Esporta JSON',
      import_json: 'Importa JSON',
      clear_archive: 'Svuota archivio',
      no_results: 'Nessuna formula corrisponde ai filtri impostati.',
      formula_card_target: 'Incognite:',
    },
    topics: {
      'cinematica': 'Cinematica',
      'dinamica': 'Dinamica',
      'lavoro, energia e potenza': 'Lavoro, energia e potenza',
      'quantità di moto e urti': 'Quantità di moto e urti',
      'corpo rigido e gravitazione': 'Corpo rigido e gravitazione',
      'pressione e fluidostatica': 'Pressione e fluidostatica',
      'idrodinamica': 'Idrodinamica',
      'termologia': 'Termologia',
      'termodinamica': 'Termodinamica',
      'onde e acustica': 'Onde e acustica',
      'elettricità': 'Elettricità',
      'elettrostatica': 'Elettrostatica',
      'magnetostatica': 'Magnetostatica',
      'circuiti elettrici': 'Circuiti elettrici',
      'elettromagnetismo': 'Elettromagnetismo',
      'ottica': 'Ottica',
      'relatività': 'Relatività',
      'fisica moderna': 'Fisica moderna',
      'astrofisica': 'Astrofisica',
      'chimica': 'Chimica',
      'geometria': 'Geometria',
      'proporzionalità': 'Proporzionalità',
      'algebra': 'Algebra',
    },
    workarea: {
      heading: 'B. Area di lavoro',
      retry_btn: '↺ Ricomincia',
      retry_title: "Ricomincia questo esercizio dall'inizio (ripristina la formula di partenza)",
      mode_free: 'Libera',
      mode_free_title: "Modalità Libera: interagisci liberamente con l'equazione, trascina variabili o applica operazioni",
      mode_auto: 'Automatica',
      mode_auto_title: 'Modalità Automatica: a ogni clic del mouse il programma esegue una operazione giustificando la regola',
      speak_btn: '🔊 Ascolta formula',
      speak_title: 'Ascolta lettura vocale della formula (per studenti DSA e non vedenti)',
      mirror_btn: '🪞 Regola dello specchio',
      mirror_title: "Regola dello specchio: scambia i due membri dell'equazione (A = B ↔ B = A)",
      reciprocal_btn: '🔁 Regola dei reciproci',
      reciprocal_title: "Regola dei reciproci: scambia numeratore e denominatore di entrambi i membri (A/B = C/D ↔ B/A = D/C)",
      distribute_btn: '📦 Sviluppa parentesi',
      distribute_title: 'Proprietà distributiva: sviluppa i prodotti con parentesi, potenze di frazioni o radici',
      factor_common_btn: '🧩 Raccoglimento a fattori',
      factor_common_title: 'Regola del raccoglimento a fattor comune: ax + ab = a(x + b)',
      common_denom_btn: '🧮 m.c.m. frazioni',
      common_denom_title: "Minimo comune multiplo: riduce somme di frazioni a un'unica frazione algebrica",
      change_sign_btn: '± Cambio segno',
      change_sign_title: 'Cambio di segno: moltiplica entrambi i membri per −1',
      positive_branch_btn: '✅ Valore positivo (+)',
      positive_branch_title: 'Grandezze non negative: scarta il ramo negativo (±x → +x) per grandezze fisiche scalari',
      cross_cancel_btn: '✕ Croce di semplificazione',
      cross_cancel_title: 'Semplificazione incrociata: cancella fattori identici tra numeratore e denominatore',
      hint_btn: '💡 Suggerimento',
      hint_title: 'Suggerisci la mossa migliore',
      export_worksheet_btn: '📝 Esporta Scheda',
      export_worksheet_title: 'Esporta scheda didattica stampabile o verifica LaTeX per la classe',
      manim_auto_option: '🎬 Animazione Manim (TransformMatchingTex)',
      manim_auto_play: '🎬 Risoluzione Animata',
      manim_auto_pause: '⏸️ Pausa Risoluzione',
      manim_auto_export: '🐍 Script Manim (.py)',
      manim_auto_view: '🎬 Anteprima Manim',
      bubble_ok: 'Ho capito! 👍',
      bubble_close: 'Chiudi fumetto',
      copy_latex_inline: 'Copia codice LaTeX',
      empty_placeholder: 'Carica una formula dalla libreria o inserisci una formula personalizzata per iniziare.',
    },
    objective: {
      prompt: 'Scegli la grandezza da ricavare:',
      isolate: 'Isola {var} applicando i principi di equivalenza.',
      target_is: 'Obiettivo: isolare {var}',
      completed_title: '🎉 Ottimo Lavoro!',
      completed_msg: 'Hai isolato correttamente {var} applicando i principi di equivalenza in modo rigoroso.',
      retry_btn: '↺ Riprova',
      next_btn: '🎲 Altro esercizio',
    },
    keypad: {
      title: 'Tastierino delle operazioni',
      placeholder: 'Carica una formula per usare il tastierino.',
      select_op_first: "Prima scegli un'operazione nel tastierino, poi la grandezza o il numero.",
      no_change: "Questa operazione non cambia l'equazione: prova un'altra trasformazione.",
      apply_both: 'Applica {op} a entrambi i membri',
      op_add: 'Somma la stessa grandezza o numero a entrambi i membri',
      op_sub: 'Sottrai la stessa grandezza o numero a entrambi i membri',
      op_mul: 'Moltiplica entrambi i membri per la stessa grandezza o numero',
      op_div: 'Dividi entrambi i membri per la stessa grandezza o numero (≠ 0)',
      op_pow: 'Eleva entrambi i membri alla stessa potenza',
      op_sqrt: 'Estrai la radice quadrata di entrambi i membri',
      op_cbrt: 'Estrazione della radice cubica di entrambi i membri',
      op_asin: "Applica l'arcoseno (sin⁻¹) a entrambi i membri per liberare l'argomento del seno",
      op_acos: "Applica l'arcocoseno (cos⁻¹) a entrambi i membri per liberare l'argomento del coseno",
      op_atan: "Applica l'arcotangente (tan⁻¹) a entrambi i membri per liberare l'argomento della tangente",
    },
    rules: {
      heading: 'C. Regola applicata',
      placeholder: "Interagisci con l'equazione o usa il tastierino: qui comparirà la giustificazione teorica della regola applicata.",
      panel_rule: 'Regola',
      panel_before: 'Prima',
      panel_operation: 'Operazione',
      panel_after: 'Dopo',
      panel_explanation: 'Spiegazione',
      panel_principle: 'Principio di equivalenza',
      panel_why: 'Perché è corretto',
      panel_conditions: 'Condizioni di validità',
      panel_no_conditions: 'nessuna condizione particolare',
      applied_transformation: 'Trasformazione applicata',
    },
    history: {
      heading: 'D. Cronologia passaggi',
      copy_text: '📋 Copia testo',
      copy_text_title: 'Copia passaggi negli appunti',
      copy_latex: '📐 Copia LaTeX',
      copy_latex_title: 'Copia passaggi formattati per LaTeX',
      undo: '↶ Annulla',
      undo_title: 'Annulla ultima trasformazione',
      redo: '↷ Ripristina',
      redo_title: 'Ripristina trasformazione annullata',
      reset: '↺ Ricomincia',
      initial_step: 'Equazione di partenza',
      empty: 'Nessun passaggio eseguito.',
    },
    calc: {
      title: 'Calcolo numerico',
      subtitle: "Sostituisci i valori noti con le loro unità di misura per calcolare il valore numerico dell'incognita ricavata",
      target_label: 'Grandezza incognita ricavata',
      knowns_label: 'Inserisci i valori noti (unità SI)',
      sample_btn: '🎲 Dati di esempio',
      sample_title: 'Carica dati realistici di prova',
      reset_btn: '↺ Resetta',
      reset_title: 'Pulisci tutti i valori',
      calc_btn: 'Calcola',
      copy_result: '📋 Copia risultato',
      copy_result_title: 'Copia risultato negli appunti',
      placeholder: 'Inserisci i valori sopra e premi Calcola.',
    },
    quiz: {
      hud_title: 'Modalità Quiz',
      new_btn: '🎲 Nuovo Esercizio',
      new_title: 'Genera un nuovo esercizio casuale per il livello selezionato',
      badges_btn: '🏆 Badge & Statistiche',
      badges_title: 'Visualizza statistiche, progressi e badge di maestria',
      level_easy: '🟢 Base',
      level_medium: '🟡 Intermedio',
      level_hard: '🔴 Avanzato',
      level_all: '🎲 Casuale',
      stat_solved: 'Risolti',
      stat_streak: 'Serie Attuale',
      stat_accuracy: 'Precisione',
      stat_best_streak: 'Serie Migliore',
      stat_avg_eff: 'Efficienza Media',
      completion_title: 'Ottimo Lavoro!',
      completion_retry: '↺ Riprova Esercizio',
      completion_stats: '🏆 Badge & Progressi',
      completion_board: '👁️ Vedi Lavagna',
      completion_next: 'Prossimo Esercizio ➔',
      dashboard_title: '🏆 Dashboard Eserciziario & Badge di Maestria',
      current_rank: 'Grado Attuale',
      xp_label: 'Punti Esperienza (XP)',
      next_rank_at: 'Prossimo grado a',
      badges_section: '🎖️ Distintivi di Maestria',
      history_section: '📜 Ultimi Esercizi Completati',
      reset_progress: '🗑️ Azzera progressi',
      continue_btn: 'Continua ad allenarti',
      history_empty: 'Nessun esercizio completato finora.',
      badges_unlocked: '{unlocked} / {total} Sbloccati',
      ranks: {
        1: 'Apprendista dei Principi',
        2: 'Risolutore Diligente',
        3: 'Architetto Algebrico',
        4: 'Maestro delle Inverse',
        5: 'Gran Maestro STEM',
      },
      badges: {
        first_win: {
          title: 'Primo Traguardo',
          desc: 'Completa con successo il tuo primo esercizio in modalità Quiz.',
        },
        optimal_sniper: {
          title: 'Cecchino Algebrico',
          desc: 'Risolvi un esercizio con efficienza 100% (mosse ottimali).',
        },
        flawless: {
          title: 'Mente Rigorosa',
          desc: 'Risolvi un esercizio senza commettere nessun errore di principio.',
        },
        easy_trio: {
          title: "Basi d'Acciaio",
          desc: 'Completa 3 esercizi di livello Base.',
        },
        medium_trio: {
          title: 'Architetto delle Formule',
          desc: 'Completa 3 esercizi di livello Intermedio.',
        },
        hard_master: {
          title: 'Campione delle Inverse',
          desc: 'Completa 2 esercizi di livello Avanzato.',
        },
        triple_three_stars: {
          title: 'Caccia alle Tre Stelle',
          desc: 'Ottieni 3 stelle (punteggio perfetto) in almeno 3 esercizi.',
        },
        streak_3: {
          title: 'Inarrestabile (x3)',
          desc: 'Raggiungi una serie di 3 esercizi completati consecutivamente.',
        },
        streak_5: {
          title: 'Dominio Totale (x5)',
          desc: 'Raggiungi una serie di 5 esercizi completati consecutivamente.',
        },
        speed_demon: {
          title: 'Risolutore Rapido',
          desc: 'Risolvi un esercizio in meno di 25 secondi con almeno 2 stelle.',
        },
        polymath: {
          title: 'Mente Poliedrica',
          desc: 'Risolvi almeno un esercizio in 3 argomenti diversi.',
        },
        xp_centurion: {
          title: 'Centurione dei Punti',
          desc: 'Accumula almeno 100 XP totali nella modalità Quiz.',
        },
      },
    },
    worksheet: {
      modal_title: '📝 Esportatore Schede Didattiche e Verifiche',
      close_modal: '✕',
      close_modal_aria: 'Chiudi finestra',
      config_title: 'Configurazione Scheda',
      title_label: 'Titolo Scheda / Verifica',
      title_placeholder: 'es. Verifica di Fisica — Formule Inverse',
      school_label: 'Istituto Scolastico / Classe',
      school_placeholder: 'es. Liceo Scientifico — Classe 3ªB',
      date_label: 'Data',
      num_exercises: 'Numero di Esercizi',
      layout_label: 'Griglia / Colonne',
      layout_single: 'Colonna Singola (più spazio di lavoro)',
      layout_double: 'Doppia Colonna (compatta)',
      topic_label: 'Argomento prevalente',
      diff_label: 'Livello di difficoltà',
      diff_mixed: 'Misto (Base + Medio + Avanzato)',
      diff_easy: 'Livello 1-2 (Base)',
      diff_medium: 'Livello 3 (Intermedio)',
      diff_hard: 'Livello 4-5 (Avanzato/Esperto)',
      include_hints: 'Includi suggerimento teorico / principio',
      include_solutions: 'Genera Foglio Soluzioni per il docente',
      btn_regenerate: '🔄 Rigenera Esercizi',
      tab_preview_html: '👁️ Anteprima Stampa',
      tab_preview_latex: '📐 Codice LaTeX',
      tab_preview_manim: '🎬 Script Manim',
      btn_print: '🖨️ Stampa / Salva PDF',
      btn_print_title: 'Apri anteprima di stampa per stampare su carta o salvare come PDF',
      btn_download_latex: '📄 Scarica LaTeX (.tex)',
      btn_download_latex_title: 'Scarica sorgente .tex compilabile per Overleaf o MiKTeX',
      btn_copy_latex: '📋 Copia LaTeX',
      btn_copy_manim: '📋 Copia Script Manim',
      btn_copy_manim_title: 'Copia lo script Python per Manim Community negli appunti',
      btn_download_manim: '💾 Scarica Manim (.py)',
      btn_download_manim_title: 'Scarica lo script Python .py per Manim Community',
      btn_copy_latex_title: 'Copia il codice LaTeX negli appunti',
      btn_download_html: '🌐 Scarica HTML',
      btn_download_html_title: 'Scarica la scheda in formato HTML autonomo offline',
      btn_close: 'Chiudi',
    },
    a11y: {
      eq_label_prefix: 'Equazione:',
      eq_role_desc: 'equazione matematica interattiva',
      token_role_desc: 'termine matematico trascinabile',
      no_active_eq: 'Nessuna equazione attiva',
      equals: 'uguale a',
      plus: 'più',
      minus: 'meno',
      times: 'per',
      divided_by: 'fratto',
      squared: 'al quadrato',
      cubed: 'al cubo',
      square_root_of: 'radice quadrata di {arg}',
      cube_root_of: 'radice cubica di {arg}',
      raised_to: 'elevato a {exp}',
      raised_to_power: 'elevato alla {exp}',
      sine_of: 'seno di {arg}',
      cosine_of: 'coseno di {arg}',
      tangent_of: 'tangente di {arg}',
      arcsine_of: 'arcoseno di {arg}',
      arccosine_of: 'arcocoseno di {arg}',
      arctangent_of: 'arcotangente di {arg}',
      logarithm_of: 'logaritmo naturale di {arg}',
      exponential_of: 'esponenziale di {arg}',
      quantity: 'quantità {arg}',
      fraction_compound: 'frazione con numeratore {num}, fratto denominatore {den}',
      one_half: 'un mezzo',
      one_third: 'un terzo',
      one_fourth: 'un quarto',
      two_thirds: 'due terzi',
      three_fourths: 'tre quarti',
      plus_minus: 'più o meno',
    },
    modals: {
      help_title: 'Guida rapida',
      pick_target_title: '🎯 Scegli la grandezza da ricavare',
      pick_target_btn: 'ricava {var}',
      cancel: 'Annulla',
      close: 'Chiudi',
    },
    nav: {
      formula: 'Formula',
      library: 'Libreria',
      steps: 'Passaggi',
      calc: 'Calcolo',
      aria: 'Navigazione rapida sezioni mobile',
    },
  },

  en: {
    app: {
      title: 'Inverse Formula Lab',
      subtitle: 'Learn to derive inverse formulas by applying equivalence principles rigorously and interactively',
      brand: '⚡ Physics & Mathematics',
    },
    header: {
      quiz_dashboard: '🏆 Quiz & Badges',
      quiz_dashboard_title: 'Open Quiz Dashboard and Mastery Badges',
      install_pwa: '📲 Install App',
      install_pwa_title: 'Install the application on your Android device',
      theme_dark: '🌙 Dark mode',
      theme_light: '☀️ Light mode',
      theme_aria: 'Toggle dark/light theme',
      contrast: 'High contrast',
      lim_mode: '🖊️ Whiteboard Mode',
      lim_mode_title: 'Interactive Whiteboard Mode: high-precision stylus & touch calibration',
      manim_on: '🎬 Manim ON',
      manim_off: '🎬 Manim OFF',
      manim_title: 'Manim-style didactic animation (TransformMatchingTex): visually display term displacements',
      help: 'Quick guide',
      lang_toggle_label: 'Language: English (click to switch to Italian)',
      lang_toggle_title: 'Switch to Italian / Passa a Italiano (IT/EN)',
    },
    library: {
      heading: 'A. Formula Library',
      count_single: '{n} formula',
      count_plural: '{n} formulas',
      search_label: 'Search',
      search_placeholder: 'e.g. stevino, archimedes, sound, doppler, ohm...',
      search_aria: 'Search formula',
      topic_label: 'Topic',
      topic_aria: 'Filter by topic',
      all_topics: 'All topics',
      diff_label: 'Difficulty',
      diff_aria: 'Filter by difficulty',
      diff_all: 'All levels',
      diff_1: '★☆☆☆☆ Level 1 (Basic)',
      diff_2: '★★☆☆☆ Level 2 (Medium)',
      diff_3: '★★★☆☆ Level 3 (Intermediate)',
      diff_4: '★★★★☆ Level 4 (Advanced)',
      diff_5: '★★★★★ Level 5 (Expert)',
      random_btn: '🎲 Random exercise',
      custom_toggle: '➕ Enter custom formula',
      custom_label: 'Formula (syntax: v = s/t)',
      custom_placeholder: 'e.g. F = m*a or E = m*c^2',
      custom_load: 'Load formula',
      latex_toggle: '📐 Enter formula in LaTeX code',
      latex_label: 'LaTeX code (syntax: v = \\frac{s}{t})',
      latex_placeholder: 'e.g. F = G \\frac{m_1 m_2}{r^2} or E = m c^2',
      latex_preview: 'Preview conversion',
      latex_save: 'Save to archive',
      my_formulas_toggle: '📂 My saved formulas',
      export_json: 'Export JSON',
      import_json: 'Import JSON',
      clear_archive: 'Clear archive',
      no_results: 'No formulas match the selected filters.',
      formula_card_target: 'Variables:',
    },
    topics: {
      'cinematica': 'Kinematics',
      'dinamica': 'Dynamics',
      'lavoro, energia e potenza': 'Work, Energy & Power',
      'quantità di moto e urti': 'Momentum & Collisions',
      'corpo rigido e gravitazione': 'Rigid Body & Gravitation',
      'pressione e fluidostatica': 'Pressure & Fluid Statics',
      'idrodinamica': 'Hydrodynamics',
      'termologia': 'Heat & Temperature',
      'termodinamica': 'Thermodynamics',
      'onde e acustica': 'Waves & Acoustics',
      'elettricità': 'Electricity',
      'elettrostatica': 'Electrostatics',
      'magnetostatica': 'Magnetostatics',
      'circuiti elettrici': 'Electric Circuits',
      'elettromagnetismo': 'Electromagnetism',
      'ottica': 'Optics',
      'relatività': 'Relativity',
      'fisica moderna': 'Modern Physics',
      'astrofisica': 'Astrophysics',
      'chimica': 'Chemistry',
      'geometria': 'Geometry',
      'proporzionalità': 'Proportionality',
      'algebra': 'Algebra',
    },
    workarea: {
      heading: 'B. Work Area',
      retry_btn: '↺ Restart',
      retry_title: 'Restart this exercise from the beginning (restore initial formula)',
      mode_free: 'Free',
      mode_free_title: 'Free Mode: interact freely with the equation, drag variables or apply operations',
      mode_auto: 'Auto',
      mode_auto_title: 'Auto Mode: on each click the program performs a step and explains the rule',
      speak_btn: '🔊 Listen to formula',
      speak_title: 'Listen to spoken equation (for dyslexia & visually impaired students)',
      mirror_btn: '🪞 Mirror rule',
      mirror_title: 'Mirror rule: swap both sides of the equation (A = B ↔ B = A)',
      reciprocal_btn: '🔁 Reciprocals rule',
      reciprocal_title: 'Reciprocals rule: invert numerator and denominator on both sides (A/B = C/D ↔ B/A = D/C)',
      distribute_btn: '📦 Expand parentheses',
      distribute_title: 'Distributive property: expand products with parentheses, powers of fractions or roots',
      factor_common_btn: '🧩 Factor out common term',
      factor_common_title: 'Factoring rule: ax + ab = a(x + b)',
      common_denom_btn: '🧮 Common denominator',
      common_denom_title: 'Least common denominator: reduces fraction sums to a single algebraic fraction',
      change_sign_btn: '± Change sign',
      change_sign_title: 'Change sign: multiply both sides by −1',
      positive_branch_btn: '✅ Positive value (+)',
      positive_branch_title: 'Non-negative quantities: discard negative branch (±x → +x) for scalar physical quantities',
      cross_cancel_btn: '✕ Cross cancellation',
      cross_cancel_title: 'Cross cancellation: cancel identical factors between numerator and denominator',
      hint_btn: '💡 Hint',
      hint_title: 'Suggest the best next move',
      export_worksheet_btn: '📝 Export Worksheet',
      export_worksheet_title: 'Export printable worksheet or LaTeX test for the class',
      manim_auto_option: '🎬 Manim Animation (TransformMatchingTex)',
      manim_auto_play: '🎬 Animated Resolution',
      manim_auto_pause: '⏸️ Pause Resolution',
      manim_auto_export: '🐍 Manim Script (.py)',
      manim_auto_view: '🎬 Manim Preview',
      bubble_ok: 'Got it! 👍',
      bubble_close: 'Close tip',
      copy_latex_inline: 'Copy LaTeX code',
      empty_placeholder: 'Load a formula from the library or enter a custom formula to begin.',
    },
    objective: {
      prompt: 'Choose the variable to isolate:',
      isolate: 'Isolate {var} by applying equivalence principles.',
      target_is: 'Target: isolate {var}',
      completed_title: '🎉 Great Job!',
      completed_msg: 'You have successfully isolated {var} by applying equivalence principles rigorously.',
      retry_btn: '↺ Try again',
      next_btn: '🎲 Next exercise',
    },
    keypad: {
      title: 'Operations Keypad',
      placeholder: 'Load a formula to use the keypad.',
      select_op_first: 'First choose an operation on the keypad, then the quantity or number.',
      no_change: 'This operation does not change the equation: try another transformation.',
      apply_both: 'Apply {op} to both sides',
      op_add: 'Add the same quantity or number to both sides',
      op_sub: 'Subtract the same quantity or number from both sides',
      op_mul: 'Multiply both sides by the same quantity or number',
      op_div: 'Divide both sides by the same quantity or number (≠ 0)',
      op_pow: 'Raise both sides to the same power',
      op_sqrt: 'Take the square root of both sides',
      op_cbrt: 'Take the cube root of both sides',
      op_asin: 'Apply arcsine (sin⁻¹) to both sides to isolate the sine argument',
      op_acos: 'Apply arccosine (cos⁻¹) to both sides to isolate the cosine argument',
      op_atan: 'Apply arctangent (tan⁻¹) to both sides to isolate the tangent argument',
    },
    rules: {
      heading: 'C. Applied Rule',
      placeholder: 'Interact with the equation or use the keypad: theoretical justification of the applied rule will appear here.',
      panel_rule: 'Rule',
      panel_before: 'Before',
      panel_operation: 'Operation',
      panel_after: 'After',
      panel_explanation: 'Explanation',
      panel_principle: 'Equivalence principle',
      panel_why: 'Why it is correct',
      panel_conditions: 'Validity conditions',
      panel_no_conditions: 'no special conditions',
      applied_transformation: 'Applied transformation',
    },
    history: {
      heading: 'D. Step History',
      copy_text: '📋 Copy text',
      copy_text_title: 'Copy steps to clipboard',
      copy_latex: '📐 Copy LaTeX',
      copy_latex_title: 'Copy steps formatted for LaTeX',
      undo: '↶ Undo',
      undo_title: 'Undo last transformation',
      redo: '↷ Redo',
      redo_title: 'Redo last transformation',
      reset: '↺ Restart',
      initial_step: 'Initial equation',
      empty: 'No steps taken yet.',
    },
    calc: {
      title: 'Numerical Calculation',
      subtitle: 'Substitute known values with units of measurement to calculate the numeric value of the isolated variable',
      target_label: 'Derived unknown quantity',
      knowns_label: 'Enter known values (SI units)',
      sample_btn: '🎲 Sample data',
      sample_title: 'Load realistic sample data',
      reset_btn: '↺ Reset',
      reset_title: 'Clear all values',
      calc_btn: 'Calculate',
      copy_result: '📋 Copy result',
      copy_result_title: 'Copy result to clipboard',
      placeholder: 'Enter values above and press Calculate.',
    },
    quiz: {
      hud_title: 'Quiz Mode',
      new_btn: '🎲 New Exercise',
      new_title: 'Generate a new random exercise for the selected level',
      badges_btn: '🏆 Badges & Stats',
      badges_title: 'View statistics, progress and mastery badges',
      level_easy: '🟢 Basic',
      level_medium: '🟡 Intermediate',
      level_hard: '🔴 Advanced',
      level_all: '🎲 Random',
      stat_solved: 'Solved',
      stat_streak: 'Current Streak',
      stat_accuracy: 'Accuracy',
      stat_best_streak: 'Best Streak',
      stat_avg_eff: 'Avg Efficiency',
      completion_title: 'Great Job!',
      completion_retry: '↺ Retry Exercise',
      completion_stats: '🏆 Badges & Progress',
      completion_board: '👁️ View Board',
      completion_next: 'Next Exercise ➔',
      dashboard_title: '🏆 Quiz Dashboard & Mastery Badges',
      current_rank: 'Current Rank',
      xp_label: 'Experience Points (XP)',
      next_rank_at: 'Next rank at',
      badges_section: '🎖️ Mastery Badges',
      history_section: '📜 Recently Completed Exercises',
      reset_progress: '🗑️ Reset progress',
      continue_btn: 'Keep practicing',
      history_empty: 'No exercises completed so far.',
      badges_unlocked: '{unlocked} / {total} Unlocked',
      ranks: {
        1: 'Principle Apprentice',
        2: 'Diligent Solver',
        3: 'Algebraic Architect',
        4: 'Master of Inverses',
        5: 'STEM Grandmaster',
      },
      badges: {
        first_win: {
          title: 'First Milestone',
          desc: 'Successfully complete your first exercise in Quiz mode.',
        },
        optimal_sniper: {
          title: 'Algebraic Sniper',
          desc: 'Solve an exercise with 100% efficiency (optimal moves).',
        },
        flawless: {
          title: 'Rigorous Mind',
          desc: 'Solve an exercise without committing any principle error.',
        },
        easy_trio: {
          title: 'Iron Foundations',
          desc: 'Complete 3 Basic-level exercises.',
        },
        medium_trio: {
          title: 'Formula Architect',
          desc: 'Complete 3 Intermediate-level exercises.',
        },
        hard_master: {
          title: 'Champion of Inverses',
          desc: 'Complete 2 Advanced-level exercises.',
        },
        triple_three_stars: {
          title: 'Three-Star Hunt',
          desc: 'Earn 3 stars (perfect score) in at least 3 exercises.',
        },
        streak_3: {
          title: 'Unstoppable (x3)',
          desc: 'Achieve a streak of 3 consecutively completed exercises.',
        },
        streak_5: {
          title: 'Total Dominance (x5)',
          desc: 'Achieve a streak of 5 consecutively completed exercises.',
        },
        speed_demon: {
          title: 'Speed Solver',
          desc: 'Solve an exercise in under 25 seconds with at least 2 stars.',
        },
        polymath: {
          title: 'Polymath Mind',
          desc: 'Solve at least one exercise across 3 different topics.',
        },
        xp_centurion: {
          title: 'XP Centurion',
          desc: 'Accumulate at least 100 total XP in Quiz mode.',
        },
      },
    },
    worksheet: {
      modal_title: '📝 Worksheet & Test Exporter',
      close_modal: '✕',
      close_modal_aria: 'Close dialog',
      config_title: 'Worksheet Configuration',
      title_label: 'Worksheet / Test Title',
      title_placeholder: 'e.g. Physics Test — Inverse Formulas',
      school_label: 'School / Class',
      school_placeholder: 'e.g. High School — Grade 11',
      date_label: 'Date',
      num_exercises: 'Number of Exercises',
      layout_label: 'Grid / Columns',
      layout_single: 'Single Column (more work space)',
      layout_double: 'Two Columns (compact)',
      topic_label: 'Primary Topic',
      diff_label: 'Difficulty Level',
      diff_mixed: 'Mixed (Basic + Medium + Advanced)',
      diff_easy: 'Level 1-2 (Basic)',
      diff_medium: 'Level 3 (Intermediate)',
      diff_hard: 'Level 4-5 (Advanced/Expert)',
      include_hints: 'Include theoretical hint / principle',
      include_solutions: 'Generate Teacher Answer Key',
      btn_regenerate: '🔄 Regenerate Exercises',
      tab_preview_html: '👁️ Print Preview',
      tab_preview_latex: '📐 LaTeX Code',
      tab_preview_manim: '🎬 Manim Script',
      btn_print: '🖨️ Print / Save PDF',
      btn_print_title: 'Open print preview to print on paper or save as PDF',
      btn_download_latex: '📄 Download LaTeX (.tex)',
      btn_download_latex_title: 'Download compilable .tex source for Overleaf or MiKTeX',
      btn_copy_latex: '📋 Copy LaTeX',
      btn_copy_latex_title: 'Copy LaTeX source to clipboard',
      btn_copy_manim: '📋 Copy Manim Script',
      btn_copy_manim_title: 'Copy Python script for Manim Community to clipboard',
      btn_download_manim: '💾 Download Manim (.py)',
      btn_download_manim_title: 'Download Python .py script for Manim Community',
      btn_download_html: '🌐 Download HTML',
      btn_download_html_title: 'Download standalone offline HTML worksheet',
      btn_close: 'Close',
    },
    a11y: {
      eq_label_prefix: 'Equation:',
      eq_role_desc: 'interactive math equation',
      token_role_desc: 'draggable math token',
      no_active_eq: 'No active equation',
      equals: 'equals',
      plus: 'plus',
      minus: 'minus',
      times: 'times',
      divided_by: 'divided by',
      squared: 'squared',
      cubed: 'cubed',
      square_root_of: 'square root of {arg}',
      cube_root_of: 'cube root of {arg}',
      raised_to: 'raised to {exp}',
      raised_to_power: 'raised to the power of {exp}',
      sine_of: 'sine of {arg}',
      cosine_of: 'cosine of {arg}',
      tangent_of: 'tangent of {arg}',
      arcsine_of: 'arcsine of {arg}',
      arccosine_of: 'arccosine of {arg}',
      arctangent_of: 'arctangent of {arg}',
      logarithm_of: 'natural logarithm of {arg}',
      exponential_of: 'exponential of {arg}',
      quantity: 'quantity {arg}',
      fraction_compound: 'fraction with numerator {num}, over denominator {den}',
      one_half: 'one half',
      one_third: 'one third',
      one_fourth: 'one fourth',
      two_thirds: 'two thirds',
      three_fourths: 'three fourths',
      plus_minus: 'plus or minus',
    },
    modals: {
      help_title: 'Quick Guide',
      pick_target_title: '🎯 Choose variable to isolate',
      pick_target_btn: 'isolate {var}',
      cancel: 'Cancel',
      close: 'Close',
    },
    nav: {
      formula: 'Formula',
      library: 'Library',
      steps: 'Steps',
      calc: 'Calc',
      aria: 'Mobile quick section navigation',
    },
  },
};

// ---------------------------------------------------------------------------
// Stato reattivo di internazionalizzazione
// ---------------------------------------------------------------------------

let activeLanguage = DEFAULT_LANGUAGE;
const changeListeners = new Set();

function initStoredLanguage() {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        activeLanguage = saved;
        return;
      }
    } catch (_) {}
  }
  activeLanguage = DEFAULT_LANGUAGE;
}
initStoredLanguage();

/**
 * Restituisce la lingua attualmente attiva ('it' o 'en').
 */
export function getLanguage() {
  return activeLanguage;
}

/**
 * Imposta la lingua attiva con persistenza automatica e notifica i listener registrati.
 * @param {string} lang - 'it' o 'en'
 * @returns {string} la lingua effettivamente impostata
 */
export function setLanguage(lang) {
  const norm = String(lang || '').toLowerCase().startsWith('en') ? 'en' : 'it';
  activeLanguage = norm;

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, norm);
    } catch (_) {}
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = norm;
  }

  for (const listener of changeListeners) {
    try {
      listener(norm);
    } catch (e) {
      console.error('Errore listener onLanguageChange:', e);
    }
  }

  return norm;
}

/**
 * Registra un ascoltatore per il cambio lingua.
 * @param {function(string): void} listener
 * @returns {function(): void} funzione di disiscrizione (unsubscribe)
 */
export function onLanguageChange(listener) {
  if (typeof listener === 'function') {
    changeListeners.add(listener);
  }
  return () => {
    changeListeners.delete(listener);
  };
}

/**
 * Risolve un percorso di chiavi separato da punti (es. "app.title").
 */
function resolvePath(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Traduce una chiave nel dizionario della lingua attiva con interpolazione parametri {name}.
 * Effettua il fallback automatico all'italiano ('it') se una chiave manca in inglese,
 * e alla chiave stessa se manca ovunque.
 *
 * @param {string} key - Chiave con notazione dot (es. "app.title", "objective.isolate")
 * @param {Object} [params] - Parametri da sostituire (es. { var: 'v' })
 * @param {string} [lang] - Lingua forzata (opzionale, default: getLanguage())
 * @returns {string} stringa tradotta o chiave di fallback
 */
export function t(key, params = {}, lang = activeLanguage) {
  const targetLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : activeLanguage;
  const currentDict = DICTIONARY[targetLang] || DICTIONARY[DEFAULT_LANGUAGE];
  let res = resolvePath(currentDict, key);

  // Fallback alla lingua di base (IT) se mancante nella lingua corrente
  if (res === undefined && targetLang !== DEFAULT_LANGUAGE) {
    res = resolvePath(DICTIONARY[DEFAULT_LANGUAGE], key);
  }

  // Fallback finale alla chiave stessa
  if (res === undefined) {
    return key;
  }

  if (typeof res !== 'string') {
    return res;
  }

  if (!params || Object.keys(params).length === 0) {
    return res;
  }

  return res.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? String(params[paramKey]) : match;
  });
}

/**
 * Traduce l'argomento/categoria di una formula in base alla lingua attiva.
 */
export function translateTopic(topicKey, lang = activeLanguage) {
  if (!topicKey) return '';
  const key = String(topicKey).toLowerCase().trim();
  const targetLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : activeLanguage;
  const topicsMap = DICTIONARY[targetLang]?.topics || DICTIONARY.it.topics;
  return topicsMap[key] || DICTIONARY.it.topics[key] || topicKey;
}

/**
 * Aggiorna tutti gli elementi del DOM annotati con data-i18n, data-i18n-title,
 * data-i18n-aria o data-i18n-placeholder.
 */
export function translateDomTree(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const textNodes = root.querySelectorAll('[data-i18n]');
  textNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const translated = t(key);
    if (el.getAttribute('data-i18n-html') === 'true') {
      el.innerHTML = translated;
    } else {
      el.textContent = translated;
    }
  });

  const titleNodes = root.querySelectorAll('[data-i18n-title]');
  titleNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });

  const ariaNodes = root.querySelectorAll('[data-i18n-aria]');
  ariaNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });

  const placeholderNodes = root.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
}
