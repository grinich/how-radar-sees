// @ts-check
// §9 — The V3 direct-to-cell antenna as a radar. 15 m aperture at S-band: the SNR
// is enormous even at a handful of watts. Sweep power and bandwidth; the readout
// shows what the sensitivity floor (NESZ) could detect.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT, fmtM, fmtW } from '../core/draw.js';
import { snrChain } from '../physics/radar.js';

const GAZ = 10 * Math.log10(Math.sqrt(Math.pow(10, (50 + 1) / 10) / Math.PI)); // 50 dB total

export default class DtcExplorer extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'pwr', label: 'Transmit power', min: 3, max: 44000, step: 1, value: 15, format: fmtW },
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 5, max: 500, step: 5, value: 500, format: (v) => `${v} MHz` },
    { type: 'range', name: 'dc', label: 'Duty cycle', min: 20, max: 100, step: 10, value: 100, format: (v) => `${v}%` },
  ];

  chain(pwr) {
    return snrChain({ fc: 2, alt: 350, bw: this.params.bw, pwr, dc: this.params.dc, grz: 40, gaz: GAZ, gel: GAZ, prf: 8000, nf: 3, tAnt: 300, otherLoss: 3 });
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const cur = this.chain(this.params.pwr);
    const nrw = w < 480; // narrow mode: shrink the header so the plot keeps most of the canvas

    // headline
    g.textAlign = 'left'; g.fillStyle = c.goodCol; g.font = `700 ${nrw ? 20 : 30}px ${FONT}`;
    g.fillText(`SNR +${cur.snr_db.toFixed(0)} dB`, 16, nrw ? 24 : 36);
    g.fillStyle = c.muted; g.font = `${nrw ? 10 : 12}px ${FONT}`;
    g.fillText(nrw
      ? `NESZ ${cur.nesz_db.toFixed(0)} dB · range res ${fmtM(cur.rangeRes_ground)}`
      : `NESZ ${cur.nesz_db.toFixed(0)} dB   ·   range resolution ${fmtM(cur.rangeRes_ground)}   ·   S-band, 15 m aperture, 350 km`,
      16, nrw ? 40 : 56);

    // capability line from NESZ
    let cap = 'detects large ships', col = c.muted;
    if (cur.nesz_db < -30) { cap = 'images even the faintest surfaces, with margin to spare'; col = c.badCol; }
    else if (cur.nesz_db < -20) { cap = 'images vehicles and most ground targets'; col = c.echoCol; }
    else if (cur.nesz_db < -12) { cap = 'images typical terrain'; col = c.echoCol; }
    g.fillStyle = col; g.font = `600 ${nrw ? 11 : 13}px ${FONT}`; g.fillText(`→ ${cap}`, 16, nrw ? 56 : 76);

    // SNR vs power sweep (log power)
    const padL = nrw ? 36 : 44, padR = nrw ? 12 : 16, padT = nrw ? 64 : 92, padB = nrw ? 26 : 38;
    const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB, y1 = padT + plotH;
    const pMin = 3, pMax = 44000;
    const lx = (p) => x0 + (Math.log10(p / pMin) / Math.log10(pMax / pMin)) * plotW;
    let yMin = Infinity, yMax = -Infinity; const pts = [];
    for (let i = 0; i <= 100; i++) { const p = pMin * Math.pow(pMax / pMin, i / 100); const s = this.chain(p).snr_db; pts.push([p, s]); if (s < yMin) yMin = s; if (s > yMax) yMax = s; }
    yMin = Math.min(yMin, 0) - 3; yMax += 3;
    const ly = (s) => y1 - ((s - yMin) / (yMax - yMin)) * plotH;

    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, y0, plotW, plotH);
    // 0 dB
    if (0 > yMin && 0 < yMax) { const yz = ly(0); g.strokeStyle = rgba(c.goodCol, 0.5); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x0, yz); g.lineTo(x0 + plotW, yz); g.stroke(); g.setLineDash([]); }
    // x ticks
    g.fillStyle = c.muted; g.font = `${nrw ? 9 : 10}px ${FONT}`; g.textAlign = 'center';
    for (const p of [3, 15, 100, 1000, 10000, 44000]) { const x = lx(p); g.fillText(p >= 1000 ? `${p / 1000}k` : `${p}`, x, y1 + (nrw ? 12 : 14)); }
    g.save(); g.translate(nrw ? 11 : 13, y0 + plotH / 2); g.rotate(-Math.PI / 2); g.fillText('SNR (dB)', 0, 0); g.restore();
    g.fillStyle = c.muted; g.textAlign = 'center';
    g.fillText(nrw ? 'Tx power (W)' : 'transmit power (W)', x0 + plotW / 2, y1 + (nrw ? 23 : 30));
    // curve
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.beginPath();
    pts.forEach(([p, s], i) => { const X = lx(p), Y = ly(s); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();
    // operating point
    const cx = lx(this.params.pwr), cy = ly(cur.snr_db);
    g.fillStyle = c.goodCol; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.figBg; g.lineWidth = 1.5; g.stroke();
  }
}
