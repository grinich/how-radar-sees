// @ts-check
// §9 — Spotlight video-SAR tracking. A moving target is followed frame to frame
// against stationary ground clutter — custodial tracking. Change its speed and
// type; a fast target smears unless the imaging rate keeps up.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const TYPES = {
  jet: { label: 'fighter jet', speed: 'Mach 0.9', size: 6, bright: 1.0 },
  drone: { label: 'quadcopter drone', speed: '30 m/s', size: 3.5, bright: 0.7 },
  missile: { label: 'ballistic warhead', speed: 'Mach 8', size: 5, bright: 1.0 },
};

// deterministic pseudo-random in [0,1) from an integer
const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

export default class VideoSar extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'type', label: 'Target', options: [['Jet', 'jet'], ['Drone', 'drone'], ['Missile', 'missile']], value: 'jet' },
    { type: 'range', name: 'speed', label: 'Speed', min: 0.2, max: 2.5, step: 0.1, value: 1.0, format: (v) => `${v.toFixed(1)}×` },
  ];
  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt * this.params.speed; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    // radar-display dark panel
    g.fillStyle = '#0d1017'; g.fillRect(0, 0, w, h);

    // stationary clutter
    for (let i = 0; i < 220; i++) {
      const x = rnd(i) * w, y = rnd(i + 999) * h;
      const b = 40 + rnd(i + 7) * 70;
      g.fillStyle = `rgba(${b},${b + 8},${b + 12},0.7)`;
      const s = 0.6 + rnd(i + 3) * 1.4;
      g.fillRect(x, y, s, s);
    }

    const T = TYPES[this.params.type];
    // target path: sweeping arc across the scene
    const prog = (this.t * 0.12) % 1;
    const tx = 40 + prog * (w - 80);
    const ty = h * 0.5 + Math.sin(prog * Math.PI * 2) * h * 0.22;

    // motion smear if fast relative to imaging
    const smear = Math.min(1, this.params.speed / 1.2);
    for (let k = 6; k >= 1; k--) {
      const p2 = (prog - k * 0.012 * smear + 1) % 1;
      const sx = 40 + p2 * (w - 80), sy = h * 0.5 + Math.sin(p2 * Math.PI * 2) * h * 0.22;
      g.fillStyle = `rgba(240,180,90,${0.06 * k * smear})`;
      g.beginPath(); g.arc(sx, sy, T.size, 0, Math.PI * 2); g.fill();
    }

    // target
    g.fillStyle = `rgba(255,210,120,${T.bright})`;
    g.beginPath(); g.arc(tx, ty, T.size, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'rgba(255,200,100,0.8)'; g.shadowBlur = 12;
    g.beginPath(); g.arc(tx, ty, T.size * 0.6, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;

    // tracking box
    const bs = 26;
    g.strokeStyle = '#3ee08a'; g.lineWidth = 1.5;
    const cx = tx, cy = ty;
    corner(g, cx - bs, cy - bs, 8, 1, 1); corner(g, cx + bs, cy - bs, 8, -1, 1);
    corner(g, cx - bs, cy + bs, 8, 1, -1); corner(g, cx + bs, cy + bs, 8, -1, -1);
    g.fillStyle = '#3ee08a'; g.font = `600 12px ${FONT}`; g.textAlign = 'left';
    const lbl = `TRACKING · ${T.label} · ${T.speed}`;
    const lblX = Math.max(10, Math.min(cx - bs, w - g.measureText(lbl).width - 10));
    g.fillText(lbl, lblX, cy - bs - 8);

    // caption
    g.fillStyle = 'rgba(200,205,215,0.75)'; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText('grey clutter · amber target · green custodial track', 12, h - 10);
    if (this.params.speed > 1.5) { g.fillStyle = '#ff9d5c'; g.textAlign = 'right'; g.fillText('fast — motion smear', w - 12, h - 10); }
  }
}

function corner(g, x, y, len, sx, sy) {
  g.beginPath(); g.moveTo(x, y + sy * len); g.lineTo(x, y); g.lineTo(x + sx * len, y); g.stroke();
}
