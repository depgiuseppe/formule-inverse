// scripts/generate-icons.mjs
// Genera le icone PNG (192x192, 512x512, maskable, apple-touch-icon, favicon)
// a partire dagli SVG con Playwright Chromium headless.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'icons');

async function generate() {
  const browser = await chromium.launch({ args: ['--single-process'] }).catch(() => chromium.launch());
  const page = await browser.newPage();

  const iconSvgPath = path.join(iconsDir, 'icon.svg');
  const maskableSvgPath = path.join(iconsDir, 'icon-maskable.svg');

  const targets = [
    { svg: iconSvgPath, file: 'icon-192.png', size: 192 },
    { svg: iconSvgPath, file: 'icon-512.png', size: 512 },
    { svg: maskableSvgPath, file: 'icon-maskable-192.png', size: 192 },
    { svg: maskableSvgPath, file: 'icon-maskable-512.png', size: 512 },
    { svg: iconSvgPath, file: 'apple-touch-icon.png', size: 180 },
    { svg: iconSvgPath, file: 'favicon-32.png', size: 32 },
  ];

  for (const t of targets) {
    const svgContent = fs.readFileSync(t.svg, 'utf-8');
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${t.size}px; height: ${t.size}px; overflow: hidden; background: transparent; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(iconsDir, t.file);
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`✓ Generata icona: ${t.file} (${t.size}x${t.size}px)`);
  }

  await browser.close();
  console.log('Tutte le icone PWA per Android sono state generate con successo!');
}

generate().catch((err) => {
  console.error('Errore generazione icone:', err);
  process.exit(1);
});
