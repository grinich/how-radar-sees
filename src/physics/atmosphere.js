// @ts-check
// Atmospheric / rain / ionospheric loss, ported from SAR_Visualizer.html
// recalc() lines ~609–671 (ITU-R P.676 / P.838 simplified). Returns two-way dB.

// One-way zenith gaseous attenuation tables (dB) vs frequency (GHz).
const _fO2 = [0.3, 1, 2, 3, 5, 8, 10, 12, 15, 18, 20, 22, 23, 25, 28, 30, 32, 35, 38, 40, 42, 44, 46, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 59.5, 60, 60.5, 61, 62, 63, 64, 65, 66, 67, 68, 70, 72, 75, 80, 85, 90, 95, 100, 105, 110, 115, 117, 118, 118.75, 119, 120, 122, 125, 130, 135, 140, 145, 150];
const _aO2 = [0.002, 0.003, 0.004, 0.005, 0.006, 0.009, 0.013, 0.018, 0.026, 0.035, 0.040, 0.044, 0.046, 0.048, 0.053, 0.058, 0.063, 0.073, 0.090, 0.11, 0.14, 0.18, 0.25, 0.37, 0.58, 0.75, 1.0, 1.5, 2.2, 3.8, 7.0, 14, 28, 60, 120, 260, 120, 60, 25, 12, 6.5, 3.8, 2.2, 1.5, 1.0, 0.55, 0.35, 0.20, 0.10, 0.065, 0.048, 0.042, 0.040, 0.042, 0.050, 0.080, 0.18, 0.50, 3.0, 0.50, 0.18, 0.085, 0.055, 0.040, 0.035, 0.038, 0.045, 0.055];
const _fH2O = [0.3, 1, 2, 3, 5, 8, 10, 12, 15, 18, 19, 20, 21, 22, 22.235, 22.5, 23, 24, 25, 28, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const _aH2O = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.013, 0.025, 0.055, 0.075, 0.10, 0.15, 0.26, 0.32, 0.26, 0.18, 0.095, 0.065, 0.035, 0.028, 0.023, 0.025, 0.030, 0.035, 0.040, 0.038, 0.040, 0.045, 0.055, 0.070, 0.10, 0.12, 0.15, 0.20];

function lerpTable(fArr, aArr, f) {
  if (f <= fArr[0]) return aArr[0];
  if (f >= fArr[fArr.length - 1]) return aArr[aArr.length - 1];
  for (let i = 0; i < fArr.length - 1; i++) {
    if (f >= fArr[i] && f <= fArr[i + 1]) {
      const t = (f - fArr[i]) / (fArr[i + 1] - fArr[i]);
      return aArr[i] + t * (aArr[i + 1] - aArr[i]);
    }
  }
  return aArr[aArr.length - 1];
}

/**
 * Two-way atmospheric + rain + ionospheric loss in dB.
 * @param {number} fc_ghz centre frequency (GHz)
 * @param {number} grazing_rad grazing angle (rad); slant path ~ cosec(grazing)
 * @param {number} weather_pct 0 = clear/dry, 100 = storm
 */
export function atmosphericLossDb(fc_ghz, grazing_rad, weather_pct) {
  const wxFrac = weather_pct / 100;

  const zenith_O2 = lerpTable(_fO2, _aO2, fc_ghz);
  const zenith_H2O_base = lerpTable(_fH2O, _aH2O, fc_ghz);
  const zenith_H2O = zenith_H2O_base * (0.5 + wxFrac * 2.0);
  const zenith_gas = zenith_O2 + zenith_H2O;

  // Rain (ITU-R P.838 simplified): gamma = k * R^alpha, R up to 50 mm/hr.
  const rain_rate = wxFrac * 50;
  let k_rain, alpha_rain;
  if (fc_ghz < 1) { k_rain = 0.00001; alpha_rain = 0.9; }
  else if (fc_ghz < 2) { k_rain = 0.0001; alpha_rain = 1.0; }
  else if (fc_ghz < 5) { k_rain = 0.0005; alpha_rain = 1.05; }
  else if (fc_ghz < 10) { k_rain = 0.003; alpha_rain = 1.12; }
  else if (fc_ghz < 15) { k_rain = 0.01; alpha_rain = 1.18; }
  else if (fc_ghz < 25) { k_rain = 0.04; alpha_rain = 1.15; }
  else if (fc_ghz < 40) { k_rain = 0.12; alpha_rain = 1.08; }
  else if (fc_ghz < 60) { k_rain = 0.35; alpha_rain = 0.95; }
  else if (fc_ghz < 100) { k_rain = 0.45; alpha_rain = 0.88; }
  else { k_rain = 0.50; alpha_rain = 0.85; }
  const zenith_rain = k_rain * Math.pow(Math.max(rain_rate, 0), alpha_rain) * 4.5; // × rain height km

  const zenith_iono = 0.04 * Math.pow(1.0 / Math.max(fc_ghz, 0.1), 1.5);

  const slant_mult = 1.0 / Math.max(Math.sin(grazing_rad), 0.017);
  return 2 * (zenith_gas + zenith_rain + zenith_iono) * slant_mult;
}
