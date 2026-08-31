// @ts-check
// §4 — Radar bands, atmospheric absorption, and where Starlink transmits. Hover
// a band to read its typical use and weather behaviour. Illustrative curve.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const BANDS = [
  { name: 'L', lo: 1, hi: 2, use: 'Foliage-penetrating SAR, GPS', wx: 'shrugs off weather' },
  { name: 'S', lo: 2, hi: 4, use: 'Weather radar, Starlink direct-to-cell', wx: 'barely affected by rain' },
  { name: 'C', lo: 4, hi: 8, use: 'All-weather SAR (Sentinel-1)', wx: 'light rain loss' },
  { name: 'X', lo: 8, hi: 12, use: 'High-res commercial SAR (ICEYE)', wx: 'moderate rain loss' },
  { name: 'Ku', lo: 12, hi: 18, use: 'Starlink user downlink', wx: 'sensitive to rain' },
  { name: 'K', lo: 18, hi: 27, use: 'Absorbed near 22 GHz (water vapour)', wx: 'poor in humidity' },
  { name: 'Ka', lo: 27, hi: 40, use: 'Starlink enterprise, high-res', wx: 'weather-sensitive' },
  { name: 'V', lo: 40, hi: 75, use: 'Starlink V-band, O₂ absorption', wx: 'very weather-sensitive' },
  { name: 'W', lo: 75, hi: 110, use: 'Ultra-high-res, short range', wx: 'heavy atmospheric loss' },
];
// Starlink transmit bands (GHz), approximate.
const STARLINK = [
  { name: 'DTC', lo: 1.9, hi: 2.1 }, { name: 'Ku', lo: 10.7, hi: 12.7 },
  { name: 'Ka', lo: 17.8, hi: 20.2 }, { name: 'V', lo: 37.5, hi: 42.5 }, { name: 'E', lo: 71, hi: 76 },
];
const FMIN = 1, FMAX = 110;

// Illustrative 1-way zenith absorption (dB): H2O bump ~22, O2 peak ~60, rise past 80.
function absorption(f) {
  const h2o = 0.3 * Math.exp(-((f - 22) ** 2) / 40);
  const o2 = 8 * Math.exp(-((f - 60) ** 2) / 30);
  const rise = 0.02 * Math.max(0, f - 5) + 0.004 * f * f / 20;
  return 0.02 + h2o + o2 + rise;
}

export default class BandChart extends Canvas2DFigure {
  init() {
    super.init();
    this.hoverF = null;
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this._px = e.clientX - r.left;
      this.draw();
    });
    this.canvas.addEventListener('pointerleave', () => { this._px = null; this.draw(); });
  }

  fx(f, x0, plotW) { return x0 + (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * plotW; }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const padL = 44, padR = 14, padT = 20, padB = 92;
    const x0 = padL, plotW = w - padL - padR, y0 = padT, plotH = h - padT - padB, y1 = padT + plotH;

    // hovered band from pointer
    let hov = null;
    if (this._px != null) {
      const f = FMIN * Math.pow(FMAX / FMIN, Math.max(0, Math.min(1, (this._px - x0) / plotW)));
      hov = BANDS.find((b) => f >= b.lo && f < b.hi) || null;
    }

    // band blocks
    for (const b of BANDS) {
      const bx0 = this.fx(b.lo, x0, plotW), bx1 = this.fx(b.hi, x0, plotW);
      const active = hov && hov.name === b.name;
      g.fillStyle = active ? rgba(c.echoCol, 0.28) : rgba(c.echoCol, 0.08);
      g.fillRect(bx0, y0, bx1 - bx0, plotH);
      g.strokeStyle = rgba(c.rule, 0.8); g.strokeRect(bx0, y0, bx1 - bx0, plotH);
      g.fillStyle = c.muted; g.font = `600 12px ${FONT}`; g.textAlign = 'center';
      g.fillText(b.name, (bx0 + bx1) / 2, y1 + 16);
    }

    // absorption curve
    g.strokeStyle = c.noiseCol; g.lineWidth = 2; g.beginPath();
    const aMax = 10;
    for (let i = 0; i <= 200; i++) {
      const f = FMIN * Math.pow(FMAX / FMIN, i / 200);
      const a = Math.min(absorption(f), aMax);
      const X = this.fx(f, x0, plotW), Y = y1 - (a / aMax) * plotH;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    }
    g.stroke();
    g.fillStyle = c.noiseCol; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText('atmospheric absorption', x0 + 6, y0 + 14);

    // frequency ticks (own row, below the band letters)
    g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'center';
    for (const f of [1, 2, 5, 10, 20, 40, 100]) {
      const X = this.fx(f, x0, plotW);
      g.strokeStyle = rgba(c.rule, 0.6); g.beginPath(); g.moveTo(X, y1); g.lineTo(X, y1 + 4); g.stroke();
      g.fillStyle = c.muted; g.fillText(`${f}`, X, y1 + 32);
    }

    // Starlink transmit markers (own row, below the ticks)
    for (const s of STARLINK) {
      const bx0 = this.fx(s.lo, x0, plotW), bx1 = this.fx(s.hi, x0, plotW);
      g.fillStyle = rgba(c.txCol, 0.85);
      g.fillRect(bx0, y1 + 42, Math.max(2, bx1 - bx0), 7);
    }
    g.fillStyle = c.txCol; g.textAlign = 'left'; g.font = `11px ${FONT}`;
    g.fillText('▬ Starlink transmit bands  ·  frequency in GHz', x0, y1 + 64);

    // hover info
    if (hov) {
      g.fillStyle = c.ink; g.font = `600 13px ${FONT}`; g.textAlign = 'left';
      g.fillText(`${hov.name}-band (${hov.lo}–${hov.hi} GHz): ${hov.use}`, x0, h - 10);
      g.fillStyle = c.muted; g.font = `12px ${FONT}`;
      g.textAlign = 'right'; g.fillText(hov.wx, w - padR, h - 10);
    } else {
      g.fillStyle = c.muted; g.font = `12px ${FONT}`; g.textAlign = 'left';
      g.fillText('Hover a band. Higher frequency → more bandwidth, but more weather loss.', x0, h - 10);
    }
  }
}
