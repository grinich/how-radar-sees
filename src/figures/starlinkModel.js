// @ts-check
// A Starlink satellite you can spin, shown to scale across generations. The flat
// underside is the phased-array antenna (Earth-facing); the tall panel is the
// solar array. Switching generation rescales the model against a fixed grid so
// the growth in size — and therefore antenna gain and power — is visible. That
// growth is exactly what makes the later "can it do radar?" answer flip.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { palette } from '../core/theme.js';
import { colInt } from '../core/draw.js';

// s = overall size factor (relative), against a fixed reference grid.
const GENS = {
  v1:     { name: 'Starlink v1.5',        year: '2021',    span: '≈10 m', mass: '≈260 kg', cap: 'baseline',            bands: 'Ku / Ka',          note: 'First laser inter-satellite links', s: 1.0 },
  v2mini: { name: 'V2 Mini',              year: '2023',    span: '≈22 m', mass: '≈800 kg', cap: '≈4× the capacity',    bands: 'Ku / Ka',          note: "Today's workhorse — argon Hall thrusters", s: 1.5 },
  v3:     { name: 'V3 · Direct-to-Cell',  year: '2025–26', span: '≈30 m', mass: '≈1.5 t',  cap: '≈10× the capacity',   bands: 'Ku / Ka + cellular', note: 'Talks straight to ordinary phones; rides Starship', s: 2.0 },
};

export default class StarlinkModel extends ThreeFigure {
  controlsSchema = [
    { type: 'segmented', name: 'gen', label: 'Generation',
      options: [['v1.5', 'v1'], ['V2 Mini', 'v2mini'], ['V3', 'v3']], value: 'v2mini' },
  ];

  build(THREE) {
    const c = palette();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(5, 7, 5); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35); fill.position.set(-5, -2, -3); this.scene.add(fill);

    // Fixed reference grid: the satellite grows against it between generations.
    this.grid = new THREE.GridHelper(26, 26, colInt(c.rule), colInt(c.rule));
    this.grid.position.y = -3.4;
    this.grid.material.transparent = true; this.grid.material.opacity = 0.32;
    this.scene.add(this.grid);

    this.sat = new THREE.Group();
    this.scene.add(this.sat);

    const chassisMat = new THREE.MeshStandardMaterial({ color: 0xd0d7e2, roughness: 0.5, metalness: 0.5 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.9), chassisMat);
    this.sat.add(chassis);

    // Phased-array antenna, facing Earth (-Y).
    const antMat = new THREE.MeshStandardMaterial({ color: 0x3f6bbf, roughness: 0.35, metalness: 0.5, emissive: 0x16294a, emissiveIntensity: 0.45 });
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.82), antMat);
    antenna.position.y = -0.13; this.sat.add(antenna);
    const al = [];
    for (let i = -5; i <= 5; i++) { const x = i * 0.2; al.push(new THREE.Vector3(x, -0.17, -0.4), new THREE.Vector3(x, -0.17, 0.4)); }
    for (let j = -2; j <= 2; j++) { const z = j * 0.2; al.push(new THREE.Vector3(-1.12, -0.17, z), new THREE.Vector3(1.12, -0.17, z)); }
    this.sat.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(al),
      new THREE.LineBasicMaterial({ color: 0x9dc0f2, transparent: true, opacity: 0.5 })));

    // Boom + tall solar array (anti-nadir, +Y).
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), chassisMat);
    boom.position.y = 0.33; this.sat.add(boom);
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x17294c, roughness: 0.4, metalness: 0.6, emissive: 0x0a1830, emissiveIntensity: 0.5 });
    const solar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.0, 0.05), solarMat);
    solar.position.y = 2.5; this.sat.add(solar);
    const cl = [];
    for (let i = -4; i <= 4; i++) { const x = i * 0.22; cl.push(new THREE.Vector3(x, 0.52, 0.04), new THREE.Vector3(x, 4.48, 0.04)); }
    for (let j = 0; j <= 9; j++) { const y = 0.52 + j * 0.44; cl.push(new THREE.Vector3(-0.94, y, 0.04), new THREE.Vector3(0.94, y, 0.04)); }
    this.sat.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(cl),
      new THREE.LineBasicMaterial({ color: 0x4a76ad, transparent: true, opacity: 0.4 })));

    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.root.append(this.readout);

    this.camera.position.set(7, 3.4, 8.5);
    this.orbit.target.set(0, 0.6, 0);
    this.camera.lookAt(0, 0.6, 0);
    this.apply();
  }

  onChange() { this.apply(); }

  apply() {
    const g = GENS[this.params.gen] || GENS.v2mini;
    this.sat.scale.setScalar(0.58 * g.s);
    this.readout.innerHTML =
      `<span>${g.name} · <b>${g.year}</b></span>` +
      `<span>Span <b>${g.span}</b></span>` +
      `<span>Mass <b>${g.mass}</b></span>` +
      `<span>Capacity <b>${g.cap}</b></span>` +
      `<span>Bands <b>${g.bands}</b></span>` +
      `<span style="opacity:.75">${g.note}</span>`;
  }

  update(dt) { if (this.sat) this.sat.rotation.y += dt * 0.28; this.orbit?.update(); }
}
