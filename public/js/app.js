// Coloriage Magique : logique principale (galerie, coloriage, sauvegarde).
'use strict';

const $ = (id) => document.getElementById(id);

const CATS = [
  { id: 'all', name: 'Tout', icon: '✨' },
  { id: 'dinos', name: 'Dinosaures', icon: '🦖' },
  { id: 'vehicules', name: 'Véhicules', icon: '🚒' },
  { id: 'police', name: 'Police', icon: '👮' },
  { id: 'soccer', name: 'Soccer', icon: '⚽' },
  { id: 'hockey', name: 'Hockey', icon: '🏒' },
  { id: 'sports', name: 'Sports', icon: '🏀' },
  { id: 'animaux', name: 'Animaux', icon: '🐾' },
  { id: 'espace', name: 'Espace', icon: '🚀' },
  { id: 'ocean', name: 'Océan', icon: '🦈' },
  { id: 'aventure', name: 'Aventure', icon: '🐉' },
  { id: 'photos', name: 'Mes photos', icon: '📷' },
  { id: 'mine', name: 'Mes coloriages', icon: '🏆' },
];

const START_TOOLS = 5;
const STORE = 'cbn.';

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

// ---------- Profils ----------
// Chaque enfant a son profil : sa progression, ses bonus et son album sont séparés.
const AVATARS = ['🦖', '🚒', '🚀', '🦈', '🐉', '🦄', '🐱', '🐶', '🦁', '🐼', '⚽', '🌈', '🤖', '🦋', '🐸', '👑'];
const AVATAR_COLORS = ['#ff8fb8', '#ffd93b', '#7ed8b8', '#8fd0f8', '#c9a6f5', '#ffb38a'];
const SETTINGS_DEFAULT = { sound: true, bomb: START_TOOLS, bucket: START_TOOLS, tips: 0 };

const settings = { ...SETTINGS_DEFAULT };
let profiles = store.get('profiles', []);
let profile = null;
const pk = (key) => 'u.' + profile.id + '.' + key;
const saveSettings = () => { if (profile) store.set(pk('settings'), settings); };

// ---------- Bibliothèque d'images ----------
const library = [];
const byId = new Map();

function addImage(img) {
  img.total = img.cells.reduce((s, c) => s + (c >= 0 ? 1 : 0), 0);
  library.push(img);
  byId.set(img.id, img);
}

function loadLibrary() {
  // Seulement des dessins de grande qualité (tools/sprites), puis les photos de l'enfant.
  GAME_ART.forEach((a) => addImage(Gen.fromArt(a)));

  store.get('photos', []).forEach((p) => {
    addImage({ id: p.id, name: p.name, cat: 'photos', w: p.w, h: p.h, palette: p.palette, cells: decodeCells(p.cells), custom: true });
  });
}

// Progression : `fill[i]` = couleur posée (-1 si vide), `order` = ordre des bonnes cases.
function loadProgress(img) {
  const p = store.get(pk('p.' + img.id), null);
  const n = img.w * img.h;
  // Un dessin terminé reste terminé, même si son image a été améliorée depuis.
  if (p && p.d) return { fill: Int16Array.from(img.cells), order: p.s && p.s.length === n ? (p.o || []) : [] };
  if (p && p.s && p.s.length === n) {
    // Si le dessin a été redessiné, on ne garde que les cases encore justes.
    const fill = decodeCells(p.s);
    let changed = false;
    fill.forEach((c, i) => { if (c >= 0 && c !== img.cells[i]) { fill[i] = -1; changed = true; } });
    return { fill, order: changed ? (p.o || []).filter((i) => fill[i] >= 0) : (p.o || []) };
  }
  return { fill: new Int16Array(n).fill(-1), order: [] };
}

function progressSummary(img) {
  const p = store.get(pk('p.' + img.id), null);
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
function toast(msg, ms = 1800) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
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
  // Seulement les catégories qui ont des dessins (« Mes photos » et « Mes coloriages » toujours).
  CATS.filter((c) => ['all', 'photos', 'mine'].includes(c.id) || library.some((i) => i.cat === c.id)).forEach((c) => {
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

// Les vignettes ne sont dessinées qu'en arrivant à l'écran : la galerie s'ouvre plus vite.
const thumbs = new WeakMap();
const thumbObserver = window.IntersectionObserver
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    thumbObserver.unobserve(en.target);
    const draw = thumbs.get(en.target);
    if (draw) draw();
  }), { rootMargin: '300px' })
  : null;

