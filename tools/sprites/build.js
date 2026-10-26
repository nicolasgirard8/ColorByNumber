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

function rasterize(svgText, opts) {
  // Exécuté dans la page : rendu haute définition puis une couleur par case.
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const { size, weights, S } = opts;
      const vb = svgText.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
      const ratio = vb[2] / vb[3];
      // Palette exacte : toutes les couleurs écrites dans le SVG.
      const pal = [...new Set((svgText.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toLowerCase()))];
      const rgb = pal.map((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)));
      const W0 = ratio >= 1 ? size : Math.round(size * ratio), H0 = ratio >= 1 ? Math.round(size / ratio) : size;
      const cv = document.createElement('canvas'); cv.width = W0 * S; cv.height = H0 * S;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, cv.width, cv.height);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      const near = (i) => {
        let best = 0, bd = Infinity;
        for (let j = 0; j < rgb.length; j++) {
          const c = rgb[j], e = (d[i] - c[0]) ** 2 + (d[i + 1] - c[1]) ** 2 + (d[i + 2] - c[2]) ** 2;
          if (e < bd) { bd = e; best = j; }
        }
        return best;
      };
      const lum0 = rgb.map((c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
      const inkIdx = lum0.indexOf(Math.min(...lum0));
      const inkShare = opts.inkShare;
      let cells = new Array(W0 * H0).fill(-1);
      for (let cy = 0; cy < H0; cy++) for (let cx = 0; cx < W0; cx++) {
        const t = new Array(pal.length).fill(0);
        let op = 0;
        for (let y = cy * S; y < (cy + 1) * S; y++) for (let x = cx * S; x < (cx + 1) * S; x++) {
          const i = (y * cv.width + x) * 4;
          if (d[i + 3] < 128) continue;
          op++;
          t[near(i)] += weights[pal[near(i)]] || 1;
        }
        if (op * 2 < S * S) continue;
        let best = 0;
        t.forEach((v, j) => { if (v > t[best]) best = j; });
        // Le trait foncé gagne dès qu'il couvre une bonne part de la case : lignes continues.
        if (t[inkIdx] >= op * inkShare) best = inkIdx;
        cells[cy * W0 + cx] = best;
      }
      // Cases isolées (sans voisine de même couleur) : prises par la couleur voisine dominante.
      // Les détails protégés par un poids (reflets des yeux…) sont gardés.
      for (let pass = 0; pass < 2; pass++) {
        const next = cells.slice();
        for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
          const v = cells[y * W0 + x];
          if (v < 0 || weights[pal[v]]) continue;
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (x + a < 0 || y + b < 0 || x + a >= W0 || y + b >= H0 ? -1 : cells[(y + b) * W0 + x + a]));
          if (nb.includes(v)) continue;
          const t = {};
          nb.filter((n) => n >= 0).forEach((n) => { t[n] = (t[n] || 0) + 1; });
          const keys = Object.keys(t);
          if (keys.length) next[y * W0 + x] = +keys.sort((a, b) => t[b] - t[a])[0];
        }
        cells = next;
      }
      // Trop de couleurs : on fusionne les deux teintes les plus proches (la moins utilisée
      // prend la couleur de l'autre) jusqu'à la limite. Le trait n'est jamais fusionné.
      for (;;) {
        const count = {};
        cells.forEach((v) => { if (v >= 0) count[v] = (count[v] || 0) + 1; });
        const used = Object.keys(count).map(Number);
        if (used.length <= opts.max) break;
        let best = null;
        for (const a of used) for (const b of used) {
          if (a >= b || a === inkIdx || b === inkIdx) continue;
          const [ca, cb] = [rgb[a], rgb[b]];
          const dist = 2 * (ca[0] - cb[0]) ** 2 + 4 * (ca[1] - cb[1]) ** 2 + 3 * (ca[2] - cb[2]) ** 2;
          if (!best || dist < best[0]) best = [dist, a, b];
        }
        const [, a, b] = best;
        const from = count[a] < count[b] ? a : b, to = from === a ? b : a;
        cells = cells.map((v) => (v === from ? to : v));
      }
      if (opts.full) {
        const lumF = rgb.map((c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
        const usedF = [...new Set(cells.filter((v) => v >= 0))].sort((a, b) => lumF[b] - lumF[a]);
        const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', colorsF = {}, mapF = {};
        usedF.forEach((v, k) => { colorsF[L[k]] = pal[v]; mapF[v] = L[k]; });
        const rowsF = [];
        for (let y = 0; y < H0; y++) { let r = ''; for (let x = 0; x < W0; x++) { const v = cells[y * W0 + x]; r += v < 0 ? '.' : mapF[v]; } rowsF.push(r); }
        resolve({ colors: colorsF, rows: rowsF });
        return;
      }
      // Recadrage sur le sujet + une case de marge pour le contour.
      let x0 = W0, y0 = H0, x1 = -1, y1 = -1;
      cells.forEach((v, i) => { if (v < 0) return; const x = i % W0, y = (i / W0) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const w = x1 - x0 + 3, h = y1 - y0 + 3;
      const crop = new Array(w * h).fill(-1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) crop[(y - y0 + 1) * w + (x - x0 + 1)] = cells[y * W0 + x];
      cells = crop;
      // Contour extérieur d'une case, dans la couleur du trait (la plus foncée).
      const lum = rgb.map((c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
      const ink = lum.indexOf(Math.min(...lum));
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : cells[y * w + x]);
      const out = cells.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (cells[y * w + x] >= 0) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, y + b) >= 0 && at(x + a, y + b) !== ink)) out[y * w + x] = ink;
      }
      cells = out;
      // Couleurs réellement utilisées, triées de la plus claire à la plus foncée.
      const used = [...new Set(cells.filter((v) => v >= 0))].sort((a, b) => lum[b] - lum[a]);
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const colors = {}; const map = {};
      used.forEach((v, k) => { colors[letters[k]] = pal[v]; map[v] = letters[k]; });
      const rows = [];
      for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) { const v = cells[y * w + x]; r += v < 0 ? '.' : map[v]; } rows.push(r); }
      resolve({ colors, rows });
    };
    im.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
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
    const src = fs.readFileSync(path.join(DIR, a.src + '.svg'), 'utf8');
    // Les détails protégés du dessin inclus le restent dans la scène.
    ((src.match(/data-weights="([^"]*)"/) || [])[1] || '').split(',').filter(Boolean).forEach((p) => { const [c, v] = p.split(':'); included[c.toLowerCase()] = Math.max(included[c.toLowerCase()] || 0, +v); });
    const vb = src.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const x = +a.x, y = +a.y, w = +a.width, h = +a.height;
    const sc = Math.min(w / vb[2], h / vb[3]);
    const id = 'u' + (++uid);
    let inner = expand(src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), cell / sc);
    inner = shade(inner, cell / sc);
    inner = inner.replace(/stroke-width="([\d.]+)"/g, (_, v) => 'stroke-width="' + (+v * (+a.line || 0.85) / sc).toFixed(2) + '"');
    inner = inner.replace(/id="(\w+)"/g, 'id="$1' + id + '"').replace(/url\(#(\w+)\)/g, 'url(#$1' + id + ')');
    const nested = '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="' + vb.join(' ') + '">' + inner + '</svg>';
    return a.flip ? '<g transform="translate(' + (2 * x + w) + ' 0) scale(-1 1)">' + nested + '</g>' : nested;
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
    const svg = shade(expand(raw, cellU), cellU);
    const attr = (k, def) => (svg.match(new RegExp('data-' + k + '="([^"]*)"')) || [])[1] || def;
    const weights = { ...included };
    attr('weights', '').split(',').filter(Boolean).forEach((s) => { const [c, v] = s.split(':'); weights[c.toLowerCase()] = +v; });
    const size = +attr('size', 44);
    const vbW = +svg.match(/viewBox="[^"]+"/)[0].split(/[\s"]+/)[3];
    const k = (vbW / size) * +attr('stroke', 1.05) / 4;
    const svgScaled = svg.replace(/stroke-width="([\d.]+)"/g, (m, v) => 'stroke-width="' + (+v * k).toFixed(2) + '"');
    const r = await page.evaluate(([svg, o]) => rasterize(svg, o), [svgScaled, { size, weights, S: 12, inkShare: +attr('ink', 0.46), full: attr('full', '') === '1', max: +attr('max', attr('full', '') === '1' ? 22 : 16) }]).catch(async () => {
      await page.addScriptTag({ content: rasterize.toString() });
      return page.evaluate(([svg, o]) => rasterize(svg, o), [svgScaled, { size, weights, S: 12, inkShare: +attr('ink', 0.46), full: attr('full', '') === '1', max: +attr('max', attr('full', '') === '1' ? 22 : 16) }]);
    });
    result.push({ id: attr('id'), name: attr('name'), cat: attr('cat'), colors: r.colors, rows: r.rows, src: f });
  }
  if (preview) {
    const svgs = pick.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8'));
    await page.evaluate(async ([items, svgs]) => {
      const cell = 7, gap = 16, V = 300;
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
    }, [result, svgs]);
    await page.setViewportSize({ width: 2400, height: 1000 });
    await page.locator('#pv').screenshot({ path: preview });
  } else {
    // Personnages seuls d'abord, puis les grandes scènes.
    const first = ['jv-souris', 'pk-salameche', 'pk-carapuce', 'pk-bulbizarre', 'xl-pika', 'xl-pk-starters'];
    const rank = (it) => (it.id.startsWith('xl-') ? 10 : 0) + ['pokemon', 'soccer', 'hockey', 'jeux', 'starwars'].indexOf(it.cat) - (first.includes(it.id) ? 0.5 + (6 - first.indexOf(it.id)) / 100 : 0);
    result.sort((a, b) => rank(a) - rank(b));
    const lines = result.map((it) => '  ' + JSON.stringify({ id: it.id, name: it.name, cat: it.cat, colors: it.colors, rows: it.rows }) + ',');
    fs.writeFileSync(OUT, "// Personnages redessinés en vectoriel (tools/sprites/*.svg) puis convertis par tools/sprites/build.js.\n// Ne pas modifier à la main : relancer le script après avoir changé un SVG.\n'use strict';\n\nconst SPRITES = [\n" + lines.join('\n') + '\n];\n\n// Placés en tête de la galerie ; un dessin du même identifiant est remplacé.\nfor (const s of SPRITES.slice().reverse()) {\n  const i = GAME_ART.findIndex((a) => a.id === s.id);\n  if (i >= 0) GAME_ART.splice(i, 1);\n  GAME_ART.unshift(s);\n}\n');
  }
  console.log(result.map((it) => it.id + ' ' + it.rows[0].length + 'x' + it.rows.length + ' ' + Object.keys(it.colors).length + 'c').join('\n'));
  await browser.close();
})();
