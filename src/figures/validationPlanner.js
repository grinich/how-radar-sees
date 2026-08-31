// @ts-check
// §4 — Validation, but interactive: load a real satellite and watch the same
// engine reproduce its published resolution and sensitivity, with the live SNR
// curve. Replaces the static comparison table.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT, fmtM } from '../core/draw.js';
import { snrChain } from '../physics/radar.js';
import { wavelength } from '../physics/geometry.js';

const g1d = (D, fc) => 10 * Math.log10(2 * D / wavelength(fc));

const SATS = {
  iceye: {
    name: 'ICEYE', band: 'X-band', sub: '500 km · ~1.1 m antenna · 3 kW',
    base: { fc: 9.65, alt: 500, pwr: 4000, grz: 35, gaz: g1d(1.1, 9.65), gel: g1d(1.1, 9.65), prf: 5000, dc: 25, nf: 4, tAnt: 290, otherLoss: 3 },
    defBw: 50, pub: { res: 3.0, nesz: -16.5, neszCmp: '≈' },
  },
  nisar: {
    name: 'NISAR', band: 'L-band', sub: '747 km · 12 m dish · SweepSAR',
    base: { fc: 1.257, alt: 747, pwr: 1500, grz: 50, gaz: g1d(12, 1.257), gel: g1d(12, 1.257), prf: 1600, dc: 2, nf: 3, tAnt: 290, otherLoss: 6 },
    defBw: 50, pub: { res: 3.0, nesz: -25, neszCmp: '≤' },
  },
};

export default class ValidationPlanner extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'sat', label: 'Load satellite', options: [['ICEYE', 'iceye'], ['NISAR', 'nisar']], value: 'iceye' },
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 10, max: 300, step: 5, value: 50, format: (v) => `${v} MHz` },
  ];

  chain(bw) { return snrChain({ ...SATS[this.params.sat].base, bw }); }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const S = SATS[this.params.sat];
    const cur = this.chain(this.params.bw);

    // header
    g.textAlign = 'left'; g.fillStyle = c.ink; g.font = `700 17px ${FONT}`;
    g.fillText(S.name, 16, 26);
    const nameW = g.measureText(S.name).width; // measured with the 17px font
    g.fillStyle = c.echoCol; g.font = `600 12px ${FONT}`;
    g.fillText(S.band, 16 + nameW + 12, 26);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.fillText(S.sub, 16, 44);

    // comparison chips (model vs published)
    const modelRes = cur.rangeRes_slant, modelNesz = cur.nesz_db;
    const resOk = Math.abs(modelRes - S.pub.res) < 0.8;
    const neszOk = S.pub.neszCmp === '≤' ? modelNesz <= S.pub.nesz : Math.abs(modelNesz - S.pub.nesz) < 1.6;
    g.font = `12px ${FONT}`;
    g.fillStyle = c.muted; g.textAlign = 'right';
    g.fillText('published → model', w - 16, 26);
    g.textAlign = 'left';
    g.fillStyle = c.ink; g.font = `13px ${FONT}`;
    g.fillText(`Range res ${S.pub.res.toFixed(1)} m → `, 16, 66);
    let x = 16 + g.measureText(`Range res ${S.pub.res.toFixed(1)} m → `).width;
    g.fillStyle = c.echoCol; g.font = `600 13px ${FONT}`; g.fillText(fmtM(modelRes), x, 66);
    x += g.measureText(fmtM(modelRes)).width + 6;
    g.fillStyle = resOk ? c.goodCol : c.badCol; g.font = `700 13px ${FONT}`; g.fillText(resOk ? '✓' : '≈', x, 66);

    g.fillStyle = c.ink; g.font = `13px ${FONT}`;
    const nzLabel = `NESZ ${S.pub.neszCmp} ${S.pub.nesz} dB → `;
    g.fillText(nzLabel, 16, 86);
    x = 16 + g.measureText(nzLabel).width;
    g.fillStyle = c.echoCol; g.font = `600 13px ${FONT}`; g.fillText(`${modelNesz.toFixed(1)} dB`, x, 86);
    x += g.measureText(`${modelNesz.toFixed(1)} dB`).width + 6;
    g.fillStyle = neszOk ? c.goodCol : c.badCol; g.font = `700 13px ${FONT}`; g.fillText(neszOk ? '✓' : '≈', x, 86);

    // SNR vs bandwidth curve
    const padL = 44, padR = 16, padT = 100, padB = 28;
    const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB, y1 = padT + plotH;
    const bwMin = 10, bwMax = 300;
    const lx = (bw) => x0 + (bw - bwMin) / (bwMax - bwMin) * plotW;
    let yMin = Infinity, yMax = -Infinity; const pts = [];
    for (let i = 0; i <= 100; i++) { const bw = bwMin + i / 100 * (bwMax - bwMin); const s = this.chain(bw).snr_db; pts.push([bw, s]); if (s < yMin) yMin = s; if (s > yMax) yMax = s; }
    yMin = Math.min(yMin, 0) - 3; yMax += 3;
    const ly = (s) => y1 - (s - yMin) / (yMax - yMin) * plotH;

    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, y0, plotW, plotH);
    if (0 > yMin && 0 < yMax) { const yz = ly(0); g.strokeStyle = rgba(c.goodCol, 0.5); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x0, yz); g.lineTo(x0 + plotW, yz); g.stroke(); g.setLineDash([]); }
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const bw of [10, 50, 100, 200, 300]) g.fillText(`${bw}`, lx(bw), y1 + 14);
    g.fillText('bandwidth (MHz)', x0 + plotW / 2, y1 + 26);
    g.save(); g.translate(13, y0 + plotH / 2); g.rotate(-Math.PI / 2); g.fillText('SNR (dB)', 0, 0); g.restore();
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.beginPath();
    pts.forEach(([bw, s], i) => { const X = lx(bw), Y = ly(s); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();
    const cx = lx(this.params.bw), cy = ly(cur.snr_db);
    g.fillStyle = c.echoCol; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.figBg; g.lineWidth = 1.5; g.stroke();
  }
}