// Écran vers lequel revenir en quittant un dessin.
let homeScreen = 'gallery';
function goHome() {
  if (homeScreen === 'album') Album.show();
  else { showScreen('gallery'); renderGrid(); }
}

function renderGrid() {
  homeScreen = 'gallery';
  const doneCount = library.filter((i) => progressSummary(i).done).length;
  $('album-count').textContent = doneCount;
  $('album-count').hidden = doneCount === 0;
  const grid = $('grid');
  if (thumbObserver) thumbObserver.disconnect();
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
    thumbs.set(cv, () => drawPicture(cv, img, sum.started ? loadProgress(img).fill : null, Math.max(1, Math.floor(160 / Math.max(img.w, img.h)))));
    if (thumbObserver) thumbObserver.observe(cv); else thumbs.get(cv)();
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
    if (img.w * img.h >= 2000) {
      const xl = document.createElement('div');
      xl.className = 'xl';
      xl.textContent = 'XXL';
      card.appendChild(xl);
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
  const HOLD_MS = 300;     // durée d'appui avant de pouvoir colorier en glissant

  function open(image) {
    img = image;
    const p = loadProgress(img);
    fill = p.fill;
    order = p.order;
    // Les anciennes sauvegardes pouvaient contenir des cases de la mauvaise couleur.
    for (let i = 0; i < fill.length; i++) if (fill[i] !== img.cells[i]) fill[i] = -1;
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
    else if (settings.tips < 3) {
      settings.tips++;
      saveSettings();
      toast('Astuce : garde le doigt appuyé puis glisse pour colorier 🖌️', 4000);
    }
  }

  function close() {
    saveNow();
    img = null;
    goHome();
  }

  // ----- Sauvegarde -----
  function saveNow() {
    if (!img) return;
    clearTimeout(saveTimer);
    store.set(pk('p.' + img.id), { s: encodeCells(fill), o: order, c: doneCount, d: finished });
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
    // Une couleur ne peut colorier que les cases de son propre numéro.
    if (color !== target) {
      if (!silent) Sound.wrong();
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

  const isTargetOf = (i) => img.cells[i] === selected;

  // Trace une ligne de cases entre deux positions pour ne rien rater lors d'un glissé rapide.
  function paintLine(a, b) {
    if (a < 0) { paint(b, selected); return; }
    let x0 = a % img.w, y0 = Math.floor(a / img.w);
    const x1 = b % img.w, y1 = Math.floor(b / img.w);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      paint(y0 * img.w + x0, selected, { silent: !isTargetOf(y0 * img.w + x0) });
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
    const highlightColor = tool === 'brush' && !finished ? selected : -1;
    const hl = highlightColor >= 0 ? highlightStyle(highlightColor, now) : null;

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
        const target = c === highlightColor ? hl : null;
        if (fill[i] === c) {
          ctx.fillStyle = img.palette[c];
          ctx.fillRect(px - 0.3, py - 0.3, s + 0.6, s + 0.6);
          continue;
        }
        if (target) {
          // Case à colorier : bord de la vraie couleur et centre pâle qui pulse.
          ctx.fillStyle = target.edge;
          ctx.fillRect(px + gap, py + gap, s - gap * 2, s - gap * 2);
          const inset = gap + Math.max(1, s * 0.12);
          ctx.fillStyle = target.fill;
          ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
          continue;
        }
        // Les autres cases s'estompent pour ne pas distraire.
        const [r, g, b] = grayFor(img.palette[c]);
        ctx.fillStyle = `rgb(${(r + 255 * 1.2) / 2.2 | 0},${(g + 255 * 1.2) / 2.2 | 0},${(b + 255 * 1.2) / 2.2 | 0})`;
        ctx.fillRect(px + gap, py + gap, s - gap * 2, s - gap * 2);
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
          ctx.fillStyle = c === highlightColor ? hl.text : 'rgba(125,119,153,0.55)';
          ctx.fillText(String(c + 1), cam.ox + (x + 0.5) * s, cam.oy + (y + 0.55) * s);
        }
      }
    }

    let animating = !!camAnim;
    if (brush && mode === 'paint') {
      // Rond autour du doigt : le coloriage en glissant est actif, avec la couleur choisie.
      const t = Math.min(1, (now - brush.t0) / 160);
      const r = 46 * (0.6 + 0.4 * (1 - Math.pow(1 - t, 3)));
      if (t < 1) animating = true;
      ctx.beginPath();
      ctx.arc(brush.x, brush.y, r, 0, Math.PI * 2);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = img.palette[selected];
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = img.palette[selected];
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(brush.x, brush.y, r + 4, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(44,37,71,0.6)';
      ctx.stroke();
    }
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
    else if (hl && remaining[highlightColor] > 0) {
      // Pulsation des cases à colorier, à ~15 images/s pour ménager la batterie.
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(requestDraw, 66);
    }
  }
  let lastHudCount = -1;
  let pulseTimer = 0;

  // Couleurs des cases à colorier : version pâle de la vraie couleur, qui pulse doucement.
  function highlightStyle(c, now) {
    const [r, g, b] = Gen.hexToRgb(img.palette[c]);
    const light = Gen.luminance(img.palette[c]) > 0.8;
    // Les couleurs très claires sont mélangées à un gris-bleu pour rester visibles sur le blanc.
    const base = light ? [138, 150, 176] : [255, 255, 255];
    const pulse = 0.5 + 0.5 * Math.sin((now / 1000) * Math.PI * 1.6);
    const mix = (k) => `rgb(${base[0] + (r - base[0]) * k | 0},${base[1] + (g - base[1]) * k | 0},${base[2] + (b - base[2]) * k | 0})`;
    const k = light ? 0.15 + 0.2 * pulse : 0.3 + 0.25 * pulse;
    const lum = (0.299 * (base[0] + (r - base[0]) * k) + 0.587 * (base[1] + (g - base[1]) * k) + 0.114 * (base[2] + (b - base[2]) * k)) / 255;
    return { fill: mix(k), edge: light ? mix(0.05) : mix(0.85), text: lum > 0.62 ? '#2c2547' : '#ffffff' };
  }

  // ----- Gestes (doigts, souris, molette) -----
  const pointers = new Map();
  let mode = null;
  let downPos = null;
  let lastCell = -1;
  let pinch = null;
  let pendingTimer = 0;
  let pendingIsMouse = false;
  let brush = null;        // position du doigt quand le coloriage en glissant est actif
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
    brush = { x: p.x, y: p.y, t0: performance.now() };
    lastCell = cellAt(p.x, p.y);
    paint(lastCell, selected);
    requestDraw();
  }

  function startPinch() {
    clearTimeout(pendingTimer);
    brush = null;
    const [a, b] = [...pointers.values()];
    pinch = {
      d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      cam: { ...cam },
    };
    mode = 'pinch';
    camAnim = null;
  }

  // Un appui court colorie une case, un glissé déplace l'image.
  // Garder le doigt appuyé un instant puis glisser colorie en continu.
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
    mode = 'pending';
    pendingIsMouse = isMouse;
    if (!canPaint(isMouse)) return;
    pendingTimer = setTimeout(() => {
      if (mode !== 'pending') return;
      vibrate(25);
      Sound.tap();
      startPaint(downPos);
    }, HOLD_MS);
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
    if ((mode === 'pending' || mode === 'tool') && moved > (pendingIsMouse ? 4 : 8)) {
      clearTimeout(pendingTimer);
      mode = 'pan';
    }
    if (mode === 'pan') {
      cam.ox += p.x - lastPan.x;
      cam.oy += p.y - lastPan.y;
      camAnim = null;
      clampCam();
      requestDraw();
    } else if (mode === 'paint') {
      const c = cellAt(p.x, p.y);
      if (c !== lastCell && c >= 0) { paintLine(lastCell, c); lastCell = c; }
      brush.x = p.x;
      brush.y = p.y;
      requestDraw();
    }
    lastPan = p;
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (mode === 'pending') {
      clearTimeout(pendingTimer);
      if (e.type === 'pointerup') {
        if (canPaint(pendingIsMouse)) paint(cellAt(downPos.x, downPos.y), selected);
        else {
          // Dessin trop petit : un appui zoome vers l'endroit touché.
          const target = Math.max(PAINT_MIN_TOUCH * 1.6, fitScale * 2.2);
          zoomAt(target / cam.scale, p.x, p.y, true);
        }
      }
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
    if (mode !== 'paint' && brush) { brush = null; requestDraw(); }
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
    store.del(pk('p.' + img.id));
    open(img);
  }

  function removeCustom() {
    const id = img.id;
    profiles.forEach((pr) => store.del('u.' + pr.id + '.p.' + id));
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
    $('done-sticker').hidden = !fresh;
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
      else replayRaf = requestAnimationFrame(() => alive(px));
    };
    replayRaf = requestAnimationFrame(step);
  }

  // Le dessin terminé prend vie quelques secondes : mouvement, son et petits effets selon le thème.
  const LIFE = {
    dinos: { sound: 'roar', move: 'stomp', flow: 'prints', parts: ['👣', '💥'] },
    vehicules: { sound: 'vroom', move: 'drive', flow: 'puff', parts: ['💨'] },
    police: { sound: 'siren', move: 'drive', flow: 'twinkle', parts: ['🚨', '⭐'] },
    espace: { sound: 'whoosh', move: 'float', flow: 'twinkle', parts: ['⭐', '✨', '🌟'] },
    ocean: { sound: 'bubbles', move: 'swim', flow: 'rise', parts: ['🫧'] },
    aventure: { sound: 'zap', move: 'jump', flow: 'rise', parts: ['🔥', '✨', '⚡'] },
    gemmes: { sound: 'sparkle', move: 'shine', flow: 'twinkle', parts: ['✨', '💎'] },
    pokemon: { sound: 'boing', move: 'jump', flow: 'burst', parts: ['⚡', '⭐'] },
    minecraft: { sound: 'pop', move: 'jump', flow: 'burst', parts: ['🟩', '🟫', '💎'] },
    starwars: { sound: 'zap', move: 'float', flow: 'twinkle', parts: ['✨', '⭐'] },
    default: { sound: 'boing', move: 'jump', flow: 'burst', parts: ['❤️', '⭐', '✨'] },
  };

  function alive(px) {
    const cfg = LIFE[img.cat] || LIFE.default;
    const W = replay.width, H = replay.height;
    const still = document.createElement('canvas');
    still.width = W;
    still.height = H;
    still.getContext('2d').drawImage(replay, 0, 0);
    const g = replay.getContext('2d');
    const parts = [];
    const fs = Math.round(Math.min(W, H) * 0.11);
    const t0 = performance.now(), dur = 3200;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = () => {
      const e = cfg.parts[Math.floor(Math.random() * cfg.parts.length)];
      if (cfg.flow === 'rise') return { e, x: rnd(0.1, 0.9) * W, y: H * 1.02, vx: rnd(-0.3, 0.3), vy: -rnd(1.2, 2.4) * H / 320, life: 1.6 };
      if (cfg.flow === 'puff') return { e, x: W * 0.12, y: H * rnd(0.6, 0.8), vx: -rnd(1, 2) * W / 320, vy: -0.2, life: 1.2, grow: true };
      if (cfg.flow === 'prints') return { e: '👣', x: rnd(0.1, 0.9) * W, y: H * rnd(0.75, 0.95), vx: 0, vy: 0, life: 1 };
      if (cfg.flow === 'twinkle') return { e, x: rnd(0.05, 0.95) * W, y: rnd(0.05, 0.95) * H, vx: 0, vy: 0, life: 1, twinkle: true };
      const a = rnd(0, Math.PI * 2), v = rnd(1.5, 3.5) * W / 320;
      return { e, x: W / 2, y: H / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1.3, grav: 0.06 * H / 320 };
    };
    if (Sound[cfg.sound]) Sound[cfg.sound]();
    let last = t0;
    const step = (now) => {
      const el = now - t0, t = el / 1000, dt = Math.min(50, now - last) / 16.7;
      last = now;
      const k = Math.max(0, 1 - el / dur);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#f6f4fb';
      g.fillRect(0, 0, W, H);
      let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, wave = 0;
      if (cfg.move === 'jump') {
        const up = Math.abs(Math.sin(t * Math.PI * 2.2));
        dy = -up * H * 0.1 * k; sy = 1 - (1 - up) * 0.08 * k; sx = 1 + (1 - up) * 0.06 * k;
      } else if (cfg.move === 'stomp') {
        const hit = Math.sin(t * Math.PI * 2.4) > 0.7 ? 1 : 0.15;
        dx = Math.sin(t * 70) * W * 0.02 * k * hit; dy = Math.abs(Math.sin(t * 50)) * H * 0.01 * k * hit;
      } else if (cfg.move === 'drive') {
        dy = Math.sin(t * 45) * H * 0.008 * k; dx = Math.sin(t * Math.PI * 1.2) * W * 0.05 * k;
      } else if (cfg.move === 'float') {
        dy = Math.sin(t * Math.PI * 1.6) * H * 0.05 * k; rot = Math.sin(t * Math.PI * 1.2) * 0.04 * k;
      } else if (cfg.move === 'swim') {
        wave = 0.03 * k; dy = Math.sin(t * 3) * H * 0.02 * k;
      } else if (cfg.move === 'shine') {
        sx = sy = 1 + Math.sin(t * Math.PI * 3) * 0.05 * k;
      }
      // Marge pour que le dessin reste dans le cadre pendant qu'il bouge.
      const base = 1 - 0.12 * Math.min(1, el / 250) * Math.min(1, k * 4);
      g.translate(W / 2 + dx, H / 2 + dy);
      g.rotate(rot);
      g.scale(base * sx, base * sy);
      if (wave) {
        for (let r = 0; r < img.h; r++) g.drawImage(still, 0, r * px, W, px, -W / 2 + Math.sin(t * 6 + r * 0.45) * W * wave, -H / 2 + r * px, W, px + 0.5);
      } else g.drawImage(still, -W / 2, -H / 2);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (el < dur - 700 && Math.random() < 0.35 * dt) parts.push(spawn());
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= 0.016 * dt;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.grav) q.vy += q.grav * dt;
        const size = fs * (q.grow ? 1.6 - q.life * 0.5 : q.twinkle ? 0.6 + Math.abs(Math.sin(q.life * 6)) * 0.6 : 1);
        g.globalAlpha = Math.min(1, q.life * 1.5);
        g.font = Math.round(size) + 'px sans-serif';
        g.fillText(q.e, q.x, q.y);
      }
      g.globalAlpha = 1;
      if (el < dur || parts.length) replayRaf = requestAnimationFrame(step);
      else g.drawImage(still, 0, 0);
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

