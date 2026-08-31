// @ts-check
// Canvases can't inherit CSS colors, so we read the design tokens once from the
// document and hand a palette object to each figure's draw(). We re-read and
// notify subscribers when the color scheme changes (system toggle or manual).

const listeners = new Set();

/** Read the current token palette from CSS custom properties. */
export function palette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
  return {
    bg: v('--bg', '#ffffff'),
    figBg: v('--fig-bg', '#fafafa'),
    ink: v('--ink', '#1a1a1a'),
    muted: v('--muted', '#6b7280'),
    rule: v('--rule', '#e0e0e0'),
    accent: v('--accent', '#2b6cb0'),
    // Semantic colors reused across prose and figures.
    txCol: v('--c-transmit', '#c2410c'),
    echoCol: v('--c-echo', '#2b6cb0'),
    targetCol: v('--c-target', '#15803d'),
    noiseCol: v('--c-noise', '#9333ea'),
    goodCol: v('--c-good', '#15803d'),
    badCol: v('--c-bad', '#dc2626'),
  };
}

/** Subscribe to palette changes; returns an unsubscribe function. */
export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', () => { for (const fn of listeners) fn(); });
}
