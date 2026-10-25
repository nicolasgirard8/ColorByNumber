// Dessins détaillés sur le thème des jeux vidéo, tracés avec un petit « pinceau » sur une grille.
// Chaque dessin remplit une grille de lettres (une lettre = une couleur de `colors`, '.' = vide).
'use strict';

// `shader` (facultatif) : { dark(lettre) → lettre plus foncée, ground(lettre) → c'est un sol }.
function painter(w, h, seed = 1, shader = null) {
  const g = new Array(w * h).fill('.');
  let shaded = false;
  const rnd = Gen.rng(seed);
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const each = (fn) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fn(x, y); };
  // Parcourt seulement les cases d'un rectangle englobant (plus rapide pour les grands dessins).
  const eachIn = (x0, y0, x1, y1, fn) => {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(w - 1, Math.ceil(x1)); x++) fn(x, y);
    }
  };

  const P = {
    w, h, rnd,
    get: (x, y) => (inb(x, y) ? g[y * w + x] : '.'),
    set(x, y, c) { if (inb(x, y) && c) g[y * w + x] = c; return P; },
    fill(c) { g.fill(c); return P; },
    rect(x, y, rw, rh, c) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) P.set(i, j, c);
      return P;
    },
    // Rectangle en coordonnées continues : les cases dont le centre est à l'intérieur.
    frect(x, y, rw, rh, c) {
      eachIn(x, y, x + rw, y + rh, (i, j) => {
        if (i + 0.5 >= x && i + 0.5 < x + rw && j + 0.5 >= y && j + 0.5 < y + rh) P.set(i, j, c);
      });
      return P;
    },
    // Ellipse remplie, centre et rayons en coordonnées continues (une case = 1×1).
    ellipse(cx, cy, rx, ry, c, keep = () => true) {
      eachIn(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && keep(x, y)) P.set(x, y, c);
      });
      return P;
    },
    disc(cx, cy, r, c, keep) { return P.ellipse(cx, cy, r, r, c, keep); },
    // Segment épais : toutes les cases à moins de t/2 du segment.
    line(x0, y0, x1, y1, c, t = 1) {
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      const m = t / 2 + 1;
      eachIn(Math.min(x0, x1) - m, Math.min(y0, y1) - m, Math.max(x0, x1) + m, Math.max(y0, y1) + m, (x, y) => {
        const px = x + 0.5, py = y + 0.5;
        const k = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
        if (Math.hypot(px - x0 - k * dx, py - y0 - k * dy) <= t / 2) P.set(x, y, c);
      });
      return P;
    },
    path(pts, c, t = 1) {
      for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, t);
      return P;
    },
    poly(pts, c) {
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      eachIn(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1, (x, y) => {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) P.set(x, y, c);
      });
      return P;
    },
    // Remplace une couleur par une autre là où `test(x, y)` est vrai.
    swap(from, to, test = () => true) {
      each((x, y) => { if (g[y * w + x] === from && test(x, y)) g[y * w + x] = to; });
      return P;
    },
    // Texture aléatoire : remplace `from` par un mélange de couleurs, par blocs de `block` cases.
    noise(from, colors, block = 1, test = () => true) {
      const pick = {};
      each((x, y) => {
        if (g[y * w + x] !== from || !test(x, y)) return;
        const key = Math.floor(x / block) + ',' + Math.floor(y / block);
        if (!(key in pick)) pick[key] = colors[Math.floor(rnd() * colors.length)];
        g[y * w + x] = pick[key];
      });
      return P;
    },
    // Ombre sur le bord bas-droite de chaque forme : donne du relief sans ajouter de reflets.
    shade() {
      if (shaded || !shader) return P;
      shaded = true;
      const out = g.slice();
      const outside = (x, y) => P.get(x, y) === '.';
      // Seules les grandes zones reçoivent une ombre : peu de couleurs en plus pour les petits.
      const count = {};
      g.forEach((c) => { count[c] = (count[c] || 0) + 1; });
      each((x, y) => {
        const c = g[y * w + x];
        if (c === '.' || count[c] < 40) return;
        const dark = shader.dark(c);
        if (!dark) return;
        // Les détails fins (yeux, traits) restent intacts.
        const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => P.get(x + a, y + b) === c).length;
        if (same < 2) return;
        if (outside(x + 1, y) || outside(x, y + 1) || outside(x + 1, y + 1)) out[y * w + x] = dark;
      });
      out.forEach((v, i) => { g[i] = v; });
      return P;
    },
    // Contour autour de tout ce qui est dessiné.
    outline(c, diagonal = false) {
      P.shade();
      const add = [];
      each((x, y) => {
        if (g[y * w + x] !== '.') return;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        if (diagonal) nb.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        if (nb.some(([a, b]) => { const v = P.get(x + a, y + b); return v !== '.' && v !== c; })) add.push([x, y]);
      });
      add.forEach(([x, y]) => P.set(x, y, c));
      return P;
    },
    // Petit motif texte (une lettre par case), avec agrandissement facultatif.
    stamp(x, y, rows, scale = 1) {
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '.') P.rect(x + i * scale, y + j * scale, scale, scale, ch);
      }));
      return P;
    },
    // Copie la moitié gauche sur la moitié droite.
    mirror() {
      for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) g[y * w + (w - 1 - x)] = g[y * w + x];
      return P;
    },
    stars(c, density, test = () => true) {
      each((x, y) => { if (rnd() < density && test(x, y)) P.set(x, y, c); });
      return P;
    },
    // Dessine sur un calque transparent, l'entoure d'un contour puis le colle sur le dessin.
    layer(fn, outlineColor) {
      const q = painter(w, h, Math.floor(rnd() * 1e9), shader);
      fn(q);
      if (outlineColor) q.outline(outlineColor);
      const cells = q.cells();
      // Petite ombre au sol sous les objets posés par terre.
      if (shader && outlineColor) {
        for (let x = 0; x < w; x++) {
          let low = -1;
          for (let y = h - 1; y >= 0; y--) if (cells[y * w + x] !== '.') { low = y; break; }
          if (low < 0 || low + 1 >= h) continue;
          const under = g[(low + 1) * w + x];
          if (cells[(low + 1) * w + x] === '.' && shader.ground(under) && shader.dark(under)) g[(low + 1) * w + x] = shader.dark(under);
        }
      }
      cells.forEach((v, i) => { if (v !== '.') g[i] = v; });
      return P;
    },
    cells: () => g,
    rows() {
      const out = [];
      for (let y = 0; y < h; y++) out.push(g.slice(y * w, y * w + w).join(''));
      return out;
    },
  };
  return P;
}

