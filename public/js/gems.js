// Pierres précieuses sans contour : facettes éclairées depuis le haut à gauche, sur fond de velours.
// Lettres des teintes : L clair, M moyen, D foncé, X très foncé, W reflet ; B fond, S étincelles.
'use strict';

const Gem = {
  // Teinte d'une facette selon son orientation (lumière venant du haut à gauche).
  tone(angle, boost = 0) {
    const b = Math.cos(angle + (3 * Math.PI) / 4) + boost;
    return b > 0.55 ? 'L' : b > 0 ? 'M' : b > -0.55 ? 'D' : 'X';
  },

  // Taille « brillant » : une table au centre et un anneau de facettes jusqu'au contour `outer`.
  brilliant(p, cx, cy, outer, tableK = 0.5) {
    const n = outer.length;
    const table = [];
    for (let j = 0; j < n; j += 2) table.push([cx + (outer[j][0] - cx) * tableK, cy + (outer[j][1] - cy) * tableK]);
    const m = table.length;
    const ang = (pts) => Math.atan2(pts.reduce((s, q) => s + q[1], 0) / pts.length - cy, pts.reduce((s, q) => s + q[0], 0) / pts.length - cx);
    for (let j = 0; j < m; j++) {
      const a = table[j], b = table[(j + 1) % m];
      const o0 = outer[2 * j], o1 = outer[(2 * j + 1) % n], o2 = outer[(2 * j + 2) % n];
      const t1 = [a, o0, o1], t2 = [a, o1, b], t3 = [b, o1, o2];
      p.poly(t1, Gem.tone(ang(t1), -0.2));
      p.poly(t3, Gem.tone(ang(t3), 0.2));
      p.poly(t2, Gem.tone(ang(t2), 0.35));
    }
    p.poly(table, 'M');
    // Reflet en diagonale sur la table.
    const r = Math.hypot(table[0][0] - cx, table[0][1] - cy);
    p.poly([[cx - r * 0.7, cy - r * 0.05], [cx - r * 0.05, cy - r * 0.7], [cx + r * 0.2, cy - r * 0.45], [cx - r * 0.45, cy + r * 0.2]], 'L');
    p.disc(cx - r * 0.45, cy - r * 0.45, Math.max(0.8, r * 0.16), 'W');
  },

  // Contours de formes (listes de points, nombre pair).
  shape(cx, cy, n, fn) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const [x, y] = fn(t);
      pts.push([cx + x, cy + y]);
    }
    return pts;
  },
  round: (cx, cy, r) => Gem.shape(cx, cy, 16, (t) => [Math.cos(t) * r, Math.sin(t) * r]),
  oval: (cx, cy, rx, ry) => Gem.shape(cx, cy, 16, (t) => [Math.cos(t) * rx, Math.sin(t) * ry]),
  cushion: (cx, cy, r) => Gem.shape(cx, cy, 16, (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [Math.sign(c) * Math.pow(Math.abs(c), 0.55) * r, Math.sign(s) * Math.pow(Math.abs(s), 0.55) * r];
  }),
  pear: (cx, cy, r) => Gem.shape(cx, cy + r * 0.25, 16, (t) => {
    const s = Math.sin(t);
    return [Math.cos(t) * r * (s < 0 ? Math.pow(1 + s, 0.65) : 1), s * r * (s < 0 ? 1.5 : 1)];
  }),
  marquise: (cx, cy, rx, ry) => Gem.shape(cx, cy, 16, (t) => [Math.cos(t) * rx, Math.sign(Math.sin(t)) * ry * (1 - Math.pow(Math.abs(Math.cos(t)), 1.6))]),
  heart: (cx, cy, k) => {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const s = (i * 2 * Math.PI) / 24;
      pts.push([cx + 16 * Math.pow(Math.sin(s), 3) * k, cy - (13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s)) * k - 2 * k]);
    }
    return pts;
  },
  // Polygone régulier aux côtés légèrement bombés (triangle, carré…).
  bulged(cx, cy, r, sides, perSide, bulge, rot = -Math.PI / 2) {
    const v = [];
    for (let i = 0; i < sides; i++) v.push([cx + Math.cos(rot + (i * 2 * Math.PI) / sides) * r, cy + Math.sin(rot + (i * 2 * Math.PI) / sides) * r]);
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const [ax, ay] = v[i], [bx, by] = v[(i + 1) % sides];
      for (let k = 0; k < perSide; k++) {
        const t = k / perSide;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const push = Math.sin(t * Math.PI) * bulge;
        const nx = x - cx, ny = y - cy, len = Math.hypot(nx, ny) || 1;
        pts.push([x + (nx / len) * push, y + (ny / len) * push]);
      }
    }
    return pts;
  },

  // Taille à degrés (émeraude) : octogones emboîtés, chaque bande éclairée selon son côté.
  step(p, cx, cy, w, h, corner, levels = 3) {
    const oct = (ww, hh, c) => [
      [cx - ww + c, cy - hh], [cx + ww - c, cy - hh], [cx + ww, cy - hh + c], [cx + ww, cy + hh - c],
      [cx + ww - c, cy + hh], [cx - ww + c, cy + hh], [cx - ww, cy + hh - c], [cx - ww, cy - hh + c],
    ];
    for (let k = 0; k < levels; k++) {
      const f0 = 1 - k * 0.22, f1 = 1 - (k + 1) * 0.22;
      const o = oct(w * f0, h * f0, corner * f0), i = oct(w * f1, h * f1, corner * f1);
      for (let s = 0; s < 8; s++) {
        const q = [o[s], o[(s + 1) % 8], i[(s + 1) % 8], i[s]];
        const mx = (o[s][0] + o[(s + 1) % 8][0]) / 2 - cx, my = (o[s][1] + o[(s + 1) % 8][1]) / 2 - cy;
        p.poly(q, Gem.tone(Math.atan2(my / h, mx / w), k === 1 ? 0.25 : 0));
      }
    }
    const f = 1 - levels * 0.22;
    p.poly(oct(w * f, h * f, corner * f), 'M');
    p.poly([[cx - w * f, cy - h * f * 0.1], [cx - w * f * 0.2, cy - h * f], [cx + w * f * 0.25, cy - h * f], [cx - w * f, cy + h * f * 0.5]], 'L');
    p.disc(cx - w * f * 0.55, cy - h * f * 0.55, 1, 'W');
  },

  sparkle(p, x, y, s = 1) {
    p.line(x - 2 * s, y, x + 2 * s, y, 'S', 1).line(x, y - 2 * s, x, y + 2 * s, 'S', 1);
  },
  velvet(p) {
    p.fill('B');
    p.ellipse(p.w / 2, p.h / 2, p.w * 0.62, p.h * 0.62, 'C');
  },
};

