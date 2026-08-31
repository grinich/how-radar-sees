// @ts-check
// Fig 2.1 — Range resolution = c/2B. Two point targets a settable distance
// apart; the bandwidth slider narrows each echo's compressed response until the
// two separate. The grazing slider projects ground spacing into slant range and
// shows the blow-up toward nadir. Physics from src/physics (rangeResolution).
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rangeResolution } from '../physics/radar.js';

const sinc2 = (u) => {
  if (Math.abs(u) < 1e-9) return 1;
  const x = Math.PI * u;
  const s = Math.sin(x) / x;
  return s * s;
};

export default class PulseCompression extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 10, max: 2000, step: 10, value: 150,
      format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${v} MHz`) },
    { type: 'range', name: 'sep', label: 'Target spacing', min: 0.2, max: 20, step: 0.1, value: 6,
      format: (v) => `${v.toFixed(1)} m` },
    { type: 'range', name: 'grz', label: 'Grazing angle', min: 15, max: 85, step: 1, value: 40,
      format: (v) => `${v}°` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    const p = this.params;

    const dr_slant = rangeResolution(p.bw);                 // c/2B, metres
    const cosG = Math.cos(p.grz * Math.PI / 180);
    const dr_ground = dr_slant / Math.max(cosG, 1e-4);
    const slantSep = p.sep * cosG;                          // ground spacing → slant
    const resolved = slantSep >= dr_slant;

    g.clearRect(0, 0, w, h);
    g.fillStyle = c.figBg; g.fillRect(0, 0, w, h);

    // Layout
    const padL = 46, padR = 16, padT = 58, padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const x0 = padL, y0 = padT, y1 = padT + plotH;

    // X range in slant metres, framed around the wider of spacing / resolution.
    const span = Math.max(slantSep * 2.4, dr_slant * 6, 1.2);
    const toX = (m) => x0 + (m / span + 0.5) * plotW;

    // --- summed compressed response (incoherent sum of two sinc² PSFs) ---
    const cA = -slantSep / 2, cB = slantSep / 2;
    const N = Math.max(240, Math.floor(plotW));
    const ys = new Array(N + 1);
    let peak = 0;
    for (let i = 0; i <= N; i++) {
      const m = (i / N - 0.5) * span;
      const val = sinc2((m - cA) / dr_slant) + sinc2((m - cB) / dr_slant);
      ys[i] = val;
      if (val > peak) peak = val;
    }

    // Baseline grid
    g.strokeStyle = c.rule; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0 + plotW, y1); g.stroke();

    // Filled response curve
    g.beginPath();
    g.moveTo(x0, y1);
    for (let i = 0; i <= N; i++) {
      const xx = x0 + (i / N) * plotW;
      const yy = y1 - (ys[i] / peak) * plotH;
      g.lineTo(xx, yy);
    }
    g.lineTo(x0 + plotW, y1);
    g.closePath();
    g.fillStyle = hexA(c.echoCol, 0.16);
    g.fill();
    g.strokeStyle = c.echoCol; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const xx = x0 + (i / N) * plotW;
      const yy = y1 - (ys[i] / peak) * plotH;
      i === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
    }
    g.stroke();

    // True target positions
    for (const [cx, lab] of [[cA, 'A'], [cB, 'B']]) {
      const xx = toX(cx);
      g.strokeStyle = hexA(c.targetCol, 0.9); g.lineWidth = 1.5;
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx, y1); g.stroke();
      g.setLineDash([]);
      g.fillStyle = c.targetCol; g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(lab, xx, y0 - 6);
    }

    // Resolution-cell bracket (width = c/2B) drawn near the top
    const cellY = y0 + 12;
    const bx0 = toX(-dr_slant / 2), bx1 = toX(dr_slant / 2);
    g.strokeStyle = c.txCol; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx0, cellY); g.lineTo(bx1, cellY);
    g.moveTo(bx0, cellY - 4); g.lineTo(bx0, cellY + 4);
    g.moveTo(bx1, cellY - 4); g.lineTo(bx1, cellY + 4);
    g.stroke();
    g.fillStyle = c.txCol; g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(`resolution cell  c/2B = ${fmtM(dr_slant)}`, (bx0 + bx1) / 2, cellY - 7);

    // X axis label
    g.fillStyle = c.muted; g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('slant range →', x0 + plotW / 2, h - 10);

    // Verdict + readouts (top-left)
    g.textAlign = 'left';
    g.font = '700 15px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = resolved ? c.goodCol : c.badCol;
    g.fillText(resolved ? 'Two targets resolved' : 'Targets merge into one', padL, 22);
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = c.muted;
    g.fillText(
      `slant res ${fmtM(dr_slant)}  ·  ground res ${fmtM(dr_ground)}  ·  spacing ${p.sep.toFixed(1)} m`,
      padL, 40);
  }
}

function hexA(hex, a) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtM(m) { return m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(0)} cm`; }
