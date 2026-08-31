// @ts-check
// The Starlink generations to scale, beside a 1.8 m person — procedural models
// built in src/core/starlinkSats.js from SpaceX-published dimensions and imagery
// (FCC filings, the brightness-mitigation paper, the S-1 renders, and the V3
// reveal). They are genuinely different craft, not one model scaled: V1.5 flies a
// single 8.1 m array off a 2.8 m bus, V2 Mini two 12.8 m wings (~30 m tip-to-tip),
// V3 two 19 m wings (~52 m). Layout mirrors SpaceX's own Starship Flight-11
// generation-comparison graphic. Drag to rotate. Antenna size and transmit power
// set a radar's reach — which is why V2→V3 matters by the essay's end.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { roundRect, FONT } from '../core/draw.js';
import { makeSatMats, buildV15, buildV2Mini, buildV3 } from '../core/starlinkSats.js';

const GENS = [
  { name: 'V1.5', sub: '≈11 m · 306 kg', build: buildV15, x: -7.5, z: -10, labelY: 2.7 },
  { name: 'V2 Mini', sub: '≈30 m · 800 kg', build: buildV2Mini, x: 0, z: 0, labelY: 3.3 },
  { name: 'V3', sub: '≈52 m · ~1,900 kg', build: buildV3, x: 0, z: 11, labelY: 4.1 },
];
const PERSON = { x: -10.6, z: -10 };

export default class StarlinkModel extends ThreeFigure {
  build(THREE) {

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(5, 10, 6); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x89b0ff, 0.4); fill.position.set(-6, 3, -5); this.scene.add(fill);

    const root = this.root3 = new THREE.Group();
    root.scale.setScalar(0.225);
    this.scene.add(root);

    const mats = makeSatMats(THREE);
    for (const gen of GENS) {
      const sat = gen.build(THREE, mats);
      sat.position.set(gen.x, 0, gen.z);
      root.add(sat);
      const label = makeLabel(THREE, gen.name, gen.sub);
      label.position.set(gen.x, gen.labelY, gen.z);
      root.add(label);
    }

    const personMat = new THREE.MeshStandardMaterial({ color: 0xa2acbc, roughness: 0.85, metalness: 0.05 });
    const person = buildPerson(THREE, personMat);
    person.position.set(PERSON.x, -0.9, PERSON.z); // feet-to-head centered on the sat plane
    root.add(person);
    const plabel = makeLabel(THREE, 'person', '1.8 m');
    plabel.position.set(PERSON.x, 2.4, PERSON.z);
    root.add(plabel);

    this.camera.position.set(1.0, 5.6, 9.2);
    this.camera.lookAt(0.3, 0, 0.4);
    this.orbit.target.set(0.3, 0, 0.4);

    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.readout.innerHTML =
      '<span>To scale, beside a <b>1.8 m</b> person — dimensions from SpaceX’s FCC filings and published imagery.</span>' +
      '<span>V1.5: one solar array · V2 Mini: two · V3: two 19 m arrays and four times the antenna.</span>';
    this.root.append(this.readout);
  }

  update(dt) { if (this.root3) this.root3.rotation.y += dt * 0.12; this.orbit?.update(); }
}

function buildPerson(THREE, mat) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), mat); head.position.y = 1.63; g.add(head);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), mat); torso.position.y = 1.13; g.add(torso);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.72, 4, 10), mat); legs.position.y = 0.42; g.add(legs);
  return g;
}

function makeLabel(THREE, text, sub) {
  const cv = document.createElement('canvas'); cv.width = 340; cv.height = 116;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(10,14,22,0.8)'; roundRect(g, 6, 6, 328, 104, 18); g.fill();
  g.textAlign = 'center';
  g.fillStyle = '#eaf0f8'; g.font = `600 44px ${FONT}`; g.fillText(text, 170, 50);
  if (sub) { g.fillStyle = '#9db4d4'; g.font = `30px ${FONT}`; g.fillText(sub, 170, 92); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  spr.scale.set(5.4, 5.4 * 116 / 340, 1);
  return spr;
}
