// @ts-check
// Ch3 — Jamming vs. nulling. A jammer floods the receiver and washes out the
// image — but broadcasting reveals its position, so the array steers a null onto
// it and recovers the scene. Move the jammer and set its power.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const rnd = (i) => { const s = Math.sin(i * 71.3) * 43758.5; return s - Math.floor(s); };
const TARGETS = [[0.3, 0.4], [0.42, 0.55], [0.6, 0.35], [0.7, 0.62], [0.52, 0.7]];

export default class Jamming extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'power', label: 'Jammer power', min: 0, max: 1, step: 0.05, value: 0.6, format: (v) => `${Math.round(v * 100)}%` },
    { type: 'range', name: 'jx', label: 'Jammer position', min: 0.05, max: 0.95, step: 0.05, value: 0.8, format: (v) => `${Math.round(v * 100)}%` },
    { type: 'toggle', name: 'null', label: 'Steer null onto jammer', value: false },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0c1017'; g.fillRect(0, 0, w, h);
    const pad = 16, top = 34, iw = w - pad * 2, ih = h - top - 44;
    const power = this.params.power, nulled = this.params.null;
    const effNoise = nulled ? power * 0.12 : power; // nulling removes most jammer energy

    // scene: targets + clutter, washed by jammer noise
    for (let i = 0; i < 260; i++) { const x = pad + rnd(i) * iw, y = top + rnd(i + 3) * ih; const b = 35 + rnd(i + 8) * 35; g.fillStyle = `rgb(${b},${b + 5},${b + 9})`; g.fillRect(x, y, 1.6, 1.6); }
    for (const [tu, tv] of TARGETS) { const x = pad + tu * iw, y = top + tv * ih; g.fillStyle = 'rgba(120,200,255,0.9)'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }

    // jammer noise wash (random bright speckle proportional to effNoise)
    const nSpeckle = Math.round(effNoise * 2600);
    for (let i = 0; i < nSpeckle; i++) { const x = pad + rnd(i * 2 + 1) * iw, y = top + rnd(i * 2 + 2) * ih; const b = 120 + rnd(i) * 120; g.fillStyle = `rgba(${b},${b},${b},0.5)`; g.fillRect(x, y, 1.4, 1.4); }

    // jammer marker + null wedge
    const jx = pad + this.params.jx * iw;
    if (nulled) {
      g.fillStyle = 'rgba(60,224,138,0.10)';
      g.beginPath(); g.moveTo(jx, top); g.lineTo(jx - 26, top + ih); g.lineTo(jx + 26, top + ih); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,224,138,0.5)'; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = '#ff5b5b'; g.beginPath(); g.moveTo(jx, top + 4); g.lineTo(jx - 7, top - 8); g.lineTo(jx + 7, top - 8); g.closePath(); g.fill();
    g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText('jammer', jx, top - 12);

    // verdict
    g.textAlign = 'left'; g.font = `700 13px ${FONT}`;
    if (nulled) { g.fillStyle = '#3ee08a'; g.fillText('null steered onto jammer — scene recovered, only its direction blinded', pad, h - 12); }
    else if (power > 0.5) { g.fillStyle = '#ff9d5c'; g.fillText('jammed — image washed out (but the jammer just revealed its position)', pad, h - 12); }
    else { g.fillStyle = 'rgba(200,210,225,0.85)'; g.fillText('low jamming — processing gain still recovers the scene', pad, h - 12); }
  }
}
