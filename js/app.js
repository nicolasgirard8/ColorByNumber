// Coloriage Magique : logique principale (galerie, coloriage, sauvegarde).
'use strict';

const $ = (id) => document.getElementById(id);

const CATS = [
  { id: 'all', name: 'Tout', icon: '✨' },
  { id: 'animaux', name: 'Animaux', icon: '🐾' },
  { id: 'nourriture', name: 'Miam', icon: '🍓' },
  { id: 'nature', name: 'Nature', icon: '🌼' },
  { id: 'objets', name: 'Objets', icon: '🚀' },
  { id: 'mandalas', name: 'Mandalas', icon: '🌀' },
  { id: 'photos', name: 'Mes photos', icon: '📷' },
  { id: 'mine', name: 'Mes coloriages', icon: '🏆' },
];

// Emojis transformés en pixel art (si l'appareil possède une police emoji en couleur).
const EMOJIS = [
  ['🦊', 'Renard', 'animaux'], ['🐼', 'Panda', 'animaux'], ['🦁', 'Lion', 'animaux'],
  ['🐶', 'Chien', 'animaux'], ['🐰', 'Lapin', 'animaux'], ['🐷', 'Cochon', 'animaux'],
  ['🦄', 'Licorne', 'animaux'], ['🐢', 'Tortue', 'animaux'], ['🐙', 'Pieuvre', 'animaux'],
  ['🦋', 'Papillon bleu', 'animaux'], ['🐝', 'Abeille', 'animaux'], ['🐧', 'Pingouin', 'animaux'],
  ['🦖', 'Dinosaure', 'animaux'], ['🐞', 'Coccinelle', 'animaux'], ['🦉', 'Hibou', 'animaux'],
  ['🍕', 'Pizza', 'nourriture'], ['🍩', 'Beignet', 'nourriture'], ['🍔', 'Burger', 'nourriture'],
  ['🍉', 'Melon', 'nourriture'], ['🍒', 'Cerises', 'nourriture'], ['🍭', 'Sucette', 'nourriture'],
  ['🥕', 'Carotte', 'nourriture'], ['🍌', 'Banane', 'nourriture'], ['🎂', 'Gâteau', 'nourriture'],
  ['🌻', 'Tournesol', 'nature'], ['🌈', 'Arc-en-ciel 2', 'nature'], ['🌵', 'Cactus', 'nature'],
  ['🌙', 'Lune', 'nature'], ['⭐', 'Étoile', 'nature'], ['🌷', 'Tulipe', 'nature'], ['🍀', 'Trèfle', 'nature'],
  ['🚒', 'Pompiers', 'objets'], ['🚂', 'Train', 'objets'], ['🎈', 'Ballon', 'objets'],
  ['⚽', 'Football', 'objets'], ['🎁', 'Cadeau', 'objets'], ['🏰', 'Château', 'objets'],
  ['🚁', 'Hélicoptère', 'objets'], ['👑', 'Couronne', 'objets'], ['⛵', 'Bateau', 'objets'],
];

const MANDALA_SIZES = [21, 25, 25, 29, 31, 33, 35, 41];

const START_TOOLS = 5;
const STORE = 'cbn.';
const EMOJI_VERSION = 'e1.';

// ---------- Stockage ----------
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(STORE + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(STORE + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },
  del(key) {
    try { localStorage.removeItem(STORE + key); } catch (e) { /* ignoré */ }
  },
};

const encodeCells = (cells) => Array.from(cells, (c) => String.fromCharCode(49 + c)).join('');
const decodeCells = (s) => Int16Array.from(s, (ch) => ch.charCodeAt(0) - 49);

const settings = Object.assign({ sound: true, bomb: START_TOOLS, bucket: START_TOOLS }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);
Sound.enabled = settings.sound;

// ---------- Bibliothèque d'images ----------
const library = [];
const byId = new Map();

function addImage(img) {
  img.total = img.cells.reduce((s, c) => s + (c >= 0 ? 1 : 0), 0);
  library.push(img);
  byId.set(img.id, img);
}

function loadLibrary() {
  ART.forEach((a) => addImage(Gen.fromArt(a)));

  MANDALA_SIZES.forEach((size, i) => {
    const { cells, palette } = Gen.mandala(i + 1, size);
    addImage(Gen.build({ id: 'mandala' + (i + 1), name: 'Mandala ' + (i + 1), cat: 'mandalas' }, size, size, palette, cells));
  });

  // Les emojis sont mémorisés une fois générés pour que la grille ne change jamais.
  EMOJIS.forEach(([ch, name, cat], i) => {
    const id = 'emoji' + i;
    let data = store.get(EMOJI_VERSION + id, null);
    if (!data) {
      const res = Gen.emoji(ch, 28);
      if (!res) return;
      const img = Gen.build({}, 28, 28, res.palette, res.cells);
      if (img.palette.length < 2) return;
      data = { palette: img.palette, cells: encodeCells(img.cells) };
      store.set(EMOJI_VERSION + id, data);
    }
    addImage({ id, name, cat, w: 28, h: 28, palette: data.palette, cells: decodeCells(data.cells) });
  });

  store.get('photos', []).forEach((p) => {
    addImage({ id: p.id, name: p.name, cat: 'photos', w: p.w, h: p.h, palette: p.palette, cells: decodeCells(p.cells), custom: true });
  });
}

