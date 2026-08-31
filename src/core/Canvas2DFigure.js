// @ts-check
// Canvas 2D figure base: DPR-correct sizing (capped at 2x for phone fill-rate),
// palette wiring, and auto-built controls from a declarative schema.
import { Figure } from './Figure.js';
import { makeControls, defaultsFrom } from './controls.js';
import { palette, onThemeChange } from './theme.js';

export class Canvas2DFigure extends Figure {
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fig__canvas';
    this.root.append(this.canvas);
    this.g = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));

    if (this.controlsSchema) {
      this.params = { ...defaultsFrom(this.controlsSchema), ...this.params };
      this.root.append(makeControls(this.controlsSchema, (name, value) => {
        this.params[name] = value;
        this.onChange(name, value);
      }));
    }

    this._offTheme = onThemeChange(() => { this.palette = palette(); this.draw(); });
    this._onResize = () => this.onResize();
    window.addEventListener('resize', this._onResize);
    this.onResize();
  }

  onResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.palette = palette();
    this.draw();
  }

  teardown() {
    window.removeEventListener('resize', this._onResize);
    this._offTheme?.();
    this.canvas?.remove();
  }
}