// ---------- Écran « Qui joue ? » ----------
const Profiles = (() => {
  let managing = false;
  let editing = null;
  let draft = null;

  function use(p) {
    profile = p;
    store.set('current', p.id);
    Object.keys(settings).forEach((k) => delete settings[k]);
    Object.assign(settings, SETTINGS_DEFAULT, store.get(pk('settings'), {}));
    Sound.enabled = settings.sound;
    const b = $('btn-profile');
    b.textContent = p.avatar;
    b.style.background = p.color;
    b.setAttribute('aria-label', 'Changer de joueur (' + (p.name || 'joueur') + ')');
    showScreen('gallery');
    renderTabs();
    renderGrid();
  }

  function show() {
    managing = false;
    render();
    showScreen('profiles');
  }

  function render() {
    const list = $('profile-list');
    list.innerHTML = '';
    profiles.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'profile' + (managing ? ' managing' : '');
      b.innerHTML = '<span class="avatar"></span><span class="pname"></span>';
      b.querySelector('.avatar').textContent = p.avatar;
      b.querySelector('.avatar').style.background = p.color;
      b.querySelector('.pname').textContent = p.name || ' ';
      b.onclick = () => { Sound.unlock(); Sound.tap(); if (managing) edit(p); else use(p); };
      list.appendChild(b);
    });
    const add = document.createElement('button');
    add.className = 'profile add';
    add.innerHTML = '<span class="avatar">＋</span><span class="pname">Ajouter</span>';
    add.onclick = () => { Sound.unlock(); Sound.tap(); edit(null); };
    list.appendChild(add);
    $('btn-manage').hidden = profiles.length === 0;
    $('btn-manage').textContent = managing ? '✓ Terminé' : '✏️ Modifier';
    $('who-title').textContent = profiles.length ? 'Qui joue ?' : 'Bienvenue ! Qui va jouer ?';
  }

  $('btn-manage').onclick = () => { Sound.tap(); managing = !managing; render(); };
  $('btn-profile').onclick = () => { Sound.tap(); show(); };

  function edit(p) {
    editing = p;
    draft = p ? { ...p } : { name: '', avatar: AVATARS[profiles.length % AVATARS.length], color: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length] };
    $('pe-title').textContent = p ? 'Modifier le joueur' : 'Nouveau joueur';
    $('pe-name').value = draft.name;
    $('pe-delete').hidden = !p;
    const av = $('pe-avatars');
    av.innerHTML = '';
    AVATARS.forEach((a) => {
      const b = document.createElement('button');
      b.textContent = a;
      b.onclick = () => { Sound.tap(); draft.avatar = a; paint(); };
      av.appendChild(b);
    });
    const co = $('pe-colors');
    co.innerHTML = '';
    AVATAR_COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.style.background = c;
      b.setAttribute('aria-label', 'Couleur');
      b.onclick = () => { Sound.tap(); draft.color = c; paint(); };
      co.appendChild(b);
    });
    paint();
    $('profile-edit').hidden = false;
  }

  function paint() {
    const pv = $('pe-preview');
    pv.textContent = draft.avatar;
    pv.style.background = draft.color;
    [...$('pe-avatars').children].forEach((b) => b.classList.toggle('on', b.textContent === draft.avatar));
    [...$('pe-colors').children].forEach((b, i) => b.classList.toggle('on', AVATAR_COLORS[i] === draft.color));
  }

  $('pe-cancel').onclick = () => { $('profile-edit').hidden = true; };
  $('pe-save').onclick = () => {
    draft.name = $('pe-name').value.trim().slice(0, 14);
    if (editing) {
      Object.assign(editing, draft);
    } else {
      const p = { id: 'k' + Date.now().toString(36), ...draft };
      // La progression faite avant les profils est confiée au premier joueur créé.
      if (!profiles.length) adoptLegacy(p.id);
      profiles.push(p);
      editing = p;
    }
    store.set('profiles', profiles);
    $('profile-edit').hidden = true;
    Sound.colorDone();
    if (profiles.length === 1 && !managing) use(editing);
    else render();
  };
  $('pe-delete').onclick = () => {
    const p = editing;
    dialog('Supprimer ' + (p.name || 'ce joueur') + ' ?', 'Ses dessins et son album seront effacés.', [
      { label: 'Supprimer', cls: 'danger', action: () => {
        removeKeys(STORE + 'u.' + p.id + '.');
        profiles = profiles.filter((x) => x !== p);
        store.set('profiles', profiles);
        if (profile === p) profile = null;
        $('profile-edit').hidden = true;
        render();
      } },
      { label: 'Non', cls: 'ghost' },
    ]);
  };

  function removeKeys(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith(prefix)) keys.push(localStorage.key(i));
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignoré */ }
  }

  // Avant les profils, la progression était commune à tout l'appareil.
  function adoptLegacy(id) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(STORE + 'p.') || k === STORE + 'settings') keys.push(k);
      }
      keys.forEach((k) => {
        localStorage.setItem(STORE + 'u.' + id + '.' + k.slice(STORE.length), localStorage.getItem(k));
        localStorage.removeItem(k);
      });
    } catch (e) { /* ignoré */ }
  }

  return { show, use };
})();

