// @ts-check
// §8 — Every Starlink antenna as a radar. Bars show the SNR the engine predicts
// for each antenna imaging a −15 dB target, at everyday comms settings vs a
// radar-optimised burst. Switch between the V2 fleet and V3. Watch bars cross 0.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';
import { snrChain } from '../physics/radar.js';

// invert the aperture-gain relation to a per-dimension gain that yields total gain G
const gaz = (G) => 10 * Math.log10(Math.sqrt(Math.pow(10, (G + 1) / 10) / Math.PI));

const V2 = { alt: 500, ants: [
  { n: 'E-band', fc: 75, G: 52, opPwr: 200, opBw: 5000, radPwr: 200, radBw: 60 },
  { n: 'Ka-band', fc: 30, G: 47, opPwr: 260, opBw: 1500, radPwr: 260, radBw: 125 },
  { n: 'Ku (X)', fc: 11.7, G: 44, opPwr: 27, opBw: 2000, radPwr: 270, radBw: 400 },
  { n: 'DTC (S)', fc: 2, G: 38, opPwr: 175, opBw: 15, radPwr: 7000, radBw: 140 },
]};
const V3 = { alt: 350, ants: [
  { n: 'E-band', fc: 75, G: 61, opPwr: 98, opBw: 5000, radPwr: 98, radBw: 3000 },
  { n: 'V-band', fc: 40, G: 55, opPwr: 66, opBw: 5000, radPwr: 527, radBw: 2000 },
  { n: 'Ka-band', fc: 30, G: 50, opPwr: 120, opBw: 1500, radPwr: 410, radBw: 500 },
  { n: 'Ku (X)', fc: 11.7, G: 52, opPwr: 165, opBw: 2000, radPwr: 826, radBw: 500 },
  { n: 'DTC (S)', fc: 2, G: 50, opPwr: 15, opBw: 20, radPwr: 20000, radBw: 500 },
]};

function snrFor(alt, a, mode) {
  const g = gaz(a.G);
  const p = mode === 'op'
    ? { fc: a.fc, alt, bw: a.opBw, pwr: a.opPwr, dc: 100, grz: 40, gaz: g, gel: g, prf: 5000, nf: 3, tAnt: 300, otherLoss: 3 }
    : { fc: a.fc, alt, bw: a.radBw, pwr: a.radPwr, dc: 100, grz: 40, gaz: g, gel: g, prf: 5000, nf: 3, tAnt: 300, otherLoss: 3 };
  return snrChain(p).snr_db;
}

export default class AntennaSweep extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'ver', label: 'Version', options: [['V2 Mini', 'v2'], ['V3', 'v3']], value: 'v2' },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const set = this.params.ver === 'v3' ? V3 : V2;

    g.fillStyle = c.ink; g.font = `700 15px ${FONT}`; g.textAlign = 'left';
    g.fillText(`${this.params.ver === 'v3' ? 'Starlink V3 (350 km)' : 'Starlink V2 Mini (500 km)'} — can it image?`, 16, 24);

    const m = 40, top = 44, botLabel = 40;
    const plotH = h - top - botLabel;
    const zeroY = top + plotH * 0.55; // 0 dB line position
    const snrToY = (s) => zeroY - (s / 45) * (plotH * 0.5);

    // 0 dB usable line
    g.strokeStyle = rgba(c.goodCol, 0.6); g.setLineDash([5, 4]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(m, zeroY); g.lineTo(w - 14, zeroY); g.stroke(); g.setLineDash([]);
    g.fillStyle = c.goodCol; g.font = `10px ${FONT}`; g.textAlign = 'left'; g.fillText('0 dB — usable', w - 96, zeroY - 5);
    // scale ticks
    g.fillStyle = c.muted; g.textAlign = 'right';
    for (const s of [-30, 0, 30]) { const y = snrToY(s); g.fillText(`${s}`, m - 6, y + 3); }

    const n = set.ants.length;
    const slot = (w - m - 20) / n;
    const bw = slot * 0.3;
    set.ants.forEach((a, i) => {
      const cx = m + slot * (i + 0.5);
      const sOp = Math.max(-40, Math.min(45, snrFor(set.alt, a, 'op')));
      const sRad = Math.max(-40, Math.min(45, snrFor(set.alt, a, 'radar')));
      // operational (faint)
      bar(g, cx - bw - 3, zeroY, bw, snrToY(sOp), rgba(c.muted, 0.5));
      // radar (solid, colored by sign)
      bar(g, cx + 3, zeroY, bw, snrToY(sRad), sRad >= 0 ? rgba(c.goodCol, 0.85) : rgba(c.badCol, 0.8));
      // value
      g.fillStyle = c.ink; g.font = `600 11px ${FONT}`; g.textAlign = 'center';
      g.fillText(`${sRad >= 0 ? '+' : ''}${sRad.toFixed(0)}`, cx + 3 + bw / 2, snrToY(sRad) + (sRad >= 0 ? -4 : 12));
      // antenna label
      g.fillStyle = c.muted; g.font = `12px ${FONT}`;
      g.fillText(a.n, cx, h - 18);
    });

    // legend
    g.textAlign = 'left'; g.font = `11px ${FONT}`;
    g.fillStyle = c.muted; g.fillText('▮ operational', m, h - 2);
    g.fillStyle = c.goodCol; g.fillText('▮ radar-optimised (bistatic)', m + 96, h - 2);
  }
}

function bar(g, x, zeroY, w, y, fill) {
  g.fillStyle = fill;
  const top = Math.min(zeroY, y), hh = Math.abs(zeroY - y);
  g.fillRect(x, top, w, hh);
}
