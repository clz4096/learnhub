import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // Logic tests run in Node; component tests (.tsx) need a DOM.
    projects: [
      { extends: true, test: { name: 'node', include: ['src/**/*.test.ts'], environment: 'node' } },
      { extends: true, test: { name: 'dom', include: ['src/**/*.test.tsx'], environment: 'jsdom' } },
    ],
  },
});
