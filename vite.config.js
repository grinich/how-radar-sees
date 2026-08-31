import { defineConfig } from 'vite';

// Single static page (Ciechanowski-style). three.js is code-split into its own
// chunk, lazy-loaded only by the 3D figures.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800,
  },
});
