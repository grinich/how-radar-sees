// @ts-check
// Ch3 — The Doppler dilemma. PRF must exceed the Doppler bandwidth (or the scene
// ghosts) yet stay below the range-ambiguity ceiling (or returns eclipse). Finer
// resolution raises the floor; a wider swath lowers the ceiling. Watch the window
// close — and sometimes vanish.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const C = 3e8, V = 7500;      // light speed, satellite speed (m/s)
const PMIN = 1000, PMAX = 40000;

export default class DopplerDilemma extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'res', label: 'Azimuth resolution', min: 0.25, max: 5, step: 0.25, value: 2.5, format: (v) => `${v.toFixed(2)} m` },
    { type: 'range', name: 'swath', label: 'Range swath', min: 10, max: 100, step: 5, value: 30, format: (v) => `${v} km` },
    { type: 'range', name: 'prf', label: 'PRF', min: PMIN, max: PMAX, step: 500, value: 4000, format: (v) => `${(v / 1000).toFixed(1)} kHz` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const floor = V / this.params.res;                 // Doppler floor
    const ceil = C / (2 * this.params.swath * 1000);   // range-ambiguity ceiling

    const m = 30, top = 70, barH = 46, y = top, x0 = m, bw = w - m * 2;
    const X = (p) => x0 + (Math.log10(p / PMIN) / Math.log10(PMAX / PMIN)) * bw;

    // regions
    const fx = X(Math.max(PMIN, Math.min(PMAX, floor)));
    const cx = X(Math.max(PMIN, Math.min(PMAX, ceil)));
    g.fillStyle = rgba(c.badCol, 0.16); g.fillRect(x0, y, fx - x0, barH);        // below floor
    g.fillStyle = rgba(c.badCol, 0.16); g.fillRect(cx, y, x0 + bw - cx, barH);   // above ceiling
    const valid = ceil > floor;
    if (valid) { g.fillStyle = rgba(c.goodCol, 0.22); g.fillRect(fx, y, cx - fx, barH); }
    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, y, bw, barH);

    // floor / ceiling lines (labels staggered so they never collide)
    for (const [px, lab, side, ly] of [[floor, 'Doppler floor', 'l', y - 26], [ceil, 'range ceiling', 'r', y - 12]]) {
      if (px < PMIN || px > PMAX) continue;
      const xx = X(px);
      g.strokeStyle = c.badCol; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, y - 8); g.lineTo(xx, y + barH + 8); g.stroke();
      g.fillStyle = c.badCol; g.font = `11px ${FONT}`; g.textAlign = side === 'l' ? 'right' : 'left';
      g.fillText(lab, xx + (side === 'l' ? -4 : 4), ly);
    }

    // labels inside regions
    g.fillStyle = c.badCol; g.font = `11px ${FONT}`; g.textAlign = 'center';
    if (fx - x0 > 60) g.fillText('azimuth ghosting', (x0 + fx) / 2, y + barH / 2 + 4);
    if (x0 + bw - cx > 60) g.fillText('range eclipsing', (cx + x0 + bw) / 2, y + barH / 2 + 4);
    if (valid && cx - fx > 50) { g.fillStyle = c.goodCol; g.fillText('usable', (fx + cx) / 2, y + barH / 2 + 4); }

    // PRF ticks
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const p of [1000, 2000, 5000, 10000, 20000, 40000]) { const xx = X(p); g.beginPath(); g.moveTo(xx, y + barH); g.lineTo(xx, y + barH + 4); g.strokeStyle = rgba(c.rule, 0.8); g.stroke(); g.fillText(p >= 1000 ? `${p / 1000}k` : `${p}`, xx, y + barH + 16); }
    g.textAlign = 'left'; g.fillText('PRF (Hz)', x0, y + barH + 30);

    // current PRF marker
    const px = X(this.params.prf);
    g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y - 4); g.lineTo(px, y + barH + 4); g.stroke();
    g.fillStyle = c.ink; g.beginPath(); g.moveTo(px, y - 4); g.lineTo(px - 5, y - 12); g.lineTo(px + 5, y - 12); g.closePath(); g.fill();

    // verdict
    const prf = this.params.prf;
    let msg, col;
    if (!valid) { msg = 'No usable PRF — the dilemma: resolution and swath cannot both be met'; col = c.badCol; }
    else if (prf < floor) { msg = 'PRF too low — Doppler undersampled, scene ghosts'; col = c.badCol; }
    else if (prf > ceil) { msg = 'PRF too high — returns eclipse and ranges fold'; col = c.badCol; }
    else { msg = 'PRF in the usable window — clean image'; col = c.goodCol; }
    g.fillStyle = c.ink; g.font = `700 15px ${FONT}`; g.textAlign = 'left';
    g.fillText(`Doppler floor ${(floor / 1000).toFixed(1)} kHz   ·   range ceiling ${(ceil / 1000).toFixed(1)} kHz`, m, 34);
    g.fillStyle = col; g.font = `600 13px ${FONT}`; g.fillText(msg, m, h - 16);
  }
}
