// @ts-check
// Part 3 — Interferometric SAR. Comparing the phase of two looks at the same
// ground turns radar into a ruler: fringes of wrapped phase count elevation
// (topography) or millimetre-to-centimetre line-of-sight motion (deformation),
// and where the two looks stop agreeing — coherence drops — something on the
// ground has changed. Same phase the along-track figure used, read across-track.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const LAMBDA_CM = 5.6;                 // C-band; one fringe = λ/2 of LOS motion
const FRINGE_CM = LAMBDA_CM / 2;       // 2.8 cm per deformation fringe

export default class InsarFringes extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'mode', label: 'Interferogram',
      options: [['Topography', 'topo'], ['Deformation', 'deform'], ['Coherence', 'coh']], value: 'topo' },
    { type: 'range', name: 'strength', label: 'Signal', min: 1, max: 8, step: 1, value: 4, format: (v) => `${v}×` },
  ];

  init() {
    this.buf = document.createElement('canvas');
    super.init();
  }

  onResize() {
    super.onResize();     // sizes the canvas; its draw() is a no-op until _layout runs
    this._layout();
    this.draw();          // static figure: this is the only draw on mount
  }

  _layout() {
    const narrow = this.w < 480;
    this.mapY = narrow ? 4 : 6;
    this.mapH = this.h - (narrow ? 52 : 60);
    this.cell = narrow ? 3 : 2;
    this.gw = Math.max(2, Math.ceil(this.w / this.cell));
    this.gh = Math.max(2, Math.ceil(this.mapH / this.cell));
    this.buf.width = this.gw; this.buf.height = this.gh;
    this.bufG = this.buf.getContext('2d');
    this.img = this.bufG.createImageData(this.gw, this.gh);
  }

  // Elevation-like field (a peak plus a ridge), normalised ~0..1.
  _topo(u, v) {
    const peak = Math.exp(-(((u - 0.42) ** 2 + (v - 0.44) ** 2) / 0.02));
    const ridge = 0.5 * Math.exp(-(((v - 0.72) ** 2) / 0.006));
    return peak + ridge;
  }

  // Subsidence bowl (negative), normalised ~ -1..0.
  _bowl(u, v) {
    return -Math.exp(-(((u - 0.56) ** 2 + (v - 0.56) ** 2) / 0.03));
  }

  // Coherence 0..1: low over a vegetation band and a disturbed blob.
  _coh(u, v) {
    let g = 0.95;
    const veg = Math.exp(-(((v - 0.28) ** 2) / 0.004));      // a decorrelated band
    const blob = Math.exp(-(((u - 0.72) ** 2 + (v - 0.66) ** 2) / 0.004));
    g -= 0.8 * veg + 0.85 * blob;
    return Math.max(0.04, g);
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g || !this.bufG) return;
    const narrow = w < 480;
    g.fillStyle = c.figBg; g.fillRect(0, 0, w, h);

    const mode = this.params.mode, s = this.params.strength;
    const motionCm = s * 2;                       // peak LOS motion in deform mode
    const data = this.img.data;
    for (let gy = 0; gy < this.gh; gy++) {
      const v = gy / this.gh;
      for (let gx = 0; gx < this.gw; gx++) {
        const u = gx / this.gw;
        let phase, coh = 1;
        if (mode === 'topo') {
          phase = s * 5 * Math.PI * this._topo(u, v);
        } else if (mode === 'deform') {
          phase = (motionCm / FRINGE_CM) * 2 * Math.PI * -this._bowl(u, v);
        } else {
          coh = this._coh(u, v);
          phase = s * 5 * Math.PI * this._topo(u, v);
          // decorrelation scrambles the phase in proportion to (1 - coherence)
          phase += (1 - coh) * 12 * (hash(gx * 131 + gy * 977) - 0.5) * Math.PI;
        }
        const [r, gg, b] = fringeColor(phase, coh);
        const q = (gy * this.gw + gx) * 4;
        data[q] = r; data[q + 1] = gg; data[q + 2] = b; data[q + 3] = 255;
      }
    }
    this.bufG.putImageData(this.img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(this.buf, 0, this.mapY, w, this.mapH);

    // colour wheel legend (phase is cyclic)
    const lx = narrow ? 40 : 54, ly = this.mapY + this.mapH + (narrow ? 22 : 28), rr = narrow ? 9 : 11;
    for (let a = 0; a < 40; a++) {
      const ph = (a / 40) * 2 * Math.PI;
      const [r, gg, b] = fringeColor(ph, 1);
      g.strokeStyle = `rgb(${r},${gg},${b})`; g.lineWidth = 3;
      g.beginPath(); g.arc(lx, ly, rr, ph, ph + 0.18); g.stroke();
    }
    g.fillStyle = c.muted; g.font = `${narrow ? 9 : 10}px ${FONT}`; g.textAlign = 'left';
    g.fillText('one colour cycle = one fringe', lx + rr + 8, ly - 3);

    // per-mode readout
    g.font = `700 ${narrow ? 11 : 13}px ${FONT}`; g.fillStyle = c.ink; g.textAlign = 'left';
    let line;
    if (mode === 'topo') line = 'each fringe steps up the terrain — count them to rebuild the height';
    else if (mode === 'deform') line = `each fringe = ${FRINGE_CM} cm of motion · peak here ≈ ${motionCm} cm from two passes`;
    else line = 'fringes only mean anything where the two looks still agree — grey is decorrelated';
    g.fillText(line, lx + rr + 8, ly + (narrow ? 11 : 13));
  }
}

// Wrapped phase -> cyclic color (HSV hue = phase). Coherence fades to grey.
function fringeColor(phase, coh) {
  let hue = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
  const [r, g, b] = hsv2rgb(hue, 0.72 * coh, 0.55 + 0.35 * coh);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hsv2rgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

const hash = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
