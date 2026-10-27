// Convertit les dessins vectoriels de tools/sprites/*.svg en grilles de coloriage.
// Usage : node tools/sprites/build.js [--preview fichier.png] [noms…]
// (serveur local requis : python3 -m http.server 8765 dans public/)
// Chaque SVG déclare : data-id, data-name, data-cat, data-size (côté max en cases),
// et facultativement data-weights="#couleur:poids,…" pour garder les petits détails.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, '../../public/js/sprites.js');

// Exécuté dans la page. Deux rendus du même dessin : complet (silhouette et traits)
// et sans les traits noirs (vraies couleurs sous les traits). Puis, comme un graphiste
// pixel art : trait d'une case sans coins doublés, contour extérieur net, couleurs
// réunies. Les ombres et reflets viennent du dessin vectoriel (fonction shade).
function rasterize(svgFull, svgFill, opts) {
  const load = (t) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t))); });
  return Promise.all([load(svgFull), load(svgFill)]).then(([imF, imL]) => {
    const { size, weights, S, full, max } = opts;
    const vb = svgFull.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const ratio = vb[2] / vb[3];
    const W0 = ratio >= 1 ? size : Math.round(size * ratio), H0 = ratio >= 1 ? Math.round(size / ratio) : size;
    const Wp = W0 * S, Hp = H0 * S;
    const grab = (im) => { const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, Wp, Hp); return g.getImageData(0, 0, Wp, Hp).data; };
    const DF = grab(imF), DL = grab(imL);
    // Palette exacte : toutes les couleurs écrites dans le SVG.
    const pal = [...new Set((svgFull.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toLowerCase()))];
    const rgb = pal.map((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)));
    const lumOf = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
    const lum = rgb.map(lumOf);
    const inkIdx = lum.indexOf(Math.min(...lum));
    const inkLike = lum.map((l) => l < 0.13);
    const nearest = (D, i) => {
      let best = 0, bd = Infinity;
      for (let j = 0; j < rgb.length; j++) {
        const c = rgb[j], e = (D[i] - c[0]) ** 2 + (D[i + 1] - c[1]) ** 2 + (D[i + 2] - c[2]) ** 2;
        if (e < bd) { bd = e; best = j; }
      }
      return best;
    };
    // Distance (en pixels) au vide extérieur : les traits proches du bord forment le contour.
    const N = Wp * Hp, dist = new Float32Array(N);
    for (let p = 0; p < N; p++) dist[p] = DF[p * 4 + 3] < 128 ? 0 : 1e9;
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      const p = y * Wp + x; let v = dist[p];
      if (x > 0) v = Math.min(v, dist[p - 1] + 1);
      if (y > 0) { v = Math.min(v, dist[p - Wp] + 1); if (x > 0) v = Math.min(v, dist[p - Wp - 1] + 1.41); if (x < Wp - 1) v = Math.min(v, dist[p - Wp + 1] + 1.41); }
      dist[p] = v;
    }
    for (let y = Hp - 1; y >= 0; y--) for (let x = Wp - 1; x >= 0; x--) {
      const p = y * Wp + x; let v = dist[p];
      if (x < Wp - 1) v = Math.min(v, dist[p + 1] + 1);
      if (y < Hp - 1) { v = Math.min(v, dist[p + Wp] + 1); if (x < Wp - 1) v = Math.min(v, dist[p + Wp + 1] + 1.41); if (x > 0) v = Math.min(v, dist[p + Wp - 1] + 1.41); }
      dist[p] = v;
    }
    const edgePx = opts.strokePx * 1.15;
    // 1. Une couleur par case (rendu sans traits) et la part de trait intérieur.
    const C = W0 * H0;
    let cells = new Array(C).fill(-1);
    const base = new Array(C).fill(-1), cov = new Float32Array(C), noFill = new Uint8Array(C);
    for (let cy = 0; cy < H0; cy++) for (let cx = 0; cx < W0; cx++) {
      const t = new Array(pal.length).fill(0);
      let op = 0, inner = 0, filled = 0;
      for (let y = cy * S; y < (cy + 1) * S; y++) for (let x = cx * S; x < (cx + 1) * S; x++) {
        const p = y * Wp + x, i = p * 4;
        if (DF[i + 3] < 128) continue;
        op++;
        const fillHere = DL[i + 3] >= 128;
        const jl = fillHere ? nearest(DL, i) : -1;
        if (fillHere) { filled++; t[jl] += weights[pal[jl]] || 1; }
        if (inkLike[nearest(DF, i)] && !(fillHere && inkLike[jl]) && (full || dist[p] > edgePx)) inner++;
      }
      const c = cy * W0 + cx;
      if (op * 2 < S * S) continue;
      let best = inkIdx;
      if (filled) { best = 0; t.forEach((v, j) => { if (v > t[best]) best = j; }); }
      else noFill[c] = 1;
      base[c] = best; cells[c] = best; cov[c] = inner / op;
    }
    const at = (a, x, y) => (x < 0 || y < 0 || x >= W0 || y >= H0 ? -1 : a[y * W0 + x]);
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    // 2. Traits intérieurs amincis à une case (squelette de Zhang-Suen).
    const M = new Uint8Array(C);
    for (let c = 0; c < C; c++) if (cells[c] >= 0 && !inkLike[cells[c]] && cov[c] >= opts.inkCov) M[c] = 1;
    const mAt = (x, y) => (x < 0 || y < 0 || x >= W0 || y >= H0 ? 0 : M[y * W0 + x]);
    for (let changed = true; changed;) {
      changed = false;
      for (const step of [0, 1]) {
        const del = [];
        for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
          if (!M[y * W0 + x]) continue;
          const P2 = mAt(x, y - 1), P3 = mAt(x + 1, y - 1), P4 = mAt(x + 1, y), P5 = mAt(x + 1, y + 1);
          const P6 = mAt(x, y + 1), P7 = mAt(x - 1, y + 1), P8 = mAt(x - 1, y), P9 = mAt(x - 1, y - 1);
          const seq = [P2, P3, P4, P5, P6, P7, P8, P9, P2];
          const B = P2 + P3 + P4 + P5 + P6 + P7 + P8 + P9;
          let A = 0; for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++;
          if (B < 2 || B > 6 || A !== 1) continue;
          if (step === 0 ? (P2 * P4 * P6 === 0 && P4 * P6 * P8 === 0) : (P2 * P4 * P8 === 0 && P2 * P6 * P8 === 0)) del.push(y * W0 + x);
        }
        del.forEach((c) => { M[c] = 0; }); if (del.length) changed = true;
      }
    }
    const kind = new Uint8Array(C); // 1 aplat foncé, 2 trait, 3 contour
    for (let c = 0; c < C; c++) {
      if (cells[c] < 0) continue;
      if (M[c]) { cells[c] = inkIdx; kind[c] = 2; } else if (inkLike[cells[c]] && !noFill[c]) kind[c] = 1;
    }
    const isInk = (v) => v >= 0 && inkLike[v];
    const ring = () => {
      for (let c = 0; c < C; c++) {
        if (cells[c] < 0 || (isInk(cells[c]) && kind[c] !== 0)) continue;
        const x = c % W0, y = (c / W0) | 0;
        if (N4.some(([a, b]) => at(cells, x + a, y + b) === -1)) { cells[c] = inkIdx; kind[c] = 3; }
      }
    };
    // 3. Contour extérieur : une seule case, à l'intérieur de la silhouette.
    if (!full) {
      ring();
      // Restes du trait extérieur (sans couleur dessous) : repris par la couleur voisine.
      for (let pass = 0; pass < 3; pass++) for (let c = 0; c < C; c++) {
        if (!noFill[c] || kind[c] === 3 || cells[c] < 0) continue;
        const x = c % W0, y = (c / W0) | 0, t = {};
        N4.forEach(([a, b]) => { const v = at(cells, x + a, y + b); if (v >= 0 && !inkLike[v]) t[v] = (t[v] || 0) + 1; });
        const k = Object.keys(t); if (k.length) { cells[c] = +k.sort((a, b) => t[b] - t[a])[0]; noFill[c] = 0; kind[c] = 0; }
      }
    }
    // 4. Coins en escalier : la case du coin d'un « L » est en trop (trait « pixel perfect »).
    for (let pass = 0; pass < 2; pass++) for (let c = 0; c < C; c++) {
      if (kind[c] !== 2 && kind[c] !== 3) continue;
      const x = c % W0, y = (c / W0) | 0;
      const inkN = N8.filter(([a, b]) => { const v = at(cells, x + a, y + b); return isInk(v) && kind[(y + b) * W0 + x + a] !== 1; });
      if (inkN.length !== 2) continue;
      const [[a1, b1], [a2, b2]] = inkN;
      if (!(Math.abs(a1) + Math.abs(b1) === 1 && Math.abs(a2) + Math.abs(b2) === 1 && (a1 === 0) !== (a2 === 0))) continue;
      const colorN = N4.map(([a, b]) => at(cells, x + a, y + b)).filter((v) => v >= 0 && !inkLike[v]);
      if (kind[c] === 3) {
        if (colorN.length) continue; // coin rentrant : le contour reste fermé
        cells[c] = -1; kind[c] = 0;
      } else {
        cells[c] = base[c] >= 0 && !inkLike[base[c]] ? base[c] : (colorN.length ? colorN[0] : inkIdx); kind[c] = 0;
      }
    }
    if (!full) ring();
    // 5. Cases de couleur isolées : prises par la couleur voisine (détails protégés exceptés).
    for (let pass = 0; pass < 2; pass++) {
      const next = cells.slice();
      for (let c = 0; c < C; c++) {
        const v = cells[c]; if (v < 0 || inkLike[v] || weights[pal[v]]) continue;
        const x = c % W0, y = (c / W0) | 0;
        const nb = N4.map(([a, b]) => at(cells, x + a, y + b));
        if (nb.includes(v)) continue;
        const t = {}; nb.filter((n) => n >= 0 && !inkLike[n]).forEach((n) => { t[n] = (t[n] || 0) + 1; });
        const k = Object.keys(t); if (k.length) next[c] = +k.sort((a, b) => t[b] - t[a])[0];
      }
      cells = next;
    }
    // Contours colorés : un trait prend une version foncée de la couleur qu'il borde.
    if (opts.selout) {
      const next = cells.slice();
      for (let c = 0; c < C; c++) {
        if (!(kind[c] === 2 || kind[c] === 3) || !isInk(cells[c])) continue;
        const x = c % W0, y = (c / W0) | 0, t = {};
        N8.forEach(([a, b]) => { const v = at(cells, x + a, y + b); if (v >= 0 && !inkLike[v]) t[v] = (t[v] || 0) + 1; });
        const k = Object.keys(t); if (!k.length) continue;
        const col = rgb[+k.sort((a, b) => t[b] - t[a])[0]];
        const dc = [col[0] * 0.42, col[1] * 0.38, col[2] * 0.48].map((v) => Math.round(v));
        const hx = '#' + dc.map((v) => v.toString(16).padStart(2, '0')).join('');
        let j = pal.indexOf(hx); if (j < 0) { pal.push(hx); rgb.push(dc); lum.push(lumOf(dc)); inkLike.push(false); j = pal.length - 1; }
        next[c] = j;
      }
      cells = next;
    }
    // Textes en lettres de pixels (5 cases de haut), centrés sur x, posés en haut à y.
    const FONT = {
      A: ['0110', '1001', '1111', '1001', '1001'], B: ['1110', '1001', '1110', '1001', '1110'], C: ['0111', '1000', '1000', '1000', '0111'],
      D: ['1110', '1001', '1001', '1001', '1110'], E: ['1111', '1000', '1110', '1000', '1111'], F: ['1111', '1000', '1110', '1000', '1000'],
      G: ['0111', '1000', '1011', '1001', '0111'], H: ['1001', '1001', '1111', '1001', '1001'], I: ['111', '010', '010', '010', '111'],
      K: ['1001', '1010', '1100', '1010', '1001'], L: ['1000', '1000', '1000', '1000', '1111'], M: ['10001', '11011', '10101', '10001', '10001'],
      N: ['1001', '1101', '1011', '1001', '1001'], O: ['0110', '1001', '1001', '1001', '0110'], P: ['1110', '1001', '1110', '1000', '1000'],
      R: ['1110', '1001', '1110', '1010', '1001'], S: ['0111', '1000', '0110', '0001', '1110'], T: ['11111', '00100', '00100', '00100', '00100'],
      U: ['1001', '1001', '1001', '1001', '0110'], X: ['1001', '1001', '0110', '1001', '1001'], ' ': ['00', '00', '00', '00', '00'],
      0: ['0110', '1001', '1001', '1001', '0110'], 1: ['010', '110', '010', '010', '111'], 7: ['1111', '0001', '0010', '0100', '0100'],
    };
    (opts.texts || []).forEach((t) => {
      const j = (() => { const c = [1, 3, 5].map((k) => parseInt(t.color.slice(k, k + 2), 16)); const hx = t.color.toLowerCase(); let i = pal.indexOf(hx); if (i < 0) { pal.push(hx); rgb.push(c); lum.push(lumOf(c)); inkLike.push(lumOf(c) < 0.13); i = pal.length - 1; } return i; })();
      const glyphs = [...t.text.toUpperCase()].map((ch) => FONT[ch] || FONT[' ']);
      const width = glyphs.reduce((sum, g) => sum + g[0].length + 1, -1);
      let gx = Math.round((t.x / vb[2]) * W0 - width / 2);
      const gy = Math.round((t.y / vb[3]) * H0);
      glyphs.forEach((g) => {
        g.forEach((row, yy) => [...row].forEach((bit, xx) => { if (bit === '1') { const X = gx + xx, Y = gy + yy; if (X >= 0 && Y >= 0 && X < W0 && Y < H0 && cells[Y * W0 + X] >= 0) cells[Y * W0 + X] = j; } }));
        gx += g[0].length + 1;
      });
    });
    // 6. Trop de couleurs : les deux teintes les plus proches sont réunies (jamais le trait).
    for (;;) {
      const count = {};
      cells.forEach((v) => { if (v >= 0) count[v] = (count[v] || 0) + 1; });
      const used = Object.keys(count).map(Number);
      if (used.length <= max) break;
      let best = null;
      for (const a of used) for (const b of used) {
        if (a >= b || a === inkIdx || b === inkIdx) continue;
        const ca = rgb[a], cb = rgb[b];
        const dd = 2 * (ca[0] - cb[0]) ** 2 + 4 * (ca[1] - cb[1]) ** 2 + 3 * (ca[2] - cb[2]) ** 2;
        if (!best || dd < best[0]) best = [dd, a, b];
      }
      const [, a, b] = best;
      const from = count[a] < count[b] ? a : b, to = from === a ? b : a;
      cells = cells.map((v) => (v === from ? to : v));
    }
    // 7. Recadrage et lettres (couleurs de la plus claire à la plus foncée).
    let x0 = W0, y0 = H0, x1 = -1, y1 = -1;
    cells.forEach((v, c) => { if (v < 0) return; const x = c % W0, y = (c / W0) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    if (full) { x0 = 0; y0 = 0; x1 = W0 - 1; y1 = H0 - 1; }
    const usedAll = [...new Set(cells.filter((v) => v >= 0))].sort((a, b) => lum[b] - lum[a]);
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', colors = {}, map = {};
    usedAll.forEach((v, k) => { colors[L[k]] = pal[v]; map[v] = L[k]; });
    const rows = [];
    for (let y = y0; y <= y1; y++) { let r = ''; for (let x = x0; x <= x1; x++) { const v = cells[y * W0 + x]; r += v < 0 ? '.' : map[v]; } rows.push(r); }
    return { colors, rows };
  });
}


