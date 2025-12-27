import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  // Disable CSS processing entirely for this Node.js-only package
  css: false,
  // Prevent Vite from looking for config files in parent directories
  configFile: false,
});