const GAME_ART_DEFS = [
  // ---------------- Minecraft ----------------
  {
    id: 'mc-herbe', name: "Bloc d'herbe", cat: 'minecraft', w: 32, h: 32,
    colors: {
      A: '#79c05a', B: '#5fa83a', C: '#8fd46b', H: '#4e8f2e', J: '#3d7524',
      D: '#966c4a', E: '#7a5434', F: '#a87d58', L: '#5e3e24', M: '#4c3119', N: '#6b4a2e', K: '#2a1c10',
    },
    draw(p) {
      p.poly([[16, 0], [32, 8], [16, 16], [0, 8]], 'A');
      p.poly([[0, 8], [16, 16], [16, 32], [0, 24]], 'D');
      p.poly([[16, 16], [32, 8], [32, 24], [16, 32]], 'L');
      p.noise('A', ['A', 'B', 'C', 'A'], 2);
      p.noise('D', ['D', 'E', 'F', 'D'], 2);
      p.noise('L', ['L', 'M', 'N', 'L'], 2);
      // L'herbe déborde sur les côtés.
      for (let x = 0; x < 32; x += 2) {
        const top = x < 16 ? 8 + x / 2 : 16 - (x - 16) / 2;
        const depth = 3 + Math.floor(p.rnd() * 3);
        for (let y = Math.floor(top); y < top + depth; y++) {
          for (let i = x; i < x + 2; i++) {
            const v = p.get(i, y);
            if ('DEF'.includes(v)) p.set(i, y, 'H');
            else if ('LMN'.includes(v)) p.set(i, y, 'J');
          }
        }
      }
      p.line(16, 16, 16, 32, 'K', 0.9);
    },
  },
  {
    id: 'mc-creeper', name: 'Creeper', cat: 'minecraft', w: 32, h: 32,
    colors: { A: '#5dbb46', B: '#4a9e36', C: '#7fd35e', D: '#3d8a2c', E: '#a6e48a', K: '#141414', G: '#2e3a2a' },
    draw(p) {
      p.fill('A').noise('A', ['A', 'B', 'C', 'D', 'A', 'B', 'E'], 2);
      p.stamp(0, 0, [
        '........',
        '........',
        '.XX..XX.',
        '.XX..XX.',
        '...XX...',
        '..XXXX..',
        '..XXXX..',
        '..X..X..',
      ], 4);
      p.noise('X', ['K', 'G', 'K'], 2);
    },
  },
  {
    id: 'mc-epee', name: 'Épée en diamant', cat: 'minecraft', w: 32, h: 32,
    colors: { K: '#10302e', D: '#4be0d0', L: '#a6fff2', M: '#2bb3a6', T: '#1e8c80', B: '#7a4f2a', N: '#5a3518', S: '#e0fffb' },
    draw(p) {
      p.line(9, 23, 28, 4, 'D', 5);
      p.line(10, 21, 27, 4, 'L', 1.6);
      p.line(12, 23, 28, 7, 'M', 1.4);
      p.line(5, 18, 14, 27, 'T', 4);
      p.line(3, 29, 9, 23, 'B', 3.2);
      p.set(5, 26, 'N').set(7, 25, 'N').set(4, 28, 'N');
      p.disc(3, 29, 2.2, 'T');
      p.set(27, 5, 'S').set(26, 6, 'S');
      p.outline('K', true);
    },
  },
  {
    id: 'mc-pioche', name: 'Pioche', cat: 'minecraft', w: 32, h: 32,
    colors: { K: '#1d1d24', G: '#c9cfd8', W: '#eef2f7', M: '#8d96a3', B: '#9a6a3c', N: '#6b4522' },
    draw(p) {
      p.line(5, 28, 22, 11, 'B', 3.4);
      p.line(6, 27, 21, 12, 'N', 1);
      p.path([[7, 5], [14, 5], [21, 8], [25, 12], [28, 19], [28, 26]], 'G', 4.6);
      p.path([[8, 4], [14, 4], [21, 7], [26, 11], [29, 18]], 'W', 1.4);
      p.path([[14, 7], [20, 10], [24, 14], [26, 20]], 'M', 1.4);
      p.outline('K', true);
    },
  },
  {
    id: 'mc-tnt', name: 'TNT', cat: 'minecraft', w: 32, h: 32,
    colors: { R: '#d6402e', S: '#a82a1e', T: '#e86a50', W: '#f4f0e4', G: '#c8c0ad', K: '#1d1d1d', Y: '#ffd23f', F: '#8a8a8a' },
    draw(p) {
      for (let x = 0; x < 32; x++) p.rect(x, 2, 1, 30, Math.floor(x / 4) % 2 ? 'S' : 'R');
      p.swap('R', 'T', (x, y) => x % 4 === 0 && y % 7 === 1);
      p.rect(0, 0, 32, 3, 'K');
      p.rect(0, 11, 32, 10, 'W');
      p.rect(0, 11, 32, 1, 'G').rect(0, 20, 32, 1, 'G');
      p.stamp(4, 13, [
        'KKKKK.K...K.KKKKK',
        '..K...KK..K...K..',
        '..K...K.K.K...K..',
        '..K...K..KK...K..',
        '..K...K...K...K..',
      ], 1);
      p.stamp(15, 0, ['.Y.', 'YFY', '.F.'], 1);
      p.rect(0, 31, 32, 1, 'K');
    },
  },
  {
    id: 'mc-cochon', name: 'Cochon', cat: 'minecraft', w: 32, h: 32,
    colors: { P: '#f2a6a6', Q: '#eb9494', R: '#f7bcbc', S: '#e07a8a', N: '#b04d62', W: '#ffffff', K: '#1d1d1d' },
    draw(p) {
      p.fill('P').noise('P', ['P', 'Q', 'R', 'P'], 2);
      p.stamp(0, 0, [
        '........',
        '........',
        '........',
        '.WK..KW.',
        '........',
        '..SSSS..',
        '..NSSN..',
        '........',
      ], 4);
      p.noise('S', ['S', 'S', 'Q'], 2);
    },
  },
  {
    id: 'mc-coffre', name: 'Coffre', cat: 'minecraft', w: 32, h: 32,
    colors: { A: '#b07a3c', B: '#9a6630', C: '#c48c4a', D: '#7a4e22', K: '#2a1a0c', G: '#b8bec8', H: '#e6eaf0', M: '#6a7080' },
    draw(p) {
      p.rect(1, 2, 30, 29, 'A');
      p.noise('A', ['A', 'B', 'C', 'A'], 2);
      for (let y = 5; y < 31; y += 4) p.rect(1, y, 30, 1, 'D');
      p.rect(1, 12, 30, 2, 'K');
      p.rect(0, 1, 32, 1, 'K').rect(0, 31, 32, 1, 'K').rect(0, 1, 1, 31, 'K').rect(31, 1, 1, 31, 'K');
      p.rect(13, 10, 6, 8, 'M').rect(14, 11, 4, 6, 'G').rect(14, 11, 4, 1, 'H').rect(15, 14, 2, 2, 'K');
    },
  },
  {
    id: 'mc-monde', name: 'Monde de blocs', cat: 'minecraft', w: 48, h: 32,
    colors: {
      S: '#7ec8f5', T: '#a3d9fa', W: '#ffffff', Y: '#ffe14d', U: '#fff6a8',
      A: '#5fa83a', B: '#79c05a', D: '#966c4a', E: '#7a5434', G: '#8a8f99', H: '#6d727c',
      I: '#4be0d0', C: '#2a2a2a', O: '#6b4a2e', L: '#3f8f2a', M: '#2e6e1e',
      P: '#f2a6a6', Q: '#e07a8a', K: '#1d1d1d', V: '#5dbb46', X: '#3d8a2c',
    },
    draw(p) {
      p.rect(0, 0, 48, 12, 'S').rect(0, 12, 48, 10, 'T');
      p.rect(37, 3, 7, 7, 'Y').rect(38, 4, 5, 5, 'U');
      p.rect(4, 4, 10, 2, 'W').rect(6, 2, 5, 2, 'W').rect(20, 7, 8, 2, 'W').rect(22, 5, 3, 2, 'W');
      p.rect(0, 22, 48, 3, 'A').noise('A', ['A', 'B'], 1);
      p.rect(0, 25, 48, 3, 'D').noise('D', ['D', 'E'], 1);
      p.rect(0, 28, 48, 4, 'G').noise('G', ['G', 'H'], 1);
      [[6, 29], [30, 30], [41, 28]].forEach(([x, y]) => p.rect(x, y, 2, 2, 'I'));
      [[16, 30], [24, 28], [36, 30]].forEach(([x, y]) => p.rect(x, y, 2, 1, 'C'));
      // Chêne.
      p.rect(8, 13, 2, 9, 'O');
      p.rect(4, 6, 10, 8, 'L').rect(6, 4, 6, 2, 'L').noise('L', ['L', 'M', 'L'], 1);
      // Cochon.
      p.rect(17, 17, 8, 4, 'P').rect(23, 15, 4, 4, 'P').rect(26, 17, 1, 2, 'Q');
      p.rect(18, 21, 1, 1, 'Q').rect(22, 21, 1, 1, 'Q').set(24, 16, 'K');
      // Creeper.
      p.rect(33, 10, 4, 4, 'V').rect(33, 14, 4, 6, 'V').rect(33, 20, 4, 2, 'X');
      p.noise('V', ['V', 'X', 'V'], 1);
      p.set(33, 11, 'K').set(36, 11, 'K').rect(34, 12, 2, 2, 'K');
    },
  },

  // ---------------- Star Wars ----------------
  {
    id: 'sw-sabres', name: 'Sabres laser', cat: 'starwars', w: 32, h: 32,
    colors: {
      N: '#0b1026', W: '#e8ecff', B: '#3a6dff', C: '#d8f0ff', R: '#e8202a', Q: '#ffe0e0',
      G: '#9aa3b0', K: '#2b2f3a', M: '#5c6370',
    },
    draw(p) {
      p.fill('N').stars('W', 0.035);
      p.line(8, 24, 28, 3, 'B', 4.5).line(8, 24, 28, 3, 'C', 1.6);
      p.line(24, 24, 4, 3, 'R', 4.5).line(24, 24, 4, 3, 'Q', 1.6);
      p.line(3, 30, 8, 24, 'G', 3).line(4, 29, 7, 26, 'M', 1);
      p.line(29, 30, 24, 24, 'G', 3).line(28, 29, 25, 26, 'M', 1);
      p.set(5, 27, 'K').set(26, 27, 'K').set(4, 28, 'K').set(27, 28, 'K');
    },
  },
  {
    id: 'sw-jedi', name: 'Maître Jedi', cat: 'starwars', w: 32, h: 30,
    colors: {
      G: '#8ab060', H: '#6b8f48', L: '#a6c97c', P: '#d9a8a0', K: '#24261c', W: '#ffffff',
      R: '#8a6a48', S: '#b59a72', T: '#d8d0c0', O: '#3a2c1e',
    },
    draw(p) {
      p.poly([[3, 23], [29, 23], [32, 30], [0, 30]], 'R');
      p.poly([[9, 21], [23, 21], [20, 27], [12, 27]], 'S');
      p.poly([[9, 11], [0, 6], [1, 11], [9, 17]], 'G');
      p.poly([[23, 11], [32, 6], [31, 11], [23, 17]], 'G');
      p.poly([[8, 12], [3, 9], [4, 11], [8, 15]], 'P');
      p.poly([[24, 12], [29, 9], [28, 11], [24, 15]], 'P');
      p.ellipse(16, 14, 9, 9, 'G');
      p.ellipse(14, 9, 4, 2.5, 'L');
      p.line(11, 7, 21, 7, 'H').line(12, 9.5, 20, 9.5, 'H');
      p.disc(12, 15, 2.2, 'K').disc(20, 15, 2.2, 'K');
      p.set(11, 14, 'W').set(19, 14, 'W');
      p.line(10, 12, 14, 12, 'H').line(18, 12, 22, 12, 'H');
      p.line(14, 18, 18, 18, 'H').line(13, 20, 19, 20, 'O');
      p.set(14, 4, 'T').set(17, 4, 'T').set(19, 5, 'T').set(12, 5, 'T');
      p.outline('O');
    },
  },
  {
    id: 'sw-soldat', name: "Soldat de l'Empire", cat: 'starwars', w: 32, h: 32,
    colors: { W: '#f5f7fa', G: '#c9d0da', M: '#8d96a3', D: '#4a5260', K: '#14161c', B: '#6a8fb8' },
    draw(p) {
      p.ellipse(16, 13, 12, 12, 'W');
      p.poly([[5, 15], [27, 15], [28, 26], [22, 31], [10, 31], [4, 26]], 'W');
      p.swap('W', 'G', (x, y) => x > 22 || y > 27);
      p.rect(5, 12, 22, 2, 'G');
      p.poly([[7, 15], [14, 15], [14, 19], [11, 21], [7, 19]], 'K');
      p.poly([[25, 15], [18, 15], [18, 19], [21, 21], [25, 19]], 'K');
      p.set(8, 16, 'D').set(19, 16, 'D');
      p.poly([[14, 20], [18, 20], [18, 24], [14, 24]], 'G');
      p.line(10, 22, 9, 27, 'K').line(22, 22, 23, 27, 'K');
      p.rect(11, 26, 10, 3, 'D');
      for (let x = 12; x < 21; x += 2) p.rect(x, 26, 1, 3, 'K');
      p.rect(4, 20, 2, 4, 'B').rect(26, 20, 2, 4, 'B');
      p.rect(9, 4, 3, 1, 'G');
      p.outline('K');
    },
  },
  {
    id: 'sw-r2', name: 'Droïde astromécano', cat: 'starwars', w: 30, h: 36,
    colors: { S: '#c9d0da', T: '#e6eaf0', B: '#2f62c9', L: '#7ea6ef', W: '#f4f6f9', G: '#9aa3b0', R: '#e8303a', K: '#14161c', M: '#5c6370' },
    draw(p) {
      p.ellipse(15, 12, 10, 9, 'S', (x, y) => y < 12);
      p.ellipse(13, 7, 4, 2.5, 'T', (x, y) => y < 12);
      p.rect(6, 8, 18, 2, 'B');
      p.rect(9, 5, 3, 3, 'B').rect(18, 5, 3, 3, 'B');
      p.disc(15, 7, 2, 'K').set(14, 6, 'L');
      p.rect(19, 10, 2, 1, 'R');
      p.rect(5, 12, 20, 19, 'W');
      p.rect(8, 14, 5, 9, 'B').rect(17, 14, 5, 9, 'B');
      p.rect(9, 15, 3, 3, 'L');
      p.rect(12, 24, 6, 4, 'B');
      p.rect(8, 28, 14, 1, 'G').rect(13, 14, 4, 2, 'G');
      for (let y = 18; y < 23; y += 2) p.rect(13, y, 4, 1, 'M');
      p.rect(0, 13, 5, 18, 'W').rect(25, 13, 5, 18, 'W');
      p.rect(1, 16, 3, 10, 'B').rect(26, 16, 3, 10, 'B');
      p.poly([[-1, 31], [6, 31], [7, 35], [-2, 35]], 'G');
      p.poly([[24, 31], [31, 31], [32, 35], [23, 35]], 'G');
      p.rect(11, 31, 8, 3, 'M');
      p.outline('K');
    },
  },
  {
    id: 'sw-bb', name: 'Droïde boule', cat: 'starwars', w: 30, h: 34,
    colors: { W: '#f4f6f9', G: '#c9d0da', O: '#f08a24', P: '#c96a14', K: '#14161c', R: '#e8303a', L: '#7ea6ef', S: '#9aa3b0' },
    draw(p) {
      p.disc(15, 22, 11.5, 'W');
      p.swap('W', 'G', (x, y) => Math.hypot(x - 11, y - 18) > 11);
      p.disc(15, 22, 5.5, 'O').disc(15, 22, 3.5, 'S').disc(15, 22, 2, 'G');
      p.ellipse(6, 20, 3, 4.5, 'O').ellipse(6, 20, 1.6, 3, 'G');
      p.ellipse(24, 20, 3, 4.5, 'O').ellipse(24, 20, 1.6, 3, 'G');
      p.line(8, 30, 22, 30, 'O', 1.3);
      p.ellipse(15, 9, 8, 6, 'W', (x, y) => y < 10);
      p.rect(7, 9, 16, 1, 'S');
      p.rect(8, 6, 14, 1, 'O');
      p.disc(15, 6.5, 2.4, 'K').set(14, 5, 'L');
      p.disc(19.5, 8.3, 1, 'R');
      p.line(13, 3, 12, 0, 'S').line(17, 3, 18, 1, 'S');
      p.outline('K');
    },
  },
  {
    id: 'sw-etoile', name: 'Étoile de la Mort', cat: 'starwars', w: 32, h: 32,
    colors: { N: '#0b1026', W: '#e8ecff', A: '#8a919c', B: '#7a818c', C: '#9aa1ac', D: '#5c636e', E: '#3c434e', L: '#c0c6cf', Y: '#ffe14d' },
    draw(p) {
      p.fill('N').stars('W', 0.04);
      p.disc(16, 16, 14, 'A');
      p.noise('A', ['A', 'B', 'C'], 2);
      ['A', 'B', 'C'].forEach((c) => p.swap(c, 'D', (x, y) => Math.hypot(x - 11, y - 11) > 17));
      p.line(2, 16.5, 30, 16.5, 'E', 1);
      p.disc(11, 10, 4.2, 'E').disc(11, 10, 3, 'D').disc(11, 10, 1.3, 'L');
      p.stars('Y', 0.03, (x, y) => Math.hypot(x + 0.5 - 16, y + 0.5 - 16) < 13 && !'EL'.includes(p.get(x, y)));
    },
  },
  {
    id: 'sw-tie', name: 'Chasseur TIE', cat: 'starwars', w: 40, h: 30,
    colors: { N: '#0b1026', W: '#e8ecff', D: '#3c434e', G: '#8a919c', L: '#b8c0cc', B: '#24305e', K: '#14161c' },
    draw(p) {
      p.fill('N').stars('W', 0.035);
      const wing = (s) => {
        const X = (x) => (s ? 40 - x : x);
        p.poly([[X(2), 2], [X(7), 2], [X(9), 15], [X(7), 28], [X(2), 28], [X(0), 15]].map(([a, b]) => [a, b]), 'D');
        const c = [X(4.5), 15];
        [[X(2), 2], [X(7), 2], [X(9), 15], [X(7), 28], [X(2), 28], [X(0), 15]].forEach((v) => p.line(c[0], c[1], v[0], v[1], 'G', 1));
      };
      wing(false); wing(true);
      p.rect(9, 13, 7, 4, 'G').rect(24, 13, 7, 4, 'G').rect(9, 14, 7, 1, 'L').rect(24, 14, 7, 1, 'L');
      p.disc(20, 15, 7, 'G');
      p.disc(18, 13, 3, 'L');
      p.disc(20, 15, 4.3, 'K').disc(20, 15, 3.3, 'B');
      for (let a = 0; a < 8; a++) {
        const t = (a * Math.PI) / 4;
        p.line(20, 15, 20 + Math.cos(t) * 4, 15 + Math.sin(t) * 4, 'K', 0.8);
      }
    },
  },
  {
    id: 'sw-sith', name: 'Seigneur Sith', cat: 'starwars', w: 32, h: 32,
    colors: {
      R: '#8a1c24', Q: '#b8262f', A: '#141418', B: '#2a2a33', C: '#454552', E: '#6a6a7a',
      S: '#9aa1ac', T: '#c9d0da',
    },
    draw(p) {
      for (let y = 0; y < 32; y++) p.rect(0, y, 32, 1, y < 16 ? 'R' : 'Q');
      p.poly([[2, 20], [30, 20], [32, 32], [0, 32]], 'A');
      p.ellipse(16, 12, 12, 11, 'B');
      p.ellipse(11, 7, 5, 3.5, 'C');
      p.set(9, 6, 'E').set(10, 5, 'E').set(11, 5, 'E');
      p.line(5, 13, 27, 13, 'C', 1.2);
      p.poly([[7, 14], [14, 14], [14, 18], [8, 20]], 'A');
      p.poly([[25, 14], [18, 14], [18, 18], [24, 20]], 'A');
      p.set(9, 15, 'E').set(19, 15, 'E');
      p.poly([[16, 17], [21, 28], [11, 28]], 'S');
      for (let x = 13; x < 20; x += 2) p.line(x, 22, x, 27, 'A', 0.8);
      p.line(16, 17, 16, 21, 'T', 0.8);
      p.poly([[3, 21], [9, 22], [9, 30], [2, 30]], 'B');
      p.poly([[29, 21], [23, 22], [23, 30], [30, 30]], 'B');
    },
  },

  // ---------------- Autres jeux vidéo ----------------
  {
    id: 'jv-pacman', name: 'Pac-Man', cat: 'jeux', w: 56, h: 24,
    colors: { N: '#0b0b1a', B: '#2442d6', Y: '#ffe14d', D: '#ffd8a8', R: '#ff2a2a', P: '#ffb8de', W: '#ffffff', U: '#4fc3ff', K: '#141414' },
    draw(p) {
      p.fill('N').rect(0, 0, 56, 2, 'B').rect(0, 22, 56, 2, 'B').rect(0, 3, 56, 1, 'B').rect(0, 20, 56, 1, 'B');
      for (let x = 20; x < 56; x += 4) p.set(x, 12, 'D');
      p.disc(53, 12, 1.8, 'D');
      p.disc(10, 12, 7, 'Y');
      p.poly([[10, 12], [18, 6], [18, 18]], 'N');
      p.set(9, 7, 'K').set(10, 7, 'K');
      const ghost = (cx, c) => {
        p.ellipse(cx, 11, 6, 6, c, (x, y) => y < 11);
        p.rect(cx - 6, 11, 12, 6, c);
        for (let i = 0; i < 4; i++) p.rect(cx - 6 + i * 3, 17, 2, 1, c);
        p.rect(cx - 4, 8, 3, 4, 'W').rect(cx + 1, 8, 3, 4, 'W');
        p.rect(cx - 3, 10, 2, 2, 'U').rect(cx + 2, 10, 2, 2, 'U');
      };
      ghost(30, 'R');
      ghost(44, 'P');
    },
  },
  {
    id: 'jv-invaders', name: 'Envahisseurs', cat: 'jeux', w: 40, h: 32,
    colors: { N: '#0b0b1a', W: '#ffffff', G: '#3cdc5a', M: '#ff4fd8', C: '#4fd8ff', Y: '#ffe14d', R: '#ff4040' },
    draw(p) {
      p.fill('N').stars('W', 0.02, (x, y) => y < 20);
      const alien = ['..X...X..', '...X.X...', '..XXXXX..', '.XX.X.XX.', 'XXXXXXXXX', 'X.XXXXX.X', 'X.X...X.X', '...X.X...'];
      const squid = ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.', 'X.X..X.X'];
      [3, 15, 27].forEach((x) => p.stamp(x, 2, squid.map((r) => r.replace(/X/g, 'M'))));
      [2, 14, 26].forEach((x) => p.stamp(x + 1, 11, alien.map((r) => r.replace(/X/g, 'C'))));
      [4, 17, 30].forEach((x) => p.rect(x, 23, 6, 3, 'G').rect(x + 2, 25, 2, 1, 'N'));
      p.rect(18, 29, 7, 2, 'G').rect(20, 28, 3, 1, 'G').rect(21, 27, 1, 1, 'G');
      p.rect(21, 21, 1, 3, 'Y');
      p.rect(9, 18, 1, 2, 'R');
    },
  },
  {
    id: 'jv-manette', name: 'Manette', cat: 'jeux', w: 40, h: 26,
    colors: { A: '#4a4f63', B: '#6a7088', K: '#16161e', D: '#2a2d3a', G: '#3cc47c', R: '#ff4d5e', U: '#3d8bff', Y: '#ffd23f', W: '#c9d0da' },
    draw(p) {
      p.disc(10, 15, 9, 'A').disc(30, 15, 9, 'A').rect(10, 6, 20, 12, 'A');
      p.disc(9, 13, 6, 'B', (x, y) => y < 13).disc(31, 13, 6, 'B', (x, y) => y < 13);
      p.rect(9, 9, 3, 9, 'K').rect(6, 12, 9, 3, 'K');
      p.disc(30, 10.5, 1.8, 'G').disc(34, 14.5, 1.8, 'R').disc(26, 14.5, 1.8, 'U').disc(30, 18.5, 1.8, 'Y');
      p.disc(15, 20, 2.8, 'D').disc(25, 20, 2.8, 'D');
      p.rect(17, 11, 2, 1, 'W').rect(21, 11, 2, 1, 'W');
      p.outline('K');
    },
  },
  {
    id: 'jv-pokeball', name: 'Poké Ball', cat: 'pokemon', w: 32, h: 32,
    colors: { R: '#ee2b2b', P: '#ff7a7a', D: '#b51f1f', W: '#ffffff', G: '#d8dde5', K: '#1b1b22', L: '#eef2f7' },
    draw(p) {
      p.disc(16, 16, 14, 'W');
      p.swap('W', 'R', (x, y) => y < 15);
      p.swap('R', 'D', (x, y) => Math.hypot(x - 11, y - 11) > 14);
      p.swap('W', 'G', (x, y) => Math.hypot(x - 11, y - 11) > 15);
      p.ellipse(10, 8, 3.5, 2.5, 'P');
      p.rect(2, 15, 28, 2, 'K');
      p.disc(16, 16, 5.5, 'K').disc(16, 16, 4, 'W').disc(16, 16, 2, 'L');
      p.outline('K');
    },
  },
  {
    id: 'jv-tetris', name: 'Blocs qui tombent', cat: 'jeux', w: 24, h: 36,
    colors: {
      F: '#8d96a3', N: '#141a33', C: '#3fd8f0', Y: '#ffd93b', P: '#a64ff0', G: '#4fd86a', R: '#f0434f', B: '#3d6bf0', O: '#ff9a2a',
    },
    draw(p) {
      p.fill('F').rect(2, 2, 20, 32, 'N');
      const cell = (cx, cy, c) => p.rect(2 + cx * 2, 2 + cy * 2, 2, 2, c);
      const piece = (c, cells) => cells.forEach(([x, y]) => cell(x, y, c));
      piece('P', [[4, 3], [5, 3], [6, 3], [5, 4]]);
      piece('C', [[0, 15], [1, 15], [2, 15], [3, 15]]);
      piece('Y', [[4, 14], [5, 14], [4, 15], [5, 15]]);
      piece('G', [[6, 15], [7, 15], [7, 14], [8, 14]]);
      piece('R', [[8, 15], [9, 15], [9, 14], [9, 13]]);
      piece('B', [[0, 14], [0, 13], [1, 14], [2, 14]]);
      piece('O', [[3, 13], [3, 14], [3, 12], [4, 12]]);
      piece('C', [[9, 9], [9, 10], [9, 11], [9, 12]]);
      piece('G', [[1, 12], [1, 13], [2, 13], [2, 12]]);
    },
  },
  {
    id: 'jv-etoile', name: 'Super étoile', cat: 'jeux', w: 32, h: 32,
    colors: { Y: '#ffd93b', L: '#fff3a0', O: '#f0a020', K: '#2b1d0e', W: '#ffffff' },
    draw(p) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 6.8 : 15.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
      }
      p.poly(pts, 'O');
      p.poly(pts.map(([x, y]) => [16 + (x - 16) * 0.82, 17.5 + (y - 17) * 0.82]), 'Y');
      p.poly(pts.map(([x, y]) => [14.5 + (x - 16) * 0.4, 14 + (y - 17) * 0.4]), 'L');
      p.rect(12, 13, 2, 5, 'K').rect(18, 13, 2, 5, 'K');
      p.set(12, 13, 'W').set(18, 13, 'W');
      p.outline('K');
    },
  },
  {
    id: 'jv-imposteur', name: 'Imposteur', cat: 'jeux', w: 30, h: 32,
    colors: { R: '#e8303a', D: '#a51d28', V: '#9ee3ff', U: '#4aa3c9', W: '#ffffff', K: '#14141a' },
    draw(p) {
      p.rect(1, 12, 6, 12, 'R');
      p.ellipse(16, 13, 10, 11, 'R');
      p.rect(6, 13, 20, 12, 'R');
      p.rect(6, 24, 8, 6, 'R').rect(18, 24, 8, 6, 'R');
      p.swap('R', 'D', (x, y) => x < 8 || y > 26);
      p.ellipse(19, 11, 7, 4.2, 'U');
      p.ellipse(19.5, 10.3, 6, 3.2, 'V');
      p.rect(19, 8, 4, 1, 'W');
      p.outline('K');
      p.rect(14, 25, 4, 7, '.');
      p.outline('K');
    },
  },
  {
    id: 'jv-souris', name: 'Pikachu', cat: 'pokemon', w: 32, h: 32,
    colors: { Y: '#ffd93b', O: '#f0b400', K: '#1b1b1b', W: '#ffffff', R: '#ee3a43', P: '#c22a34', B: '#8a5a20' },
    draw(p) {
      p.poly([[7, 14], [1, 0], [3, 0], [12, 11]], 'Y');
      p.poly([[25, 14], [31, 0], [29, 0], [20, 11]], 'Y');
      p.poly([[1, 0], [3, 0], [4.5, 4], [2.2, 4]], 'K');
      p.poly([[31, 0], [29, 0], [27.5, 4], [29.8, 4]], 'K');
      p.ellipse(16, 20, 13.5, 11, 'Y');
      p.swap('Y', 'O', (x, y) => y > 26 || (y > 14 && Math.hypot(x - 16, y - 20) > 12));
      p.disc(10, 17, 2.4, 'K').disc(22, 17, 2.4, 'K');
      p.set(9, 16, 'W').set(21, 16, 'W');
      p.disc(6.5, 23, 2.8, 'R').disc(25.5, 23, 2.8, 'R');
      p.set(16, 20, 'K');
      p.path([[13, 22], [14.5, 23.5], [16, 22.5], [17.5, 23.5], [19, 22]], 'B', 1);
      p.ellipse(16, 25, 2, 1.5, 'P');
      p.outline('K');
    },
  },

  // ---------------- Minecraft (suite) ----------------
  {
    id: 'mc-mineur', name: 'Mineur', cat: 'minecraft', w: 32, h: 32,
    colors: {
      H: '#5a3a1e', I: '#4a2e16', J: '#6b4524', S: '#c9946a', T: '#b98256', U: '#d4a27a',
      W: '#ffffff', B: '#3d4fbf', N: '#9a6440', M: '#6a3a24',
    },
    draw(p) {
      p.stamp(0, 0, ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWBSSBWS', 'SSSNNSSS', 'SSMMMMSS', 'SSSSSSSS'], 4);
      p.noise('H', ['H', 'I', 'J'], 2).noise('S', ['S', 'T', 'U', 'S'], 2);
    },
  },
  {
    id: 'mc-zombie', name: 'Zombie', cat: 'minecraft', w: 32, h: 32,
    colors: { Z: '#5e9e4a', Y: '#4f8a3d', X: '#6fae58', K: '#1d2a1a', E: '#2f6a6a', D: '#3a6630' },
    draw(p) {
      p.stamp(0, 0, ['ZZZZZZZZ', 'ZZZZZZZZ', 'ZZZZZZZZ', 'ZZZZZZZZ', 'ZKEZZEKZ', 'ZZZDDZZZ', 'ZZDDDDZZ', 'ZZDZZDZZ'], 4);
      p.noise('Z', ['Z', 'Y', 'X', 'Z'], 2);
    },
  },
  {
    id: 'mc-squelette', name: 'Squelette', cat: 'minecraft', w: 32, h: 32,
    colors: { G: '#c9c9c9', H: '#b5b5b5', I: '#dcdcdc', K: '#2a2a2a', D: '#6a6a6a' },
    draw(p) {
      p.stamp(0, 0, ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GKKGGKKG', 'GGGDDGGG', 'GGGGGGGG', 'GKKKKKKG', 'GGGGGGGG'], 4);
      p.noise('G', ['G', 'H', 'I', 'G'], 2);
      for (let x = 6; x < 26; x += 4) p.rect(x, 24, 2, 4, 'G');
    },
  },
  {
    id: 'mc-enderman', name: 'Enderman', cat: 'minecraft', w: 32, h: 32,
    colors: { V: '#2a1438', Q: '#b84fd8', E: '#141414', F: '#1e1a24', G: '#262030', P: '#e07af5', M: '#c43ae8' },
    draw(p) {
      p.fill('V').stars('Q', 0.06);
      p.rect(4, 4, 24, 24, 'E').noise('E', ['E', 'F', 'G', 'E'], 3);
      p.stamp(4, 16, ['PMP..PMP'], 3);
    },
  },
  {
    id: 'mc-diamant', name: 'Diamant', cat: 'minecraft', w: 32, h: 32,
    colors: { A: '#4be0d0', L: '#a6fff2', M: '#2bb3a6', D: '#1e8c80', W: '#e0fffb', K: '#10302e' },
    draw(p) {
      p.poly([[8, 5], [14, 5], [11, 13], [2, 13]], 'L');
      p.poly([[14, 5], [19, 5], [21, 13], [11, 13]], 'A');
      p.poly([[19, 5], [24, 5], [30, 13], [21, 13]], 'M');
      p.poly([[2, 13], [11, 13], [16, 29]], 'A');
      p.poly([[11, 13], [21, 13], [16, 29]], 'L');
      p.poly([[21, 13], [30, 13], [16, 29]], 'D');
      p.line(9, 7, 12, 7, 'W').set(15, 16, 'W').set(14, 18, 'W');
      p.outline('K', true);
    },
  },
  {
    id: 'mc-minerai', name: 'Minerai de diamant', cat: 'minecraft', w: 32, h: 32,
    colors: { G: '#8a8f99', H: '#7a7f89', I: '#9da2ac', L: '#a6fff2', D: '#2bb3a6', M: '#1e8c80', W: '#e0fffb' },
    draw(p) {
      p.fill('G').noise('G', ['G', 'H', 'I', 'G'], 2);
      const gem = ['.LD.', 'LWDM', 'DDMM', '.MM.'];
      [[3, 4], [20, 2], [11, 12], [24, 15], [4, 22], [16, 25], [26, 26]].forEach(([x, y]) => p.stamp(x, y, gem));
    },
  },
  {
    id: 'mc-four', name: 'Four', cat: 'minecraft', w: 32, h: 32,
    colors: {
      G: '#8a8f99', H: '#7a7f89', I: '#9da2ac', D: '#4a4e56', K: '#1d1d22',
      R: '#e8402a', O: '#ff9a2a', Y: '#ffe14d',
    },
    draw(p) {
      p.fill('G').noise('G', ['G', 'H', 'I', 'G'], 2);
      p.rect(0, 0, 32, 2, 'D').rect(0, 30, 32, 2, 'D').rect(0, 0, 2, 32, 'D').rect(30, 0, 2, 32, 'D');
      p.rect(8, 6, 16, 3, 'K');
      p.rect(7, 15, 18, 13, 'D').rect(8, 16, 16, 11, 'K');
      p.poly([[9, 27], [12, 18], [14, 23], [16, 16], [19, 22], [21, 19], [23, 27]], 'R');
      p.poly([[11, 27], [13, 21], [15, 24], [17, 20], [19, 24], [21, 27]], 'O');
      p.poly([[13, 27], [15, 23], [17, 25], [19, 27]], 'Y');
      p.rect(8, 21, 16, 1, 'D');
    },
  },
  {
    id: 'mc-gateau', name: 'Gâteau', cat: 'minecraft', w: 32, h: 28,
    colors: {
      W: '#fbf6ec', V: '#ece4d4', R: '#e8303a', B: '#b8743a', C: '#a0622c', E: '#8a5224', F: '#c98a4a', K: '#4a2a12',
    },
    draw(p) {
      p.poly([[16, 0], [32, 8], [16, 16], [0, 8]], 'W');
      p.poly([[0, 8], [16, 16], [16, 28], [0, 20]], 'B');
      p.poly([[16, 16], [32, 8], [32, 20], [16, 28]], 'E');
      p.noise('B', ['B', 'C', 'F'], 2).noise('E', ['E', 'C'], 2);
      p.noise('W', ['W', 'W', 'V'], 2);
      for (let x = 0; x < 32; x += 2) {
        const top = x < 16 ? 8 + x / 2 : 16 - (x - 16) / 2;
        const depth = 2 + Math.floor(p.rnd() * 3);
        for (let y = Math.floor(top); y < top + depth; y++) for (let i = x; i < x + 2; i++) if (p.get(i, y) !== '.') p.set(i, y, x < 16 ? 'W' : 'V');
      }
      [[16, 3], [9, 7], [23, 7], [16, 11], [12, 4], [20, 10]].forEach(([x, y]) => p.rect(x, y, 2, 1, 'R'));
      p.line(16, 16, 16, 28, 'K', 0.9);
    },
  },
  {
    id: 'mc-portail', name: 'Portail du Nether', cat: 'minecraft', w: 28, h: 38,
    colors: { O: '#140c1e', P: '#24163a', Q: '#3a2458', V: '#8a2be2', W: '#a64ff0', X: '#6a1fb0', Y: '#c88aff', S: '#2a2a2a', G: '#5a5a5a' },
    draw(p) {
      p.fill('O').noise('O', ['O', 'P', 'Q', 'O'], 2);
      p.rect(4, 4, 20, 30, 'V').noise('V', ['V', 'W', 'X', 'V', 'Y'], 1);
    },
  },
  {
    id: 'mc-abeille', name: 'Abeille', cat: 'minecraft', w: 32, h: 32,
    colors: { Y: '#f2c230', Z: '#e5b020', X: '#ffd75a', B: '#4a3218', K: '#1d1d1d', W: '#ffffff', S: '#9fdcff' },
    draw(p) {
      p.fill('S');
      p.stamp(0, 0, ['.K....K.', '..K..K..', 'YYYYYYYY', 'YWKYYKWY', 'YYYYYYYY', 'BBBBBBBB', 'YYYYYYYY', 'BBBBBBBB'], 4);
      p.noise('Y', ['Y', 'Z', 'X', 'Y'], 2);
    },
  },

  // ---------------- Pokémon ----------------
  {
    id: 'pk-rondoudou', name: 'Rondoudou', cat: 'pokemon', w: 32, h: 32,
    colors: { P: '#ffb3cf', D: '#f28bb0', W: '#ffffff', T: '#3fa0b0', U: '#1f6a78', K: '#1b1b22', R: '#d94a6a' },
    draw(p) {
      p.poly([[5, 9], [7, 0], [12, 6]], 'P').poly([[27, 9], [25, 0], [20, 6]], 'P');
      p.poly([[7, 6], [8, 2], [10, 6]], 'K').poly([[25, 6], [24, 2], [22, 6]], 'K');
      p.disc(16, 17, 13.5, 'P');
      p.swap('P', 'D', (x, y) => Math.hypot(x - 12, y - 13) > 15);
      p.path([[14, 3], [12, 6], [15, 8], [18, 6], [16, 5]], 'D', 1.4);
      [10, 22].forEach((x) => {
        p.disc(x, 16, 4.4, 'W').disc(x + 0.5, 16.5, 3, 'T').disc(x + 0.5, 16.5, 1.6, 'U').disc(x - 1, 14.5, 1.1, 'W');
      });
      p.path([[14, 23], [16, 24.5], [18, 23]], 'R', 1);
      p.ellipse(9, 30.5, 4, 1.8, 'D').ellipse(23, 30.5, 4, 1.8, 'D');
      p.outline('K');
    },
  },
  {
    id: 'pk-salameche', name: 'Salamèche', cat: 'pokemon', w: 32, h: 32,
    colors: { O: '#ff9a3c', D: '#e07a20', C: '#ffe0a0', K: '#1b1b22', W: '#ffffff', R: '#e8302a', Y: '#ffe14d', U: '#2a4a8a' },
    draw(p) {
      p.path([[18, 26], [25, 23], [27, 16], [27, 11]], 'O', 3.4);
      p.poly([[27, 1], [31, 7], [30, 12], [24, 12], [23, 7]], 'R');
      p.poly([[27, 4], [29, 8], [28, 11], [25, 11], [25, 8]], 'O');
      p.poly([[27, 7], [28, 10], [26, 10]], 'Y');
      p.ellipse(13, 22, 7, 8, 'O');
      p.ellipse(13, 23, 4.2, 5.5, 'C');
      p.ellipse(6, 20, 2.5, 1.6, 'O').ellipse(20, 20, 2.5, 1.6, 'O');
      p.ellipse(8.5, 30, 3.2, 2, 'O').ellipse(17.5, 30, 3.2, 2, 'O');
      p.ellipse(12, 10, 8.5, 7.5, 'O');
      p.swap('O', 'D', (x, y) => y > 28 || (y < 18 && Math.hypot(x - 9, y - 7) > 9.5));
      p.ellipse(9, 9, 1.6, 2.6, 'K').ellipse(16, 9, 1.6, 2.6, 'K');
      p.set(9, 7, 'W').set(16, 7, 'W').set(9, 10, 'U').set(16, 10, 'U');
      p.path([[7, 14], [12, 15], [17, 14]], 'K', 0.9);
      p.outline('K');
    },
  },
  {
    id: 'pk-carapuce', name: 'Carapuce', cat: 'pokemon', w: 32, h: 32,
    colors: {
      B: '#7ec8f0', D: '#4fa0d0', S: '#b07a3c', T: '#8a5a24', C: '#f4e2a0', E: '#e8c070',
      K: '#1b1b22', W: '#ffffff', R: '#8a2a2a',
    },
    draw(p) {
      p.path([[24, 28], [29, 26], [30, 22], [27, 20], [26, 23]], 'B', 3);
      p.ellipse(16, 22, 9.5, 9, 'E');
      p.ellipse(16, 22, 8.5, 8, 'S');
      p.ellipse(16, 23, 6, 7, 'C');
      p.line(10.5, 21, 21.5, 21, 'E', 1).line(11, 25, 21, 25, 'E', 1).line(16, 16, 16, 30, 'E', 1);
      p.ellipse(6, 21, 3, 2, 'B').ellipse(26, 21, 3, 2, 'B');
      p.ellipse(10, 30.5, 3, 1.8, 'B').ellipse(22, 30.5, 3, 1.8, 'B');
      p.ellipse(15, 9, 9, 7.5, 'B');
      p.swap('B', 'D', (x, y) => y < 16 && Math.hypot(x - 12, y - 6) > 10);
      p.ellipse(11, 8.5, 2.2, 3, 'W').ellipse(19, 8.5, 2.2, 3, 'W');
      p.ellipse(11.5, 9, 1.4, 2.2, 'R').ellipse(19.5, 9, 1.4, 2.2, 'R');
      p.set(11, 8, 'W').set(19, 8, 'W');
      p.path([[11, 13], [15, 14.5], [19, 13]], 'K', 0.9);
      p.outline('K');
    },
  },
  {
    id: 'pk-bulbizarre', name: 'Bulbizarre', cat: 'pokemon', w: 36, h: 30,
    colors: {
      T: '#7ed8b8', U: '#4fb090', G: '#5cb85c', H: '#3d8a3d', L: '#8ee07a',
      K: '#1b1b22', W: '#ffffff', R: '#e04040', P: '#e08aa0',
    },
    draw(p) {
      p.rect(13, 23, 4, 6, 'T').rect(26, 23, 4, 6, 'T');
      p.ellipse(21, 20, 12, 7, 'T');
      p.ellipse(25, 10, 8.5, 8.5, 'G');
      p.ellipse(22, 7, 3.5, 3, 'L');
      p.path([[25, 2], [25, 18]], 'H', 1).path([[19, 6], [24, 16]], 'H', 1).path([[31, 6], [26, 16]], 'H', 1);
      p.poly([[4, 8], [5, 3], [9, 7]], 'T').poly([[14, 7], [16, 2], [17, 8]], 'T');
      p.ellipse(10, 15, 9, 7.5, 'T');
      p.rect(3, 23, 4, 6, 'T').rect(9, 24, 4, 5, 'T');
      [[4, 12, 1.6], [12, 9, 1.4], [16, 19, 2], [27, 22, 1.8], [21, 24, 1.4], [32, 19, 1.4]].forEach(([x, y, r]) => p.disc(x, y, r, 'U', (i, j) => p.get(i, j) === 'T'));
      p.ellipse(6, 14, 2, 2.5, 'R').ellipse(14, 14, 2, 2.5, 'R');
      p.set(5, 13, 'W').set(13, 13, 'W').set(6, 15, 'K').set(14, 15, 'K');
      p.path([[5, 19], [10, 21], [15, 19]], 'K', 0.9);
      p.set(10, 20, 'P');
      p.outline('K');
    },
  },
  {
    id: 'pk-evoli', name: 'Évoli', cat: 'pokemon', w: 32, h: 32,
    colors: { B: '#c08048', D: '#9a5e2c', E: '#7a4a20', C: '#f4e2c0', V: '#e0caa0', K: '#1b1b22', W: '#ffffff' },
    draw(p) {
      p.poly([[7, 14], [1, 0], [13, 9]], 'B').poly([[25, 14], [31, 0], [19, 9]], 'B');
      p.poly([[7, 11], [3, 3], [11, 9]], 'E').poly([[25, 11], [29, 3], [21, 9]], 'E');
      p.ellipse(16, 28, 11, 4.5, 'C');
      for (let x = 6; x < 26; x += 4) p.poly([[x, 25], [x + 2, 21], [x + 4, 25]], 'C');
      p.swap('C', 'V', (x, y) => y > 28);
      p.ellipse(16, 16, 10, 8.5, 'B');
      p.swap('B', 'D', (x, y) => y > 19 && y < 25);
      p.ellipse(11.5, 15, 2.4, 3, 'K').ellipse(20.5, 15, 2.4, 3, 'K');
      p.set(11, 13, 'W').set(20, 13, 'W').set(12, 14, 'W').set(21, 14, 'W');
      p.rect(15, 18, 2, 1, 'K');
      p.path([[13, 20], [16, 21], [19, 20]], 'E', 0.9);
      p.outline('K');
    },
  },
  {
    id: 'pk-magicarpe', name: 'Magicarpe', cat: 'pokemon', w: 36, h: 30,
    colors: { R: '#ff6a3c', D: '#d84a22', C: '#ffd0a0', Y: '#ffd23f', W: '#ffffff', K: '#1b1b22', P: '#ff8fa3', S: '#9fdcff' },
    draw(p) {
      p.fill('S');
      p.poly([[24, 15], [35, 4], [33, 15], [35, 26]], 'W');
      p.poly([[10, 6], [14, 0], [18, 4], [22, 1], [24, 7]], 'Y');
      p.ellipse(15, 16, 13, 9.5, 'R');
      p.swap('R', 'D', (x, y) => (x + y) % 5 === 0 && x > 8);
      p.ellipse(16, 21, 9, 3.5, 'C');
      p.poly([[13, 24], [17, 29], [20, 24]], 'Y');
      p.disc(8, 13, 3.6, 'W').disc(8, 13, 1.4, 'K');
      p.ellipse(3, 18, 2.5, 3, 'P');
      p.path([[4, 14], [1, 8], [2, 3]], 'Y', 1.2).path([[4, 21], [1, 26]], 'Y', 1.2);
    },
  },
  {
    id: 'pk-psykokwak', name: 'Psykokwak', cat: 'pokemon', w: 32, h: 32,
    colors: { Y: '#ffd23f', O: '#e8b020', C: '#f4e2a0', E: '#d8c080', W: '#ffffff', K: '#1b1b22' },
    draw(p) {
      p.path([[16, 5], [15, 0]], 'K', 1).path([[13, 5], [10, 1]], 'K', 1).path([[19, 5], [22, 1]], 'K', 1);
      p.ellipse(16, 18, 13, 12, 'Y');
      p.swap('Y', 'O', (x, y) => Math.hypot(x - 13, y - 14) > 13);
      p.ellipse(16, 23, 7.5, 4.2, 'C');
      p.line(9, 23, 23, 23, 'E', 1);
      p.disc(10.5, 15, 3.2, 'W').disc(21.5, 15, 3.2, 'W');
      p.set(10, 15, 'K').set(22, 15, 'K');
      p.outline('K');
    },
  },
  {
    id: 'pk-ronflex', name: 'Ronflex', cat: 'pokemon', w: 34, h: 34,
    colors: { T: '#3a6a7a', U: '#2a5262', C: '#f4e2c0', D: '#d8c09a', K: '#1b1b22', W: '#ffffff', B: '#8a6a48' },
    draw(p) {
      p.ellipse(17, 22, 16, 12, 'T');
      p.poly([[8, 6], [9, 0], [12, 4]], 'T').poly([[26, 6], [25, 0], [22, 4]], 'T');
      p.ellipse(17, 9, 10, 7.5, 'T');
      p.swap('T', 'U', (x, y) => x < 6 || x > 28);
      p.ellipse(17, 10, 7.5, 5.5, 'C');
      p.ellipse(17, 24, 11, 9, 'C');
      p.swap('C', 'D', (x, y) => y > 29);
      p.line(12, 8, 15, 8, 'K').line(19, 8, 22, 8, 'K');
      p.rect(13, 12, 8, 2, 'K').set(14, 12, 'W').set(19, 12, 'W');
      p.ellipse(7, 31.5, 5, 2.5, 'C').ellipse(27, 31.5, 5, 2.5, 'C');
      p.disc(7, 31.5, 1.3, 'B').disc(27, 31.5, 1.3, 'B');
      p.outline('K');
    },
  },
  {
    id: 'pk-superball', name: 'Super Ball', cat: 'pokemon', w: 32, h: 32,
    colors: { B: '#3d7fe0', D: '#2a5cb0', R: '#ee2b2b', W: '#ffffff', G: '#d8dde5', K: '#1b1b22', L: '#eef2f7', P: '#8ab8ff' },
    draw(p) {
      p.disc(16, 16, 14, 'W');
      p.swap('W', 'B', (x, y) => y < 15);
      p.swap('B', 'R', (x, y) => y < 12 && (Math.abs(x - 9) < 2.5 || Math.abs(x - 22) < 2.5));
      p.swap('B', 'D', (x, y) => Math.hypot(x - 11, y - 11) > 14);
      p.swap('W', 'G', (x, y) => Math.hypot(x - 11, y - 11) > 15);
      p.ellipse(14, 5, 2.5, 1.5, 'P');
      p.rect(2, 15, 28, 2, 'K');
      p.disc(16, 16, 5.5, 'K').disc(16, 16, 4, 'W').disc(16, 16, 2, 'L');
      p.outline('K');
    },
  },
  {
    id: 'pk-hyperball', name: 'Hyper Ball', cat: 'pokemon', w: 32, h: 32,
    colors: { A: '#2a2a33', Y: '#ffd23f', W: '#ffffff', G: '#d8dde5', K: '#14141a', L: '#eef2f7', C: '#4a4a58' },
    draw(p) {
      p.disc(16, 16, 14, 'W');
      p.swap('W', 'A', (x, y) => y < 15);
      p.swap('A', 'Y', (x, y) => y < 13 && (Math.abs(x - 9) < 2.2 || Math.abs(x - 22) < 2.2) && y > 3);
      p.swap('A', 'C', (x, y) => Math.hypot(x - 11, y - 7) < 3.5);
      p.swap('W', 'G', (x, y) => Math.hypot(x - 11, y - 11) > 15);
      p.rect(2, 15, 28, 2, 'K');
      p.disc(16, 16, 5.5, 'K').disc(16, 16, 4, 'W').disc(16, 16, 2, 'L');
      p.outline('K');
    },
  },

  // ---------------- Star Wars (suite) ----------------
  {
    id: 'sw-wookie', name: 'Wookiee', cat: 'starwars', w: 32, h: 32,
    colors: {
      A: '#7a4f2a', B: '#8f6234', C: '#5e3a1e', D: '#a5753f', T: '#c49a6a', K: '#1b1410', U: '#3a5a8a',
      S: '#5a4030', G: '#b8bec8',
    },
    draw(p) {
      p.rect(0, 25, 32, 7, 'A');
      p.ellipse(16, 14, 11, 13, 'A');
      p.noise('A', ['A', 'B', 'C', 'D'], 2);
      p.ellipse(16, 16, 6.5, 6, 'T');
      p.noise('T', ['T', 'D'], 1);
      p.ellipse(12.5, 13, 2, 1.3, 'K').ellipse(19.5, 13, 2, 1.3, 'K');
      p.set(12, 12, 'U').set(19, 12, 'U');
      p.ellipse(16, 17, 2.4, 1.6, 'K');
      p.line(13, 21, 19, 21, 'C', 1);
      p.line(2, 32, 30, 22, 'S', 3.2);
      for (let i = 0; i < 6; i++) p.rect(5 + i * 4.5, 29 - i * 1.6, 2, 2, 'G');
    },
  },
  {
    id: 'sw-faucon', name: 'Faucon Millenium', cat: 'starwars', w: 40, h: 34,
    colors: { N: '#0b1026', W: '#e8ecff', G: '#b8bec8', H: '#8d96a3', L: '#dfe4ea', D: '#5c636e', B: '#7ec8ff', K: '#1d2128', R: '#c0504a' },
    draw(p) {
      p.fill('N').stars('W', 0.035);
      p.rect(28, 11, 11, 5, 'G').rect(28, 18, 11, 5, 'G');
      p.line(23, 25, 34, 30, 'G', 3).disc(35, 30, 2.6, 'G').disc(35.5, 30, 1.2, 'K');
      p.disc(18, 17, 14, 'G');
      for (let a = 0; a < 12; a++) {
        const t = (a * Math.PI) / 6;
        p.line(18 + Math.cos(t) * 5, 17 + Math.sin(t) * 5, 18 + Math.cos(t) * 13.5, 17 + Math.sin(t) * 13.5, 'H', 1);
      }
      p.disc(18, 17, 5, 'L').disc(18, 17, 3, 'H');
      p.disc(12, 9, 3, 'D').disc(12, 9, 1.4, 'L');
      p.ellipse(5, 17, 2, 9, 'B', (x) => x < 6);
      p.rect(22, 21, 4, 3, 'R');
      p.outline('K');
    },
  },
  {
    id: 'sw-xwing', name: 'Chasseur X-wing', cat: 'starwars', w: 36, h: 36,
    colors: { N: '#0b1026', W: '#e8ecff', G: '#dfe4ea', H: '#9aa3b0', D: '#5c636e', R: '#e8302a', K: '#1d2128', O: '#ff9a2a', B: '#24305e' },
    draw(p) {
      p.fill('N').stars('W', 0.03);
      p.poly([[16, 19], [3, 23], [3, 28], [16, 28]], 'G');
      p.poly([[20, 19], [33, 23], [33, 28], [20, 28]], 'G');
      p.rect(6, 24, 7, 2, 'R').rect(23, 24, 7, 2, 'R');
      p.line(3, 6, 3, 29, 'H', 1.6).line(33, 6, 33, 29, 'H', 1.6);
      p.rect(12, 21, 3, 10, 'H').rect(21, 21, 3, 10, 'H');
      p.rect(12, 31, 3, 1, 'O').rect(21, 31, 3, 1, 'O');
      p.poly([[16, 31], [20, 31], [20, 11], [18, 2], [16, 11]], 'G');
      p.ellipse(18, 14, 1.6, 3, 'B');
      p.rect(16, 20, 4, 1, 'R').rect(17, 25, 2, 3, 'D');
      p.outline('K');
    },
  },
  {
    id: 'sw-mando', name: 'Mandalorien', cat: 'starwars', w: 32, h: 32,
    colors: { O: '#e8a050', P: '#d08038', S: '#b8c0cc', D: '#8a929e', L: '#e6eaf0', K: '#14161c', E: '#5c636e' },
    draw(p) {
      for (let y = 0; y < 32; y++) p.rect(0, y, 32, 1, y < 20 ? 'O' : 'P');
      p.ellipse(16, 13, 11, 12, 'S');
      p.rect(5, 13, 22, 15, 'S');
      p.poly([[5, 27], [27, 27], [29, 32], [3, 32]], 'E');
      p.swap('S', 'D', (x, y) => x > 21 || y > 24);
      p.ellipse(11, 6, 4, 2.5, 'L');
      p.rect(7, 13, 18, 3, 'K').rect(14, 13, 4, 11, 'K');
      p.rect(8, 22, 4, 1, 'D').rect(20, 22, 4, 1, 'D');
    },
  },
  {
    id: 'sw-chasseur', name: 'Chasseur de primes', cat: 'starwars', w: 32, h: 32,
    colors: {
      N: '#24305e', M: '#1c2548', G: '#5a7a3a', H: '#46602c', Y: '#c9a040', R: '#c0402a', K: '#14161c', S: '#9aa3b0', E: '#3a4a2a',
    },
    draw(p) {
      p.fill('N').swap('N', 'M', (x, y) => y > 24);
      p.ellipse(16, 13, 11, 12, 'G');
      p.rect(5, 13, 22, 15, 'G');
      p.swap('G', 'H', (x, y) => x > 21);
      p.rect(5, 18, 4, 9, 'Y').rect(23, 18, 4, 9, 'Y');
      p.poly([[10, 2], [22, 2], [20, 7], [12, 7]], 'R');
      p.rect(7, 13, 18, 3, 'K').rect(14, 13, 4, 11, 'K');
      p.line(27, 12, 30, 2, 'S', 1.4).rect(29, 2, 2, 5, 'S');
      p.set(9, 9, 'E').set(10, 10, 'E').set(11, 9, 'E');
      p.poly([[5, 28], [27, 28], [29, 32], [3, 32]], 'E');
    },
  },
  {
    id: 'sw-bebe', name: 'Bébé Yoda', cat: 'starwars', w: 36, h: 30,
    colors: { G: '#a6c97c', H: '#86a95c', P: '#e0a8a0', K: '#1b1b16', W: '#ffffff', T: '#c9a878', U: '#a68a5c', O: '#3a2c1e' },
    draw(p) {
      p.poly([[8, 19], [28, 19], [31, 30], [5, 30]], 'T');
      p.poly([[12, 19], [24, 19], [21, 24], [15, 24]], 'U');
      p.poly([[12, 11], [0, 7], [1, 12], [12, 16]], 'G').poly([[24, 11], [36, 7], [35, 12], [24, 16]], 'G');
      p.poly([[11, 12], [3, 9], [4, 11], [11, 14]], 'P').poly([[25, 12], [33, 9], [32, 11], [25, 14]], 'P');
      p.ellipse(18, 13, 7.5, 7, 'G');
      p.swap('G', 'H', (x, y) => y < 9 && x > 10 && x < 26);
      p.disc(15, 13.5, 2.6, 'K').disc(21, 13.5, 2.6, 'K');
      p.set(14, 12, 'W').set(20, 12, 'W');
      p.set(18, 16, 'H').line(16.5, 18.5, 19.5, 18.5, 'O');
      p.outline('O');
    },
  },
  {
    id: 'sw-atat', name: 'Marcheur AT-AT', cat: 'starwars', w: 44, h: 34,
    colors: { S: '#cfe3f0', W: '#ffffff', G: '#9aa3b0', H: '#7a838f', D: '#4a5260', K: '#1d2128', L: '#c9d0da' },
    draw(p) {
      p.fill('S').rect(0, 30, 44, 4, 'W');
      p.rect(9, 6, 24, 10, 'G').rect(11, 4, 20, 2, 'G').rect(9, 9, 24, 1, 'L');
      for (let x = 13; x < 32; x += 5) p.rect(x, 11, 1, 5, 'H');
      p.rect(32, 9, 4, 4, 'D');
      p.poly([[35, 7], [43, 9], [43, 15], [35, 15]], 'G');
      p.rect(37, 10, 2, 1, 'K').line(41, 15, 44, 16, 'D', 1);
      [11, 16, 26, 31].forEach((x, i) => {
        p.rect(x, 16, 3, 7, i % 2 ? 'H' : 'G').disc(x + 1.5, 23, 1.8, 'D').rect(x, 24, 3, 6, i % 2 ? 'H' : 'G');
        p.rect(x - 1, 29, 5, 2, 'D');
      });
      p.outline('K');
    },
  },
  {
    id: 'sw-doree', name: 'Droïde doré', cat: 'starwars', w: 32, h: 32,
    colors: { N: '#1c1a2a', A: '#e8b84a', B: '#b8862a', L: '#ffe08a', Y: '#fff36a', O: '#ff9a2a', K: '#1d1608', D: '#5a4012' },
    draw(p) {
      p.fill('N');
      p.rect(9, 26, 14, 6, 'A').rect(13, 23, 6, 4, 'D');
      p.line(14, 23, 13, 27, 'K').line(18, 23, 19, 27, 'K');
      p.disc(5.5, 14, 3, 'B').disc(26.5, 14, 3, 'B');
      p.ellipse(16, 13, 10, 11, 'A');
      p.swap('A', 'B', (x, y) => x > 21 || y > 20);
      p.ellipse(12, 6, 4, 2.5, 'L');
      p.rect(7, 11, 18, 1, 'B');
      p.disc(12, 14, 2.6, 'O').disc(12, 14, 1.6, 'Y');
      p.disc(20, 14, 2.6, 'O').disc(20, 14, 1.6, 'Y');
      p.rect(13, 19, 6, 2, 'K');
    },
  },

  // ---------------- Autres personnages ----------------
  ...[
    ['jv-mario', 'Mario', { C: '#e52521', D: '#a8141a' }, ['C...C', 'CC.CC', 'C.C.C', 'C...C']],
    ['jv-luigi', 'Luigi', { C: '#2ab048', D: '#1a7a30' }, ['C....', 'C....', 'C....', 'CCCC.']],
  ].map(([id, name, cap, letter]) => ({
    id, name, cat: 'jeux', w: 32, h: 32,
    colors: {
      ...cap, W: '#ffffff', S: '#ffc890', T: '#f0a870', H: '#4a2a12', B: '#2a4ad0',
      O: '#2a5ad8', Y: '#ffd23f', K: '#1b1410',
    },
    draw(p) {
      p.rect(4, 27, 24, 5, 'C').rect(8, 27, 4, 5, 'O').rect(20, 27, 4, 5, 'O').rect(8, 30, 16, 2, 'O');
      p.disc(10, 29, 1.2, 'Y').disc(22, 29, 1.2, 'Y');
      p.disc(7, 17, 2.4, 'S').disc(25, 17, 2.4, 'S');
      p.ellipse(16, 18, 9, 8.5, 'S');
      p.rect(7, 11, 3, 6, 'H').rect(22, 11, 3, 6, 'H');
      p.ellipse(16, 9, 11, 7, 'C', (x, y) => y < 10);
      p.rect(5, 9, 25, 2, 'D');
      p.disc(16, 5.5, 3.8, 'W');
      p.stamp(14, 4, letter);
      p.ellipse(13, 14.5, 1.8, 2.6, 'W').ellipse(19, 14.5, 1.8, 2.6, 'W');
      p.ellipse(13.5, 15, 1, 1.8, 'B').ellipse(19.5, 15, 1, 1.8, 'B');
      p.ellipse(16, 19, 3.2, 2.4, 'T');
      p.poly([[8, 22], [12, 20.5], [16, 21.5], [20, 20.5], [24, 22], [22, 24], [16, 23], [10, 24]], 'H');
      p.line(14, 25.5, 18, 25.5, 'K', 0.9);
      p.outline('K');
    },
  })),
  {
    id: 'jv-goomba', name: 'Goomba', cat: 'jeux', w: 32, h: 32,
    colors: { B: '#a0522d', D: '#7a3a1e', C: '#f0d0a0', W: '#ffffff', K: '#1b1410', F: '#3a2414' },
    draw(p) {
      p.ellipse(11, 29, 6, 3, 'F').ellipse(21, 29, 6, 3, 'F');
      p.rect(10, 20, 12, 8, 'C');
      p.ellipse(16, 13, 15, 10, 'B');
      p.swap('B', 'D', (x, y) => y > 17);
      p.ellipse(11.5, 13, 2.6, 3.5, 'W').ellipse(20.5, 13, 2.6, 3.5, 'W');
      p.ellipse(12.5, 14, 1.4, 2, 'K').ellipse(19.5, 14, 1.4, 2, 'K');
      p.line(7, 8, 14, 10.5, 'K', 1.6).line(25, 8, 18, 10.5, 'K', 1.6);
      p.line(11, 20, 21, 20, 'K', 1);
      p.poly([[11, 19.5], [13, 19.5], [12, 17.5]], 'W').poly([[19, 19.5], [21, 19.5], [20, 17.5]], 'W');
      p.outline('K');
    },
  },
  {
    id: 'jv-1up', name: 'Champignon 1-UP', cat: 'jeux', w: 32, h: 32,
    colors: { G: '#3cb44a', H: '#23802e', W: '#ffffff', C: '#f4e2c0', E: '#d8c09a', K: '#1b1b16' },
    draw(p) {
      p.ellipse(16, 13, 15, 12, 'G', (x, y) => y < 18);
      p.swap('G', 'H', (x, y) => y > 14);
      p.disc(16, 7, 4.5, 'W').disc(4, 13, 3, 'W').disc(28, 13, 3, 'W');
      p.rect(7, 18, 18, 12, 'C').rect(8, 30, 16, 1, 'C');
      p.swap('C', 'E', (x, y) => x > 21);
      p.rect(12, 21, 2, 5, 'K').rect(18, 21, 2, 5, 'K');
      p.outline('K');
    },
  },
  {
    id: 'jv-bobomb', name: 'Bob-omb', cat: 'jeux', w: 32, h: 32,
    colors: { K: '#1b1b22', A: '#2e2e3a', L: '#5a5a6e', W: '#ffffff', Y: '#ffd23f', O: '#ff9a2a', G: '#b8bec8', M: '#7a8090', F: '#ffe14d', R: '#e8402a' },
    draw(p) {
      p.path([[16, 5], [17, 2], [20, 1]], 'M', 1.5);
      p.disc(21, 1.5, 1.5, 'R').set(22, 0, 'F');
      p.rect(13, 4, 6, 3, 'G');
      p.ellipse(10, 29, 5.5, 2.8, 'O').ellipse(22, 29, 5.5, 2.8, 'O');
      p.disc(16, 17, 11, 'A');
      p.ellipse(11, 11, 3.5, 2.5, 'L');
      p.ellipse(13, 17, 1.8, 3.2, 'W').ellipse(19, 17, 1.8, 3.2, 'W');
      p.ellipse(13.4, 17.5, 0.9, 2, 'K').ellipse(19.4, 17.5, 0.9, 2, 'K');
      p.rect(28, 13, 2, 8, 'Y').rect(30, 11, 2, 4, 'Y').rect(30, 19, 2, 4, 'Y');
      p.outline('K');
    },
  },
  {
    id: 'jv-kirby', name: 'Kirby', cat: 'jeux', w: 32, h: 32,
    colors: { P: '#ffb3cf', D: '#f28bb0', C: '#ff7aa0', R: '#e83050', K: '#1b1b22', B: '#2a4ad0', W: '#ffffff' },
    draw(p) {
      p.ellipse(9, 28, 7, 3.5, 'R').ellipse(24, 28, 7, 3.5, 'R');
      p.ellipse(4, 17, 3.5, 3, 'P').ellipse(28, 15, 3.5, 3, 'P');
      p.disc(16, 15, 12, 'P');
      p.swap('P', 'D', (x, y) => Math.hypot(x - 12, y - 11) > 14);
      p.ellipse(13, 12, 1.5, 3.2, 'K').ellipse(19, 12, 1.5, 3.2, 'K');
      p.set(13, 10, 'W').set(19, 10, 'W').set(13, 14, 'B').set(19, 14, 'B');
      p.ellipse(9, 17, 2.4, 1.3, 'C').ellipse(23, 17, 2.4, 1.3, 'C');
      p.ellipse(16, 18, 1.5, 1.2, 'R');
      p.outline('K');
    },
  },
  {
    id: 'jv-sonic', name: 'Sonic', cat: 'jeux', w: 32, h: 32,
    colors: { B: '#2a5ad8', D: '#1a3a9a', S: '#f4c89a', W: '#ffffff', G: '#2a9a3a', K: '#1b1b22', P: '#e08aa0' },
    draw(p) {
      p.poly([[12, 6], [0, 2], [9, 12]], 'B').poly([[9, 11], [0, 13], [9, 18]], 'B');
      p.poly([[9, 17], [1, 24], [12, 22]], 'B').poly([[13, 6], [11, 0], [19, 5]], 'B');
      p.poly([[16, 7], [20, 0], [23, 7]], 'B').poly([[18, 6], [20, 2], [21, 6]], 'S');
      p.disc(17, 15, 10, 'B');
      p.swap('B', 'D', (x, y) => x < 6 || y > 23);
      p.ellipse(22, 21, 7, 4.5, 'S');
      p.ellipse(20, 12, 6.5, 5, 'W');
      p.line(20, 8, 20, 11, 'B', 1);
      p.disc(18.5, 13, 1.8, 'G').disc(24, 13, 1.8, 'G');
      p.disc(18.8, 13.3, 0.8, 'K').disc(24.3, 13.3, 0.8, 'K');
      p.disc(29, 18, 1.8, 'K');
      p.path([[18, 22], [22, 24], [26, 22]], 'K', 1);
      p.set(23, 23, 'P');
      p.outline('K');
    },
  },
  {
    id: 'jv-yoshi', name: 'Yoshi', cat: 'jeux', w: 32, h: 32,
    colors: { G: '#4cc04c', H: '#2e8a2e', W: '#ffffff', K: '#1b1b16', R: '#e8402a', C: '#f4e2c0', O: '#ff9a2a' },
    draw(p) {
      p.poly([[3, 12], [0, 9], [4, 9]], 'R').poly([[3, 17], [0, 14], [4, 14]], 'R').poly([[4, 22], [1, 19], [5, 19]], 'R');
      p.ellipse(11, 16, 8, 10, 'G');
      p.ellipse(21, 18, 10.5, 7, 'G');
      p.ellipse(14, 26, 7, 4, 'C');
      p.swap('G', 'H', (x, y) => y > 23 && x > 18);
      p.ellipse(11, 6, 3.5, 5, 'W').ellipse(17, 6, 3.5, 5, 'W');
      p.ellipse(12, 7, 1.5, 2.6, 'K').ellipse(18, 7, 1.5, 2.6, 'K');
      p.disc(24, 13, 1, 'H').disc(28, 14, 1, 'H');
      p.path([[14, 21], [22, 22], [30, 20]], 'K', 1);
      p.disc(8, 20, 1.8, 'O');
      p.outline('K');
    },
  },
  {
    id: 'jv-link', name: 'Link', cat: 'jeux', w: 32, h: 32,
    colors: { G: '#3a9a3a', H: '#24702a', Y: '#f4d040', Z: '#d8a820', S: '#ffd0a8', T: '#f0b088', B: '#2a6ad8', K: '#1b1410', W: '#ffffff', M: '#8a5a2a' },
    draw(p) {
      p.poly([[6, 12], [16, 1], [26, 11], [31, 26], [24, 14]], 'G');
      p.swap('G', 'H', (x, y) => x > 24);
      p.poly([[9, 17], [0, 12], [9, 21]], 'S').poly([[23, 17], [32, 12], [23, 21]], 'S');
      p.ellipse(16, 18, 8, 9, 'S');
      p.swap('S', 'T', (x, y) => y > 24);
      p.poly([[8, 12], [24, 12], [24, 15], [20, 13.5], [16, 16], [12, 13.5], [8, 16]], 'Y');
      p.rect(8, 15, 2, 6, 'Z').rect(22, 15, 2, 6, 'Z');
      p.rect(7, 10, 18, 2, 'M');
      p.ellipse(13, 18, 1.6, 2, 'W').ellipse(19, 18, 1.6, 2, 'W');
      p.ellipse(13.4, 18.4, 0.9, 1.4, 'B').ellipse(19.4, 18.4, 0.9, 1.4, 'B');
      p.line(14.5, 23.5, 17.5, 23.5, 'T', 1);
      p.rect(9, 27, 14, 5, 'G').poly([[13, 27], [19, 27], [16, 31]], 'S');
      p.outline('K');
    },
  },
  {
    id: 'jv-triforce', name: 'Triforce', cat: 'jeux', w: 32, h: 30,
    colors: { N: '#1a3a2a', M: '#14301f', Y: '#f2c230', L: '#ffe27a', D: '#c8981a', K: '#5a3a08' },
    draw(p) {
      p.fill('N').swap('N', 'M', (x, y) => (x + y) % 2 === 0 && y > 26);
      const tri = (ax, ay, s) => {
        p.poly([[ax, ay], [ax + s / 2, ay + s * 0.87], [ax - s / 2, ay + s * 0.87]], 'Y');
        p.poly([[ax, ay + 2], [ax - s / 4 + 0.5, ay + s * 0.87 - 1], [ax - s / 2 + 2.5, ay + s * 0.87 - 1]], 'L');
        p.poly([[ax + 1, ay + 3], [ax + s / 2 - 2, ay + s * 0.87 - 1], [ax + 1, ay + s * 0.87 - 1]], 'D');
      };
      tri(16, 1, 14.5);
      tri(8.75, 13.6, 14.5);
      tri(23.25, 13.6, 14.5);
      p.swap('N', 'K', (x, y) => ['Y', 'L', 'D'].some((c) => p.get(x + 1, y) === c || p.get(x - 1, y) === c || p.get(x, y + 1) === c || p.get(x, y - 1) === c));
      p.swap('M', 'K', (x, y) => ['Y', 'L', 'D'].some((c) => p.get(x, y - 1) === c));
    },
  },
  {
    id: 'jv-lama', name: 'Lama Fortnite', cat: 'jeux', w: 32, h: 32,
    colors: { V: '#9a4fe0', U: '#7a32c0', L: '#c89aff', P: '#ff6fa8', Y: '#ffd23f', B: '#3fd8f0', K: '#1b1b22', W: '#ffffff' },
    draw(p) {
      p.rect(5, 26, 4, 5, 'U').rect(17, 26, 4, 5, 'U').rect(9, 26, 3, 5, 'V').rect(20, 26, 3, 5, 'V');
      p.rect(3, 16, 21, 11, 'V');
      p.rect(19, 6, 7, 14, 'V');
      p.rect(19, 3, 11, 8, 'V').rect(27, 7, 5, 5, 'L');
      p.poly([[20, 3], [20, 0], [23, 3]], 'V').poly([[25, 3], [26, 0], [28, 3]], 'V');
      p.rect(6, 15, 13, 9, 'P').rect(6, 15, 13, 2, 'Y').rect(6, 22, 13, 2, 'Y');
      p.rect(10, 18, 5, 3, 'B');
      p.rect(23, 5, 3, 3, 'W').rect(24, 6, 2, 2, 'K');
      p.rect(19, 12, 2, 8, 'L').rect(3, 23, 21, 1, 'U');
      p.rect(30, 9, 1, 1, 'K');
      p.outline('K');
    },
  },
  {
    id: 'jv-peely', name: 'Peely', cat: 'jeux', w: 28, h: 34,
    colors: { Y: '#ffd93b', O: '#f0b400', M: '#6b4a2e', N: '#3a2414', W: '#ffffff', K: '#1b1b16', R: '#c0402a', B: '#2a5ad8' },
    draw(p) {
      p.rect(9, 29, 4, 4, 'B').rect(16, 29, 4, 4, 'B');
      p.rect(12, 1, 4, 6, 'M').rect(12, 0, 4, 2, 'N');
      p.ellipse(14, 18, 9, 12.5, 'Y');
      p.swap('Y', 'O', (x, y) => x > 18 || y > 27);
      p.disc(10, 15, 2.8, 'W').disc(18, 15, 2.8, 'W');
      p.disc(10.5, 15.5, 1.3, 'K').disc(18.5, 15.5, 1.3, 'K');
      p.path([[9, 21], [14, 24], [19, 21]], 'K', 1.2);
      p.rect(13, 23, 2, 1, 'R');
      p.line(5, 18, 1, 23, 'Y', 2).line(23, 18, 27, 23, 'O', 2);
      p.outline('K');
    },
  },
];

// Trace une liste de dessins. Le résultat est gardé sur l'appareil et n'est recalculé
// que si le code d'un dessin, du pinceau ou des objets partagés (`extra`) change.
// Teinte d'ombre : même couleur, plus sombre et un peu plus saturée.
function darkerHex(hex) {
  const [r, g, b] = Gen.hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  const L = Math.max(0.08, l - (l > 0.85 ? 0.12 : 0.15)), S = Math.min(1, sat * 1.12);
  const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((hh % 6) + 6) % 6 % 2 - 1)), m = L - C / 2;
  const [r1, g1, b1] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(((hh % 6) + 6) % 6)];
  return '#' + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

