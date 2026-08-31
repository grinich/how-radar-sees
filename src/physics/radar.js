// @ts-check
// Closed-form SAR link budget — a faithful port of SAR_Visualizer.html recalc()
// (© 2026 noiseinspacechannel, MIT). Every formula and constant matches the
// creator's validated engine so our figures reproduce the video's stated numbers.
import { C, K_B, R_E, DEG, T0, SIGMA0_DB } from './constants.js';
import { wavelength, viewGeometry, effectiveVelocity } from './geometry.js';
import { atmosphericLossDb } from './atmosphere.js';

/** Default scenario — matches the engine's default P object. */
export const DEFAULTS = {
  alt: 500,     // altitude, km
  grz: 40,      // grazing angle, deg (90 = nadir)
  sqt: 0,       // squint angle, deg
  inc: 98,      // orbital inclination, deg
  lat: 0,       // scene latitude, deg
  fc: 10,       // centre frequency, GHz
  bw: 150,      // bandwidth, MHz
  pwr: 2000,    // transmit power, W
  gaz: 25,      // azimuth gain, dB
  gel: 17,      // elevation gain, dB
  prf: 4000,    // pulse repetition frequency, Hz
  dc: 20,       // duty cycle, %
  nBeams: 1,    // HRWS receive beams
  tAnt: 300,    // antenna temperature, K
  nf: 2.0,      // receiver noise figure, dB
  otherLoss: 3, // misc system loss, dB
  weather: 0,   // 0 = clear, 100 = storm
};

const dB = (lin) => 10 * Math.log10(lin);

/**
 * Full link budget for a scenario. Returns SNR (dB), NESZ (dB), resolutions (m),
 * Doppler bandwidth (Hz), DPCA spacing (m), swath (m) and intermediate values.
 * @param {Partial<typeof DEFAULTS>} params
 */
export function snrChain(params = {}) {
  const P = { ...DEFAULTS, ...params };

  const h = P.alt * 1e3;
  const lam = wavelength(P.fc);
  const phi = P.sqt * DEG;
  const BW = P.bw * 1e6;
  const cableLoss = 1; // dB

  // Antenna geometry from 1-D gains.
  const Gaz_lin = Math.pow(10, P.gaz / 10);
  const Gel_lin = Math.pow(10, P.gel / 10);
  const D_az = Gaz_lin * lam / 2;
  const D_el = Gel_lin * lam / 2;
  const theta_az = 0.886 * lam / D_az;
  const theta_el = 0.886 * lam / D_el;
  const ApertureGain_lin = 4 * Math.PI * (D_az * D_el) / (lam * lam);
  const G_total_dB_physical = dB(ApertureGain_lin) - cableLoss;
  const G_total_lin = Math.pow(10, G_total_dB_physical / 10);

  // Orbit, geometry, velocity.
  const { R_slant, look_angle, grazing } = viewGeometry(h, P.grz);
  const { V_sat, V_sat_rel, V_eff } = effectiveVelocity(h, P.lat, P.inc);
  const R_orbit = R_E + h;

  // Ground swath from the elevation beamwidth.
  const psi = Math.PI / 2 - look_angle;
  const swathEdge = (dep) => {
    const look = Math.PI / 2 - dep;
    const sin_inc = (R_orbit / R_E) * Math.sin(look);
    const inc = sin_inc > 1 ? Math.PI / 2 : Math.asin(sin_inc);
    const gamma = inc - look;
    return gamma * R_E; // ground arc distance
  };
  const swath_ground_range = Math.abs(swathEdge(psi - theta_el / 2) - swathEdge(psi + theta_el / 2));

  // Timing.
  const PW = (P.dc / 100) / P.prf;

  // Doppler & motion.
  const Bd = 2 * V_eff * Math.cos(phi) * theta_az / lam;
  const V_max = lam * P.prf / (4 * Math.cos(phi));
  const dpca_spacing = 2 * V_sat_rel / P.prf;

  // Resolutions.
  const N = P.nBeams;
  const delta_r_slant = C / (2 * BW);
  const delta_r_ground = delta_r_slant / Math.max(Math.cos(grazing), 1e-4);
  const cosPhi2 = Math.cos(phi) * Math.cos(phi);
  const delta_az = lam / (2 * theta_az * cosPhi2 * N);

  // Per-pixel RCS.
  const sigma0_lin = Math.pow(10, SIGMA0_DB / 10);
  const A_pixel = delta_r_ground * delta_az;
  const sigma = sigma0_lin * A_pixel;

  // Losses & system temperature.
  const atmos_dB = atmosphericLossDb(P.fc, grazing, P.weather);
  const L_total_dB = cableLoss + P.otherLoss + atmos_dB;
  const L_total_lin = Math.pow(10, L_total_dB / 10);
  const NF_lin = Math.pow(10, P.nf / 10);
  const T_sys = P.tAnt + T0 * (NF_lin - 1);

  // Received power & the SNR processing chain.
  const geomFactor = (G_total_lin * G_total_lin * lam * lam) /
    (Math.pow(4 * Math.PI, 3) * Math.pow(R_slant, 4) * L_total_lin);
  const Pr = P.pwr * geomFactor * sigma;
  const Noise_BW = K_B * T_sys * BW;

  const ENo_before = dB(Pr / Noise_BW);
  const TBP = BW * PW;                                  // pulse-compression gain
  const ENo_after_pc = ENo_before + dB(TBP);
  const T_dwell = theta_az * R_slant / V_eff;
  const N_az = T_dwell * P.prf;                         // azimuth-compression gain
  const snr_db = ENo_after_pc + dB(N_az);

  // Noise-equivalent sigma-zero: the sigma0 giving SNR = 0 dB.
  const Pr_1 = P.pwr * geomFactor * 1.0;
  const proc_gain = TBP * N_az;
  const nesz_lin = (Noise_BW / (Pr_1 * proc_gain)) / A_pixel;
  const nesz_db = dB(nesz_lin);

  return {
    snr_db, nesz_db,
    rangeRes_slant: delta_r_slant,
    rangeRes_ground: delta_r_ground,
    azRes: delta_az,
    doppler_bw: Bd,
    dpca: dpca_spacing,
    v_max: V_max,
    swath_ground: swath_ground_range,
    R_slant, V_sat, V_eff, T_sys,
    theta_az, theta_el, D_az, D_el,
    G_total_dB: G_total_dB_physical,
    TBP, N_az, PW, atmos_dB,
  };
}

/** Slant range resolution (m) from bandwidth in MHz — the c/2B relationship. */
export function rangeResolution(bw_mhz) {
  return C / (2 * bw_mhz * 1e6);
}

/** DPCA phase-centre spacing (m) = 2 v / PRF. */
export function dpcaSpacing(alt_km, prf_hz, lat_deg = 0, inc_deg = 98) {
  const { V_sat_rel } = effectiveVelocity(alt_km * 1e3, lat_deg, inc_deg);
  return 2 * V_sat_rel / prf_hz;
}
