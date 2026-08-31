// @ts-check
// §10 — Scan-on-receive altitude slicing. By timing the receive-beam scan to a
// chosen height, the radar isolates aircraft at that altitude with no ground
// clutter. Slide the altitude and watch targets appear cleanly.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

// aircraft as [ground range 0..1, altitude km]
const CRAFT = [
  { x: 0.25, alt: 10.5, name: 'airliner' },
  { x: 0.55, alt: 6.0, name: 'jet' },
  { x: 0.72, alt: 2.0, name: 'drone' },
  { x: 0.40, alt: 0.15, name: 'low drone' },
];
const ALT_MAX = 12;

export default class AltitudeSlicing extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'slice', label: 'Slice altitude', min: 0, max: 12, step: 0.5, value: 6, format: (v) => `${v.toFixed(1)} km` },
    { type: 'range', name: 'band', label: 'Slice thickness', min: 0.5, max: 3, step: 0.5, value: 1.5, format: (v) => `${v.toFixed(1)} km` },
  ];

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const m = 40, plotW = w - m * 2, top = 26, plotH = h - top - 44, y1 = top + plotH;
    const X = (x) => m + x * plotW;
    const Y = (alt) => y1 - (alt / ALT_MAX) * plotH;

    // altitude axis
    g.strokeStyle = rgba(c.rule, 0.9); g.fillStyle = c.muted; g.font = `10px ${FONT}`; g.textAlign = 'right';
    for (let a = 0; a <= ALT_MAX; a += 3) { const y = Y(a); g.beginPath(); g.moveTo(m - 4, y); g.lineTo(w - m, y); g.strokeStyle = rgba(c.rule, 0.5); g.stroke(); g.fillStyle = c.muted; g.fillText(`${a} km`, m - 8, y + 3); }

    // slice band
    const s = this.params.slice, bw = this.params.band;
    const by0 = Y(s + bw / 2), by1 = Y(Math.max(0, s - bw / 2));
    g.fillStyle = rgba(c.echoCol, 0.16); g.fillRect(m, by0, plotW, by1 - by0);
    g.strokeStyle = rgba(c.echoCol, 0.7); g.setLineDash([5, 4]); g.strokeRect(m, by0, plotW, by1 - by0); g.setLineDash([]);
    g.fillStyle = c.echoCol; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.fillText('receive-beam slice', m + 4, by0 - 5);

    // ground clutter band (suppressed when slice is above ground)
    const groundSuppressed = (s - bw / 2) > 0.3;
    for (let i = 0; i < 120; i++) {
      const x = m + (i / 120) * plotW; const jitter = ((i * 37) % 11) / 11 * 6;
      g.fillStyle = groundSuppressed ? rgba(c.muted, 0.18) : rgba(c.badCol, 0.6);
      g.fillRect(x, y1 - jitter, 3, 3 + jitter);
    }
    g.fillStyle = groundSuppressed ? rgba(c.muted, 0.6) : c.badCol; g.font = `11px ${FONT}`; g.textAlign = 'left';
    g.fillText(groundSuppressed ? 'ground clutter — suppressed' : 'ground clutter — swamping the scene', m + 4, y1 - 10);

    // aircraft
    for (const a of CRAFT) {
      const inSlice = Math.abs(a.alt - s) <= bw / 2;
      const x = X(a.x), y = Y(a.alt);
      g.fillStyle = inSlice ? c.goodCol : rgba(c.muted, 0.35);
      g.beginPath(); g.arc(x, y, inSlice ? 6 : 4, 0, Math.PI * 2); g.fill();
      if (inSlice) {
        g.strokeStyle = c.goodCol; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.stroke();
        g.fillStyle = c.ink; g.font = `600 11px ${FONT}`; g.textAlign = 'center';
        g.fillText(`${a.name} · ${a.alt} km`, x, y - 16);
      }
    }

    // radar beam from top-left corner into the slice
    g.strokeStyle = rgba(c.echoCol, 0.4); g.lineWidth = 1;
    g.beginPath(); g.moveTo(m, top); g.lineTo(m, by0); g.moveTo(m, top); g.lineTo(w - m, by1); g.stroke();

    g.fillStyle = c.muted; g.font = `11px ${FONT}`; g.textAlign = 'center';
    g.fillText('ground range →', w / 2, h - 10);
  }
}
