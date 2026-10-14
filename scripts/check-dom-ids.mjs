// scripts/check-dom-ids.mjs — Controllo di coerenza tra i selettori usati nel
// JavaScript e gli id realmente presenti in index.html.
//
// Nasce da un errore reale: una modifica a index.html aveva rimosso
// #equation-display, lasciando l'app con una pagina bianca e un
// "Cannot read properties of null (reading 'addEventListener')" in console.
//
// Uso:  node scripts/check-dom-ids.mjs
// Exit code 1 se un id manca (così la build fallisce subito).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const idsInHtml = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

// Il bundle è generato: controlliamo i sorgenti.
const sources = fs.readdirSync(path.join(root, 'js'))
  .filter((f) => f.endsWith('.js') && f !== 'bundle.js');

const missing = [];
for (const file of sources) {
  const code = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  const found = new Set();
  for (const m of code.matchAll(/\$\(\s*'#([\w-]+)'\s*\)/g)) found.add(m[1]);
  for (const m of code.matchAll(/querySelector\(\s*'#([\w-]+)'\s*\)/g)) found.add(m[1]);
  for (const m of code.matchAll(/getElementById\(\s*'([\w-]+)'\s*\)/g)) found.add(m[1]);
  for (const id of found) {
    if (!idsInHtml.has(id)) missing.push(`js/${file}: #${id} non esiste in index.html`);
  }
}

if (missing.length > 0) {
  console.error('✗ Selettori DOM non coerenti con index.html:');
  for (const line of missing) console.error('  - ' + line);
  process.exit(1);
}
console.log(`✓ Coerenza DOM verificata: ${idsInHtml.size} id in index.html, tutti i selettori JS risolti.`);
