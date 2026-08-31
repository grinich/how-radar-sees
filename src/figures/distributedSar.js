// @ts-check
// Ch3 — Distributed (multistatic) SAR. One transmitter illuminates a target; a
// swarm of cheap receivers catches bistatic echoes from many angles. Add receivers
// and watch the baselines and viewing angles multiply.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

export default class DistributedSar extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'rx', label: 'Receiver satellites', min: 1, max: 20, step: 1, value: 6, format: (v) => `${v}` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const gy = h - 46, cx = w / 2;
    // target on the ground
    const tx = cx, ty = gy;

    // ground
    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(20, gy); g.lineTo(w - 20, gy); g.stroke();

    // transmitter (top-left) illuminating the target
    const txSat = { x: cx - w * 0.28, y: 40 };
    g.strokeStyle = rgba(c.txCol, 0.8); g.lineWidth = 2;
    g.beginPath(); g.moveTo(txSat.x, txSat.y); g.lineTo(tx, ty); g.stroke();
    drawSat(g, txSat.x, txSat.y, c.txCol, 'Tx');

    // receivers spread across the top
    const n = this.params.rx;
    const rxs = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const rx = { x: 40 + u * (w - 80), y: 34 + Math.sin(u * Math.PI) * 18 };
      rxs.push(rx);
      // bistatic return path target -> rx
      g.strokeStyle = rgba(c.echoCol, 0.5); g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(rx.x, rx.y); g.stroke();
    }
    // baselines between adjacent receivers
    g.strokeStyle = rgba(c.targetCol, 0.6); g.lineWidth = 1.5; g.setLineDash([3, 3]);
    for (let i = 1; i < rxs.length; i++) { g.beginPath(); g.moveTo(rxs[i - 1].x, rxs[i - 1].y); g.lineTo(rxs[i].x, rxs[i].y); g.stroke(); }
    g.setLineDash([]);
    for (const rx of rxs) drawSat(g, rx.x, rx.y, c.echoCol, '');

    // target
    g.fillStyle = c.targetCol; g.beginPath(); g.arc(tx, ty, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = c.ink; g.font = `11px ${FONT}`; g.textAlign = 'center'; g.fillText('target', tx, ty + 22);

    // readout
    g.textAlign = 'left'; g.fillStyle = c.ink; g.font = `700 14px ${FONT}`;
    g.fillText(`1 transmitter · ${n} receiver${n > 1 ? 's' : ''}`, 20, 24);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    g.fillText(`${n} viewing angles · ${Math.max(0, n - 1)} baselines · bistatic looks even at stealth targets`, 20, h - 12);
  }
}

function drawSat(g, x, y, col, label) {
  g.fillStyle = col; g.fillRect(x - 6, y - 4, 12, 8);
  g.fillStyle = 'rgba(120,140,170,0.8)'; g.fillRect(x - 12, y - 1.5, 4, 3); g.fillRect(x + 8, y - 1.5, 4, 3);
  if (label) { g.fillStyle = col; g.font = '10px ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(label, x, y - 10); }
}
