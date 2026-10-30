// Captures d'écran pour les stores (téléphone et tablette), prises sur la version des stores.
// Usage : npm run build:store, puis servir dist-store/ (python3 -m http.server 8766 dans dist-store/),
// puis node tools/store/screenshots.js
'use strict';
const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, '../../store/captures');
const DONE = ['ia-trex', 'xl-pompiers', 'ia-policier', 'xl-tricera', 'ia-footballeur', 'xl-requin', 'ia-hockeyeur', 'xl-fusee', 'xl-po-badge', 'xl-train', 'xl-brachio', 'coeur'];

async function shoot(browser, name, viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8766/');
  // Un joueur, des dessins finis (vignettes en couleur) et un dessin commencé.
  await p.evaluate((done) => {
    localStorage.clear();
    localStorage.setItem('cbn.profiles', JSON.stringify([{ id: 'k', name: 'Léo', avatar: '🦖', color: '#8fd0f8' }]));
    localStorage.setItem('cbn.u.k.settings', JSON.stringify({ sound: true, bomb: 5, bucket: 5, tips: 9 }));
    done.forEach((id) => localStorage.setItem('cbn.u.k.p.' + id, JSON.stringify({ o: [], c: 1, d: true })));
  }, DONE);
  await p.reload();
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const img = library.find((i) => i.id === 'xl-po-moto');
    const fill = Int16Array.from(img.cells, (c, k) => (c >= 0 && (k % img.w) < img.w * 0.62 ? c : -1));
    localStorage.setItem('cbn.u.k.p.' + img.id, JSON.stringify({ s: encodeCells(fill), o: [], c: 1, d: false }));
  });
  await p.reload();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, name + '-1-galerie.png') });
  await p.locator('.card', { hasText: 'Moto de police' }).first().click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, name + '-2-coloriage.png') });
  await p.locator('#btn-back').click();
  await p.waitForTimeout(500);
  await p.locator('#btn-album').click();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(OUT, name + '-3-album.png') });
  await ctx.close();
}

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  await shoot(b, 'telephone', { width: 432, height: 768 }, 2.5);
  await shoot(b, 'tablette', { width: 1280, height: 800 }, 2);
  await b.close();
  console.log('captures prêtes');
})();
