// @ts-check
// Ch4 — The RF chain. Transmitting: bits → DAC → up-convert → power amplifier →
// antenna. Receiving: the reverse, with a low-noise amplifier coddling the faint
// signal. Toggle transmit / receive; a pulse animates the signal's journey.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, roundRect, FONT } from '../core/draw.js';

const TX = ['Bits', 'DAC', 'Up-convert', 'Power amp', 'Antenna'];
const RX = ['Antenna', 'Low-noise amp', 'Down-convert', 'ADC', 'Bits'];

export default class RfChain extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'dir', label: 'Direction', options: [['Transmit', 'tx'], ['Receive', 'rx']], value: 'tx' },
  ];
  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const tx = this.params.dir === 'tx';
    const blocks = tx ? TX : RX;
    const n = blocks.length, m = 20, cy = h / 2;
    const bw = Math.min(120, (w - m * 2) / n - 12), gap = ((w - m * 2) - bw * n) / (n - 1);
    const bh = 54;

    // connectors
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 2;
    for (let i = 0; i < n - 1; i++) {
      const x1 = m + i * (bw + gap) + bw, x2 = m + (i + 1) * (bw + gap);
      g.beginPath(); g.moveTo(x1, cy); g.lineTo(x2, cy); g.stroke();
      // arrow
      const ax = x2 - 4; g.fillStyle = rgba(c.rule, 1); g.beginPath(); g.moveTo(ax, cy); g.lineTo(ax - 7, cy - 4); g.lineTo(ax - 7, cy + 4); g.closePath(); g.fill();
    }

    // blocks
    for (let i = 0; i < n; i++) {
      const x = m + i * (bw + gap);
      const isAmp = blocks[i].includes('amp');
      g.fillStyle = isAmp ? rgba(c.txCol, 0.16) : rgba(c.echoCol, 0.10);
      roundRect(g, x, cy - bh / 2, bw, bh, 8); g.fill();
      g.strokeStyle = isAmp ? c.txCol : rgba(c.echoCol, 0.6); g.lineWidth = 1.5; roundRect(g, x, cy - bh / 2, bw, bh, 8); g.stroke();
      g.fillStyle = c.ink; g.font = `600 12px ${FONT}`; g.textAlign = 'center';
      wrap(g, blocks[i], x + bw / 2, cy, bw - 12, 14);
    }

    // animated signal pulse
    const total = (n - 1) * (bw + gap);
    const p = (this.t * 0.35) % 1;
    const px = m + p * total + bw / 2;
    g.fillStyle = c.goodCol; g.beginPath(); g.arc(px, cy, 6, 0, Math.PI * 2); g.fill();
    g.shadowColor = rgba(c.goodCol, 0.8); g.shadowBlur = 10; g.beginPath(); g.arc(px, cy, 4, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;

    g.fillStyle = c.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left';
    g.fillText(tx ? 'Transmit chain' : 'Receive chain', m, 26);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.textAlign = 'right';
    g.fillText(tx ? 'digital → analog → radiated power' : 'faint wave → amplified → digital bits', w - m, 26);
  }
}
function wrap(g, text, x, ymid, maxW, lh) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const wd of words) { const t = line + wd + ' '; if (g.measureText(t).width > maxW && line) { lines.push(line.trim()); line = wd + ' '; } else line = t; }
  lines.push(line.trim());
  let y = ymid - (lines.length - 1) * lh / 2 + 4;
  for (const l of lines) { g.fillText(l, x, y); y += lh; }
}
