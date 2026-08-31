// @ts-check
// Ch2 — Real-aperture resolution λ/D. The same scene as an optical camera sees it
// (millions of pixels) vs a real-aperture radar (angular resolution λ/D → a
// handful of fat pixels). Grow the antenna or shorten the wavelength to sharpen.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const BANDS = { L: 1.3, S: 2, X: 10, Ku: 14 };
const FOV = 0.10; // scene angular extent (rad) — fixed

// continuous scene brightness in [0,1] over the unit square (a field with vehicles)
function scene(u, v) {
  let b = 0.18 + 0.05 * Math.sin(u * 20) * Math.sin(v * 18);
  if (v > 0.44 && v < 0.56) b = 0.34;                 // a road
  const veh = [[0.30, 0.50], [0.42, 0.50], [0.54, 0.50], [0.66, 0.49]];
  for (const [vx, vy] of veh) if (Math.abs(u - vx) < 0.025 && Math.abs(v - vy) < 0.02) b = 0.95;
  if (u > 0.68 && u < 0.86 && v > 0.15 && v < 0.34) b = 0.62; // building
  if (u > 0.12 && u < 0.24 && v > 0.66 && v < 0.82) b = 0.5;  // field patch
  return Math.max(0, Math.min(1, b));
}

export default class OnePixel extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'diam', label: 'Antenna size', min: 0.03, max: 6, step: 0.03, value: 0.6, format: (v) => `${v.toFixed(2)} m` },
    { type: 'segmented', name: 'band', label: 'Band', options: [['L', 'L'], ['S', 'S'], ['X', 'X'], ['Ku', 'Ku']], value: 'X' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const lam = 0.3 / BANDS[this.band()] ; // wavelength (m), c≈0.3 Gm/s in these units
    const theta = lam / this.params.diam;  // angular resolution (rad)
    const pixels = Math.max(1, Math.round(FOV / theta));

    const pad = 16, gap = 24, top = 40;
    const panel = Math.min((w - pad * 2 - gap) / 2, h - top - 40);
    const oy = top, ox1 = (w - panel * 2 - gap) / 2, ox2 = ox1 + panel + gap;

    drawScenePanel(g, ox1, oy, panel, 80, c);   // optical
    drawScenePanel(g, ox2, oy, panel, pixels, c); // radar

    g.textAlign = 'center'; g.font = `600 13px ${FONT}`;
    g.fillStyle = c.ink; g.fillText('Optical camera', ox1 + panel / 2, oy - 12);
    g.fillStyle = pixels >= 8 ? c.goodCol : c.badCol; g.fillText('Real-aperture radar', ox2 + panel / 2, oy - 12);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`;
    g.fillText('millions of pixels', ox1 + panel / 2, oy + panel + 18);
    g.fillText(`${pixels} × ${pixels} pixels`, ox2 + panel / 2, oy + panel + 18);

    g.textAlign = 'left'; g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    g.fillText(`angular resolution  λ/D = ${(theta * 1000).toFixed(1)} mrad   ·   ${this.params.diam.toFixed(2)} m antenna at ${this.band()}-band`, ox1, h - 8);
  }

  band() { return this.params.band; }
}

function drawScenePanel(g, x, y, size, nx, c) {
  const n = Math.max(1, Math.round(nx));
  const cell = size / n;
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const b = scene((ix + 0.5) / n, (iy + 0.5) / n);
    const v = Math.round(20 + b * 210);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x + ix * cell, y + iy * cell, cell + 0.6, cell + 0.6);
  }
  g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1; g.strokeRect(x, y, size, size);
}
