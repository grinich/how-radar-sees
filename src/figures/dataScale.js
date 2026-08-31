// @ts-check
// §11 — The data problem. A single radar swath dwarfs a laser link's capacity, and
// whole-Earth imaging dwarfs a datacenter's compute — which is why processing must
// happen in orbit. Log-scale bars; toggle between the data and compute comparisons.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const VIEWS = {
  data: {
    title: 'Data: one radar swath vs what you can send down',
    unit: 'bytes',
    bars: [
      { label: 'One 20 km swath, few seconds', val: 100e9, col: 'noise' },
      { label: 'Laser link, 1 s at 1 Tbit/s', val: 125e9, col: 'echo' },
      { label: 'Laser link, full 90 min orbit', val: 125e9 * 5400, col: 'echo' },
      { label: 'Whole Earth at 40 cm (one pass)', val: 8e15, col: 'bad' },
    ],
  },
  compute: {
    title: 'Compute: whole-Earth imaging vs a datacenter',
    unit: 'FLOP/s',
    bars: [
      { label: 'One target track (real-time)', val: 1e12, col: 'echo' },
      { label: 'Large ground datacenter', val: 5e18, col: 'good' },
      { label: 'Whole Earth back-projection', val: 1e20, col: 'bad' },
    ],
  },
};

export default class DataScale extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'view', label: 'Compare', options: [['Data', 'data'], ['Compute', 'compute']], value: 'data' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const v = VIEWS[this.params.view];
    const colMap = { noise: c.noiseCol, echo: c.echoCol, bad: c.badCol, good: c.goodCol };

    g.fillStyle = c.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText(v.title, 16, 26);

    const m = 16, top = 48, barH = Math.min(46, (h - top - 20) / v.bars.length - 12);
    const labelW = w * 0.42, x0 = m + labelW, plotW = w - x0 - 70;
    const maxLog = Math.log10(Math.max(...v.bars.map((b) => b.val)));
    const minLog = Math.log10(Math.min(...v.bars.map((b) => b.val))) - 1;

    v.bars.forEach((b, i) => {
      const y = top + i * (barH + 12);
      const lg = Math.log10(b.val);
      const frac = (lg - minLog) / (maxLog - minLog);
      g.fillStyle = rgba(colMap[b.col], 0.8);
      g.fillRect(x0, y, Math.max(2, frac * plotW), barH);
      g.fillStyle = c.ink; g.font = `12px ${FONT}`; g.textAlign = 'right';
      wrapRight(g, b.label, x0 - 10, y + barH / 2, labelW - 12, 15);
      g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left';
      g.fillText(human(b.val, v.unit), x0 + Math.max(2, frac * plotW) + 6, y + barH / 2 + 4);
    });

    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText('(log scale — each step is 10×)', m, h - 8);
  }
}

function human(val, unit) {
  if (unit === 'bytes') { const u = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0, x = val; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return `${x.toFixed(0)} ${u[i]}`; }
  const u = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z']; let i = 0, x = val; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return `${x.toFixed(0)} ${u[i]}FLOP/s`;
}
function wrapRight(g, text, x, ymid, maxW, lh) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const wd of words) { const t = line + wd + ' '; if (g.measureText(t).width > maxW && line) { lines.push(line); line = wd + ' '; } else line = t; }
  lines.push(line);
  let y = ymid - (lines.length - 1) * lh / 2 + 4;
  for (const l of lines) { g.fillText(l.trim(), x, y); y += lh; }
}
