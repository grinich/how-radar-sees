// @ts-check
// One global requestAnimationFrame loop drives every *visible, animated* figure.
// Static figures redraw on demand. Each animated figure can be paused on its own
// (via the button in its top-right corner); a hidden tab pauses everything.

const animating = new Set();
let raf = 0;
let last = 0;
let tabHidden = false;

function anyActive() {
  for (const f of animating) if (!f._paused) return true;
  return false;
}

function tick(now) {
  raf = 0;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  for (const fig of animating) {
    if (fig._paused) continue;
    try { fig.update?.(dt); fig.draw?.(); } catch (e) { console.error(e); }
  }
  if (!tabHidden && anyActive()) raf = requestAnimationFrame(tick);
}

function start() {
  if (raf || tabHidden || !anyActive()) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

export const scheduler = {
  /** Register an animated figure (called when it scrolls into view). */
  add(fig) { animating.add(fig); start(); },
  /** Deregister (called when it scrolls out of view or is torn down). */
  remove(fig) { animating.delete(fig); },
  /** Draw a single static figure once, right now. */
  requestDraw(fig) { try { fig.draw?.(); } catch (e) { console.error(e); } },
  /** Pause or resume a single figure (its own top-right control). */
  setPaused(fig, p) { fig._paused = !!p; if (!p) start(); },
  isPaused(fig) { return !!fig._paused; },
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { tabHidden = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else { tabHidden = false; start(); }
  });
}
