// @ts-check
// §1 — Radar reflectivity, shown as an actual radar image of a scene. Each surface
// is rendered at its σ⁰ for the chosen band, with the speckle that gives SAR its
// grain: water and asphalt go dark, metal and vehicles blaze, and forest changes
// character between X- and L-band (foliage penetration). Values are illustrative.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// σ⁰ (dB) per surface per band
const S0 = {
  water: { X: -20, C: -22, L: -25 },
  forest: { X: -8, C: -12, L: -17 },   // bright canopy at X, penetrated/darker at L
  field: { X: -11, C: -12, L: -13 },
  road: { X: -16, C: -17, L: -18 },
  urban: { X: 0, C: -2, L: -4 },
  vehicle: { X: 5, C: 4, L: 2 },
};
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// which surface is at scene coordinate (u,v)
function surfaceAt(u, v) {
  if (u < 0.30 && v > 0.12 && v < 0.9) return 'water';          // lake on the left
  if (v > 0.47 && v < 0.53) {                                   // road across the middle
    const onVeh = [0.40, 0.52, 0.64, 0.75].some((x) => Math.abs(u - x) < 0.012);
    return onVeh ? 'vehicle' : 'road';
  }
  if (u > 0.60 && v < 0.42) return 'forest';                    // forest top-right
  if (u > 0.62 && v > 0.60) {                                   // urban block, with metal glints
    const glint = (Math.floor(u * 40) % 3 === 0) && (Math.floor(v * 40) % 3 === 0);
    return glint ? 'vehicle' : 'urban';
  }
  return 'field';
}
const LABELS = [
  { u: 0.15, v: 0.5, t: 'water' }, { u: 0.44, v: 0.28, t: 'field' },
  { u: 0.80, v: 0.24, t: 'forest' }, { u: 0.80, v: 0.78, t: 'urban' }, { u: 0.5, v: 0.44, t: 'road' },
];

export default class MaterialExplorer extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'band', label: 'Band', options: [['X 10GHz', 'X'], ['C 5GHz', 'C'], ['L 1.3GHz', 'L']], value: 'X' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const band = this.params.band;
    const pad = 14, top = 34, iw = w - pad * 2, ih = h - top - 40;
    const nx = 190, ny = Math.round(nx * ih / iw), cw = iw / nx, ch = ih / ny;

    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const u = (ix + 0.5) / nx, vv = (iy + 0.5) / ny;
      const s0 = S0[surfaceAt(u, vv)][band];
      const base = Math.max(0.02, Math.min(1, (s0 + 30) / 35));       // σ⁰ → brightness
      const speckle = 0.45 + 0.85 * (-Math.log(Math.max(1e-3, rnd(ix * 3 + iy * 7)))); // radar speckle
      const val = Math.max(0, Math.min(1, base * speckle));
      const g8 = Math.round(val * 235);
      g.fillStyle = `rgb(${g8},${g8},${g8})`;
      g.fillRect(pad + ix * cw, top + iy * ch, cw + 0.7, ch + 0.7);
    }
    g.strokeStyle = rgba(c.ink, 0.2); g.strokeRect(pad, top, iw, ih);

    // labels
    g.font = `600 12px ${FONT}`; g.textAlign = 'center';
    for (const L of LABELS) {
      const x = pad + L.u * iw, y = top + L.v * ih;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(L.t, x + 1, y + 1);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillText(L.t, x, y);
    }

    g.textAlign = 'left'; g.fillStyle = c.ink; g.font = `700 14px ${FONT}`;
    g.fillText(`Radar image at ${band}-band`, pad, 24);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.textAlign = 'right';
    g.fillText(band === 'L' ? 'long waves penetrate the canopy — forest darkens' : band === 'X' ? 'short waves scatter off leaves — forest is bright' : 'water dark · metal bright', w - pad, 24);
    g.textAlign = 'left'; g.fillStyle = c.muted; g.font = `11px ${FONT}`;
    g.fillText('bright = strong return · speckle is real radar grain', pad, h - 10);
  }
}
