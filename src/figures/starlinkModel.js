// @ts-check
// The Starlink generations to scale, beside a 1.8 m person. They are genuinely
// different craft, not one model scaled: V1.5 has a single solar array; V2 and V3
// have two symmetric arrays on a larger, detailed bus, V3's longer still. Modelled
// on SpaceX's own generation-comparison render. Drag to rotate. Antenna size and
// transmit power set a radar's reach — which is why V2→V3 matters by the essay's end.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { roundRect, FONT } from '../core/draw.js';

// arrays = number of solar wings; dims in metres. span = tip-to-tip.
const GENS = [
  { key: 'v1', name: 'V1.5', span: '≈10 m', arrays: 1, busL: 2.8, busW: 1.3, arrLen: 7.6, arrW: 2.3, pods: false, x: -2.5, z: -9.5 },
  { key: 'v2', name: 'V2',   span: '≈30 m', arrays: 2, busL: 4.2, busW: 2.6, arrLen: 11,  arrW: 3.0, pods: true,  x: 0,    z: 0 },
  { key: 'v3', name: 'V3',   span: '≈52 m', arrays: 2, busL: 6.4, busW: 2.9, arrLen: 20,  arrW: 3.4, pods: true,  x: 2.5,  z: 11 },
];
const PERSON = { x: -8.5, z: -9.5 };

export default class StarlinkModel extends ThreeFigure {
  build(THREE) {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(5, 10, 6); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x89b0ff, 0.35); fill.position.set(-6, 3, -5); this.scene.add(fill);

    const root = this.root3 = new THREE.Group();
    root.scale.setScalar(0.235);
    this.scene.add(root);

    const mats = {
      bus: new THREE.MeshStandardMaterial({ color: 0x30353f, roughness: 0.5, metalness: 0.55 }),
      ant: new THREE.MeshStandardMaterial({ color: 0x3f6bbf, emissive: 0x16294a, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4 }),
      array: new THREE.MeshStandardMaterial({ color: 0x1b3157, emissive: 0x0a1830, emissiveIntensity: 0.45, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide }),
      grid: new THREE.LineBasicMaterial({ color: 0x6f9fd8, transparent: true, opacity: 0.45 }),
      pod: new THREE.MeshStandardMaterial({ color: 0xc7d0dc, roughness: 0.4, metalness: 0.5 }),
      boom: new THREE.MeshStandardMaterial({ color: 0x8a94a4, roughness: 0.6, metalness: 0.4 }),
      person: new THREE.MeshStandardMaterial({ color: 0xa2acbc, roughness: 0.85, metalness: 0.05 }),
    };

    for (const s of GENS) {
      const sat = buildSat(THREE, s, mats);
      sat.position.set(s.x, 0, s.z);
      root.add(sat);
      const label = makeLabel(THREE, s.name, s.span);
      label.position.set(s.x - s.busL / 2 - 1.6, 1.0, s.z);
      root.add(label);
    }

    const person = buildPerson(THREE, mats.person);
    person.position.set(PERSON.x, 0, PERSON.z);
    root.add(person);
    const plabel = makeLabel(THREE, 'person', '1.8 m');
    plabel.position.set(PERSON.x, 2.6, PERSON.z);
    root.add(plabel);

    this.camera.position.set(1.5, 9.5, 12.5);
    this.camera.lookAt(1.5, 0.4, 1);
    this.orbit.target.set(1.5, 0.4, 1);

    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.readout.innerHTML =
      '<span>To scale, beside a <b>1.8 m</b> person.</span>' +
      '<span>V1.5: one solar array · V2 &amp; V3: two, on a larger bus.</span>';
    this.root.append(this.readout);
  }

  update(dt) { if (this.root3) this.root3.rotation.y += dt * 0.14; this.orbit?.update(); }
}

function buildSat(THREE, s, mats) {
  const g = new THREE.Group();
  const busH = 0.22 + s.busW * 0.02;
  const bus = new THREE.Mesh(new THREE.BoxGeometry(s.busL, busH, s.busW), mats.bus);
  bus.position.y = busH / 2;
  g.add(bus);
  // Earth-facing phased array on the underside
  const ant = new THREE.Mesh(new THREE.BoxGeometry(s.busL * 0.9, 0.05, s.busW * 0.86), mats.ant);
  g.add(ant);
  // corner pods (star trackers / thrusters) on the bigger buses
  if (s.pods) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), mats.pod);
      pod.position.set(sx * s.busL * 0.4, busH * 0.5, sz * s.busW * 0.42);
      g.add(pod);
    }
  }
  const sides = s.arrays === 2 ? [1, -1] : [1];
  for (const dir of sides) {
    const arr = buildArray(THREE, s.arrLen, s.arrW, mats);
    arr.scale.x = dir;
    arr.position.x = dir * (s.busL / 2);
    g.add(arr);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), mats.boom);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(dir * (s.busL / 2 + 0.3), busH * 0.45, 0);
    g.add(boom);
  }
  return g;
}

// A flat solar array lying in the X–Z plane, extending in +X from a small gap.
function buildArray(THREE, len, w, mats) {
  const g = new THREE.Group();
  const gap = 0.65;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, w), mats.array);
  panel.position.x = gap + len / 2;
  g.add(panel);
  const cl = [], cols = Math.max(6, Math.round(len / 1.1)), rows = 3;
  const x0 = gap, x1 = gap + len, hz = w / 2 - 0.03, y = 0.04;
  for (let i = 0; i <= cols; i++) { const x = x0 + (x1 - x0) * i / cols; cl.push(new THREE.Vector3(x, y, -hz), new THREE.Vector3(x, y, hz)); }
  for (let j = 0; j <= rows; j++) { const z = -hz + 2 * hz * j / rows; cl.push(new THREE.Vector3(x0, y, z), new THREE.Vector3(x1, y, z)); }
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
  spr.scale.set(4.2, 4.2 * 116 / 320, 1);
  return spr;
}
