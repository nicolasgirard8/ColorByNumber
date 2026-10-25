// Grands dessins « plein écran » : décors et personnages réutilisables, assemblés en scènes.
// Toutes les scènes partagent la même palette ; les couleurs inutilisées sont retirées ensuite.
'use strict';

const PAL = {
  a: '#bfe6ff', b: '#8fd0f8', c: '#5bb4ee', d: '#2f7de1', e: '#1d3f8a', f: '#141a3a', g: '#2c3670',
  W: '#ffffff', h: '#d9dee6', i: '#a3acb9', j: '#5c6370', K: '#1b1b22',
  G: '#5cc25a', H: '#2f8a3a', l: '#a6e48a', m: '#3fb39a', X: '#c6f04a',
  B: '#8b5a2b', n: '#5e3a1a', o: '#d8a86a', p: '#f2d49b',
  R: '#e8303a', r: '#a51d28', O: '#ff8a1f', Y: '#ffd93b', y: '#fff3a0', Z: '#f2b630', L: '#ff4a1a',
  P: '#ff8fb8', Q: '#d94485', V: '#8a4fd1', v: '#c9a6f5',
  S: '#ffcfa3', s: '#e8a878', C: '#4fd8f0', E: '#2aa0d8', F: '#16679e', N: '#6a8fb8', k: '#c96a14',
};

// Repère local : dessine un objet à la position (ox, oy), agrandi de k, éventuellement retourné.
function at(p, ox, oy, k = 1, flip = false) {
  const X = (x) => (flip ? ox - x * k : ox + x * k);
  const Y = (y) => oy + y * k;
  const T = (t) => Math.max(0.9, t * k);
  return {
    R(x, y, w, h, c) { const a = X(x), b = X(x + w); p.frect(Math.min(a, b), Y(y), Math.abs(b - a), h * k, c); },
    E(x, y, rx, ry, c, keep) { p.ellipse(X(x), Y(y), rx * k, ry * k, c, keep && ((i, j) => keep((flip ? ox - i - 0.5 : i + 0.5 - ox) / k, (j + 0.5 - oy) / k))); },
    D(x, y, r, c) { p.ellipse(X(x), Y(y), r * k, r * k, c); },
    L(x0, y0, x1, y1, c, t = 1) { p.line(X(x0), Y(y0), X(x1), Y(y1), c, T(t)); },
    PG(pts, c) { p.poly(pts.map(([x, y]) => [X(x), Y(y)]), c); },
    PATH(pts, c, t = 1) { p.path(pts.map(([x, y]) => [X(x), Y(y)]), c, T(t)); },
  };
}

// ---------- Décors ----------
const Deco = {
  sky(p, top = 'c', mid = 'b', low = 'a', y1 = 0.3, y2 = 0.62) {
    const a = Math.round(p.h * y1), b = Math.round(p.h * y2);
    p.rect(0, 0, p.w, a, top);
    p.rect(0, a, p.w, b - a, mid);
    p.rect(0, b, p.w, p.h, low);
  },
  sunset(p) { Deco.sky(p, 'V', 'Q', 'O', 0.25, 0.5); },
  night(p) { p.fill('f'); p.rect(0, Math.round(p.h * 0.55), p.w, p.h, 'g'); p.stars('W', 0.025, (x, y) => y < p.h * 0.6); },
  space(p) { p.fill('f'); p.stars('W', 0.03); p.stars('y', 0.01); },
  sea(p, surface = 0) {
    p.rect(0, surface, p.w, p.h, 'E');
    p.rect(0, Math.round(surface + (p.h - surface) * 0.45), p.w, p.h, 'F');
  },
  sun(p, x, y, r) {
    const o = at(p, x, y);
    for (let a = 0; a < 8; a++) {
      const t = (a * Math.PI) / 4;
      o.L(Math.cos(t) * (r + 1), Math.sin(t) * (r + 1), Math.cos(t) * (r + 3.5), Math.sin(t) * (r + 3.5), 'O', 1.6);
    }
    o.D(0, 0, r, 'Y');
  },
  moon(p, x, y, r, bg) { p.disc(x, y, r, 'y'); p.disc(x + r * 0.45, y - r * 0.3, r * 0.8, bg); },
  cloud(p, x, y, s = 1) {
    p.layer((q) => {
      const o = at(q, x, y, s);
      o.E(0, 0, 3.2, 2.2, 'W'); o.E(3, -1.2, 3.4, 2.8, 'W'); o.E(6.2, 0, 3.2, 2.2, 'W'); o.R(-1, 0, 8.5, 2.2, 'W');
    }, 'h');
  },
  mountains(p, base, peaks) {
    peaks.forEach(([x, hgt, wid]) => {
      p.poly([[x - wid, base], [x, base - hgt], [x + wid, base]], 'i');
      p.poly([[x - wid * 0.28, base - hgt * 0.72], [x, base - hgt], [x + wid * 0.28, base - hgt * 0.72], [x + wid * 0.1, base - hgt * 0.64], [x - wid * 0.08, base - hgt * 0.68]], 'W');
    });
  },
  hills(p, base, color = 'H') {
    for (let x = -6; x < p.w + 6; x += 14) p.ellipse(x + 7, base, 11, 6, color);
  },
  grass(p, top, flowers = true) {
    p.rect(0, top, p.w, p.h, 'G');
    for (let x = 1; x < p.w; x += 3) p.set(x, top + 1 + ((x * 7) % 5), 'H');
    if (flowers) for (let x = 3; x < p.w; x += 9) { const y = top + 3 + ((x * 5) % (p.h - top - 4 || 1)); p.set(x, y, x % 2 ? 'Y' : 'P'); }
  },
  road(p, top, hgt = 8) {
    p.rect(0, top, p.w, hgt, 'j');
    for (let x = 1; x < p.w; x += 6) p.rect(x, top + Math.floor(hgt / 2), 3, 1, 'W');
  },
  tree(p, x, base, s = 1) {
    p.layer((q) => {
      const o = at(q, x, base, s);
      o.R(-1, -7, 2.4, 7, 'B');
      o.D(0, -10, 5, 'G'); o.D(-3.5, -8, 3.5, 'G'); o.D(3.5, -8, 3.5, 'G');
      o.D(-1.5, -11.5, 2, 'l');
    }, 'K');
  },
  palm(p, x, base, s = 1) {
    p.layer((q) => {
      const o = at(q, x, base, s);
      o.PATH([[0, 0], [1, -6], [2.5, -12]], 'B', 2);
      [[-7, -10], [-6, -15], [3, -18], [9, -13], [8, -9]].forEach(([dx, dy]) => o.PATH([[2.5, -12], [(2.5 + dx) / 2 + 0.5, -13 + dy / 6 - 2], [dx, dy]], 'G', 1.8));
    }, 'K');
  },
  volcano(p, x, base, wid, hgt, erupt = true) {
    p.layer((q) => {
      q.poly([[x - wid, base], [x - wid * 0.18, base - hgt], [x + wid * 0.18, base - hgt], [x + wid, base]], 'n');
      q.poly([[x - wid * 0.18, base - hgt], [x + wid * 0.18, base - hgt], [x + wid * 0.1, base - hgt + 3], [x, base - hgt + 1.5], [x - wid * 0.12, base - hgt + 4]], 'L');
      q.path([[x + 1, base - hgt + 2], [x + 3, base - hgt * 0.6], [x + 2, base - hgt * 0.3]], 'O', 1.6);
      if (erupt) {
        [[-5, -7], [0, -9], [5, -7]].forEach(([dx, dy]) => q.line(x, base - hgt, x + dx, base - hgt + dy, 'O', 2));
        q.disc(x - 6, base - hgt - 9, 2.5, 'j'); q.disc(x + 6, base - hgt - 10, 3, 'j'); q.disc(x, base - hgt - 12, 3.2, 'j');
      }
    }, 'K');
  },
  bubbles(p, list) { list.forEach(([x, y, r]) => p.layer((q) => q.disc(x, y, r, 'a'), 'W')); },
  seaweed(p, x, base, hgt) {
    p.layer((q) => { for (let y = 0; y < hgt; y += 1) q.set(Math.round(x + Math.sin(y / 2) * 1.2), base - y, 'H').set(Math.round(x + 1 + Math.sin(y / 2) * 1.2), base - y, 'H'); }, 'K');
  },
  city(p, base) {
    const blocks = [[0, 14, 7], [8, 22, 8], [17, 11, 6], [24, 26, 9], [34, 16, 7], [42, 20, 8], [51, 12, 6], [58, 24, 8]];
    blocks.forEach(([x, hgt, wid]) => {
      if (x >= p.w) return;
      p.layer((q) => {
        q.rect(x, base - hgt, wid, hgt, 'g');
        for (let yy = base - hgt + 2; yy < base - 2; yy += 3) for (let xx = x + 1; xx < x + wid - 1; xx += 2) q.set(xx, yy, (xx + yy) % 3 ? 'y' : 'j');
      }, 'K');
    });
  },
};

