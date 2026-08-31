import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';
import { SECTIONS, partHtml } from './src/content/manifest.js';

const contentDir = join(dirname(fileURLToPath(import.meta.url)), 'src', 'content');
const proseHtml = () =>
  SECTIONS.map((s) =>
    Array.isArray(s) ? partHtml(s[0], s[1]) : readFileSync(join(contentDir, s), 'utf8'),
  ).join('\n');

// Renders the essay's prose straight into index.html (dev and build), so the
// shipped page is real HTML — crawlers, reader mode, and no-JS readers see the
// full text. src/pages/index.js only boots the interactive layer on top.
const inlineProse = () => ({
  name: 'inline-prose',
  transformIndexHtml(html) {
    return html.replace(
      '<main class="prose" id="app"></main>',
      `<main class="prose" id="app">\n${proseHtml()}\n</main>`,
    );
  },
  handleHotUpdate({ file, server }) {
    // Content partials aren't imported by any module now — force a reload.
    if (file.includes(`${sep}src${sep}content${sep}`) || file.includes('/src/content/')) {
      server.ws.send({ type: 'full-reload' });
      return [];
    }
  },
});

// Single static page (Ciechanowski-style). three.js is code-split into its own
// chunk, lazy-loaded only by the 3D figures.
export default defineConfig({
  base: './',
  plugins: [inlineProse()],
  worker: { format: 'es' }, // satellite.js's SGP4 worker uses top-level await
  // satellite.js is only imported inside the worker, which Vite's dep scanner
  // doesn't crawl — without this, the first worker load 504s (outdated dep).
  // esbuildOptions.target must allow top-level await (satellite.js WASM), same
  // as build.target below — esbuild's default dev target rejects it.
  optimizeDeps: { include: ['satellite.js'], esbuildOptions: { target: 'es2022' } },
  server: {
    // Dev stand-in for the Cloudflare Pages Function at functions/api/tle.js.
    proxy: {
      '/api/tle': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: () => '/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
      },
    },
  },
  build: {
    target: 'es2022', // satellite.js WASM uses top-level await
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800,
  },
});
