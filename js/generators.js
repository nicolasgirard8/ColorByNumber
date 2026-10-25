// Création des images de jeu : pixel art, mandalas, emojis et photos.
'use strict';

const Gen = (() => {
  // Générateur pseudo-aléatoire déterministe (mulberry32).
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hex = (r, g, b) =>
    '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return hex(f(0) * 255, f(8) * 255, f(4) * 255);
  }

  // Les couleurs sont triées de la plus foncée à la plus claire, comme dans le jeu original.
  function luminance(h) {
    const [r, g, b] = hexToRgb(h);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // Construit une image { w, h, palette, cells } en retirant les couleurs inutilisées.
  function build(meta, w, h, rawPalette, rawCells) {
    const used = new Map();
    rawCells.forEach((c) => { if (c >= 0) used.set(c, (used.get(c) || 0) + 1); });
    const order = [...used.keys()].sort((a, b) => luminance(rawPalette[a]) - luminance(rawPalette[b]));
    const remap = new Map(order.map((c, i) => [c, i]));
    return {
      ...meta,
      w, h,
      palette: order.map((c) => rawPalette[c]),
      cells: Int16Array.from(rawCells, (c) => (c >= 0 ? remap.get(c) : -1)),
    };
  }

  function fromArt(a) {
    const h = a.rows.length;
    const w = a.rows[0].length;
    const keys = Object.keys(a.colors);
    const cells = [];
    for (const row of a.rows) for (const ch of row) cells.push(ch === '.' ? -1 : keys.indexOf(ch));
    return build({ id: a.id, name: a.name, cat: a.cat }, w, h, keys.map((k) => a.colors[k]), cells);
  }

  // Mandala à symétrie d'ordre 8.
  function mandala(seed, size) {
    const r = rng(seed * 9973 + 17);
    const n = 5 + Math.floor(r() * 4);
    const hue = Math.floor(r() * 360);
    const spread = 25 + r() * 70;
    const palette = [];
    for (let i = 0; i < n; i++) {
      const hh = (hue + (i % 2 ? 180 : 0) * (r() < 0.3 ? 1 : 0) + i * spread / n * (r() < 0.5 ? 1 : -1) + 360) % 360;
      palette.push(hsl(hh, 55 + r() * 35, 30 + (i / (n - 1)) * 55));
    }
    // Anneaux concentriques découpés en pétales arrondis.
    const ringW = 2.6 + r() * 1.6;
    const rings = 40;
    const ringA = [], ringB = [], lobes = [], phase = [];
    for (let i = 0; i < rings; i++) {
      ringA.push(Math.floor(r() * n));
      ringB.push((ringA[i] + 1 + Math.floor(r() * (n - 1))) % n);
      lobes.push([1, 2, 2, 3, 4][Math.floor(r() * 5)]);
      phase.push(r() < 0.5 ? 0 : Math.PI);
    }
    const c = (size - 1) / 2;
    const cells = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - c);
        const dy = Math.abs(y - c);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > c + 0.5) { cells.push(-1); continue; }
        // Angle replié dans un huitième de cercle : symétrie d'ordre 8.
        const t = Math.atan2(Math.min(dx, dy), Math.max(dx, dy)) / (Math.PI / 4);
        const ring = Math.floor(d / ringW);
        if (ring === 0) { cells.push(ringA[0]); continue; }
        const f = d / ringW - ring;
        const shape = 0.5 + 0.38 * Math.cos(t * Math.PI * lobes[ring] + phase[ring]);
        cells.push(f < shape ? ringA[ring] : ringB[ring]);
      }
    }
    return { cells, palette };
  }

  // Quantification par k-moyennes (déterministe) d'une liste de pixels RGB.
  function quantize(pixels, k, seed = 1) {
    const r = rng(seed);
    if (pixels.length === 0) return { centers: [], labels: [] };
    k = Math.min(k, pixels.length);
    const dist = (p, q) => {
      const dr = p[0] - q[0], dg = p[1] - q[1], db = p[2] - q[2];
      // Pondération proche de la perception humaine.
      return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    };
    // Initialisation k-means++.
    const centers = [pixels[Math.floor(r() * pixels.length)].slice()];
    const dmin = pixels.map((p) => dist(p, centers[0]));
    while (centers.length < k) {
      const total = dmin.reduce((s, v) => s + v, 0);
      if (total === 0) break;
      let t = r() * total;
      let idx = 0;
      while (idx < pixels.length - 1 && (t -= dmin[idx]) > 0) idx++;
      centers.push(pixels[idx].slice());
      for (let i = 0; i < pixels.length; i++) dmin[i] = Math.min(dmin[i], dist(pixels[i], centers[centers.length - 1]));
    }
    const labels = new Int16Array(pixels.length);
    for (let iter = 0; iter < 12; iter++) {
      for (let i = 0; i < pixels.length; i++) {
        let best = 0, bd = Infinity;
        for (let j = 0; j < centers.length; j++) {
          const d = dist(pixels[i], centers[j]);
          if (d < bd) { bd = d; best = j; }
        }
        labels[i] = best;
      }
      const sums = centers.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < pixels.length; i++) {
        const s = sums[labels[i]];
        s[0] += pixels[i][0]; s[1] += pixels[i][1]; s[2] += pixels[i][2]; s[3]++;
      }
      sums.forEach((s, j) => { if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    }
    return { centers, labels };
  }

  // Convertit une image RGBA (ImageData) en grille de cases numérotées.
  function fromImageData(data, w, h, maxColors, { keepBackground = false, minShare = 0.004 } = {}) {
    const pixels = [];
    const where = [];
    for (let i = 0; i < w * h; i++) {
      const a = data[i * 4 + 3];
      if (a < 128 && !keepBackground) continue;
      // Les pixels semi-transparents sont mélangés avec du blanc.
      const f = a / 255;
      pixels.push([
        data[i * 4] * f + 255 * (1 - f),
        data[i * 4 + 1] * f + 255 * (1 - f),
        data[i * 4 + 2] * f + 255 * (1 - f),
      ]);
      where.push(i);
    }
    let { centers, labels } = quantize(pixels, maxColors, w * 31 + h);
    // Fusionne les couleurs trop proches et supprime celles presque absentes.
    const counts = centers.map(() => 0);
    labels.forEach((l) => counts[l]++);
    const keep = centers.map((_, j) => counts[j] >= Math.max(2, pixels.length * minShare));
    const alive = centers.map((c, j) => (keep[j] ? j : -1)).filter((j) => j >= 0);
    const near = (a, b) => {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      return d < 28;
    };
    const target = centers.map((_, j) => j);
    for (let x = 0; x < alive.length; x++) {
      for (let y = 0; y < x; y++) {
        const a = alive[x], b = alive[y];
        if (target[b] === b && target[a] === a && near(centers[a], centers[b])) target[a] = b;
      }
    }
    const finalIdx = alive.filter((j) => target[j] === j);
    const nearest = (p) => {
      let best = finalIdx[0], bd = Infinity;
      for (const j of finalIdx) {
        const d = Math.hypot(p[0] - centers[j][0], p[1] - centers[j][1], p[2] - centers[j][2]);
        if (d < bd) { bd = d; best = j; }
      }
      return best;
    };
    const cells = new Array(w * h).fill(-1);
    where.forEach((pos, i) => {
      const l = labels[i];
      cells[pos] = keep[l] && target[l] === l ? l : keep[l] ? target[l] : nearest(pixels[i]);
    });
    return { cells, palette: centers.map((c) => hex(c[0], c[1], c[2])) };
  }

  // Dessine un emoji en grand puis le réduit pour obtenir un pixel art.
  function emoji(char, size) {
    const big = document.createElement('canvas');
    big.width = big.height = 256;
    const g = big.getContext('2d', { willReadFrequently: true });
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
    g.fillText(char, 128, 140);
    // Recadre sur la partie dessinée.
    const full = g.getImageData(0, 0, 256, 256).data;
    let x0 = 256, y0 = 256, x1 = -1, y1 = -1, colorful = 0;
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        if (full[i + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (Math.abs(full[i] - full[i + 1]) + Math.abs(full[i + 1] - full[i + 2]) > 40) colorful++;
        }
      }
    }
    // Pas de police emoji en couleur : on abandonne.
    if (x1 < 0 || colorful < 200) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const side = Math.max(bw, bh);
    const small = document.createElement('canvas');
    small.width = small.height = size;
    const s = small.getContext('2d', { willReadFrequently: true });
    s.imageSmoothingEnabled = true;
    s.imageSmoothingQuality = 'high';
    const dw = (bw / side) * size, dh = (bh / side) * size;
    s.drawImage(big, x0, y0, bw, bh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    const img = s.getImageData(0, 0, size, size).data;
    return fromImageData(img, size, size, 10, { minShare: 0.01 });
  }

  // Réduit une photo (HTMLImageElement / ImageBitmap) en pixel art.
  function photo(source, size, colors) {
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const w = sw >= sh ? size : Math.max(8, Math.round((size * sw) / sh));
    const h = sh > sw ? size : Math.max(8, Math.round((size * sh) / sw));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.drawImage(source, 0, 0, w, h);
    const res = fromImageData(g.getImageData(0, 0, w, h).data, w, h, colors, { keepBackground: true, minShare: 0.002 });
    return { w, h, ...res };
  }

  return { rng, build, fromArt, mandala, emoji, photo, luminance, hexToRgb };
})();
