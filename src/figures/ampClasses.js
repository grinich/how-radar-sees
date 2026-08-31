// @ts-check
// §6 — Amplifier classes. The transistor only conducts while the drive is above
// its bias threshold; the fraction of each cycle it conducts (the conduction
// angle) sets the tradeoff between linearity and efficiency. Pick a class.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// threshold as a fraction of the sine amplitude; effMax = theoretical peak efficiency
const CLASSES = {
  A: { thr: -1.0, eff: 50, note: 'conducts the whole cycle — most linear, least efficient' },
  AB: { thr: -0.3, eff: 60, note: 'a little over half — the workhorse compromise' },
  B: { thr: 0.0, eff: 78.5, note: 'exactly half each cycle — efficient, needs a push-pull pair' },
  C: { thr: 0.5, eff: 85, note: 'only the peaks — very efficient, badly distorting alone' },
};

export default class AmpClasses extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'cls', label: 'Class', options: [['A', 'A'], ['AB', 'AB'], ['B', 'B'], ['C', 'C']], value: 'AB' },
  ];
  init() { super.init(); this.mode = 'animated'; this.t = 0; }
  update(dt) { this.t += dt * 1.6; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const cl = CLASSES[this.params.cls];

    const m = 40, plotW = w - m * 2, plotH = h * 0.62 - m, y0 = m, ymid = y0 + plotH / 2, yb = y0 + plotH;
    // axes
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(m, ymid); g.lineTo(m + plotW, ymid); g.stroke();
    // threshold line
    const thrY = ymid - cl.thr * (plotH / 2) * 0.92;
    g.strokeStyle = rgba(c.txCol, 0.8); g.setLineDash([5, 4]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(m, thrY); g.lineTo(m + plotW, thrY); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.txCol; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('bias threshold', m + 4, thrY - 5);

    // drive sine (input) and conduction shading
    const amp = (plotH / 2) * 0.92;
    const sine = (x) => Math.sin(x * Math.PI * 4 + this.t);
    // conducting region fill
    g.beginPath(); let started = false;
    for (let i = 0; i <= plotW; i++) {
      const xn = i / plotW; const s = sine(xn);
      const x = m + i;
      if (s >= cl.thr) {
        const yTop = ymid - s * amp;
        if (!started) { g.moveTo(x, thrY); started = true; }
        g.lineTo(x, yTop);
      } else if (started) { g.lineTo(x - 1, thrY); }
    }
    g.fillStyle = rgba(c.echoCol, 0.25); g.fill();

    // input sine
    g.strokeStyle = rgba(c.muted, 0.8); g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i <= plotW; i++) { const s = sine(i / plotW); const x = m + i, y = ymid - s * amp; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // output current (conducting part only)
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.beginPath(); started = false;
    for (let i = 0; i <= plotW; i++) { const s = sine(i / plotW); const x = m + i; const y = s >= cl.thr ? ymid - s * amp : thrY;
      if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
    g.stroke();

    // conduction angle
    const conductionAngle = Math.round(2 * Math.acos(Math.max(-1, Math.min(1, cl.thr))) * 180 / Math.PI);

    // readout
    g.textAlign = 'left';
    g.fillStyle = c.ink; g.font = `700 16px ${FONT}`;
    g.fillText(`Class ${this.params.cls}`, m, yb + 34);
    g.fillStyle = c.echoCol; g.font = `600 13px ${FONT}`;
    g.fillText(`conduction ${conductionAngle}°   ·   peak efficiency ~${cl.eff}%`, m, yb + 54);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    wrapText(g, cl.note, m, yb + 74, w - m * 2, 16);
  }
}

function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const wd of words) {
    const test = line + wd + ' ';
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = wd + ' '; y += lh; }
    else line = test;
  }
  g.fillText(line, x, y);
}
