import { defineConfig } from 'vite';

// Single static page (Ciechanowski-style). three.js is code-split into its own
// chunk, lazy-loaded only by the 3D figures.
export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb'],
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
