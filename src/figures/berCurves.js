// @ts-check
// Ch4 — Bit-error rate vs signal-to-noise. Each modulation has its own curve; the
// best choice is the densest one still below your error threshold. Slide the SNR.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const Q = (x) => 0.5 * erfc(x / Math.SQRT2);
// M-QAM BER vs Es/N0 (dB)
function ber(M, esn0_db) {
  const es = Math.pow(10, esn0_db / 10), k = Math.log2(M);
  if (M === 2) return Q(Math.sqrt(2 * es));           // BPSK: Es/N0 = Eb/N0
  const ser = 4 * (1 - 1 / Math.sqrt(M)) * Q(Math.sqrt(3 * es / (M - 1)));
  return Math.min(0.5, ser / k);
}
const MODS = [
  { M: 2, name: 'BPSK', col: '#2563eb' }, { M: 4, name: 'QPSK', col: '#15803d' },
  { M: 16, name: '16-QAM', col: '#c2410c' }, { M: 64, name: '64-QAM', col: '#9333ea' }, { M: 256, name: '256-QAM', col: '#dc2626' },
];
const SNR0 = 0, SNR1 = 34;

export default class BerCurves extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'snr', label: 'Signal / noise', min: SNR0, max: SNR1, step: 1, value: 16, format: (v) => `${v} dB` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 44, x0 = m, top = 24, plotW = w - m - 120, plotH = h - top - 34, y1 = top + plotH;
    const X = (s) => x0 + (s - SNR0) / (SNR1 - SNR0) * plotW;
    const Ymin = -6; // log10 BER floor
    const Y = (ber) => { const l = Math.max(Ymin, Math.log10(Math.max(ber, 1e-7))); return top + (Math.log10(0.5) - l) / (Math.log10(0.5) - Ymin) * plotH; };

    // grid
    g.strokeStyle = rgba(c.rule, 0.9); g.strokeRect(x0, top, plotW, plotH);
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'right';
    for (let e = 0; e >= Ymin; e--) { const y = Y(Math.pow(10, e)); g.fillText(`10^${e}`, x0 - 5, y + 3); g.strokeStyle = rgba(c.rule, 0.4); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + plotW, y); g.stroke(); }
    g.textAlign = 'center';
    for (const s of [0, 10, 20, 30]) g.fillText(`${s}`, X(s), y1 + 14);
    g.fillText('Es/N0 (dB)', x0 + plotW / 2, y1 + 28);
    g.save(); g.translate(12, top + plotH / 2); g.rotate(-Math.PI / 2); g.fillText('bit-error rate', 0, 0); g.restore();

    // curves
    for (const mod of MODS) {
      g.strokeStyle = mod.col; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 120; i++) { const s = SNR0 + i / 120 * (SNR1 - SNR0); const x = X(s), y = Y(ber(mod.M, s)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }

    // current SNR marker + best modulation
    const snr = this.params.snr;
    g.strokeStyle = rgba(c.ink, 0.4); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(snr), top); g.lineTo(X(snr), y1); g.stroke(); g.setLineDash([]);
    let best = MODS[0];
    for (const mod of MODS) if (ber(mod.M, snr) < 1e-3) best = mod;

    // legend + verdict
    const lx = x0 + plotW + 16;
    g.textAlign = 'left';
    MODS.forEach((mod, i) => { g.fillStyle = mod.col; g.fillRect(lx, top + 6 + i * 20, 12, 3); g.fillStyle = c.ink; g.font = `12px ${FONT}`; g.fillText(mod.name, lx + 18, top + 10 + i * 20); });
    g.fillStyle = c.goodCol; g.font = `700 13px ${FONT}`;
    g.fillText('best now:', lx, top + 130); g.fillText(`${best.name}`, lx, top + 148);
    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.fillText(`${Math.log2(best.M)} bits/sym`, lx, top + 166);
  }
}
