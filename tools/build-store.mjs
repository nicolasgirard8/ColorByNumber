// Prépare la version des stores (Google Play, Amazon) dans dist-store/ :
// copie de public/ avec APP_CONFIG.store = true (personnages sous licence retirés).
// Ensuite : npx cap sync android (voir STORES.md).
import { cpSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-store');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
// Le site familial (Cloudflare) garde ses fichiers propres ; l'app n'a pas besoin du service worker.
cpSync(join(root, 'public'), out, { recursive: true, filter: (src) => !/[\\/](_headers|sw\.js)$/.test(src) });
writeFileSync(join(out, 'js/config.js'), "'use strict';\n\nwindow.APP_CONFIG = { store: true };\n");
console.log('dist-store prêt');
