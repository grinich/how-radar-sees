// @ts-check
// §10 — Multi-beam source localization. Thousands of simultaneous receive beams
// build a power map of a scene; emitters are found from the peaks. It works when
// emitters are spread out, and degrades when they crowd together.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const rnd = (i) => { const x = Math.sin(i * 45.164) * 43758.5453; return x - Math.floor(x); };

export default class Sigint extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'emitters', label: 'Emitters', min: 1, max: 8, step: 1, value: 3, format: (v) => `${v}` },
    { type: 'range', name: 'spread', label: 'Scene size', min: 0.4, max: 1, step: 0.05, value: 0.9, format: (v) => `${Math.round(v * 6)} km` },
  ];

  emitterList() {
    const N = this.params.emitters, sp = this.params.spread, list = [];
    // sunflower placement — well separated at low counts, crowding as N grows / scene shrinks
    for (let i = 0; i < N; i++) {
      const ang = i * 2.399963;
      const rad = (0.12 + 0.30 * sp) * Math.sqrt((i + 0.6) / N);
      const cx = 0.5 + Math.cos(ang) * rad;
      const cy = 0.5 + Math.sin(ang) * rad;
      list.push({ x: cx, y: cy, p: 0.65 + rnd(i * 3 + 5) * 0.35 });
    }
    return list;
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0d1017'; g.fillRect(0, 0, w, h);
    const m = 30, S = Math.min(w - m * 2, h - m - 40), ox = (w - S) / 2, oy = 24;
    const X = (x) => ox + x * S, Y = (y) => oy + y * S;

    const ems = this.emitterList();
    // power map (grid), each cell = sum of Gaussian beam responses
    const G = 44, beamW = 0.10;
    let maxP = 0; const grid = [];
    for (let iy = 0; iy < G; iy++) for (let ix = 0; ix < G; ix++) {
      const px = (ix + 0.5) / G, py = (iy + 0.5) / G; let p = 0;
      for (const e of ems) { const d2 = (px - e.x) ** 2 + (py - e.y) ** 2; p += e.p * Math.exp(-d2 / (2 * beamW * beamW)); }
      grid.push(p); if (p > maxP) maxP = p;
    }
    const cell = S / G;
    for (let iy = 0; iy < G; iy++) for (let ix = 0; ix < G; ix++) {
      const p = grid[iy * G + ix] / maxP;
      const r = Math.round(20 + p * 235), gr = Math.round(20 + p * 120), b = Math.round(40 + p * 40);
      g.fillStyle = `rgb(${r},${gr},${b})`;
      g.fillRect(ox + ix * cell, oy + iy * cell, cell + 1, cell + 1);
    }

    // CLEAN-style estimates: iteratively pick brightest cells, subtract neighbourhood
    const work = grid.slice(); const est = [];
    for (let k = 0; k < this.params.emitters; k++) {
      let bi = 0, bv = -1; for (let i = 0; i < work.length; i++) if (work[i] > bv) { bv = work[i]; bi = i; }
      if (bv < maxP * 0.25) break;
      const ex = ((bi % G) + 0.5) / G, ey = (Math.floor(bi / G) + 0.5) / G;
      est.push({ x: ex, y: ey });
      for (let i = 0; i < work.length; i++) { const cxp = ((i % G) + 0.5) / G, cyp = (Math.floor(i / G) + 0.5) / G; work[i] -= bv * Math.exp(-(((cxp - ex) ** 2 + (cyp - ey) ** 2)) / (2 * beamW * beamW)); }
    }

    // true emitters (X) and estimates (O)
    for (const e of ems) { g.strokeStyle = '#ff6b6b'; g.lineWidth = 2; const x = X(e.x), y = Y(e.y);
      g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.stroke(); }
    let good = 0;
    for (const e of est) { g.strokeStyle = '#3ee08a'; g.lineWidth = 2; g.beginPath(); g.arc(X(e.x), Y(e.y), 8, 0, Math.PI * 2); g.stroke();
      if (ems.some((t) => Math.hypot(t.x - e.x, t.y - e.y) < 0.06)) good++; }

    // legend / accuracy
    g.fillStyle = 'rgba(210,215,225,0.85)'; g.font = `12px ${FONT}`; g.textAlign = 'left';
    g.fillText('✕ true emitter    ◯ estimate', m, h - 12);
    g.textAlign = 'right'; g.fillStyle = good === ems.length ? '#3ee08a' : '#ff9d5c';
    g.fillText(`${good}/${ems.length} located`, w - m, h - 12);
  }
}
