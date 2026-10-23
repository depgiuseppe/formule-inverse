// scripts/bundle.mjs — Costruisce il bundle standalone per l'esecuzione offline / file://
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

console.log('1/3 Controllo coerenza selettori DOM...');
try {
  execSync('node scripts/check-dom-ids.mjs', { cwd: root, stdio: 'inherit' });
} catch (e) {
  console.error('Errore nel controllo dei selettori DOM.');
  process.exit(1);
}

console.log('2/3 Controllo sintassi dei sorgenti...');
try {
  execSync('node scripts/check-syntax.mjs', { cwd: root, stdio: 'inherit' });
} catch (e) {
  console.error('Errore nel controllo di sintassi.');
  process.exit(1);
}

console.log('3/3 Compilazione bundle standalone da architettura modulare ES (app.js + ui-canvas.js, ui-numpad.js, ui-history.js, ui-modals.js)...');
try {
  execSync('npx -y esbuild js/app.js --bundle --outfile=js/bundle.js --format=iife', {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('✓ js/bundle.js generato con successo.');
} catch (e) {
  console.error('Errore durante il bundling:', e.message);
  process.exit(1);
}
