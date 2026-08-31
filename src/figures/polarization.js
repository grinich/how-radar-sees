// @ts-check
// §5 — Polarization from two feeds. Ex and Ey (perpendicular) with a relative
// phase; their sum traces the polarization ellipse. Sweep the phase from linear
// through elliptical to circular; the reflect toggle flips handedness.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

export default class Polarization extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'phase', label: 'Feed phase', min: 0, max: 360, step: 5, value: 90, format: (v) => `${v}°` },
    { type: 'range', name: 'amp', label: 'Feed 2 amplitude', min: 0, max: 1, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
    { type: 'toggle', name: 'reflect', label: 'Reflect (flip handedness)', value: false },
  ];

  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt * 1.8; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const cx = w * 0.36, cy = h / 2;
    const R = Math.min(w * 0.30, h * 0.38);
    const phi = (this.params.phase * Math.PI / 180) * (this.params.reflect ? -1 : 1);
    const A = this.params.amp;
    const Ex = (t) => Math.cos(t);
    const Ey = (t) => A * Math.cos(t + phi);

    // axes
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - R * 1.25, cy); g.lineTo(cx + R * 1.25, cy);
    g.moveTo(cx, cy - R * 1.25); g.lineTo(cx, cy + R * 1.25); g.stroke();
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('horizontal feed', cx, cy + R * 1.25 + 16);
    g.save(); g.translate(cx - R * 1.25 - 8, cy); g.rotate(-Math.PI / 2); g.fillText('vertical feed', 0, 0); g.restore();

    // traced ellipse
    g.strokeStyle = rgba(c.echoCol, 0.55); g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * 2 * Math.PI;
      const x = cx + Ex(t) * R, y = cy - Ey(t) * R;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.stroke();

    // current field vector
    const t = this.t;
    const tipX = cx + Ex(t) * R, tipY = cy - Ey(t) * R;
    g.strokeStyle = c.txCol; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(tipX, tipY); g.stroke();
    g.fillStyle = c.txCol; g.beginPath(); g.arc(tipX, tipY, 5, 0, Math.PI * 2); g.fill();
    // component shadows
    g.strokeStyle = rgba(c.muted, 0.5); g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX, cy); g.moveTo(tipX, tipY); g.lineTo(cx, tipY); g.stroke();
    g.setLineDash([]);

    // classification
    const p = ((this.params.phase % 360) + 360) % 360;
    let type = 'Elliptical';
    if (p < 8 || Math.abs(p - 180) < 8 || p > 352) type = 'Linear';
    else if (Math.abs(A - 1) < 0.06 && (Math.abs(p - 90) < 8 || Math.abs(p - 270) < 8)) type = 'Circular';
    const rh = Math.sin(phi) > 0 ? 'right-handed' : 'left-handed';
    const hand = (type === 'Linear') ? '' : rh;

    const tx = w * 0.72;
    g.textAlign = 'center';
    g.fillStyle = c.ink; g.font = `700 20px ${FONT}`;
    g.fillText(type, tx, cy - 24);
    if (hand) { g.fillStyle = c.echoCol; g.font = `600 14px ${FONT}`; g.fillText(hand, tx, cy - 2); }
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    g.fillText(`phase ${this.params.phase}°`, tx, cy + 22);
    if (this.params.reflect) { g.fillStyle = c.txCol; g.fillText('reflected', tx, cy + 42); }
  }
}
