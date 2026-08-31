// @ts-check
// Lazy 3D hero satellite. The real Starlink model ("Starlink Spacex Satellite" by
// Malacodart, CC BY 4.0, via Sketchfab) is rendered over the SVG scene and aligned
// to the beam's origin. Everything loads AFTER first paint (Three + GLTFLoader +
// the model are all dynamic), so the hero appears instantly and upgrades a moment
// later. The SVG earth, beam and stars stay; only the satellite becomes real 3D.
import satUrl from './assets/starlink.glb';

// The satellite's spot in the SVG's 1200x640 viewBox (matches the beam apex).
const VB = { cx: 748, cy: 150, span: 440, w: 1200, h: 640 };

export async function initHeroSat() {
  const header = document.querySelector('.site-header');
  if (!header || typeof WebGLRenderingContext === 'undefined') return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'site-header__sat';
  const wrap = header.querySelector('.wrap');
  header.insertBefore(canvas, wrap);

  let THREE, GLTFLoader;
  try {
    THREE = await import('three');
    ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
  } catch { canvas.remove(); return; }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0xcfe0ff, 0.95));
  const sun = new THREE.DirectionalLight(0xfff2e0, 3.2); sun.position.set(-4, 4, 5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9cc0ff, 1.1); rim.position.set(5, -1, -4); scene.add(rim);

  const pivot = new THREE.Group(); scene.add(pivot);

  let model;
  try {
    const gltf = await new GLTFLoader().loadAsync(satUrl);
    model = gltf.scene;
  } catch { canvas.remove(); return; }

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(3.3 / maxDim);
  pivot.add(model);
  pivot.rotation.set(0.5, 2.3, 0.12); // 3/4 view: bus + the long array on a diagonal

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

  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  if (reduce) { renderer.render(scene, camera); return; }
  let raf = 0;
  const tick = () => { pivot.rotation.y += 0.0024; renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf), raf = 0; }
    else if (!raf) tick();
  });
  tick();
}
