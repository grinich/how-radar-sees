// @ts-check
// §7 — The isolation ladder. The transmitter can be ~200 dB louder than the echo.
// Stack isolation mechanisms and see whether you reach what a monostatic radar
// (~140 dB) or a space SAR (~200 dB) demands — and why a bistatic pair gets there
// almost for free through spatial path loss.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const MECHS = [
  { name: 'tdd', label: 'Transmit gating (half-duplex)', db: 120 },
  { name: 'fdd', label: 'Frequency separation', db: 40 },
  { name: 'pol', label: 'Polarization', db: 30 },
  { name: 'circ', label: 'Circulator', db: 30 },
  { name: 'spatial', label: 'Spatial (bistatic path loss)', db: 90 },
  { name: 'cancel', label: 'Analog + digital cancellation', db: 70 },
];

export default class IsolationLadder extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'target', label: 'Requirement', options: [['Standard 140 dB', 140], ['Space SAR 200 dB', 200]], value: 200 },
    ...MECHS.map((m) => ({ type: 'toggle', name: m.name, label: m.label.replace(/ \(.*/, ''), value: m.name === 'spatial' })),
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const req = this.params.target;
    const maxDb = 230;
    const m = 20, topY = 34, botY = h - 30, colX = w * 0.34, barW = 54;
    const yFor = (db) => topY + (db / maxDb) * (botY - topY);

    // axis
    g.fillStyle = c.ink; g.font = `600 13px ${FONT}`; g.textAlign = 'left';
    g.fillText('Transmit power', m, topY - 12);
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    for (let db = 0; db <= maxDb; db += 40) { const y = yFor(db); g.beginPath(); g.moveTo(colX - 8, y); g.lineTo(colX + barW + 8, y); g.stroke();
      g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'right'; g.fillText(`−${db}`, colX - 12, y + 3); }

    // stacked isolation blocks
    let cum = 0;
    const colors = [c.echoCol, c.txCol, c.targetCol, c.noiseCol, c.accent, c.badCol];
    let ci = 0;
    for (const mech of MECHS) {
      if (!this.params[mech.name]) { ci++; continue; }
      const y0 = yFor(cum), y1 = yFor(cum + mech.db);
      g.fillStyle = rgba(colors[ci % colors.length], 0.75);
      g.fillRect(colX, y0, barW, y1 - y0);
      g.strokeStyle = c.figBg; g.strokeRect(colX, y0, barW, y1 - y0);
      // label
      g.fillStyle = c.ink; g.font = `12px ${FONT}`; g.textAlign = 'left';
      g.fillText(`${mech.label}  (${mech.db} dB)`, colX + barW + 14, (y0 + y1) / 2 + 4);
      cum += mech.db; ci++;
    }

    // required goal line
    const gy = yFor(req);
    g.strokeStyle = c.badCol; g.setLineDash([6, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(m, gy); g.lineTo(w - m, gy); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.badCol; g.font = `600 12px ${FONT}`; g.textAlign = 'left';
    g.fillText(`required isolation (${req} dB)`, m, gy - 6);

    // echo floor marker
    const ey = yFor(196);
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'right';
    g.fillText('echo ≈ −186 dBW', w - m, botY + 14);

    // verdict
    const ok = cum >= req;
    g.fillStyle = ok ? c.goodCol : c.badCol; g.font = `700 15px ${FONT}`; g.textAlign = 'left';
    g.fillText(`${cum} dB isolation — ${ok ? 'sufficient' : 'not enough'}`, colX, botY + 20);
  }
}
