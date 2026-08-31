// @ts-check
// Ch2 — Time-domain back-projection. Each pulse contributes to every pixel by its
// range; matched returns add coherently (bright), mismatched ones cancel. Watch
// the image build pulse by pulse as the satellite sweeps.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const rnd = (i) => { const s = Math.sin(i * 57.13) * 43758.5; return s - Math.floor(s); };
// true scatterers (u,v) in the image
const TARGETS = [[0.30, 0.40], [0.40, 0.40], [0.50, 0.40], [0.50, 0.55], [0.50, 0.70], [0.66, 0.62]];
function targetVal(u, v) {
  let b = 0;
  for (const [tx, ty] of TARGETS) { const d = (u - tx) ** 2 + (v - ty) ** 2; b = Math.max(b, Math.exp(-d / (2 * 0.018 * 0.018))); }
  return b;
}

export default class BackProjection extends Canvas2DFigure {
  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0b0e14'; g.fillRect(0, 0, w, h);
    const pad = 16, top = 40, iw = w - pad * 2, ih = h - top - 44;

    const cycle = this.t % 7;
    const p = Math.min(1, cycle / 4.5);         // build progress
    const pulse = Math.round(p * 220);

    const nx = 90, ny = Math.round(nx * ih / iw), cw = iw / nx, ch = ih / ny;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const u = (ix + 0.5) / nx, v = (iy + 0.5) / ny;
      const sig = targetVal(u, v) * p;
      const bg = (rnd(ix * 3 + iy) - 0.5) * 0.9 * (1 - p) * 0.9; // clutter that averages away
      const val = Math.max(0, Math.min(1, sig + Math.abs(bg) * 0.5));
      const r = Math.round(10 + val * 120), gg = Math.round(18 + val * 190), b = Math.round(36 + val * 215);
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(pad + ix * cw, top + iy * ch, cw + 0.7, ch + 0.7);
    }
    g.strokeStyle = rgba('#ffffff', 0.12); g.strokeRect(pad, top, iw, ih);

    // satellite sweeping the top + back-projection rays to a sample pixel
    const satU = (cycle / 7);
    const satX = pad + satU * iw, satY = top - 14;
    g.fillStyle = '#ddd'; g.fillRect(satX - 7, satY - 4, 14, 8);
    g.strokeStyle = 'rgba(120,180,240,0.25)'; g.lineWidth = 1;
    for (const [tx, ty] of TARGETS) { g.beginPath(); g.moveTo(satX, satY); g.lineTo(pad + tx * iw, top + ty * ih); g.stroke(); }

    // header (top) + status (bottom, clear of the sweeping satellite)
    g.fillStyle = '#fff'; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText('Back-projection', pad, 24);
    g.fillStyle = p < 1 ? 'rgba(200,210,225,0.85)' : '#3ee08a'; g.font = `12px ${FONT}`; g.textAlign = 'left';
    g.fillText(p < 1 ? `summing pulse ${pulse} of 220…` : 'focused — matched returns added, clutter cancelled', pad, h - 12);
  }
}
