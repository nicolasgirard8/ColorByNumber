// Grandes scènes, deuxième série : police, jeux vidéo et Pokémon.
// Réutilise le pinceau (games.js), les décors et objets de scenes.js, et sa palette (+ deux teintes).
'use strict';

const PAL2 = { ...PAL, q: '#3a6a7a', t: '#7ed8b8' };

// Petite police d'écriture 3×5 pour les panneaux.
const FONT = {
  P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'], O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'], C: ['XXX', 'X..', 'X..', 'X..', 'XXX'], E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  '?': ['XXX', '..X', '.XX', '...', '.X.'], $: ['.XX', 'XX.', '.X.', '.XX', 'XX.'], Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  '♪': ['.XX', '.X.', '.X.', 'XX.', 'XX.'],
};
function text(p, x, y, str, c, scale = 1) {
  [...str].forEach((ch, n) => {
    const g = FONT[ch];
    if (!g) return;
    g.forEach((row, j) => [...row].forEach((v, i) => { if (v === 'X') p.rect(x + (n * 4 + i) * scale, y + j * scale, scale, scale, c); }));
  });
}

const Obj2 = {
  // ---------- Police ----------
  policeman(p, x, base, k = 1, flip = false, wave = true) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-4, -12, 3.6, 11, 'e'); o.R(0.4, -12, 3.6, 11, 'e');
      o.R(-4.6, -1.6, 4.4, 1.6, 'K'); o.R(0.2, -1.6, 4.4, 1.6, 'K');
      o.R(-6, -24, 12, 12.5, 'd');
      o.PG([[-1.2, -24], [1.2, -24], [0.8, -17], [0, -16], [-0.8, -17]], 'e');
      o.R(-6, -13.4, 12, 1.4, 'K'); o.R(-1, -13.6, 2, 1.8, 'Z');
      o.PG([[-4, -21.5], [-3.4, -20.4], [-2.2, -20.4], [-3.1, -19.7], [-2.7, -18.6], [-4, -19.3], [-5.3, -18.6], [-4.9, -19.7], [-5.8, -20.4], [-4.6, -20.4]], 'Z');
      o.L(-6, -22.5, -8.5, -14, 'd', 3); o.D(-8.6, -13.5, 1.5, 'S');
      if (wave) { o.L(6, -22.5, 9.5, -29, 'd', 3); o.D(9.8, -30, 1.6, 'S'); } else { o.L(6, -22.5, 8.5, -14, 'd', 3); o.D(8.6, -13.5, 1.5, 'S'); }
      o.R(-1.4, -25.5, 2.8, 2, 'S');
      o.D(0, -29.5, 4.8, 'S');
      o.R(-5, -37, 10, 3.4, 'e'); o.R(-6, -34, 12, 1.4, 'K'); o.D(0, -35.5, 0.9, 'Z');
      o.D(-1.8, -29.5, 0.6, 'K'); o.D(1.8, -29.5, 0.6, 'K');
      o.D(-3, -28, 0.8, 'P'); o.D(3, -28, 0.8, 'P');
      o.PATH([[-1.5, -27.2], [0, -26.4], [1.5, -27.2]], 'K', 0.7);
    }, 'K');
  },
  robber(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.L(-1, -12, -5, -2, 'j', 3.4); o.L(1.5, -12, 5, -3, 'j', 3.4);
      o.R(-6.5, -2.5, 4, 2, 'K'); o.R(3, -3.5, 4, 2, 'K');
      o.R(-5, -24, 10, 12.5, 'W');
      for (let y = -23; y < -12; y += 2.4) o.R(-5, y, 10, 1.2, 'K');
      o.L(-5, -22, -9, -16, 'W', 2.8); o.L(5, -22, 9, -27, 'W', 2.8);
      o.D(0, -29, 4.6, 'S');
      o.E(0, -32, 4.8, 3, 'K', (i, j) => j < -31.5);
      o.R(-4.8, -30.5, 9.6, 2, 'K');
      o.D(-1.8, -29.5, 0.7, 'W'); o.D(1.8, -29.5, 0.7, 'W');
      o.PATH([[-1.5, -26.6], [0, -27.2], [1.5, -26.6]], 'K', 0.7);
      o.E(-11, -14, 4.5, 5, 'o'); o.L(-11, -19, -9, -16, 'n', 0.8);
    }, 'K');
    const sx = flip ? x + 12.5 * k : x - 12.5 * k;
    text(p, Math.round(sx), Math.round(base - 16.5 * k), '$', 'n', Math.max(1, Math.round(k * 0.9)));
  },
  moto(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-11, 2], [-3, -1], [8, -1], [13, 3], [-8, 5]], 'W');
      o.PG([[-10, 3], [12, 3], [11, 5], [-8, 5]], 'd');
      o.PG([[8, -1], [11, -7], [13.5, -7], [11.5, 0]], 'a');
      o.R(-8.5, -2.4, 7, 1.6, 'K');
      o.R(9, -1, 2.4, 1.6, 'y');
      // Pilote assis, penché vers le guidon.
      o.L(-3.5, -1.5, 2.5, 2.2, 'e', 2.6); o.R(1.6, 1.6, 3.6, 2, 'K');
      o.PG([[-7, -1.8], [-1.5, -1.8], [0.5, -10], [-5, -11]], 'd');
      o.R(-6, -6, 6, 1.2, 'Z');
      o.L(-1, -9, 7.5, -4.5, 'd', 2.2); o.D(8, -4.4, 1.2, 'K');
      o.D(-2, -13.5, 3.4, 'W'); o.E(-0.4, -13.3, 2, 1.5, 'a'); o.R(-5.4, -16.2, 6.2, 1.2, 'd');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [-10, 12].forEach((wx) => { o.D(wx, 7, 4, 'K'); o.D(wx, 7, 2.1, 'h'); o.D(wx, 7, 0.8, 'j'); });
  },
  dog(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.PATH([[-9, -10], [-14, -14], [-15, -18]], 'k', 2.4);
      o.R(-8, -6, 2.6, 6, 'k'); o.R(-4, -6, 2.6, 6, 'k'); o.R(3, -6, 2.6, 6, 'k'); o.R(7, -6, 2.6, 6, 'k');
      o.E(0, -10, 10, 5, 'k');
      o.E(-1, -13, 7, 2.6, 'n', (i, j) => j < -12);
      o.R(-5, -12.6, 10, 5, 'e');
      o.R(-1.5, -11.2, 3, 2, 'Z');
      o.E(10, -16, 5, 4.2, 'k');
      o.E(14.5, -14.5, 3, 2, 'o'); o.D(17, -15, 1, 'K');
      o.PG([[7, -19], [8, -25], [10.5, -19.5]], 'n'); o.PG([[11, -19.5], [13, -25], [13.5, -19]], 'n');
      o.D(11, -17, 0.9, 'K'); o.PATH([[13.5, -12.8], [15.5, -12], [17, -13]], 'K', 0.6);
      o.E(15, -11.5, 1.2, 1.6, 'P');
    }, 'K');
  },
  van(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 0], [28, 0], [34, 6], [36, 8], [36, 16], [0, 16]], 'W');
      o.R(0, 8.6, 36, 5.6, 'd'); o.R(0, 14.2, 36, 1, 'e');
      o.R(3, 2.5, 7, 5, 'a'); o.R(12, 2.5, 7, 5, 'a'); o.PG([[22, 2.5], [27.5, 2.5], [32, 7.5], [22, 7.5]], 'a');
      o.R(12, -2, 4, 2, 'd'); o.R(16, -2, 4, 2, 'R');
      o.R(35, 13, 1.4, 2, 'y');
    }, 'K');
    text(p, Math.round(flip ? x - 28 * k : x + 4 * k), Math.round(y + 8.6 * k + 0.5), 'POLICE', 'W', 1);
    const o = at(p, x, y, k, flip);
    [7, 29].forEach((wx) => { o.D(wx, 16, 3.6, 'K'); o.D(wx, 16, 1.8, 'h'); });
  },
  trafficLight(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.R(-0.8, -20, 1.6, 20, 'j');
      o.R(-3, -34, 6, 15, 'K');
      o.D(0, -31, 2, 'R'); o.D(0, -26.5, 2, 'O'); o.D(0, -22, 2, 'G');
    }, 'j');
  },
  boat(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-18, 0], [18, 0], [14, 7], [-15, 7]], 'W');
      o.R(-16.5, 1, 33, 5.2, 'd');
      o.R(-8, -8, 14, 8, 'W'); o.R(-6, -6, 4, 3.5, 'a'); o.R(0, -6, 4, 3.5, 'a');
      o.R(-4, -10.5, 3, 2.5, 'd'); o.R(-1, -10.5, 3, 2.5, 'R');
    }, 'K');
    text(p, Math.round(x - 11.5), Math.round(y + 1.2 * k), 'POLICE', 'W', 1);
  },

  // ---------- Jeux vidéo ----------
  plumber(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-4, -3, 4, 2.4, 'B'); o.R(0.6, -3, 4.2, 2.4, 'B');
      o.R(-3.5, -8, 3, 5.5, 'd'); o.R(0.5, -8, 3, 5.5, 'd');
      o.R(-3.8, -16.5, 7.6, 6, 'R');
      o.R(-3.5, -12, 7, 5, 'd'); o.R(-3, -16.5, 1.4, 5, 'd'); o.R(1.6, -16.5, 1.4, 5, 'd');
      o.D(-2.3, -11.5, 0.6, 'Y'); o.D(2.3, -11.5, 0.6, 'Y');
      o.L(3.5, -15.5, 6, -21, 'R', 2); o.D(6.4, -22, 1.4, 'W');
      o.L(-3.5, -15.5, -6, -12.5, 'R', 2); o.D(-6.2, -12, 1.4, 'W');
      o.D(0, -20, 3.6, 'S');
      o.D(2.8, -19.8, 1.2, 'S');
      o.E(0, -22.5, 3.9, 2.2, 'R', (i, j) => j < -22.3); o.R(-3.4, -22.8, 8.4, 1.1, 'R');
      o.D(0, -24, 0.9, 'W');
      o.R(-0.4, -18.7, 3.6, 1, 'n');
      o.R(-3.6, -21.5, 1.4, 2.6, 'n');
      o.D(1, -21, 0.5, 'K');
    }, 'K');
  },
  goomba(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.E(-2.6, -1, 2.6, 1.3, 'K'); o.E(2.6, -1, 2.6, 1.3, 'K');
      o.R(-2.6, -5, 5.2, 3.5, 'p');
      o.E(0, -7, 6, 4, 'B', (i, j) => j < -4.5);
      o.D(-1.8, -7, 1.1, 'W'); o.D(1.8, -7, 1.1, 'W'); o.D(-1.5, -6.8, 0.5, 'K'); o.D(1.5, -6.8, 0.5, 'K');
      o.L(-3, -9.5, -0.8, -8.6, 'K', 0.7); o.L(3, -9.5, 0.8, -8.6, 'K', 0.7);
    }, 'K');
  },
  qblock(p, x, y, s = 5) {
    p.layer((q) => { q.rect(x, y, s, s, 'Z'); text(q, x + 1, y, '?', 'K', 1); }, 'K');
  },
  bricks(p, x, y, w, h) {
    p.layer((q) => {
      q.rect(x, y, w, h, 'k');
      for (let j = y; j < y + h; j += 2) q.rect(x, j, w, 1, 'n');
      for (let j = y; j < y + h; j += 2) for (let i = x + ((j - y) % 4 ? 2 : 0); i < x + w; i += 4) q.set(i, j + 1, 'n');
    }, 'K');
  },
  pipe(p, x, base, h) {
    p.layer((q) => {
      q.rect(x + 1, base - h, 8, h, 'G'); q.rect(x, base - h - 3, 10, 3, 'G');
      q.rect(x + 2, base - h, 2, h, 'l'); q.rect(x + 1, base - h - 2.5, 2, 2, 'l');
    }, 'K');
  },
  sonic(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-3, -9, 2, 6, 'd'); o.R(1, -9, 2, 6, 'd');
      o.E(-3, -2, 3.4, 1.8, 'R'); o.E(3, -2, 3.4, 1.8, 'R'); o.R(-5, -2.6, 3.6, 0.9, 'W'); o.R(1.4, -2.6, 3.6, 0.9, 'W');
      o.E(0, -12, 4.2, 4.5, 'd'); o.E(0.8, -11.5, 2.4, 3, 'p');
      o.L(3.5, -14, 7, -12, 'd', 1.6); o.D(7.6, -12, 1.4, 'W');
      o.PG([[-4, -24], [-13, -26], [-6, -21]], 'd'); o.PG([[-5, -20], [-14, -19], [-6, -17]], 'd'); o.PG([[-5, -17], [-12, -12], [-3, -15]], 'd');
      o.D(0, -20, 6, 'd');
      o.PG([[-1, -25], [1, -30], [3, -25]], 'd');
      o.E(3, -17.5, 4, 2.8, 'p');
      o.E(2, -21, 3.2, 2.8, 'W'); o.L(2, -23.5, 2, -19, 'd', 0.6);
      o.D(1, -21, 0.9, 'G'); o.D(3.4, -21, 0.9, 'G');
      o.D(6.5, -18.5, 1, 'K');
      o.PATH([[2, -16.4], [4, -15.6], [6, -16.6]], 'K', 0.6);
    }, 'K');
  },
  ring(p, x, y, r = 2.2) { p.layer((q) => { q.disc(x, y, r, 'Y'); q.disc(x, y, r * 0.5, '.'); }, 'Z'); },
  kirby(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.E(-5, 8, 5, 2.6, 'R'); o.E(5, 8, 5, 2.6, 'R');
      o.E(-9, -1, 3, 2.4, 'P'); o.E(9, -3, 3, 2.4, 'P');
      o.D(0, 0, 9, 'P');
      o.E(-2.2, -2.5, 1.1, 2.6, 'K'); o.E(2.2, -2.5, 1.1, 2.6, 'K'); o.D(-2.2, -4, 0.5, 'W'); o.D(2.2, -4, 0.5, 'W');
      o.E(-5.5, 1, 1.8, 1, 'Q'); o.E(5.5, 1, 1.8, 1, 'Q');
      o.E(0, 2.5, 1.2, 1, 'R');
    }, 'K');
  },
  warpStar(p, x, y, k = 1) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const r = (i % 2 ? 3.4 : 8) * k, a = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    ['R', 'O', 'Y', 'G', 'd'].forEach((c, i) => p.line(x - 10 * k - i * 3.5 * k, y + (i - 2) * 1.2 * k, x - 4 * k, y + (i - 2) * 1.2 * k, c, 1.4 * k));
    p.layer((q) => q.poly(pts, 'Y'), 'K');
  },
  crewmate(p, x, base, k = 1, body = 'R', flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-8, -15, 3.5, 8, body);
      o.R(-5, -5, 4, 5, body); o.R(1, -5, 4, 5, body);
      o.E(0, -13, 5.5, 8, body); o.R(-5.5, -13, 11, 9, body);
      o.E(1.5, -15, 4, 2.4, 'a'); o.E(0.6, -15.8, 2, 0.8, 'W');
    }, 'K');
  },
  bus(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      [[-11, -14], [-4, -13], [4, -13], [11, -14]].forEach(([dx]) => o.L(dx * 0.9, -8, dx, 0, 'n', 0.6));
      o.E(0, -18, 14, 11, 'R');
      [-9, -3, 3, 9].forEach((sx) => o.E(sx, -18, 2, 10.6, 'W'));
      o.R(-3, -8, 6, 2, 'B');
      o.PG([[-14, 0], [14, 0], [16, 3], [16, 11], [-14, 11]], 'd');
      for (let wx = -12; wx < 12; wx += 5) o.R(wx, 2, 3.5, 3.5, 'a');
      o.R(-14, 7, 30, 1, 'Y');
    }, 'K');
    const o = at(p, x, y, k);
    [-8, 10].forEach((wx) => { o.D(wx, 11, 2.6, 'K'); o.D(wx, 11, 1.2, 'h'); });
  },
  link(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.L(5, -14, 11, -28, 'h', 1.6); o.L(3.5, -15, 7, -12, 'd', 1.6); o.D(4.8, -13.6, 1, 'Z');
      o.R(-3.5, -7, 3, 6, 'o'); o.R(0.5, -7, 3, 6, 'o'); o.R(-4, -2, 3.8, 2, 'B'); o.R(0.5, -2, 3.8, 2, 'B');
      o.PG([[-5, -17], [5, -17], [6, -6], [-6, -6]], 'G'); o.R(-5.5, -10, 11, 1.2, 'B');
      o.L(4, -16, 5, -14, 'S', 2);
      o.PG([[-11, -16], [-4, -16], [-4, -9], [-7.5, -6], [-11, -9]], 'd');
      o.PG([[-7.5, -14.5], [-6, -12], [-9, -12]], 'Y');
      o.D(0, -21, 4, 'S');
      o.PG([[-4, -23], [3, -27], [6, -22], [11, -14], [4, -22], [-4, -21]], 'G');
      o.R(-3.6, -23.2, 7.2, 1.6, 'Y');
      o.PG([[-4, -21], [-7, -23], [-4, -19]], 'S'); o.PG([[4, -21], [7, -23], [4, -19]], 'S');
      o.D(-1.5, -21, 0.6, 'd'); o.D(1.5, -21, 0.6, 'd');
      o.PATH([[-1, -18.8], [0, -18.3], [1, -18.8]], 's', 0.6);
    }, 'K');
  },
  angryBird(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-5, -6], [-3, -11], [-1, -6]], 'R'); o.PG([[-2, -6], [1, -10], [2, -6]], 'R');
      o.PG([[-8, 1], [-12, -1], [-12, 3]], 'K');
      o.D(0, 0, 7, 'R');
      o.E(1.5, 3.5, 4.5, 3, 'p', (i, j) => j > 1.5);
      o.D(1, -1, 1.5, 'W'); o.D(4, -1, 1.5, 'W'); o.D(1.4, -0.8, 0.7, 'K'); o.D(4.2, -0.8, 0.7, 'K');
      o.L(-0.5, -3.4, 2.4, -2.2, 'K', 1.2); o.L(5.6, -3.4, 2.8, -2.2, 'K', 1.2);
      o.PG([[2, 1], [7.5, 2], [2.5, 3.5]], 'Y');
    }, 'K');
  },
  pig(p, x, y, r = 4) {
    p.layer((q) => {
      q.disc(x, y, r, 'G');
      q.ellipse(x, y + r * 0.2, r * 0.45, r * 0.32, 'l');
      q.set(Math.round(x - r * 0.15), Math.round(y + r * 0.2), 'H').set(Math.round(x + r * 0.15), Math.round(y + r * 0.2), 'H');
      q.disc(x - r * 0.45, y - r * 0.35, r * 0.2, 'W'); q.disc(x + r * 0.45, y - r * 0.35, r * 0.2, 'W');
      q.disc(x - r * 0.75, y - r * 0.85, r * 0.22, 'G'); q.disc(x + r * 0.75, y - r * 0.85, r * 0.22, 'G');
    }, 'K');
  },
  egg(p, x, y, k = 1, spots = 'G') {
    p.layer((q) => {
      q.ellipse(x, y, 4 * k, 5 * k, 'W');
      [[-1.5, -2], [1.6, -0.5], [-0.6, 2.2], [2, 2.6]].forEach(([dx, dy]) => q.disc(x + dx * k, y + dy * k, 0.9 * k, spots));
    }, 'K');
  },

  // ---------- Pokémon en pied ----------
  charmander(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.PATH([[3, -6], [9, -8], [11, -13]], 'O', 2.4);
      o.PG([[11, -22], [14, -17], [13, -13], [9, -13], [9, -17]], 'R');
      o.PG([[11, -19.5], [12.6, -16.5], [12, -14], [10, -14], [10, -16.5]], 'O');
      o.PG([[11, -17], [11.8, -15], [10.4, -15]], 'Y');
      o.E(-3, -2.5, 2.4, 2.6, 'O'); o.E(3, -2.5, 2.4, 2.6, 'O');
      o.E(0, -9, 5, 6.5, 'O'); o.E(0.5, -8.5, 3, 4.5, 'p');
      o.E(-5, -11, 2.2, 1.2, 'O'); o.E(5, -11, 2.2, 1.2, 'O');
      o.E(0, -20, 6, 5.4, 'O');
      o.E(-2, -20.6, 1, 1.6, 'K'); o.E(2.6, -20.6, 1, 1.6, 'K'); o.D(-2.2, -21.4, 0.4, 'W'); o.D(2.4, -21.4, 0.4, 'W');
      o.PATH([[-2.5, -17.4], [0.5, -16.6], [3.5, -17.4]], 'K', 0.6);
    }, 'K');
  },
  squirtle(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.PATH([[4, -6], [9, -6], [10, -9], [8, -10], [7.5, -8.5]], 'b', 2);
      o.E(-3, -2.5, 2.4, 2.4, 'b'); o.E(3, -2.5, 2.4, 2.4, 'b');
      o.E(0, -9.5, 6, 6.6, 'o'); o.E(0, -9.5, 5.2, 5.8, 'B');
      o.E(0, -9, 3.6, 5, 'p'); o.L(-3.4, -10, 3.4, -10, 'o', 0.6); o.L(-3.2, -7, 3.2, -7, 'o', 0.6);
      o.E(-6, -11, 2.2, 1.3, 'b'); o.E(6, -11, 2.2, 1.3, 'b');
      o.E(0, -20, 6, 5.4, 'b');
      o.E(-2.2, -20.6, 1.4, 2, 'W'); o.E(2.6, -20.6, 1.4, 2, 'W'); o.E(-2, -20.3, 0.8, 1.3, 'r'); o.E(2.8, -20.3, 0.8, 1.3, 'r');
      o.PATH([[-2.5, -17.2], [0.5, -16.4], [3.5, -17.2]], 'K', 0.6);
    }, 'K');
  },
  bulbasaur(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      [[-6, -4], [-2, -4], [3, -4], [6.5, -4]].forEach(([lx, ly]) => o.R(lx, ly, 2.6, 4, 't'));
      o.E(1, -6.5, 8, 4.5, 't');
      o.E(3, -12.5, 5.5, 5.5, 'G'); o.E(1.6, -14, 2, 1.8, 'l');
      o.L(3, -18, 3, -8, 'H', 0.6); o.L(-0.5, -15, 2.5, -9, 'H', 0.6); o.L(6.5, -15, 3.5, -9, 'H', 0.6);
      o.PG([[-11, -12], [-10.5, -16], [-8, -13]], 't'); o.PG([[-5, -13], [-4, -16.5], [-3, -12]], 't');
      o.E(-7.5, -9, 5.2, 4.2, 't');
      [[-2, -6], [3, -4.5], [-8, -11]].forEach(([sx, sy]) => o.D(sx, sy, 0.8, 'm'));
      o.E(-9.5, -9.5, 0.9, 1.3, 'R'); o.E(-6, -9.5, 0.9, 1.3, 'R'); o.D(-9.6, -10, 0.35, 'W'); o.D(-6.1, -10, 0.35, 'W');
      o.PATH([[-10, -7], [-7.5, -6.2], [-5.2, -7]], 'K', 0.6);
    }, 'K');
  },
  eevee(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.E(6, -11, 3, 5, 'k'); o.E(7, -15, 2, 2, 'p');
      [[-4, -4], [-1, -4], [2, -4], [4.5, -4]].forEach(([lx, ly]) => o.R(lx, ly, 2, 4, 'k'));
      o.E(0.5, -7, 5.5, 4, 'k');
      o.E(-3, -11, 4.6, 2.8, 'p');
      o.PG([[-9, -16], [-11, -27], [-5, -19]], 'k'); o.PG([[1, -19], [4, -28], [3, -16]], 'k');
      o.PG([[-8.4, -18], [-10, -25], [-6.2, -19.5]], 'n'); o.PG([[1.8, -19.4], [3.6, -25.5], [2.8, -17.4]], 'n');
      o.E(-3.5, -16.5, 5, 4.4, 'k');
      o.E(-5.4, -17, 1.1, 1.5, 'K'); o.E(-1.6, -17, 1.1, 1.5, 'K'); o.D(-5.6, -17.6, 0.45, 'W'); o.D(-1.8, -17.6, 0.45, 'W');
      o.D(-3.5, -15, 0.45, 'K');
    }, 'K');
  },
  jigglypuff(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-6, -5], [-6, -11], [-2.5, -7.5]], 'P'); o.PG([[6, -5], [6, -11], [2.5, -7.5]], 'P');
      o.PG([[-5.5, -7], [-5.6, -9.5], [-3.8, -7.8]], 'K'); o.PG([[5.5, -7], [5.6, -9.5], [3.8, -7.8]], 'K');
      o.E(-3.5, 8, 2.8, 1.4, 'Q'); o.E(3.5, 8, 2.8, 1.4, 'Q');
      o.D(0, 0, 8, 'P');
      o.PATH([[0, -8], [-1.6, -5], [0.4, -4], [1, -6]], 'Q', 1.1);
      [-3.2, 3.2].forEach((ex) => { o.D(ex, 0, 2.5, 'W'); o.D(ex + 0.3, 0.3, 1.6, 'E'); o.D(ex + 0.3, 0.3, 0.8, 'F'); o.D(ex - 0.6, -0.8, 0.5, 'W'); });
      o.E(0, 4.5, 1.2, 1, 'R');
      o.L(-7.5, 2, -10, 6, 'P', 1.8);
    }, 'K');
  },
  snorlax(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.E(-8, -2, 4.6, 2.4, 'p'); o.E(8, -2, 4.6, 2.4, 'p'); o.D(-8, -2, 1, 'B'); o.D(8, -2, 1, 'B');
      o.E(0, -11, 13, 10.5, 'q');
      o.E(0, -9.5, 9.5, 8, 'p');
      o.PG([[-6, -26], [-5, -31], [-2.5, -27]], 'q'); o.PG([[6, -26], [5, -31], [2.5, -27]], 'q');
      o.E(0, -23, 8, 5.8, 'q');
      o.E(0, -22, 5.6, 4, 'p');
      o.L(-3.5, -23, -1.5, -23, 'K', 0.6); o.L(1.5, -23, 3.5, -23, 'K', 0.6);
      o.R(-1.6, -21, 3.2, 1, 'K'); o.R(-1.2, -21, 0.6, 0.6, 'W'); o.R(0.6, -21, 0.6, 0.6, 'W');
      o.E(-13, -12, 2.6, 4, 'q'); o.E(13, -12, 2.6, 4, 'q');
    }, 'K');
  },
  magikarp(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[7, 0], [14, -6], [13, 0], [14, 6]], 'W');
      o.PG([[-5, -5], [-2, -10], [1, -6.5], [4, -9.5], [5, -5]], 'Y');
      o.E(0, 0, 9, 6, 'L');
      o.E(0.5, 3, 6, 2.4, 'p');
      o.PG([[-1, 4], [1, 8], [3, 4]], 'Y');
      o.D(-5, -1, 2.2, 'W'); o.D(-5, -1, 0.9, 'K');
      o.E(-8.6, 1.4, 1.3, 1.8, 'P');
      o.PATH([[-8, -1.5], [-11, -5], [-11, -8]], 'Y', 0.8);
    }, 'K');
  },
  psyduck(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.E(-2.6, -1, 2.6, 1.3, 'p'); o.E(2.6, -1, 2.6, 1.3, 'p');
      o.E(0, -7, 5.2, 6, 'Y');
      o.L(-4.5, -9, -6, -17, 'Y', 2); o.L(4.5, -9, 6, -17, 'Y', 2);
      o.E(0, -17, 6, 5.5, 'Y');
      o.E(0, -14.2, 3.6, 1.7, 'p'); o.L(-3.2, -14.2, 3.2, -14.2, 'o', 0.5);
      o.D(-2.4, -18, 1.4, 'W'); o.D(2.4, -18, 1.4, 'W'); o.D(-2.4, -18, 0.4, 'K'); o.D(2.4, -18, 0.4, 'K');
      o.L(0, -22, 0, -25, 'K', 0.6); o.L(-1.5, -22, -2.5, -24.5, 'K', 0.6); o.L(1.5, -22, 2.5, -24.5, 'K', 0.6);
    }, 'K');
  },
  mew(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PATH([[2, 3], [8, 5], [12, 0], [11, -6], [8, -9]], 'P', 1);
      o.E(7.6, -10, 1.6, 2.2, 'P');
      o.E(1, 1, 3, 3.4, 'P');
      o.L(-1.5, 3, -3, 6, 'P', 1.2); o.L(3, 3.5, 4, 6.5, 'P', 1.2);
      o.PG([[-4, -7], [-4.5, -11], [-1.8, -8.5]], 'P'); o.PG([[4, -7], [4.5, -11], [1.8, -8.5]], 'P');
      o.E(0, -5, 4.6, 4, 'P');
      o.E(-1.7, -5.3, 1.1, 1.6, 'd'); o.E(1.7, -5.3, 1.1, 1.6, 'd'); o.D(-1.9, -5.9, 0.4, 'W'); o.D(1.5, -5.9, 0.4, 'W');
      o.PATH([[-0.8, -3], [0, -2.6], [0.8, -3]], 'K', 0.5);
    }, 'K');
  },
  kid(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-3.6, -10, 3.2, 9, 'e'); o.R(0.4, -10, 3.2, 9, 'e');
      o.R(-4.2, -1.6, 4, 1.6, 'R'); o.R(0.4, -1.6, 4, 1.6, 'R');
      o.R(-5, -20, 10, 10.5, 'd'); o.R(-1, -20, 2, 10.5, 'W');
      o.L(-5, -18.5, -8, -12, 'd', 2.6); o.D(-8.2, -11.6, 1.4, 'S');
      o.L(5, -18.5, 9, -24, 'd', 2.6); o.D(9.4, -24.6, 1.4, 'S');
      o.D(0, -24.5, 4.4, 'S');
      o.E(0, -27.5, 4.6, 2.6, 'R', (i, j) => j < -27); o.R(-4.6, -27.6, 9, 1.2, 'R'); o.R(-1.2, -29.5, 2.4, 1.6, 'W');
      o.R(-4.4, -26.4, 1.4, 2.4, 'n');
      o.D(-1.6, -24.4, 0.6, 'K'); o.D(1.6, -24.4, 0.6, 'K');
      o.PATH([[-1.4, -22.2], [0, -21.4], [1.4, -22.2]], 'K', 0.6);
    }, 'K');
  },
};