// Image PNG/JPG (générée par une IA, dessinée…) : fond blanc retiré, couleurs regroupées
// (k-moyennes), traits noirs unifiés, puis un rendu « sans traits » où chaque pixel de trait
// prend la couleur voisine. Le résultat passe ensuite par rasterize comme un dessin vectoriel.
function prepRaster(url, K) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      const sc = Math.min(1, 900 / Math.max(im.width, im.height));
      const W = Math.round(im.width * sc), H = Math.round(im.height * sc), N = W * H;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, W, H);
      const img = g.getImageData(0, 0, W, H), d = img.data;
      // Fond : pixels clairs et gris reliés au bord.
      const bgLike = (p) => { const i = p * 4, mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); return d[i + 3] < 128 || (mn > 170 && mx - mn < 40); };
      const bg = new Uint8Array(N), stack = [];
      for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
      while (stack.length) {
        const p = stack.pop(); if (bg[p] || !bgLike(p)) continue; bg[p] = 1;
        const x = p % W, y = (p / W) | 0;
        if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
      }
      // k-moyennes sur un échantillon des pixels du sujet.
      const sample = [];
      for (let p = 0; p < N; p += 3) if (!bg[p]) sample.push([d[p * 4], d[p * 4 + 1], d[p * 4 + 2]]);
      const dist2 = (a, b) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;
      const centers = [sample[(sample.length / 2) | 0]];
      while (centers.length < K) {
        let best = null, bd = -1;
        for (let i = 0; i < sample.length; i += 7) { const m = Math.min(...centers.map((c) => dist2(c, sample[i]))); if (m > bd) { bd = m; best = sample[i]; } }
        centers.push(best.slice());
      }
      for (let it = 0; it < 12; it++) {
        const sum = centers.map(() => [0, 0, 0, 0]);
        sample.forEach((px) => { let j = 0, bd = Infinity; centers.forEach((c, k) => { const e = dist2(c, px); if (e < bd) { bd = e; j = k; } }); const s2 = sum[j]; s2[0] += px[0]; s2[1] += px[1]; s2[2] += px[2]; s2[3]++; });
        sum.forEach((s2, k) => { if (s2[3]) centers[k] = [s2[0] / s2[3], s2[1] / s2[3], s2[2] / s2[3]]; });
      }
      const lum = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
      const INK = [27, 27, 34];
      const cols = centers.map((c) => (lum(c) < 0.22 ? INK : c.map(Math.round)));
      const lab = new Int16Array(N).fill(-1);
      for (let p = 0; p < N; p++) {
        if (bg[p]) continue;
        const px = [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]];
        let j = 0, bd = Infinity; centers.forEach((c, k) => { const e = dist2(c, px); if (e < bd) { bd = e; j = k; } });
        lab[p] = j;
      }
      const isInk = (j) => cols[j] === INK;
      const paint = (labels) => {
        const out = g.createImageData(W, H);
        for (let p = 0; p < N; p++) { const j = labels[p]; if (j < 0) continue; const c = cols[j]; out.data.set([c[0], c[1], c[2], 255], p * 4); }
        g.putImageData(out, 0, 0); return cv.toDataURL('image/png');
      };
      const fullUrl = paint(lab);
      // Rendu sans traits : chaque pixel noir prend la couleur non noire la plus proche.
      // Aplats noirs (pupilles…) : là où le noir est épais, il reste noir ; seuls les traits fins
      // sont remplacés par la couleur voisine.
      const dd = new Float32Array(N);
      for (let p = 0; p < N; p++) dd[p] = lab[p] >= 0 && isInk(lab[p]) ? 1e9 : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (!dd[p]) continue; let v = dd[p]; if (x > 0) v = Math.min(v, dd[p - 1] + 1); if (y > 0) v = Math.min(v, dd[p - W] + 1); dd[p] = v; }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const p = y * W + x; if (!dd[p]) continue; let v = dd[p]; if (x < W - 1) v = Math.min(v, dd[p + 1] + 1); if (y < H - 1) v = Math.min(v, dd[p + W] + 1); dd[p] = v; }
      const thick = Math.max(4, Math.round(Math.max(W, H) / 90)), solid = new Uint8Array(N);
      for (let p = 0; p < N; p++) if (dd[p] >= thick) {
        const x = p % W, y = (p / W) | 0;
        for (let b = -thick; b <= thick; b++) for (let a = -thick; a <= thick; a++) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < W && Y < H && Math.abs(a) + Math.abs(b) <= thick && dd[Y * W + X] > 0) solid[Y * W + X] = 1; }
      }
      const fl = lab.slice(), seen = new Uint8Array(N), q = [];
      for (let p = 0; p < N; p++) if (solid[p]) seen[p] = 1;
      for (let p = 0; p < N; p++) if (lab[p] >= 0 && !isInk(lab[p])) { seen[p] = 1; q.push(p); }
      for (let k = 0; k < q.length; k++) {
        const p = q[k], x = p % W, y = (p / W) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const X = x + a, Y = y + b; if (X < 0 || Y < 0 || X >= W || Y >= H) return; const r = Y * W + X; if (!seen[r] && lab[r] >= 0 && isInk(lab[r])) { seen[r] = 1; fl[r] = fl[p]; q.push(r); } });
      }
      // Un trait sans couleur voisine (aplat noir : pupille…) reste noir.
      const fillUrl = paint(fl);
      const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      const palette = [...new Set(cols.map(hex))];
      const wrap = (u) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"><!-- ' + palette.join(' ') + ' --><image href="' + u + '" width="' + W + '" height="' + H + '"/></svg>';
      const lightest = palette.slice().sort((a, b) => lum([1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16))) - lum([1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16))))[0];
      ok({ full: wrap(fullUrl), fill: wrap(fillUrl), lightest });
    };
    im.src = url;
  });
}