// Progression : `fill[i]` = couleur posée (-1 si vide), `order` = ordre des bonnes cases.
function loadProgress(img) {
  const p = store.get('p.' + img.id, null);
  const n = img.w * img.h;
  if (p && p.s && p.s.length === n) {
    return { fill: decodeCells(p.s), order: p.o || [] };
  }
  return { fill: new Int16Array(n).fill(-1), order: [] };
}

function progressSummary(img) {
  const p = store.get('p.' + img.id, null);
  if (!p) return { started: false, done: false, pct: 0 };
  return { started: true, done: !!p.d, pct: p.c ? p.c / img.total : 0 };
}

// ---------- Utilitaires ----------
function textColorFor(hex) {
  return Gen.luminance(hex) > 0.6 ? '#2c2547' : '#ffffff';
}

function grayFor(hex) {
  const g = Math.round(222 + (Gen.luminance(hex) - 0.5) * 56);
  return [g, g, Math.min(255, g + 6)];
}

let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function vibrate(ms) {
  if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignoré */ }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

function dialog(title, text, buttons) {
  const box = $('dialog');
  $('dialog-title').textContent = title;
  $('dialog-text').textContent = text || '';
  $('dialog-text').hidden = !text;
  const wrap = $('dialog-buttons');
  wrap.innerHTML = '';
  buttons.forEach((b) => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || '');
    el.textContent = b.label;
    el.onclick = () => { box.hidden = true; if (b.action) b.action(); };
    wrap.appendChild(el);
  });
  box.hidden = false;
}
$('dialog').addEventListener('pointerdown', (e) => { if (e.target.id === 'dialog') $('dialog').hidden = true; });

// Dessine une image (couleurs posées en couleur, le reste en gris) dans un canvas.
function drawPicture(canvas, img, fill, px) {
  canvas.width = img.w * px;
  canvas.height = img.h * px;
  const g = canvas.getContext('2d');
  const data = g.createImageData(img.w, img.h);
  for (let i = 0; i < img.cells.length; i++) {
    const c = img.cells[i];
    let rgb;
    if (c < 0) rgb = [255, 255, 255];
    else if (fill && fill[i] === c) rgb = Gen.hexToRgb(img.palette[c]);
    else rgb = grayFor(img.palette[c]);
    data.data.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
  }
  const tmp = document.createElement('canvas');
  tmp.width = img.w; tmp.height = img.h;
  tmp.getContext('2d').putImageData(data, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(tmp, 0, 0, canvas.width, canvas.height);
}

// ---------- Galerie ----------
let currentTab = store.get('tab', 'all');

function renderTabs() {
  const tabs = $('tabs');
  tabs.innerHTML = '';
  CATS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'tab' + (c.id === currentTab ? ' on' : '');
    b.textContent = c.icon + ' ' + c.name;
    b.setAttribute('role', 'tab');
    b.onclick = () => {
      Sound.tap();
      currentTab = c.id;
      store.set('tab', c.id);
      renderTabs();
      renderGrid();
    };
    tabs.appendChild(b);
  });
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  $('stock-bomb').textContent = settings.bomb;
  $('stock-bucket').textContent = settings.bucket;
  $('btn-sound').textContent = settings.sound ? '🔊' : '🔇';

  if (currentTab === 'photos') {
    const add = document.createElement('button');
    add.className = 'card add';
    add.innerHTML = '<span class="plus">＋</span><span>Ajouter une photo</span>';
    add.onclick = openImport;
    grid.appendChild(add);
  }

  let items = library;
  if (currentTab === 'mine') items = library.filter((img) => progressSummary(img).started);
  else if (currentTab !== 'all') items = library.filter((img) => img.cat === currentTab);

  if (!items.length && currentTab !== 'photos') {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = currentTab === 'mine'
      ? 'Commence un coloriage, il apparaîtra ici !'
      : 'Rien ici pour le moment.';
    grid.appendChild(e);
  }

  const frag = document.createDocumentFragment();
  items.forEach((img) => {
    const sum = progressSummary(img);
    const card = document.createElement('button');
    card.className = 'card';
    const cv = document.createElement('canvas');
    const px = Math.max(1, Math.floor(160 / Math.max(img.w, img.h)));
    drawPicture(cv, img, sum.started ? loadProgress(img).fill : null, px);
    card.appendChild(cv);
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = img.name;
    card.appendChild(name);
    if (sum.started && !sum.done) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.innerHTML = `<i style="width:${Math.round(sum.pct * 100)}%"></i>`;
      card.appendChild(bar);
    }
    if (sum.done) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = '✓';
      card.appendChild(badge);
    }
    card.onclick = () => { Sound.unlock(); Sound.tap(); Game.open(img); };
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

