// @ts-check
// Ch4 — Pulse compression by matched filtering. A long, faint, noisy chirp (top)
// correlated against a copy of itself collapses to a bright spike (bottom). More
// bandwidth → sharper spike. The gain is the time-bandwidth product.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const hash = (i) => { const s = Math.sin(i * 45.3) * 43758.5; return s - Math.floor(s); };

export default class MatchedFilter extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 0.2, max: 1, step: 0.05, value: 0.6, format: (v) => `${Math.round(v * 500)} MHz` },
    { type: 'range', name: 'noise', label: 'Noise', min: 0, max: 1.5, step: 0.1, value: 0.8, format: (v) => `${v.toFixed(1)}×` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 30, plotW = w - m * 2;
    const bw = this.params.bw, noise = this.params.noise;

    // top: noisy chirp (real signal)
    const t0 = 28, th = h * 0.34, tmid = t0 + th / 2;
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('transmitted chirp + noise', m, t0 - 6);
    g.strokeStyle = c.echoCol; g.lineWidth = 1.4; g.beginPath();
    const N = 500, k = 30 * bw;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const chirp = Math.sin(2 * Math.PI * (4 * t + k * t * t));
      const n = (hash(i) - 0.5) * 2 * noise;
      const y = tmid - (chirp + n) * th * 0.28;
      const x = m + t * plotW;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();

    // bottom: compressed output (autocorrelation ~ sinc), width ∝ 1/bandwidth
    const b0 = h * 0.56, bh = h * 0.34, bbot = b0 + bh, cxs = m + plotW / 2;
    g.fillStyle = c.muted; g.textAlign = 'left'; g.fillText('after matched filter', m, b0 - 6);
    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(m, bbot); g.lineTo(m + plotW, bbot); g.stroke();
    g.strokeStyle = c.txCol; g.lineWidth = 2; g.beginPath();
    const width = 0.5 / bw; // spike narrows with bandwidth
    for (let i = 0; i <= N; i++) {
      const t = (i / N - 0.5) * 8;
      const u = t / width;
      const amp = Math.abs(u) < 1e-6 ? 1 : Math.abs(Math.sin(Math.PI * u) / (Math.PI * u));
      const nfloor = (hash(i + 999) - 0.5) * noise * 0.06;
      const y = bbot - (amp + Math.abs(nfloor)) * bh * 0.9;
      const x = m + (i / N) * plotW;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();

    g.fillStyle = c.goodCol; g.font = `700 13px ${FONT}`; g.textAlign = 'left';
    g.fillText('signal lifted from the noise; spike sharpness set by bandwidth', m, h - 10);
  }
}
