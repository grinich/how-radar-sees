// @ts-check
// Three.js figure base. Three is loaded lazily via dynamic import() so 2D-only
// readers never download it. Owns its renderer and disposes all GPU resources on
// teardown (the MVP has a single 3D figure; a shared-renderer ThreeStage can
// replace this when the 3D count grows).
import { Figure } from './Figure.js';
import { makeControls, defaultsFrom } from './controls.js';

const KEY_STEP = 0.08; // radians per arrow press

export class ThreeFigure extends Figure {
  // Palette colors are baked into materials at build(); the runtime remounts
  // this figure on a theme flip so they're re-read (2D figures just redraw).
  remountOnThemeChange = true;

  async init() {
    const THREE = this.THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fig__canvas fig__canvas--3d';
    this.root.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.enableDamping = true;
    this.orbit.enablePan = false;
    this.orbit.enableZoom = false; // don't trap page scroll; rotate by dragging
    // Render on camera change so drag-to-rotate stays live even when the figure
    // is paused (the scheduler loop skips paused figures).
    this.orbit.addEventListener('change', () => this.draw());

    if (this.controlsSchema) {
      this.params = { ...defaultsFrom(this.controlsSchema), ...this.params };
      this._controlsEl = makeControls(this.controlsSchema, (name, value) => {
        this.params[name] = value;
        this.onChange(name, value);
      });
      this.root.append(this._controlsEl);
    }

    this.build(THREE);
    this._applyInteraction(THREE); // after build(): subclasses may disable rotation there
    this.mode = 'animated'; // OrbitControls damping needs a loop while visible
    // Coalesce resize storms: at most one relayout per figure per frame.
    this._resizeRaf = 0;
    this._onResize = () => {
      if (this._resizeRaf) return;
      this._resizeRaf = requestAnimationFrame(() => { this._resizeRaf = 0; this.onResize(); });
    };
    window.addEventListener('resize', this._onResize);
    this.onResize();
  }

  /** Subclasses add meshes here. */
  build(_THREE) {}

  /**
   * Touch and keyboard wiring, applied after build() so a subclass that turned
   * rotation off (orbit.enableRotate = false) opts out of interception entirely.
   * OrbitControls' constructor sets touch-action: none, so overrides go here.
   */
  _applyInteraction(THREE) {
    if (this.orbit.enableRotate === false) {
      this.canvas.style.touchAction = 'auto'; // nothing to rotate: never block page scroll
      return;
    }
    // One finger scrolls the page; two fingers rotate. Zoom is disabled above,
    // so DOLLY_ROTATE is rotation only (this OrbitControls has no two-finger
    // ROTATE mode); -1 matches no gesture in its touches.ONE switch.
    this.canvas.style.touchAction = 'pan-y';
    this.orbit.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };

    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', 'Interactive 3-D view — drag or use arrow keys to rotate');
    this._onKey = (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return; // keep browser shortcuts
      let dTheta = 0, dPhi = 0;
      if (ev.key === 'ArrowLeft') dTheta = KEY_STEP;
      else if (ev.key === 'ArrowRight') dTheta = -KEY_STEP;
      else if (ev.key === 'ArrowUp') dPhi = -KEY_STEP;
      else if (ev.key === 'ArrowDown') dPhi = KEY_STEP;
      else return;
      ev.preventDefault();
      // Manual spherical orbit around the target, matching drag direction.
      const off = this.camera.position.clone().sub(this.orbit.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta += dTheta;
      sph.phi += dPhi;
      sph.makeSafe();
      this.camera.position.copy(this.orbit.target).add(off.setFromSpherical(sph));
      this.camera.lookAt(this.orbit.target);
      this.draw();
    };
    this.canvas.addEventListener('keydown', this._onKey);
  }

  onResize() {
    if (!this.renderer) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    // Track devicePixelRatio too: it changes when the window moves between
    // displays or the browser zooms, and a stale ratio renders blurry.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this._dpr) return; // same buffer: skip the re-render
    this._dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
    this.draw(); // paint one frame immediately, independent of the animation loop
  }

  update(_dt) { this.orbit?.update(); }
  draw() { this.renderer?.render(this.scene, this.camera); }

  teardown() {
    window.removeEventListener('resize', this._onResize);
    if (this._resizeRaf) { cancelAnimationFrame(this._resizeRaf); this._resizeRaf = 0; }
    if (this._onKey) this.canvas?.removeEventListener('keydown', this._onKey);
    this.orbit?.dispose();
    this.scene?.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach((x) => { x?.map?.dispose?.(); x?.dispose?.(); });
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.(); // free the GL context now, not at GC time
    this.renderer = null;
    this._controlsEl?.remove();
    this.canvas?.remove();
  }
}