$('btn-sound').onclick = () => {
  settings.sound = !settings.sound;
  Sound.enabled = settings.sound;
  saveSettings();
  renderGrid();
  Sound.tap();
};

// ---------- Jeu ----------
const Game = (() => {
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const board = $('board');

  let img = null;
  let fill = null;
  let order = [];
  let remaining = [];   // cases restantes par couleur
  let totals = [];      // nombre de cases par couleur
  let doneCount = 0;
  let selected = 0;
  let tool = 'brush';
  let finished = false;

  // Caméra : `scale` = pixels CSS par case, (ox, oy) = position du coin haut-gauche.
  const cam = { scale: 20, ox: 0, oy: 0 };
  let W = 0, H = 0, dpr = 1;
  let fitScale = 10;
  let camAnim = null;
  let flash = null;     // { idx, t0 } : case à faire clignoter
  let needDraw = false;
  let saveTimer = 0;

  const MAX_SCALE = 70;
  const PAINT_MIN_TOUCH = 15;
  const PAINT_MIN_MOUSE = 6;

  function open(image) {
    img = image;
    const p = loadProgress(img);
    fill = p.fill;
    order = p.order;
    remaining = img.palette.map(() => 0);
    totals = img.palette.map(() => 0);
    doneCount = 0;
    for (let i = 0; i < img.cells.length; i++) {
      const c = img.cells[i];
      if (c < 0) continue;
      totals[c]++;
      if (fill[i] === c) doneCount++;
      else remaining[c]++;
    }
    finished = doneCount === img.total;
    selected = Math.max(0, remaining.findIndex((r) => r > 0));
    tool = 'brush';
    showScreen('game');
    buildPalette();
    resize();
    fit(false);
    updateHud();
    if (finished) setTimeout(() => Done.show(img, fill, order, false), 250);
  }

  function close() {
    saveNow();
    img = null;
    showScreen('gallery');
    renderGrid();
  }

  // ----- Sauvegarde -----
  function saveNow() {
    if (!img) return;
    clearTimeout(saveTimer);
    store.set('p.' + img.id, { s: encodeCells(fill), o: order, c: doneCount, d: finished });
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }

  // ----- Caméra -----
  function resize() {
    const r = board.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (img) {
      // Si tout le dessin était visible, on le recadre au nouveau format.
      const wasFit = Math.abs(cam.scale - fitScale) < fitScale * 0.02;
      fitScale = Math.min((W - 24) / img.w, (H - 24) / img.h);
      if (wasFit && !camAnim) fit(false);
      else clampCam();
    }
    requestDraw();
  }

  function fit(animated) {
    const s = fitScale;
    setCam(s, W / 2 - (img.w * s) / 2, H / 2 - (img.h * s) / 2, animated);
  }

  function clampCam() {
    cam.scale = Math.max(fitScale * 0.6, Math.min(MAX_SCALE, cam.scale));
    const gw = img.w * cam.scale, gh = img.h * cam.scale;
    const mx = Math.min(W / 2, gw / 2), my = Math.min(H / 2, gh / 2);
    cam.ox = Math.min(W - mx, Math.max(mx - gw, cam.ox));
    cam.oy = Math.min(H - my, Math.max(my - gh, cam.oy));
  }

  function setCam(scale, ox, oy, animated) {
    if (!animated) {
      camAnim = null;
      cam.scale = scale; cam.ox = ox; cam.oy = oy;
      clampCam();
      requestDraw();
      return;
    }
    camAnim = { from: { ...cam }, to: { scale, ox, oy }, t0: performance.now(), dur: 380 };
    requestDraw();
  }

  function zoomAt(factor, x, y, animated) {
    const ns = Math.max(fitScale * 0.6, Math.min(MAX_SCALE, cam.scale * factor));
    const wx = (x - cam.ox) / cam.scale, wy = (y - cam.oy) / cam.scale;
    setCam(ns, x - wx * ns, y - wy * ns, animated);
  }

  function centerOn(cx, cy, scale) {
    setCam(scale, W / 2 - (cx + 0.5) * scale, H / 2 - (cy + 0.5) * scale, true);
  }

  function cellAt(x, y) {
    const cx = Math.floor((x - cam.ox) / cam.scale);
    const cy = Math.floor((y - cam.oy) / cam.scale);
    if (cx < 0 || cy < 0 || cx >= img.w || cy >= img.h) return -1;
    return cy * img.w + cx;
  }

  // ----- Coloriage -----
  function paint(idx, color, { silent = false, record = true } = {}) {
    if (idx < 0 || finished) return false;
    const target = img.cells[idx];
    if (target < 0 || fill[idx] === target) return false;
    if (color !== target) {
      if (fill[idx] === color) return false;
      fill[idx] = color;
      if (!silent) Sound.wrong();
      requestDraw();
      saveSoon();
      return false;
    }
    fill[idx] = target;
    if (record) order.push(idx);
    remaining[target]--;
    doneCount++;
    if (!silent) { Sound.pop(); vibrate(8); }
    if (remaining[target] === 0) colorFinished(target);
    requestDraw();
    saveSoon();
    return true;
  }

  function colorFinished(c) {
    Sound.colorDone();
    const sw = $('palette').children[c];
    if (sw) {
      sw.classList.add('done', 'pulse');
      sw.querySelector('.dot').textContent = '✓';
      sw.style.setProperty('--p', '360deg');
    }
    if (doneCount === img.total) {
      finish();
      return;
    }
    // Passe automatiquement à la couleur suivante non terminée.
    if (c === selected) {
      for (let k = 1; k <= img.palette.length; k++) {
        const n = (c + k) % img.palette.length;
        if (remaining[n] > 0) { select(n); break; }
      }
    }
  }

  function finish() {
    finished = true;
    tool = 'brush';
    settings.bomb++;
    settings.bucket++;
    saveSettings();
    saveNow();
    updateHud();
    fit(true);
    setTimeout(() => Done.show(img, fill, order, true), 700);
  }

  // Trace une ligne de cases entre deux positions pour ne rien rater lors d'un glissé rapide.
  function paintLine(a, b) {
    if (a < 0) { paint(b, selected); return; }
    let x0 = a % img.w, y0 = Math.floor(a / img.w);
    const x1 = b % img.w, y1 = Math.floor(b / img.w);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      paint(y0 * img.w + x0, selected);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function useBomb(idx) {
    const cx = idx % img.w, cy = Math.floor(idx / img.w);
    const cellsHit = [];
    for (let y = cy - 2; y <= cy + 2; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
        if (Math.abs(x - cx) + Math.abs(y - cy) > 3) continue;
        const i = y * img.w + x;
        if (img.cells[i] >= 0 && fill[i] !== img.cells[i]) cellsHit.push(i);
      }
    }
    if (!cellsHit.length) { toast('Rien à colorier ici !'); return false; }
    Sound.boom();
    vibrate(40);
    revealSequence(cellsHit);
    return true;
  }

  function useBucket(idx) {
    const target = img.cells[idx];
    if (target < 0 || fill[idx] === target) { toast('Touche une case pas encore coloriée'); return false; }
    // Remplit toute la zone de même numéro reliée à la case touchée.
    const seen = new Uint8Array(img.cells.length);
    const stack = [idx];
    const zone = [];
    seen[idx] = 1;
    while (stack.length) {
      const i = stack.pop();
      zone.push(i);
      const x = i % img.w, y = Math.floor(i / img.w);
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < img.w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - img.w);
      if (y < img.h - 1) nb.push(i + img.w);
      for (const j of nb) {
        if (!seen[j] && img.cells[j] === target && fill[j] !== target) { seen[j] = 1; stack.push(j); }
      }
    }
    // Tri par distance pour un effet « vague » depuis le point touché.
    const ox = idx % img.w, oy = Math.floor(idx / img.w);
    zone.sort((a, b) => Math.hypot(a % img.w - ox, Math.floor(a / img.w) - oy) - Math.hypot(b % img.w - ox, Math.floor(b / img.w) - oy));
    Sound.splash();
    vibrate(25);
    select(target);
    revealSequence(zone);
    return true;
  }

  // Colorie une liste de cases avec une petite animation.
  function revealSequence(list) {
    const per = Math.max(1, Math.ceil(list.length / 18));
    let k = 0;
    const step = () => {
      if (!img) return;
      for (let n = 0; n < per && k < list.length; n++, k++) paint(list[k], img.cells[list[k]], { silent: true });
      if (k < list.length) requestAnimationFrame(step);
    };
    step();
  }

  function hint() {
    if (finished) return;
    let c = remaining[selected] > 0 ? selected : remaining.findIndex((r) => r > 0);
    if (c < 0) return;
    if (c !== selected) select(c);
    // Choisit la case de cette couleur la plus proche du centre de l'écran.
    const vx = (W / 2 - cam.ox) / cam.scale, vy = (H / 2 - cam.oy) / cam.scale;
    let best = -1, bd = Infinity;
    for (let i = 0; i < img.cells.length; i++) {
      if (img.cells[i] !== c || fill[i] === c) continue;
      const d = Math.hypot(i % img.w + 0.5 - vx, Math.floor(i / img.w) + 0.5 - vy);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    Sound.tap();
    centerOn(best % img.w, Math.floor(best / img.w), Math.max(cam.scale, 34, fitScale));
    flash = { idx: best, t0: performance.now() + 300 };
    requestDraw();
  }

  // ----- Palette et outils -----
  function buildPalette() {
    const pal = $('palette');
    pal.innerHTML = '';
    img.palette.forEach((hex, c) => {
      const sw = document.createElement('button');
      sw.className = 'swatch';
      sw.setAttribute('role', 'option');
      sw.setAttribute('aria-label', 'Couleur ' + (c + 1));
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = hex;
      dot.style.color = textColorFor(hex);
      sw.appendChild(dot);
      sw.onclick = () => { Sound.tap(); select(c); };
      pal.appendChild(sw);
    });
    refreshPalette();
  }

  function refreshPalette() {
    const pal = $('palette');
    img.palette.forEach((hex, c) => {
      const sw = pal.children[c];
      const done = remaining[c] === 0;
      sw.classList.toggle('done', done);
      sw.classList.toggle('sel', c === selected && !finished);
      sw.querySelector('.dot').textContent = done ? '✓' : String(c + 1);
      sw.style.setProperty('--p', (360 * (totals[c] - remaining[c])) / totals[c] + 'deg');
    });
  }

  function select(c) {
    selected = c;
    if (tool !== 'brush') setTool('brush');
    refreshPalette();
    const sw = $('palette').children[c];
    if (sw && sw.scrollIntoView) sw.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    requestDraw();
  }

  function setTool(t) {
    tool = t;
    $('tool-bomb').classList.toggle('on', t === 'bomb');
    $('tool-bucket').classList.toggle('on', t === 'bucket');
    const banner = $('tool-banner');
    if (t === 'bomb') banner.textContent = '💣 Touche le dessin pour faire exploser la couleur !';
    else if (t === 'bucket') banner.textContent = '🪣 Touche une zone pour la remplir !';
    banner.classList.toggle('show', t !== 'brush');
  }

  function toggleTool(t) {
    if (finished) return;
    Sound.tap();
    if (tool === t) { setTool('brush'); return; }
    if (settings[t] <= 0) { toast('Termine un dessin pour gagner des bonus !'); return; }
    setTool(t);
  }

  function applyTool(idx) {
    if (idx < 0) return;
    // Le coup peut terminer le dessin (et remettre le pinceau) : on garde l'outil utilisé.
    const used = tool;
    const ok = used === 'bomb' ? useBomb(idx) : useBucket(idx);
    if (ok) {
      settings[used]--;
      saveSettings();
    }
    setTool('brush');
    updateHud();
  }

  function updateHud() {
    const pct = img.total ? Math.floor((100 * doneCount) / img.total) : 0;
    $('progress-fill').style.width = pct + '%';
    $('progress-text').textContent = pct + ' %';
    $('count-bomb').textContent = settings.bomb;
    $('count-bucket').textContent = settings.bucket;
    $('tool-bomb').classList.toggle('empty', settings.bomb <= 0);
    $('tool-bucket').classList.toggle('empty', settings.bucket <= 0);
  }

  // ----- Rendu -----
  function requestDraw() {
    if (needDraw) return;
    needDraw = true;
    requestAnimationFrame(draw);
  }

  function draw(now) {
    needDraw = false;
    if (!img) return;
    if (camAnim) {
      const t = Math.min(1, (now - camAnim.t0) / camAnim.dur);
      const e = 1 - Math.pow(1 - t, 3);
      const f = camAnim.from, to = camAnim.to;
      cam.scale = f.scale + (to.scale - f.scale) * e;
      cam.ox = f.ox + (to.ox - f.ox) * e;
      cam.oy = f.oy + (to.oy - f.oy) * e;
      if (t >= 1) { camAnim = null; clampCam(); }
    }
    if (doneCount !== lastHudCount) { lastHudCount = doneCount; updateHud(); refreshPalette(); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const s = cam.scale;
    const x0 = Math.max(0, Math.floor(-cam.ox / s));
    const y0 = Math.max(0, Math.floor(-cam.oy / s));
    const x1 = Math.min(img.w - 1, Math.floor((W - cam.ox) / s));
    const y1 = Math.min(img.h - 1, Math.floor((H - cam.oy) / s));
    const showNumbers = s >= 11 && !finished;
    const gap = showNumbers ? Math.max(0.5, s * 0.04) : 0;

    // Contour léger du dessin.
    ctx.fillStyle = '#f2f0f7';
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (img.cells[y * img.w + x] >= 0) ctx.fillRect(cam.ox + x * s, cam.oy + y * s, s, s);
      }
    }

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * img.w + x;
        const c = img.cells[i];
        if (c < 0) continue;
        const px = cam.ox + x * s, py = cam.oy + y * s;
        const f = fill[i];
        if (f === c) {
          ctx.fillStyle = img.palette[c];
          ctx.fillRect(px - 0.3, py - 0.3, s + 0.6, s + 0.6);
          continue;
        }
        let [r, g, b] = grayFor(img.palette[c]);
        if (c === selected && tool === 'brush') { r -= 70; g -= 66; b -= 52; }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px + gap, py + gap, s - gap * 2, s - gap * 2);
        if (f >= 0) {
          // Mauvaise couleur : affichée en transparence, le numéro reste visible.
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = img.palette[f];
          ctx.fillRect(px + gap, py + gap, s - gap * 2, s - gap * 2);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (showNumbers) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = img.palette.length > 9 ? 0.42 : 0.5;
      ctx.font = `600 ${Math.round(s * label)}px Fredoka, ui-rounded, system-ui, sans-serif`;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * img.w + x;
          const c = img.cells[i];
          if (c < 0 || fill[i] === c) continue;
          const hl = c === selected && tool === 'brush';
          ctx.fillStyle = hl ? '#ffffff' : fill[i] >= 0 ? '#2c2547' : '#7d7799';
          ctx.fillText(String(c + 1), cam.ox + (x + 0.5) * s, cam.oy + (y + 0.55) * s);
        }
      }
    }

    let animating = !!camAnim;
    if (flash) {
      const t = (now - flash.t0) / 1600;
      if (t > 1) flash = null;
      else {
        animating = true;
        if (t > 0) {
          const x = flash.idx % img.w, y = Math.floor(flash.idx / img.w);
          const k = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(124,92,255,${1 - t * 0.6})`;
          ctx.lineWidth = 3 + k * 3;
          const pad = 2 + k * s * 0.35;
          ctx.strokeRect(cam.ox + x * s - pad, cam.oy + y * s - pad, s + pad * 2, s + pad * 2);
        }
      }
    }
    if (animating) requestDraw();
  }
  let lastHudCount = -1;

  // ----- Gestes (doigts, souris, molette) -----
  const pointers = new Map();
  let mode = null;
  let downPos = null;
  let lastCell = -1;
  let pinch = null;
  let pendingTimer = 0;
  let lastPan = null;

  function local(e) {
    const r = board.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function canPaint(isMouse) {
    return cam.scale >= (isMouse ? PAINT_MIN_MOUSE : PAINT_MIN_TOUCH);
  }

  function startPaint(p) {
    mode = 'paint';
    lastCell = cellAt(p.x, p.y);
    paint(lastCell, selected);
  }

  function startPinch() {
    clearTimeout(pendingTimer);
    const [a, b] = [...pointers.values()];
    pinch = {
      d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      cam: { ...cam },
    };
    mode = 'pinch';
    camAnim = null;
  }

  board.addEventListener('pointerdown', (e) => {
    Sound.unlock();
    if (!img) return;
    board.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) { startPinch(); return; }
    if (pointers.size > 2) return;
    downPos = p;
    lastPan = p;
    const isMouse = e.pointerType === 'mouse';
    if (isMouse && e.button !== 0) { mode = 'pan'; return; }
    if (finished) { mode = 'pan'; return; }
    if (tool !== 'brush') { mode = 'tool'; return; }
    if (!canPaint(isMouse)) { mode = 'tap'; return; }
    if (isMouse) { startPaint(p); return; }
    // Au doigt, on attend un instant pour ne pas colorier au début d'un pincement.
    mode = 'pending';
    pendingTimer = setTimeout(() => { if (mode === 'pending') startPaint(downPos); }, 70);
  });

  board.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (mode === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = Math.max(fitScale * 0.6, Math.min(MAX_SCALE, pinch.cam.scale * (d / pinch.d)));
      const wx = (pinch.mx - pinch.cam.ox) / pinch.cam.scale;
      const wy = (pinch.my - pinch.cam.oy) / pinch.cam.scale;
      cam.scale = ns;
      cam.ox = mx - wx * ns;
      cam.oy = my - wy * ns;
      clampCam();
      requestDraw();
      return;
    }
    const moved = downPos ? Math.hypot(p.x - downPos.x, p.y - downPos.y) : 0;
    if (mode === 'pending' && moved > 4) { clearTimeout(pendingTimer); startPaint(downPos); }
    if ((mode === 'tap' || mode === 'tool') && moved > 8) mode = 'pan';
    if (mode === 'pan') {
      cam.ox += p.x - lastPan.x;
      cam.oy += p.y - lastPan.y;
      camAnim = null;
      clampCam();
      requestDraw();
    } else if (mode === 'paint') {
      const c = cellAt(p.x, p.y);
      if (c !== lastCell && c >= 0) { paintLine(lastCell, c); lastCell = c; }
    }
    lastPan = p;
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (mode === 'pending') { clearTimeout(pendingTimer); startPaint(downPos); }
    if (mode === 'tap' && e.type === 'pointerup') {
      // Dessin trop petit : un appui zoome vers l'endroit touché.
      const target = Math.max(PAINT_MIN_TOUCH * 1.6, fitScale * 2.2);
      zoomAt(target / cam.scale, p.x, p.y, true);
    }
    if (mode === 'tool' && e.type === 'pointerup') applyTool(cellAt(p.x, p.y));
    if (pointers.size === 1) {
      // Il reste un doigt après un pincement : il sert à déplacer.
      mode = 'pan';
      lastPan = [...pointers.values()][0];
      downPos = null;
    } else if (pointers.size === 0) {
      mode = null;
      lastCell = -1;
    }
  }
  board.addEventListener('pointerup', endPointer);
  board.addEventListener('pointercancel', endPointer);
  board.addEventListener('contextmenu', (e) => e.preventDefault());

  board.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!img) return;
    const p = local(e);
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
    zoomAt(factor, p.x, p.y, false);
  }, { passive: false });

  // Empêche le zoom de la page sur Safari.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // La taille de la zone de jeu change avec l'écran ou la hauteur de la palette.
  if (window.ResizeObserver) new ResizeObserver(() => { if (img) resize(); }).observe(board);
  else window.addEventListener('resize', () => { if (img) resize(); });
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  window.addEventListener('keydown', (e) => {
    if (!img || !$('game').classList.contains('active')) return;
    if (e.key === '+' || e.key === '=') zoomAt(1.4, W / 2, H / 2, true);
    else if (e.key === '-') zoomAt(1 / 1.4, W / 2, H / 2, true);
    else if (e.key === '0') fit(true);
    else if (e.key === 'Escape') close();
    else if (/^[1-9]$/.test(e.key) && +e.key <= img.palette.length) select(+e.key - 1);
  });

  // ----- Boutons -----
  $('btn-back').onclick = () => { Sound.tap(); close(); };
  $('tool-hint').onclick = hint;
  $('tool-bomb').onclick = () => toggleTool('bomb');
  $('tool-bucket').onclick = () => toggleTool('bucket');
  $('zoom-in').onclick = () => zoomAt(1.5, W / 2, H / 2, true);
  $('zoom-out').onclick = () => zoomAt(1 / 1.5, W / 2, H / 2, true);
  $('zoom-fit').onclick = () => fit(true);
  $('btn-menu').onclick = () => {
    Sound.tap();
    const buttons = [
      { label: '↺ Recommencer', cls: 'ghost', action: () => dialog('Tout effacer ?', 'Le dessin redeviendra tout gris.', [
        { label: 'Oui, recommencer', cls: 'danger', action: reset },
        { label: 'Non', cls: 'ghost' },
      ]) },
      { label: settings.sound ? '🔇 Couper le son' : '🔊 Activer le son', cls: 'ghost', action: () => {
        settings.sound = !settings.sound; Sound.enabled = settings.sound; saveSettings();
      } },
    ];
    if (img.custom) {
      buttons.push({ label: '🗑 Supprimer la photo', cls: 'danger', action: () => dialog('Supprimer cette photo ?', '', [
        { label: 'Supprimer', cls: 'danger', action: removeCustom },
        { label: 'Non', cls: 'ghost' },
      ]) });
    }
    buttons.push({ label: 'Fermer' });
    dialog(img.name, '', buttons);
  };

  function reset() {
    store.del('p.' + img.id);
    open(img);
  }

  function removeCustom() {
    const id = img.id;
    store.del('p.' + id);
    store.set('photos', store.get('photos', []).filter((p) => p.id !== id));
    const k = library.findIndex((x) => x.id === id);
    if (k >= 0) library.splice(k, 1);
    byId.delete(id);
    img = null;
    showScreen('gallery');
    renderGrid();
  }

  return { open, close, get image() { return img; } };
})();

// ---------- Écran de fin : ralenti du coloriage + confettis ----------
const Done = (() => {
  const overlay = $('done');
  const replay = $('replay');
  const conf = $('confetti');
  let img = null, fill = null, order = [];
  let replayRaf = 0, confRaf = 0;

  function show(image, f, o, fresh) {
    img = image; fill = f; order = o.slice();
    $('done-name').textContent = img.name;
    $('done-reward').textContent = fresh ? 'Tu gagnes 💣 +1 et 🪣 +1 !' : '';
    overlay.hidden = false;
    playReplay();
    if (fresh) { Sound.win(); confetti(); }
  }

  function hide() {
    overlay.hidden = true;
    cancelAnimationFrame(replayRaf);
    cancelAnimationFrame(confRaf);
  }

  function playReplay() {
    cancelAnimationFrame(replayRaf);
    const px = Math.max(2, Math.floor(320 / Math.max(img.w, img.h)));
    const g = replay.getContext('2d');
    replay.width = img.w * px;
    replay.height = img.h * px;
    // Les cases coloriées sans ordre connu (anciennes sauvegardes) sont ajoutées à la fin.
    const seen = new Set(order);
    for (let i = 0; i < img.cells.length; i++) if (img.cells[i] >= 0 && !seen.has(i)) order.push(i);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, replay.width, replay.height);
    for (let i = 0; i < img.cells.length; i++) {
      const c = img.cells[i];
      if (c < 0) continue;
      const [r, gg, b] = grayFor(img.palette[c]);
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect((i % img.w) * px, Math.floor(i / img.w) * px, px, px);
    }
    const dur = Math.min(4500, 1500 + order.length * 3);
    const t0 = performance.now();
    let k = 0;
    const step = (now) => {
      const target = Math.min(order.length, Math.ceil(((now - t0) / dur) * order.length));
      for (; k < target; k++) {
        const i = order[k];
        g.fillStyle = img.palette[img.cells[i]];
        g.fillRect((i % img.w) * px, Math.floor(i / img.w) * px, px, px);
      }
      if (k < order.length) replayRaf = requestAnimationFrame(step);
    };
    replayRaf = requestAnimationFrame(step);
  }

  function confetti() {
    cancelAnimationFrame(confRaf);
    const dpr = window.devicePixelRatio || 1;
    conf.width = innerWidth * dpr;
    conf.height = innerHeight * dpr;
    const g = conf.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#ff6fa8', '#7c5cff', '#ffd93b', '#3cc47c', '#2f9ee1', '#ff9f1a'];
    const parts = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      s: 6 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const step = (now) => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.fillStyle = p.c;
        g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        g.restore();
      }
      if (now - t0 < 4000) confRaf = requestAnimationFrame(step);
      else g.clearRect(0, 0, innerWidth, innerHeight);
    };
    confRaf = requestAnimationFrame(step);
  }

  function savePng() {
    const px = Math.max(8, Math.floor(1024 / Math.max(img.w, img.h)));
    const c = document.createElement('canvas');
    drawPicture(c, img, fill, px);
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'coloriage-' + img.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }

  $('btn-replay').onclick = () => { Sound.tap(); playReplay(); };
  $('btn-save').onclick = () => { Sound.tap(); savePng(); };
  $('btn-done-gallery').onclick = () => { Sound.tap(); hide(); Game.close(); };
  overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) hide(); });

  return { show, hide };
})();

// ---------- Import de photo ----------
let importSource = null;
let importResult = null;

function segValue(id) {
  return +document.querySelector(`#${id} .on`).dataset.v;
}

['seg-size', 'seg-colors'].forEach((id) => {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $(id).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    Sound.tap();
    updateImportPreview();
  });
});

