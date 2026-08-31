// @ts-check
// §7 — Transmit-and-listen timing. In half-duplex the receiver is blanked while
// the transmitter fires, so an echo that arrives during a pulse is eclipsed and
// lost. Full duplex removes the gaps. Adjust duty cycle and target range.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

export default class DuplexTimeline extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'duty', label: 'Duty cycle', min: 5, max: 45, step: 1, value: 20, format: (v) => `${v}%` },
    { type: 'range', name: 'range', label: 'Echo delay', min: 10, max: 145, step: 1, value: 70, format: (v) => `${(v / 100).toFixed(2)} PRI` },
    { type: 'toggle', name: 'full', label: 'Full duplex', value: false },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const nPRI = 4;
    const m = 16, plotW = w - m * 2;
    const pri = plotW / nPRI;
    const pw = pri * (this.params.duty / 100);
    const tau = pri * (this.params.range / 100);
    const txY = 40, rxY = h * 0.55, rowH = h * 0.20;

    g.fillStyle = c.muted; g.font = `600 12px ${FONT}`; g.textAlign = 'left';
    g.fillText('Transmit', m, txY - 8);
    g.fillText('Receive', m, rxY - 8);

    // receiver blanking bands (half-duplex only)
    if (!this.params.full) {
      g.fillStyle = rgba(c.muted, 0.14);
      for (let n = 0; n < nPRI + 1; n++) { const x = m + n * pri; g.fillRect(x, rxY, pw, rowH); }
    }

    // Tx pulses
    for (let n = 0; n < nPRI + 1; n++) {
      const x = m + n * pri;
      g.fillStyle = rgba(c.txCol, 0.85);
      g.fillRect(x, txY, pw, rowH);
    }

    // echoes
    let eclipsed = 0, received = 0;
    for (let n = 0; n < nPRI + 1; n++) {
      const x = m + n * pri + tau;
      if (x > m + plotW) continue;
      // eclipsed if it overlaps any Tx pulse window (half-duplex)
      let hit = false;
      if (!this.params.full) {
        for (let k = 0; k < nPRI + 2; k++) { const px = m + k * pri; if (x + pw > px && x < px + pw) { hit = true; break; } }
      }
      g.fillStyle = hit ? rgba(c.badCol, 0.85) : rgba(c.echoCol, 0.85);
      g.fillRect(x, rxY, pw, rowH);
      hit ? eclipsed++ : received++;
      // delay connector
      g.strokeStyle = rgba(c.muted, 0.4); g.setLineDash([2, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(m + n * pri, txY + rowH); g.lineTo(x, rxY); g.stroke(); g.setLineDash([]);
    }

    // PRI ticks
    g.strokeStyle = rgba(c.rule, 0.9); g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (let n = 0; n <= nPRI; n++) { const x = m + n * pri; g.beginPath(); g.moveTo(x, rxY + rowH); g.lineTo(x, rxY + rowH + 5); g.stroke(); g.fillText(`${n} PRI`, x, rxY + rowH + 18); }

    // verdict
    g.textAlign = 'left'; g.font = `600 13px ${FONT}`;
    if (this.params.full) { g.fillStyle = c.goodCol; g.fillText('Full duplex — every echo received, continuous wave possible', m, h - 12); }
    else if (eclipsed) { g.fillStyle = c.badCol; g.fillText(`Half-duplex — ${eclipsed} echo(es) eclipsed by the transmit pulse`, m, h - 12); }
    else { g.fillStyle = c.goodCol; g.fillText('Half-duplex — echoes clear the transmit windows', m, h - 12); }
  }
}
