// @ts-check
// The road to a radar you didn't notice — a horizontal timeline, 1935 → 2026,
// from the birth of radar to Starlink-as-radar. Slide, click a dot, or arrow
// through the milestones; each shows its year, title, and a one-line note. A
// subtle rising curve behind the dots stands in for capability and ubiquity
// climbing over the decades — from a few giant secret stations to tens of
// thousands of satellites overhead. Static figure.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, roundRect, FONT } from '../core/draw.js';

// Module-scope so the slider's format callback can read a milestone's year.
// Voice-controlled copy — do not reword.
const MILE = [
  { year: '1935', title: 'Radar is born', desc: 'Robert Watson-Watt bounces a BBC shortwave transmitter off a passing bomber near Daventry. Britain starts building Chain Home.' },
  { year: '1940', title: 'The cavity magnetron', desc: 'A compact source of high-power microwaves shrinks radar from towers to aircraft, and sharpens it to centimetres.' },
  { year: '1951', title: 'The synthetic aperture', desc: 'Carl Wiley realises the Doppler spread across a flight path can stand in for a giant antenna. SAR, on paper.' },
  { year: '1978', title: 'Seasat', desc: 'The first civilian spaceborne SAR images ocean and land from orbit, through cloud and dark, for 105 days.' },
  { year: '2014', title: 'Sentinel-1', desc: 'Europe flies free, open, all-weather C-band SAR that re-images the whole planet every few days.' },
  { year: '2018', title: 'SAR gets small', desc: 'ICEYE, Capella and Umbra shrink a radar satellite to suitcase scale and launch them by the dozen.' },
  { year: '2022', title: 'Starlink, decoded', desc: 'Humphreys’ lab publishes the structure of the Starlink downlink — the first step to using it for anything but internet.' },
  { year: '2024', title: 'Stealth, revealed', desc: 'A field trial uses Starlink illumination and forward scatter to spot a stealth-proxy drone over the South China Sea.' },
  { year: '2024', title: 'Passive images', desc: 'Labs form the first Earth-surface images from Starlink downlink echoes — a satellite radar nobody launched.' },
  { year: '2026', title: 'Starshield', desc: 'SpaceX flies reconnaissance satellites for the NRO on Starlink-derived buses, reportedly carrying SAR among their sensors.' },
];
const N = MILE.length;
const STARLINK_ERA = 7; // dots 7,8,9 are the Starlink-era milestones (distinct accent)

export default class RadarTimeline extends Canvas2DFigure {
  controlsSchema = [
    { type: 'range', name: 'i', label: 'Milestone', min: 0, max: N - 1, step: 1, value: 0, format: (v) => (MILE[v] ? MILE[v].year : '') },
  ];

