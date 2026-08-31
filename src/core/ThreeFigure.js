// @ts-check
// Three.js figure base. Three is loaded lazily via dynamic import() so 2D-only
// readers never download it. Owns its renderer and disposes all GPU resources on
// teardown (the MVP has a single 3D figure; a shared-renderer ThreeStage can
// replace this when the 3D count grows).
import { Figure } from './Figure.js';
import { makeControls, defaultsFrom } from './controls.js';

export class ThreeFigure extends Figure {
  async init() {
    const THREE = this.THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fig__canvas fig__canvas--3d';
    this.canvas.style.touchAction = 'none'; // don't hijack page scroll while rotating
    this.root.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
      this.root.append(makeControls(this.controlsSchema, (name, value) => {
        this.params[name] = value;
        this.onChange(name, value);
      }));
    }

    this.build(THREE);
    this.mode = 'animated'; // OrbitControls damping needs a loop while visible
    this._onResize = () => this.onResize();
    window.addEventListener('resize', this._onResize);
    this.onResize();
  }

  /** Subclasses add meshes here. */
  build(_THREE) {}

  onResize() {
    if (!this.renderer) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
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
    this.orbit?.dispose();
    this.scene?.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach((x) => x?.dispose?.());
    });
    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
