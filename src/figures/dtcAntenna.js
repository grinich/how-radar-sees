// @ts-check
// §9 — The V3 direct-to-cell antenna, to scale. It is ~15 m across, with ~16× the
// collecting area of the V2 Mini's metre-class array. A 4×4 grid shows 16 V2-Mini
// antennas tiling into the V3; a 1.8 m person stands beside it for absolute scale.
// Because gain grows with area and radar SNR with area², ~16× area ≈ 256× the
// sensitivity — the whole point of the direct-to-cell section.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const V3_M = 15;        // antenna span, metres
const N = 4;            // 4×4 = 16 V2-Mini areas
const V2_M = V3_M / N;  // 3.75 m
const PERSON_M = 1.8;

export default class DtcAntenna extends Canvas2DFigure {
  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);

    const topPad = 30;     // room for the antenna's top label
    const statH = 52;      // room for the headline stat under the ground line
    const sidePad = 18;
    const groundY = h - statH;

    // metres → pixels: fit the 15 m antenna in the height, and antenna+person in width.
    const scale = Math.min(
      (groundY - topPad) / V3_M,
      (w - sidePad * 2) / (V3_M + 2.4), // + person lane
    );
    const size = V3_M * scale;
    const ax = w - sidePad - size;   // antenna right-aligned
    const ay = groundY - size;
    const block = size / N;

    // panel fill + fine phased-array cells
    g.fillStyle = rgba(c.echoCol, 0.12);
    g.fillRect(ax, ay, size, size);
    g.strokeStyle = rgba(c.echoCol, 0.16); g.lineWidth = 1;
    const fine = 16;
    for (let i = 1; i < fine; i++) {
      const x = ax + size * i / fine, y = ay + size * i / fine;
      line(g, x, ay, x, ay + size); line(g, ax, y, ax + size, y);
    }
    // heavy 4×4 grid — each block is one V2 Mini antenna's area
    g.strokeStyle = rgba(c.echoCol, 0.55); g.lineWidth = 1.5;
    for (let i = 0; i <= N; i++) {
      const x = ax + block * i, y = ay + block * i;
      line(g, x, ay, x, ay + size); line(g, ax, y, ax + size, y);
    }
    g.strokeStyle = c.echoCol; g.lineWidth = 2; g.strokeRect(ax, ay, size, size);

    // highlight the bottom-left block as the V2 Mini antenna
    const by = ay + size - block;
    g.fillStyle = rgba(c.txCol, 0.32); g.fillRect(ax, by, block, block);
    g.strokeStyle = c.txCol; g.lineWidth = 2; g.strokeRect(ax, by, block, block);

    // person for absolute scale, on the ground to the left of the antenna
    drawPerson(g, ax - 1.2 * scale, groundY, PERSON_M * scale, c.muted);

    // ground line
    g.strokeStyle = rgba(c.rule, 1); g.lineWidth = 1;
    line(g, sidePad, groundY + 0.5, w - sidePad, groundY + 0.5);

    // labels
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = c.ink; g.font = `700 13px ${FONT}`;
    g.fillText('V3 direct-to-cell antenna · ≈15 m across · S-band', ax + size / 2, Math.max(18, ay - 9));
    if (block > 34) {
      g.fillStyle = c.txCol; g.font = `600 11px ${FONT}`;
      g.fillText('V2 Mini', ax + block / 2, by + block / 2 - 2);
      g.font = `10px ${FONT}`;
      g.fillText('≈3.75 m', ax + block / 2, by + block / 2 + 11);
    }
    g.fillStyle = c.muted; g.font = `11px ${FONT}`;
    g.fillText('1.8 m', ax - 1.2 * scale, groundY + 15);

    // headline stat under the ground line
    g.textAlign = 'left';
    g.fillStyle = c.ink; g.font = `700 15px ${FONT}`;
    g.fillText('16× the collecting area', sidePad, groundY + 26);
    g.fillStyle = c.muted; g.font = `12px ${FONT}`;
    g.fillText('Gain grows with area, and radar SNR with area² — so ~16× the area is ~256× the sensitivity.', sidePad, groundY + 44);
  }
}

function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

// A simple standing person silhouette, feet on `groundY`, `hpx` tall, centred on `cx`.
function drawPerson(g, cx, groundY, hpx, col) {
  g.fillStyle = col;
  const headR = Math.max(2, hpx * 0.11);
  g.beginPath(); g.arc(cx, groundY - hpx + headR, headR, 0, Math.PI * 2); g.fill();
  const bodyTop = groundY - hpx + headR * 2.2;
  g.beginPath();
  g.moveTo(cx - hpx * 0.11, bodyTop);
  g.lineTo(cx + hpx * 0.11, bodyTop);
  g.lineTo(cx + hpx * 0.07, groundY);
  g.lineTo(cx - hpx * 0.07, groundY);
  g.closePath(); g.fill();
}