// ---------- Album d'autocollants ----------
const Album = (() => {
  function show() {
    homeScreen = 'album';
    const pages = $('album-pages');
    if (thumbObserver) thumbObserver.disconnect();
    pages.innerHTML = '';
    let total = 0, done = 0;
    CATS.filter((c) => c.id !== 'all' && c.id !== 'mine').forEach((cat) => {
      const items = library.filter((i) => i.cat === cat.id);
      if (!items.length) return;
      const got = items.filter((i) => progressSummary(i).done).length;
      total += items.length;
      done += got;
      const page = document.createElement('section');
      page.className = 'album-page' + (got === items.length ? ' complete' : '');
      page.innerHTML = '<h2><span></span><b></b></h2><div class="stickers"></div>';
      page.querySelector('h2 span').textContent = cat.icon + ' ' + cat.name;
      page.querySelector('h2 b').textContent = got === items.length ? '🏆 ' + got + ' / ' + items.length : got + ' / ' + items.length;
      const wrap = page.querySelector('.stickers');
      items.forEach((img, n) => {
        const isDone = progressSummary(img).done;
        const b = document.createElement('button');
        b.className = 'sticker' + (isDone ? ' got' : '');
        b.style.setProperty('--tilt', (((n * 37) % 11) - 5) + 'deg');
        b.setAttribute('aria-label', img.name);
        const cv = document.createElement('canvas');
        const px = Math.max(1, Math.floor(96 / Math.max(img.w, img.h)));
        // Pas encore terminé : le dessin apparaît en gris, comme une case vide de l'album.
        thumbs.set(cv, () => drawPicture(cv, img, isDone ? img.cells : null, px));
        if (thumbObserver) thumbObserver.observe(cv); else thumbs.get(cv)();
        b.appendChild(cv);
        b.onclick = () => { Sound.unlock(); Sound.tap(); Game.open(img); };
        wrap.appendChild(b);
      });
      pages.appendChild(page);
    });
    const who = profile.name || profile.avatar;
    $('album-title').textContent = (/^[aeiouyàâéèêëîïôûüh]/i.test(who) ? "Album d'" : 'Album de ') + who;
    $('album-total').textContent = done + ' / ' + total + ' autocollants';
    showScreen('album');
    pages.scrollTop = 0;
  }

  $('btn-album').onclick = () => { Sound.tap(); show(); };
  $('btn-album-back').onclick = () => { Sound.tap(); homeScreen = 'gallery'; goHome(); };

  return { show };
})();

