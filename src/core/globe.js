// @ts-check
// The line-art Earth shared by the globe figures: a dark ocean sphere, Natural
// Earth coastline outlines, a faint graticule and atmosphere rim, plus the
// lon/lat and ECEF mappings that keep satellites over the right continents.
//
// Scene convention (standard three.js globe): +y = north pole, lon 0 on +x,
// east positive, so z = -sin(lon)·cos(lat). Equivalently, for ECEF (km):
// scene = (X, Z, -Y) · scale. Viewed head-on with north up, east runs to the
// right, like a real globe.
import { colInt } from './draw.js';
import coastlines from '../assets/coastline.json';

export const EARTH_RADIUS_KM = 6371;

/** lon/lat (degrees) -> point on a sphere of radius R, as [x, y, z]. */
export function lonLatToScene(lon, lat, R) {
  const a = lon * Math.PI / 180, b = lat * Math.PI / 180, cb = Math.cos(b);
  return [Math.cos(a) * cb * R, Math.sin(b) * R, -Math.sin(a) * cb * R];
}

/** ECEF km -> scene units, same frame as lonLatToScene. */
export function ecefToScene(x, y, z, scale) {
  return [x * scale, z * scale, -y * scale];
}

/** Coastline outlines (array of [lon,lat] polylines) as a line-segment geometry. */
export function coastlineGeo(THREE, R) {
  const verts = [];
  for (const line of coastlines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = lonLatToScene(line[i][0], line[i][1], R);
      const b = lonLatToScene(line[i + 1][0], line[i + 1][1], R);
      verts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return g;
}

/** Faint lat/lon grid lines. */
export function graticule(THREE, R) {
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

/** Assemble the full line-art globe as a Group of radius R. */
export function buildGlobe(THREE, R, palette) {
  const globe = new THREE.Group();
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b2138 })));
  globe.add(new THREE.LineSegments(coastlineGeo(THREE, R * 1.003),
    new THREE.LineBasicMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.85 })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 40, 40),
    new THREE.MeshBasicMaterial({ color: colInt(palette.echoCol), transparent: true, opacity: 0.11, side: THREE.BackSide })));
  globe.add(new THREE.LineSegments(graticule(THREE, R * 1.004),
    new THREE.LineBasicMaterial({ color: colInt(palette.echoCol, 0.7), transparent: true, opacity: 0.08 })));
  return globe;
}