const GEM_TONES = {
  diamant: ['#f2fbff', '#d2eefc', '#a9d9ef', '#6fb3d6'],
  rubis: ['#ff7a8a', '#e8253f', '#b0132c', '#6e0a1c'],
  emeraude: ['#7ff0a8', '#22b866', '#13874a', '#0a5530'],
  saphir: ['#8fb8ff', '#2f6be0', '#1a45a8', '#0e2766'],
  amethyste: ['#e2b6ff', '#a85be8', '#7a35b8', '#4a1a78'],
  topaze: ['#ffd28a', '#ff9a2a', '#d16a0a', '#8a4004'],
  citrine: ['#fff3a0', '#ffd23f', '#e0a810', '#9a6a04'],
  aigue: ['#c8fbff', '#62e0f0', '#22aec8', '#13708a'],
  quartz: ['#ffd6e8', '#ff9ec8', '#e0609a', '#a8306a'],
  peridot: ['#e8ff9a', '#b8e03a', '#82a818', '#4f6a08'],
  grenat: ['#ff8a6a', '#c8302a', '#8a1a1a', '#4f0a0e'],
  tanzanite: ['#b8b8ff', '#6a5ae8', '#4430b0', '#26186a'],
};

// Fond : velours sombre (B) avec un halo plus clair (C) ; S étincelles.
const gemColors = (name, extra = {}) => {
  const [L, M, D, X] = GEM_TONES[name];
  return { B: '#231c3d', C: '#3a2f63', S: '#fff6c8', W: '#ffffff', L, M, D, X, ...extra };
};

