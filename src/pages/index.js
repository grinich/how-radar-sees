// @ts-check
// The whole essay as one long page (Ciechanowski-style). The prose itself is
// inlined into index.html at build time (see the inline-prose plugin in
// vite.config.js, driven by src/content/manifest.js) — this entry only boots
// the interactive layer: figures, glossary, TOC.
import { bootPage } from '../core/page.js';
import { initHeroSat } from '../hero3d.js';

bootPage();

// Upgrade the hero satellite to the real 3D model after first paint.
initHeroSat();
