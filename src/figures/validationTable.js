// @ts-check
// §4 — Model vs reality. The engine's predicted resolution and NESZ for ICEYE
// and NISAR, beside each operator's published figures. Presets use each craft's
// real band, altitude, antenna size and operating mode; the model reproduces
// them (see the physics tests for the numeric anchors).
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';
import { snrChain } from '../physics/radar.js';
import { wavelength } from '../physics/geometry.js';

const g1d = (D, fc) => 10 * Math.log10(2 * D / wavelength(fc));

const SATS = [
  {
    name: 'ICEYE', band: 'X-band', sub: '500 km · ~1.1 m antenna · 3 kW',
    preset: { fc: 9.65, alt: 500, bw: 50, pwr: 4000, grz: 35, gaz: g1d(1.1, 9.65), gel: g1d(1.1, 9.65), prf: 5000, dc: 25, nf: 4, tAnt: 290, otherLoss: 3 },
    pub: { res: 3.0, nesz: -16.5 },
  },
  {
    name: 'NISAR', band: 'L-band', sub: '747 km · 12 m dish · SweepSAR',
    preset: { fc: 1.257, alt: 747, bw: 50, pwr: 1500, grz: 50, gaz: g1d(12, 1.257), gel: g1d(12, 1.257), prf: 1600, dc: 2, nf: 3, tAnt: 290, otherLoss: 6 },
    pub: { res: 3.0, nesz: -25, neszCmp: 'below' },
  },
];

export default class ValidationTable extends Canvas2DFigure {
  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    g.fillStyle = c.ink; g.font = `700 15px ${FONT}`; g.textAlign = 'left';
    g.fillText('Model versus published specifications', 16, 26);

    // column x-positions
    const xMetric = 30, xPub = w * 0.54, xModel = w * 0.74, xOk = w - 34;
    // header
    g.fillStyle = c.muted; g.font = `600 11px ${FONT}`;
    g.textAlign = 'left'; g.fillText('Published', xPub, 46); g.fillText('Model', xModel, 46);
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1; g.beginPath(); g.moveTo(16, 52); g.lineTo(w - 16, 52); g.stroke();

    const blockH = (h - 64) / SATS.length;
    SATS.forEach((s, si) => {
      const r = snrChain(s.preset);
      const top = 64 + si * blockH;

      // satellite header
      g.textAlign = 'left';
      g.fillStyle = c.ink; g.font = `700 15px ${FONT}`; g.fillText(s.name, xMetric - 14, top + 18);
      g.fillStyle = c.echoCol; g.font = `600 12px ${FONT}`;
      const nameW = g.measureText(s.name).width;
      g.fillText(s.band, xMetric - 14 + nameW + 10, top + 18);
      g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.fillText(s.sub, xMetric - 14, top + 34);

      const metrics = [
        { label: 'Range resolution', pub: `${s.pub.res.toFixed(1)} m`, model: `${r.rangeRes_slant.toFixed(1)} m`, ok: Math.abs(r.rangeRes_slant - s.pub.res) < 0.6 },
        { label: 'NESZ (sensitivity)', pub: `${s.pub.neszCmp === 'below' ? '≤ ' : ''}${s.pub.nesz} dB`, model: `${r.nesz_db.toFixed(1)} dB`,
          ok: s.pub.neszCmp === 'below' ? r.nesz_db <= s.pub.nesz : Math.abs(r.nesz_db - s.pub.nesz) < 1.5 },
      ];
      metrics.forEach((mt, mi) => {
        const my = top + 52 + mi * 22;
        g.textAlign = 'left'; g.fillStyle = c.muted; g.font = `12px ${FONT}`;
        g.fillText(mt.label, xMetric, my);
        g.fillStyle = c.ink; g.font = `13px ${FONT}`; g.fillText(mt.pub, xPub, my);
        g.fillStyle = c.echoCol; g.font = `600 13px ${FONT}`; g.fillText(mt.model, xModel, my);
        g.fillStyle = mt.ok ? c.goodCol : c.badCol; g.font = `700 14px ${FONT}`; g.fillText(mt.ok ? '✓' : '≈', xOk, my);
      });

      if (si < SATS.length - 1) { g.strokeStyle = rgba(c.rule, 0.5); g.beginPath(); g.moveTo(16, top + blockH - 6); g.lineTo(w - 16, top + blockH - 6); g.stroke(); }
    });
  }
}
