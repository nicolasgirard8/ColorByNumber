// Dessins détaillés sur le thème des jeux vidéo, tracés avec un petit « pinceau » sur une grille.
// Chaque dessin remplit une grille de lettres (une lettre = une couleur de `colors`, '.' = vide).
'use strict';

function painter(w, h, seed = 1) {
  const g = new Array(w * h).fill('.');
  const rnd = Gen.rng(seed);
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const each = (fn) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fn(x, y); };

  const P = {
    w, h, rnd,
    get: (x, y) => (inb(x, y) ? g[y * w + x] : '.'),
    set(x, y, c) { if (inb(x, y) && c) g[y * w + x] = c; return P; },
    fill(c) { g.fill(c); return P; },
    rect(x, y, rw, rh, c) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) P.set(i, j, c);
      return P;
    },
    // Ellipse remplie, centre et rayons en coordonnées continues (une case = 1×1).
    ellipse(cx, cy, rx, ry, c, keep = () => true) {
      each((x, y) => {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && keep(x, y)) P.set(x, y, c);
      });
      return P;
    },
    disc(cx, cy, r, c, keep) { return P.ellipse(cx, cy, r, r, c, keep); },
    // Segment épais : toutes les cases à moins de t/2 du segment.
    line(x0, y0, x1, y1, c, t = 1) {
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      each((x, y) => {
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
      each((x, y) => {
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
    // Contour autour de tout ce qui est dessiné.
    outline(c, diagonal = false) {
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
    colors: { N: '#0b0b1a', B: '#2442d6', Y: '#ffe14d', D: '#ffd8a8', R: '#ff2a2a', P: '#ffb8de', W: '#ffffff', U: '#2442d6', K: '#141414' },
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
    id: 'jv-pokeball', name: 'Poké Ball', cat: 'jeux', w: 32, h: 32,
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
    id: 'jv-souris', name: 'Pikachu', cat: 'jeux', w: 32, h: 32,
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
];

// Transforme les définitions en dessins au même format que ART (lignes de lettres).
const GAME_ART = GAME_ART_DEFS.map((d, i) => {
  const p = painter(d.w, d.h, i * 131 + 7);
  d.draw(p);
  return { id: d.id, name: d.name, cat: d.cat, colors: d.colors, rows: p.rows() };
});
