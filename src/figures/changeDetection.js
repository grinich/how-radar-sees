// @ts-check
// Coherent change detection. Two SAR passes of the same scene. Amplitude-change
// detection catches a bright new return (a vehicle that appeared) but misses
// subtle ground disturbance; coherence — how well the fine speckle pattern
// correlates between passes — reveals disturbed earth (a track) that amplitude
// never sees. Four views of one scene: Pass 1, Pass 2, |A2−A1|, and coherence.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// Deterministic pseudo-random (Math.random is unavailable in this harness).
const rnd = (i) => { const s = Math.sin(i * 33.7) * 43758.5; return s - Math.floor(s); };
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = cl((x - a) / ((b - a) || 1), 0, 1); return t * t * (3 - 2 * t); };

// hex -> [r,g,b]
const toRGB = (hex) => {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return Number.isNaN(r) ? [136, 136, 136] : [r, g, b];
};

// Sample a piecewise-linear colour ramp: stops = [[pos, [r,g,b]], ...].
function ramp(stops, t) {
  t = cl(t, 0, 1);
  for (let k = 1; k < stops.length; k++) {
    if (t <= stops[k][0]) {
      const [p0, c0] = stops[k - 1], [p1, c1] = stops[k];
      const f = (t - p0) / ((p1 - p0) || 1);
      return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * f)},${Math.round(c0[1] + (c1[1] - c0[1]) * f)},${Math.round(c0[2] + (c1[2] - c0[2]) * f)})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

// Distance from a point to a segment (px).
function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const t = c1 / c2;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

// Scene geometry in normalised panel coordinates (u,v in 0..1).
const VEH = { u: 0.76, v: 0.27 };                 // vehicle appears here in pass 2
const TRK = [[0.10, 0.66], [0.40, 1.06], [0.66, 0.62]]; // quadratic bezier control points