// ---------- Import de photo ----------
let importSource = null;
let importResult = null;

function segValue(id) {
  const v = document.querySelector(`#${id} .on`).dataset.v;
  return isNaN(v) ? v : +v;
}

['seg-style', 'seg-size', 'seg-colors'].forEach((id) => {
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
  // « Dessin » : fond retiré et contour noir, idéal pour une image de coloriage
  // trouvée sur le web. « Photo » : garde toute l'image et ses nuances.
  const drawing = segValue('seg-style') === 'dessin';
  const res = Gen.convert(importSource, {
    size: segValue('seg-size'), colors: segValue('seg-colors'), removeBg: drawing, outline: drawing, crop: drawing,
  });
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
// Demande au navigateur de ne pas effacer les données du jeu de lui-même.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if (profiles.length === 1) Profiles.use(profiles[0]);
else Profiles.show();
$('loading').hidden = true;

// ---------- Application Android (Capacitor) ----------
const Native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;
if (Native) {
  document.body.classList.add('native');
  // Plein écran : la barre d'état ne distrait pas les enfants.
  if (Native.StatusBar) Native.StatusBar.hide().catch(() => {});
  // Bouton retour d'Android : ferme la fenêtre ouverte, puis revient à l'écran précédent.
  if (Native.App) {
    Native.App.addListener('backButton', () => {
      const open = (id) => !$(id).hidden;
      if (open('dialog')) $('dialog').hidden = true;
      else if (open('import')) $('import').hidden = true;
      else if (open('profile-edit')) $('profile-edit').hidden = true;
      else if (open('done')) $('btn-done-gallery').click();
      else if ($('game').classList.contains('active')) $('btn-back').click();
      else if ($('album').classList.contains('active')) $('btn-album-back').click();
      else Native.App.exitApp();
    });
  }
}

if (!Native && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
