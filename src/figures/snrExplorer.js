// @ts-check
// Fig 3.1 — The SAR planner. The reusable spine: live SNR / NESZ / resolution /
// Doppler / swath from the ported link budget (src/physics/radar.snrChain). The
// SNR-vs-bandwidth sweep makes the "SNR ∝ 1/B" tradeoff visible as you drag.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { snrChain } from '../physics/radar.js';

export default class SnrExplorer extends Canvas2DFigure {
  controlsSchema = [
    { type: 'segmented', name: 'fc', label: 'Band',
      options: [['S 2GHz', 2], ['X 10GHz', 10], ['Ku 14GHz', 14], ['Ka 30GHz', 30]], value: 10 },
    { type: 'segmented', name: 'alt', label: 'Altitude', options: [['350 km', 350], ['500 km', 500]], value: 500 },
    { type: 'range', name: 'bw', label: 'Bandwidth', min: 10, max: 2000, step: 10, value: 150,
      format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${v} MHz`) },
    { type: 'range', name: 'pwr', label: 'Tx power', min: 5, max: 20000, step: 5, value: 2000,
      format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kW` : `${v} W`) },
    { type: 'range', name: 'grz', label: 'Grazing angle', min: 15, max: 80, step: 1, value: 40, format: (v) => `${v}°` },
    { type: 'range', name: 'dc', label: 'Duty cycle', min: 5, max: 100, step: 5, value: 20, format: (v) => `${v}%` },
    { type: 'toggle', name: 'weather', label: 'Rain', value: false },
  ];

  paramsFor(bwMHz) {
    const p = this.params;
    return {
      fc: p.fc, alt: p.alt, bw: bwMHz, pwr: p.pwr, grz: p.grz, dc: p.dc,
      weather: p.weather ? 100 : 0,
    };
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    const cur = snrChain(this.paramsFor(this.params.bw));

    g.clearRect(0, 0, w, h);
    g.fillStyle = c.figBg; g.fillRect(0, 0, w, h);

    // ---- readout header ----
    const good = cur.snr_db >= 0;
    g.textAlign = 'left';
    g.font = '700 30px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = good ? c.goodCol : c.badCol;
    g.fillText(`SNR ${cur.snr_db >= 0 ? '+' : ''}${cur.snr_db.toFixed(1)} dB`, 16, 34);

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = c.muted;
    const chips = [
      `NESZ ${cur.nesz_db.toFixed(1)} dB`,
      `range res ${fmtM(cur.rangeRes_ground)}`,
      `az res ${fmtM(cur.azRes)}`,
      `Doppler ${(cur.doppler_bw / 1000).toFixed(1)} kHz`,
      `swath ${(cur.swath_ground / 1000).toFixed(0)} km`,
    ];
    g.fillText(chips.join('     '), 16, 54);

    // ---- SNR vs bandwidth sweep ----
    const padL = 46, padR = 16, padT = 74, padB = 30;
    const x0 = padL, y0 = padT, plotW = w - padL - padR, plotH = h - padT - padB, y1 = padT + plotH;

    const bwMin = 10, bwMax = 2000;
    const lx = (bw) => x0 + (Math.log10(bw / bwMin) / Math.log10(bwMax / bwMin)) * plotW;

    // sweep
    const pts = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= 120; i++) {
      const bw = bwMin * Math.pow(bwMax / bwMin, i / 120);
      const s = snrChain(this.paramsFor(bw)).snr_db;
      pts.push([bw, s]);
      if (s < yMin) yMin = s; if (s > yMax) yMax = s;
    }
    yMin = Math.min(yMin, 0) - 4; yMax = Math.max(yMax, 0) + 4;
    const ly = (s) => y1 - ((s - yMin) / (yMax - yMin)) * plotH;

    // axes
    g.strokeStyle = c.rule; g.lineWidth = 1;
    g.strokeRect(x0, y0, plotW, plotH);
    // 0 dB line + usable shading
    if (0 >= yMin && 0 <= yMax) {
      const yz = ly(0);
      g.fillStyle = hexA(c.goodCol, 0.07);
      g.fillRect(x0, y0, plotW, yz - y0);
      g.strokeStyle = hexA(c.goodCol, 0.5); g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(x0, yz); g.lineTo(x0 + plotW, yz); g.stroke();
      g.setLineDash([]);
      g.fillStyle = c.goodCol; g.font = '10px ui-sans-serif, system-ui, sans-serif';
      g.textAlign = 'left'; g.fillText('0 dB — usable', x0 + 4, yz - 4);
    }
    // x ticks
    g.fillStyle = c.muted; g.font = '10px ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center';
    for (const bw of [10, 30, 100, 300, 1000, 2000]) {
      const xx = lx(bw);
      g.strokeStyle = c.rule; g.beginPath(); g.moveTo(xx, y1); g.lineTo(xx, y1 + 4); g.stroke();
      g.fillText(bw >= 1000 ? `${bw / 1000}G` : `${bw}M`, xx, y1 + 16);
    }
    // y label
    g.save(); g.translate(14, y0 + plotH / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = c.muted; g.textAlign = 'center'; g.fillText('SNR (dB)', 0, 0); g.restore();

    // curve
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.beginPath();
    pts.forEach(([bw, s], i) => { const X = lx(bw), Y = ly(s); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();

    // current operating point
    const cx = lx(this.params.bw), cy = ly(cur.snr_db);
    g.strokeStyle = hexA(c.ink, 0.25); g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(cx, y0); g.lineTo(cx, y1); g.stroke(); g.setLineDash([]);
    g.fillStyle = good ? c.goodCol : c.badCol;
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.figBg; g.lineWidth = 1.5; g.stroke();
  }
}

function hexA(hex, a) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), gg = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${gg},${b},${a})`;
}
function fmtM(m) { return m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(0)} cm`; }