// ---------- Relief : ombre en bas à droite, reflet en haut à gauche ----------
// Chaque forme colorée et entourée d'un trait reçoit une teinte plus foncée sur son bord
// bas-droite et plus claire sur son bord haut-gauche (couleurs plates façon dessin animé).
// `cell` = taille d'une case dans les unités du SVG. data-flat="1" sur une forme : pas de relief.
const toRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lumOf = (h) => { const [r, g, b] = toRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
// Teintes en HSL : l'ombre tourne vers l'orangé (jaunes) ou le violet (bleus, verts),
// le reflet s'éclaircit vers le jaune, comme en pixel art.
function toHsl(h) {
  const [r, g, b] = toRgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const dd = mx - mn, sat = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
  const hue = mx === r ? ((g - b) / dd + (g < b ? 6 : 0)) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [hue * 60, sat, l];
}
function fromHsl(hh, sat, l) {
  hh = ((hh % 360) + 360) % 360 / 360;
  const f = (n) => { const k = (n + hh * 12) % 12; return l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
const hueToward = (hue, target, amount) => { let dh = ((target - hue + 540) % 360) - 180; return hue + Math.sign(dh) * Math.min(Math.abs(dh), amount); };
const darker = (h) => {
  const [hue, sat, l] = toHsl(h);
  if (sat < 0.12) return fromHsl(hue, sat, l * 0.74);
  const target = hue >= 30 && hue < 90 ? 20 : hue >= 90 && hue < 300 ? 250 : 350;
  return fromHsl(hueToward(hue, target, 10), sat, l * 0.78);
};
const lighter = (h) => {
  const [hue, sat, l] = toHsl(h);
  if (sat < 0.12) return fromHsl(hue, sat, l + (1 - l) * 0.5);
  return fromHsl(hueToward(hue, 55, 10), sat, l + (1 - l) * 0.45);
};
let sid = 0;
// Essai « style application » : STYLE=app SCALE=1.7 node tools/sprites/build.js --preview …
const APP = process.env.STYLE === 'app';
function shade(svg, cell) {
  const sd = 3 * cell, hl = 1.6 * cell;
  // On suit les groupes <g> : seules les formes dont le trait est foncé (contour) ont du relief.
  const stack = [false];
  return svg.replace(/<g\b([^>]*)>|<\/g>|<(path|ellipse|circle|rect)\b([^>]*?)\/>/g, (m, gAttrs, tag, attrs) => {
    if (m === '</g>') { if (stack.length > 1) stack.pop(); return m; }
    if (gAttrs !== undefined) {
      const st = (gAttrs.match(/stroke="([^"]*)"/) || [])[1];
      stack.push(st ? st !== 'none' && lumOf(st) < 0.2 : stack[stack.length - 1]);
      return m;
    }
    const own = (attrs.match(/stroke="([^"]*)"/) || [])[1];
    const outlined = own ? own !== 'none' && lumOf(own) < 0.2 : stack[stack.length - 1];
    const fill = (attrs.match(/fill="(#[0-9a-fA-F]{6})"/) || [])[1];
    if (!outlined || !fill || /data-flat/.test(attrs) || /clip-path/.test(attrs)) return m;
    const L = lumOf(fill);
    if (L < 0.25 || L > 0.93) return m;
    const geo = attrs.replace(/\s(fill|stroke|stroke-width|stroke-linejoin|stroke-linecap)="[^"]*"/g, '');
    const id = 's' + (++sid);
    const el = (f) => '<' + tag + geo + ' fill="' + f + '" stroke="none"/>';
    const done = m.replace(/\/>$/, ' data-flat="1"/>');
    // Ombre : la forme décalée vers le haut-gauche laisse une bande foncée en bas à droite.
    // Reflet : ce qui sort de la forme décalée vers le bas-droite devient plus clair.
    if (APP) {
      // Style « application » : deux tons d'ombre et deux tons de reflet, en dégradé.
      const mix = (a, b) => toHex(toRgb(a).map((v, k) => (v + toRgb(b)[k]) / 2));
      const deep = darker(fill), light = lighter(fill);
      const h1 = 1.2 * cell, h2 = 2.4 * cell, s1 = 1.6 * cell, s2 = 3.2 * cell;
      return done
        + '<clipPath id="' + id + '"><' + tag + ' id="' + id + 'g"' + geo + '/></clipPath>'
        + '<clipPath id="' + id + 'a"><use href="#' + id + 'g" transform="translate(' + h1 + ' ' + h1 + ')"/></clipPath>'
        + '<clipPath id="' + id + 'b"><use href="#' + id + 'g" transform="translate(' + h2 + ' ' + h2 + ')"/></clipPath>'
        + '<g clip-path="url(#' + id + ')">' + el(deep)
        + '<g transform="translate(' + -s1 + ' ' + -s1 + ')">' + el(mix(deep, fill)) + '</g>'
        + '<g transform="translate(' + -s2 + ' ' + -s2 + ')">' + el(light) + '</g>'
        + '<g clip-path="url(#' + id + 'a)"><g transform="translate(' + -s2 + ' ' + -s2 + ')">' + el(mix(light, fill)) + '</g></g>'
        + '<g clip-path="url(#' + id + 'b)"><g transform="translate(' + -s2 + ' ' + -s2 + ')">' + el(fill) + '</g></g></g>'
        + done.replace(/fill="#[0-9a-fA-F]{6}"/, 'fill="none"');
    }
    return done
      + '<clipPath id="' + id + '"><' + tag + ' id="' + id + 'g"' + geo + '/></clipPath>'
      + '<clipPath id="' + id + 'h"><use href="#' + id + 'g" transform="translate(' + hl + ' ' + hl + ')"/></clipPath>'
      + '<g clip-path="url(#' + id + ')">' + el(darker(fill))
      + '<g transform="translate(' + -sd + ' ' + -sd + ')">' + el(lighter(fill)) + '</g>'
      + '<g clip-path="url(#' + id + 'h)"><g transform="translate(' + -sd + ' ' + -sd + ')">' + el(fill) + '</g></g></g>'
      + done.replace(/fill="#[0-9a-fA-F]{6}"/, 'fill="none"');
  });
}

// <sprite src="pikachu" x="…" y="…" width="…" height="…" flip="1"/> insère un autre dessin
// (tools/sprites/pikachu.svg ou parts/…) ; ses traits gardent la même épaisseur à l'écran.
let uid = 0;
let included = {};
function expand(svg, cell) {
  return svg.replace(/<sprite ([^>]*)\/>/g, (m, attrs) => {
    const a = {};
    attrs.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { a[k] = v; });
    let src = fs.readFileSync(path.join(DIR, a.src + '.svg'), 'utf8');
    // recolor="#avant:#après,…" : le même dessin dans d'autres couleurs.
    (a.recolor || '').split(',').filter(Boolean).forEach((pair) => { const [f, t] = pair.split(':'); src = src.split(f).join(t); });
    // Les détails protégés du dessin inclus le restent dans la scène.
    ((src.match(/data-weights="([^"]*)"/) || [])[1] || '').split(',').filter(Boolean).forEach((p) => { const [c, v] = p.split(':'); included[c.toLowerCase()] = Math.max(included[c.toLowerCase()] || 0, +v); });
    const vb = src.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const x = +a.x, y = +a.y, w = +a.width, h = +a.height;
    const sc = Math.min(w / vb[2], h / vb[3]);
    const id = 'u' + (++uid);
    let inner = expand(src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), cell / sc);
    inner = shade(inner, cell / sc);
    inner = inner.replace(/stroke-width="([\d.]+)"/g, (_, v) => 'stroke-width="' + (+v * (+a.line || 0.85) / sc).toFixed(2) + '"');
    inner = inner.replace(/id="(\w+)"/g, 'id="$1' + id + '"').replace(/url\(#(\w+)\)/g, 'url(#$1' + id + ')').replace(/href="#(\w+)"/g, 'href="#$1' + id + '"');
    // fit="stretch" : le décor remplit tout le cadre, même s'il n'a pas les mêmes proportions.
    const fit = a.fit === 'stretch' ? ' preserveAspectRatio="none"' : '';
    const nested = '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="' + vb.join(' ') + '"' + fit + '>' + inner + '</svg>';
    let placed = a.flip ? '<g transform="translate(' + (2 * x + w) + ' 0) scale(-1 1)">' + nested + '</g>' : nested;
    // rotate="degrés" : penché autour de son centre (saut, vol…).
    if (a.rotate) placed = '<g transform="rotate(' + a.rotate + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')">' + placed + '</g>';
    return placed;
  });
}

(async () => {
  const args = process.argv.slice(2);
  let preview = null;
  if (args[0] === '--preview') { preview = args[1]; args.splice(0, 2); }
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort();
  // (les morceaux de décor de parts/ ne sont pas des dessins à part entière)
  const pick = args.length ? files.filter((f) => args.includes(f.replace('.svg', ''))) : files;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/');
  const result = [];
  for (const f of pick) {
    included = {};
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    const cellU = +raw.match(/viewBox="[^"]+"/)[0].split(/[\s"]+/)[3] / +((raw.match(/data-size="(\d+)"/) || [])[1] || 44);
    const texts = [];
    const svg = shade(expand(raw.replace(/<pixeltext ([^>]*)\/>/g, (m, at) => { const o = {}; at.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v; }); texts.push({ x: +o.x, y: +o.y, color: o.color, text: o.text }); return ''; }), cellU), cellU);
    const attr = (k, def) => (svg.match(new RegExp('data-' + k + '="([^"]*)"')) || [])[1] || def;
    const weights = { ...included };
    attr('weights', '').split(',').filter(Boolean).forEach((s) => { const [c, v] = s.split(':'); weights[c.toLowerCase()] = +v; });
    const size = Math.round(+attr('size', 44) * (APP ? +(process.env.SCALE || 1.7) : 1));
    const vbW = +svg.match(/viewBox="[^"]+"/)[0].split(/[\s"]+/)[3];
    const k = (vbW / size) * +attr('stroke', 1.05) / 4;
    const svgScaled = svg.replace(/stroke-width="([\d.]+)"/g, (m, v) => 'stroke-width="' + (+v * k).toFixed(2) + '"');
    // Rendu « couleurs seules » : les traits foncés (contours) sont retirés.
    const darkHex = [...new Set((svgScaled.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toLowerCase()))].filter((c) => lumOf(c) < 0.13);
    const svgFill = svgScaled.replace(/stroke="(#[0-9a-fA-F]{6})"/g, (m, c) => (darkHex.includes(c.toLowerCase()) ? 'stroke="none"' : m));
    const o = {
      size, weights, S: 12, full: attr('full', '') === '1',
      max: APP ? 40 : +attr('max', attr('full', '') === '1' ? 24 : 18), selout: APP, inkCov: +attr('ink', 0.24), strokePx: 12 * +attr('stroke', 1.05), texts,
    };
    let full = svgScaled, fill = svgFill;
    if (attr('raster', '')) {
      // Image importée : préparée dans la page, puis convertie comme un dessin.
      const file = path.join(DIR, attr('raster'));
      const url = 'data:image/' + (file.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(file).toString('base64');
      const prepRun = () => page.evaluate(([u, k]) => prepRaster(u, k), [url, +attr('colors', 14)]);
      const pr = await prepRun().catch(async () => { await page.addScriptTag({ content: prepRaster.toString() }); return prepRun(); });
      full = pr.full; fill = pr.fill;
      o.inkCov = +attr('ink', 0.12);
      o.weights = { [pr.lightest]: 3, ...weights };
    }
    const run = () => page.evaluate(([a, b, c]) => rasterize(a, b, c), [full, fill, o]);
    const r = await run().catch(async () => { await page.addScriptTag({ content: rasterize.toString() }); return run(); });
    result.push({ id: attr('id'), name: attr('name'), cat: attr('cat'), colors: r.colors, rows: r.rows, src: f });
  }
  if (preview) {
    const svgs = pick.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8'));
    await page.evaluate(async ([items, svgs, cell]) => {
      const gap = 16, V = 300;
      const W = items.reduce((s, it) => s + Math.max(V, it.rows[0].length * cell) + gap, gap);
      const H = V + Math.max(...items.map((it) => it.rows.length)) * cell + 60;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.id = 'pv';
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      let ox = gap;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const im = await new Promise((ok) => { const m = new Image(); m.onload = () => ok(m); m.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgs[k]))); });
        g.drawImage(im, ox, 5, V, V);
        it.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = it.colors[ch]; g.fillRect(ox + x * cell, V + 20 + y * cell, cell, cell); }));
        g.fillStyle = '#000'; g.font = '13px sans-serif';
        g.fillText(it.id + ' ' + it.rows[0].length + 'x' + it.rows.length + ' ' + Object.keys(it.colors).length + 'c', ox, H - 10);
        ox += Math.max(V, it.rows[0].length * cell) + gap;
      }
      document.body.innerHTML = ''; document.body.style.margin = 0; document.body.appendChild(cv);
    }, [result, svgs, +(process.env.CELL || 9)]);
    await page.setViewportSize({ width: 2400, height: 1000 });
    await page.locator('#pv').screenshot({ path: preview });
  } else {
    // Personnages seuls d'abord, puis les grandes scènes.
    const first = ['jv-souris', 'pk-salameche', 'pk-carapuce', 'pk-bulbizarre', 'xl-pika', 'xl-pk-starters'];
    const rank = (it) => (it.id.startsWith('xl-') ? 10 : 0) + ['pokemon', 'soccer', 'hockey', 'dinos', 'vehicules', 'police', 'espace', 'ocean', 'aventure', 'jeux', 'starwars', 'minecraft', 'animaux', 'nourriture', 'nature', 'objets'].indexOf(it.cat) - (first.includes(it.id) ? 0.5 + (6 - first.indexOf(it.id)) / 100 : 0);
    result.sort((a, b) => rank(a) - rank(b));
    const lines = result.map((it) => '  ' + JSON.stringify({ id: it.id, name: it.name, cat: it.cat, colors: it.colors, rows: it.rows }) + ',');
    fs.writeFileSync(OUT, "// Personnages redessinés en vectoriel (tools/sprites/*.svg) puis convertis par tools/sprites/build.js.\n// Ne pas modifier à la main : relancer le script après avoir changé un SVG.\n'use strict';\n\nconst SPRITES = [\n" + lines.join('\n') + '\n];\n\n// Placés en tête de la galerie ; un dessin du même identifiant est remplacé.\nfor (const s of SPRITES.slice().reverse()) {\n  const i = GAME_ART.findIndex((a) => a.id === s.id);\n  if (i >= 0) GAME_ART.splice(i, 1);\n  GAME_ART.unshift(s);\n}\n');
  }
  console.log(result.map((it) => it.id + ' ' + it.rows[0].length + 'x' + it.rows.length + ' ' + Object.keys(it.colors).length + 'c').join('\n'));
  await browser.close();
})();
