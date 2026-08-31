// @ts-check
// §5 — Phased-array beam steering. A phase gradient across the elements tilts the
// combined beam. The polar pattern is the array factor |sin(Nψ/2)/(N sin(ψ/2))|;
// driving the array away from its design frequency changes d/λ and spawns grating
// lobes. Adjust steering, element count, and frequency.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

export default class PhasedArray extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'steer', label: 'Steering', min: -60, max: 60, step: 1, value: 20, format: (v) => `${v}°` },
    { type: 'range', name: 'elements', label: 'Elements', min: 4, max: 24, step: 2, value: 12, format: (v) => `${v}` },
    { type: 'range', name: 'freq', label: 'Frequency', min: 0.5, max: 2, step: 0.05, value: 1, format: (v) => `${v.toFixed(2)}× design` },
  ];

  af(thetaRad) {
    const N = this.params.elements;
    const dOverL = 0.5 * this.params.freq; // spacing 0.5λ at the design frequency
    const th0 = this.params.steer * Math.PI / 180;
    const psi = 2 * Math.PI * dOverL * (Math.sin(thetaRad) - Math.sin(th0));
    if (Math.abs(Math.sin(psi / 2)) < 1e-6) return 1;
    return Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const cx = w / 2;
    const polarH = h * 0.6;
    const cy = polarH - 6;
    const R = Math.min(w * 0.44, polarH - 20);

    // polar grid (half disk, 0° = up)
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    for (const rr of [0.25, 0.5, 0.75, 1]) {
      g.beginPath(); g.arc(cx, cy, R * rr, Math.PI, 2 * Math.PI); g.stroke();
    }
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const a of [-60, -30, 0, 30, 60]) {
      const ar = a * Math.PI / 180;
      const x = cx + Math.sin(ar) * R, y = cy - Math.cos(ar) * R;
      g.strokeStyle = rgba(c.rule, 0.6);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
      g.fillText(`${a}°`, cx + Math.sin(ar) * (R + 14), cy - Math.cos(ar) * (R + 14) + 3);
    }

    // beam pattern (dB scale, floor -35)
    const floor = 35;
    const rad = (db) => Math.max(0, (db + floor) / floor) * R;
    g.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = -Math.PI / 2 + (i / 240) * Math.PI;
      const db = 20 * Math.log10(Math.max(this.af(th), 1e-4));
      const rr = rad(db);
      const x = cx + Math.sin(th) * rr, y = cy - Math.cos(th) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.stroke();
    g.lineTo(cx, cy); g.closePath();
    g.fillStyle = rgba(c.echoCol, 0.12); g.fill();

    // steer direction marker
    const th0 = this.params.steer * Math.PI / 180;
    g.strokeStyle = rgba(c.txCol, 0.8); g.setLineDash([5, 4]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(th0) * R, cy - Math.cos(th0) * R); g.stroke();
    g.setLineDash([]);

    // grating-lobe warning
    const grating = this.params.freq > 1.02 && hasGratingLobe(this);
    g.textAlign = 'left'; g.font = `12px ${FONT}`;
    g.fillStyle = grating ? c.badCol : c.muted;
    g.fillText(grating ? 'grating lobes — energy leaking to false directions' : 'beam pattern (dB)', 12, 18);

    // element row schematic
    const N = this.params.elements;
    const rowY = polarH + (h - polarH) * 0.5;
    const span = Math.min(w - 40, N * 22);
    const x0 = cx - span / 2;
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('array elements — brightness shows relative phase', cx, polarH + 16);
    for (let i = 0; i < N; i++) {
      const x = x0 + (span) * (N === 1 ? 0.5 : i / (N - 1));
      // relative phase for steering
      const dOverL = 0.5 * this.params.freq;
      const phase = 2 * Math.PI * dOverL * i * Math.sin(th0);
      const b = (Math.cos(phase) + 1) / 2; // 0..1
      const shade = Math.round(60 + b * 170);
      g.fillStyle = `rgb(${shade},${shade},${shade})`;
      g.beginPath(); g.arc(x, rowY, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba(c.ink, 0.25); g.stroke();
    }
    // wavefront line perpendicular to steer
    g.strokeStyle = rgba(c.echoCol, 0.7); g.lineWidth = 2;
    const wf = 26;
    g.beginPath();
    g.moveTo(cx - Math.cos(th0) * wf, rowY - 22 - Math.sin(th0) * wf);
    g.lineTo(cx + Math.cos(th0) * wf, rowY - 22 + Math.sin(th0) * wf);
    g.stroke();
  }
}

function hasGratingLobe(fig) {
  // grating lobe exists if |sin θ0 ± 1/(d/λ)| <= 1 for some visible angle
  const dOverL = 0.5 * fig.params.freq;
  const s0 = Math.sin(fig.params.steer * Math.PI / 180);
  for (const k of [1, -1]) {
    const s = s0 + k / dOverL;
    if (s > -1 && s < 1) return true;
  }
  return false;
}
