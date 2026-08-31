// @ts-check
// Ch2 — The range-Doppler algorithm, stage by stage. A destroyer built from point
// scatterers, shown as it focuses: raw phase history → range compression → azimuth
// FFT → range-cell-migration correction → azimuth compression → focused image.
// The data is a faithful caricature of each stage's characteristic smear, not a
// full SAR simulation.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const STAGES = [
  { name: '1 · Raw phase history', desc: 'Each scatterer is smeared in range (uncompressed chirp) and azimuth (long dwell) — a wash of noise.', sr: 0.10, sa: 0.16, curve: 0.7, noise: 0.55 },
  { name: '2 · Range compression', desc: 'A matched filter collapses the chirp: sharp in range, still streaked along azimuth.', sr: 0.012, sa: 0.16, curve: 0.7, noise: 0.32 },
  { name: '3 · Azimuth FFT', desc: 'Slow time becomes Doppler; range migration bends each target into a curve.', sr: 0.012, sa: 0.15, curve: 1.0, noise: 0.22 },
  { name: '4 · Range-cell migration', desc: 'Interpolation straightens the curves so each target sits at one range.', sr: 0.012, sa: 0.15, curve: 0.0, noise: 0.18 },
  { name: '5 · Azimuth compression', desc: 'A second matched filter focuses each target along azimuth to a point.', sr: 0.012, sa: 0.015, curve: 0.0, noise: 0.12 },
  { name: '6 · Focused image', desc: 'The destroyer emerges, sharp in both range and azimuth.', sr: 0.006, sa: 0.008, curve: 0.0, noise: 0.03 },
];

function shipPoints() {
  const p = [];
  // hull
  for (let i = 0; i <= 20; i++) p.push([0.26 + i / 20 * 0.48, 0.60, 1]);
  // deck line
  for (let i = 0; i <= 16; i++) p.push([0.30 + i / 16 * 0.40, 0.55, 0.8]);
  // superstructure blocks
  for (const [x0, x1, y] of [[0.40, 0.50, 0.50], [0.42, 0.47, 0.46], [0.55, 0.62, 0.51]]) {
    for (let i = 0; i <= 6; i++) p.push([x0 + i / 6 * (x1 - x0), y, 0.9]);
  }
  // mast + funnel
  p.push([0.45, 0.42, 1], [0.45, 0.40, 0.7], [0.58, 0.47, 0.9], [0.34, 0.57, 1], [0.66, 0.58, 1]);
  return p;
}
const SHIP = shipPoints();
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5; return s - Math.floor(s); };

export default class RangeDoppler extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'stage', label: 'Processing stage', min: 1, max: 6, step: 1, value: 1, format: (v) => `${v} / 6` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    const S = STAGES[this.params.stage - 1];
    g.fillStyle = '#0b0e14'; g.fillRect(0, 0, w, h);

    const pad = 16, top = 40, imgW = w - pad * 2, imgH = h - top - 54;
    const nx = 150, ny = Math.round(nx * imgH / imgW);
    const cw = imgW / nx, ch = imgH / ny;

    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const px = (ix + 0.5) / nx, py = (iy + 0.5) / ny;
        let v = 0;
        for (const [tx, ty, amp] of SHIP) {
          const dx = px - tx;
          const ybend = ty + S.curve * (dx * dx) * 2.4;
          const dy = py - ybend;
          v += amp * Math.exp(-(dx * dx) / (2 * S.sa * S.sa)) * Math.exp(-(dy * dy) / (2 * S.sr * S.sr));
        }
        v = v * 0.9 + S.noise * hash(ix, iy) * hash(iy * 3 + 1, ix);
        v = Math.min(1, v);
        const r = Math.round(10 + v * 120), gg = Math.round(20 + v * 190), b = Math.round(40 + v * 215);
        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.fillRect(pad + ix * cw, top + iy * ch, cw + 0.7, ch + 0.7);
      }
    }
    g.strokeStyle = rgba('#ffffff', 0.15); g.strokeRect(pad, top, imgW, imgH);

    // axis labels
    g.fillStyle = 'rgba(200,210,225,0.7)'; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText(this.params.stage >= 3 && this.params.stage <= 4 ? 'Doppler →' : 'azimuth →', pad + imgW / 2, top + imgH + 16);
    g.save(); g.translate(pad - 4, top + imgH / 2); g.rotate(-Math.PI / 2); g.fillText('range', 0, 0); g.restore();

    // stage header + description
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 14px ${FONT}`;
    g.fillText(S.name, pad, 26);
    g.fillStyle = 'rgba(200,210,225,0.85)'; g.font = `12px ${FONT}`;
    g.fillText(S.desc, pad, h - 12);
  }
}
