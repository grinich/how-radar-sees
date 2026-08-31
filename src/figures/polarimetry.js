// @ts-check
// §X — Polarimetry: reading the scene by scattering mechanism. One top-down scene,
// three views. A single-polarization radar (HH) shows only brightness, so forest and
// city collapse to similar grays. Cross-pol (HV) responds to depolarizing volume
// scattering and lights up vegetation. Pauli-style RGB false-colors each region by
// HOW it bounced — surface (blue), double-bounce (red), volume (green) — and the map
// suddenly reads by material. Values are illustrative.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, roundRect, FONT } from '../core/draw.js';

// Deterministic speckle noise (no Math.random, so the grain is stable across modes).
const rnd = (i) => { const s = Math.sin(i * 33.7) * 43758.5; return s - Math.floor(s); };

// Per-region backscatter, 0..1. HH = like-pol total power; HV = cross-pol (depolarization).
const HH = { soil: 0.42, forest: 0.60, city: 0.82, water: 0.035, ship: 0.97 };
const HV = { soil: 0.13, forest: 0.80, city: 0.24, water: 0.02, ship: 0.30 };
// RGB brightness of the mechanism color, 0..1.
const RGBI = { soil: 0.72, forest: 0.82, city: 0.86, water: 0.05, ship: 1.0 };
// Dominant scattering mechanism per region.
const MECH = { soil: 'surface', forest: 'volume', city: 'double', ship: 'double', water: 'mirror' };
// Vivid Pauli-style colors, hue-matched to the essay's semantic tokens
// (surface≈echoCol blue, double-bounce≈badCol red, volume≈targetCol green).
const SURF = [46, 120, 235], DBL = [232, 64, 58], VOL = [38, 196, 104];
const COL = { surface: SURF, double: DBL, volume: VOL, mirror: [14, 18, 26] };

// Which region sits at scene coordinate (u,v), top-down map.
function regionAt(u, v) {
  const shore = 0.62 + 0.035 * Math.sin(u * 6.3 + 0.5);       // gently wavy coastline
  if (v > shore) {                                            // calm water fills the bottom
    if (Math.abs(u - 0.30) < 0.05 && Math.abs(v - 0.785) < 0.032) return 'ship';
    return 'water';
  }
  if (u > 0.55 && v < 0.47) return 'forest';                  // forest, top-right
  if (u < 0.40 && v < 0.42) {                                 // city district, left
    const gx = ((u / 0.40) * 6) % 1, gy = ((v / 0.42) * 5) % 1;
    if (gx < 0.15 || gy < 0.15) return 'soil';               // streets scatter like a surface
    return 'city';
  }
  return 'soil';                                             // open soil / bare field
}

const LABELS = [
  { u: 0.21, v: 0.22, t: 'city', m: 'double-bounce' },
  { u: 0.79, v: 0.20, t: 'forest', m: 'volume' },
  { u: 0.49, v: 0.30, t: 'bare field', m: 'surface' },
  { u: 0.73, v: 0.83, t: 'calm water' },
  { u: 0.30, v: 0.70, t: 'ship' },
];

