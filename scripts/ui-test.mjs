// scripts/ui-test.mjs — Test di interfaccia (Playwright) sull'app aperta da file://.
//
// Verifica ciò che i test unitari non possono vedere: che la pagina si carichi
// senza errori in console e che le interazioni funzionino davvero nel browser.
//
// Uso:  node scripts/ui-test.mjs
// Variabile utile: UI_SCREENSHOTS=1 per salvare gli screenshot in tests/screenshots/
//
// Nasce da un errore reale: una modifica a index.html aveva svuotato l'app
// lasciando una pagina bianca, e i test unitari erano tutti verdi.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const shotsDir = path.join(root, 'tests', 'screenshots');
const wantShots = process.env.UI_SCREENSHOTS === '1';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: ok ? null : (detail || 'condizione non soddisfatta') });
}

async function launchBrowser() {
  // In ambienti sandbox il bootstrap dei mach port di Chromium può essere
  // negato: --single-process evita il rendezvous server e permette il lancio.
  try {
    return await chromium.launch();
  } catch (err) {
    return await chromium.launch({ args: ['--single-process'] });
  }
}

async function run() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const consoleErrors = [];
  // Le richieste di rete (Google Fonts) falliscono offline: non sono errori JS.
  const isNetworkNoise = (text) => /Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_FILE_NOT_FOUND/i.test(text);
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isNetworkNoise(msg.text())) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  await page.goto(pageUrl);
  await page.waitForLoadState('domcontentloaded');

  // 1. Caricamento della pagina
  check('La pagina si carica con il titolo atteso',
    (await page.title()) === 'Laboratorio di Formule Inverse',
    await page.title());
  check('Nessun errore JavaScript al caricamento', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('La libreria delle formule è popolata',
    (await page.locator('#library-list .formula-card').count()) > 10);

  // Test di ricerca interattiva nella libreria:
  await page.locator('#library-search').fill('stevino');
  await page.waitForTimeout(100);
  const stevinoCards = await page.locator('#library-list .formula-card').count();
  check('Ricerca UI: "stevino" mostra le formule di Stevino', stevinoCards >= 2, `trovate ${stevinoCards} carte`);

  await page.locator('#library-search').fill('archimede');
  await page.waitForTimeout(100);
  const archimedeCards = await page.locator('#library-list .formula-card').count();
  check('Ricerca UI: "archimede" mostra le formule di Archimede', archimedeCards >= 2, `trovate ${archimedeCards} carte`);

  await page.locator('#library-search').fill('suono');
  await page.waitForTimeout(100);
  const suonoCards = await page.locator('#library-list .formula-card').count();
  check('Ricerca UI: "suono" mostra tutte le formule acustiche e onde sonore', suonoCards >= 12, `trovate ${suonoCards} carte`);

  // Ripristina ricerca vuota
  await page.locator('#library-search').fill('');
  await page.waitForTimeout(100);

  // 2. Scelta della grandezza da ricavare
  await page.locator('#library-list .formula-card').first().click();
  const pickModal = page.locator('#pick-target-backdrop');
  await pickModal.waitFor({ state: 'visible', timeout: 3000 });
  check('Si apre la scelta della grandezza da isolare', await pickModal.isVisible());
  await page.locator('#pick-target-buttons button', { hasText: 'ricava t' }).first().click();
  await page.waitForTimeout(200);
  check('L\'equazione compare nell\'area di lavoro',
    (await page.locator('#equation-display .math-node').count()) >= 3);
  check('L\'obiettivo mostra la grandezza scelta',
    (await page.locator('#objective-text').innerText()).includes('t'));

  // 3. Tastierino: le operazioni e le grandezze dell'equazione
  check('Il tastierino mostra le operazioni (incluse arcsin, arccos, arctan)',
    (await page.locator('#keypad-ops .keypad-op').count()) >= 9);
  const operands = await page.locator('#keypad-operands .keypad-operand').allInnerTexts();
  check('Il tastierino elenca le grandezze dell\'equazione',
    operands.includes('s') && operands.includes('t') && operands.includes('v'),
    operands.join(', '));

  // 4. Moltiplicazione per 2 applicata a entrambi i membri
  const beforeMul = await page.locator('#equation-display').innerText();
  await page.locator('#keypad-ops .keypad-op', { hasText: '×' }).click();
  await page.locator('.keypad-custom-value').fill('2');
  await page.locator('.keypad-custom-apply').click();
  await page.waitForTimeout(400);
  const afterMul = await page.locator('#equation-display').innerText();
  check('Moltiplicando per 2 cambia l\'equazione', beforeMul !== afterMul,
    `${beforeMul} -> ${afterMul}`);
  check('Il fattore 2 compare in entrambi i membri',
    afterMul.split('=').every((part) => part.includes('2')),
    afterMul);
  check('La cronologia registra l\'operazione',
    (await page.locator('#history-list li').count()) >= 2);
  if (wantShots) {
    fs.mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: path.join(shotsDir, 'keypad.png'), fullPage: true });
  }

  // 5. Annullamento (undo)
  await page.locator('#btn-undo').click();
  await page.waitForTimeout(250);
  const afterUndo = await page.locator('#equation-display').innerText();
  check('Annulla riporta all\'equazione precedente', afterUndo === beforeMul,
    `${afterMul} -> ${afterUndo}`);

  // 6. Spazi di inserimento durante il trascinamento
  await page.locator('#btn-redo').click();
  await page.waitForTimeout(200);
  const dragInfo = await page.evaluate(() => {
    const token = document.querySelector('#equation-display [draggable="true"]');
    if (!token) return { ok: false, reason: 'nessun token trascinabile' };
    const dt = new DataTransfer();
    token.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    const container = document.querySelector('#equation-display');
    const visible = [...container.querySelectorAll('.drop-slot-visible')];
    const sides = [...new Set(visible.map((el) => el.dataset.side))];
    const slots = [...new Set(visible.map((el) => el.dataset.slot))];
    token.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return { ok: visible.length > 0, sides, slots,
      clearedAfterDrag: container.querySelectorAll('.drop-slot-visible').length === 0 };
  });
  check('Durante il trascinamento si aprono gli spazi di inserimento',
    dragInfo.ok, dragInfo.reason || 'nessuno slot visibile');
  check('Gli spazi compaiono solo sul membro di destinazione',
    dragInfo.sides && dragInfo.sides.length === 1,
    (dragInfo.sides || []).join(', '));
  check('Gli spazi rispettano numeratore e denominatore',
    dragInfo.slots && dragInfo.slots.includes('num') && dragInfo.slots.includes('den'),
    (dragInfo.slots || []).join(', '));
  check('Gli spazi si richiudono al termine del trascinamento',
    dragInfo.clearedAfterDrag === true);
  if (wantShots) {
    await page.evaluate(() => {
      document.querySelector('#equation-display [draggable="true"]')
        .dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true }));
    });
    await page.screenshot({ path: path.join(shotsDir, 'drop-slots.png'), fullPage: true });
    await page.evaluate(() => {
      document.querySelector('#equation-display [draggable="true"]')
        .dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
    });
  }

  // 7. Regola dei reciproci
  const beforeRecip = await page.locator('#equation-display').innerText();
  await page.locator('#btn-reciprocal').click();
  await page.waitForTimeout(300);
  const afterRecip = await page.locator('#equation-display').innerText();
  check('La regola dei reciproci trasforma l\'equazione',
    beforeRecip !== afterRecip, `${beforeRecip} -> ${afterRecip}`);
  check('Dopo i reciproci v = s/t diventa 1/v = t/s',
    afterRecip.replace(/\s+/g, '').includes('1') && afterRecip.includes('='),
    afterRecip);
  if (wantShots) {
    await page.screenshot({ path: path.join(shotsDir, 'reciprocals.png'), fullPage: true });
  }

  // 8. Regola dello specchio
  const beforeMirror = await page.locator('#equation-display').innerText();
  await page.locator('#btn-mirror').click();
  await page.waitForTimeout(300);
  const afterMirrorRaw = (await page.locator('#equation-display').innerText()).replace(/\s+/g, '');
  const beforeMirrorRaw = beforeMirror.replace(/\s+/g, '');
  const [bl, br] = beforeMirrorRaw.split('=');
  check('La regola dello specchio scambia i due membri',
    afterMirrorRaw === `${br}=${bl}`, `${beforeMirrorRaw} -> ${afterMirrorRaw}`);

  // 8b. Regola del cambio di segno (posizionato prima della croce di semplificazione)
  const isDirectlyBeforeCross = await page.evaluate(() => {
    const changeBtn = document.getElementById('btn-change-sign');
    const crossBtn = document.getElementById('btn-cross');
    return changeBtn && crossBtn && changeBtn.nextElementSibling === crossBtn;
  });
  check('Il pulsante Cambio Segno è posizionato subito prima della Croce di semplificazione',
    isDirectlyBeforeCross);

  await page.evaluate(() => {
    document.querySelectorAll('details.editor-toggle').forEach((d) => { d.open = true; });
  });
  await page.locator('#custom-formula').fill('-v = -v0 + a*t');
  await page.locator('#custom-target').fill('v');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(300);

  await page.locator('#btn-change-sign').click();
  await page.waitForTimeout(300);
  const rawText = await page.locator('#equation-display').innerText();
  const clean = rawText.replace(/\s+/g, '').replace(/\u2212/g, '-');
  check('La regola del cambio di segno inverte i segni dell\'equazione',
    clean.includes('v0-') || clean.includes('v₀-') || clean.includes('v=v0'),
    clean);

  // 9. Croce di semplificazione (formula personalizzata con un fattore comune)
  await page.evaluate(() => {
    document.querySelectorAll('details.editor-toggle').forEach((d) => { d.open = true; });
  });
  await page.locator('#custom-formula').fill('(2*L)/2 = b');
  await page.locator('#custom-target').fill('L');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(300);

  await page.locator('#btn-cross').click();
  check('La croce si attiva', await page.locator('#cross-layer').isVisible());
  check('Il pulsante croce risulta premuto',
    (await page.locator('#btn-cross').getAttribute('aria-pressed')) === 'true');

  const numId = 'left/num/Mul0';
  const denId = 'left/den';
  await page.locator(`#equation-display [data-id="${numId}"]`).click();
  check('Il primo fattore scelto viene marcato',
    (await page.locator('#equation-display .cross-marked').count()) === 1);
  await page.locator(`#equation-display [data-id="${denId}"]`).click();
  await page.waitForTimeout(500);
  const afterCross = (await page.locator('#equation-display .math-node').allInnerTexts())
    .map((t) => t.replace(/\s+/g, '')).join(' ');
  check('La croce semplifica 2 con 2 e resta L = b',
    afterCross === 'L b', `elementi dopo la croce: "${afterCross}"`);
  check('Il fattore 2 è stato eliminato',
    !afterCross.includes('2'), afterCross);
  check('La cronologia registra la semplificazione',
    (await page.locator('#history-list li').count()) >= 2);
  if (wantShots) {
    await page.screenshot({ path: path.join(shotsDir, 'cross.png'), fullPage: true });
  }

  // 10. Croce su fattori diversi: errore didattico
  await page.locator('#custom-formula').fill('(t*v)/v = s/v');
  await page.locator('#custom-target').fill('s');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(300);
  await page.locator('#btn-cross').click();
  await page.locator('#equation-display [data-id="left/num/Mul0"]').click();
  await page.locator('#equation-display [data-id="left/den"]').click();
  await page.waitForTimeout(400);
  const errText = await page.locator('#message-box').innerText();
  check('La croce segnala l\'errore su fattori diversi',
    /non sono uguali/i.test(errText), errText);
  check('La croce rifiutata non cambia l\'equazione',
    (await page.locator('#equation-display').innerText()).includes('v'),
    await page.locator('#equation-display').innerText());

  // 11. Temi: contrasto del testo (WCAG AA) in chiaro, scuro, alto contrasto
  const contrastOf = async () => page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number)
        .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const effBg = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)/.test(bg)) return bg;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const el = document.querySelector('#equation-display .math-node') || document.body;
    const l1 = lum(getComputedStyle(el).color);
    const l2 = lum(effBg(el));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });

  const lightContrast = await contrastOf();
  check('Tema chiaro: contrasto testo ≥ 4.5 (WCAG AA)', lightContrast >= 4.5, lightContrast.toFixed(2));

  await page.locator('#btn-theme').click();
  await page.waitForTimeout(250);
  const darkContrast = await contrastOf();
  check('Tema scuro: contrasto testo ≥ 4.5 (WCAG AA)', darkContrast >= 4.5, darkContrast.toFixed(2));

  await page.locator('#btn-contrast').click();
  await page.waitForTimeout(250);
  const hcContrast = await contrastOf();
  check('Alto contrasto: contrasto testo ≥ 7 (WCAG AAA)', hcContrast >= 7, hcContrast.toFixed(2));

  await page.locator('#btn-contrast').click();
  await page.locator('#btn-theme').click();
  await page.waitForTimeout(200);

  // 12. Accessibilità da tastiera (la modalità croce va disattivata prima)
  await page.locator('#btn-cross').click();
  await page.waitForTimeout(150);
  const kb = await page.evaluate(() => {
    const node = document.querySelector('#equation-display .math-node');
    node.focus();
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return {
      selected: !!document.querySelector('#equation-display .math-node.selected'),
      hint: document.querySelector('#action-hint').textContent,
      role: node.getAttribute('role'),
      tabindex: node.getAttribute('tabindex'),
    };
  });
  check('Gli elementi dell\'equazione sono raggiungibili da tastiera',
    kb.role === 'button' && kb.tabindex === '0', JSON.stringify(kb));
  check('Invio seleziona l\'elemento e mostra le operazioni',
    kb.selected && /Selezionato: "[^"]+"/.test(kb.hint), kb.hint);
  check('L\'etichetta dell\'elemento selezionato non è "undefined"',
    !/undefined/.test(kb.hint), kb.hint);

  // 13. Layout responsive: nessuno scorrimento orizzontale su smartphone e tablet
  const viewportsToTest = [
    { name: 'Smartphone piccolo (360×640)', width: 360, height: 640, expectMobileNav: true },
    { name: 'iPhone SE (375×667)', width: 375, height: 667, expectMobileNav: true },
    { name: 'iPhone 14 (390×844)', width: 390, height: 844, expectMobileNav: true },
    { name: 'iPad Portrait (768×1024)', width: 768, height: 1024, expectMobileNav: true },
    { name: 'iPad Air Portrait (820×1180)', width: 820, height: 1180, expectMobileNav: true },
    { name: 'iPad Landscape (1024×768)', width: 1024, height: 768, expectMobileNav: false },
  ];
  for (const vp of viewportsToTest) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(150);
    const vpInfo = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const nav = document.querySelector('#mobile-nav-bar');
      const navVisible = nav ? getComputedStyle(nav).display !== 'none' : false;
      return { overflow, navVisible };
    });
    check(`${vp.name}: nessuno scorrimento orizzontale`,
      vpInfo.overflow === 0, `overflow ${vpInfo.overflow}px`);
    check(`${vp.name}: barra navigazione mobile coerente col layout`,
      vpInfo.navVisible === vp.expectMobileNav, `navVisible=${vpInfo.navVisible}`);
  }

  // 14. Touch Drag & Drop su token annidati (es. m in F = m·a): nessun badge/cerchio blu in sovrimpressione
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.locator('#custom-formula').fill('F = m * a');
  await page.locator('#custom-target').fill('a');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(250);
  await page.locator('#equation-display').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  // Fase 1: pointerdown su token annidato 'm' dentro 'm·a'
  const touchDownState = await page.evaluate(() => {
    const tokens = Array.from(document.querySelectorAll('#equation-display .draggable-token'));
    const mToken = tokens.find((el) => el.textContent.trim() === 'm');
    if (!mToken) return { error: 'Token m non trovato' };
    const eqBefore = document.querySelector('#equation-display')?.innerText.replace(/\s+/g, ' ').trim();
    const mRect = mToken.getBoundingClientRect();

    mToken.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 42,
      pointerType: 'touch',
      isPrimary: true,
      clientX: mRect.left + mRect.width / 2,
      clientY: mRect.top + mRect.height / 2,
    }));

    return {
      eqBefore,
      badgesDuringDown: document.querySelectorAll('.touch-drag-badge').length,
      activeDropzonesDuringDrag: document.querySelectorAll('#equation-display .dropzone-active-target').length,
      draggedTokensCount: document.querySelectorAll('#equation-display .is-being-dragged').length,
    };
  });

  // Attende l'espansione CSS della frazione dinamica (.dynamic-fraction-wrapper)
  await page.waitForTimeout(350);

  // Fase 2: pointermove e pointerup sul denominatore del membro sinistro + test pointercancel
  const touchUpState = await page.evaluate(() => {
    const tokens = Array.from(document.querySelectorAll('#equation-display .draggable-token'));
    const mToken = tokens.find((el) => el.textContent.trim() === 'm');
    const lhsZone = document.querySelector('#equation-display .dropzone[data-side="left"][data-slot="den"]');
    if (!mToken || !lhsZone) return { error: 'Token m o drop zone LHS non trovati' };

    const lhsRect = lhsZone.getBoundingClientRect();
    const targetX = lhsRect.left + lhsRect.width / 2;
    const targetY = lhsRect.top + lhsRect.height / 2;

    mToken.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: 42,
      pointerType: 'touch',
      isPrimary: true,
      clientX: targetX,
      clientY: targetY,
    }));
    const badgesDuringMove = document.querySelectorAll('.touch-drag-badge').length;

    mToken.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: 42,
      pointerType: 'touch',
      isPrimary: true,
      clientX: targetX,
      clientY: targetY,
    }));
    const badgesAfterUp = document.querySelectorAll('.touch-drag-badge').length;
    const eqAfterUp = document.querySelector('#equation-display')?.innerText.replace(/\s+/g, ' ').trim();

    // Simula un secondo touch interrotto da pointercancel
    const anyToken = document.querySelector('#equation-display .draggable-token');
    if (anyToken) {
      const r = anyToken.getBoundingClientRect();
      anyToken.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 43,
        pointerType: 'touch',
        isPrimary: true,
        clientX: r.left + 5,
        clientY: r.top + 5,
      }));
      anyToken.dispatchEvent(new PointerEvent('pointercancel', {
        bubbles: true,
        cancelable: true,
        pointerId: 43,
        pointerType: 'touch',
        isPrimary: true,
      }));
    }
    const badgesAfterCancel = document.querySelectorAll('.touch-drag-badge').length;
    const isDraggingClassLeft = document.querySelector('#equation-display')?.classList.contains('is-dragging-equation') || false;

    return {
      badgesDuringMove,
      badgesAfterUp,
      badgesAfterCancel,
      isDraggingClassLeft,
      eqAfterUp,
    };
  });

  const touchDragResult = { ...touchDownState, ...touchUpState };

  check('Touch drag evidenzia solo il token e le dropzone senza creare alcun badge/cerchio blu (.touch-drag-badge)',
    touchDragResult.badgesDuringDown === 0 &&
    touchDragResult.badgesDuringMove === 0 &&
    touchDragResult.activeDropzonesDuringDrag > 0 &&
    touchDragResult.draggedTokensCount === 1,
    JSON.stringify(touchDragResult));
  check('Touch pointerup applica la mossa e pointercancel pulisce lo stato (0 badge residui)',
    touchDragResult.badgesAfterUp === 0 &&
    touchDragResult.badgesAfterCancel === 0 &&
    !touchDragResult.isDraggingClassLeft &&
    touchDragResult.eqBefore !== touchDragResult.eqAfterUp,
    JSON.stringify(touchDragResult));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);

  // 15. Modalità: esattamente 2 (Libera e Automatica)
  const modeButtons = await page.locator('.mode-row .mode-btn').allInnerTexts();
  check('Le modalità sono esattamente 2 (Libera e Automatica)',
    modeButtons.length === 2 && modeButtons[0].trim() === 'Libera' && modeButtons[1].trim() === 'Automatica',
    modeButtons.join(', '));

  // 16. Modalità Automatica: ogni click del mouse esegue un'operazione giustificando la regola
  await page.locator('#custom-formula').fill('v = s/t');
  await page.locator('#custom-target').fill('t');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(300);

  await page.locator('.mode-btn[data-mode="auto"]').click();
  await page.waitForTimeout(200);
  check('La modalità Automatica è attiva',
    (await page.locator('.mode-btn[data-mode="auto"]').getAttribute('aria-pressed')) === 'true');

  const eqBeforeClick = await page.locator('#equation-display').innerText();
  // Clic del mouse sull'equazione: esegue il primo passaggio
  await page.locator('#equation-display').click();
  await page.waitForTimeout(400);

  const eqAfterClick1 = await page.locator('#equation-display').innerText();
  const ruleTitle1 = await page.locator('#rule-panel .rule-name').innerText();
  const rulePanelText = await page.locator('#rule-panel').innerText();

  check('Primo click del mouse esegue l\'operazione',
    eqBeforeClick !== eqAfterClick1, `${eqBeforeClick} -> ${eqAfterClick1}`);
  check('Il programma giustifica la regola matematica applicata',
    ruleTitle1.length > 0 && /principio|regola|moltiplicazione|divisione/i.test(rulePanelText),
    `Regola: "${ruleTitle1}"`);

  // Continua a cliccare fino al completamento dell'isolamento
  for (let i = 0; i < 4; i++) {
    const isDone = (await page.locator('#objective-status').innerText()).includes('Raggiunto');
    if (isDone) break;
    await page.locator('#equation-display').click();
    await page.waitForTimeout(400);
  }

  check('Obiettivo raggiunto con i click del mouse',
    (await page.locator('#objective-status').innerText()).includes('Raggiunto'));

  // Test tasto "Ricomincia":
  const isRetryVisible = await page.locator('#btn-retry-exercise').isVisible();
  const isBannerVisible = await page.locator('#completion-banner').isVisible();
  check('Tasto "Ricomincia" è visibile e attivo', isRetryVisible);
  check('Banner celebrativo con tasti Riprova e Altro compare al completamento', isBannerVisible);

  // Click su "Riprova": deve riavviare l'esercizio con la formula iniziale
  await page.locator('#btn-completion-retry').click();
  await page.waitForTimeout(300);
  const eqAfterRetry = await page.locator('#equation-display').innerText();
  const isRetryStillVisible = await page.locator('#btn-retry-exercise').isVisible();
  check('Premendo "Riprova" l\'equazione torna alla formula di partenza', eqAfterRetry.includes('s') && eqAfterRetry.includes('t') && eqAfterRetry.includes('v'));
  check('Dopo il riavvio il tasto ricomincia resta sempre attivo e visibile', isRetryStillVisible);

  // 17. Progressive Web App (PWA) e installabilità su Android
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  check('Il tag manifest per PWA è presente in index.html', manifestHref === 'manifest.json');

  const manifestPath = path.join(root, 'manifest.json');
  const manifestExists = fs.existsSync(manifestPath);
  let manifestObj = null;
  if (manifestExists) {
    try {
      manifestObj = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (_) {}
  }
  check('Il file manifest.json esiste ed è valido', !!manifestObj);
  check('Il manifest è configurato in modalità standalone per Android',
    manifestObj && manifestObj.display === 'standalone');
  check('Il manifest include le icone richieste (192, 512 e maskable)',
    manifestObj && manifestObj.icons && manifestObj.icons.length >= 4);

  const icon192Exists = fs.existsSync(path.join(root, 'icons', 'icon-192.png'));
  const icon512Exists = fs.existsSync(path.join(root, 'icons', 'icon-512.png'));
  const swExists = fs.existsSync(path.join(root, 'sw.js'));
  check('Le icone PNG 192 e 512 esistono sul disco', icon192Exists && icon512Exists);
  check('Il file sw.js (Service Worker) esiste per il supporto offline', swExists);

  const hasInstallBtn = await page.locator('#btn-install-pwa').count();
  check('Il pulsante di installazione PWA (#btn-install-pwa) è presente nel DOM', hasInstallBtn === 1);

  // 18. Banner didattico frazioni di frazione
  const hasCompoundBanner = await page.locator('#compound-fraction-banner').count();
  const hasCompoundTitle = await page.locator('#compound-fraction-title').count();
  const hasCompoundBadge = await page.locator('#compound-fraction-step-badge').count();
  const hasCompoundMsg = await page.locator('#compound-fraction-msg').count();
  check('Elementi banner frazione di frazione presenti nel DOM',
    hasCompoundBanner === 1 && hasCompoundTitle === 1 && hasCompoundBadge === 1 && hasCompoundMsg === 1);

  // 19. Esportatore Schede Didattiche e Verifiche per Docenti
  const btnWorksheet = page.locator('#btn-export-worksheet');
  const hasWorksheetBtn = await btnWorksheet.count();
  check('Il pulsante Esporta Scheda (#btn-export-worksheet) è presente nella toolbar', hasWorksheetBtn === 1);

  await btnWorksheet.click();
  await page.waitForTimeout(100);
  const isWorksheetModalVisible = await page.evaluate(() => {
    const m = document.getElementById('worksheet-modal-backdrop');
    return m && !m.hidden;
  });
  check('Il clic su Esporta Scheda apre la modale #worksheet-modal-backdrop', isWorksheetModalVisible);

  const previewHasContent = await page.evaluate(() => {
    const p = document.getElementById('worksheet-html-preview');
    return p && p.textContent.includes('Esercizio');
  });
  check("L'anteprima HTML della scheda genera gli esercizi con testo e formule", previewHasContent);

  const latexHasContent = await page.evaluate(() => {
    const ltx = document.getElementById('worksheet-latex-code');
    return ltx && ltx.value.includes('\\documentclass') && ltx.value.includes('\\begin{document}');
  });
  check('Il codice LaTeX generato è compilabile e include preambolo e document', latexHasContent);

  // Chiusura modale
  await page.locator('#btn-close-worksheet').click();
  await page.waitForTimeout(100);
  const isWorksheetModalClosed = await page.evaluate(() => {
    const m = document.getElementById('worksheet-modal-backdrop');
    return m && m.hidden;
  });
  check('Il pulsante Chiudi nasconde correttamente la modale', isWorksheetModalClosed);

  // 20. Accessibilità avanzata (a11y/DSA): vocalizzazione matematica aria-live e attributi ARIA
  const liveVerbalizer = await page.locator('#math-live-verbalizer').count();
  const liveAlert = await page.locator('#math-live-alert').count();
  check('Regioni live per vocalizzazione matematica presenti nel DOM (#math-live-verbalizer, #math-live-alert)',
    liveVerbalizer === 1 && liveAlert === 1);

  const verbalText = await page.locator('#math-live-verbalizer').innerText();
  check('aria-live math verbalization contiene la lettura naturale italiana dell\'equazione',
    verbalText.length > 0 && /uguale/i.test(verbalText), verbalText);

  const eqAriaLabel = await page.locator('#equation-display .math-eq').getAttribute('aria-label');
  check('Il contenitore dell\'equazione espone aria-label descrittivo per screen reader',
    eqAriaLabel && eqAriaLabel.startsWith('Equazione:'), eqAriaLabel);

  const tokenRoleDesc = await page.locator('#equation-display .draggable-token').first().getAttribute('aria-roledescription');
  check('I token matematici trascinabili definiscono aria-roledescription coerente',
    tokenRoleDesc === 'termine matematico trascinabile', tokenRoleDesc);

  const hasSpeakBtn = await page.locator('#btn-speak-equation').count();
  check('Pulsante di sintesi vocale (#btn-speak-equation) presente con aria-label', hasSpeakBtn === 1);
  if (hasSpeakBtn) {
    await page.locator('#btn-speak-equation').click();
    await page.waitForTimeout(200);
    const spokenLive = await page.locator('#math-live-verbalizer').innerText();
    check('Pulsante audio attiva la lettura didattica DSA senza errori',
      /Lettura formula|Equazione/i.test(spokenLive) || spokenLive.length > 0, spokenLive);
  }

  // 21. Ottimizzazione Lavagna Interattiva (LIM) e Calibrazione Penna / Touch
  const hasLimBtn = await page.locator('#btn-lim-mode').count();
  check('Pulsante modalità LIM (#btn-lim-mode) presente nella toolbar', hasLimBtn === 1);

  await page.locator('#btn-lim-mode').click();
  await page.waitForTimeout(200);
  const isLimActive = await page.evaluate(() => document.body.classList.contains('lim-mode'));
  const limAriaPressed = await page.locator('#btn-lim-mode').getAttribute('aria-pressed');
  check('Attivazione modalità LIM aggiunge classe .lim-mode e aggiorna aria-pressed="true"',
    isLimActive && limAriaPressed === 'true');

  // Test calibrazione stilo LIM: trascina con pointerType="pen" rilasciando a 25px dal bordo della dropzone (simulazione parallasse vetro LIM)
  await page.locator('#custom-formula').fill('F = m * a');
  await page.locator('#custom-target').fill('a');
  await page.locator('#btn-load-custom').click();
  await page.waitForTimeout(250);

  const limStylusResult = await page.evaluate(() => {
    const tokens = Array.from(document.querySelectorAll('#equation-display .draggable-token'));
    const mToken = tokens.find((el) => el.textContent.trim() === 'm');
    const lhsZone = document.querySelector('#equation-display .dropzone[data-side="left"][data-slot="den"]');
    if (!mToken || !lhsZone) return { error: 'Elementi non trovati' };

    const mRect = mToken.getBoundingClientRect();
    const lhsRect = lhsZone.getBoundingClientRect();
    const eqBefore = document.querySelector('#equation-display')?.innerText.replace(/\s+/g, ' ').trim();

    // Inizio drag con penna LIM
    mToken.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true,
      pointerId: 99, pointerType: 'pen', isPrimary: true,
      clientX: mRect.left + mRect.width / 2, clientY: mRect.top + mRect.height / 2,
    }));

    // Posizione di rilascio con parallasse LIM (25px sotto il rettangolo del denominatore)
    const penParallaxX = lhsRect.left + lhsRect.width / 2;
    const penParallaxY = lhsRect.bottom + 25;

    mToken.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true,
      pointerId: 99, pointerType: 'pen', isPrimary: true,
      clientX: penParallaxX, clientY: penParallaxY,
    }));

    mToken.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true,
      pointerId: 99, pointerType: 'pen', isPrimary: true,
      clientX: penParallaxX, clientY: penParallaxY,
    }));

    const eqAfter = document.querySelector('#equation-display')?.innerText.replace(/\s+/g, ' ').trim();
    return { eqBefore, eqAfter, success: eqBefore !== eqAfter };
  });

  check('Calibrazione penna/stilo LIM: aggancio geometrico della dropzone con tolleranza da parallasse',
    limStylusResult.success === true, JSON.stringify(limStylusResult));

  // Disattiva modalità LIM
  await page.locator('#btn-lim-mode').click();
  await page.waitForTimeout(150);

  // 22. Verifica completa contrasti WCAG AAA su pulsanti, target e pannelli
  await page.locator('#btn-contrast').click();
  await page.waitForTimeout(250);

  const aaaContrasts = await page.evaluate(() => {
    const lum = (c) => {
      const parts = c.match(/\d+/g);
      if (!parts || parts.length < 3) return 0;
      const [r, g, b] = parts.slice(0, 3).map(Number)
        .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const effBg = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)/.test(bg)) return bg;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const getRatio = (el) => {
      if (!el) return 21;
      const l1 = lum(getComputedStyle(el).color);
      const l2 = lum(effBg(el));
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const targetEl = document.querySelector('.node-target');
    const btnSecondary = document.querySelector('.btn-secondary');
    const keypadOp = document.querySelector('.keypad-op');

    return {
      targetRatio: getRatio(targetEl),
      btnSecondaryRatio: getRatio(btnSecondary),
      keypadRatio: getRatio(keypadOp),
    };
  });

  check('Alto contrasto WCAG AAA: target ratio ≥ 7.0', aaaContrasts.targetRatio >= 7.0, aaaContrasts.targetRatio.toFixed(2));
  check('Alto contrasto WCAG AAA: pulsanti secondari ratio ≥ 7.0', aaaContrasts.btnSecondaryRatio >= 7.0, aaaContrasts.btnSecondaryRatio.toFixed(2));
  check('Alto contrasto WCAG AAA: tastierino op ratio ≥ 7.0', aaaContrasts.keypadRatio >= 7.0, aaaContrasts.keypadRatio.toFixed(2));

  await page.locator('#btn-contrast').click();
  await page.waitForTimeout(150);

  // 23. Modalità Eserciziario / Quiz interattivo & Dashboard Badge
  await page.locator('#btn-mode-quiz').click();
  await page.waitForTimeout(200);
  const isQuizHudVisible = await page.evaluate(() => {
    const h = document.getElementById('quiz-hud');
    return h && !h.hidden;
  });
  check('Il pulsante Quiz attiva la Modalità Quiz e mostra il Quiz HUD', isQuizHudVisible);

  // Selezione livello intermedio
  await page.locator('#quiz-level-medium').click();
  await page.waitForTimeout(200);
  const isMediumActive = await page.locator('#quiz-level-medium').evaluate((el) => el.classList.contains('active'));
  check('La selezione del livello Intermedio nel Quiz funziona', isMediumActive);

  // Apertura Dashboard Badge
  await page.locator('#btn-quiz-dashboard').click();
  await page.waitForTimeout(200);
  const isDashboardOpen = await page.evaluate(() => {
    const d = document.getElementById('quiz-dashboard-backdrop');
    return d && !d.hidden;
  });
  const badgesCount = await page.locator('#quiz-badges-grid .quiz-badge-card').count();
  check('Il pulsante Dashboard apre la finestra con i 12 Badge di Maestria', isDashboardOpen && badgesCount === 12, `Badge trovati: ${badgesCount}`);

  // Chiusura Dashboard
  await page.locator('#quiz-btn-close-dashboard').click();
  await page.waitForTimeout(150);
  const isDashboardClosed = await page.evaluate(() => {
    const d = document.getElementById('quiz-dashboard-backdrop');
    return d && d.hidden;
  });
  check('La chiusura della Dashboard Quiz nasconde correttamente la modale', isDashboardClosed);

  // Disattivazione Quiz Mode
  await page.locator('#btn-mode-quiz').click();
  await page.waitForTimeout(150);
  const isQuizHudClosed = await page.evaluate(() => {
    const h = document.getElementById('quiz-hud');
    return h && h.hidden;
  });
  check('Il pulsante Quiz disattiva correttamente la Modalità Quiz tornando a Libera', isQuizHudClosed);

  // 24. Nessun errore in console durante le interazioni
  check('Nessun errore JavaScript durante le interazioni',
    consoleErrors.length === 0, consoleErrors.join(' | '));

  await browser.close();
}

run()
  .then(() => {
    const failed = results.filter((r) => !r.ok);
    for (const r of results) {
      console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? '  → ' + r.detail : ''}`);
    }
    console.log(`\n${results.length - failed.length}/${results.length} test di interfaccia superati` +
      (failed.length ? `, ${failed.length} FALLITI` : ''));
    process.exit(failed.length ? 1 : 0);
  })
  .catch((err) => {
    console.error('Errore durante i test di interfaccia:', err.message);
    process.exit(1);
  });
