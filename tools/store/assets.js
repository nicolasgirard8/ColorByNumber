// Génère l'icône, l'écran de démarrage Android et les images des stores à partir des dessins du jeu.
// Usage (serveur local requis : python3 -m http.server 8765 dans public/) : node tools/store/assets.js
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const RES = path.join(ROOT, 'android/app/src/main/res');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => typeof library !== 'undefined' && library.length > 20);
  const render = (spec) => page.evaluate((spec) => {
    const byIdL = (id) => library.find((i) => i.id === id);
    const cv = document.createElement('canvas'); cv.width = spec.w; cv.height = spec.h;
    const g = cv.getContext('2d');
    const pixel = (img, x, y, s) => img.cells.forEach((c, k) => { if (c < 0) return; g.fillStyle = img.palette[c]; g.fillRect(Math.round(x + (k % img.w) * s), Math.round(y + Math.floor(k / img.w) * s), Math.ceil(s), Math.ceil(s)); });
    // Fond violet en dégradé, ou transparent (premier plan d'icône adaptative).
    if (!spec.transparent) {
      const gr = g.createLinearGradient(0, 0, spec.w, spec.h);
      gr.addColorStop(0, '#8f72ff'); gr.addColorStop(1, '#5b3fd6');
      g.fillStyle = gr;
      if (spec.shape === 'round') { g.beginPath(); g.arc(spec.w / 2, spec.h / 2, spec.w / 2, 0, 7); g.fill(); }
      else if (spec.shape === 'rounded') { const r = spec.w * 0.18; g.beginPath(); g.roundRect(0, 0, spec.w, spec.h, r); g.fill(); }
      else g.fillRect(0, 0, spec.w, spec.h);
      // Confettis de pixels.
      const conf = [['#ffd93b', 0.12, 0.16], ['#ff6fa8', 0.82, 0.14], ['#3cc47c', 0.86, 0.78], ['#2f9ee1', 0.1, 0.8], ['#ff9f1a', 0.2, 0.5], ['#ffffff', 0.8, 0.46]];
      if (spec.confetti) conf.forEach(([c, fx, fy]) => { const s = spec.w * 0.055; g.fillStyle = c; g.fillRect(spec.w * fx - s / 2, spec.h * fy - s / 2, s, s); });
    }
    // Personnages : chacun à sa place, mis à l'échelle.
    spec.items.forEach(({ id, cx, cy, size }) => {
      const img = byIdL(id); if (!img) return;
      const s = (size * Math.min(spec.w, spec.h)) / Math.max(img.w, img.h);
      pixel(img, spec.w * cx - (img.w * s) / 2, spec.h * cy - (img.h * s) / 2, s);
    });
    if (spec.title) {
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = '900 ' + spec.title.size + 'px "Fredoka", "Arial Black", Arial, sans-serif';
      g.lineJoin = 'round'; g.lineWidth = spec.title.size * 0.16; g.strokeStyle = '#2c1d6e';
      spec.title.lines.forEach((t, k) => { const y = spec.h * spec.title.y + k * spec.title.size * 1.05; g.strokeText(t, spec.w * spec.title.x, y); g.fillStyle = k === spec.title.lines.length - 1 ? '#ffd93b' : '#ffffff'; g.fillText(t, spec.w * spec.title.x, y); });
    }
    return cv.toDataURL('image/png');
  }, spec);
  const save = async (file, spec) => {
    const url = await render(spec);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  };
  const dino = (size, cy = 0.53) => [{ id: 'ia-trex', cx: 0.5, cy, size }];

  // Icônes des stores et du site.
  await save(path.join(ROOT, 'store/icon-512.png'), { w: 512, h: 512, items: dino(0.74), confetti: true });
  await save(path.join(ROOT, 'public/icons/icon-512.png'), { w: 512, h: 512, shape: 'rounded', items: dino(0.74), confetti: true });
  await save(path.join(ROOT, 'public/icons/icon-192.png'), { w: 192, h: 192, shape: 'rounded', items: dino(0.74), confetti: true });
  // Icônes Android : classique, ronde et adaptative (premier plan dans la zone sûre de 66/108).
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    await save(path.join(RES, 'mipmap-' + d, 'ic_launcher.png'), { w: 48 * k, h: 48 * k, shape: 'rounded', items: dino(0.76), confetti: true });
    await save(path.join(RES, 'mipmap-' + d, 'ic_launcher_round.png'), { w: 48 * k, h: 48 * k, shape: 'round', items: dino(0.66) });
    await save(path.join(RES, 'mipmap-' + d, 'ic_launcher_foreground.png'), { w: 108 * k, h: 108 * k, transparent: true, items: dino(0.52) });
  }
  // Écrans de démarrage (mêmes tailles que ceux générés par Capacitor).
  for (const dir of fs.readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
    const f = path.join(RES, dir, 'splash.png');
    if (!fs.existsSync(f)) continue;
    const buf = fs.readFileSync(f);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    await save(f, { w, h, items: dino(0.42, 0.5) });
  }
  // Image de présentation Google Play (1024 × 500).
  await save(path.join(ROOT, 'store/feature-1024x500.png'), {
    w: 1024, h: 500, confetti: false,
    items: [{ id: 'ia-trex', cx: 0.56, cy: 0.55, size: 0.74 }, { id: 'hq-dragon', cx: 0.72, cy: 0.52, size: 0.72 }, { id: 'ia-footballeur', cx: 0.87, cy: 0.58, size: 0.56 }],
    title: { lines: ['Pixel', 'Coloriage', 'Kids'], x: 0.05, y: 0.25, size: 78 },
  });
  await browser.close();
  console.log('images générées');
})();
