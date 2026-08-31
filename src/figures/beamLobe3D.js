// @ts-check
// Ch4 — The phased-array beam as a 3-D lobe you can rotate. The surface radius in
// each direction is the array's gain there: a narrow main lobe toward the steer
// direction, with side lobes rippling around it. More elements → tighter lobe.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { colInt } from '../core/draw.js';
import { palette } from '../core/theme.js';

const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

export default class BeamLobe3D extends ThreeFigure {
  controlsSchema = [
    { type: 'range', name: 'steer', label: 'Steering', min: 0, max: 60, step: 1, value: 25, format: (v) => `${v}°` },
    { type: 'range', name: 'elements', label: 'Elements', min: 4, max: 24, step: 2, value: 12, format: (v) => `${v}` },
  ];

  build(THREE) {
    const c = palette();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(3, 5, 4); this.scene.add(dl);

    // ground plane below the antenna
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: colInt(c.targetCol, 0.12), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.6; this.scene.add(ground);
    const grid = new THREE.GridHelper(6, 12, colInt(c.rule), colInt(c.rule));
    grid.position.y = -1.599; this.scene.add(grid);

    // antenna marker at origin
    this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0xdddddd })));

    // lobe mesh (deformed sphere with vertex colors)
    this.geo = new THREE.SphereGeometry(1, 72, 48);
    this.baseDir = [];
    const pos = this.geo.attributes.position;
    for (let i = 0; i < pos.count; i++) this.baseDir.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize());
    this.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    this.lobe = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    this.scene.add(this.lobe);

    // steer-direction arrow
    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 1.6, colInt(c.txCol), 0.2, 0.12);
    this.scene.add(this.arrow);

    this.camera.position.set(2.6, 1.4, 3.0);
    this.orbit.target.set(0, -0.3, 0);
    this.displace(THREE);
  }

  onChange() { if (this.THREE) this.displace(this.THREE); }

  displace(THREE) {
    const a = this.params.steer * Math.PI / 180;
    const steer = new THREE.Vector3(Math.sin(a), -Math.cos(a), 0); // tilt from straight-down
    const N = this.params.elements;
    const pos = this.geo.attributes.position, col = this.geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const d = this.baseDir[i];
      const gamma = Math.acos(Math.max(-1, Math.min(1, d.dot(steer)))); // radians from the steer direction
      const mag = Math.abs(sinc(N * 0.5 * gamma));                      // narrow main lobe + side lobes
      const r = 0.14 + 1.25 * mag;
      pos.setXYZ(i, d.x * r, d.y * r, d.z * r);
      const t = Math.min(1, mag);                                       // colour: blue (low) → white (high)
      col.setXYZ(i, 0.25 + 0.7 * t, 0.45 + 0.5 * t, 0.9);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.arrow.setDirection(steer);
  }
}
