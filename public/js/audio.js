// Petits effets sonores synthétisés (aucun fichier audio nécessaire).
'use strict';

const Sound = (() => {
  let ctx = null;
  let enabled = true;
  let lastPop = 0;
  let combo = 0;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, { type = 'sine', vol = 0.15, slide = 0 } = {}) {
    const c = ac();
    if (!c || !enabled) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];

  return {
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    unlock() { ac(); },
    pop() {
      const now = performance.now();
      if (now - lastPop < 35) return;
      combo = now - lastPop < 400 ? Math.min(combo + 1, scale.length - 1) : 0;
      lastPop = now;
      tone(scale[combo], 0, 0.09, { vol: 0.08, slide: 1.4 });
    },
    wrong() { tone(220, 0, 0.12, { type: 'triangle', vol: 0.08, slide: 0.7 }); },
    tap() { tone(700, 0, 0.05, { type: 'triangle', vol: 0.05 }); },
    boom() {
      tone(160, 0, 0.35, { type: 'sawtooth', vol: 0.12, slide: 0.3 });
      tone(900, 0.02, 0.25, { vol: 0.06, slide: 2 });
    },
    splash() { [660, 880, 1100].forEach((f, i) => tone(f, i * 0.04, 0.18, { vol: 0.07, slide: 1.2 })); },
    colorDone() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, { vol: 0.09 })); },
    // Sons de la petite animation de fin, selon le thème du dessin.
    roar() {
      tone(140, 0, 0.6, { type: 'sawtooth', vol: 0.14, slide: 0.55 });
      tone(95, 0.05, 0.6, { type: 'square', vol: 0.06, slide: 0.6 });
    },
    vroom() {
      tone(70, 0, 0.9, { type: 'sawtooth', vol: 0.1, slide: 2.6 });
      tone(105, 0.1, 0.8, { type: 'square', vol: 0.04, slide: 2.2 });
    },
    siren() { [0, 0.3, 0.6, 0.9].forEach((t, i) => tone(i % 2 ? 660 : 880, t, 0.28, { type: 'triangle', vol: 0.09 })); },
    whoosh() { tone(200, 0, 1, { type: 'triangle', vol: 0.1, slide: 6 }); },
    bubbles() { [0, 0.12, 0.22, 0.36, 0.5].forEach((t, i) => tone(400 + i * 120, t, 0.12, { vol: 0.08, slide: 1.8 })); },
    zap() { [0, 0.18].forEach((t) => tone(1400, t, 0.22, { type: 'square', vol: 0.05, slide: 0.2 })); },
    sparkle() { [1568, 2093, 2637, 3136, 2637].forEach((f, i) => tone(f, i * 0.08, 0.25, { vol: 0.05 })); },
    boing() { tone(220, 0, 0.35, { vol: 0.12, slide: 3 }); tone(660, 0.3, 0.25, { vol: 0.08, slide: 0.5 }); },
    win() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', vol: 0.12 }));
    },
  };
})();
