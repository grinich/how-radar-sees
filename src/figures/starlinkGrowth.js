// @ts-check
// Starlink's growth, 2019–2026: from a technology demo to a permanent layer of
// infrastructure overhead. Drag the year to read the count. The point is the
// sheer scale and coverage — the raw ingredient any space-based sensor needs.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// Approximate satellites in orbit at year-end (mid-year for 2026; the 2026
// figure matches the public element sets the live tracker downloads).
const DATA = [
  { y: 2019, n: 120 }, { y: 2020, n: 1000 }, { y: 2021, n: 1900 }, { y: 2022, n: 3300 },
  { y: 2023, n: 5000 }, { y: 2024, n: 6900 }, { y: 2025, n: 8000 }, { y: 2026, n: 10700 },
];
const YR0 = 2019, YR1 = 2026, NMAX = 12000;

export default class StarlinkGrowth extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'year', label: 'Year', min: YR0, max: YR1, step: 1, value: YR1, format: (v) => `${v}` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = { l: 54, r: 16, t: 40, b: 34 };
    const x0 = m.l, x1 = w - m.r, y0 = h - m.b, y1 = m.t;
    const X = (yr) => x0 + (yr - YR0) / (YR1 - YR0) * (x1 - x0);
    const Y = (n) => y0 - n / NMAX * (y0 - y1);

    g.fillStyle = c.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText('Starlink satellites in orbit', x0, 24);

    // horizontal gridlines + y labels
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    for (let n = 0; n <= NMAX; n += 2000) {
      const y = Y(n);
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'right';
      g.fillText(n.toLocaleString(), x0 - 8, y + 3);
    }
    // x labels
    g.fillStyle = c.muted; g.textAlign = 'center';
    for (const d of DATA) g.fillText(`’${String(d.y).slice(2)}`, X(d.y), y0 + 18);

    // filled area
    g.beginPath(); g.moveTo(X(DATA[0].y), y0);
    for (const d of DATA) g.lineTo(X(d.y), Y(d.n));
    g.lineTo(X(DATA[DATA.length - 1].y), y0); g.closePath();
    g.fillStyle = rgba(c.echoCol, 0.16); g.fill();
    // line
    g.beginPath();
    DATA.forEach((d, i) => { const px = X(d.y), py = Y(d.n); i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.strokeStyle = c.echoCol; g.lineWidth = 2.2; g.stroke();

    // selected-year marker
    const yr = this.params.year, n = interp(yr), mx = X(yr), my = Y(n);
    g.strokeStyle = rgba(c.muted, 0.55); g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(mx, y0); g.lineTo(mx, my); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.echoCol; g.beginPath(); g.arc(mx, my, 5, 0, 7); g.fill();
    g.fillStyle = c.figBg; g.beginPath(); g.arc(mx, my, 2, 0, 7); g.fill();

    const right = mx > w * 0.68;
    g.textAlign = right ? 'right' : 'left';
    const lx = right ? mx - 12 : mx + 12;
    g.fillStyle = c.ink; g.font = `700 15px ${FONT}`;
    g.fillText(`${Math.round(n / 10) * 10 >= 8000 ? '≈' : ''}${Math.round(n).toLocaleString()}`, lx, my - 20);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`;
    g.fillText(`satellites · ${yr}`, lx, my - 6);

    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText('Licensed for ~12,000 · filed for up to ~42,000', x0, h - 6);
  }
}

function interp(yr) {
  for (let i = 0; i < DATA.length - 1; i++) {
    if (yr >= DATA[i].y && yr <= DATA[i + 1].y) {
      const t = (yr - DATA[i].y) / (DATA[i + 1].y - DATA[i].y);
      return DATA[i].n + (DATA[i + 1].n - DATA[i].n) * t;
    }
  }
  return DATA[DATA.length - 1].n;
}
