// @ts-check
// Ch3 — Along-track interferometry. Two phase centres; the interferometric phase
// is ~0 for stationary clutter and proportional to radial velocity for movers. A
// longer baseline detects slower motion but wraps sooner. Colour encodes phase.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const rnd = (i) => { const s = Math.sin(i * 33.7) * 43758.5; return s - Math.floor(s); };
const MOVERS = [
  { x: 0.28, y: 0.4, v: 1.5, name: 'walker 1.5 m/s' },
  { x: 0.52, y: 0.58, v: 12, name: 'car 12 m/s' },
  { x: 0.72, y: 0.35, v: 55, name: 'jet 55 m/s' },
];

// map phase (rad) to a diverging color
function phaseColor(ph) {
  const t = (ph / Math.PI); // -1..1 (may exceed if wrapped handled before)
  const r = Math.round(128 + 127 * Math.max(-1, Math.min(1, t)));
  const b = Math.round(128 - 127 * Math.max(-1, Math.min(1, t)));
  return `rgb(${r},80,${b})`;
}

export default class Ati extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'baseline', label: 'Baseline', min: 0.2, max: 3, step: 0.1, value: 1.2, format: (v) => `${v.toFixed(1)} m` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0c1017'; g.fillRect(0, 0, w, h);
    const pad = 16, top = 34, iw = w - pad * 2, ih = h - top - 56;

    // velocity that produces a full-phase (±π) wrap scales inversely with baseline
    const vAmb = 66 / this.params.baseline;          // max unambiguous (m/s)
    const vMin = 0.6 * this.params.baseline;         // min detectable ~ ∝ baseline (rough)
    const toPhase = (v) => (v / vAmb) * Math.PI;

    // clutter at ~zero phase (grey speckle)
    for (let i = 0; i < 260; i++) { const x = pad + rnd(i) * iw, y = top + rnd(i + 5) * ih; const b = 45 + rnd(i + 9) * 45; g.fillStyle = `rgb(${b},${b},${b})`; g.fillRect(x, y, 2, 2); }

    // movers colored by (wrapped) phase
    for (const mv of MOVERS) {
      let ph = toPhase(mv.v);
      const wrapped = Math.abs(ph) > Math.PI;
      while (ph > Math.PI) ph -= 2 * Math.PI; while (ph < -Math.PI) ph += 2 * Math.PI;
      const tooSlow = mv.v < vMin;
      const x = pad + mv.x * iw, y = top + mv.y * ih;
      g.fillStyle = tooSlow ? 'rgba(120,120,130,0.7)' : phaseColor(ph);
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = tooSlow ? '#888' : (wrapped ? '#ff9d5c' : '#fff'); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(220,225,235,0.9)'; g.font = `11px ${FONT}`; g.textAlign = 'center';
      const tag = tooSlow ? 'too slow' : wrapped ? 'aliased' : 'detected';
      g.fillText(`${mv.name} · ${tag}`, x, y - 16);
    }

    // phase legend
    const lx = pad, ly = top + ih + 16;
    const grad = g.createLinearGradient(lx, 0, lx + 160, 0);
    grad.addColorStop(0, phaseColor(-Math.PI)); grad.addColorStop(0.5, phaseColor(0)); grad.addColorStop(1, phaseColor(Math.PI));
    g.fillStyle = grad; g.fillRect(lx, ly, 160, 8);
    g.fillStyle = 'rgba(200,210,225,0.8)'; g.font = `10px ${FONT}`; g.textAlign = 'left';
    g.fillText('−π', lx, ly + 20); g.textAlign = 'center'; g.fillText('interferometric phase', lx + 80, ly + 20); g.textAlign = 'right'; g.fillText('+π', lx + 160, ly + 20);

    g.textAlign = 'right'; g.fillStyle = 'rgba(200,210,225,0.85)'; g.font = `12px ${FONT}`;
    g.fillText(`max unambiguous ${vAmb.toFixed(0)} m/s · min detectable ${vMin.toFixed(1)} m/s`, w - pad, ly + 4);
  }
}
