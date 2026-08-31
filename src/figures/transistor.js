// @ts-check
// §6 — An amplifier's transfer curve. The output follows the input only in the
// central linear band; below cutoff and above saturation the signal flattens and
// clips. Adjust bias and drive and watch the output waveform distort.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const CUT = 1.0, SAT = 3.0; // gate volts: below CUT off, above SAT fully on
const transfer = (vin) => Math.max(0, Math.min(1, (vin - CUT) / (SAT - CUT)));

export default class Transistor extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'bias', label: 'Bias', min: 0.5, max: 3.5, step: 0.05, value: 2.0, format: (v) => `${v.toFixed(2)} V` },
    { type: 'range', name: 'drive', label: 'Drive amplitude', min: 0.2, max: 2.5, step: 0.05, value: 0.8, format: (v) => `${v.toFixed(2)} V` },
  ];

  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt * 2.2; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    // Layout: transfer curve top-right, input trace bottom, output trace left.
    const m = 42;
    const cx0 = w * 0.40, cy0 = m, cw = w - cx0 - m, ch = h * 0.60 - m;
    const vinToX = (v) => cx0 + (v / 4) * cw;
    const voutToY = (o) => cy0 + ch - o * ch;

    // transfer curve
    g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 100; i++) { const v = (i / 100) * 4; const x = vinToX(v), y = voutToY(transfer(v)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // region shading
    g.fillStyle = rgba(c.muted, 0.10);
    g.fillRect(vinToX(0), cy0, vinToX(CUT) - vinToX(0), ch);
    g.fillRect(vinToX(SAT), cy0, vinToX(4) - vinToX(SAT), ch);
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    g.fillText('cutoff', (vinToX(0) + vinToX(CUT)) / 2, cy0 + 12);
    g.fillText('linear', (vinToX(CUT) + vinToX(SAT)) / 2, cy0 + 12);
    g.fillText('saturation', (vinToX(SAT) + vinToX(4)) / 2, cy0 + 12);
    g.textAlign = 'left'; g.fillText('Vin →', vinToX(4) - 30, cy0 + ch + 16);
    g.save(); g.translate(cx0 - 14, cy0 + ch / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('Vout', 0, 0); g.restore();

    // input waveform along the bottom (time →), amplitude in Vin
    const bt = cy0 + ch + 40, bh = h - bt - 16;
    const P = this.params, N = 160;
    const vin = (t) => P.bias + P.drive * Math.sin(t);
    // draw input as horizontal trace under the curve, mapped to Vin x-position over time
    g.strokeStyle = rgba(c.txCol, 0.9); g.lineWidth = 1.8; g.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = this.t + (i / N) * Math.PI * 4;
      const x = vinToX(vin(t));
      const y = bt + (i / N) * bh;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = c.txCol; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('input (Vin over time ↓)', cx0, bt - 6);

    // output waveform along the left (time →), amplitude in Vout
    const ot = cy0, ow = cx0 - m - 6;
    g.strokeStyle = c.echoCol; g.lineWidth = 1.8; g.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = this.t + (i / N) * Math.PI * 4;
      const o = transfer(vin(t));
      const y = voutToY(o);
      const x = m + (i / N) * ow;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = c.echoCol; g.textAlign = 'left'; g.fillText('output', m, cy0 - 6);

    // moving operating point
    const v = vin(this.t);
    const px = vinToX(v), py = voutToY(transfer(v));
    g.strokeStyle = rgba(c.muted, 0.5); g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(px, cy0 + ch); g.lineTo(px, py); g.lineTo(m, py); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.ink; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();

    // clipping note
    const clipped = (P.bias + P.drive > SAT + 0.02) || (P.bias - P.drive < CUT - 0.02);
    g.fillStyle = clipped ? c.badCol : c.goodCol; g.font = `600 12px ${FONT}`; g.textAlign = 'right';
    g.fillText(clipped ? 'clipping — signal distorted' : 'clean — within the linear band', w - m, h - 8);
  }
}