export default class Polarimetry extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'mode', label: 'Polarization', options: [['HH', 'hh'], ['HV (cross-pol)', 'hv'], ['Pauli RGB', 'rgb']], value: 'hh' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const mode = this.params.mode;
    const nrw = w < 480;
    const pad = nrw ? 10 : 14;
    const top = nrw ? 22 : 30;
    const bot = nrw ? 24 : 36;
    const iw = w - pad * 2;
    const ih = Math.max(20, h - top - bot);

    // Radar raster: one cell per grid point, speckle multiplied in so it reads as SAR.
    const nx = nrw ? 120 : 180;
    const ny = Math.max(1, Math.round(nx * ih / iw));
    const cw = iw / nx, ch = ih / ny;
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const u = (ix + 0.5) / nx, vv = (iy + 0.5) / ny;
        const reg = regionAt(u, vv);
        const sp = 0.5 + 0.85 * (-Math.log(Math.max(1e-3, rnd(ix + iy * 197))));   // exponential speckle
        const lf = 0.88 + 0.24 * rnd(Math.floor(u * 12) * 1.7 + Math.floor(vv * 12) * 9.3); // patchiness
        let fill;
        if (mode === 'rgb') {
          if (reg === 'water') {
            const n = Math.round(5 * Math.min(2, sp));
            fill = `rgb(${10 + n},${15 + n},${22 + n})`;
          } else {
            const col = COL[MECH[reg]];
            const f = Math.max(0.16, Math.min(1.18, RGBI[reg] * sp * lf));
            fill = `rgb(${Math.min(255, Math.round(col[0] * f))},${Math.min(255, Math.round(col[1] * f))},${Math.min(255, Math.round(col[2] * f))})`;
          }
        } else {
          const base = (mode === 'hv' ? HV : HH)[reg];
          const val = Math.max(0, Math.min(1, base * sp * lf));
          const g8 = Math.round(val * 235);
          fill = `rgb(${g8},${g8},${g8})`;
        }
        g.fillStyle = fill;
        g.fillRect(pad + ix * cw, top + iy * ch, cw + 0.8, ch + 0.8);
      }
    }
    g.strokeStyle = rgba(c.ink, 0.18); g.strokeRect(pad, top, iw, ih);

    // Ship marker ring, so the bright point on the water reads as a target.
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1;
    g.beginPath(); g.arc(pad + 0.30 * iw, top + 0.785 * ih, nrw ? 7 : 9, 0, Math.PI * 2); g.stroke();

    // Region labels with a dark halo for legibility over any fill.
    g.textAlign = 'center';
    for (const L of LABELS) {
      const x = pad + L.u * iw, y = top + L.v * ih;
      g.font = `600 ${nrw ? 10 : 12}px ${FONT}`;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(L.t, x + 1, y + 1);
      g.fillStyle = 'rgba(255,255,255,0.96)'; g.fillText(L.t, x, y);
      if (!nrw && L.m) {
        g.font = `500 10px ${FONT}`;
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillText(L.m, x + 1, y + 13);
        g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillText(L.m, x, y + 12);
      }
    }

    // Legend card (RGB mode only): which color means which mechanism.
    if (mode === 'rgb') {
      const items = [['surface', 'surface', SURF], ['double-bounce', 'double', DBL], ['volume', 'volume', VOL]];
      const fs = nrw ? 10 : 11;
      g.font = `600 ${fs}px ${FONT}`;
      const sw = nrw ? 9 : 11, rowH = nrw ? 15 : 17;
      let tw = 0;
      for (const it of items) tw = Math.max(tw, g.measureText(nrw ? it[1] : it[0]).width);
      const cardW = 8 + sw + 6 + tw + 8, cardH = items.length * rowH + 8;
      const cx = pad + iw - cardW - 8, cy = top + 8;
      roundRect(g, cx, cy, cardW, cardH, 6);
      g.fillStyle = 'rgba(10,12,16,0.62)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.stroke();
      g.textAlign = 'left';
      for (let i = 0; i < items.length; i++) {
        const ry = cy + 7 + i * rowH, col = items[i][2];
        g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        roundRect(g, cx + 8, ry, sw, sw, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.92)'; g.font = `600 ${fs}px ${FONT}`;
        g.fillText(nrw ? items[i][1] : items[i][0], cx + 8 + sw + 6, ry + sw - 1);
      }
    }

    // Title (top-left) + polarization descriptor (top-right).
    const titles = { hh: 'Single-pol (HH): brightness only', hv: 'Cross-pol (HV): volume scattering', rgb: 'Pauli RGB: scattering mechanism' };
    g.textAlign = 'left'; g.fillStyle = c.ink; g.font = `700 ${nrw ? 12 : 14}px ${FONT}`;
    g.fillText(titles[mode], pad, nrw ? 16 : 22);
    if (!nrw) {
      const sub = { hh: 'like-polarized return', hv: 'cross-polarized return', rgb: 'false color by how it bounced' };
      g.textAlign = 'right'; g.fillStyle = c.muted; g.font = `12px ${FONT}`;
      g.fillText(sub[mode], w - pad, 22);
    }

    // Takeaway (changes per mode) + supporting note.
    const take = {
      hh: "Forest and city read as similar grays — brightness alone can't separate them.",
      hv: 'Cross-pol isolates the forest; smooth surfaces and city go dark.',
      rgb: 'Mechanism color splits soil, forest, and city at a glance.',
    };
    g.textAlign = 'left'; g.fillStyle = c.accent; g.font = `700 ${nrw ? 11 : 13}px ${FONT}`;
    g.fillText(take[mode], pad, h - (nrw ? 9 : 22));
    if (!nrw) {
      const sec = {
        hh: 'bright = strong return · speckle is real radar grain',
        hv: 'depolarized echo grows with volume scattering',
        rgb: 'blue = surface · red = double-bounce · green = volume',
      };
      g.fillStyle = c.muted; g.font = `11px ${FONT}`;
      g.fillText(sec[mode], pad, h - 8);
    }
  }
}
