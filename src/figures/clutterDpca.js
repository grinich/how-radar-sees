// @ts-check
// §10 — The clutter ridge. Stationary ground maps to a diagonal ridge in the
// angle–Doppler plane; Earth's rotation across a wide swath broadens it into a
// band that swallows slow movers. DPCA cancellation collapses the ridge, revealing
// them. Adjust swath and pulse rate, toggle DPCA.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';
import { dpcaSpacing } from '../physics/radar.js';

const rnd = (i) => { const x = Math.sin(i * 78.233) * 43758.5453; return x - Math.floor(x); };
// moving targets: [azimuth angle -1..1, extra radial velocity]
const MOVERS = [
  { a: -0.5, v: 0.55, name: 'truck' },
  { a: 0.2, v: -0.35, name: 'car' },
  { a: 0.6, v: 0.05, name: 'walker' },
];

export default class ClutterDpca extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'swath', label: 'Swath', min: 5, max: 60, step: 5, value: 20, format: (v) => `${v} km` },
    { type: 'range', name: 'prf', label: 'PRF', min: 4000, max: 20000, step: 1000, value: 8000, format: (v) => `${(v / 1000)} kHz` },
    { type: 'toggle', name: 'dpca', label: 'DPCA cancellation', value: false },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 44, plotW = w - m * 2, top = 24, plotH = h - top - 54, y1 = top + plotH;
    const X = (a) => m + (a + 1) / 2 * plotW;      // azimuth angle -1..1
    const Y = (v) => top + plotH / 2 - v * (plotH / 2) * 0.9; // radial velocity

    // axes
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.strokeRect(m, top, plotW, plotH);
    g.beginPath(); g.moveTo(m, Y(0)); g.lineTo(m + plotW, Y(0)); g.stroke();
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('azimuth angle →', w / 2, y1 + 22);
    g.save(); g.translate(15, top + plotH / 2); g.rotate(-Math.PI / 2); g.fillText('radial velocity', 0, 0); g.restore();

    // clutter ridge: v_clutter = sin(angle) with Earth-rotation spread ∝ swath
    const spread = (this.params.swath / 60) * 0.5;
    const suppressed = this.params.dpca;
    for (let i = 0; i < 900; i++) {
      const a = rnd(i) * 2 - 1;
      const ridge = 0.7 * a;
      const v = ridge + (rnd(i + 500) - 0.5) * spread;
      if (Math.abs(v) > 1) continue;
      const alpha = suppressed ? 0.05 : 0.5;
      g.fillStyle = rgba(c.muted, alpha);
      g.fillRect(X(a), Y(v), 2, 2);
    }
    // ridge band outline
    g.strokeStyle = rgba(c.badCol, suppressed ? 0.2 : 0.5); g.lineWidth = 1; g.setLineDash([4, 3]);
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = -1 + i / 20; const X0 = X(a), Y0 = Y(0.7 * a + spread / 2); i ? g.lineTo(X0, Y0) : g.moveTo(X0, Y0); }
    for (let i = 40; i >= 0; i--) { const a = -1 + i / 20; g.lineTo(X(a), Y(0.7 * a - spread / 2)); }
    g.closePath(); g.stroke(); g.setLineDash([]);

    // moving targets
    let detected = 0;
    for (const mv of MOVERS) {
      const vTotal = 0.7 * mv.a + mv.v;
      if (Math.abs(vTotal) > 1) continue;
      const inRidge = Math.abs(mv.v) < spread / 2; // hidden if within ridge spread
      const seen = suppressed || !inRidge;
      if (seen) detected++;
      g.fillStyle = seen ? c.goodCol : rgba(c.badCol, 0.5);
      g.beginPath(); g.arc(X(mv.a), Y(vTotal), 6, 0, Math.PI * 2); g.fill();
      if (seen) { g.strokeStyle = c.goodCol; g.lineWidth = 1.5; g.beginPath(); g.arc(X(mv.a), Y(vTotal), 10, 0, Math.PI * 2); g.stroke();
        g.fillStyle = c.ink; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(mv.name, X(mv.a), Y(vTotal) - 14); }
    }

    // readout
    const dp = dpcaSpacing(350, this.params.prf);
    g.textAlign = 'left'; g.font = `12px ${FONT}`; g.fillStyle = c.muted;
    g.fillText(`DPCA spacing 2v/PRF = ${dp.toFixed(2)} m`, m, y1 + 42);
    g.textAlign = 'right'; g.font = `600 13px ${FONT}`;
    g.fillStyle = detected === MOVERS.length ? c.goodCol : c.badCol;
    g.fillText(`${detected}/${MOVERS.length} movers detected`, w - m, y1 + 42);
  }
}
