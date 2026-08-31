// @ts-check
// Part 3 (go-deeper) — The ambiguity function. One picture that contains range
// resolution, velocity resolution, and the PRF dilemma at once: the radar's
// response spread over delay (range) and Doppler (velocity). A plain pulse is a
// broad blob; a chirp is a sheared knife-edge (range-Doppler coupling); a pulse
// train is a bed of nails whose spacing IS the ambiguity Part 3 wrestles with.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

export default class AmbiguityFunction extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'wave', label: 'Waveform',
      options: [['Plain pulse', 'pulse'], ['Chirp', 'chirp'], ['Pulse train', 'train']], value: 'chirp' },
    { type: 'range', name: 'knob', label: 'Knob', min: 1, max: 10, step: 1, value: 5, format: (v) => `${v}×` },
  ];

  init() {
    this.buf = document.createElement('canvas');
    super.init();
  }

  onResize() { super.onResize(); this._layout(); this.draw(); }

  _layout() {
    const narrow = this.w < 480;
    this.padL = narrow ? 30 : 40;
    this.padB = narrow ? 40 : 46;
    this.padT = narrow ? 20 : 24;
    this.padR = 10;
    this.plotW = Math.max(2, this.w - this.padL - this.padR);
    this.plotH = Math.max(2, this.h - this.padT - this.padB);
    this.cell = narrow ? 3 : 2;
    this.gw = Math.max(2, Math.ceil(this.plotW / this.cell));
    this.gh = Math.max(2, Math.ceil(this.plotH / this.cell));
    this.buf.width = this.gw; this.buf.height = this.gh;
    this.bufG = this.buf.getContext('2d');
    this.img = this.bufG.createImageData(this.gw, this.gh);
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g || !this.bufG) return;
    const narrow = w < 480;
    g.fillStyle = c.figBg; g.fillRect(0, 0, w, h);

    const wave = this.params.wave, knob = this.params.knob;
    const TAU_MAX = 2;          // delay window (pulse widths)
    const NU_MAX = 8;           // Doppler window (cycles per pulse width)
    const alpha = knob;         // chirp sweep rate (time-bandwidth)
    const PRF = 0.6 + knob * 0.55; // pulse-train PRF (1/pulsewidth units)
    const PRI = 1 / PRF, M = 8, Wp = 0.14;

    const data = this.img.data;
    const base = hexRgb(c.figBg), hot = hexRgb(c.accent);
    for (let gy = 0; gy < this.gh; gy++) {
      const nu = (0.5 - gy / this.gh) * 2 * NU_MAX;   // top = +Doppler
      for (let gx = 0; gx < this.gw; gx++) {
        const tau = (gx / this.gw - 0.5) * 2 * TAU_MAX;
        let v;
        if (wave === 'pulse') v = tri(tau) * sinc(nu * (1 - Math.abs(tau)));
        else if (wave === 'chirp') v = tri(tau) * sinc((nu + alpha * tau) * (1 - Math.abs(tau)));
        else v = trainDelay(tau, PRI, Wp) * dirichlet(nu, PRI, M);
        v = Math.min(1, Math.abs(v));
        const g2 = Math.pow(v, 0.6);           // gamma so faint lobes show
        const q = (gy * this.gw + gx) * 4;
        data[q] = base[0] + (hot[0] - base[0]) * g2 + (255 - hot[0]) * g2 * g2;
        data[q + 1] = base[1] + (hot[1] - base[1]) * g2 + (255 - hot[1]) * g2 * g2;
        data[q + 2] = base[2] + (hot[2] - base[2]) * g2 + (255 - hot[2]) * g2 * g2;
        data[q + 3] = 255;
      }
    }
    this.bufG.putImageData(this.img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.buf, this.padL, this.padT, this.plotW, this.plotH);

    // axes
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.strokeRect(this.padL, this.padT, this.plotW, this.plotH);
    g.fillStyle = c.muted; g.font = `${narrow ? 10 : 11}px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('delay  →  range', this.padL + this.plotW / 2, this.padT + this.plotH + (narrow ? 26 : 30));
    g.save();
    g.translate(narrow ? 10 : 13, this.padT + this.plotH / 2); g.rotate(-Math.PI / 2);
    g.fillText('Doppler  →  velocity', 0, 0); g.restore();

    // the unambiguous cell (pulse-train only): one PRI wide, one PRF tall
    if (wave === 'train') {
      const cx = this.padL + this.plotW / 2, cy = this.padT + this.plotH / 2;
      const halfTau = (PRI / (2 * TAU_MAX)) * this.plotW;
      const halfNu = (PRF / (2 * NU_MAX)) * this.plotH;
      g.strokeStyle = c.goodCol; g.setLineDash([4, 3]); g.lineWidth = 1.5;
      g.strokeRect(cx - halfTau, cy - halfNu, 2 * halfTau, 2 * halfNu);
      g.setLineDash([]);
    }

    // readout
    g.textAlign = 'left'; g.font = `700 ${narrow ? 10 : 12}px ${FONT}`; g.fillStyle = c.ink;
    let line;
    if (wave === 'pulse') line = 'a plain pulse: one broad blob — you cannot have sharp range and sharp velocity at once';
    else if (wave === 'chirp') line = 'a chirp: a sheared ridge — sharp, but a velocity looks like a range (range-Doppler coupling)';
    else line = 'a pulse train: peaks repeat every PRI in range, every PRF in velocity — the box is the only unambiguous window';
    wrapText(g, line, this.padL, this.padT - (narrow ? 8 : 9), this.plotW, narrow ? 11 : 13);
  }
}

const tri = (t) => Math.max(0, 1 - Math.abs(t));
function sinc(x) { const p = Math.PI * x; return Math.abs(p) < 1e-6 ? 1 : Math.sin(p) / p; }
function trainDelay(tau, PRI, Wp) {
  let m = 0;
  for (let k = -3; k <= 3; k++) m = Math.max(m, Math.max(0, 1 - Math.abs(tau - k * PRI) / Wp));
  return m;
}
function dirichlet(nu, PRI, M) {
  const s = Math.sin(Math.PI * nu * PRI);
  if (Math.abs(s) < 1e-6) return 1;
  return Math.abs(Math.sin(Math.PI * nu * PRI * M) / (M * s));
}
function hexRgb(hex) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return Number.isNaN(r) ? [20, 22, 26] : [r, g, b];
}
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; }
    else line = test;
  }
  g.fillText(line, x, yy);
}
