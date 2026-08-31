// @ts-check
// 3D SAR imaging geometry — drag to rotate. A satellite views a ground target at
// an adjustable altitude and grazing angle; the slant-range line and beam
// footprint update live, tying the range equation's R and grazing to a picture.
// Proves the lazy-Three path and context lifecycle for the whole project.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { viewGeometry } from '../physics/geometry.js';
import { palette } from '../core/theme.js';
import { colInt } from '../core/draw.js';

const SCALE = 1e5; // 1 scene unit = 100 km

export default class SarGeometry extends ThreeFigure {
  controlsSchema = [
    { type: 'range', name: 'alt', label: 'Altitude', min: 300, max: 600, step: 10, value: 500, format: (v) => `${v} km` },
    { type: 'range', name: 'grz', label: 'Grazing angle', min: 15, max: 80, step: 1, value: 40, format: (v) => `${v}°` },
  ];

  build(THREE) {
    const c = palette();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(4, 8, 5);
    this.scene.add(dl);

    // Ground plane + grid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: colInt(c.targetCol, 0.12), roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(20, 20, colInt(c.rule), colInt(c.rule));
    grid.position.y = 0.001;
    this.scene.add(grid);

    // Target marker at origin
    this.target = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshStandardMaterial({ color: colInt(c.targetCol) }),
    );
    this.scene.add(this.target);

    // Satellite: body + two panels
    this.sat = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.3 }),
    );
    this.sat.add(body);
    const panelMat = new THREE.MeshStandardMaterial({ color: colInt(c.echoCol), roughness: 0.4, metalness: 0.4 });
    for (const sx of [-0.62, 0.62]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.42), panelMat);
      panel.position.set(sx, 0, 0);
      this.sat.add(panel);
    }
    this.scene.add(this.sat);

    // Slant-range line (sat -> target)
    this.slant = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: colInt(c.echoCol) }),
    );
    this.scene.add(this.slant);

    // Beam cone (apex at sat, base = ground footprint)
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1, 28, 1, true),
      new THREE.MeshBasicMaterial({ color: colInt(c.echoCol), transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.scene.add(this.beam);

    // HTML readout
    this.readout = document.createElement('div');
    this.readout.className = 'fig__readout';
    this.root.append(this.readout);

    this.camera.position.set(7, 6, 9);
    this.camera.lookAt(0, 2, 0);
    this.orbit.target.set(0, 2, 0);
    this.applyGeometry(THREE);
  }

  onChange() { if (this.THREE) this.applyGeometry(this.THREE); }

  applyGeometry(THREE) {
    const { alt, grz } = this.params;
    const geo = viewGeometry(alt * 1e3, grz);          // real slant range, spherical Earth
    const Runits = geo.R_slant / SCALE;
    const g = grz * Math.PI / 180;

    // Satellite along the range direction (+x), elevated by the grazing angle.
    const sx = Runits * Math.cos(g);
    const sy = Runits * Math.sin(g);
    const satPos = new THREE.Vector3(sx, sy, 0);
    this.sat.position.copy(satPos);
    this.sat.lookAt(0, 0, 0);

    // Slant line
    this.slant.geometry.setFromPoints([satPos, new THREE.Vector3(0, 0, 0)]);

    // Beam cone: axis -Y -> direction(target - sat); centered at midpoint; height = R.
    const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), satPos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.beam.setRotationFromQuaternion(q);
    this.beam.position.copy(satPos.clone().lerp(new THREE.Vector3(0, 0, 0), 0.5));
    this.beam.scale.set(1, Runits, 1);

    this.readout.innerHTML =
      `<span>Slant range <b>${(geo.R_slant / 1000).toFixed(0)} km</b></span>` +
      `<span>Grazing <b>${grz}°</b></span>` +
      `<span>Incidence <b>${(geo.incidence * 180 / Math.PI).toFixed(0)}°</b></span>`;
  }
}
