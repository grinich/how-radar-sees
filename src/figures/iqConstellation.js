// @ts-check
// Ch4 — The I/Q constellation. Pick a modulation (BPSK → 256-QAM) and add channel
// noise; received symbols scatter around their ideal points. When the clouds
// overlap, bits flip. Denser schemes carry more bits but need a cleaner signal.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const gauss = (i) => Math.sqrt(-2 * Math.log(Math.max(1e-6, hash(i)))) * Math.cos(2 * Math.PI * hash(i + 4999));

function points(M) {
  const side = Math.sqrt(M);
  const pts = [];
  if (M === 2) return [[-1, 0], [1, 0]];
  for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) pts.push([(2 * i - side + 1), (2 * j - side + 1)]);
  // normalize to unit average power
  const p = pts.reduce((a, [x, y]) => a + x * x + y * y, 0) / pts.length;
  const s = 1 / Math.sqrt(p);
  return pts.map(([x, y]) => [x * s, y * s]);
}

export default class IqConstellation extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'mod', label: 'Modulation', options: [['BPSK', 2], ['QPSK', 4], ['16-QAM', 16], ['64-QAM', 64], ['256-QAM', 256]], value: 16 },
    { type: 'range', name: 'snr', label: 'Signal / noise', min: 2, max: 34, step: 1, value: 18, format: (v) => `${v} dB` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const M = this.params.mod, pts = points(M), bits = Math.log2(M);
    const sigma = Math.sqrt(1 / Math.pow(10, this.params.snr / 10)) / Math.SQRT2;

    const S = Math.min(w * 0.62, h - 40), ox = 20, oy = 20, cx = ox + S / 2, cy = oy + S / 2, R = S / 2 - 10;
    const P = (v) => v * R * 0.62;

    // axes
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(ox, cy); g.lineTo(ox + S, cy); g.moveTo(cx, oy); g.lineTo(cx, oy + S); g.stroke();
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.fillText('I', ox + S - 2, cy - 6); g.textAlign = 'left'; g.fillText('Q', cx + 6, oy + 10);

    // noisy samples
    let errors = 0, total = 0;
    const perPt = Math.max(4, Math.round(700 / pts.length));
    pts.forEach((pt, pi) => {
      for (let k = 0; k < perPt; k++) {
        const idx = pi * 131 + k * 7 + 1;
        const rx = pt[0] + gauss(idx) * sigma, ry = pt[1] + gauss(idx + 100000) * sigma;
        // nearest point (decision)
        let best = 0, bd = 1e9;
        pts.forEach((q, qi) => { const d = (q[0] - rx) ** 2 + (q[1] - ry) ** 2; if (d < bd) { bd = d; best = qi; } });
        if (best !== pi) errors++; total++;
        g.fillStyle = best === pi ? rgba(c.echoCol, 0.5) : rgba(c.badCol, 0.7);
        g.fillRect(cx + P(rx) - 1, cy - P(ry) - 1, 2, 2);
      }
    });
    // ideal points
    g.fillStyle = c.ink;
    for (const [x, y] of pts) { g.beginPath(); g.arc(cx + P(x), cy - P(y), 2.5, 0, Math.PI * 2); g.fill(); }

    // readout (right side)
    const rx0 = ox + S + 24;
    g.textAlign = 'left'; g.fillStyle = c.ink; g.font = `700 16px ${FONT}`;
    g.fillText(`${bits} bits / symbol`, rx0, oy + 30);
    const ber = errors / Math.max(1, total);
    g.font = `13px ${FONT}`; g.fillStyle = ber > 0.01 ? c.badCol : c.goodCol;
    g.fillText(`bit errors: ${(ber * 100).toFixed(ber > 0.01 ? 1 : 2)}%`, rx0, oy + 56);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    g.fillText(ber > 0.05 ? 'clouds overlap — unusable' : ber > 0.005 ? 'errors creeping in' : 'clean — decodes reliably', rx0, oy + 78);
  }
}
