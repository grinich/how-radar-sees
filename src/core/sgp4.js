// @ts-check
// TLE parsing and bulk SGP4 propagation (satellite.js, MIT). Pure functions —
// the satWorker runs them off the main thread; the tests run them in node.
import { twoline2satrec, propagate, gstime } from 'satellite.js';

const OMEGA_EARTH = 7.2921158553e-5; // rad/s, Earth rotation for ECI->ECEF velocity

/**
 * Parse a CelesTrak TLE file (name / line1 / line2 triplets) into satrecs.
 * Records that fail SGP4 initialization are dropped.
 * @returns {{ satrecs: any[], names: string[], epochMs: number }} epochMs = median TLE epoch
 */
export function parseTle(text) {
  const lines = text.split(/\r?\n/);
  const satrecs = [], names = [], epochs = [];
  let name = '';
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i];
    if (l.startsWith('1 ') && lines[i + 1].startsWith('2 ')) {
      try {
        const rec = twoline2satrec(l, lines[i + 1]);
        if (rec.error === 0) {
          satrecs.push(rec);
          names.push(name);
          epochs.push(rec.jdsatepoch);
        }
      } catch { /* skip malformed record */ }
      i++;
    } else if (l.trim() && !l.startsWith('2 ')) {
      name = l.trim();
    }
  }
  epochs.sort((a, b) => a - b);
  const medianJd = epochs.length ? epochs[epochs.length >> 1] : 2440587.5;
  return { satrecs, names, epochMs: (medianJd - 2440587.5) * 86400000 };
}

/**
 * Propagate every satrec to time tMs (Unix ms) and write ECEF positions (km)
 * and ECEF velocities (km/s) into pos/vel (Float32Array, 3 per satellite).
 * Satellites that fail to propagate (decayed, bad elements) are written as NaN.
 * @returns {number} how many propagated successfully
 */
export function snapshot(satrecs, tMs, pos, vel) {
  const date = new Date(tMs);
  const g = gstime(date);
  const cg = Math.cos(g), sg = Math.sin(g);
  let ok = 0;
  for (let i = 0; i < satrecs.length; i++) {
    const base = 3 * i;
    let pv = null;
    try { pv = propagate(satrecs[i], date); } catch { /* fall through to NaN */ }
    const p = pv && pv.position, v = pv && pv.velocity;
    if (!p || !v || !Number.isFinite(p.x)) {
      pos[base] = pos[base + 1] = pos[base + 2] = NaN;
      vel[base] = vel[base + 1] = vel[base + 2] = NaN;
      continue;
    }
    // ECI -> ECEF: rotate by GMST about the pole...
    const px = p.x * cg + p.y * sg;
    const py = -p.x * sg + p.y * cg;
    // ...and for velocity also subtract the frame rotation (v_ecef = R·v_eci − ω×r_ecef)
    const vx = v.x * cg + v.y * sg + OMEGA_EARTH * py;
    const vy = -v.x * sg + v.y * cg - OMEGA_EARTH * px;
    pos[base] = px; pos[base + 1] = py; pos[base + 2] = p.z;
    vel[base] = vx; vel[base + 1] = vy; vel[base + 2] = v.z;
    ok++;
  }
  return ok;
}
