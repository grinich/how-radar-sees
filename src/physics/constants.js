// @ts-check
// Physical constants — values match the creator's validated engine
// (SAR_Visualizer.html line ~430 and sar_simulation_env.py) exactly, so our
// numbers reproduce theirs and the transcript's stated results.

export const C = 299792458;            // speed of light, m/s
export const K_B = 1.38064852e-23;     // Boltzmann constant, J/K
export const R_E = 6371e3;             // Earth radius, m
export const GM = 3.986004418e14;      // Earth gravitational parameter, m^3/s^2
export const OMEGA_E = 7.2921159e-5;   // Earth rotation rate, rad/s
export const T0 = 290;                 // reference temperature, K

export const DEG = Math.PI / 180;

// Average earth-clutter backscatter used as the "typical pixel" throughout the video.
export const SIGMA0_DB = -15;
