// @ts-check
// Ch4 — Beam squint. An analog phased array's phase shifters steer one frequency
// correctly and every other frequency to a slightly different angle. Colour marks
// frequency; widen the bandwidth and steer off boresight to watch the beam fan out.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const N = 16;
function af(theta, dOverL, steerRad) {
  const psi = 2 * Math.PI * dOverL * (Math.sin(theta) - Math.sin(steerRad));
  if (Math.abs(Math.sin(psi / 2)) < 1e-6) return 1;
  return Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
}

export default class BeamSquint extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'steer', label: 'Steering', min: 0, max: 55, step: 1, value: 35, format: (v) => `${v}°` },
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 0, max: 40, step: 2, value: 24, format: (v) => `${v}%` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 40, x0 = m, top = 30, plotW = w - m * 2, plotH = h - top - 60, y1 = top + plotH;
    const A = (deg) => x0 + (deg + 90) / 180 * plotW;
    const steer = this.params.steer * Math.PI / 180;
    const frac = this.params.bw / 100;

    // grid
    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, top, plotW, plotH);
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const a of [-60, -30, 0, 30, 60]) { g.fillText(`${a}°`, A(a), y1 + 14); g.strokeStyle = rgba(c.rule, 0.35); g.beginPath(); g.moveTo(A(a), top); g.lineTo(A(a), y1); g.stroke(); }
    g.fillText('angle', x0 + plotW / 2, y1 + 28);

    // three frequency components: low, center, high (d/λ scales with frequency)
    const freqs = [{ f: 1 - frac / 2, col: '#dc2626', lab: 'low' }, { f: 1, col: '#15803d', lab: 'center' }, { f: 1 + frac / 2, col: '#2563eb', lab: 'high' }];
    for (const fr of freqs) {
      const dOverL = 0.5 * fr.f;
      g.strokeStyle = fr.col; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 300; i++) { const th = (-90 + i / 300 * 180) * Math.PI / 180; const a = af(th, dOverL, steer); const x = A(-90 + i / 300 * 180), y = y1 - a * plotH * 0.92; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    // steer marker
    g.strokeStyle = rgba(c.ink, 0.4); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(A(this.params.steer), top); g.lineTo(A(this.params.steer), y1); g.stroke(); g.setLineDash([]);

    // legend (top) / verdict (bottom, clear of the legend)
    g.textAlign = 'left'; g.font = `11px ${FONT}`;
    freqs.forEach((fr, i) => { g.fillStyle = fr.col; g.fillText(`● ${fr.lab}`, x0 + i * 70, top - 10); });
    const squinted = frac > 0.05 && this.params.steer > 10;
    g.fillStyle = squinted ? c.badCol : c.goodCol; g.font = `600 13px ${FONT}`; g.textAlign = 'center';
    g.fillText(squinted ? 'squint — frequencies point to different angles' : 'beam holds together', x0 + plotW / 2, h - 12);
  }
}
