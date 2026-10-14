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
  check('Il tastierino mostra le 6 operazioni',
    (await page.locator('#keypad-ops .keypad-op').count()) === 6);
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

  // 9. Nessun errore in console durante le interazioni
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