const SCENE2_DEFS = [
  // ---------------- Police ----------------
  {
    id: 'xl-po-policier', name: 'Policier', cat: 'police', w: 48, h: 64,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 30, 6, 1);
      Deco.city(p, 52);
      p.rect(0, 52, 48, 2, 'h'); p.rect(0, 54, 48, 10, 'i');
      Obj2.policeman(p, 22, 61, 1.45);
    },
  },
  {
    id: 'xl-po-commissariat', name: 'Commissariat', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 56, 7, 3.5);
      p.layer((q) => {
        q.rect(8, 10, 48, 28, 'h');
        q.rect(6, 8, 52, 3, 'i');
        q.rect(22, 12, 20, 8, 'd');
        for (let x = 10; x < 56; x += 8) if (x < 20 || x > 42) { q.rect(x, 14, 5, 6, 'a'); q.rect(x, 25, 5, 6, 'a'); }
        q.rect(27, 25, 10, 13, 'B'); q.rect(31.5, 25, 1, 13, 'n');
        q.rect(30, 5, 4, 3, 'd'); q.rect(32, 4, 2, 1, 'R');
      }, 'K');
      text(p, 21, 13, 'POLICE', 'W', 1);
      Deco.road(p, 38, 10);
      Obj.policeCar(p, 2, 32, 0.75);
    },
  },
  {
    id: 'xl-po-moto', name: 'Moto de police', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.tree(p, 8, 32, 1.1); Deco.tree(p, 56, 32, 1);
      Deco.grass(p, 32, true);
      Deco.road(p, 34, 14);
      Obj2.moto(p, 32, 30, 1.25);
    },
  },
  {
    id: 'xl-po-chien', name: 'Chien policier', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 6, 6, 1);
      Deco.tree(p, 56, 36, 1.2);
      Deco.grass(p, 36);
      Obj2.dog(p, 28, 44, 1.35);
    },
  },
  {
    id: 'xl-po-poursuite', name: 'Course-poursuite', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      Deco.moon(p, 54, 7, 4, 'f');
      Deco.city(p, 28);
      Deco.road(p, 28, 20);
      p.layer((q) => {
        const o = at(q, 46, 26, 0.65);
        o.PG([[0, 6], [3, 3], [8, 2], [11, -2], [20, -2], [24, 2], [28, 3], [29, 6], [29, 11], [0, 11]], 'G');
        o.PG([[11.5, -0.6], [15, -0.6], [15, 3], [9, 3]], 'a'); o.PG([[16.5, -0.6], [19.5, -0.6], [22.5, 3], [16.5, 3]], 'a');
      }, 'K');
      const o = at(p, 46, 26, 0.65);
      [6, 23].forEach((wx) => { o.D(wx, 11, 3, 'K'); o.D(wx, 11, 1.5, 'h'); });
      Obj.policeCar(p, 2, 32, 1.05);
    },
  },
  {
    id: 'xl-po-voleur', name: 'Attrapez le voleur !', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.city(p, 36);
      p.rect(0, 36, 64, 2, 'h'); p.rect(0, 38, 64, 10, 'i');
      Obj2.robber(p, 46, 46, 1.05);
      Obj2.policeman(p, 16, 46, 1.05, false, true);
    },
  },
  {
    id: 'xl-po-fourgon', name: 'Fourgon de police', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 44, 5, 1);
      Deco.city(p, 30);
      Deco.road(p, 30, 18);
      Obj2.van(p, 12, 20, 1.15);
    },
  },
  {
    id: 'xl-po-circulation', name: 'La circulation', cat: 'police', w: 48, h: 64,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 4, 6, 0.9);
      Deco.city(p, 44);
      p.rect(0, 44, 48, 20, 'j');
      for (let x = 2; x < 48; x += 6) p.rect(x, 50, 4, 8, 'W');
      Obj2.trafficLight(p, 40, 50, 1.1);
      Obj2.policeman(p, 20, 62, 1.25, false, true);
    },
  },
  {
    id: 'xl-po-bateau', name: 'Bateau de police', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.3, 0.6);
      Deco.sun(p, 54, 8, 4);
      Deco.cloud(p, 6, 6, 0.9);
      Obj.waves(p, 32);
      Obj2.boat(p, 30, 30, 1.25);
    },
  },
  {
    id: 'xl-po-helico', name: 'Hélicoptère de police', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.cloud(p, 6, 6, 0.9);
      Deco.city(p, 48);
      Obj.heli(p, 36, 16, 1.15, false, 'e');
    },
  },
  {
    id: 'xl-po-badge', name: 'Badge de police', cat: 'police', w: 40, h: 40,
    draw(p) {
      p.fill('e');
      p.layer((q) => {
        q.poly([[20, 2], [33, 7], [32, 22], [20, 37], [8, 22], [7, 7]], 'Z');
        q.poly([[20, 5], [30, 9], [29.5, 21.5], [20, 33.5], [10.5, 21.5], [10, 9]], 'Y');
        const pts = [];
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, a = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([20 + Math.cos(a) * r, 15 + Math.sin(a) * r]); }
        q.poly(pts, 'Z');
        q.rect(9, 23, 22, 6, 'd');
      }, 'K');
      text(p, 9, 24, 'POLICE', 'W', 1);
    },
  },
  {
    id: 'xl-po-gyrophare', name: 'Gyrophare', cat: 'police', w: 40, h: 40,
    draw(p) {
      p.fill('g');
      for (let a = 0; a < 6; a++) {
        const t = -Math.PI / 2 + (a - 2.5) * 0.4;
        p.line(20, 22, 20 + Math.cos(t) * 30, 22 + Math.sin(t) * 30, a < 3 ? 'd' : 'R', 2);
      }
      p.layer((q) => {
        q.ellipse(20, 22, 10, 11, 'R', (x, y) => y < 22 && x >= 20);
        q.ellipse(20, 22, 10, 11, 'd', (x, y) => y < 22 && x < 20);
        q.ellipse(16, 16, 2.5, 3.5, 'a', (x, y) => y < 22);
        q.rect(8, 22, 24, 5, 'j'); q.rect(6, 27, 28, 4, 'K');
      }, 'K');
    },
  },

  // ---------------- Jeux vidéo ----------------
  {
    id: 'xl-jv-plateformes', name: 'Monde de plateformes', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'b', 'a');
      Deco.cloud(p, 6, 5, 1); Deco.cloud(p, 44, 8, 0.8);
      p.layer((q) => { q.ellipse(12, 40, 12, 9, 'G'); q.disc(9, 36, 1, 'H'); q.disc(14, 38, 1, 'H'); }, 'K');
      Obj2.bricks(p, 0, 40, 64, 8);
      Obj2.bricks(p, 30, 16, 5, 5); Obj2.qblock(p, 35, 16); Obj2.bricks(p, 40, 16, 5, 5); Obj2.qblock(p, 24, 16);
      Obj2.pipe(p, 50, 40, 9);
      [[37.5, 10], [26.5, 10]].forEach(([x, y]) => p.layer((q) => q.ellipse(x, y, 1.6, 2.4, 'Y'), 'k'));
      Obj2.goomba(p, 42, 40, 1);
      Obj2.plumber(p, 18, 34, 1.1);
    },
  },
  {
    id: 'xl-jv-sonic', name: 'Sonic dans les collines', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      p.layer((q) => { q.ellipse(50, 30, 12, 12, 'G'); q.ellipse(50, 30, 8, 8, '.'); }, 'K');
      p.layer((q) => { q.rect(0, 36, 64, 12, 'B'); for (let y = 38; y < 48; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 64; x += 8) q.rect(x, y, 4, 4, 'k'); q.rect(0, 34, 64, 3, 'G'); }, 'K');
      Deco.palm(p, 8, 34, 1);
      [[24, 14], [30, 11], [36, 10], [42, 11]].forEach(([x, y]) => Obj2.ring(p, x, y));
      Obj2.sonic(p, 30, 34, 1.05);
    },
  },
  {
    id: 'xl-jv-kirby', name: 'Kirby et son étoile', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'v', 'b', 'a');
      Deco.cloud(p, 4, 34, 1.3); Deco.cloud(p, 44, 38, 1.2); Deco.cloud(p, 48, 6, 0.8);
      Obj2.warpStar(p, 36, 30, 1.3);
      Obj2.kirby(p, 36, 15, 1);
    },
  },
  {
    id: 'xl-jv-pacman', name: 'Labyrinthe Pac-Man', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      p.fill('K');
      const walls = [[0, 0, 64, 2], [0, 46, 64, 2], [0, 0, 2, 48], [62, 0, 2, 48], [8, 8, 14, 3], [42, 8, 14, 3], [27, 6, 10, 6], [8, 18, 3, 12], [53, 18, 3, 12], [18, 20, 28, 3], [30, 23, 4, 8], [8, 37, 18, 3], [38, 37, 18, 3]];
      walls.forEach(([x, y, w, h]) => p.layer((q) => q.rect(x, y, w, h, 'e'), 'd'));
      for (let y = 5; y < 46; y += 4) for (let x = 5; x < 62; x += 4) if (p.get(x, y) === 'K' && p.get(x + 1, y) === 'K') p.set(x, y, 'p');
      [[5, 5], [58, 5], [5, 42], [58, 42]].forEach(([x, y]) => p.disc(x + 0.5, y + 0.5, 1.6, 'p'));
      p.layer((q) => { q.disc(14, 33, 4.5, 'Y'); q.poly([[14, 33], [20, 29], [20, 37]], '.'); q.set(14, 30, 'K'); });
      [['R', 36], ['P', 44], ['C', 52]].forEach(([c, x]) => p.layer((q) => {
        q.ellipse(x, 30, 3.6, 3.6, c, (i, j) => j < 30); q.rect(x - 3.6, 30, 7.2, 3.5, c);
        q.rect(x - 2.5, 28.5, 2, 2, 'W'); q.rect(x + 0.6, 28.5, 2, 2, 'W'); q.set(x - 1.5, 29.5, 'd').set(x + 1.6, 29.5, 'd');
      }));
    },
  },
  {
    id: 'xl-jv-amongus', name: "L'équipage", cat: 'jeux', w: 64, h: 48,
    draw(p) {
      p.fill('i');
      p.rect(0, 0, 64, 20, 'j');
      p.layer((q) => { q.rect(8, 4, 20, 10, 'f'); q.rect(36, 4, 20, 10, 'f'); q.stars('W', 0.12, (x, y) => q.get(x, y) === 'f'); }, 'K');
      p.rect(0, 20, 64, 2, 'K');
      for (let x = 0; x < 64; x += 8) p.rect(x, 22, 1, 26, 'h');
      [[10, 'R'], [24, 'd'], [38, 'G'], [52, 'Y']].forEach(([x, c], i) => Obj2.crewmate(p, x, 44 - (i % 2) * 3, 1.05, c, i > 1));
    },
  },
  {
    id: 'xl-jv-bus', name: 'Le bus de combat', cat: 'jeux', w: 48, h: 64,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.4, 0.7);
      Deco.cloud(p, 2, 40, 1); Deco.cloud(p, 34, 46, 0.9);
      p.layer((q) => { q.ellipse(24, 66, 26, 10, 'G'); q.ellipse(24, 60, 22, 4, 'p', (i, j) => j > 58); }, 'K');
      Obj2.bus(p, 24, 34, 1.15);
    },
  },
  {
    id: 'xl-jv-link', name: "L'aventure de Link", cat: 'jeux', w: 48, h: 64,
    draw(p) {
      Deco.sky(p);
      Deco.mountains(p, 40, [[10, 14, 12], [38, 18, 14]]);
      Deco.tree(p, 6, 44, 1); Deco.tree(p, 42, 44, 1.1);
      Deco.grass(p, 42);
      Obj2.link(p, 24, 60, 1.4);
    },
  },
  {
    id: 'xl-jv-oiseaux', name: 'Oiseaux en colère', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'a', 'a');
      Deco.cloud(p, 26, 5, 1);
      Deco.grass(p, 40, false);
      p.layer((q) => { q.line(10, 40, 10, 30, 'B', 2); q.line(10, 31, 6, 24, 'B', 1.8); q.line(10, 31, 14, 24, 'B', 1.8); }, 'K');
      p.layer((q) => { q.rect(42, 30, 3, 10, 'o'); q.rect(54, 30, 3, 10, 'o'); q.rect(40, 27, 19, 3, 'B'); q.rect(46, 18, 3, 9, 'o'); q.rect(50, 18, 3, 9, 'o'); q.rect(44, 15, 11, 3, 'B'); }, 'K');
      Obj2.pig(p, 49.5, 35, 3.6); Obj2.pig(p, 49.5, 11, 3);
      Obj2.angryBird(p, 22, 16, 1.15);
      Obj2.angryBird(p, 6, 20, 0.6);
    },
  },
  {
    id: 'xl-jv-yoshi', name: 'Les œufs de Yoshi', cat: 'jeux', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 8, 8, 4);
      Deco.hills(p, 30, 'l');
      Deco.grass(p, 32);
      p.layer((q) => { q.ellipse(32, 42, 22, 5, 'o'); for (let x = 12; x < 53; x += 3) q.line(x, 39, x + 3, 45, 'B', 0.9); }, 'K');
      [[18, 'G'], [27, 'R'], [36, 'd'], [45, 'P']].forEach(([x, c], i) => Obj2.egg(p, x, 35 - (i % 2), 1.4, c));
      Obj2.egg(p, 32, 26, 1.2, 'Y');
    },
  },

  // ---------------- Pokémon ----------------
  {
    id: 'xl-pk-starters', name: 'Les trois amis', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 44, 5, 1);
      Deco.hills(p, 30, 'l');
      Deco.grass(p, 32);
      Obj2.bulbasaur(p, 13, 44, 1.05);
      Obj2.charmander(p, 32, 44, 1.05);
      Obj2.squirtle(p, 52, 44, 1.05, true);
    },
  },
  {
    id: 'xl-pk-salameche', name: 'Salamèche et le volcan', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'Q', 'O', 'y', 0.3, 0.6);
      Deco.volcano(p, 48, 40, 16, 18);
      p.rect(0, 40, 64, 8, 'n');
      Obj2.charmander(p, 22, 46, 1.6);
    },
  },
  {
    id: 'xl-pk-carapuce', name: 'Carapuce à la plage', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.25, 0.45);
      Deco.sun(p, 56, 6, 3.5);
      Obj.waves(p, 20);
      p.layer((q) => { q.ellipse(32, 52, 46, 22, 'p'); }, 'o');
      Deco.palm(p, 54, 40, 1.1);
      Obj2.squirtle(p, 26, 46, 1.6);
    },
  },
  {
    id: 'xl-pk-bulbizarre', name: 'Bulbizarre dans la forêt', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'a', 'a');
      [6, 18, 46, 58].forEach((x, i) => Deco.tree(p, x, 34, 1 + (i % 2) * 0.2));
      Deco.grass(p, 34);
      Obj2.bulbasaur(p, 32, 46, 1.7);
    },
  },
  {
    id: 'xl-pk-ronflex', name: 'Ronflex fait la sieste', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.tree(p, 54, 38, 1.4);
      Deco.grass(p, 38);
      text(p, 44, 4, 'Z', 'W', 2); text(p, 50, 10, 'Z', 'W', 1); text(p, 39, 12, 'Z', 'W', 1);
      Obj2.snorlax(p, 26, 46, 1.15);
    },
  },
  {
    id: 'xl-pk-rondoudou', name: 'Rondoudou chante', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      p.fill('V');
      p.layer((q) => { q.poly([[0, 0], [14, 0], [8, 40], [0, 40]], 'R'); q.poly([[64, 0], [50, 0], [56, 40], [64, 40]], 'R'); });
      p.layer((q) => q.poly([[26, 0], [38, 0], [50, 44], [14, 44]], 'v'));
      p.rect(0, 40, 64, 8, 'B');
      [[12, 10], [46, 8], [52, 22], [16, 24]].forEach(([x, y]) => text(p, x, y, '♪', 'Y', 1));
      Obj2.jigglypuff(p, 32, 26, 1.45);
    },
  },
  {
    id: 'xl-pk-evoli', name: 'Évoli dans les fleurs', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 8, 8, 4);
      Deco.grass(p, 34, false);
      for (let i = 0; i < 12; i++) {
        const x = 4 + i * 5.3, y = 37 + (i * 7) % 9;
        p.layer((q) => { q.disc(x, y, 1.6, i % 3 === 0 ? 'P' : i % 3 === 1 ? 'Y' : 'v'); }, 'K');
      }
      Obj2.eevee(p, 32, 44, 1.35);
    },
  },
  {
    id: 'xl-pk-magicarpe', name: 'Magicarpe saute', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 6, 6, 1);
      Deco.mountains(p, 30, [[50, 14, 14]]);
      Obj.waves(p, 32);
      p.layer((q) => { [[22, 32], [42, 32], [28, 30], [36, 30]].forEach(([x, y]) => q.ellipse(x, y, 2, 3, 'W')); }, 'd');
      Obj2.magikarp(p, 32, 18, 1.25);
    },
  },
  {
    id: 'xl-pk-surf', name: 'Pikachu surfe', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.3, 0.55);
      Deco.sun(p, 54, 7, 3.5);
      p.layer((q) => { q.ellipse(10, 36, 18, 16, 'E'); q.ellipse(8, 22, 6, 3, 'W'); }, 'd');
      Obj.waves(p, 38);
      p.layer((q) => { q.ellipse(34, 37, 16, 2.4, 'Y'); q.line(19, 37, 49, 37, 'R', 0.9); }, 'K');
      Obj.pika(p, 34, 16, 0.95);
    },
  },
  {
    id: 'xl-pk-mew', name: 'Mew dans sa bulle', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'v', 'b', 'a');
      Deco.cloud(p, 4, 36, 1.2); Deco.cloud(p, 46, 40, 1.1);
      p.layer((q) => q.disc(32, 22, 15, 'a'), 'W');
      p.disc(26, 14, 2, 'W');
      Obj2.mew(p, 32, 24, 1.3);
    },
  },
  {
    id: 'xl-pk-psykokwak', name: 'Psykokwak au lac', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.tree(p, 8, 34, 1.1);
      Deco.grass(p, 34, true);
      p.layer((q) => q.ellipse(44, 40, 20, 7, 'E'), 'd');
      [[56, 36], [60, 38]].forEach(([x, y]) => p.layer((q) => { q.line(x, y, x, y - 9, 'H', 1); q.ellipse(x, y - 9, 0.8, 1.8, 'B'); }, 'K'));
      Obj2.psyduck(p, 24, 46, 1.35);
    },
  },
  {
    id: 'xl-pk-dresseur', name: 'Le dresseur', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 26, 4, 1);
      Deco.hills(p, 32, 'l');
      Deco.grass(p, 34);
      Obj2.kid(p, 18, 46, 1.25);
      Obj.pokeball(p, 34, 12, 3.4);
      Obj.pika(p, 48, 26, 0.75, true);
    },
  },
];

const SCENE2_SHADER = makeShader(PAL2, { ground: GROUND });
const SCENE2_SHARED = SCENE_SHARED + Object.values(Obj2).join('') + text.toString() + JSON.stringify(FONT) + JSON.stringify(PAL2);
renderDefs(SCENE2_DEFS, 'scenes2', (i) => i * 733 + 29, SCENE2_SHARED, () => SCENE2_SHADER).forEach((rows, i) => {
  const d = SCENE2_DEFS[i];
  GAME_ART.push({ id: d.id, name: d.name, cat: d.cat, colors: PAL2, rows });
});