export default class ChangeDetection extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'mode', label: 'View', options: [['Pass 1', 'p1'], ['Pass 2', 'p2'], ['Amplitude change', 'amp'], ['Coherence', 'coh']], value: 'p1' },
  ];

  // Mean radar reflectivity of the static scene (fields, a road) at (u,v).
  _baseR(u, v) {
    let r = 0.33
      + 0.05 * Math.sin(u * 8.0 + 1.1)
      + 0.04 * Math.sin(v * 6.5 + 2.3)
      + 0.03 * Math.sin((u * 1.7 + v * 2.3) * 5.0 + 0.6);
    r += 0.06 * smooth(0.55, 0.15, v);          // the upper field is a brighter crop
    const rd = Math.abs(v - (0.24 + 0.17 * u)); // a bright road runs diagonally across the top
    if (rd < 0.03) r = 0.72 - 0.9 * rd;
    return cl(r, 0.12, 0.9);
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const nrw = w < 480;
    const mode = this.params.mode;
    const m = nrw ? 10 : 16;
    const topPad = nrw ? 22 : 28;
    const botPad = nrw ? 42 : 54;
    const x0 = m, y0 = topPad, iw = Math.max(1, w - m * 2), ih = Math.max(1, h - topPad - botPad);
    const font = (px, wt = '') => `${wt ? wt + ' ' : ''}${nrw ? Math.max(9, px - 2) : px}px ${FONT}`;

    // Colour ramps, seeded from the palette's semantic hues.
    const TX = toRGB(c.txCol), BAD = toRGB(c.badCol), ECHO = toRGB(c.echoCol);
    const WARM = [[0, [18, 15, 20]], [0.4, BAD], [0.7, TX], [1, [255, 236, 170]]]; // amplitude change (warm)
    const COOL = [[0, [13, 18, 26]], [0.4, ECHO], [0.72, [95, 185, 232]], [1, [210, 242, 255]]]; // coherence loss (cool)

    // Feature geometry in panel pixels.
    const vx = x0 + VEH.u * iw, vy = y0 + VEH.v * ih, rv = Math.min(iw, ih) * 0.055;
    const bz = (t, a, b, cc) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * cc;
    const tpts = [];
    let tminx = 1e9, tmaxx = -1e9, tminy = 1e9, tmaxy = -1e9;
    for (let s = 0; s <= 40; s++) {
      const t = s / 40;
      const px = x0 + bz(t, TRK[0][0], TRK[1][0], TRK[2][0]) * iw;
      const py = y0 + bz(t, TRK[0][1], TRK[1][1], TRK[2][1]) * ih;
      tpts.push([px, py]);
      tminx = Math.min(tminx, px); tmaxx = Math.max(tmaxx, px);
      tminy = Math.min(tminy, py); tmaxy = Math.max(tmaxy, py);
    }
    const trkCore = Math.min(iw, ih) * 0.012, trkFall = Math.min(iw, ih) * 0.05;
    const pad = trkFall + 2;

    const distTrack = (px, py) => {
      if (px < tminx - pad || px > tmaxx + pad || py < tminy - pad || py > tmaxy + pad) return 1e9;
      let d = 1e9;
      for (let k = 1; k < tpts.length; k++) {
        d = Math.min(d, distSeg(px, py, tpts[k - 1][0], tpts[k - 1][1], tpts[k][0], tpts[k][1]));
        if (d < trkCore) break;
      }
      return d;
    };

    // --- Image panel: dark, independent of theme (SAR imagery reads dark) ----
    g.fillStyle = '#0c1017';
    g.fillRect(x0, y0, iw, ih);
    g.save();
    g.beginPath(); g.rect(x0, y0, iw, ih); g.clip();

    const cell = nrw ? 7 : 6;
    const cols = Math.ceil(iw / cell), rows = Math.ceil(ih / cell);
    for (let j = 0; j < rows; j++) {
      const py = y0 + (j + 0.5) * cell, v = (py - y0) / ih;
      for (let i = 0; i < cols; i++) {
        const px = x0 + (i + 0.5) * cell, u = (px - x0) / iw;
        const idx = j * cols + i;

        // Mean reflectivity in each pass. The track changes NO mean amplitude;
        // only the vehicle does (it adds a bright new return in pass 2).
        const r1 = this._baseR(u, v);
        const dV = Math.hypot(px - vx, py - vy);
        const vk = cl((rv - dV) / rv, 0, 1);
        const vehAmp = 0.95 * Math.pow(vk, 0.7);
        const r2 = r1 + vehAmp;

        // Coherence: 1 = fine speckle identical between passes. Baseline is high
        // (stable ground), drops along the disturbed track and inside the
        // vehicle spot (new scatterers).
        let coh = 0.94 - 0.05 * rnd(idx + 701);
        const dT = distTrack(px, py);
        if (dT < trkFall) {
          const kk = cl((dT - trkCore) / (trkFall - trkCore), 0, 1);
          coh = Math.min(coh, 0.12 + 0.82 * kk + (rnd(idx + 13) - 0.5) * 0.12);
        }
        if (dV < rv * 1.35) coh = Math.min(coh, 0.05 + 0.85 * cl(dV / (rv * 1.2), 0, 1));
        coh = cl(coh, 0, 1);

        // Speckle: coherent cells keep the same fine pattern in pass 2;
        // decorrelated cells draw a fresh (statistically identical) realisation.
        const s1 = 0.35 + 1.3 * rnd(idx);
        const s2 = coh < 0.5 ? 0.35 + 1.3 * rnd(idx + 9001) : s1;

        let color;
        if (mode === 'p1' || mode === 'p2') {
          const p = (mode === 'p1' ? r1 * s1 : r2 * s2);
          const lum = Math.round(8 + 236 * cl(p / 1.15, 0, 1));
          color = `rgb(${lum},${lum},${lum})`;
        } else if (mode === 'amp') {
          // Multilooked amplitude change: mean-reflectivity difference. The
          // vehicle blazes; the track (no mean change) stays dark.
          const t = cl((r2 - r1) / 0.85, 0, 1) + 0.03 * rnd(idx + 55);
          color = ramp(WARM, t);
        } else {
          color = ramp(COOL, 1 - coh); // low coherence -> bright
        }
        g.fillStyle = color;
        g.fillRect(x0 + i * cell, y0 + j * cell, cell + 0.7, cell + 0.7);
      }
    }
    g.restore();

    // Callouts (desktop only — kept off the narrow layout to stay legible).
    if (!nrw) {
      if (mode === 'p2' || mode === 'amp' || mode === 'coh') {
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.25;
        g.beginPath(); g.arc(vx, vy, rv * 1.35, 0, Math.PI * 2); g.stroke();
        this._tag(g, 'vehicle', vx, Math.max(y0 + 12, vy - rv * 1.35 - 6), nrw);
      }
      if (mode === 'coh') {
        const tp = tpts[13];
        this._tag(g, 'disturbed track', tp[0], tp[1] - 12, nrw);
      }
    }

    // Panel border.
    g.strokeStyle = rgba(c.rule, 0.6); g.lineWidth = 1;
    g.strokeRect(x0 + 0.5, y0 + 0.5, iw - 1, ih - 1);

    // --- Title (top-left) ---------------------------------------------------
    const titles = { p1: 'Pass 1 · amplitude', p2: 'Pass 2 · amplitude', amp: 'Amplitude change  |A₂ − A₁|', coh: 'Coherence' };
    g.fillStyle = c.ink; g.font = font(13, '700'); g.textAlign = 'left';
    g.fillText(titles[mode], x0, y0 - (nrw ? 8 : 10));

    // --- Legend -------------------------------------------------------------
    const legW = Math.min(iw * 0.5, nrw ? 130 : 190), legH = 8;
    const ly = y0 + ih + (nrw ? 10 : 14), lx = x0;
    const colorFn = mode === 'amp' ? (t) => ramp(WARM, t)
      : mode === 'coh' ? (t) => ramp(COOL, t)
      : (t) => { const l = Math.round(8 + 236 * t); return `rgb(${l},${l},${l})`; };
    const steps = 48;
    for (let s = 0; s < steps; s++) {
      g.fillStyle = colorFn(s / (steps - 1));
      g.fillRect(lx + (s / steps) * legW, ly, legW / steps + 1, legH);
    }
    g.strokeStyle = rgba(c.rule, 0.7); g.strokeRect(lx + 0.5, ly + 0.5, legW, legH);
    if (!nrw) {
      const ends = mode === 'amp' ? ['no change', 'strong']
        : mode === 'coh' ? ['stable', 'disturbed']
        : ['dark', 'bright'];
      g.fillStyle = c.muted; g.font = font(10); g.textAlign = 'left';
      g.fillText(ends[0], lx, ly + legH + 12);
      g.textAlign = 'right'; g.fillText(ends[1], lx + legW, ly + legH + 12);
    }

    // --- Takeaway (bottom) --------------------------------------------------
    const takeaway = {
      p1: nrw ? 'Pass 1 — the baseline scene.' : 'Two passes of one scene. This is pass 1 — the baseline.',
      p2: nrw ? 'Pass 2 — a vehicle appears.' : 'Pass 2 — a vehicle has appeared. The track is still invisible.',
      amp: nrw ? 'Amplitude sees the vehicle, not the track.' : 'Amplitude change flags the vehicle; the disturbed-earth track stays invisible.',
      coh: nrw ? 'Coherence reveals the hidden track.' : 'The disturbed-earth track appears only here — amplitude never saw it.',
    };
    g.fillStyle = mode === 'coh' ? c.goodCol : c.ink;
    g.font = font(12, '700'); g.textAlign = 'right';
    g.fillText(takeaway[mode], x0 + iw, h - (nrw ? 8 : 10));
  }

  _tag(g, text, x, y, nrw) {
    g.font = `${nrw ? 9 : 11}px ${FONT}`; g.textAlign = 'center';
    const tw = g.measureText(text).width;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(x - tw / 2 - 4, y - 10, tw + 8, 14);
    g.fillStyle = 'rgba(240,244,250,0.95)';
    g.fillText(text, x, y + 1);
  }
}
