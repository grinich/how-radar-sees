// @ts-check
// §6 — Waveforms and PAPR. A clean radar chirp holds constant amplitude (PAPR ≈
// 0 dB) so the amplifier runs flat-out; communications waveforms (OFDM, many
// beams) have violent peaks, forcing the amplifier to back off. Pick a waveform.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// deterministic phase set for OFDM subcarriers (no RNG)
const PH = [0.2, 1.7, 3.0, 0.9, 2.4, 5.1, 1.1, 4.2, 2.9, 0.4, 3.7, 5.6, 1.9, 4.8, 0.7, 2.2];

export default class Waveforms extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'kind', label: 'Waveform',
      options: [['CW', 'cw'], ['QPSK', 'qpsk'], ['Chirp', 'lfm'], ['OFDM', 'ofdm']], value: 'lfm' },
    { type: 'range', name: 'beams', label: 'Beams', min: 1, max: 8, step: 1, value: 1, format: (v) => `${v}` },
  ];

  // complex baseband sample at normalized time t in [0,1)
  sample(t) {
    const k = this.params.kind;
    let re = 0, im = 0;
    if (k === 'cw') { re = Math.cos(2 * Math.PI * 6 * t); im = Math.sin(2 * Math.PI * 6 * t); }
    else if (k === 'qpsk') { const sym = Math.floor(t * 8) % 4; const ph = sym * Math.PI / 2; re = Math.cos(2 * Math.PI * 6 * t + ph); im = Math.sin(2 * Math.PI * 6 * t + ph); }
    else if (k === 'lfm') { const ph = 2 * Math.PI * (2 * t + 8 * t * t); re = Math.cos(ph); im = Math.sin(ph); }
    else { const M = 14; for (let n = 1; n <= M; n++) { const ph = 2 * Math.PI * n * t + PH[n % PH.length]; re += Math.cos(ph); im += Math.sin(ph); } re /= Math.sqrt(M); im /= Math.sqrt(M); }
    // multiple beams add independent offsets -> raises peaks
    if (this.params.beams > 1) {
      for (let b = 1; b < this.params.beams; b++) { const off = b * 0.37; const ph = 2 * Math.PI * (6 + b) * t + off; re += Math.cos(ph); im += Math.sin(ph); }
      re /= Math.sqrt(this.params.beams); im /= Math.sqrt(this.params.beams);
    }
    return [re, im];
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const N = 500;
    const env = new Array(N + 1), reArr = new Array(N + 1);
    let peak = 0, meanP = 0, maxEnv = 0;
    for (let i = 0; i <= N; i++) { const [re, im] = this.sample(i / N); const p = re * re + im * im; env[i] = Math.sqrt(p); reArr[i] = re; if (p > peak) peak = p; meanP += p; if (env[i] > maxEnv) maxEnv = env[i]; }
    meanP /= (N + 1);
    const paprDb = 10 * Math.log10(peak / meanP);

    const m = 40, plotW = w - m * 2, plotH = h * 0.60, y0 = 30, ymid = y0 + plotH / 2;
    const scale = (plotH / 2) * 0.9 / Math.max(maxEnv, 1);

    g.strokeStyle = rgba(c.rule, 0.9); g.beginPath(); g.moveTo(m, ymid); g.lineTo(m + plotW, ymid); g.stroke();
    // envelope band
    g.fillStyle = rgba(c.noiseCol, 0.12); g.beginPath();
    for (let i = 0; i <= N; i++) { const x = m + (i / N) * plotW, y = ymid - env[i] * scale; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    for (let i = N; i >= 0; i--) { const x = m + (i / N) * plotW, y = ymid + env[i] * scale; g.lineTo(x, y); }
    g.closePath(); g.fill();
    // real part
    g.strokeStyle = c.echoCol; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i <= N; i++) { const x = m + (i / N) * plotW, y = ymid - reArr[i] * scale; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // peak line
    const py = ymid - maxEnv * scale;
    g.strokeStyle = rgba(c.badCol, 0.7); g.setLineDash([4, 3]); g.beginPath(); g.moveTo(m, py); g.lineTo(m + plotW, py); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.noiseCol; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('envelope', m + 4, y0 + 10);

    // readout
    const highP = paprDb > 5;
    g.fillStyle = highP ? c.badCol : c.goodCol; g.font = `700 22px ${FONT}`; g.textAlign = 'left';
    g.fillText(`PAPR ${paprDb.toFixed(1)} dB`, m, ymid + plotH / 2 + 44);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    const msg = highP ? 'high peaks — the amplifier must back off, wasting efficiency'
      : 'flat envelope — the amplifier can run at full efficiency';
    g.fillText(msg, m, ymid + plotH / 2 + 64);
  }
}