const GEM_DEFS = [
  { id: 'gem-diamant', name: 'Diamant', tone: 'diamant', draw(p) { Gem.brilliant(p, 20, 20, Gem.round(20, 20, 15)); } },
  { id: 'gem-rubis', name: 'Rubis', tone: 'rubis', draw(p) { Gem.brilliant(p, 20, 20, Gem.oval(20, 20, 12, 16)); } },
  { id: 'gem-emeraude', name: 'Émeraude', tone: 'emeraude', draw(p) { Gem.step(p, 20, 20, 12, 16, 4); } },
  { id: 'gem-saphir', name: 'Saphir', tone: 'saphir', draw(p) { Gem.brilliant(p, 20, 20, Gem.cushion(20, 20, 14)); } },
  { id: 'gem-topaze', name: 'Topaze', tone: 'topaze', draw(p) { Gem.brilliant(p, 20, 19, Gem.pear(20, 19, 12)); } },
  { id: 'gem-citrine', name: 'Citrine', tone: 'citrine', draw(p) { Gem.brilliant(p, 20, 20, Gem.bulged(20, 20, 18, 4, 4, 0.6, -Math.PI / 4), 0.45); } },
  { id: 'gem-aigue', name: 'Aigue-marine', tone: 'aigue', draw(p) { Gem.brilliant(p, 20, 20, Gem.marquise(20, 20, 17, 10)); } },
  { id: 'gem-quartz', name: 'Quartz rose', tone: 'quartz', draw(p) { Gem.brilliant(p, 20, 21, Gem.heart(20, 21, 0.95)); } },
  { id: 'gem-peridot', name: 'Péridot', tone: 'peridot', draw(p) { Gem.brilliant(p, 20, 22, Gem.bulged(20, 22, 17, 3, 6, 2.2), 0.42); } },
  { id: 'gem-grenat', name: 'Grenat', tone: 'grenat', draw(p) { Gem.brilliant(p, 20, 20, Gem.round(20, 20, 13), 0.55); } },
  { id: 'gem-tanzanite', name: 'Tanzanite', tone: 'tanzanite', draw(p) { Gem.step(p, 20, 20, 15, 11, 3); } },
  {
    id: 'gem-tourmaline', name: 'Tourmaline', tone: 'quartz',
    extra: { l: '#c8ffb0', m: '#5ccf5a', d: '#2f9a3a', x: '#16602a' },
    draw(p) {
      Gem.step(p, 20, 20, 10, 16, 3);
      [['L', 'l'], ['M', 'm'], ['D', 'd'], ['X', 'x']].forEach(([a, b]) => p.swap(a, b, (x, y) => y > 22));
    },
  },
  {
    id: 'gem-amethyste', name: 'Améthyste', tone: 'amethyste',
    extra: { G: '#8a8f99', H: '#6a6f79' },
    draw(p) {
      p.ellipse(20, 33, 15, 5, 'G').noise('G', ['G', 'H'], 2);
      const prism = (bx, by, w, h, a) => {
        const rot = ([x, y]) => [bx + x * Math.cos(a) - y * Math.sin(a), by + x * Math.sin(a) + y * Math.cos(a)];
        p.poly([[-w, 0], [-w, -h], [0, -h - w * 1.4], [0, 0]].map(rot), 'M');
        p.poly([[0, 0], [0, -h - w * 1.4], [w, -h], [w, 0]].map(rot), 'D');
        p.poly([[-w, -h], [0, -h - w * 1.4], [0, -h + w * 0.2]].map(rot), 'L');
        p.poly([[0, -h + w * 0.2], [0, -h - w * 1.4], [w, -h]].map(rot), 'X');
      };
      prism(11, 32, 3, 12, -0.45);
      prism(29, 32, 3, 11, 0.45);
      prism(16, 32, 3.4, 18, -0.15);
      prism(24, 32, 3.2, 15, 0.2);
      prism(20, 33, 3.8, 21, 0);
      p.line(19, 26, 19, 14, 'W', 0.9);
    },
  },
  {
    id: 'gem-perle', name: 'Perle', tone: 'diamant',
    extra: { L: '#fbf4ec', M: '#efe0d6', D: '#d6c2b6', X: '#ae9a90', P: '#ffd6e4' },
    draw(p) {
      const cx = 20, cy = 21, r = 13, hx = cx - r * 0.35, hy = cy - r * 0.35;
      p.disc(cx, cy, r, 'X');
      [[1.55, 'D'], [1.15, 'M'], [0.7, 'L'], [0.25, 'W']].forEach(([k, c]) => p.disc(cx, cy, r, c, (x, y) => Math.hypot(x + 0.5 - hx, y + 0.5 - hy) < r * k));
      p.swap('M', 'P', (x, y) => x + y > 47 && x + y < 51);
    },
  },
  {
    id: 'gem-opale', name: 'Opale', tone: 'aigue',
    extra: { M: '#dff0f6', g: '#5fe0b0', b: '#6fa8ff', r: '#ff8fbf', o: '#ffc66a' },
    draw(p) {
      p.ellipse(20, 20, 13, 16, 'M');
      p.noise('M', ['M', 'M', 'g', 'b', 'r', 'o'], 2);
      p.ellipse(15, 13, 4, 2.6, 'W', (x, y) => p.get(x, y) !== '.');
    },
  },
];

