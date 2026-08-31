// @ts-check
// Lazy 3D hero satellite: our own procedural Starlink V3, built to SpaceX-published
// dimensions in src/core/starlinkSats.js and rendered over the SVG scene, aligned
// to the beam's origin. Everything heavy loads AFTER first paint (Three itself is
// a dynamic import), so the hero appears instantly and upgrades a moment later.
// The SVG earth, beam and stars stay; only the satellite becomes real 3D.
import { makeSatMats, buildV3 } from './core/starlinkSats.js';

// The satellite's spot in the SVG's 1200x640 viewBox (matches the beam apex).
const VB = { cx: 794, cy: 276, span: 344, w: 1200, h: 640 };

export async function initHeroSat() {
  const header = document.querySelector('.site-header');
  if (!header || typeof WebGLRenderingContext === 'undefined') return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'site-header__sat';
  const wrap = header.querySelector('.wrap');
  header.insertBefore(canvas, wrap);

  let THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch { canvas.remove(); return; }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;

  const scene = new THREE.Scene();
  // Subtle image-based lighting so the panels and metallic bus catch reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6); // straight on: the bus (beam origin) sits at the canvas centre

  scene.add(new THREE.HemisphereLight(0xdcebff, 0x0a1420, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e2, 4.6); sun.position.set(-4, 5, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xaaccff, 2.2); rim.position.set(5, 0, -4); scene.add(rim);

  const pivot = new THREE.Group(); scene.add(pivot);

  const model = buildV3(THREE, makeSatMats(THREE));
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.traverse((o) => {
    if (o.isMesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = 0.5; });
    }
  });
  const maxDim = Math.max(size.x, size.y, size.z) || 1; // = the ~52 m wing span
  model.scale.setScalar(2.7 / maxDim); // wings nearly wall-to-wall; margin so the sway never clips
  pivot.add(model);
  pivot.rotation.set(0.42, 0.24, 0.06); // base 3/4 view: array face with depth (never edge-on)

  function layout() {
    const W = header.clientWidth, H = header.clientHeight;
    const scale = Math.max(W / VB.w, H / VB.h);
    const offX = (W - VB.w * scale) / 2, offY = H - VB.h * scale; // xMid, yMax (slice)
    const px = VB.span * scale;
    canvas.style.left = `${offX + VB.cx * scale - px / 2}px`;
    canvas.style.top = `${offY + VB.cy * scale - px / 2}px`;
    canvas.style.width = canvas.style.height = `${px}px`;
    renderer.setSize(px, px, false);
  }
  layout();
  window.addEventListener('resize', layout);

  renderer.render(scene, camera);        // paint one frame synchronously...
  canvas.classList.add('is-ready');      // ...and reveal now (not gated on rAF)
  if (reduce) return;
  // Gentle sway around the base 3/4 angle — never a full spin, so the flat array
  // is never caught edge-on. Calm and always readable.
  const BX = pivot.rotation.x, BY = pivot.rotation.y;
  const t0 = performance.now();
  let raf = 0;
  const tick = () => {
    const t = (performance.now() - t0) / 1000;
    pivot.rotation.y = BY + Math.sin(t * 0.34) * 0.17; // gentle sway, never edge-on
    pivot.rotation.x = BX + Math.sin(t * 0.22) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf), raf = 0; }
    else if (!raf) tick();
  });
  tick();
}