// Lettres libres pour les teintes d'ombre ajoutées aux palettes.
const SHADE_POOL = 'αβγδεζηθικλμνξοπρστυφχψωабвгдежзийклмнопрстуфхцчшщэюяΓΔΘΛΞΠΣΦΨΩ';

// Crée l'ombreur d'une palette : ajoute à `colors` une teinte foncée par couleur
// (ou réutilise une couleur déjà très proche, pour ne pas multiplier les numéros).
function makeShader(colors, { skip = 'K', ground = '' } = {}) {
  const map = {};
  const dist = (a, b) => { const x = Gen.hexToRgb(a), y = Gen.hexToRgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  Object.keys(colors).forEach((ch) => {
    if (skip.includes(ch) || SHADE_POOL.includes(ch) || Gen.luminance(colors[ch]) < 0.14) return;
    const dark = darkerHex(colors[ch]);
    const near = Object.keys(colors).find((k) => k !== ch && dist(colors[k], dark) < 26);
    if (near) { map[ch] = near; return; }
    const letter = [...SHADE_POOL].find((l) => !(l in colors));
    if (!letter) return;
    colors[letter] = dark;
    map[ch] = letter;
  });
  return { dark: (c) => map[c], ground: (c) => ground.includes(c) };
}

function renderDefs(defs, name, seedOf, extra = '', shaderFor = null) {
  // Les ombreurs complètent les palettes : ils sont créés même quand le dessin vient du cache.
  const shaders = defs.map((d) => (shaderFor ? shaderFor(d) : null));
  let src = painter.toString() + extra + darkerHex.toString() + makeShader.toString();
  defs.forEach((d) => { src += d.id + d.w + 'x' + d.h + d.draw.toString() + (d.colors ? JSON.stringify(d.colors) : ''); });
  let hash = 2166136261;
  for (let i = 0; i < src.length; i++) hash = Math.imul(hash ^ src.charCodeAt(i), 16777619);
  const key = 'cbn.art.' + name;
  const stamp = (hash >>> 0).toString(36) + '.' + src.length;
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached && cached.h === stamp && cached.rows.length === defs.length) return cached.rows;
  } catch (e) { /* recalcul */ }
  const rows = defs.map((d, i) => { const p = painter(d.w, d.h, seedOf(i), shaders[i]); d.draw(p); return p.rows(); });
  try { localStorage.setItem(key, JSON.stringify({ h: stamp, rows })); } catch (e) { /* stockage plein */ }
  return rows;
}

// Transforme les définitions en dessins au même format que ART (lignes de lettres).
const GAME_ART = renderDefs(GAME_ART_DEFS, 'jeux', (i) => i * 131 + 7, '', (d) => makeShader(d.colors))
  .map((rows, i) => { const d = GAME_ART_DEFS[i]; return { id: d.id, name: d.name, cat: d.cat, colors: d.colors, rows }; });
