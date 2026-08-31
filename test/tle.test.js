// Sanity locks for the live-constellation pipeline: the TLE snapshot parses,
// SGP4 puts Starlink where Starlink lives (LEO, ~7.5 km/s), the ECEF velocity
// math agrees with finite differences, and the satellite mapping lands on the
// same globe as the coastlines.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geodeticToEcf, degreesToRadians } from 'satellite.js';
import { parseTle, snapshot } from '../src/core/sgp4.js';
import { lonLatToScene, ecefToScene, EARTH_RADIUS_KM } from '../src/core/globe.js';

const text = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'starlink-snapshot.tle'),
  'utf8',
);

describe('TLE parsing', () => {
  const { satrecs, names, epochMs } = parseTle(text);

  it('parses the full snapshot', () => {
    expect(satrecs.length).toBeGreaterThan(5000);
    expect(names.length).toBe(satrecs.length);
    expect(names[0]).toMatch(/STARLINK/);
  });

  it('has a plausible median epoch (within 60 days of the snapshot date)', () => {
    const meta = JSON.parse(readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'starlink-snapshot.json'), 'utf8'));
    const snapMs = Date.parse(meta.fetchedAt);
    expect(Math.abs(epochMs - snapMs)).toBeLessThan(60 * 86400000);
  });
});

describe('SGP4 snapshot', () => {
  const { satrecs, epochMs } = parseTle(text);
  const n = satrecs.length;
  const pos = new Float32Array(3 * n), vel = new Float32Array(3 * n);
  const ok = snapshot(satrecs, epochMs, pos, vel);

  it('propagates nearly everything at its own epoch', () => {
    expect(ok / n).toBeGreaterThan(0.9);
  });

  it('puts satellites in LEO at orbital speed', () => {
    let inBand = 0, speedOk = 0, valid = 0;
    for (let i = 0; i < n; i++) {
      const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
      if (!Number.isFinite(x)) continue;
      valid++;
      const r = Math.hypot(x, y, z);
      const alt = r - EARTH_RADIUS_KM;
      if (alt > 150 && alt < 700) inBand++;
      const v = Math.hypot(vel[3 * i], vel[3 * i + 1], vel[3 * i + 2]);
      // ECEF speed: ~7.6 km/s orbital minus up to ~0.5 km/s of Earth rotation
      if (v > 6.5 && v < 8.5) speedOk++;
    }
    expect(inBand / valid).toBeGreaterThan(0.9);
    expect(speedOk / valid).toBeGreaterThan(0.95);
  });

  it('ECEF velocity matches finite differences of ECEF position', () => {
    const dt = 1000; // 1 s
    const pos2 = new Float32Array(3 * n), vel2 = new Float32Array(3 * n);
    snapshot(satrecs, epochMs + dt, pos2, vel2);
    let checked = 0;
    for (let i = 0; i < n && checked < 50; i += 199) {
      if (!Number.isFinite(pos[3 * i])) continue;
      for (let k = 0; k < 3; k++) {
        const fd = pos2[3 * i + k] - pos[3 * i + k]; // km over 1 s
        expect(Math.abs(fd - vel[3 * i + k])).toBeLessThan(0.05);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('globe mapping', () => {
  it('satellite ECEF mapping and coastline lon/lat mapping agree', () => {
    // WGS84 vs sphere differs by up to ~0.2° of latitude; allow ~40 km.
    const tol = 40 / EARTH_RADIUS_KM; // in globe radii, on a unit sphere
    for (const [lon, lat] of [[0, 0], [90, 0], [-74, 40.7], [139.7, 35.7], [151, -33.9]]) {
      const e = geodeticToEcf({
        longitude: degreesToRadians(lon), latitude: degreesToRadians(lat), height: 0,
      });
      const a = ecefToScene(e.x, e.y, e.z, 1 / EARTH_RADIUS_KM);
      const b = lonLatToScene(lon, lat, 1);
      for (let k = 0; k < 3; k++) expect(Math.abs(a[k] - b[k])).toBeLessThan(tol);
    }
  });

  it('east is east: moving east from Greenwich decreases scene z', () => {
    const gw = lonLatToScene(0, 51.5, 1);
    const east = lonLatToScene(10, 51.5, 1);
    expect(east[2]).toBeLessThan(gw[2]);
  });
});
