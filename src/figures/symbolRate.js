// @ts-check
// Ch4 — Symbol rate is bandwidth. A stream of symbols in time (top) and its
// spectrum (bottom). Send symbols faster → the occupied band widens in proportion.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const SYMS = [1, -1, -1, 1, -1, 1, 1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1];

export default class SymbolRate extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'rate', label: 'Symbol rate', min: 0.4, max: 2.5, step: 0.1, value: 1, format: (v) => `${v.toFixed(1)}×` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 30, plotW = w - m * 2;
    const rate = this.params.rate;

    // top: time-domain symbol stream
    const t0 = 30, th = h * 0.32, tmid = t0 + th / 2;
    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(m, tmid); g.lineTo(m + plotW, tmid); g.stroke();
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('symbols over time', m, t0 - 8);
    const nSym = Math.round(8 * rate);
    const sw = plotW / nSym;
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= nSym; i++) {
      const s = SYMS[i % SYMS.length];
      const x = m + i * sw, y = tmid - s * th * 0.38;
      if (i === 0) g.moveTo(x, y); else { g.lineTo(x, tmid - SYMS[(i - 1) % SYMS.length] * th * 0.38); g.lineTo(x, y); }
    }
    g.stroke();

    // bottom: spectrum (sinc), main-lobe width ∝ symbol rate
    const b0 = h * 0.55, bh = h * 0.32, bbot = b0 + bh, cxs = m + plotW / 2;
    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(m, bbot); g.lineTo(m + plotW, bbot); g.stroke();
    g.fillStyle = c.muted; g.textAlign = 'left'; g.fillText('spectrum (bandwidth)', m, b0 - 8);
    const bw = rate; // relative bandwidth
    g.strokeStyle = c.noiseCol; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const f = (i / 200 - 0.5) * 5;
      const u = Math.PI * f / bw;
      const amp = Math.abs(u) < 1e-6 ? 1 : Math.abs(Math.sin(u) / u);
      const x = m + (i / 200) * plotW, y = bbot - amp * bh * 0.9;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    // bandwidth bracket (first nulls at ±bw)
    const xL = cxs - (bw / 5) * plotW, xR = cxs + (bw / 5) * plotW;
    g.strokeStyle = c.txCol; g.lineWidth = 2; g.beginPath(); g.moveTo(xL, b0 + 6); g.lineTo(xR, b0 + 6); g.stroke();
    g.fillStyle = c.txCol; g.textAlign = 'center'; g.font = `11px ${FONT}`;
    g.fillText(`bandwidth ∝ symbol rate`, cxs, b0 + 2);

    g.fillStyle = c.muted; g.textAlign = 'left'; g.font = `12px ${FONT}`;
    g.fillText('Faster symbols → wider band. Modulation moves the data rate, not this width.', m, h - 8);
  }
}
