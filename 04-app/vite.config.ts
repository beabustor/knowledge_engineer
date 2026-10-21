import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Cache the reproducible fixture separately from interface code.
          if (id.includes('/01-data/02-impact-scenario/')) return 'scenario-data';
        },
      },
    },
  },
});