// ---------- Personnages et objets (repère local, regard vers la droite) ----------
const Obj = {
  wheel(p, x, y, r) { p.disc(x, y, r, 'K'); p.disc(x, y, r * 0.55, 'h'); p.disc(x, y, r * 0.2, 'j'); },

  trex(p, x, y, k = 1, flip = false, body = 'G', belly = 'X') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[2, 9], [-14, 2], [-15, 3.5], [4, 15]], body);
      o.PG([[9, 14], [12, 23], [10, 27], [15, 27], [16, 22], [14, 14]], body);
      o.E(6, 11, 9, 6.5, body);
      o.E(7, 13.5, 6, 3.4, belly);
      o.PG([[9, 7], [12, -1], [17, 0], [15, 9]], body);
      o.E(18, -1, 6.5, 4.2, body);
      o.PG([[16, 1], [26, 1], [25, 4.5], [17, 5]], body);
      o.PG([[17, 1.2], [25.5, 1.2], [25, 2.2], [17, 2.4]], 'R');
      for (let t = 18; t < 25.5; t += 2) o.PG([[t, 1.2], [t + 1.2, 1.2], [t + 0.6, 2.6]], 'W');
      o.D(18.5, -2.5, 1.5, 'W'); o.D(19, -2.3, 0.8, 'K');
      o.L(14, 11, 17, 13.5, body, 1.4); o.L(17, 13.5, 18.5, 13, body, 1);
      o.PG([[1, 12], [3, 21], [1, 27], [6, 27], [7, 20], [6, 13]], body);
      [[-6, 5], [0, 8], [5, 7]].forEach(([sx, sy]) => o.D(sx, sy, 1.1, belly));
    }, 'K');
  },
  triceratops(p, x, y, k = 1, flip = false, body = 'O', frill = 'Y') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-8, 7], [-20, 10], [-8, 12]], body);
      o.E(0, 8, 11, 7, body);
      [[-7, 12], [-2, 12], [4, 12], [8, 11]].forEach(([lx, ly]) => o.R(lx, ly, 3.4, 8, body));
      o.E(14, 2, 6.5, 8.5, frill);
      o.E(16, 7, 6, 4.2, body);
      o.PG([[20, 6], [25, 8], [20, 10]], 'o');
      o.PG([[14, 3.5], [21, -4], [16.5, 4.5]], 'W'); o.PG([[21, 5], [24, 1.5], [22.5, 6]], 'W');
      o.D(17, 5.5, 1.1, 'K');
      [[9, -3], [12, -6], [16, -6], [19, -3]].forEach(([sx, sy]) => o.D(sx, sy, 0.9, 'R'));
      [[-4, 4], [2, 3], [-1, 8]].forEach(([sx, sy]) => o.D(sx, sy, 1.3, 'k'));
    }, 'K');
  },
  brachio(p, x, y, k = 1, flip = false, body = 'N', belly = 'a') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PATH([[-10, 30], [-20, 34], [-27, 33]], body, 3);
      o.E(-2, 30, 12, 8, body);
      o.E(-2, 33, 8, 4, belly);
      [[-11, 34], [-5, 35], [3, 35], [8, 34]].forEach(([lx, ly]) => o.R(lx, ly, 3.6, 10, body));
      o.PATH([[6, 26], [12, 14], [15, 2]], body, 5);
      o.E(18, 0, 5, 3, body);
      o.D(19, -1, 0.9, 'K');
      o.L(20, 1.5, 22.5, 1.2, 'K', 0.8);
      [[-6, 27], [0, 26], [-3, 30]].forEach(([sx, sy]) => o.D(sx, sy, 1.4, 'e'));
    }, 'K');
  },
  stego(p, x, y, k = 1, flip = false, body = 'm', plates = 'O') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      for (let i = 0; i < 7; i++) {
        const px = -12 + i * 4, py = 2 - Math.sin((i / 6) * Math.PI) * 5;
        o.PG([[px - 2, py + 5], [px, py - 2], [px + 2, py + 5]], plates);
      }
      o.PATH([[-12, 7], [-20, 9], [-26, 7]], body, 3);
      o.L(-25, 6, -28, 2, 'W', 1.2); o.L(-24, 6, -26, 2, 'W', 1.2);
      o.E(0, 8, 13, 6.5, body);
      [[-9, 12], [-4, 12], [4, 12], [8, 11]].forEach(([lx, ly]) => o.R(lx, ly, 3.2, 7, body));
      o.E(15, 10, 4.5, 3, body);
      o.D(16, 9, 0.9, 'K');
      o.L(12, 12, 6, 11, body, 2);
    }, 'K');
  },
  ptero(p, x, y, k = 1, flip = false, body = 'k') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      // Deux ailes déployées : membrane claire tendue sur l'os du bras.
      [-1, 1].forEach((side) => {
        const X = (v) => v * side;
        o.PG([[X(1), -1], [X(7), -6], [X(15), -5], [X(12), -2.5], [X(14), 0.5], [X(9), 0.5], [X(2), 2.5]], 'o');
        o.PATH([[X(1), -1], [X(7), -6], [X(15), -5]], body, 1);
      });
      o.E(0, 1.5, 2.4, 4.2, body);
      o.E(0.4, 2.4, 1.3, 2.6, 'p');
      o.L(-0.8, 5.5, -1.6, 7.5, 'Y', 0.8); o.L(0.8, 5.5, 1.6, 7.5, 'Y', 0.8);
      o.PG([[0.5, -4.8], [-6, -8.5], [1.5, -6.5]], body);
      o.E(2.6, -4.6, 2.8, 2.1, body);
      o.PG([[4.2, -5.4], [11.5, -3.8], [4.2, -3.2]], 'Y');
      o.D(3.1, -5.1, 0.75, 'W'); o.D(3.35, -5.1, 0.38, 'K');
    }, 'K');
  },
  fireTruck(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.R(0, 4, 26, 10, 'R'); o.PG([[26, 14], [26, 0], [33, 0], [37, 6], [37, 14]], 'R');
      o.PG([[28, 2], [32.5, 2], [35, 6], [28, 6]], 'a');
      o.R(0, 9, 37, 1.5, 'Y');
      o.R(1, 0, 22, 1.2, 'h'); o.R(1, 2.6, 22, 1.2, 'h');
      for (let i = 2; i < 23; i += 3) o.R(i, 0, 1, 3.8, 'h');
      o.R(29, -1.6, 2, 1.6, 'd'); o.R(31, -1.6, 2, 1.6, 'R');
      o.R(3, 5.5, 6, 3, 'h'); o.R(11, 5.5, 6, 3, 'h');
      o.R(37, 10.5, 1.6, 2.5, 'Y');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [6, 18, 31].forEach((wx) => { o.D(wx, 14, 3.4, 'K'); o.D(wx, 14, 1.8, 'h'); o.D(wx, 14, 0.7, 'j'); });
  },
  policeCar(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 6], [2, 4], [7, 3.5], [10, -1], [21, -1], [25, 3.5], [31, 4], [33, 6], [33, 11], [0, 11]], 'W');
      o.R(0, 7, 33, 4, 'e');
      o.PG([[11, 0], [15, 0], [15, 3.5], [8.5, 3.5]], 'a'); o.PG([[16.5, 0], [20.5, 0], [23.5, 3.5], [16.5, 3.5]], 'a');
      o.R(13, -2.8, 3, 1.8, 'd'); o.R(16, -2.8, 3, 1.8, 'R');
      o.PG([[16, 4.5], [17, 6.5], [19, 6.5], [17.5, 7.6], [18, 9.6], [16, 8.4], [14, 9.6], [14.5, 7.6], [13, 6.5], [15, 6.5]], 'Y');
      o.R(31.5, 5, 1.5, 1.5, 'y'); o.R(0, 5, 1.2, 1.5, 'R');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [7, 26].forEach((wx) => { o.D(wx, 11, 3.2, 'K'); o.D(wx, 11, 1.7, 'h'); });
  },
  raceCar(p, x, y, k = 1, flip = false, body = 'R', num = '7') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 2], [5, 2], [5, 5], [36, 7], [38, 10], [0, 10]], body);
      o.R(0, -2, 5, 2.4, 'K'); o.R(2, 0, 1.4, 2.4, 'K');
      o.E(18, 4.5, 5, 3.5, 'a', (i, j) => j < 5);
      o.D(18, 3, 1.6, 'Y');
      o.D(12, 7, 2.6, 'W');
      o.R(5, 8.6, 30, 1, 'W');
    }, 'K');
    const o = at(p, x, y, k, flip);
    o.D(7, 10, 4, 'K'); o.D(7, 10, 2, 'h'); o.D(31, 10, 3.4, 'K'); o.D(31, 10, 1.7, 'h');
    const n = { 7: ['KKK', '..K', '.K.', '.K.'], 1: ['.K', 'KK', '.K', '.K'] }[num];
    const c = at(p, x, y, k, flip);
    if (n && k >= 1) n.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'K') c.R(11 + i * 0.8 - (flip ? 0.8 : 0), 5.4 + j * 0.8, 0.8, 0.8, 'K'); }));
  },
  monsterTruck(p, x, y, k = 1, flip = false, body = 'V') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 6], [14, 6], [16, 0], [27, 0], [30, 5], [36, 6], [36, 12], [0, 12]], body);
      o.PG([[17, 1.5], [22, 1.5], [22, 5], [16, 5]], 'a'); o.PG([[23.5, 1.5], [26.5, 1.5], [28.5, 5], [23.5, 5]], 'a');
      o.PG([[2, 7], [8, 9], [2, 11]], 'O'); o.PG([[8, 7], [14, 9], [8, 11]], 'O');
      o.R(35, 7, 1.4, 2, 'y');
      o.L(8, 12, 8, 16, 'j', 1.6); o.L(28, 12, 28, 16, 'j', 1.6);
    }, 'K');
    const o = at(p, x, y, k, flip);
    [8, 28].forEach((wx) => {
      o.D(wx, 19, 7.2, 'K');
      for (let a = 0; a < 12; a++) { const t = (a * Math.PI) / 6; o.D(wx + Math.cos(t) * 6.4, 19 + Math.sin(t) * 6.4, 0.9, 'j'); }
      o.D(wx, 19, 3.6, 'h'); o.D(wx, 19, 1.4, body);
    });
  },
  tractor(p, x, y, k = 1, flip = false, body = 'G') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.R(14, 6, 18, 8, body);
      o.PG([[32, 7], [32, 14], [36, 14], [36, 9]], body);
      o.R(2, -4, 13, 2, body); o.R(3, -2, 1.6, 8, 'K'); o.R(13, -2, 1.6, 8, 'K');
      o.R(5, 0, 7, 6, 'a');
      o.R(1, 6, 15, 8, body);
      o.R(26, -1, 2, 7, 'j'); o.D(27, -2.5, 1.6, 'h');
      o.R(16, 9, 14, 1.2, 'Y');
    }, 'K');
    const o = at(p, x, y, k, flip);
    o.D(8, 15, 7, 'K'); o.D(8, 15, 4, 'Y'); o.D(8, 15, 1.4, 'j');
    o.D(31, 17, 4, 'K'); o.D(31, 17, 2.2, 'Y');
  },
  excavator(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.R(0, 14, 26, 6, 'j');
      [3, 8, 13, 18, 23].forEach((wx) => o.D(wx, 17, 2, 'i'));
      o.R(2, 4, 20, 10, 'Y'); o.R(3, -3, 9, 8, 'Y');
      o.R(4.5, -1.5, 6, 5, 'a');
      o.R(16, 1, 2, 3, 'K');
      o.PATH([[19, 6], [30, -6], [38, 2]], 'Y', 3.4);
      o.PG([[36, 2], [42, 2], [40, 9], [35, 7]], 'j');
      for (let t = 36; t < 42; t += 2) o.PG([[t, 8], [t + 1, 8], [t + 0.5, 10]], 'h');
      o.R(2, 8, 20, 1, 'K');
    }, 'K');
  },
  dumpTruck(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 0], [22, 2], [22, 12], [2, 12]], 'O');
      o.R(1, 4, 20, 1, 'k'); o.R(1, 8, 20, 1, 'k');
      o.PG([[23, 1], [30, 1], [34, 6], [34, 13], [23, 13]], 'Y');
      o.PG([[25, 2.5], [29.5, 2.5], [32, 6], [25, 6]], 'a');
      o.R(0, 12, 34, 2, 'j');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [6, 15, 29].forEach((wx) => { o.D(wx, 15, 3.4, 'K'); o.D(wx, 15, 1.7, 'h'); });
  },
  train(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.R(18, -2, 12, 14, 'R'); o.R(17, -4, 14, 2, 'K');
      o.R(20, 0, 8, 5, 'a');
      o.R(30, 3, 16, 9, 'd'); o.E(46, 7.5, 2, 4.5, 'd');
      o.R(36, -3, 4, 6, 'K'); o.PG([[34.5, -6], [41.5, -6], [40, -3], [36, -3]], 'K');
      o.D(47.5, 7, 1.3, 'y');
      o.PG([[44, 12], [50, 12], [48, 15], [44, 15]], 'R');
      o.R(0, 1, 15, 11, 'G'); o.R(2, 3, 4, 4, 'a'); o.R(9, 3, 4, 4, 'a');
      o.R(15, 9, 3, 1, 'K');
      o.R(17, 8.5, 29, 1.4, 'Y');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [4, 11, 22, 33, 41].forEach((wx, i) => { const r = i === 2 ? 4 : 2.8; o.D(wx, 12 + (i === 2 ? 1 : 1.2), r, 'K'); o.D(wx, 12 + (i === 2 ? 1 : 1.2), r * 0.5, 'h'); });
    [[42, -9, 2.6], [38, -12, 3.2], [32, -15, 3.8]].forEach(([cx, cy, r]) => p.layer((q) => at(q, x, y, k, flip).D(cx, cy, r, 'h'), 'i'));
  },
  plane(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-1.5, 1], [7, 1], [2.5, -9], [-1.5, -9]], 'R');
      o.PG([[-1, 3], [5, 3], [0, 6]], 'h');
      o.PG([[12, 3], [24, 3], [12, 15]], 'h');
      o.E(16, 3, 18, 3.6, 'W');
      o.PG([[30, 0.5], [35.5, 2.5], [30, 3]], 'a');
      for (let wx = 6; wx < 28; wx += 3) o.D(wx, 2, 0.9, 'a');
      o.R(0, 4, 32, 1, 'R');
      o.PG([[12, 4], [22, 4], [10, -6]], 'i');
    }, 'K');
  },
  heli(p, x, y, k = 1, flip = false, body = 'O') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.L(-20, -2, 0, 1, body, 2.6);
      o.PG([[-22, -6], [-19, -6], [-18, -1], [-21, -1]], body);
      o.E(6, 2, 10, 7, body);
      o.E(10, 0, 5, 4, 'a', (i, j) => i > 6.5);
      o.R(4, -7, 2, 2.6, 'j'); o.R(-14, -6.5, 38, 1.4, 'K');
      o.L(-1, 9, -2, 12, 'j', 1); o.L(12, 9, 13, 12, 'j', 1); o.R(-5, 12, 22, 1.2, 'j');
      o.D(-22, -2, 2.8, 'i');
    }, 'K');
  },
  bus(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 0], [38, 0], [42, 4], [42, 15], [0, 15]], 'Y');
      for (let wx = 2; wx < 34; wx += 6) o.R(wx, 2, 4.5, 5, 'a');
      o.PG([[35, 2], [38, 2], [41, 6], [35, 6]], 'a');
      o.R(0, 9, 42, 1.2, 'K'); o.R(41, 11, 1.4, 2, 'y');
    }, 'K');
    const o = at(p, x, y, k, flip);
    [8, 33].forEach((wx) => { o.D(wx, 15, 3.4, 'K'); o.D(wx, 15, 1.7, 'h'); });
  },

  rocket(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-3, 22], [-9, 30], [-9, 33], [-3, 30]], 'R'); o.PG([[3, 22], [9, 30], [9, 33], [3, 30]], 'R');
      o.PG([[0, 0], [5, 8], [5.5, 30], [-5.5, 30], [-5, 8]], 'W');
      o.PG([[0, 0], [4, 6.5], [-4, 6.5]], 'R');
      o.D(0, 13, 3.4, 'j'); o.D(0, 13, 2.4, 'a');
      o.R(-5, 20, 11, 1.4, 'R');
      o.R(-1, 24, 2, 6, 'h');
    }, 'K');
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-4.5, 30], [4.5, 30], [2.5, 37], [0, 41], [-2.5, 37]], 'O');
      o.PG([[-2.5, 30], [2.5, 30], [1.2, 35], [0, 37], [-1.2, 35]], 'Y');
    });
  },
  astronaut(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.R(-7, 8, 3, 9, 'h');
      o.R(-4, 7, 9, 11, 'W');
      o.L(-4, 9, -8, 16, 'W', 3); o.L(5, 9, 10, 4, 'W', 3);
      o.R(-4, 17, 4, 7, 'W'); o.R(1, 17, 4, 7, 'W');
      o.R(-4.5, 23, 5, 2.5, 'j'); o.R(1, 23, 5, 2.5, 'j');
      o.D(0.5, 2, 6, 'W');
      o.E(1.5, 2, 4, 3.2, 'Z'); o.E(1, 1.5, 2.6, 2, 'y', (i, j) => i < 1 && j < 1.5);
      o.R(-2, 10, 4, 3, 'h'); o.R(-1.5, 10.5, 1, 1, 'R'); o.R(0.5, 10.5, 1, 1, 'd');
      o.L(10, 4, 10, -10, 'i', 0.8); o.R(10, -10, 7, 5, 'R'); o.R(10, -10, 7, 1.6, 'W'); o.R(10, -7, 7, 1.6, 'W');
    }, 'K');
  },
  ufo(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-5, 6], [5, 6], [11, 24], [-11, 24]], 'y');
    });
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.E(0, 0, 6, 5, 'a', (i, j) => j < 1);
      o.E(-1.5, -2, 1.6, 1.2, 'W');
      o.E(0, 3, 14, 4, 'h');
      o.E(0, 4.5, 9, 2.2, 'i');
      [-9, -3, 3, 9].forEach((lx) => o.D(lx, 3, 1.2, 'Y'));
    }, 'K');
  },
  alien(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.L(-2, -4, -4, -9, 'X', 0.9); o.L(2, -4, 4, -9, 'X', 0.9); o.D(-4, -9, 1.2, 'P'); o.D(4, -9, 1.2, 'P');
      o.E(0, 0, 5, 5, 'X');
      o.E(-2, -0.5, 1.5, 2, 'K'); o.E(2, -0.5, 1.5, 2, 'K'); o.D(-2.4, -1.2, 0.5, 'W'); o.D(1.6, -1.2, 0.5, 'W');
      o.L(-1.5, 2.5, 1.5, 2.5, 'H', 0.8);
      o.E(0, 8, 3.5, 4, 'X');
    }, 'K');
  },
  planet(p, x, y, r, body = 'O', band = 'k', ring = 'Y') {
    p.layer((q) => {
      q.ellipse(x, y, r * 2, r * 0.55, ring);
      q.ellipse(x, y, r * 1.55, r * 0.33, 'f');
    });
    p.layer((q) => {
      q.disc(x, y, r, body);
      q.swap(body, band, (i, j) => Math.floor((j - y + r) / (r / 3)) % 2 === 1);
      q.ellipse(x, y + r * 0.3, r * 2, r * 0.45, ring, (i, j) => j > y);
      q.ellipse(x, y + r * 0.3, r * 1.55, r * 0.25, body, (i, j) => j > y + r * 0.2 && Math.hypot(i + 0.5 - x, j + 0.5 - y) < r);
    }, 'K');
  },

  shark(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-14, 0], [-22, -7], [-20, 0], [-22, 7]], 'N');
      o.PG([[-2, -4], [2, -12], [6, -4]], 'N');
      o.E(0, 0, 16, 5.5, 'N');
      o.E(2, 2.5, 12, 3, 'W', (i, j) => j > 1);
      o.PG([[0, 3], [-3, 9], [4, 4]], 'N');
      o.D(10, -1.5, 1.2, 'K');
      o.PATH([[9, 3], [12, 3.5], [15, 2.5]], 'K', 0.8);
      [10.5, 12, 13.5].forEach((tx) => o.PG([[tx, 3], [tx + 1, 3], [tx + 0.5, 4.3]], 'W'));
      [4, 5.5, 7].forEach((gx) => o.L(gx, -1.5, gx - 0.6, 1.5, 'j', 0.6));
    }, 'K');
  },
  fish(p, x, y, k = 1, flip = false, body = 'Y', stripe = 'O') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-4, 0], [-8, -3.5], [-8, 3.5]], stripe);
      o.E(0, 0, 5, 3.5, body);
      o.L(-1, -3, -1, 3, stripe, 1.2);
      o.D(2.5, -0.8, 0.8, 'K');
    }, 'K');
  },
  octopus(p, x, y, k = 1, body = 'V', spots = 'v') {
    p.layer((q) => {
      const o = at(q, x, y, k);
      for (let i = 0; i < 6; i++) {
        const sx = -7.5 + i * 3;
        o.PATH([[sx, 6], [sx - 1.5 + (i % 2) * 3, 11], [sx + (i % 2 ? -1 : 1), 15], [sx + (i % 2 ? 2 : -2), 17]], body, 2.2);
      }
      o.E(0, 0, 9, 9, body);
      [[-4, -5], [3, -6], [5, -1]].forEach(([sx, sy]) => o.D(sx, sy, 1.3, spots));
      o.D(-3, 2, 2.2, 'W'); o.D(3, 2, 2.2, 'W'); o.D(-2.6, 2.4, 1.1, 'K'); o.D(3.4, 2.4, 1.1, 'K');
      o.PATH([[-1.5, 5.5], [0, 6.5], [1.5, 5.5]], 'K', 0.8);
    }, 'K');
  },
  submarine(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-17, 0], [-21, -4], [-21, 4]], 'O');
      o.R(-2, -11, 7, 6, 'Y'); o.L(2, -11, 2, -15, 'j', 1); o.R(2, -15, 4, 1.2, 'j');
      o.E(0, 0, 18, 6.5, 'Y');
      [-8, 0, 8].forEach((wx) => { o.D(wx, -0.5, 2.4, 'j'); o.D(wx, -0.5, 1.6, 'a'); });
      o.R(-14, 3.5, 28, 1, 'O');
    }, 'K');
  },
  turtle(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.E(-8, 5, 4, 2, 'l'); o.E(7, 5, 4, 2, 'l'); o.E(-7, -3, 3.5, 1.8, 'l'); o.E(7, -4, 3.5, 1.8, 'l');
      o.E(12, 0, 3.5, 2.8, 'l'); o.D(13, -0.8, 0.7, 'K');
      o.E(0, 0, 10, 6.5, 'H');
      [[-4, -2], [2, -3], [-1, 2.5], [5, 2]].forEach(([sx, sy]) => o.E(sx, sy, 2.4, 1.8, 'G'));
    }, 'K');
  },
  chest(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.R(-7, -2, 14, 8, 'B'); o.E(0, -2, 7, 4, 'B', (i, j) => j < 0);
      o.R(-7, -2, 14, 1.2, 'Z'); o.R(-1, -3, 2, 4, 'Z');
      [[-5, -5], [-2, -6.5], [2, -6], [5, -5]].forEach(([cx, cy]) => o.D(cx, cy, 1.2, 'Y'));
    }, 'K');
  },

  dragon(p, x, y, k = 1, flip = false, body = 'G', wing = 'H', belly = 'Y') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-4, 2], [-18, -14], [-12, -2], [-20, -6], [-10, 6]], wing);
      o.PATH([[-8, 10], [-18, 13], [-24, 9], [-28, 11]], body, 3);
      o.PG([[-28, 11], [-32, 8], [-31, 14]], 'R');
      o.E(-2, 9, 10, 6, body);
      o.E(-1, 11.5, 7, 3, belly);
      o.R(-8, 13, 3.4, 7, body); o.R(3, 13, 3.4, 7, body);
      o.PATH([[5, 6], [9, 0], [12, -3]], body, 4);
      o.E(15, -4, 5.5, 3.8, body);
      o.PG([[17, -3], [24, -2], [23, 0.5], [16, 0.5]], body);
      o.PG([[12, -7], [10, -12], [14, -7.5]], 'W'); o.PG([[15, -7.5], [15, -12.5], [17, -7.5]], 'W');
      o.D(16, -5, 1.2, 'Y'); o.D(16.3, -5, 0.6, 'K');
      for (let i = 0; i < 5; i++) o.PG([[-9 + i * 3.5, 3.5 - Math.sin(i / 4 * Math.PI) * 1.5], [-7.5 + i * 3.5, 0.5 - Math.sin(i / 4 * Math.PI) * 1.5], [-6 + i * 3.5, 3.5 - Math.sin(i / 4 * Math.PI) * 1.5]], 'R');
      o.PG([[2, 2], [10, -16], [16, -12], [8, 4]], wing);
      o.L(3, 2, 10, -16, 'n', 0.8);
    }, 'K');
  },
  fire(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[0, 0], [8, -4], [16, -2], [20, 1], [16, 4], [8, 5]], 'O');
      o.PG([[2, 0.5], [9, -2], [15, 0], [9, 3]], 'Y');
    });
  },
  castle(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.R(-12, -16, 24, 16, 'i');
      for (let cx = -12; cx < 12; cx += 4) o.R(cx, -18, 2, 2, 'i');
      [[-18, -26], [12, -26]].forEach(([tx, ty]) => {
        o.R(tx, ty, 6, -ty, 'h');
        o.PG([[tx - 1, ty], [tx + 3, ty - 8], [tx + 7, ty]], 'V');
        o.L(tx + 3, ty - 8, tx + 3, ty - 12, 'K', 0.7); o.PG([[tx + 3, ty - 12], [tx + 7, ty - 11], [tx + 3, ty - 10]], 'R');
        o.R(tx + 2, ty + 5, 2, 3, 'K');
      });
      o.E(0, -7, 4, 4, 'B', (i, j) => j < -7); o.R(-4, -7, 8, 7, 'B');
      o.L(0, -11, 0, 0, 'n', 0.7);
      o.R(-8, -12, 2, 3, 'K'); o.R(6, -12, 2, 3, 'K');
    }, 'K');
  },
  knight(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PATH([[0, -6], [-3, -10], [-6, -9]], 'R', 2);
      o.R(-4, 4, 3, 8, 'i'); o.R(1, 4, 3, 8, 'i');
      o.R(-5, -2, 10, 7, 'h');
      o.R(-3.5, -1, 7, 1.2, 'd');
      o.E(0, -5, 4, 4.2, 'h');
      o.R(-2.5, -5.5, 5, 1, 'K');
      o.L(5, 0, 11, -12, 'h', 1.2); o.L(4, -1.5, 7.5, 0.5, 'Z', 1.2);
      o.PG([[-9, -3], [-3, -3], [-3, 3], [-6, 6], [-9, 3]], 'd');
      o.L(-6, -2, -6, 4, 'Y', 1); o.L(-8.5, 0, -3.5, 0, 'Y', 1);
    }, 'K');
  },
  robot(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.L(0, -14, 0, -18, 'j', 0.9); o.D(0, -18.5, 1.4, 'R');
      o.R(-6, -14, 12, 9, 'h');
      o.D(-2.8, -10, 1.8, 'C'); o.D(2.8, -10, 1.8, 'C');
      o.R(-3, -7, 6, 1, 'j');
      o.R(-8, -9.5, 2, 3, 'i'); o.R(6, -9.5, 2, 3, 'i');
      o.R(-2, -5, 4, 2, 'j');
      o.R(-8, -3, 16, 13, 'i');
      o.R(-5, -1, 10, 7, 'h');
      o.D(-3, 2, 1.1, 'R'); o.D(0, 2, 1.1, 'Y'); o.D(3, 2, 1.1, 'G');
      o.R(-12, -2, 4, 9, 'h'); o.R(8, -2, 4, 9, 'h');
      o.D(-10, 8, 2, 'j'); o.D(10, 8, 2, 'j');
      o.R(-6, 10, 4, 8, 'h'); o.R(2, 10, 4, 8, 'h');
      o.R(-7, 17, 6, 2.5, 'j'); o.R(1, 17, 6, 2.5, 'j');
    }, 'K');
  },
  hero(p, x, y, k = 1, flip = false, suit = 'd', cape = 'R') {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      // Cape qui flotte derrière, jambes tendues, poing en avant.
      o.PG([[-2, -2.5], [-14, -1], [-23, 1.5], [-20, 4], [-23, 7], [-17, 8], [-3, 4.5]], cape);
      o.L(-4, 2.2, -14, 3, suit, 2.8); o.L(-4, 4, -13, 6.5, suit, 2.8);
      o.D(-14.6, 3, 1.6, cape); o.D(-13.6, 6.6, 1.6, cape);
      o.E(0, 2.6, 6.2, 3.4, suit);
      o.R(-3.6, 1.2, 1.2, 3, 'Y');
      o.PG([[1.4, 0.4], [2, 1.8], [3.4, 1.8], [2.3, 2.6], [2.7, 4], [1.4, 3.2], [0.1, 4], [0.5, 2.6], [-0.6, 1.8], [0.8, 1.8]], 'Y');
      o.L(4, 0.6, 11.5, -2.5, suit, 2.4); o.D(12.2, -2.8, 1.5, 'S');
      o.L(3, 4.2, 7.5, 5.8, suit, 2); o.D(8.1, 6, 1.2, 'S');
      o.D(8.3, -1.4, 3.3, 'S');
      o.E(8.6, -3.4, 3.6, 1.9, 'n', (i, j) => j < -2.4);
      o.R(5.4, -2.2, 6.2, 1.3, 'K');
      o.D(9.8, -1.6, 0.45, 'W');
      o.PATH([[8.4, 0.4], [9.6, 0.9], [10.6, 0.3]], 'K', 0.6);
    }, 'K');
  },
  ninja(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.L(-5, -6, 5, 6, 'h', 1.2);
      o.R(-4, 6, 3, 8, 'K'); o.R(1, 6, 3, 8, 'K');
      o.R(-5, -2, 10, 9, 'K');
      o.R(-5, 2, 10, 1.4, 'R');
      o.L(-5, 0, -9, 5, 'K', 2.4); o.L(5, 0, 9, -3, 'K', 2.4);
      o.D(0, -6, 4.2, 'K');
      o.R(-3.2, -7, 6.4, 2, 'S');
      o.D(-1.4, -6, 0.6, 'K'); o.D(1.6, -6, 0.6, 'K');
      o.PATH([[-3.5, -8], [-8, -7], [-10, -9]], 'R', 1);
    }, 'j');
  },
  pirateShip(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.L(0, 0, 0, -26, 'n', 1.4); o.L(-11, 0, -11, -18, 'n', 1.2);
      o.PG([[-1, -24], [10, -22], [11, -6], [-1, -8]], 'W');
      o.PG([[-12, -17], [-3, -16], [-3, -5], [-12, -6]], 'W');
      o.R(0, -30, 7, 4.5, 'K');
      o.D(3.5, -28.2, 1.3, 'W'); o.L(2, -26.5, 5, -26.5, 'W', 0.6);
      o.PG([[-22, 0], [20, 0], [24, -3], [16, 8], [-16, 8]], 'B');
      o.R(-18, 2, 36, 1, 'n');
      [-12, -4, 4, 12].forEach((wx) => o.D(wx, 5, 1.2, 'K'));
    }, 'K');
  },
  waves(p, top) {
    p.rect(0, top, p.w, p.h, 'd');
    for (let x = 0; x < p.w; x += 6) p.ellipse(x + 3, top, 3.2, 1.6, 'a', (i, j) => j <= top);
    p.rect(0, top + Math.round((p.h - top) / 2), p.w, p.h, 'e');
  },

  pika(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-8, 12], [-16, 6], [-13, 4], [-17, -2], [-10, 2], [-12, -4], [-5, 8]], 'Y');
      o.PG([[-5, 9], [-8, 12], [-6, 6]], 'n');
      o.E(0, 10, 7, 8, 'Y');
      o.E(-3, 18, 3, 1.6, 'Y'); o.E(4, 18, 3, 1.6, 'Y');
      o.PG([[-4, -6], [-8, -17], [-2, -8]], 'Y'); o.PG([[4, -6], [9, -17], [3, -8]], 'Y');
      o.PG([[-6.5, -13], [-8, -17], [-5.6, -14]], 'K'); o.PG([[7, -13], [9, -17], [6.2, -14]], 'K');
      o.E(0, -1, 8, 6.5, 'Y');
      o.D(-3.5, -2, 1.4, 'K'); o.D(3.5, -2, 1.4, 'K'); o.D(-3.9, -2.5, 0.5, 'W'); o.D(3.1, -2.5, 0.5, 'W');
      o.D(-6, 1.5, 1.6, 'R'); o.D(6, 1.5, 1.6, 'R');
      o.PATH([[-1.5, 2], [0, 3], [1.5, 2]], 'K', 0.7);
      o.L(-6, 8, -2, 10, 'Y', 1.6); o.L(6, 8, 2, 10, 'Y', 1.6);
      o.L(-2, 12, -4, 13, 'n', 0.8); o.L(2, 12, 4, 13, 'n', 0.8);
    }, 'K');
  },
  pokeball(p, x, y, r) {
    p.layer((q) => {
      q.disc(x, y, r, 'W');
      q.swap('W', 'R', (i, j) => j + 0.5 < y);
      q.frect(x - r, y - 0.6, r * 2, 1.2, 'K');
      q.disc(x, y, r * 0.35, 'K'); q.disc(x, y, r * 0.22, 'W');
    }, 'K');
  },
  creeper(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.R(-4, -26, 8, 8, 'G'); o.R(-3, -18, 6, 12, 'G'); o.R(-4, -6, 8, 6, 'G');
      q.noise('G', ['G', 'H', 'l', 'G'], Math.max(1, Math.round(k)));
      o.R(-3, -24, 2, 2, 'K'); o.R(1, -24, 2, 2, 'K'); o.R(-1, -22, 2, 2, 'K'); o.R(-2, -21, 4, 2, 'K'); o.R(-2, -19, 1, 1, 'K'); o.R(1, -19, 1, 1, 'K');
    }, 'K');
  },
  mcTree(p, x, base, k = 1) {
    p.layer((q) => {
      const o = at(q, x, base, k);
      o.R(-1, -9, 2, 9, 'B');
      o.R(-5, -16, 10, 7, 'G'); o.R(-3, -18, 6, 2, 'G');
      q.noise('G', ['G', 'H', 'G'], Math.max(1, Math.round(k)));
      q.noise('B', ['B', 'n', 'B'], Math.max(1, Math.round(k)));
    }, 'K');
  },
  miner(p, x, base, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, base, k, flip);
      o.R(-2, -8, 2, 8, 'e'); o.R(0, -8, 2, 8, 'e');
      o.R(-2, -16, 4, 8, 'C');
      o.R(-4, -16, 2, 7, 'S'); o.R(2, -16, 2, 7, 'S');
      o.R(-2, -20, 4, 4, 'S'); o.R(-2, -20, 4, 1.2, 'n');
      o.R(-1.2, -18.4, 0.8, 0.8, 'd'); o.R(0.6, -18.4, 0.8, 0.8, 'd');
      o.L(3.5, -10, 7, -16, 'B', 0.9); o.PATH([[5, -17], [7.5, -16.5], [9.5, -14]], 'C', 1.2);
    }, 'K');
  },
  xwing(p, x, y, k = 1, flip = false) {
    p.layer((q) => {
      const o = at(q, x, y, k, flip);
      o.PG([[-14, -1], [-6, -1], [-2, -8], [-8, -8]], 'h'); o.PG([[-14, 1], [-6, 1], [-2, 8], [-8, 8]], 'h');
      o.L(-6, -8, 4, -8, 'i', 0.9); o.L(-6, 8, 4, 8, 'i', 0.9);
      o.R(-7, -6, 4, 1, 'R'); o.R(-7, 5, 4, 1, 'R');
      o.PG([[-16, -2], [12, -1.2], [18, 0], [12, 1.2], [-16, 2]], 'W');
      o.E(2, -1, 3, 1.2, 'e');
      o.R(-16, -2, 3, 4, 'i');
    }, 'K');
  },
  tie(p, x, y, k = 1) {
    p.layer((q) => {
      const o = at(q, x, y, k);
      o.PG([[-11, -8], [-8, -8], [-7, 0], [-8, 8], [-11, 8], [-12, 0]], 'j');
      o.PG([[11, -8], [8, -8], [7, 0], [8, 8], [11, 8], [12, 0]], 'j');
      o.R(-7, -1, 14, 2, 'i');
      o.D(0, 0, 3.6, 'i'); o.D(0, 0, 2, 'g');
    }, 'K');
  },
  laser(p, x0, y0, x1, y1, c) { p.line(x0, y0, x1, y1, c, 1); },
};

