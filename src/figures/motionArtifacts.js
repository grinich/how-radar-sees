// @ts-check
// Ch2 — Motion artifacts. A SAR image assumes the scene is still. Along-track
// motion smears a target; across-track (radial) motion displaces it in azimuth.
// The true position (green outline) vs where the radar paints it (amber).
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';

const rnd = (i) => { const s = Math.sin(i * 91.7) * 43758.5; return s - Math.floor(s); };

export default class MotionArtifacts extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'along', label: 'Along-track speed', min: 0, max: 10, step: 0.5, value: 3, format: (v) => `${v} m/s` },
    { type: 'range', name: 'radial', label: 'Radial speed', min: -12, max: 12, step: 1, value: 6, format: (v) => `${v} m/s` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    g.fillStyle = '#0c1017'; g.fillRect(0, 0, w, h);
    const pad = 16, top = 34, iw = w - pad * 2, ih = h - top - 40;

    // faint clutter + a road
    for (let i = 0; i < 200; i++) { const x = pad + rnd(i) * iw, y = top + rnd(i + 7) * ih; const b = 30 + rnd(i + 3) * 40; g.fillStyle = `rgb(${b},${b + 6},${b + 10})`; g.fillRect(x, y, 1.6, 1.6); }
    const roadY = top + ih * 0.5;
    g.strokeStyle = 'rgba(120,130,150,0.35)'; g.lineWidth = 10; g.beginPath(); g.moveTo(pad, roadY); g.lineTo(pad + iw, roadY); g.stroke();

    const trueX = pad + iw * 0.45, trueY = roadY;
    // displacement (azimuth shift ∝ radial velocity) and smear (∝ along-track)
    const shift = this.params.radial * 7;
    const smear = this.params.along * 5;

    // true position
    g.strokeStyle = '#3ee08a'; g.lineWidth = 2; g.setLineDash([4, 3]);
    g.beginPath(); g.arc(trueX, trueY, 12, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#3ee08a'; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText('true position', trueX, trueY + 30);

    // imaged: smeared streak at shifted azimuth
    const imgX = trueX + shift;
    const grad = g.createLinearGradient(imgX - smear, 0, imgX + smear, 0);
    grad.addColorStop(0, 'rgba(255,190,90,0)'); grad.addColorStop(0.5, 'rgba(255,200,110,0.95)'); grad.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(imgX, trueY, Math.max(7, smear), 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffcf78'; g.textAlign = 'center'; g.fillText('as imaged', imgX, trueY - 20);

    // connector
    if (Math.abs(shift) > 2) {
      g.strokeStyle = 'rgba(255,157,92,0.6)'; g.lineWidth = 1.5; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(trueX, trueY); g.lineTo(imgX, trueY); g.stroke(); g.setLineDash([]);
    }

    // axes + readout
    g.fillStyle = 'rgba(200,210,225,0.7)'; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('azimuth →', pad + iw / 2, top + ih + 14);
    g.textAlign = 'left'; g.fillStyle = '#ffcf78';
    g.fillText(`azimuth displacement ${(this.params.radial * 1.2).toFixed(0)} m` + (this.params.along > 0 ? '  ·  smeared' : ''), pad, h - 10);
  }
}