function openImport() {
  Sound.tap();
  importSource = null;
  importResult = null;
  $('file-input').value = '';
  $('file-label').hidden = false;
  $('import-preview').hidden = true;
  $('import-ok').disabled = true;
  $('import').hidden = false;
}

$('file-input').addEventListener('change', () => {
  const file = $('file-input').files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    importSource = image;
    updateImportPreview();
    URL.revokeObjectURL(url);
  };
  image.onerror = () => toast('Impossible de lire cette image');
  image.src = url;
});

function updateImportPreview() {
  if (!importSource) return;
  const res = Gen.photo(importSource, segValue('seg-size'), segValue('seg-colors'));
  importResult = Gen.build({}, res.w, res.h, res.palette, res.cells);
  const cv = $('import-preview');
  drawPicture(cv, importResult, importResult.cells, Math.max(2, Math.floor(260 / Math.max(res.w, res.h))));
  cv.hidden = false;
  $('file-label').hidden = true;
  $('import-ok').disabled = false;
}

$('import-cancel').onclick = () => { $('import').hidden = true; };
$('import-ok').onclick = () => {
  if (!importResult) return;
  const photos = store.get('photos', []);
  const n = photos.length + 1;
  const entry = {
    id: 'photo' + Date.now().toString(36),
    name: 'Ma photo ' + n,
    w: importResult.w,
    h: importResult.h,
    palette: importResult.palette,
    cells: encodeCells(importResult.cells),
  };
  photos.push(entry);
  if (!store.set('photos', photos)) { toast('Plus de place pour enregistrer'); return; }
  const img = { ...entry, cat: 'photos', cells: importResult.cells, custom: true };
  addImage(img);
  $('import').hidden = true;
  renderGrid();
  Game.open(img);
};

// ---------- Démarrage ----------
loadLibrary();
if (!CATS.some((c) => c.id === currentTab)) currentTab = 'all';
renderTabs();
renderGrid();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
