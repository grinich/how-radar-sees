// @ts-check
// Ch4 — Beamforming, watched directly. Every element radiates the same wave;
// the animated field is the instantaneous sum, so the viewer literally sees
// crests align into a steerable front. One element = circular ripples; many
// elements + a phase gradient = a tilted beam. Complements the polar-pattern
// figure, which shows the time-averaged result of this mechanism.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const TWO_PI = Math.PI * 2;
// Sine lookup table — the field loop runs ~10^5 evaluations per frame.
const SIN_N = 4096;
const SIN = new Float32Array(SIN_N);
for (let i = 0; i < SIN_N; i++) SIN[i] = Math.sin((i / SIN_N) * TWO_PI);
// JS bitwise AND on a negative int32 still yields the positive residue mod 2^n.
const fsin = (ph) => SIN[(ph * (SIN_N / TWO_PI)) & (SIN_N - 1)];

function hexRgb(hex) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return Number.isNaN(r) ? [128, 128, 128] : [r, g, b];
}

export default class Beamforming extends Canvas2DFigure {
  mode = 'animated';

  controlsSchema = [
    { type: 'range', name: 'elements', label: 'Elements', min: 1, max: 12, step: 1, value: 8, format: (v) => `${v}` },
    { type: 'range', name: 'steer', label: 'Steering', min: -45, max: 45, step: 1, value: 0, format: (v) => `${v}°` },
  ];

  init() {
    // Created before super.init(), which triggers the first onResize/_buildGrid.
    this.t = 0;
    this.field = document.createElement('canvas');
    super.init();
  }

  onResize() {
    super.onResize();
    this._buildGrid();
    this.draw();
  }

  onChange(name) {
    if (name === 'elements') this._buildGrid();
    this.draw();
  }

  /** Precompute each element's k·distance per field cell (steering only adds a phase). */
  _buildGrid() {
    if (!this.w || !this.h) return;
    const narrow = this.w < 480;
    this.cell = narrow ? 4 : 3;              // CSS px per field cell
    this.lambda = narrow ? 20 : 26;          // wavelength in CSS px
    this.gw = Math.max(2, Math.ceil(this.w / this.cell));
    this.gh = Math.max(2, Math.ceil((this.h - 24) / this.cell)); // bottom strip for labels
    this.field.width = this.gw;
    this.field.height = this.gh;
    this.fieldG = this.field.getContext('2d');
    this.img = this.fieldG.createImageData(this.gw, this.gh);

    const N = this.params.elements;
    const k = TWO_PI / this.lambda;
    const spacing = this.lambda / 2;         // the λ/2 rule from the prose
    const exCss = (i) => this.w / 2 + (i - (N - 1) / 2) * spacing;
    const eyCss = this.gh * this.cell - 6;   // element row near the bottom of the field
    this.elems = Array.from({ length: N }, (_, i) => ({ x: exCss(i), y: eyCss }));

    // kd[i] is a Float32Array over the grid.
    this.kd = this.elems.map((e) => {
      const arr = new Float32Array(this.gw * this.gh);
      let p = 0;
      for (let gy = 0; gy < this.gh; gy++) {
        const y = (gy + 0.5) * this.cell;
        for (let gx = 0; gx < this.gw; gx++, p++) {
          const x = (gx + 0.5) * this.cell;
          arr[p] = k * Math.hypot(x - e.x, y - e.y);
        }
      }
      return arr;
    });
  }

  update(dt) {
    this.t += dt;
    this.draw();
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g || !this.kd) return;
    g.clearRect(0, 0, w, h);
    g.fillStyle = c.figBg;
    g.fillRect(0, 0, w, h);

    const N = this.params.elements;
    const th0 = (this.params.steer * Math.PI) / 180;
    const k = TWO_PI / this.lambda;
    const spacing = this.lambda / 2;
    // Phase gradient: element i sits further +x, so advancing its phase by
    // +k·x_i·sinθ0 makes all crests align along the θ0 direction.
    const phi = this.elems.map((_, i) => k * spacing * i * Math.sin(th0));
    const wt = this.t * TWO_PI * 0.8; // ~0.8 wave cycles per second

    const crest = hexRgb(c.echoCol), trough = hexRgb(c.txCol);
    const data = this.img.data;
    const cells = this.gw * this.gh;
    const norm = 1 / Math.sqrt(N); // keep the pattern visible at any element count
    for (let p = 0; p < cells; p++) {
      let v = 0;
      for (let i = 0; i < N; i++) v += fsin(this.kd[i][p] + phi[i] - wt);
      v *= norm;
      const a = Math.min(1, Math.abs(v) * 0.85);
      const col = v > 0 ? crest : trough;
      const q = p * 4;
      data[q] = col[0]; data[q + 1] = col[1]; data[q + 2] = col[2];
      data[q + 3] = (a * a * 255) | 0;
    }
    this.fieldG.putImageData(this.img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.field, 0, 0, this.gw * this.cell, this.gh * this.cell);

    // Steering direction from the array centre.
    const cx = w / 2, cy = this.gh * this.cell - 6;
    const R = Math.min(h * 0.85, w * 0.48);
    g.strokeStyle = rgba(c.ink, 0.45); g.setLineDash([5, 5]); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(th0) * R, cy - Math.cos(th0) * R);
    g.stroke(); g.setLineDash([]);

    // Elements.
    for (const e of this.elems) {
      g.fillStyle = c.ink;
      g.beginPath(); g.arc(e.x, e.y, 3.5, 0, TWO_PI); g.fill();
    }

    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText(
      N === 1 ? 'one element — ripples go everywhere' : 'crests align along the beam; elsewhere they cancel',
      10, h - 8,
    );
  }

  teardown() {
    super.teardown();
    this.kd = null;
  }
}
