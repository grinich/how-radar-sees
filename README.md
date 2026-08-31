# How Radar Sees

An interactive, Ciechanowski-style explainer on how radar and synthetic aperture radar (SAR)
work — building from first principles toward a surprising question: *could the Starlink
constellation already overhead function as a secret radar / spy system?*

It is a web-native retelling of the video **"Is Starlink A Secret Radar Constellation?"** by
**Noise In Space**, turned into something you learn by doing: a long-scroll article where every
concept is paired with a manipulable interactive figure. See [`NOTICES.md`](./NOTICES.md) for
attribution.

## Status

**Live at <https://how-radar-sees.pages.dev>** (Cloudflare Pages).

**A single long-scroll interactive essay** (Ciechanowski-style) — ~42 interactive figures across five
parts, with a long table of contents down the right side and hover-to-define glossary terms:

1. **Seeing with Echoes** — opens with a **live Starlink tracker** (real TLEs from CelesTrak,
   propagated with satellite.js — every catalogued satellite where it actually is right now),
   then the echo & target, resolution (`δr = c/2B`), the SNR link budget, radar bands, and
   validation against ICEYE & NISAR.
2. **Building a Picture** — the one-pixel problem, synthetic-aperture formation, the range-Doppler
   algorithm (watch a destroyer focus, stage by stage), motion artifacts, back-projection, and a
   **live GPU-shader back-projection**.
3. **Tracking Motion** — the Doppler dilemma, altitude slicing, interferometry & DPCA, the Chinese
   Remainder Theorem, STAP, distributed/multistatic SAR, video-SAR tracking, SIGINT, and jamming.
4. **How Starlink Talks** — modulation & the I/Q plane, BER curves, symbol rate & bandwidth, the
   matched filter, multiple access, phased arrays (2-D + a **3-D drag-to-rotate beam lobe**), beam
   squint, hybrid tiling, polarization, the RF chain, amplifiers & PAPR.
5. **Is Starlink a Secret Radar?** — duplexing & the isolation ladder, the antenna-by-antenna SNR
   sweep, the V3 direct-to-cell reveal, and the data/compute & policy implications.

A web-native retelling of three **Noise In Space** videos (see `NOTICES.md`). Every figure's numbers
come from `src/physics/`, a faithful port of the creator's validated engine, pinned by
`test/physics.test.js` to the videos' own stated values.

Deploy a new version with `npm run build && npx wrangler pages deploy dist --project-name=how-radar-sees`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # physics parity tests (locked to the video's stated numbers)
npm run build    # static site -> dist/  (host anywhere)
npm run preview  # serve the built dist/
```

## Architecture

- **Vanilla ES modules + Vite.** No UI framework. Interactivity lives inside canvases driven
  imperatively per frame.
- **`src/physics/`** — a faithful port of the creator's validated engine (`SAR_Visualizer.html` /
  `sar_simulation_env.py`). Pinned by `test/physics.test.js`.
- **`src/core/`** — the figure harness: a `Figure` base with `Canvas2DFigure` / `ThreeFigure`
  subclasses, an IntersectionObserver that lazy-mounts figures on scroll, one global rAF that
  pauses offscreen figures, a per-figure play/pause control in each animation's corner, accessible
  native-`<input>` controls, and theme-aware canvas repainting.
- **`src/figures/`** — one self-contained module per figure. Adding a figure = one module + one
  line in `src/core/registry.js` + one `<figure data-figure="id">` in the prose.
- **Live orbital data** — the opening globe fetches current Starlink TLEs (fresh
  localStorage → `/api/tle`, a Cloudflare Pages Function that edge-caches CelesTrak for 2 h →
  CelesTrak directly → stale cache → `public/data/starlink-snapshot.tle`, refresh with
  `npm run fetch:tle`). A Web Worker runs SGP4 (satellite.js) and streams ECEF snapshots;
  the main thread cubic-Hermite-interpolates ~10k points per frame. `test/tle.test.js` pins
  the propagation and the satellite↔coastline coordinate mapping.
- **3D** uses three.js, code-split into its own chunk and lazy-loaded only when a 3D figure scrolls
  into view — 2D-only readers never download it.

The reference material (the creator's MIT-licensed repo) is cloned into `reference/` (gitignored)
as the physics source of truth; it is not shipped.
