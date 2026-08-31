// @ts-check
// Ch4 — Multiple access. Share the channel by time, frequency, or space. Space
// division is the powerful one: separate beams reuse the same frequencies, so
// total capacity multiplies.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const USERS = ['#2563eb', '#15803d', '#c2410c', '#9333ea'];

export default class MultipleAccess extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'scheme', label: 'Scheme', options: [['Time', 'tdma'], ['Frequency', 'fdma'], ['Space', 'sdma']], value: 'sdma' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const s = this.params.scheme;
    const m = 30, gx = m + 40, gy = 46, gw = w - gx - m, gh = h - gy - 60;

    if (s === 'sdma') {
      // ground map with 4 spatially separated beams, all the same frequency
      g.fillStyle = rgba(c.targetCol, 0.08); g.fillRect(gx, gy, gw, gh);
      g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(gx, gy, gw, gh);
      const spots = [[0.25, 0.35], [0.7, 0.3], [0.4, 0.7], [0.78, 0.72]];
      spots.forEach((p, i) => {
        const x = gx + p[0] * gw, y = gy + p[1] * gh;
        g.fillStyle = rgba(USERS[0], 0.5); // SAME frequency (same colour) reused
        g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
        g.strokeStyle = USERS[0]; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = c.ink; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText(`user ${i + 1}`, x, y + 4);
      });
      g.fillStyle = c.ink; g.font = `700 13px ${FONT}`; g.textAlign = 'left';
      g.fillText('Same frequency, reused in separated beams', gx, gy - 12);
      g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.fillText('Capacity multiplies with the number of non-overlapping beams.', m, h - 14);
      return;
    }

    // time-frequency resource grid for TDMA / FDMA
    const cols = 8, rows = 6;
    const cw = gw / cols, ch = gh / rows;
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      let user;
      if (s === 'tdma') user = Math.floor(cc / (cols / 4));      // time slots
      else user = Math.floor(r / (rows / 4));                    // freq bands (approx)
      g.fillStyle = rgba(USERS[user % 4], 0.55);
      g.fillRect(gx + cc * cw, gy + r * ch, cw - 1, ch - 1);
    }
    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(gx, gy, gw, gh);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('time →', gx + gw / 2, gy + gh + 16);
    g.save(); g.translate(gx - 16, gy + gh / 2); g.rotate(-Math.PI / 2); g.fillText('frequency', 0, 0); g.restore();
    g.fillStyle = c.ink; g.font = `700 13px ${FONT}`; g.textAlign = 'left';
    g.fillText(s === 'tdma' ? 'Each user gets time slots (full bandwidth)' : 'Each user gets a frequency band (all the time)', gx, gy - 12);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.fillText('Colours are users. The channel is divided once — no frequency reuse.', m, h - 14);
  }
}
