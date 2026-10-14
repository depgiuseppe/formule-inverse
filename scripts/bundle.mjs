// scripts/bundle.mjs — Costruisce il bundle standalone per l'esecuzione offline / file://
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

console.log('Compilazione bundle standalone...');
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
