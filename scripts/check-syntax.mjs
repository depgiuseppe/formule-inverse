// scripts/check-syntax.mjs — Verifica la sintassi di ogni modulo sorgente.
// Uso:  node scripts/check-syntax.mjs

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'js');

const failed = [];
for (const file of fs.readdirSync(jsDir).filter((f) => f.endsWith('.js') && f !== 'bundle.js')) {
  try {
    execSync(`node --check js/${file}`, { cwd: root, stdio: 'pipe' });
  } catch (e) {
    failed.push(`js/${file}: ${(e.stderr || '').toString().split('\n').slice(0, 4).join('\n')}`);
  }
}

if (failed.length > 0) {
  console.error('✗ Errori di sintassi:');
  for (const f of failed) console.error(f);
  process.exit(1);
}
console.log('✓ Sintassi di tutti i moduli verificata.');
