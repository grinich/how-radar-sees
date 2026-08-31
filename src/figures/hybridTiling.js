// @ts-check
// Ch4 — Hybrid tiling fixes squint. Group elements into tiles with their own
// (frequency-flat) time delay; fewer elements per tile means less squint within a
// tile — approaching a fully digital array, at the cost of gain and complexity.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const N = 32;
function af(theta, dOverL, steerRad) {
  const psi = 2 * Math.PI * dOverL * (Math.sin(theta) - Math.sin(steerRad));
  if (Math.abs(Math.sin(psi / 2)) < 1e-6) return 1;
  return Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
}

export default class HybridTiling extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'per', label: 'Elements / tile', min: 1, max: 32, step: 1, value: 16, format: (v) => `${v}` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 40, x0 = m, top = 46, plotW = w - m * 2, plotH = h * 0.56, y1 = top + plotH;
    const A = (deg) => x0 + (deg + 90) / 180 * plotW;
    const steer = 35 * Math.PI / 180, frac = 0.24;
    // squint within a tile scales with elements-per-tile fraction of the array
    const tileFrac = this.params.per / N;
    const spread = frac * tileFrac; // residual bandwidth-induced spread after time-delay per tile

    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, top, plotW, plotH);
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const a of [-60, -30, 0, 30, 60]) g.fillText(`${a}°`, A(a), y1 + 14);

    const freqs = [{ f: 1 - spread / 2, col: '#dc2626' }, { f: 1, col: '#15803d' }, { f: 1 + spread / 2, col: '#2563eb' }];
    for (const fr of freqs) {
      const dOverL = 0.5 * fr.f;
      g.strokeStyle = fr.col; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 300; i++) { const th = (-90 + i / 300 * 180) * Math.PI / 180; const a = af(th, dOverL, steer); const x = A(-90 + i / 300 * 180), y = y1 - a * plotH * 0.92; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }

    // tile diagram
    const nTiles = Math.ceil(N / this.params.per);
    const ty = y1 + 34, tw = plotW / N;
    for (let i = 0; i < N; i++) {
      const tile = Math.floor(i / this.params.per);
      g.fillStyle = tile % 2 ? rgba(c.echoCol, 0.5) : rgba(c.accent, 0.3);
      g.fillRect(x0 + i * tw + 1, ty, tw - 2, 16);
    }
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText(`${nTiles} tiles × ${this.params.per} elements`, x0, ty + 32);

    const good = tileFrac <= 0.2;
    g.textAlign = 'right'; g.fillStyle = good ? c.goodCol : c.badCol; g.font = `600 13px ${FONT}`;
    g.fillText(good ? 'squint negligible — near-digital performance' : 'still squinting — use smaller tiles', x0 + plotW, top - 12);
    g.fillStyle = c.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText('Wideband beam pattern by tile size', x0, top - 12);
  }
}