// Grand tableau : toutes les pierres réunies.
const GEM_COLLECTION = {
  id: 'gem-collection', name: 'Trésor de pierres précieuses', w: 64, h: 48,
  colors: {
    B: '#231c3d', C: '#3a2f63', S: '#fff6c8', W: '#ffffff',
    ...['diamant', 'rubis', 'emeraude', 'saphir', 'amethyste', 'citrine'].reduce((acc, name, i) => {
      'LMDX'.split('').forEach((t, k) => { acc[String.fromCharCode(97 + i * 4 + k)] = GEM_TONES[name][k]; });
      return acc;
    }, {}),
  },
  draw(p) {
    Gem.velvet(p);
    const items = [
      [11, 13, (q) => Gem.brilliant(q, 11, 13, Gem.round(11, 13, 9))],
      [32, 12, (q) => Gem.brilliant(q, 32, 12, Gem.oval(32, 12, 7, 9.5))],
      [53, 13, (q) => Gem.step(q, 53, 13, 7.5, 10, 2.5)],
      [12, 35, (q) => Gem.brilliant(q, 12, 35, Gem.cushion(12, 35, 9))],
      [32, 35, (q) => Gem.brilliant(q, 32, 36, Gem.heart(32, 36, 0.6))],
      [53, 35, (q) => Gem.brilliant(q, 53, 35, Gem.bulged(53, 35, 11, 4, 4, 0.4, -Math.PI / 4), 0.45)],
    ];
    items.forEach(([, , draw], i) => {
      const q = painter(p.w, p.h, i);
      draw(q);
      const map = { L: 0, M: 1, D: 2, X: 3 };
      q.cells().forEach((v, idx) => {
        if (v === '.') return;
        p.cells()[idx] = v in map ? String.fromCharCode(97 + i * 4 + map[v]) : v;
      });
    });
    [[22, 4], [43, 24], [3, 24], [22, 44], [60, 3], [42, 45]].forEach(([x, y]) => Gem.sparkle(p, x, y));
  },
};

const GEM_ALL = GEM_DEFS.map((d) => ({
  id: d.id, name: d.name, w: 40, h: 40, colors: gemColors(d.tone, d.extra),
  draw(p) {
    Gem.velvet(p);
    d.draw(p);
    [[5, 6], [34, 7], [6, 34], [35, 33]].forEach(([x, y], i) => Gem.sparkle(p, x, y, i % 2 ? 0.75 : 1));
  },
})).concat([GEM_COLLECTION]);

const GEM_SHARED = Object.values(Gem).join('') + JSON.stringify(GEM_TONES) + GEM_DEFS.map((d) => d.draw.toString() + JSON.stringify(d.extra || {})).join('');
renderDefs(GEM_ALL, 'gemmes', (i) => i * 389 + 5, GEM_SHARED).forEach((rows, i) => {
  const d = GEM_ALL[i];
  GAME_ART.push({ id: d.id, name: d.name, cat: 'gemmes', colors: d.colors, rows });
});
