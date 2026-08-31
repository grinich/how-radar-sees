// @ts-check
// Orbital and viewing geometry on a spherical Earth.
// Ported from SAR_Visualizer.html recalc() (lines ~476–544).
import { C, R_E, GM, OMEGA_E, DEG } from './constants.js';

/** Orbital speed for a circular orbit at altitude `alt_m` (m/s). */
export function orbitalVelocity(alt_m) {
  return Math.sqrt(GM / (R_E + alt_m));
}

/** Radar wavelength (m) for a centre frequency in GHz. */
export function wavelength(fc_ghz) {
  return C / (fc_ghz * 1e9);
}

/**
 * Slant range and angles for a target seen at a given grazing angle.
 * grazing = elevation angle from the target up to the satellite; 90° = nadir.
 * Returns { R_slant (m), look_angle (rad), incidence (rad), grazing (rad) }.
 */
export function viewGeometry(alt_m, grazing_deg) {
  const R_orbit = R_E + alt_m;
  const grazing = grazing_deg * DEG;
  const inc_angle = Math.PI / 2 - grazing;             // incidence at target
  // Law of sines: sin(look)/R_E = sin(inc)/R_orbit
  const sin_look = (R_E / R_orbit) * Math.sin(inc_angle);
  const look_angle = Math.asin(Math.min(Math.max(sin_look, -1), 1));
  const gamma = inc_angle - look_angle;                // Earth-centre angle
  const R_slant = Math.sqrt(R_E * R_E + R_orbit * R_orbit - 2 * R_E * R_orbit * Math.cos(gamma));
  return { R_slant, look_angle, incidence: inc_angle, grazing };
}

/**
 * Effective SAR velocity accounting for Earth rotation, matching the engine's
 * V_eff = sqrt(V_sat_rel * V_ground_rel). Ported from recalc() lines ~481–509.
 * Returns { V_sat, V_ground, V_sat_rel, V_eff }.
 */
export function effectiveVelocity(alt_m, lat_deg, inc_deg) {
  const R_orbit = R_E + alt_m;
  const V_sat = Math.sqrt(GM / R_orbit);
  const V_ground = V_sat * R_E / R_orbit;

  const lat = lat_deg * DEG;
  const inc = inc_deg * DEG;
  // Satellite track heading relative to North: sin(az) = cos(inc)/cos(lat)
  const sin_az = Math.min(Math.max(Math.cos(inc) / Math.max(Math.cos(lat), 1e-6), -1), 1);
  const cos_az = Math.sqrt(1 - sin_az * sin_az);

  const Vs_E = V_sat * sin_az, Vs_N = V_sat * cos_az;
  const Vt_E = OMEGA_E * R_E * Math.cos(lat);          // target eastward motion

  const V_sat_rel = Math.sqrt((Vs_E - Vt_E) ** 2 + Vs_N ** 2);
  const Vg_E = V_ground * sin_az, Vg_N = V_ground * cos_az;
  const Vg_rel = Math.sqrt((Vg_E - Vt_E) ** 2 + Vg_N ** 2);
  const V_eff = Math.sqrt(V_sat_rel * Vg_rel);
  return { V_sat, V_ground, V_sat_rel, V_eff };
}
