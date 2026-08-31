// @ts-check
// Physics parity tests. These pin src/physics/* to the video's stated numbers
// and to the documented SNR invariances, so figures can't silently drift.
import { describe, it, expect } from 'vitest';
import { snrChain, rangeResolution, dpcaSpacing } from '../src/physics/radar.js';
import { orbitalVelocity, wavelength } from '../src/physics/geometry.js';

describe('range resolution = c/2B', () => {
  it('600 MHz gives ~25 cm (the transcript anchor for 30 cm imagery)', () => {
    expect(rangeResolution(600)).toBeCloseTo(0.25, 2);
  });
  it('500 MHz gives ~30 cm', () => {
    expect(rangeResolution(500)).toBeCloseTo(0.30, 2);
  });
  it('is inversely proportional to bandwidth', () => {
    expect(rangeResolution(100) / rangeResolution(200)).toBeCloseTo(2, 6);
  });
});

describe('DPCA spacing = 2v/PRF (transcript verbatim anchors, v ~ 7.5 km/s)', () => {
  // "at 6,000 Hz PRF, the condition is 2.5 m ... 8 kHz → 1.8 m ... 20 kHz → 0.74 m"
  it('6 kHz -> ~2.5 m', () => { expect(dpcaSpacing(500, 6000)).toBeGreaterThan(2.3); expect(dpcaSpacing(500, 6000)).toBeLessThan(2.7); });
  it('8 kHz -> ~1.8 m', () => { expect(dpcaSpacing(500, 8000)).toBeGreaterThan(1.7); expect(dpcaSpacing(500, 8000)).toBeLessThan(2.1); });
  it('20 kHz -> ~0.74 m', () => { expect(dpcaSpacing(500, 20000)).toBeGreaterThan(0.68); expect(dpcaSpacing(500, 20000)).toBeLessThan(0.82); });
});

describe('orbital velocity', () => {
  it('~7.6 km/s at 500 km', () => { expect(orbitalVelocity(500e3)).toBeGreaterThan(7500); expect(orbitalVelocity(500e3)).toBeLessThan(7700); });
  it('wavelength of 10 GHz ~ 3 cm', () => { expect(wavelength(10)).toBeCloseTo(0.02998, 4); });
});

describe('SNR invariances stated in the video', () => {
  it('PRF cancels out of the SNR budget', () => {
    const a = snrChain({ prf: 4000 }).snr_db;
    const b = snrChain({ prf: 8000 }).snr_db;
    expect(Math.abs(a - b)).toBeLessThan(0.1);
  });
  it('doubling bandwidth drops SNR by ~3 dB (SNR ∝ 1/B)', () => {
    const a = snrChain({ bw: 150 }).snr_db;
    const b = snrChain({ bw: 300 }).snr_db;
    expect(a - b).toBeCloseTo(3.01, 1);
  });
  it('dropping 500 km -> 350 km raises SNR by ~4x (two-way path loss)', () => {
    const lo = snrChain({ alt: 500 }).snr_db;
    const hi = snrChain({ alt: 350 }).snr_db;
    expect(hi - lo).toBeGreaterThan(4);
    expect(hi - lo).toBeLessThan(8);
  });
  it('a bigger antenna (more gain) always helps SNR', () => {
    const small = snrChain({ gaz: 20, gel: 15 }).snr_db;
    const big = snrChain({ gaz: 28, gel: 20 }).snr_db;
    expect(big).toBeGreaterThan(small);
  });
});

describe('outputs are finite and physically plausible', () => {
  const r = snrChain();
  it('SNR is a finite number in a sane range', () => {
    expect(Number.isFinite(r.snr_db)).toBe(true);
    expect(r.snr_db).toBeGreaterThan(-60);
    expect(r.snr_db).toBeLessThan(80);
  });
  it('NESZ is negative (a sensitivity floor below 0 dB)', () => {
    expect(r.nesz_db).toBeLessThan(0);
  });
  it('slant range exceeds altitude and swath is positive', () => {
    expect(r.R_slant).toBeGreaterThan(500e3);
    expect(r.swath_ground).toBeGreaterThan(0);
  });
});
