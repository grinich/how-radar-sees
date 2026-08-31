// @ts-check
// @vitest-environment jsdom
// Mount smoke test: every 2-D figure module must construct, init, resize,
// draw, tick, and tear down without throwing. Catches the failure mode where
// a broken figure ships as a small "failed to load" box nobody notices.
import { describe, it, expect, beforeAll } from 'vitest';
import { registry } from '../src/core/registry.js';

// 3-D figures need a real WebGL context (and starlink-live a Worker); they are
// covered by manual verification via sat-preview.html instead.
const SKIP = new Set(['starlink-live', 'starlink-model', 'sar-geometry', 'beam-lobe-3d', 'shader-backprojection']);

// A permissive 2-D context stub: every method is a no-op, gradients and
// metrics return usable objects, property writes are accepted.
function stubContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (prop === 'canvas') return target.canvas;
      if (typeof prop === 'string' && !(prop in target)) return () => undefined;
      return target[prop];
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

beforeAll(() => {
  // jsdom has no canvas implementation.
  HTMLCanvasElement.prototype.getContext = function () { return stubContext(); };
  // Figures size themselves from their container; give them a plausible box.
  Element.prototype.getBoundingClientRect = function () {
    return { width: 640, height: 360, top: 0, left: 0, right: 640, bottom: 360, x: 0, y: 0, toJSON() {} };
  };
});

const services = {
  scheduler: { add() {}, remove() {}, requestDraw(fig) { fig.draw(); } },
};

describe('2-D figure mount smoke test', () => {
  for (const [id, load] of Object.entries(registry)) {
    if (SKIP.has(id)) continue;
    it(id, async () => {
      const mod = await load();
      const root = document.createElement('figure');
      document.body.append(root);
      const fig = new mod.default(root, services);
      await fig.init();
      fig.onResize();
      fig.draw();
      fig.update(0.016);
      fig.onVisible?.();
      fig.onHidden?.();
      fig.teardown();
      root.remove();
      expect(true).toBe(true);
    });
  }
});
