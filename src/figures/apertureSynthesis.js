// @ts-check
// Ch2 — Synthetic aperture formation. The satellite flies along-track; its beam
// keeps targets illuminated over a stretch of the path (the synthetic aperture).
// Doppler colours approaching (blue) vs receding (red). A smaller antenna → wider
// beam → longer aperture → finer azimuth resolution (≈ D/2).
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const TARGETS = [0.30, 0.5, 0.68]; // along-track positions (0..1)

export default class ApertureSynthesis extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'diam', label: 'Antenna length', min: 0.6, max: 6, step: 0.2, value: 2, format: (v) => `${v.toFixed(1)} m` },
  ];
  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt * 0.15; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 30, topY = 46, gndY = h - 54, x0 = m, plotW = w - m * 2;
    const X = (u) => x0 + u * plotW;

    // beam footprint half-width (schematic, ∝ λ/D)
    const half = 0.14 * (2 / this.params.diam);
    const satU = (this.t % 1);
    const satX = X(satU);

    // ground line
    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(x0, gndY); g.lineTo(x0 + plotW, gndY); g.stroke();
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('ground (azimuth →)', x0, gndY + 20);
    g.textAlign = 'right'; g.fillText('flight path', x0 + plotW, topY - 12);

    // flight path
    g.strokeStyle = rgba(c.rule, 0.7); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x0, topY); g.lineTo(x0 + plotW, topY); g.stroke(); g.setLineDash([]);

    // synthetic aperture for the middle target
    const tgtU = TARGETS[1];
    const apMin = X(tgtU - half), apMax = X(tgtU + half);
    g.strokeStyle = c.targetCol; g.lineWidth = 3;
    g.beginPath(); g.moveTo(apMin, topY); g.lineTo(apMax, topY); g.stroke();
    g.fillStyle = c.targetCol; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('synthetic aperture', (apMin + apMax) / 2, topY - 12);

    // beam triangle
    g.fillStyle = rgba(c.echoCol, 0.12);
    g.beginPath(); g.moveTo(satX, topY); g.lineTo(X(satU - half), gndY); g.lineTo(X(satU + half), gndY); g.closePath(); g.fill();
    g.strokeStyle = rgba(c.echoCol, 0.5); g.stroke();

    // satellite
    g.fillStyle = c.ink; g.fillRect(satX - 8, topY - 5, 16, 10);
    g.fillStyle = rgba(c.echoCol, 0.9); g.fillRect(satX - 16, topY - 2, 6, 4); g.fillRect(satX + 10, topY - 2, 6, 4);

    // targets, coloured by instantaneous Doppler
    for (const tu of TARGETS) {
      const lit = Math.abs(tu - satU) < half;
      const tx = X(tu);
      let col = rgba(c.muted, 0.4);
      if (lit) {
        const d = (satU - tu) / half; // <0 approaching, >0 receding
        col = dopplerColor(d, c);
      }
      g.fillStyle = col;
      g.beginPath(); g.arc(tx, gndY, lit ? 7 : 5, 0, Math.PI * 2); g.fill();
      if (lit) { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(tx, gndY, 11, 0, Math.PI * 2); g.stroke(); }
    }

    // legend + azimuth resolution
    g.textAlign = 'left'; g.font = `11px ${FONT}`;
    g.fillStyle = c.echoCol; g.fillText('● approaching', x0, h - 8);
    g.fillStyle = c.badCol; g.fillText('● receding', x0 + 110, h - 8);
    g.fillStyle = c.muted; g.textAlign = 'right';
    g.fillText(`azimuth res ≈ D/2 = ${(this.params.diam / 2).toFixed(1)} m`, x0 + plotW, h - 8);
  }
}

function dopplerColor(d, c) {
  // d in [-1,1]: -1 = fully approaching (echo/blue), +1 = receding (bad/red)
  const t = Math.max(0, Math.min(1, (d + 1) / 2));
  return t < 0.5 ? rgba(c.echoCol, 0.9) : rgba(c.badCol, 0.85);
}