const SCENE_DEFS = [
  // ---------------- Dinosaures ----------------
  {
    id: 'xl-trex', name: 'T-rex et le volcan', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.volcano(p, 9, 36, 12, 16);
      Deco.cloud(p, 44, 5, 1);
      Deco.grass(p, 36);
      Obj.trex(p, 30, 14, 1.15);
    },
  },
  {
    id: 'xl-tricera', name: 'Tricératops', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'a', 'a');
      Deco.sun(p, 9, 9, 4.5);
      Deco.mountains(p, 32, [[22, 16, 14], [48, 12, 12]]);
      Deco.hills(p, 34, 'H');
      Deco.grass(p, 34);
      Obj.triceratops(p, 30, 22, 1.25);
    },
  },
  {
    id: 'xl-brachio', name: 'Brachiosaure', cat: 'dinos', w: 48, h: 64,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 4, 8, 1);
      Obj.ptero(p, 10, 22, 0.8);
      Deco.grass(p, 54);
      Deco.tree(p, 41, 56, 1.1);
      Obj.brachio(p, 24, 10, 1.05);
    },
  },
  {
    id: 'xl-stego', name: 'Stégosaure', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.cloud(p, 40, 6, 1.1);
      Deco.hills(p, 32, 'l');
      Deco.grass(p, 34);
      Obj.stego(p, 38, 18, 1.2);
    },
  },
  {
    id: 'xl-ptero', name: 'Ptérodactyles', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sunset(p);
      p.disc(32, 30, 8, 'Y');
      Deco.volcano(p, 14, 48, 16, 16, false);
      Deco.volcano(p, 52, 48, 14, 12, false);
      Obj.ptero(p, 15, 12, 1);
      Obj.ptero(p, 48, 11, 0.9, true);
      Obj.ptero(p, 32, 27, 0.6);
    },
  },
  {
    id: 'xl-oeuf', name: 'Bébé dinosaure', cat: 'dinos', w: 48, h: 48,
    draw(p) {
      Deco.sky(p, 'a', 'a', 'a');
      Deco.sun(p, 40, 8, 4);
      Deco.grass(p, 34);
      p.layer((q) => { q.ellipse(24, 40, 18, 5, 'o'); for (let x = 8; x < 41; x += 3) q.line(x, 37, x + 3, 43, 'B', 0.9); }, 'K');
      p.layer((q) => {
        q.ellipse(24, 30, 9, 11, 'y', (i, j) => j > 26);
        q.poly([[15, 27], [18, 24], [21, 27], [24, 24], [27, 27], [30, 24], [33, 27], [33, 30], [15, 30]], 'y');
        [[19, 33, 1.8], [27, 31, 2.2], [24, 37, 1.6], [30, 36, 1.4]].forEach(([cx, cy, r]) => q.disc(cx, cy, r, 'X'));
      }, 'K');
      p.layer((q) => {
        q.ellipse(24, 18, 7, 6.5, 'G');
        q.ellipse(29, 20, 5, 3.5, 'G');
        q.disc(22, 16, 2, 'W'); q.disc(22.5, 16.5, 1, 'K');
        q.disc(28, 16, 2, 'W'); q.disc(28.5, 16.5, 1, 'K');
        q.path([[26, 22], [29, 23], [32, 21]], 'K', 0.8);
        q.disc(20, 21, 1.2, 'P');
        [[21, 11], [25, 10.5], [29, 12]].forEach(([sx, sy]) => q.poly([[sx - 1.2, sy + 1], [sx, sy - 2], [sx + 1.2, sy + 1]], 'Y'));
      }, 'K');
    },
  },

  // ---------------- Véhicules ----------------
  {
    id: 'xl-pompiers', name: 'Camion de pompiers', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.city(p, 32);
      Deco.cloud(p, 8, 5, 0.9);
      p.rect(0, 32, 64, 2, 'h');
      Deco.road(p, 34, 14);
      Obj.fireTruck(p, 12, 22, 1.25);
    },
  },
  {
    id: 'xl-police', name: 'Voiture de police', cat: 'police', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      Deco.moon(p, 52, 8, 4, 'f');
      Deco.city(p, 30);
      Deco.road(p, 30, 18);
      Obj.policeCar(p, 9, 22, 1.4);
    },
  },
  {
    id: 'xl-course', name: 'Voiture de course', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.25, 0.45);
      p.rect(0, 16, 64, 8, 'h');
      for (let x = 0; x < 64; x += 2) p.set(x, 17 + (x % 4 ? 0 : 1), 'R').set(x, 21, x % 4 ? 'd' : 'Y');
      Deco.grass(p, 24, false);
      p.rect(0, 28, 64, 16, 'j');
      for (let x = 0; x < 64; x += 2) { p.rect(x, 28, 1, 1, 'W'); p.rect(x + 1, 28, 1, 1, 'R'); p.rect(x, 43, 1, 1, 'R'); p.rect(x + 1, 43, 1, 1, 'W'); }
      for (let y = 29; y < 43; y += 2) p.rect(56, y, 2, 1, 'W').rect(58, y + 1, 2, 1, 'W');
      for (let y = 30; y < 43; y += 2) p.rect(56, y, 2, 1, 'K').rect(58, y - 1, 2, 1, 'K');
      Obj.raceCar(p, 6, 28, 1.25, false, 'R', '7');
      Deco.grass(p, 44, false);
    },
  },
  {
    id: 'xl-monster', name: 'Monster truck', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'O', 'Y', 'y', 0.2, 0.5);
      Deco.sun(p, 52, 10, 5);
      p.layer((q) => { q.ellipse(20, 52, 34, 14, 'o'); q.ellipse(56, 50, 16, 10, 'o'); q.rect(0, 44, 64, 4, 'o'); }, 'B');
      [[46, 34], [52, 36]].forEach(([cx, cy]) => p.layer((q) => q.frect(cx, cy, 5, 4, 'R'), 'K'));
      Obj.monsterTruck(p, 10, 8, 1.15);
    },
  },
  {
    id: 'xl-tracteur', name: 'Tracteur à la ferme', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 8, 8, 4);
      p.layer((q) => {
        q.rect(40, 14, 20, 18, 'R'); q.poly([[38, 14], [50, 4], [62, 14]], 'r');
        q.rect(46, 22, 8, 10, 'W'); q.line(46, 22, 54, 32, 'W', 1); q.line(54, 22, 46, 32, 'W', 1);
        q.rect(47, 23, 6, 8, 'B');
        q.rect(48, 9, 4, 4, 'W');
      }, 'K');
      Deco.grass(p, 32);
      for (let x = 0; x < 64; x += 4) p.rect(x, 31, 1, 2, 'B');
      p.rect(0, 31, 64, 1, 'B');
      Obj.tractor(p, 4, 26, 1.1);
    },
  },
  {
    id: 'xl-pelleteuse', name: 'Pelleteuse', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'a', 'a');
      Deco.cloud(p, 44, 4, 1);
      p.rect(0, 38, 64, 10, 'o');
      p.layer((q) => q.ellipse(56, 40, 14, 9, 'B'), 'K');
      [[30, 36], [33, 37], [37, 36]].forEach(([cx, cy]) => p.layer((q) => q.frect(cx, cy, 3, 2, 'O'), 'K'));
      Obj.excavator(p, 4, 18, 1.1);
    },
  },
  {
    id: 'xl-train', name: 'Petit train', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.mountains(p, 30, [[12, 12, 12], [52, 15, 14]]);
      Deco.hills(p, 30, 'l');
      Deco.grass(p, 32);
      p.rect(0, 40, 64, 1, 'n');
      for (let x = 1; x < 64; x += 4) p.rect(x, 41, 2, 1, 'B');
      Obj.train(p, 4, 25, 1.1);
    },
  },
  {
    id: 'xl-avion', name: 'Avion dans les nuages', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 4, 34, 1.5); Deco.cloud(p, 40, 40, 1.3); Deco.cloud(p, 46, 6, 1);
      Deco.sun(p, 8, 8, 4);
      Obj.plane(p, 12, 22, 1.25);
    },
  },
  {
    id: 'xl-helico', name: 'Hélicoptère', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.city(p, 48);
      Deco.cloud(p, 4, 6, 0.9);
      Obj.heli(p, 34, 18, 1.2);
    },
  },
  {
    id: 'xl-bus', name: 'Bus scolaire', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 56, 8, 4);
      Deco.tree(p, 8, 30, 1.2); Deco.tree(p, 54, 30, 1);
      Deco.grass(p, 30, true);
      Deco.road(p, 32, 16);
      Obj.bus(p, 10, 22, 1.05);
    },
  },
  {
    id: 'xl-benne', name: 'Camion benne', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'b', 'a', 'a');
      Deco.mountains(p, 34, [[48, 14, 14]]);
      p.rect(0, 34, 64, 14, 'o');
      p.layer((q) => { q.ellipse(10, 34, 9, 6, 'i'); q.stars('j', 0.15, (i, j) => q.get(i, j) === 'i'); }, 'K');
      Obj.dumpTruck(p, 20, 20, 1.15);
    },
  },

  // ---------------- Espace ----------------
  {
    id: 'xl-fusee', name: 'Fusée', cat: 'espace', w: 48, h: 64,
    draw(p) {
      Deco.space(p);
      Obj.planet(p, 10, 12, 5);
      Deco.moon(p, 40, 8, 4, 'f');
      p.layer((q) => { q.ellipse(24, 66, 30, 10, 'i'); q.disc(12, 60, 2, 'j'); q.disc(36, 61, 2.5, 'j'); }, 'K');
      Obj.rocket(p, 24, 12, 1.05);
    },
  },
  {
    id: 'xl-astronaute', name: 'Astronaute sur la Lune', cat: 'espace', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.layer((q) => { q.disc(52, 10, 6, 'd'); q.ellipse(50, 9, 3, 2, 'G'); q.ellipse(55, 12, 2, 1.5, 'G'); }, 'K');
      p.layer((q) => {
        q.ellipse(32, 60, 50, 22, 'i');
        [[12, 42, 3], [44, 44, 4], [26, 46, 2]].forEach(([cx, cy, r]) => q.ellipse(cx, cy, r, r * 0.5, 'j'));
      }, 'K');
      Obj.astronaut(p, 24, 16, 1.05);
    },
  },
  {
    id: 'xl-ovni', name: 'Soucoupe volante', cat: 'espace', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      Obj.planet(p, 12, 12, 6, 'O', 'k', 'Y');
      p.layer((q) => { q.ellipse(32, 56, 44, 14, 'v'); q.disc(14, 44, 2, 'V'); q.disc(50, 45, 2.5, 'V'); }, 'K');
      Obj.ufo(p, 38, 10, 1.2);
      Obj.alien(p, 38, 36, 0.9);
    },
  },
  {
    id: 'xl-planetes', name: 'Planètes', cat: 'espace', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.layer((q) => { q.disc(-2, 24, 10, 'Y'); }, 'O');
      Obj.planet(p, 32, 20, 8, 'k', 'O', 'y');
      p.layer((q) => { q.disc(54, 38, 6, 'd'); q.ellipse(52, 36, 3, 2, 'G'); }, 'K');
      p.layer((q) => { q.disc(18, 40, 3.5, 'R'); }, 'K');
      p.layer((q) => { q.disc(54, 10, 3, 'C'); }, 'K');
      Obj.rocket(p, 52, 18, 0.35);
    },
  },

  // ---------------- Océan ----------------
  {
    id: 'xl-requin', name: 'Requin', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.sea(p);
      p.rect(0, 42, 64, 6, 'p');
      Deco.seaweed(p, 6, 42, 12); Deco.seaweed(p, 58, 42, 14);
      Obj.fish(p, 52, 10, 1, true, 'Y', 'O'); Obj.fish(p, 10, 34, 0.9, false, 'P', 'Q');
      Deco.bubbles(p, [[46, 6, 1.4], [44, 3, 1]]);
      Obj.shark(p, 30, 22, 1.3);
    },
  },
  {
    id: 'xl-sousmarin', name: 'Sous-marin', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.sea(p);
      p.rect(0, 42, 64, 6, 'p');
      Deco.seaweed(p, 4, 42, 10); Deco.seaweed(p, 60, 42, 12);
      Obj.chest(p, 48, 39, 1);
      Obj.turtle(p, 14, 36, 0.8);
      Deco.bubbles(p, [[54, 14, 1.2], [56, 10, 1], [58, 6, 1.4]]);
      Obj.submarine(p, 30, 18, 1.15);
    },
  },
  {
    id: 'xl-pieuvre', name: 'Pieuvre et poissons', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.sea(p);
      p.rect(0, 42, 64, 6, 'p');
      [[8, 42], [56, 42]].forEach(([cx, cy]) => p.layer((q) => { q.ellipse(cx, cy, 5, 7, 'P'); q.ellipse(cx + 3, cy - 4, 2, 4, 'P'); q.ellipse(cx - 3, cy - 3, 2, 3, 'O'); }, 'K'));
      Obj.octopus(p, 32, 18, 1.1);
      Obj.fish(p, 10, 12, 1, false, 'Y', 'O'); Obj.fish(p, 54, 10, 1.1, true, 'C', 'd'); Obj.fish(p, 50, 28, 0.8, true, 'R', 'W');
      Deco.bubbles(p, [[20, 6, 1.2], [22, 3, 0.9]]);
    },
  },
  {
    id: 'xl-pirates', name: 'Bateau pirate', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a', 0.3, 0.6);
      Deco.sun(p, 54, 8, 4);
      Deco.cloud(p, 4, 6, 0.9);
      p.layer((q) => { q.ellipse(54, 36, 12, 6, 'p'); }, 'K');
      Deco.palm(p, 55, 32, 0.9);
      Obj.waves(p, 36);
      Obj.pirateShip(p, 26, 36, 1.05);
    },
  },

  // ---------------- Aventure ----------------
  {
    id: 'xl-dragon', name: 'Dragon et château', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.sunset(p);
      Deco.hills(p, 46, 'H');
      p.rect(0, 44, 64, 4, 'H');
      Obj.castle(p, 46, 44, 0.85);
      Obj.dragon(p, 18, 20, 1);
      Obj.fire(p, 42, 17, 0.9);
    },
  },
  {
    id: 'xl-chevalier', name: 'Chevalier', cat: 'aventure', w: 48, h: 64,
    draw(p) {
      Deco.sky(p);
      Deco.cloud(p, 30, 6, 1);
      Obj.castle(p, 34, 40, 0.6);
      Deco.grass(p, 40);
      Obj.knight(p, 17, 38, 1.6);
    },
  },
  {
    id: 'xl-robot', name: 'Robot géant', cat: 'aventure', w: 48, h: 64,
    draw(p) {
      Deco.night(p);
      Deco.moon(p, 38, 8, 4, 'f');
      Deco.city(p, 56);
      p.rect(0, 56, 48, 8, 'j');
      Obj.robot(p, 24, 34, 1.4);
    },
  },
  {
    id: 'xl-heros', name: 'Super-héros', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.sun(p, 8, 8, 4);
      Deco.city(p, 48);
      Deco.cloud(p, 44, 4, 1);
      Obj.hero(p, 34, 18, 1.5);
    },
  },
  {
    id: 'xl-ninja', name: 'Ninja sur les toits', cat: 'aventure', w: 48, h: 64,
    draw(p) {
      Deco.night(p);
      p.disc(24, 18, 12, 'y');
      p.layer((q) => {
        q.poly([[-2, 44], [24, 36], [50, 44]], 'r');
        q.rect(4, 44, 40, 20, 'B');
        q.rect(10, 48, 8, 8, 'Y'); q.rect(30, 48, 8, 8, 'Y');
        q.line(14, 48, 14, 56, 'n', 0.8); q.line(34, 48, 34, 56, 'n', 0.8);
      }, 'K');
      Obj.ninja(p, 24, 24, 1.3);
    },
  },
  {
    id: 'xl-volcan', name: 'Volcan', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'Q', 'O', 'Y', 0.3, 0.6);
      Deco.volcano(p, 32, 46, 30, 26);
      p.rect(0, 46, 64, 2, 'n');
      Deco.palm(p, 6, 46, 1.1); Deco.palm(p, 58, 46, 1);
      Obj.ptero(p, 12, 10, 0.7);
    },
  },

  // ---------------- Grandes scènes des jeux ----------------
  {
    id: 'xl-mc-foret', name: 'Creeper dans la forêt', cat: 'minecraft', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      p.rect(48, 4, 8, 8, 'Y').rect(49, 5, 6, 6, 'y');
      p.rect(4, 6, 12, 3, 'W').rect(7, 4, 6, 2, 'W');
      p.rect(0, 34, 64, 4, 'G'); p.noise('G', ['G', 'l'], 2);
      p.rect(0, 38, 64, 10, 'B'); p.noise('B', ['B', 'n'], 2);
      p.rect(12, 44, 2, 2, 'C').rect(40, 42, 2, 2, 'C');
      Obj.mcTree(p, 8, 34, 1.3); Obj.mcTree(p, 54, 34, 1.1);
      Obj.miner(p, 22, 34, 1.3);
      Obj.creeper(p, 40, 34, 1.2);
    },
  },
  {
    id: 'xl-mc-nuit', name: 'Nuit dans Minecraft', cat: 'minecraft', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      p.rect(48, 4, 7, 7, 'h').rect(49, 5, 2, 2, 'i').rect(52, 8, 2, 2, 'i');
      p.layer((q) => {
        q.rect(8, 20, 22, 14, 'B'); q.noise('B', ['B', 'o'], 2);
        q.poly([[6, 20], [19, 10], [32, 20]], 'n');
        q.rect(16, 26, 6, 8, 'n'); q.rect(10, 23, 4, 4, 'Y'); q.rect(24, 23, 4, 4, 'Y');
      }, 'K');
      p.rect(0, 34, 64, 4, 'H'); p.rect(0, 38, 64, 10, 'j'); p.noise('j', ['j', 'i'], 2);
      Obj.creeper(p, 44, 34, 1.1);
      p.layer((q) => { q.rect(54, 14, 4, 20, 'K'); q.rect(53, 10, 6, 6, 'K'); q.rect(54, 12, 1, 1, 'V'); q.rect(57, 12, 1, 1, 'V'); q.rect(52, 16, 1, 12, 'K'); q.rect(59, 16, 1, 12, 'K'); }, 'g');
    },
  },
  {
    id: 'xl-pika', name: 'Pikachu dans la prairie', cat: 'pokemon', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 54, 8, 4);
      Deco.cloud(p, 6, 6, 1);
      Deco.hills(p, 32, 'l');
      Deco.grass(p, 34);
      Deco.tree(p, 54, 38, 1.2);
      Obj.pokeball(p, 12, 38, 5);
      Obj.pika(p, 32, 20, 1.15);
    },
  },
  {
    id: 'xl-pokeballs', name: 'Pluie de Poké Balls', cat: 'pokemon', w: 48, h: 64,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.grass(p, 54);
      [[10, 10, 6], [36, 8, 5], [24, 24, 7], [8, 36, 5], [40, 34, 6]].forEach(([x, y, r]) => Obj.pokeball(p, x, y, r));
      Obj.pika(p, 26, 48, 0.55);
    },
  },
  {
    id: 'xl-sw-bataille', name: 'Bataille spatiale', cat: 'starwars', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.layer((q) => {
        q.disc(52, 12, 9, 'i');
        q.swap('i', 'j', (i, j) => Math.hypot(i - 48, j - 8) > 10);
        q.line(43, 12.5, 61, 12.5, 'K', 1);
        q.disc(48, 8, 2.5, 'j');
      }, 'K');
      Obj.xwing(p, 22, 30, 1.2);
      Obj.tie(p, 50, 34, 1);
      Obj.tie(p, 22, 10, 0.7);
      Obj.laser(p, 38, 30, 44, 32, 'R');
      Obj.laser(p, 26, 15, 28, 21, 'G');
    },
  },
  {
    id: 'xl-sw-duel', name: 'Duel au sabre laser', cat: 'starwars', w: 64, h: 48,
    draw(p) {
      Deco.sunset(p);
      p.disc(24, 16, 4, 'Y'); p.disc(36, 12, 3, 'y');
      p.layer((q) => { q.ellipse(32, 56, 44, 18, 'o'); }, 'B');
      p.layer((q) => {
        const a = at(q, 18, 22, 1.3);
        a.R(-3, 6, 2.6, 8, 'o'); a.R(0.4, 6, 2.6, 8, 'o');
        a.PG([[-4, -2], [4, -2], [5, 8], [-5, 8]], 'o'); a.R(-4, 3, 8, 1, 'B');
        a.D(0, -5, 3.2, 'S'); a.E(0, -7, 3.4, 1.8, 'B');
        a.L(4, 0, 7, -2, 'o', 2);
      }, 'K');
      p.layer((q) => {
        const b = at(q, 46, 22, 1.3);
        b.R(-3, 6, 2.6, 8, 'K'); b.R(0.4, 6, 2.6, 8, 'K');
        b.PG([[-6, -2], [6, -2], [7, 9], [-7, 9]], 'K');
        b.D(0, -5, 3.4, 'K'); b.R(-2, -6, 4, 1, 'j'); b.PG([[0, -4], [1.5, -1], [-1.5, -1]], 'i');
        b.R(-2, 2, 4, 2, 'R');
        b.L(-5, 0, -8, -2, 'K', 2);
      }, 'j');
      p.line(27, 18, 37, 4, 'C', 1.6).line(27.5, 17.5, 36.5, 4.5, 'W', 0.8);
      p.line(36, 18, 28, 4, 'R', 1.6).line(35.5, 17.5, 28.5, 4.5, 'W', 0.8);
      p.line(26, 19, 28, 17, 'i', 1.4).line(37, 19, 35.5, 17, 'i', 1.4);
    },
  },

  // ---------------- Variantes ----------------
  {
    id: 'xl-trex-famille', name: 'Famille T-rex', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sky(p);
      Deco.sun(p, 56, 8, 4);
      Deco.grass(p, 38);
      Obj.trex(p, 22, 15, 1.05, false, 'm', 'l');
      Obj.trex(p, 58, 30, 0.55, true, 'O', 'Y');
    },
  },
  {
    id: 'xl-tricera-soir', name: 'Tricératops au coucher du soleil', cat: 'dinos', w: 64, h: 48,
    draw(p) {
      Deco.sunset(p);
      p.disc(50, 26, 7, 'Y');
      Deco.hills(p, 36, 'H');
      p.rect(0, 36, 64, 12, 'H');
      Obj.ptero(p, 16, 8, 0.8);
      Obj.triceratops(p, 28, 22, 1.2, false, 'N', 'v');
    },
  },
  {
    id: 'xl-course-3', name: 'Grande course', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      p.fill('j');
      for (let x = 0; x < 64; x += 2) { p.rect(x, 0, 1, 2, 'R'); p.rect(x + 1, 0, 1, 2, 'W'); p.rect(x, 46, 1, 2, 'W'); p.rect(x + 1, 46, 1, 2, 'R'); }
      [16, 31].forEach((y) => { for (let x = 1; x < 64; x += 6) p.rect(x, y, 3, 1, 'W'); });
      for (let y = 2; y < 46; y += 2) p.rect(58, y, 2, 1, 'W').rect(60, y, 2, 1, 'K').rect(58, y + 1, 2, 1, 'K').rect(60, y + 1, 2, 1, 'W');
      Obj.raceCar(p, 14, 4, 0.95, false, 'R', '1');
      Obj.raceCar(p, 6, 19, 0.95, false, 'd', '7');
      Obj.raceCar(p, 10, 34, 0.95, false, 'G', '1');
    },
  },
  {
    id: 'xl-monster-saut', name: 'Saut de monster truck', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'c', 'b', 'a');
      Deco.cloud(p, 46, 4, 1);
      p.layer((q) => { q.poly([[0, 48], [0, 36], [18, 30], [22, 48]], 'o'); q.poly([[44, 48], [48, 34], [64, 34], [64, 48]], 'o'); q.rect(0, 44, 64, 4, 'o'); }, 'B');
      [[27, 38], [33, 38]].forEach(([cx, cy]) => p.layer((q) => { q.frect(cx, cy, 5, 4, 'd'); q.frect(cx + 1, cy - 2, 3, 2, 'a'); }, 'K'));
      Obj.monsterTruck(p, 16, 2, 0.85, false, 'G');
    },
  },
  {
    id: 'xl-helico-police', name: 'Hélicoptère de nuit', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      Deco.moon(p, 8, 8, 4, 'f');
      p.layer((q) => q.poly([[30, 26], [38, 26], [48, 48], [20, 48]], 'y'));
      Deco.city(p, 48);
      Obj.heli(p, 36, 16, 1.1, false, 'd');
    },
  },
  {
    id: 'xl-avion-soir', name: 'Avion au coucher du soleil', cat: 'vehicules', w: 64, h: 48,
    draw(p) {
      Deco.sunset(p);
      p.disc(14, 30, 8, 'Y');
      Deco.cloud(p, 40, 36, 1.4);
      Obj.plane(p, 16, 14, 1.15);
    },
  },
  {
    id: 'xl-dragon-rouge', name: 'Dragon rouge', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.sky(p, 'n', 'k', 'O', 0.3, 0.6);
      Deco.volcano(p, 52, 48, 14, 16);
      p.rect(0, 44, 64, 4, 'n');
      Obj.dragon(p, 24, 22, 1.05, false, 'R', 'r', 'Y');
      Obj.fire(p, 49, 18, 0.7);
    },
  },
  {
    id: 'xl-robots', name: 'Robots amis', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.rect(0, 40, 64, 8, 'i');
      p.disc(10, 44, 2, 'j'); p.disc(52, 45, 2.5, 'j');
      Obj.robot(p, 18, 20, 0.95);
      Obj.robot(p, 46, 24, 0.75);
      p.layer((q) => { q.disc(32, 8, 5, 'V'); q.ellipse(32, 8, 9, 1.6, 'v', (i, j) => j > 7); }, 'K');
    },
  },
  {
    id: 'xl-heros-nuit', name: 'Super-héros de nuit', cat: 'aventure', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      p.disc(50, 12, 8, 'y');
      Deco.city(p, 48);
      Obj.hero(p, 30, 20, 1.4, false, 'G', 'V');
    },
  },
  {
    id: 'xl-poissons', name: 'Banc de poissons', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.sea(p);
      p.rect(0, 42, 64, 6, 'p');
      Deco.seaweed(p, 4, 42, 12); Deco.seaweed(p, 30, 42, 8); Deco.seaweed(p, 60, 42, 14);
      [[12, 8, 'Y', 'O'], [28, 12, 'R', 'W'], [46, 7, 'C', 'd'], [54, 20, 'P', 'Q'], [16, 24, 'O', 'Y'], [38, 28, 'X', 'H'], [24, 36, 'v', 'V']]
        .forEach(([x, y, b, s], i) => Obj.fish(p, x, y, 1.1, i % 2 === 1, b, s));
      Obj.turtle(p, 46, 38, 0.7, true);
      Deco.bubbles(p, [[6, 6, 1.2], [8, 3, 0.9], [36, 4, 1]]);
    },
  },
  {
    id: 'xl-pirates-nuit', name: 'Pirates sous la lune', cat: 'ocean', w: 64, h: 48,
    draw(p) {
      Deco.night(p);
      p.disc(50, 10, 6, 'y');
      Obj.waves(p, 38);
      Obj.pirateShip(p, 28, 38, 1.05);
    },
  },
  {
    id: 'xl-lune', name: 'En route vers la Lune', cat: 'espace', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.layer((q) => { q.disc(10, 44, 16, 'h'); q.disc(6, 38, 3, 'i'); q.disc(16, 46, 2.5, 'i'); q.disc(18, 34, 2, 'i'); }, 'K');
      p.layer((q) => { q.disc(56, 40, 9, 'd'); q.ellipse(54, 37, 4, 3, 'G'); q.ellipse(59, 44, 3, 2, 'G'); }, 'K');
      Obj.rocket(p, 38, 2, 0.85);
    },
  },
  {
    id: 'xl-astronautes', name: 'Base sur la Lune', cat: 'espace', w: 64, h: 48,
    draw(p) {
      Deco.space(p);
      p.layer((q) => { q.ellipse(32, 60, 50, 22, 'i'); q.ellipse(50, 44, 4, 2, 'j'); }, 'K');
      Obj.rocket(p, 50, 6, 0.75);
      Obj.astronaut(p, 18, 20, 0.8);
      Obj.alien(p, 34, 34, 0.7);
    },
  },
  {
    id: 'xl-mc-mine', name: 'Dans la mine', cat: 'minecraft', w: 64, h: 48,
    draw(p) {
      p.fill('j'); p.noise('j', ['j', 'i', 'j'], 2);
      p.rect(0, 0, 64, 8, 'i'); p.noise('i', ['i', 'h'], 2);
      p.rect(0, 40, 64, 8, 'B'); p.noise('B', ['B', 'n'], 2);
      [[8, 14], [50, 10], [40, 30], [12, 32]].forEach(([x, y]) => p.stamp(x, y, ['.CW.', 'CCWC', 'CCCC', '.CC.']));
      [[30, 12], [56, 28]].forEach(([x, y]) => p.stamp(x, y, ['.YZ.', 'YYZY', '.YY.']));
      p.layer((q) => { q.rect(22, 18, 3, 22, 'B'); q.rect(36, 18, 3, 22, 'B'); q.rect(20, 16, 21, 3, 'B'); q.rect(29, 19, 2, 3, 'O'); q.rect(29, 18, 2, 1, 'Y'); }, 'K');
      Obj.miner(p, 30, 40, 1);
    },
  },
];

// Ajoute les scènes aux dessins de jeux (même format : lignes de lettres + palette).
// Ombres : chaque couleur reçoit une teinte plus foncée ; ces lettres-là sont des sols.
const GROUND = 'GHlXjihponBkg';
const SCENE_SHADER = makeShader(PAL, { ground: GROUND });
const SCENE_SHARED = at.toString() + Object.values(Deco).join('') + Object.values(Obj).join('') + JSON.stringify(PAL);
renderDefs(SCENE_DEFS, 'scenes', (i) => i * 977 + 13, SCENE_SHARED, () => SCENE_SHADER).forEach((rows, i) => {
  const d = SCENE_DEFS[i];
  GAME_ART.push({ id: d.id, name: d.name, cat: d.cat, colors: PAL, rows });
});
