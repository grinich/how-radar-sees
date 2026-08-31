// @ts-check
// Ch3 — Space-time adaptive processing in the angle–Doppler plane. Stationary
// clutter lies along a diagonal ridge; the adaptive filter carves a null along it,
// letting a slow mover just off the ridge survive. Toggle STAP; steer the target.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

export default class StapCube extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'tv', label: 'Target velocity', min: -1, max: 1, step: 0.05, value: 0.18, format: (v) => `${(v * 40).toFixed(0)} m/s` },
    { type: 'range', name: 'width', label: 'Earth-rotation spread', min: 0.02, max: 0.16, step: 0.01, value: 0.06, format: (v) => `${Math.round(v * 100)}%` },
    { type: 'toggle', name: 'stap', label: 'STAP null', value: false },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0b0e14'; g.fillRect(0, 0, w, h);
    const pad = 40, top = 30, iw = w - pad - 20, ih = h - top - 44;
    const nx = 120, ny = Math.round(nx * ih / iw), cw = iw / nx, ch = ih / ny;
    const width = this.params.width, stap = this.params.stap;

    // target position in angle-doppler: angle ~ 0.3, doppler = its velocity offset from ridge
    const tAngle = 0.62, tDop = 0.5 + this.params.tv * 0.32;

    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const a = (ix + 0.5) / nx;               // angle 0..1
      const d = (iy + 0.5) / ny;               // doppler 0..1
      const ridge = 0.5 + (a - 0.5) * 0.8;     // clutter ridge line
      let clutter = Math.exp(-((d - ridge) ** 2) / (2 * width * width));
      if (stap) clutter *= (1 - Math.exp(-((d - ridge) ** 2) / (2 * (width * 0.5) ** 2)));
      // target blob
      const tgt = 0.9 * Math.exp(-(((a - tAngle) ** 2) + ((d - tDop) ** 2)) / (2 * 0.02 * 0.02));
      const v = Math.min(1, clutter * 0.8 + tgt);
      const r = Math.round(12 + v * 130), gg = Math.round(20 + v * 170), b = Math.round(40 + v * 210);
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(pad + ix * cw, top + iy * ch, cw + 0.7, ch + 0.7);
    }
    g.strokeStyle = rgba('#ffffff', 0.12); g.strokeRect(pad, top, iw, ih);

    // target ring
    const tx = pad + tAngle * iw, ty = top + (1 - tDop) * ih; // note: doppler up
    // (we drew doppler increasing downward; mark accordingly)
    const tyDraw = top + tDop * ih;
    const detectable = stap || Math.abs(this.params.tv) > width * 5;
    g.strokeStyle = detectable ? '#3ee08a' : '#ff9d5c'; g.lineWidth = 2;
    g.beginPath(); g.arc(tx, tyDraw, 12, 0, Math.PI * 2); g.stroke();
    g.fillStyle = detectable ? '#3ee08a' : '#ff9d5c'; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText(detectable ? 'target detected' : 'lost in clutter ridge', tx, tyDraw - 16);

    // axes
    g.fillStyle = 'rgba(200,210,225,0.7)'; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('angle →', pad + iw / 2, top + ih + 16);
    g.save(); g.translate(pad - 22, top + ih / 2); g.rotate(-Math.PI / 2); g.fillText('Doppler', 0, 0); g.restore();
    g.fillStyle = '#fff'; g.font = `700 13px ${FONT}`; g.textAlign = 'left';
    g.fillText(stap ? 'STAP null applied — clutter ridge suppressed' : 'no filter — clutter ridge dominates', pad, 22);
  }
}
