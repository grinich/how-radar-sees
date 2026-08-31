// @ts-check
// Ch3 — Resolving velocity ambiguity with the Chinese Remainder Theorem. Each
// baseline reports a wrapped (ambiguous) velocity with its own period; the true
// velocity is the one value consistent with all of them.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const VMIN = -500, VMAX = 500;
const BASELINES = [ // period (m/s) each baseline aliases at
  { label: '20 cm', period: 285 },
  { label: '45 cm', period: 127 },
  { label: '80 cm', period: 71 },
];

export default class Crt extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'v', label: 'True velocity', min: -450, max: 450, step: 5, value: 343, format: (v) => `${v} m/s` },
    { type: 'range', name: 'nb', label: 'Baselines', min: 2, max: 3, step: 1, value: 2, format: (v) => `${v}` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 40, x0 = m, plotW = w - m * 2;
    const X = (v) => x0 + (v - VMIN) / (VMAX - VMIN) * plotW;
    const nb = this.params.nb, vTrue = this.params.v;

    g.fillStyle = c.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText('Candidate velocities per baseline', m, 26);

    const rowH = (h - 90) / nb;
    const rows = BASELINES.slice(0, nb);
    // candidate sets: measured = vTrue mod period; candidates = measured + n*period
    const candidateSets = rows.map((b) => {
      const meas = ((vTrue % b.period) + b.period) % b.period;
      const cands = [];
      for (let k = -8; k <= 8; k++) { const cv = meas + k * b.period; if (cv >= VMIN && cv <= VMAX) cands.push(cv); const cv2 = meas + k * b.period - b.period; }
      // also include negative-side wrap
      for (let k = -8; k <= 8; k++) { const cv = meas - b.period + k * b.period; }
      return cands;
    });

    rows.forEach((b, i) => {
      const y = 50 + i * rowH + rowH * 0.4;
      g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + plotW, y); g.stroke();
      g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.textAlign = 'left'; g.fillText(`${b.label} (±${b.period})`, x0, y - 12);
      for (const cv of candidateSets[i]) {
        const isTrue = Math.abs(cv - vTrue) < 3;
        g.strokeStyle = isTrue ? c.goodCol : rgba(c.echoCol, 0.75); g.lineWidth = isTrue ? 3 : 1.5;
        g.beginPath(); g.moveTo(X(cv), y - 10); g.lineTo(X(cv), y + 10); g.stroke();
      }
    });

    // true-velocity column
    g.strokeStyle = rgba(c.goodCol, 0.4); g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(vTrue), 40); g.lineTo(X(vTrue), h - 40); g.stroke(); g.setLineDash([]);

    // axis
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const v of [-400, -200, 0, 200, 400]) g.fillText(`${v}`, X(v), h - 22);
    g.fillText('radial velocity (m/s)', x0 + plotW / 2, h - 8);

    // resolved?
    const resolved = nb >= 2; // with 2 co-prime-ish baselines it's usually unique in range
    g.textAlign = 'right'; g.font = `700 14px ${FONT}`; g.fillStyle = c.goodCol;
    g.fillText(`resolved: ${vTrue} m/s`, w - m, 26);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`;
    g.fillText('the only velocity all baselines agree on', w - m, 42);
  }
}
