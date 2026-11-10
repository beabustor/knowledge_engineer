import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'publish-saved-sql-docs',
      apply: 'build',
      closeBundle() {
        cpSync(
          fileURLToPath(new URL('../09-docs/sql/', import.meta.url)),
          fileURLToPath(new URL('./dist/sql/', import.meta.url)),
          { recursive: true },
        );
      },
    },
  ],
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
