# Notices & Attribution

This project is an educational, interactive retelling of the physics and engineering
described in three YouTube videos by the channel **Noise In Space**. Please watch and
credit the original videos:

- **"Is Starlink A Secret Radar Constellation?"** — <https://www.youtube.com/watch?v=jbp3kdJZ1_A>
- **"How The U.S. Will Track EVERY Vehicle from Space: SAR GMTI/AMTI"** — <https://www.youtube.com/watch?v=-GTpBMPjjFc>
- **"The Insane Engineering of Starlink V3"** — <https://www.youtube.com/watch?v=U6veU66z2TQ>

## Ported / adapted material

The radar physics (radar range equation, SNR budget, resolution, Doppler, DPCA, NESZ,
atmospheric loss) is ported faithfully from the creator's open-source simulations,
released under the MIT License:

> © 2026 noiseinspacechannel — <https://github.com/noiseinspacechannel> (MIT License)
>
> - **NIS-Starlink-Radar-Video** (`SAR_Visualizer.html`, `sar_simulation_env.py`, …)
> - **NIS-SAR-AMTIGMTI-Video** (ATI, DPCA, CRT, Doppler-ambiguity, distributed-SAR demos)
> - **NIS-Starlink-Video** (modulation, Fourier, OFDMA, SDMA, phased-array/squint demos)

In particular, `src/physics/*` mirrors the closed-form calculator in `SAR_Visualizer.html`
and the ground-truth engine `sar_simulation_env.py`; the Chapter 2–4 figures draw on the
interaction and physics of the demos in the AMTIGMTI and Starlink-V3 repositories.

## Third-party libraries

- **three.js** — © 2010–present three.js authors, MIT License (<https://threejs.org>)

## Assets

- Earth texture (when added): NASA Blue Marble, public domain
  (<https://visibleearth.nasa.gov/collection/1484/blue-marble>). We source our own; the
  creator's repo does not redistribute a texture.
