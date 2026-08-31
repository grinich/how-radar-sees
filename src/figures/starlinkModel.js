// @ts-check
// The three Starlink generations side by side, drawn to the same scale beside a
// 1.8 m person — so their real size, and its growth, is legible. Each satellite
// is modelled on the real deployed shape: a compact bus with the Earth-facing
// phased-array antenna underneath, and one long solar array. Drag to rotate.
// Antenna size and transmit power set a radar's reach, which is why the jump from
// V2 Mini to V3 matters by the end of the essay.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { roundRect, FONT } from '../core/draw.js';

// Approximate deployed dimensions (metres). span = solar-array long dimension.
const GENS = [
  { key: 'v1',     name: 'v1.5',    span: '≈10 m', busL: 2.8, busW: 1.3, busH: 0.32, arrLen: 8.1,  arrW: 2.6, x: -4.6 },
  { key: 'v2mini', name: 'V2 Mini', span: '≈22 m', busL: 4.1, busW: 2.0, busH: 0.38, arrLen: 12.8, arrW: 4.1, x: 2 },
  { key: 'v3',     name: 'V3',      span: '≈30 m', busL: 5.6, busW: 2.8, busH: 0.45, arrLen: 18.5, arrW: 6.0, x: 11 },
];
const PERSON_X = -9.4;

export default class StarlinkModel extends ThreeFigure {
  build(THREE) {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(6, 9, 7); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35); fill.position.set(-6, -1, -4); this.scene.add(fill);

    const root = this.root3 = new THREE.Group();
    root.scale.setScalar(0.28);
    this.scene.add(root);

    // ground line for the "standing on the ground" scale read
    const gl = [];
    for (let x = -13; x <= 16; x += 2) { gl.push(new THREE.Vector3(x, 0, -4), new THREE.Vector3(x, 0, 4)); }
    gl.push(new THREE.Vector3(-13, 0, 0), new THREE.Vector3(16, 0, 0));
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gl),
      new THREE.LineBasicMaterial({ color: 0x3a4356, transparent: true, opacity: 0.5 })));

    const mats = {
      bus: new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.55, metalness: 0.5 }),
      ant: new THREE.MeshStandardMaterial({ color: 0x3f6bbf, emissive: 0x16294a, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4 }),
      array: new THREE.MeshStandardMaterial({ color: 0x17294c, emissive: 0x0a1830, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }),
      grid: new THREE.LineBasicMaterial({ color: 0x4a76ad, transparent: true, opacity: 0.4 }),
      person: new THREE.MeshStandardMaterial({ color: 0x9aa4b4, roughness: 0.9, metalness: 0.05 }),
    };

    for (const s of GENS) {
      const sat = buildSat(THREE, s, mats);
      sat.position.x = s.x;
      root.add(sat);
      const label = makeLabel(THREE, s.name, s.span);
      label.position.set(s.x, -1.5, 0);
      root.add(label);
    }

    const person = buildPerson(THREE, mats.person);
    person.position.x = PERSON_X;
    root.add(person);
    const plabel = makeLabel(THREE, 'person', '1.8 m');
    plabel.position.set(PERSON_X, -1.5, 0);
    root.add(plabel);

    this.camera.position.set(0.4, 3.2, 10.2);
    this.camera.lookAt(0.4, 2.75, 0);
    this.orbit.target.set(0.4, 2.75, 0);

    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.readout.innerHTML =
      '<span>All three to the same scale, beside a <b>1.8 m</b> person.</span>' +
      '<span>Each: a compact bus, the Earth-facing phased array underneath, one long solar array.</span>';
    this.root.append(this.readout);
  }

  update(dt) { if (this.root3) this.root3.rotation.y += dt * 0.16; this.orbit?.update(); }
}

function buildSat(THREE, s, mats) {
  const g = new THREE.Group();
  // compact bus
  const bus = new THREE.Mesh(new THREE.BoxGeometry(s.busL, s.busH, s.busW), mats.bus);
  bus.position.y = s.busH / 2 + 0.03;
  g.add(bus);
  // Earth-facing phased-array antenna on the underside
  const ant = new THREE.Mesh(new THREE.BoxGeometry(s.busL * 0.9, 0.05, s.busW * 0.8), mats.ant);
  ant.position.y = 0.0;
  g.add(ant);
  // one long solar array standing up from the bus
  const arr = new THREE.Mesh(new THREE.BoxGeometry(s.arrW, s.arrLen, 0.06), mats.array);
  arr.position.y = s.busH + s.arrLen / 2;
  g.add(arr);
  // solar-cell grid
  const cl = [], y0 = s.busH + 0.04, y1 = s.busH + s.arrLen - 0.04, hw = s.arrW / 2 - 0.04, cols = 3;
  const rows = Math.max(6, Math.round(s.arrLen / 1.3));
  for (let i = 0; i <= cols; i++) { const x = -hw + 2 * hw * i / cols; cl.push(new THREE.Vector3(x, y0, 0.05), new THREE.Vector3(x, y1, 0.05)); }
  for (let j = 0; j <= rows; j++) { const y = y0 + (y1 - y0) * j / rows; cl.push(new THREE.Vector3(-hw, y, 0.05), new THREE.Vector3(hw, y, 0.05)); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cl), mats.grid));
  return g;
}

function buildPerson(THREE, mat) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), mat); head.position.y = 1.63; g.add(head);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), mat); torso.position.y = 1.13; g.add(torso);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.72, 4, 10), mat); legs.position.y = 0.42; g.add(legs);
  return g;
}

function makeLabel(THREE, text, sub) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 116;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(10,14,22,0.8)'; roundRect(g, 6, 6, 308, 104, 18); g.fill();
  g.textAlign = 'center';
  g.fillStyle = '#eaf0f8'; g.font = `600 46px ${FONT}`; g.fillText(text, 160, 50);
  if (sub) { g.fillStyle = '#9db4d4'; g.font = `32px ${FONT}`; g.fillText(sub, 160, 92); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  spr.scale.set(3.6, 3.6 * 116 / 320, 1);
  return spr;
}
