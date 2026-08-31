// @ts-check
// §0 hero — the Starlink constellation as a live Walker constellation: satellites
// orbiting on inclined planes, a handful painting beams onto the surface. Drag to
// rotate; set the number of orbital planes and satellites per plane. Inspired by
// the orbital views in ciechanow.ski/gps.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { colInt } from '../core/draw.js';
import { palette } from '../core/theme.js';
import coastlines from '../assets/coastline.json';

const R_EARTH = 2;
const R_ORBIT = 2.38;
const INCL = 53 * Math.PI / 180; // Starlink main-shell inclination

// position on an inclined orbit: node Ω, inclination i, true anomaly θ (Earth axis = Y)
function orbitPos(raan, i, theta, R, out) {
  let x = Math.cos(theta), y = 0, z = Math.sin(theta);
  const y1 = y * Math.cos(i) - z * Math.sin(i);
  const z1 = y * Math.sin(i) + z * Math.cos(i);
  y = y1; z = z1;
  out.set((x * Math.cos(raan) + z * Math.sin(raan)) * R, y * R, (-x * Math.sin(raan) + z * Math.cos(raan)) * R);
  return out;
}

export default class Constellation extends ThreeFigure {
  controlsSchema = [
    { type: 'range', name: 'planes', label: 'Orbital planes', min: 6, max: 48, step: 2, value: 20, format: (v) => `${v}` },
    { type: 'range', name: 'perPlane', label: 'Satellites / plane', min: 6, max: 30, step: 2, value: 18, format: (v) => `${v}` },
    { type: 'range', name: 'beams', label: 'Beams shown', min: 0, max: 60, step: 5, value: 30, format: (v) => `${v}` },
  ];

  build(THREE) {
    const c = palette();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.05); sun.position.set(5, 3, 5); this.scene.add(sun);