  init() {
    super.init();
    // Tap/click a dot, and arrow through them: the canvas is a focusable widget.
    this.canvas.style.cursor = 'pointer';
    this.canvas.style.touchAction = 'manipulation';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label',
      'Timeline of radar milestones from 1935 to 2026. Click a dot, or use the left and right arrow keys to step through the milestones.');
    this.canvas.addEventListener('pointerdown', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this._select(this._dotAt(e.clientX - r.left));
    });
    this.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this._select(this.params.i - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this._select(this.params.i + 1); }
    });
  }

  /** Horizontal plot bounds, shared by draw and hit-testing so they agree. */
  _bounds() {
    const w = this.w, nrw = w < 480;
    const pad = nrw ? 14 : 22;
    return { nrw, pad, x0: pad + (nrw ? 6 : 10), x1: w - pad };
  }

  _dotX(i) {
    const { x0, x1 } = this._bounds();
    return x0 + (i / (N - 1)) * (x1 - x0);
  }

  /** Index of the dot nearest a canvas x position. */
  _dotAt(px) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(px - this._dotX(i));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /** Select a milestone, clamped, keeping the slider (and its read-out) in sync. */
  _select(i) {
    i = Math.max(0, Math.min(N - 1, i));
    this.params.i = i;
    const slider = this.root.querySelector('input[type="range"]');
    if (slider && +(/** @type {HTMLInputElement} */ (slider)).value !== i) {
      /** @type {HTMLInputElement} */ (slider).value = String(i);
      slider.dispatchEvent(new Event('input')); // updates the value label and redraws
    } else {
      this.draw();
    }
  }

  /** Wrap text to a max width in the current font, returning an array of lines. */
  _wrap(text, maxW) {
    const g = this.g, words = text.split(' '), lines = [];
    let line = '';
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (line && g.measureText(test).width > maxW) { lines.push(line); line = wd; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const { nrw, pad, x0, x1 } = this._bounds();
    const idx = Math.max(0, Math.min(N - 1, this.params.i | 0));
    const m = MILE[idx];
    const eraCol = idx >= STARLINK_ERA ? c.txCol : c.echoCol;
    const font = (px, weight = '') => `${weight ? weight + ' ' : ''}${px}px ${FONT}`;

    // ---- Header ------------------------------------------------------------
    g.textBaseline = 'alphabetic';
    g.fillStyle = c.muted; g.font = font(nrw ? 10 : 11); g.textAlign = 'left';
    g.fillText('The road to a radar you didn’t notice', x0, nrw ? 13 : 17);
    g.textAlign = 'right';
    g.fillText(nrw ? 'tap · ← →' : 'slide, click a dot, or use ← →', x1, nrw ? 13 : 17);

    // ---- Rising capability curve behind the dots ---------------------------
    const chartTop = nrw ? 30 : 42;
    const axisY = h * (nrw ? 0.36 : 0.46);
    const curveH = axisY - chartTop;
    // Monotonic, accelerating: a few giant stations early, tens of thousands late.
    const curveY = (t) => axisY - (0.06 + 0.9 * Math.pow(t, 1.7)) * curveH;

    const grad = g.createLinearGradient(0, chartTop, 0, axisY);
    grad.addColorStop(0, rgba(c.accent, 0.18));
    grad.addColorStop(1, rgba(c.accent, 0));
    g.beginPath();
    g.moveTo(x0, axisY);
    for (let x = x0; x <= x1; x += 2) g.lineTo(x, curveY((x - x0) / (x1 - x0)));
    g.lineTo(x1, axisY);
    g.closePath();
    g.fillStyle = grad; g.fill();

    g.beginPath();
    for (let x = x0; x <= x1; x += 2) {
      const y = curveY((x - x0) / (x1 - x0));
      x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = rgba(c.accent, 0.45); g.lineWidth = 1.5; g.stroke();

    // ---- Timeline axis -----------------------------------------------------
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, axisY); g.lineTo(x1, axisY); g.stroke();

    // Dotted connector from the selected dot up to the curve, tying the two.
    const sx = this._dotX(idx), sy = curveY((sx - x0) / (x1 - x0));
    g.strokeStyle = rgba(eraCol, 0.35); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(sx, axisY); g.lineTo(sx, sy); g.stroke();
    g.setLineDash([]);

    // ---- Milestone dots + year labels --------------------------------------
    const yrY = axisY + (nrw ? 15 : 18);
    for (let i = 0; i < N; i++) {
      const x = this._dotX(i);
      const col = i >= STARLINK_ERA ? c.txCol : c.echoCol;
      const sel = i === idx;
      g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, axisY - 3); g.lineTo(x, axisY + 3); g.stroke();
      if (sel) {
        g.fillStyle = rgba(col, 0.18);
        g.beginPath(); g.arc(x, axisY, nrw ? 10 : 12, 0, 7); g.fill();
      }
      g.fillStyle = col;
      g.beginPath(); g.arc(x, axisY, sel ? (nrw ? 5.5 : 6.5) : (nrw ? 3.5 : 4), 0, 7); g.fill();
      if (sel) {
        g.strokeStyle = col; g.lineWidth = 2;
        g.beginPath(); g.arc(x, axisY, nrw ? 8.5 : 10, 0, 7); g.stroke();
      }
      // Year label under the dot; the selected one is inked and bold.
      g.fillStyle = sel ? c.ink : c.muted;
      g.font = font(nrw ? 8.5 : 10, sel ? '700' : '');
      g.textAlign = 'center';
      g.fillText(MILE[i].year, x, yrY);
    }

    // ---- Read-out box: year (big), title (bold), description (wrapped) ------
    const boxX = pad, boxW = w - pad * 2;
    const boxTop = axisY + (nrw ? 30 : 44);
    const boxBottom = h - pad;
    roundRect(g, boxX, boxTop, boxW, boxBottom - boxTop, 10);
    g.fillStyle = rgba(c.accent, 0.06); g.fill();
    g.strokeStyle = rgba(c.rule, 0.8); g.lineWidth = 1;
    roundRect(g, boxX, boxTop, boxW, boxBottom - boxTop, 10); g.stroke();

    const inPad = nrw ? 12 : 18;
    const ix = boxX + inPad, innerW = boxW - inPad * 2;
    const yrSize = nrw ? 22 : 30, titleSize = nrw ? 14 : 16;
    const descSize = nrw ? 11.5 : 13, lineH = nrw ? 15 : 18;
    g.textBaseline = 'top'; g.textAlign = 'left';
    let y = boxTop + inPad;

    if (nrw) {
      // Stack: year, then title, then description below the axis.
      g.fillStyle = eraCol; g.font = font(yrSize, '800');
      g.fillText(m.year, ix, y); y += yrSize + 4;
      g.fillStyle = c.ink; g.font = font(titleSize, '700');
      for (const ln of this._wrap(m.title, innerW)) { g.fillText(ln, ix, y); y += titleSize + 4; }
      y += 3;
      g.fillStyle = c.muted; g.font = font(descSize);
      for (const ln of this._wrap(m.desc, innerW)) { g.fillText(ln, ix, y); y += lineH; }
    } else {
      // Year and title on one row; description wrapped, full box width, below.
      g.fillStyle = eraCol; g.font = font(yrSize, '800');
      g.fillText(m.year, ix, y);
      const yrW = g.measureText(m.year).width;
      g.fillStyle = c.ink; g.font = font(titleSize, '700');
      g.fillText(m.title, ix + yrW + 16, y + (yrSize - titleSize) / 2 + 1);
      y += yrSize + 10;
      g.fillStyle = c.muted; g.font = font(descSize);
      for (const ln of this._wrap(m.desc, innerW)) { g.fillText(ln, ix, y); y += lineH; }
    }
    g.textBaseline = 'alphabetic';
  }
}
