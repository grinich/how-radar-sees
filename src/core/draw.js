// @ts-check
// Shared canvas-drawing helpers used across figures, for a consistent look.

/** CSS hex (#rgb or #rrggbb) -> rgba() string with alpha. */
export function rgba(hex, a) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  if (Number.isNaN(r)) return `rgba(0,0,0,${a})`;
  return `rgba(${r},${g},${b},${a})`;
}

/** CSS hex -> integer for three.js, optionally lightened toward white (mix in [0,1], 1 = unchanged). */
export function colInt(hex, mix) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  let r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  if (Number.isNaN(r)) return 0x888888;
  if (mix != null) {
    r = Math.round(r + (255 - r) * (1 - mix));
    g = Math.round(g + (255 - g) * (1 - mix));
    b = Math.round(b + (255 - b) * (1 - mix));
  }
  return (r << 16) | (g << 8) | b;
}

export function fmtM(m) {
  const a = Math.abs(m);
  if (a >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (a >= 1) return `${m.toFixed(2)} m`;
  return `${(m * 100).toFixed(0)} cm`;
}

export function fmtHz(hz) {
  const a = Math.abs(hz);
  if (a >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
  if (a >= 1e6) return `${(hz / 1e6).toFixed(0)} MHz`;
  if (a >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}

export function fmtW(w) {
  if (w >= 1000) return `${(w / 1000).toFixed(1)} kW`;
  return `${w.toFixed(0)} W`;
}

export const FONT = 'ui-sans-serif, system-ui, "IBM Plex Sans", sans-serif';

/** Clear + paint the figure background. */
export function clearBg(g, w, h, c) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = c.figBg;
  g.fillRect(0, 0, w, h);
}

/** Fill a rounded rect. */
export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