    this.globe = new THREE.Group(); this.scene.add(this.globe);
    // Clean line-art globe: a dark ocean sphere with bright continent outlines
    // (Natural Earth coastlines, public domain) — easy to read, not a photo.
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x0b2138 }));
    this.globe.add(earth);
    this.globe.add(new THREE.LineSegments(coastlineGeo(THREE, R_EARTH * 1.003, coastlines),
      new THREE.LineBasicMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.85 })));
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R_EARTH * 1.03, 40, 40),
      new THREE.MeshBasicMaterial({ color: colInt(c.echoCol), transparent: true, opacity: 0.11, side: THREE.BackSide })));
    this.globe.add(new THREE.LineSegments(graticule(THREE, R_EARTH * 1.004),
      new THREE.LineBasicMaterial({ color: colInt(c.echoCol, 0.7), transparent: true, opacity: 0.08 })));

    // orbital-plane rings (faint)
    this.rings = new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: colInt(c.echoCol, 0.7), transparent: true, opacity: 0.16 }));
    this.globe.add(this.rings);

    // satellites (instanced)
    this.sats = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 48 * 30);
    this.sats.count = 0; this.globe.add(this.sats);
    this._dummy = new THREE.Object3D(); this._v = new THREE.Vector3();

    // beams
    this.beams = new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: colInt(c.txCol), transparent: true, opacity: 0.5 }));
    this.globe.add(this.beams);

    this.camera.position.set(0, 2.0, 6.4); this.orbit.target.set(0, 0, 0);
    this.t = 0;
    this.rebuild(THREE);
  }

  onChange() { if (this.THREE) this.rebuild(this.THREE); }

  rebuild(THREE) {
    const P = this.params.planes, S = this.params.perPlane;
    // per-satellite orbital elements
    this.elems = [];
    for (let p = 0; p < P; p++) {
      const raan = (p / P) * Math.PI * 2;
      const phaseOffset = (p % 2) * (Math.PI / S); // slight interleave between planes
      for (let s = 0; s < S; s++) this.elems.push({ raan, theta0: (s / S) * Math.PI * 2 + phaseOffset });
    }
    // ring geometry
    const seg = 96, verts = [];
    for (let p = 0; p < P; p++) {
      const raan = (p / P) * Math.PI * 2;
      let prev = orbitPos(raan, INCL, 0, R_ORBIT, new THREE.Vector3());
      for (let k = 1; k <= seg; k++) {
        const cur = orbitPos(raan, INCL, (k / seg) * Math.PI * 2, R_ORBIT, new THREE.Vector3());
        verts.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z);
        prev = cur;
      }
    }
    this.rings.geometry.dispose();
    this.rings.geometry = new THREE.BufferGeometry();
    this.rings.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.sats.count = this.elems.length;
    this.updateSats(THREE);
  }

  updateSats(THREE) {
    const w = this.t * 0.12; // orbital angular progress
    for (let i = 0; i < this.elems.length; i++) {
      const e = this.elems[i];
      orbitPos(e.raan, INCL, e.theta0 + w, R_ORBIT, this._v);
      this._dummy.position.copy(this._v); this._dummy.updateMatrix();
      this.sats.setMatrixAt(i, this._dummy.matrix);
    }
    this.sats.instanceMatrix.needsUpdate = true;
    // beams from a spread of front-facing satellites — aimed OFF-nadir (a real
    // beam looks out to the side, not straight down at the sub-satellite point)
    const nb = this.params.beams, verts = [];
    if (nb > 0) {
      const UP = new THREE.Vector3(0, 1, 0);
      const step = Math.max(1, Math.floor(this.elems.length / (nb * 2)));
      let placed = 0;
      for (let i = 0; i < this.elems.length && placed < nb; i += step) {
        const e = this.elems[i];
        const sp = orbitPos(e.raan, INCL, e.theta0 + w, R_ORBIT, new THREE.Vector3());
        if (sp.z < 0.2) continue; // front hemisphere
        const subDir = sp.clone().normalize();
        const tan = new THREE.Vector3().crossVectors(subDir, UP);
        if (tan.lengthSq() < 1e-4) tan.set(1, 0, 0);
        tan.normalize();
        const side = (i % 2) ? 1 : -1;
        const ang = 0.32 + 0.3 * (((i * 7) % 5) / 5); // ~18°–36° off-nadir, varied
        const g = subDir.multiplyScalar(Math.cos(ang)).addScaledVector(tan, side * Math.sin(ang)).multiplyScalar(R_EARTH);
        verts.push(sp.x, sp.y, sp.z, g.x, g.y, g.z); placed++;
      }
    }
    this.beams.geometry.dispose();
    this.beams.geometry = new THREE.BufferGeometry();
    this.beams.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  }

  update(dt) {
    this.t += dt;
    this.globe.rotation.y += dt * 0.03;
    if (this.THREE) this.updateSats(this.THREE);
    this.orbit?.update();
  }
}

// lon/lat (degrees) -> point on a sphere of radius R (matches the graticule convention)
function lonLat(lon, lat, R) {
  const a = lon * Math.PI / 180, b = lat * Math.PI / 180, cb = Math.cos(b);
  return [Math.cos(a) * cb * R, Math.sin(b) * R, Math.sin(a) * cb * R];
}

// Build coastline outlines (array of [lon,lat] polylines) as line segments.
function coastlineGeo(THREE, R, lines) {
  const verts = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = lonLat(line[i][0], line[i][1], R), b = lonLat(line[i + 1][0], line[i + 1][1], R);
      verts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return g;
}

function graticule(THREE, R) {
  const verts = [], seg = 64;
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = lat * Math.PI / 180, r = Math.cos(phi) * R, y = Math.sin(phi) * R;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      verts.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const th = lon * Math.PI / 180;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = [Math.sin(a0) * Math.cos(th) * R, Math.cos(a0) * R, Math.sin(a0) * Math.sin(th) * R];
      const p1 = [Math.sin(a1) * Math.cos(th) * R, Math.cos(a1) * R, Math.sin(a1) * Math.sin(th) * R];
      verts.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return g;
}
