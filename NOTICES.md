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
- **satellite.js** — © Shashwat Kandadai & UCSC, MIT License
  (<https://github.com/shashwatak/satellite-js>). SGP4 propagation for the live
  constellation figure.

## Data

- **Starlink orbital elements (TLEs)** — courtesy of **CelesTrak**
  (<https://celestrak.org>), Dr. T.S. Kelso. Fetched live (edge-cached for two
  hours to respect CelesTrak's update cadence); `public/data/starlink-snapshot.tle`
  is a bundled fallback copy of the same data.

## Assets

- **Starlink satellite 3D models** — built procedurally in `src/core/starlinkSats.js`
  (no third-party assets). Dimensions and component layout follow SpaceX-published
  material: the Oct 2022 FCC filing dimensions, the "Brightness Mitigation Best
  Practices for Satellite Operators" paper (2022), the Starlink V3 update
  (<https://starlink.com/updates/starlink-version-3-satellites>), the S-1
  registration statement renders (SEC, May 2026), and the Starship Flight-11
  webcast generation-comparison graphic.
- **Coastlines** — Natural Earth (`ne_110m_coastline`), public domain
  (<https://www.naturalearthdata.com/>). Rendered as the globe's continent outlines.
