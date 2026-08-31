// @ts-check
// Ch1 — The echo itself. A pulse leaves the radar, reaches a target you can
// drag in range, and comes back; the time axis below shows the delay Δt and
// reads the range straight off R = cΔt/2. The essay's first mechanism.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { clearBg, rgba, FONT } from '../core/draw.js';

const C_KM_PER_MS = 299.792458;  // speed of light, km per millisecond
const R_MIN = 100, R_MAX = 1500; // km
const AXIS_MS = (2 * R_MAX) / C_KM_PER_MS * 1.04; // fixed time axis so the echo moves with range
const SLOWDOWN = 1000;           // 1 real second = 1 simulated millisecond

export default class EchoTiming extends Canvas2DFigure {
  mode = 'animated';

  controlsSchema = [
    { type: 'range', name: 'rng', label: 'Target range', min: R_MIN, max: R_MAX, step: 10, value: 500, format: (v) => `${v} km` },
  ];

  init() {
    super.init();
    this.simMs = 0; // simulated elapsed time within the current pulse cycle, ms
    this.canvas.style.touchAction = 'pan-y'; // horizontal target drag; vertical stays page scroll
    this._drag = false;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (Math.abs(this._pxOf(e) - this._targetX()) < 28) {
        this._drag = true;
        this.canvas.setPointerCapture(e.pointerId);
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this._drag) this._setRangeFromX(this._pxOf(e));
      else this.canvas.style.cursor = Math.abs(this._pxOf(e) - this._targetX()) < 28 ? 'grab' : '';
    });
    const end = () => { this._drag = false; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.root.append(this.readout);
  }

  _pxOf(e) {
    return e.clientX - this.canvas.getBoundingClientRect().left;
  }

  _geom() {
    const pad = this.w < 480 ? 20 : 34;
    return { x0: pad + 14, x1: this.w - pad, pad };
  }

  _targetX() {
    const { x0, x1 } = this._geom();
    return x0 + ((this.params.rng - 0) / R_MAX) * (x1 - x0);
  }

  _setRangeFromX(px) {
    const { x0, x1 } = this._geom();
    const km = ((px - x0) / (x1 - x0)) * R_MAX;
    const rng = Math.max(R_MIN, Math.min(R_MAX, Math.round(km / 10) * 10));
    this.params.rng = rng;
    // Keep the slider in sync so keyboard and pointer agree on the state.
    const slider = this.root.querySelector('input[type="range"]');
    if (slider && +(/** @type {HTMLInputElement} */ (slider)).value !== rng) {
      /** @type {HTMLInputElement} */ (slider).value = String(rng);
      slider.dispatchEvent(new Event('input'));
    } else {
      this.draw();
    }
  }

  update(dt) {
    const roundTrip = (2 * this.params.rng) / C_KM_PER_MS;
    const period = roundTrip + Math.max(1.2, roundTrip * 0.3); // idle gap before the next pulse
    this.simMs = (this.simMs + (dt * 1000) / SLOWDOWN) % period;
    this.draw();
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g) return;
    clearBg(g, w, h, c);
    const narrow = w < 480;
    const { x0, x1 } = this._geom();
    const rng = this.params.rng;
    const dtMs = (2 * rng) / C_KM_PER_MS;
    const font = (px, weight = '') => `${weight ? weight + ' ' : ''}${narrow ? Math.max(9, px - 2) : px}px ${FONT}`;

    // ---- Top strip: the pulse's flight, radar -> target -> radar -------------
    const yBase = h * (narrow ? 0.3 : 0.32);
    g.fillStyle = c.muted; g.font = font(11); g.textAlign = 'left';
    g.fillText(`the pulse’s journey (slowed ${SLOWDOWN.toLocaleString()}×)`, x0 - 14, narrow ? 14 : 18);

    // Range scale
    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, yBase); g.lineTo(x1, yBase); g.stroke();
    g.fillStyle = c.muted; g.font = font(10); g.textAlign = 'center';
    for (let km = 0; km <= R_MAX; km += 500) {
      const x = x0 + (km / R_MAX) * (x1 - x0);
      g.beginPath(); g.moveTo(x, yBase - 3); g.lineTo(x, yBase + 3); g.stroke();
      g.fillText(km === 0 ? 'radar' : `${km} km`, x, yBase + 16);
    }

    // Radar mast
    g.strokeStyle = c.ink; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, yBase); g.lineTo(x0, yBase - 22); g.stroke();
    g.fillStyle = c.txCol;
    g.beginPath(); g.arc(x0, yBase - 26, 4.5, 0, 7); g.fill();

    // Target (draggable)
    const xT = this._targetX();
    g.fillStyle = c.targetCol;
    g.beginPath(); g.moveTo(xT, yBase - 20); g.lineTo(xT - 9, yBase); g.lineTo(xT + 9, yBase); g.closePath(); g.fill();
    g.fillStyle = c.muted; g.font = font(10); g.textAlign = 'center';
    g.fillText('drag me', xT, yBase - 26);

    // The pulse in flight: outbound in transmit color, echo in echo color.
    const posKm = this.simMs * C_KM_PER_MS;
    const inFlight = posKm < 2 * rng;
    if (inFlight) {
      const out = posKm <= rng;
      const km = out ? posKm : 2 * rng - posKm;
      const x = x0 + (km / R_MAX) * (x1 - x0);
      const col = out ? c.txCol : c.echoCol;
      // Trailing streak shows direction of travel.
      const trail = (out ? -1 : 1) * Math.min(34, Math.abs(x - x0));
      const grad = g.createLinearGradient(x + trail, 0, x, 0);
      grad.addColorStop(0, rgba(col, 0));
      grad.addColorStop(1, rgba(col, 0.8));
      g.strokeStyle = grad; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x + trail, yBase - 8); g.lineTo(x, yBase - 8); g.stroke();
      g.fillStyle = col;
      g.beginPath(); g.arc(x, yBase - 8, out ? 4 : 3, 0, 7); g.fill();
    }

    // ---- Bottom strip: the same event on a time axis --------------------------
    const yAxis = h * (narrow ? 0.76 : 0.74);
    const tx = (ms) => x0 + (ms / AXIS_MS) * (x1 - x0);
    g.fillStyle = c.muted; g.font = font(11); g.textAlign = 'left';
    g.fillText('what the receiver records', x0 - 14, yAxis - (narrow ? 52 : 64));

    g.strokeStyle = rgba(c.rule, 0.9); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, yAxis); g.lineTo(x1, yAxis); g.stroke();
    g.fillStyle = c.muted; g.font = font(10); g.textAlign = 'center';
    for (let ms = 0; ms <= AXIS_MS; ms += 2) {
      const x = tx(ms);
      g.beginPath(); g.moveTo(x, yAxis - 3); g.lineTo(x, yAxis + 3); g.stroke();
      g.fillText(`${ms} ms`, x, yAxis + 16);
    }

    // Transmit pulse at t = 0, echo at t = Δt (smaller: it came back fainter).
    // Labels sit BESIDE the bars, flipping to whichever side has room, so they
    // never collide with the Δt bracket or the strip title above.
    const mid = (x0 + x1) / 2;
    const pulse = (ms, col, ph, label) => {
      const x = tx(ms);
      g.fillStyle = col;
      g.fillRect(x - 2, yAxis - ph, 4, ph);
      g.font = font(10, '600');
      const left = x <= mid;
      g.textAlign = left ? 'left' : 'right';
      g.fillText(label, x + (left ? 7 : -7), yAxis - ph + 9);
    };
    pulse(0, c.txCol, narrow ? 24 : 34, 'pulse out');
    pulse(dtMs, c.echoCol, narrow ? 13 : 18, 'echo back');

    // Δt bracket between them, above the bars but below the strip title.
    const yBr = yAxis - (narrow ? 32 : 44);
    g.strokeStyle = c.ink; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tx(0), yBr); g.lineTo(tx(dtMs), yBr);
    g.moveTo(tx(0), yBr - 3); g.lineTo(tx(0), yBr + 3);
    g.moveTo(tx(dtMs), yBr - 3); g.lineTo(tx(dtMs), yBr + 3);
    g.stroke();
    g.fillStyle = c.ink; g.font = font(11, '600'); g.textAlign = 'center';
    g.fillText(`Δt = ${dtMs.toFixed(2)} ms`, Math.max((tx(0) + tx(dtMs)) / 2, tx(0) + 46), yBr - 5);

    // Sweeping "now" cursor tied to the animation above.
    const xNow = tx(Math.min(this.simMs, AXIS_MS));
    g.strokeStyle = rgba(c.muted, 0.55); g.lineWidth = 1;
    g.beginPath(); g.moveTo(xNow, yBr + 6); g.lineTo(xNow, yAxis); g.stroke();

    if (this.readout) {
      this.readout.innerHTML =
        `<span>Delay <b>Δt = ${dtMs.toFixed(2)} ms</b></span>` +
        `<span>Range <b>R = c·Δt/2 = ${rng.toLocaleString()} km</b></span>`;
    }
  }
}
